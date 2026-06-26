/**
 * services/paymentService.js
 *
 * Gateway-agnostic service layer for payment operations.
 * All SSLCommerz-specific logic is isolated here — swapping gateways
 * only requires changes to this file, not the controller.
 *
 * Bangladesh LT-A Progressive Tariff (mirrors LanguageContext.jsx):
 *   Lifeline  : 0–50  units @ ৳4.63/kWh
 *   Step 1    : 0–75  units @ ৳5.26/kWh
 *   Step 2    : 76–200       @ ৳8.50/kWh
 *   Step 3    : 201–300      @ ৳9.10/kWh
 *   Step 4    : 301–400      @ ৳9.62/kWh
 *   Step 5    : 401–600      @ ৳15.01/kWh
 *   Step 6    : 601+         @ ৳17.35/kWh
 *   Demand    : ৳42.00 flat/month
 */

const SSLCommerzPayment = require('sslcommerz-lts');
const { v4: uuidv4 }    = require('uuid');
const Reading            = require('../models/Reading');

const IS_LIVE = process.env.SSL_IS_LIVE === 'true';
const DEMAND_CHARGE = 42.00;

// ── LT-A Tariff Slabs ────────────────────────────────────────────────────────
const LTA_SLABS = [
  { limit:  75, rate: 5.26 },
  { limit: 125, rate: 8.50 },
  { limit: 100, rate: 9.10 },
  { limit: 100, rate: 9.62 },
  { limit: 200, rate: 15.01 },
  { limit: Infinity, rate: 17.35 },
];

/**
 * Calculate Bangladesh LT-A electricity bill for a given kWh consumption.
 * @param {number} units - kWh consumed
 * @returns {{ energyCharge: number, breakdown: Array }}
 */
const calculateEnergyCharge = (units) => {
  if (!units || units <= 0) return { energyCharge: 0, breakdown: [] };

  let total = 0;
  const breakdown = [];

  if (units <= 50) {
    // Lifeline slab
    const cost = parseFloat((units * 4.63).toFixed(2));
    breakdown.push({ slabName: 'Lifeline (0–50)', units, rate: 4.63, cost });
    total = cost;
  } else {
    // Progressive slabs
    let remaining = units;
    for (const slab of LTA_SLABS) {
      if (remaining <= 0) break;
      const slabUnits = Math.min(remaining, slab.limit);
      const cost = parseFloat((slabUnits * slab.rate).toFixed(2));
      breakdown.push({ units: slabUnits, rate: slab.rate, cost });
      total += cost;
      remaining -= slabUnits;
    }
    total = parseFloat(total.toFixed(2));
  }

  return { energyCharge: total, breakdown };
};

/**
 * Calculate the current bill for a device by reading its latest energy value.
 * @param {string} esp_id
 * @returns {Promise<Object>} Bill summary object
 */
const calculateCurrentBill = async (esp_id) => {
  // Get current billing month (YYYY-MM)
  const now = new Date();
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get start of current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Latest energy reading (cumulative kWh from the meter)
  const latestReading = await Reading.findOne({ esp_id })
    .sort({ timestamp: -1 })
    .lean();

  // First reading of this month (for delta calculation)
  const firstOfMonth = await Reading.findOne({
    esp_id,
    timestamp: { $gte: startOfMonth },
  })
    .sort({ timestamp: 1 })
    .lean();

  // Monthly kWh = latest cumulative − start-of-month cumulative
  const latestEnergy  = latestReading?.energy  || 0;
  const monthlyStartE = firstOfMonth?.energy   || 0;
  const monthlyKWh    = Math.max(0, parseFloat((latestEnergy - monthlyStartE).toFixed(4)));

  const { energyCharge, breakdown } = calculateEnergyCharge(monthlyKWh);
  const totalAmount = parseFloat((energyCharge + DEMAND_CHARGE).toFixed(2));

  return {
    billingMonth,
    cumulativeKWh:  latestEnergy,
    monthlyKWh,
    energyCharge,
    demandCharge:   DEMAND_CHARGE,
    totalAmount,
    breakdown,
  };
};

/**
 * Create a unique transaction ID.
 * Format: SM-<uppercase UUID first segment>
 * @returns {string}
 */
const generateTransactionId = () =>
  `SM-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;

/**
 * Initialise an SSLCommerz payment session.
 * @param {Object} params
 * @param {string} params.transactionId
 * @param {number} params.amount
 * @param {Object} params.userInfo   - { esp_id, student_name, room_number }
 * @param {string} params.billingMonth
 * @returns {Promise<{ url: string, sessionKey: string }>}
 */
const initPaymentSession = async ({ transactionId, amount, userInfo, billingMonth }) => {
  if (!process.env.SSL_STORE_ID || !process.env.SSL_STORE_PASSWORD) {
    throw new Error('Payment gateway is not configured correctly.');
  }

  const backendUrl  = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

  const sslData = {
    total_amount:   amount,
    currency:       'BDT',
    tran_id:        transactionId,

    // ── Redirect URLs ──────────────────────────────────────────────────────────
    success_url: `${backendUrl}/api/payments/webhook?status=success`,
    fail_url:    `${backendUrl}/api/payments/webhook?status=failed`,
    cancel_url:  `${backendUrl}/api/payments/webhook?status=cancelled`,

    // ── Customer Info ──────────────────────────────────────────────────────────
    cus_name:    userInfo.student_name || 'Hostel Resident',
    cus_email:   `${userInfo.esp_id.toLowerCase()}@smarthostel.bd`,
    cus_add1:    `Room ${userInfo.room_number}`,
    cus_add2:    'Smart Hostel',
    cus_city:    'Dhaka',
    cus_state:   'Dhaka',
    cus_postcode:'1000',
    cus_country: 'Bangladesh',
    cus_phone:   '01700000000',

    // ── Product Info ───────────────────────────────────────────────────────────
    product_name:     `Electricity Bill — ${billingMonth}`,
    product_category: 'Utility',
    product_profile:  'general',

    // ── Shipping (required by SSLCommerz, not applicable) ─────────────────────
    shipping_method:  'NO',
    num_of_item:      1,
    ship_name:        userInfo.student_name || 'Hostel Resident',
    ship_add1:        `Room ${userInfo.room_number}`,
    ship_city:        'Dhaka',
    ship_postcode:    '1000',
    ship_country:     'Bangladesh',

    // ── EMI (disabled) ────────────────────────────────────────────────────────
    emi_option: 0,
    multi_card_name: '',
  };

  const sslcz = new SSLCommerzPayment(
    process.env.SSL_STORE_ID,
    process.env.SSL_STORE_PASSWORD,
    IS_LIVE
  );

  let apiResponse;
  try {
    apiResponse = await sslcz.init(sslData);
  } catch (error) {
    console.error('[SSLCommerz] Init Error:', error);
    throw new Error('Unable to connect to payment gateway. Please try again later.');
  }

  if (!apiResponse?.GatewayPageURL) {
    console.error('[SSLCommerz] Missing GatewayPageURL:', apiResponse);
    throw new Error('Unable to connect to payment gateway. Please try again later.');
  }

  return {
    url:        apiResponse.GatewayPageURL,
    sessionKey: apiResponse.sessionkey || '',
  };
};

/**
 * Verify a completed transaction with SSLCommerz validation API.
 * @param {string} transactionId
 * @returns {Promise<Object>} Raw SSLCommerz validation response
 */
const verifyTransaction = async (transactionId) => {
  if (!process.env.SSL_STORE_ID || !process.env.SSL_STORE_PASSWORD) {
    throw new Error('Payment gateway is not configured correctly.');
  }

  const sslcz = new SSLCommerzPayment(
    process.env.SSL_STORE_ID,
    process.env.SSL_STORE_PASSWORD,
    IS_LIVE
  );

  try {
    const validationResponse = await sslcz.validate({ val_id: transactionId });
    return validationResponse;
  } catch (error) {
    console.error('[SSLCommerz] Validate Error:', error);
    throw new Error('Unable to verify payment.');
  }
};

module.exports = {
  calculateCurrentBill,
  calculateEnergyCharge,
  generateTransactionId,
  initPaymentSession,
  verifyTransaction,
  DEMAND_CHARGE,
};

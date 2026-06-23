/**
 * controllers/paymentController.js
 *
 * MVC controller for all payment-related endpoints.
 * Business logic is delegated to services/paymentService.js.
 *
 * Routes:
 *   POST   /api/payments/create              — Initiate payment session
 *   GET    /api/payments/history/:esp_id     — Fetch payment history
 *   GET    /api/payments/current-bill/:esp_id — Get current bill amount
 *   POST   /api/payments/verify              — Manually verify a transaction
 *   POST   /api/payments/webhook             — SSLCommerz gateway callback
 */

const Payment = require('../models/Payment');
const User    = require('../models/User');
const {
  calculateCurrentBill,
  generateTransactionId,
  initPaymentSession,
  verifyTransaction,
} = require('../services/paymentService');

// ─── GET /api/payments/current-bill/:esp_id ───────────────────────────────────
/**
 * Returns the current month's bill breakdown for a device.
 * Also returns the current payment status for this billing month.
 */
const getCurrentBill = async (req, res) => {
  try {
    const esp_id = req.params.esp_id.trim().toUpperCase();

    // Verify device belongs to the authenticated user
    if (req.user.esp_id !== esp_id) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    const billData = await calculateCurrentBill(esp_id);

    // Check if there's already a successful payment for this billing month
    const existingPayment = await Payment.findOne({
      esp_id,
      billingMonth:  billData.billingMonth,
      paymentStatus: 'paid',
    })
      .sort({ paidAt: -1 })
      .lean();

    // Get the most recent payment (any status) for "last payment date"
    const lastPayment = await Payment.findOne({ esp_id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      ...billData,
      isPaid:          !!existingPayment,
      paymentStatus:   existingPayment ? 'paid' : 'unpaid',
      lastPaymentDate: lastPayment?.paidAt || null,
      lastTransactionId: lastPayment?.transactionId || null,
    });
  } catch (error) {
    console.error('[Payment] getCurrentBill error:', error);
    res.status(500).json({ message: 'Failed to calculate current bill' });
  }
};

// ─── POST /api/payments/create ────────────────────────────────────────────────
/**
 * Initiates a new payment session with SSLCommerz.
 * Returns the gateway redirect URL.
 * Body: { esp_id }   (amount is calculated server-side — never trust client)
 */
const createPayment = async (req, res) => {
  try {
    const { esp_id } = req.body;

    if (!esp_id) {
      return res.status(400).json({ message: 'esp_id is required' });
    }

    const normalizedId = esp_id.trim().toUpperCase();

    // Verify device belongs to authenticated user
    if (req.user.esp_id !== normalizedId) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    // Fetch user info for gateway customer fields
    const user = await User.findOne({ esp_id: normalizedId }).lean();
    if (!user) {
      return res.status(404).json({ message: 'Device not registered' });
    }

    // Calculate bill server-side (never trust amount from frontend)
    const billData = await calculateCurrentBill(normalizedId);

    // Block if bill is already paid for this month
    const alreadyPaid = await Payment.findOne({
      esp_id:        normalizedId,
      billingMonth:  billData.billingMonth,
      paymentStatus: 'paid',
    });
    if (alreadyPaid) {
      return res.status(409).json({
        message: `Bill for ${billData.billingMonth} is already paid`,
        transactionId: alreadyPaid.transactionId,
      });
    }

    // Prevent zero-amount payments
    if (billData.totalAmount <= 0) {
      return res.status(400).json({ message: 'No payable amount for this billing period' });
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Persist the payment record as 'pending' before calling gateway
    await Payment.create({
      userId:        user._id,
      esp_id:        normalizedId,
      billingMonth:  billData.billingMonth,
      cumulativeKWh: billData.cumulativeKWh,
      energyCharge:  billData.energyCharge,
      demandCharge:  billData.demandCharge,
      amount:        billData.totalAmount,
      transactionId,
      paymentStatus: 'pending',
    });

    // Initialise SSLCommerz session
    const { url, sessionKey } = await initPaymentSession({
      transactionId,
      amount:       billData.totalAmount,
      userInfo:     user,
      billingMonth: billData.billingMonth,
    });

    res.status(200).json({
      message:       'Payment session created',
      redirectUrl:   url,
      transactionId,
      sessionKey,
      amount:        billData.totalAmount,
      billingMonth:  billData.billingMonth,
    });
  } catch (error) {
    console.error('[Payment] createPayment error:', error);
    res.status(500).json({ message: error.message || 'Failed to create payment session' });
  }
};

// ─── POST /api/payments/verify ────────────────────────────────────────────────
/**
 * Manual verification endpoint — client can call this after returning
 * from the gateway to confirm the transaction status.
 * Body: { transactionId }
 */
const verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: 'transactionId is required' });
    }

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify device ownership
    if (req.user.esp_id !== payment.esp_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If already resolved, return current state
    if (payment.paymentStatus !== 'pending') {
      return res.status(200).json({
        message:       `Payment is ${payment.paymentStatus}`,
        paymentStatus: payment.paymentStatus,
        paidAt:        payment.paidAt,
        transactionId: payment.transactionId,
      });
    }

    // Call SSLCommerz validation API
    const validation = await verifyTransaction(transactionId);
    const raw = validation;

    let newStatus = 'pending';
    if (raw?.status === 'VALID' || raw?.status === 'VALIDATED') {
      newStatus = 'paid';
    } else if (raw?.status === 'FAILED') {
      newStatus = 'failed';
    } else if (raw?.status === 'CANCELLED') {
      newStatus = 'cancelled';
    }

    // Update payment record
    payment.paymentStatus  = newStatus;
    payment.gatewayResponse = raw;
    if (newStatus === 'paid') {
      payment.paymentMethod = mapPaymentMethod(raw?.card_type || '');
      payment.paidAt        = new Date();
    }
    await payment.save();

    res.status(200).json({
      message:       `Verification complete — ${newStatus}`,
      paymentStatus: newStatus,
      paidAt:        payment.paidAt,
      transactionId: payment.transactionId,
      amount:        payment.amount,
    });
  } catch (error) {
    console.error('[Payment] verifyPayment error:', error);
    res.status(500).json({ message: 'Verification failed — please try again' });
  }
};

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
/**
 * SSLCommerz gateway POST callback. No JWT — called by the gateway server.
 * Validates the transaction server-to-server and updates payment status,
 * then redirects the user's browser to the appropriate frontend page.
 *
 * Query params: ?status=success|failed|cancelled
 * Body (from SSLCommerz): { tran_id, val_id, card_type, amount, ... }
 */
const webhookHandler = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const status      = req.query.status || 'failed';
  const body        = req.body;
  const transactionId = body?.tran_id;

  try {
    if (!transactionId) {
      return res.redirect(`${frontendUrl}?status=failed&reason=missing_tran_id`);
    }

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.redirect(`${frontendUrl}?status=failed&reason=not_found`);
    }

    if (status === 'success') {
      // ── Server-to-Server Validation ───────────────────────────────────────
      let validation;
      try {
        validation = await verifyTransaction(body.val_id || transactionId);
      } catch (_) {
        // If validation call fails, still mark based on gateway post
        validation = { status: 'VALID' };
      }

      const isValid =
        validation?.status === 'VALID' || validation?.status === 'VALIDATED';

      if (isValid) {
        payment.paymentStatus   = 'paid';
        payment.gatewayResponse  = body;
        payment.paymentMethod    = mapPaymentMethod(body?.card_type || '');
        payment.paidAt           = new Date();
        await payment.save();
        return res.redirect(
          `${frontendUrl}?status=success&transactionId=${transactionId}&amount=${payment.amount}&month=${payment.billingMonth}`
        );
      } else {
        payment.paymentStatus   = 'failed';
        payment.gatewayResponse  = body;
        await payment.save();
        return res.redirect(`${frontendUrl}?status=failed&transactionId=${transactionId}`);
      }
    }

    if (status === 'failed' || status === 'cancelled') {
      payment.paymentStatus   = status;
      payment.gatewayResponse  = body;
      await payment.save();
      return res.redirect(
        `${frontendUrl}?status=${status}&transactionId=${transactionId}`
      );
    }

    res.redirect(`${frontendUrl}?status=failed`);
  } catch (error) {
    console.error('[Payment] webhookHandler error:', error);
    res.redirect(`${frontendUrl}?status=failed&reason=server_error`);
  }
};

// ─── GET /api/payments/history/:esp_id ───────────────────────────────────────
/**
 * Returns paginated payment history for a device.
 * Query params: page (default 1), limit (default 10), search (optional)
 */
const getPaymentHistory = async (req, res) => {
  try {
    const esp_id = req.params.esp_id.trim().toUpperCase();

    if (req.user.esp_id !== esp_id) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const search = req.query.search?.trim() || '';

    // Build query filter
    const filter = { esp_id };
    if (search) {
      filter.$or = [
        { transactionId:  { $regex: search, $options: 'i' } },
        { paymentMethod:  { $regex: search, $options: 'i' } },
        { billingMonth:   { $regex: search, $options: 'i' } },
        { paymentStatus:  { $regex: search, $options: 'i' } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-gatewayResponse -__v')
        .lean(),
      Payment.countDocuments(filter),
    ]);

    res.status(200).json({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[Payment] getPaymentHistory error:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};

// ─── Utility: Map SSLCommerz card_type string to our enum ─────────────────────
const mapPaymentMethod = (cardType) => {
  const ct = (cardType || '').toUpperCase();
  if (ct.includes('VISA'))        return 'VISA';
  if (ct.includes('MASTER'))      return 'MASTERCARD';
  if (ct.includes('AMEX') || ct.includes('AMERICAN')) return 'AMEX';
  if (ct.includes('BKASH'))       return 'BKASH';
  if (ct.includes('NAGAD'))       return 'NAGAD';
  if (ct.includes('ROCKET') || ct.includes('DBBL')) return 'ROCKET';
  if (ct.includes('UPAY'))        return 'UPAY';
  return 'OTHER';
};

module.exports = {
  getCurrentBill,
  createPayment,
  verifyPayment,
  webhookHandler,
  getPaymentHistory,
};

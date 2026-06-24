/**
 * backend/scripts/seed.js
 *
 * Dedicated database seeding script.
 * Drops the active collections (Users, Readings, Alerts, Payments)
 * and seeds clean resident accounts with encrypted passwords,
 * historical energy readings (for beautiful analytics charts),
 * sample payment records, and dummy AI alerts.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Reading  = require('../models/Reading');
const Alert    = require('../models/Alert');
const Payment  = require('../models/Payment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_meter';

const seedDatabase = async () => {
  try {
    console.log(`[Seed] Connecting to database: ${MONGO_URI.split('@').pop()}`);
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected successfully.');

    // ── 1. Clean Database ───────────────────────────────────────────────────
    console.log('[Seed] Cleaning existing data...');
    await User.deleteMany({});
    await Reading.deleteMany({});
    await Alert.deleteMany({});
    await Payment.deleteMany({});
    console.log('[Seed] Database cleared.');

    // ── 2. Create Users ─────────────────────────────────────────────────────
    console.log('[Seed] Seeding residents...');
    
    // Alice Rahman (Default Resident)
    // password defaults to the esp_id if left blank or can be set explicitly
    const alice = await User.create({
      esp_id:          'ESP-2049',
      student_name:    'Alice Rahman',
      room_number:     '101',
      password:        'ESP-2049',
      daily_limit_kwh: 5.0,
    });

    // Bob Smith (Second Resident)
    const bob = await User.create({
      esp_id:          'ESP-8888',
      student_name:    'Bob Smith',
      room_number:     '102',
      password:        'ESP-8888',
      daily_limit_kwh: 6.0,
    });

    console.log(`[Seed] Seeded users:\n  - Alice Rahman (${alice.esp_id})\n  - Bob Smith (${bob.esp_id})`);

    // ── 3. Seed Telemetry readings (24 hours back) ──────────────────────────
    console.log('[Seed] Seeding 24 hours of telemetry readings for chart visualizations...');
    
    const now = new Date();
    const readingDocs = [];
    
    // Alice's readings: gradual power usage increment
    let aliceEnergy = 0.05;
    // Bob's readings: higher starting energy
    let bobEnergy = 0.12;

    for (let h = 24; h >= 0; h--) {
      // 1 reading per hour
      const timeStamp = new Date(now.getTime() - h * 60 * 60 * 1000);

      // Alice: standard lights + laptop load (50W - 150W)
      const aliceVolts = 218 + Math.random() * 6;
      const alicePower = 60 + Math.random() * 80;
      const aliceCurr  = alicePower / aliceVolts;
      aliceEnergy += (alicePower * 1.0) / 1000; // 1 hour of power in kWh

      readingDocs.push({
        esp_id:    alice.esp_id,
        timestamp: timeStamp,
        voltage:   parseFloat(aliceVolts.toFixed(2)),
        current:   parseFloat(aliceCurr.toFixed(3)),
        power:     parseFloat(alicePower.toFixed(2)),
        energy:    parseFloat(aliceEnergy.toFixed(4)),
      });

      // Bob: higher load (100W - 350W)
      const bobVolts = 217 + Math.random() * 7;
      const bobPower = 110 + Math.random() * 200;
      const bobCurr  = bobPower / bobVolts;
      bobEnergy += (bobPower * 1.0) / 1000;

      readingDocs.push({
        esp_id:    bob.esp_id,
        timestamp: timeStamp,
        voltage:   parseFloat(bobVolts.toFixed(2)),
        current:   parseFloat(bobCurr.toFixed(3)),
        power:     parseFloat(bobPower.toFixed(2)),
        energy:    parseFloat(bobEnergy.toFixed(4)),
      });
    }

    await Reading.insertMany(readingDocs);
    console.log(`[Seed] Seeded ${readingDocs.length} historical readings.`);

    // ── 4. Seed Payment Records ─────────────────────────────────────────────
    console.log('[Seed] Seeding payment history records...');
    
    const lastMonthStr = new Date(now.getFullYear(), now.getMonth() - 1)
      .toISOString()
      .slice(0, 7); // YYYY-MM

    // Alice paid last month's bill
    await Payment.create({
      userId:         alice._id,
      esp_id:         alice.esp_id,
      billingMonth:   lastMonthStr,
      cumulativeKWh:  42.5,
      energyCharge:   223.55, // 42.5 * 5.26
      demandCharge:   42.00,
      amount:         265.55,
      paymentStatus:  'paid',
      paymentMethod:  'BKASH',
      transactionId:  'TXN_ALICE_SEED_99',
      paidAt:         new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    });

    // Bob failed first attempt then paid
    await Payment.create({
      userId:         bob._id,
      esp_id:         bob.esp_id,
      billingMonth:   lastMonthStr,
      cumulativeKWh:  85.0,
      energyCharge:   458.70, // step rate
      demandCharge:   42.00,
      amount:         500.70,
      paymentStatus:  'failed',
      paymentMethod:  'VISA',
      transactionId:  'TXN_BOB_FAIL_12',
      paidAt:         null,
    });

    await Payment.create({
      userId:         bob._id,
      esp_id:         bob.esp_id,
      billingMonth:   lastMonthStr,
      cumulativeKWh:  85.0,
      energyCharge:   458.70,
      demandCharge:   42.00,
      amount:         500.70,
      paymentStatus:  'paid',
      paymentMethod:  'NAGAD',
      transactionId:  'TXN_BOB_SUCCESS_34',
      paidAt:         new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    });

    console.log('[Seed] Seeded historical payments.');

    // ── 5. Seed active AI Alert ─────────────────────────────────────────────
    console.log('[Seed] Seeding sample AI alert...');
    
    await Alert.create({
      esp_id:       alice.esp_id,
      severity:     'anomaly',
      message:      'Potential high-wattage resistive load (1200W electric kettle/heater) detected. Please check your room appliances.',
      avg_power:    1240.5,
      ai_response:  'The device telemetry shows a sustained load of 1240W over 5 minutes. This pattern corresponds with high-resistance heating elements such as a water heater or electric kettle, which are prohibited in the student hostel.',
      acknowledged: false,
    });

    console.log('[Seed] Seeding complete. All models populated successfully.');

  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Database disconnected.');
  }
};

seedDatabase();

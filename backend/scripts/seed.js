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
    console.log('[Seed] Seeding residents (Authors)...');
    
    // Nasor Hidar (Primary Resident)
    const nasor = await User.create({
      esp_id:          'ESP-2049',
      student_name:    'Nasor Hidar',
      room_number:     '101',
      password:        'ESP-2049',
      daily_limit_kwh: 5.0,
    });

    // MD. SHAHRIAR SHAKIB (Second Resident)
    const shakib = await User.create({
      esp_id:          'ESP-8888',
      student_name:    'MD. SHAHRIAR SHAKIB',
      room_number:     '102',
      password:        'ESP-8888',
      daily_limit_kwh: 6.0,
    });

    // SUHITA SRUTEE (Third Resident)
    const suhita = await User.create({
      esp_id:          'ESP-0404',
      student_name:    'SUHITA SRUTEE',
      room_number:     '103',
      password:        'ESP-0404',
      daily_limit_kwh: 4.5,
    });

    console.log(`[Seed] Seeded users:\n  - Nasor Hidar (${nasor.esp_id})\n  - MD. SHAHRIAR SHAKIB (${shakib.esp_id})\n  - SUHITA SRUTEE (${suhita.esp_id})`);

    // ── 3. Seed Telemetry readings (24 hours back) ──────────────────────────
    console.log('[Seed] Seeding 24 hours of telemetry readings for chart visualizations...');
    
    const now = new Date();
    const readingDocs = [];
    
    let nasorEnergy = 0.05;
    let shakibEnergy = 0.12;
    let suhitaEnergy = 0.08;

    for (let h = 24; h >= 0; h--) {
      const timeStamp = new Date(now.getTime() - h * 60 * 60 * 1000);

      // Nasor: standard loads (50W - 150W)
      const nasorVolts = 218 + Math.random() * 6;
      const nasorPower = 60 + Math.random() * 80;
      const nasorCurr  = nasorPower / nasorVolts;
      nasorEnergy += (nasorPower * 1.0) / 1000;

      readingDocs.push({
        esp_id:    nasor.esp_id,
        timestamp: timeStamp,
        voltage:   parseFloat(nasorVolts.toFixed(2)),
        current:   parseFloat(nasorCurr.toFixed(3)),
        power:     parseFloat(nasorPower.toFixed(2)),
        energy:    parseFloat(nasorEnergy.toFixed(4)),
      });

      // Shakib: higher loads (100W - 350W)
      const shakibVolts = 217 + Math.random() * 7;
      const shakibPower = 110 + Math.random() * 200;
      const shakibCurr  = shakibPower / shakibVolts;
      shakibEnergy += (shakibPower * 1.0) / 1000;

      readingDocs.push({
        esp_id:    shakib.esp_id,
        timestamp: timeStamp,
        voltage:   parseFloat(shakibVolts.toFixed(2)),
        current:   parseFloat(shakibCurr.toFixed(3)),
        power:     parseFloat(shakibPower.toFixed(2)),
        energy:    parseFloat(shakibEnergy.toFixed(4)),
      });

      // Suhita: standard loads (40W - 200W)
      const suhitaVolts = 219 + Math.random() * 5;
      const suhitaPower = 50 + Math.random() * 150;
      const suhitaCurr  = suhitaPower / suhitaVolts;
      suhitaEnergy += (suhitaPower * 1.0) / 1000;

      readingDocs.push({
        esp_id:    suhita.esp_id,
        timestamp: timeStamp,
        voltage:   parseFloat(suhitaVolts.toFixed(2)),
        current:   parseFloat(suhitaCurr.toFixed(3)),
        power:     parseFloat(suhitaPower.toFixed(2)),
        energy:    parseFloat(suhitaEnergy.toFixed(4)),
      });
    }

    await Reading.insertMany(readingDocs);
    console.log(`[Seed] Seeded ${readingDocs.length} historical readings.`);

    // ── 4. Seed Payment Records ─────────────────────────────────────────────
    console.log('[Seed] Seeding payment history records...');
    
    const lastMonthStr = new Date(now.getFullYear(), now.getMonth() - 1)
      .toISOString()
      .slice(0, 7);

    // Nasor paid last month's bill
    await Payment.create({
      userId:         nasor._id,
      esp_id:         nasor.esp_id,
      billingMonth:   lastMonthStr,
      cumulativeKWh:  42.5,
      energyCharge:   223.55,
      demandCharge:   42.00,
      amount:         265.55,
      paymentStatus:  'paid',
      paymentMethod:  'BKASH',
      transactionId:  'TXN_NASOR_SEED_99',
      paidAt:         new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    });

    // Shakib failed first attempt then paid
    await Payment.create({
      userId:         shakib._id,
      esp_id:         shakib.esp_id,
      billingMonth:   lastMonthStr,
      cumulativeKWh:  85.0,
      energyCharge:   458.70,
      demandCharge:   42.00,
      amount:         500.70,
      paymentStatus:  'failed',
      paymentMethod:  'VISA',
      transactionId:  'TXN_SHAKIB_FAIL_12',
      paidAt:         null,
    });

    await Payment.create({
      userId:         shakib._id,
      esp_id:         shakib.esp_id,
      billingMonth:   lastMonthStr,
      cumulativeKWh:  85.0,
      energyCharge:   458.70,
      demandCharge:   42.00,
      amount:         500.70,
      paymentStatus:  'paid',
      paymentMethod:  'NAGAD',
      transactionId:  'TXN_SHAKIB_SUCCESS_34',
      paidAt:         new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    });

    console.log('[Seed] Seeded historical payments.');

    // ── 5. Seed active AI Alert ─────────────────────────────────────────────
    console.log('[Seed] Seeding sample AI alert...');
    
    await Alert.create({
      esp_id:       nasor.esp_id,
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

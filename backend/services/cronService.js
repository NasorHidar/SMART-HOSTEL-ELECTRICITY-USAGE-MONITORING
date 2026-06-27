const cron = require('node-cron');
const User = require('../models/User');
const Reading = require('../models/Reading');
const { calculateEnergyCharge } = require('./paymentService');
const { generateDailyReportPDF } = require('./pdfService');
const { sendDailyReportEmail } = require('./emailService');

const runDailyReportJob = async () => {
  console.log('[Cron] Starting daily electricity report generation and dispatch...');
  try {
    const users = await User.find({}).lean();
    if (users.length === 0) {
      console.log('[Cron] No registered users found.');
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    for (const user of users) {
      const esp_id = user.esp_id;

      // 1. Fetch latest reading
      const latest = await Reading.findOne({ esp_id })
        .sort({ timestamp: -1 })
        .lean();

      if (!latest) {
        console.log(`[Cron] No readings found for device ${esp_id}. Skipping report.`);
        continue;
      }

      // 2. Fetch daily energy (delta from start of day)
      const [firstToday, lastToday] = await Promise.all([
        Reading.findOne({ esp_id, timestamp: { $gte: startOfDay } })
          .sort({ timestamp: 1 })
          .lean(),
        Reading.findOne({ esp_id, timestamp: { $gte: startOfDay } })
          .sort({ timestamp: -1 })
          .lean(),
      ]);

      const dailyKWh =
        firstToday && lastToday
          ? Math.max(0, lastToday.energy - firstToday.energy)
          : 0;

      // 3. Billing Calculations
      const dailyCost = calculateEnergyCharge(dailyKWh).energyCharge;
      const cumulativeKWh = latest.energy || 0;
      const cumulativeBill = calculateEnergyCharge(cumulativeKWh).energyCharge;

      const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

      // 4. Construct PDF Data
      const reportData = {
        studentName: user.student_name,
        roomNumber: user.room_number,
        esp_id: user.esp_id,
        billingMonth: currentMonth,
        dailyKWh,
        dailyCost,
        cumulativeKWh,
        cumulativeBill
      };

      // 5. Generate PDF and email
      const pdfBuffer = await generateDailyReportPDF(reportData);
      
      // Default to user.email or fallback/demo email
      const toEmail = user.email || 'student@example.com';
      await sendDailyReportEmail(toEmail, user.student_name, pdfBuffer);
    }
  } catch (error) {
    console.error('[Cron] Error running daily report job:', error);
  }
};

const startDailyReportCron = () => {
  console.log('[Cron] Daily PDF report cron service started (runs at 00:00 daily)');
  
  // '0 0 * * *' = every day at midnight (00:00)
  cron.schedule('0 0 * * *', runDailyReportJob);
};

module.exports = {
  startDailyReportCron,
  runDailyReportJob
};

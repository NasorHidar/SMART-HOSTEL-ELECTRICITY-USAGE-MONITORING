const nodemailer = require('nodemailer');

/**
 * Send an email with the PDF report attached.
 * @param {string} toEmail - Recipient email
 * @param {string} studentName - Recipient name
 * @param {Buffer} pdfBuffer - Generated PDF as buffer
 * @returns {Promise<boolean>} - Success status
 */
const sendDailyReportEmail = async (toEmail, studentName, pdfBuffer) => {
  try {
    // Configure transporter using env variables, or create a mock transporter if not available
    let transporter;
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Create Ethereal test account if SMTP is not configured
      console.log('[EmailService] SMTP not configured. Creating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Smart Meter Team" <noreply@smartmeter.com>',
      to: toEmail || 'student@example.com',
      subject: `⚡ Your Daily Smart Meter Usage Report — ${new Date().toLocaleDateString()}`,
      text: `Hello ${studentName || 'Student'},\n\nPlease find attached your daily electricity consumption report.\n\nBest regards,\nSmart Meter Team`,
      html: `<p>Hello <strong>${studentName || 'Student'}</strong>,</p><p>Please find attached your daily electricity consumption report.</p><p>Best regards,<br>Smart Meter Team</p>`,
      attachments: [
        {
          filename: `Daily_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
          content: pdfBuffer
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    
    // If Ethereal test account is used, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EmailService] Ethereal Preview URL: ${previewUrl}`);
    }

    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
    return false;
  }
};

module.exports = {
  sendDailyReportEmail
};

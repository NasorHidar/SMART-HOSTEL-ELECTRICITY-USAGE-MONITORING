const PDFDocument = require('pdfkit');

/**
 * Generate a PDF report for a user's daily energy consumption.
 * @param {Object} data - Contains user details, daily usage, and billing info
 * @returns {Promise<Buffer>} - Resolves to the PDF document as a Buffer
 */
const generateDailyReportPDF = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Colors
    const primaryColor = '#188251'; // Smart Meter Brand Green
    const darkColor = '#0f172a'; // Deep slate
    const lightGrey = '#f1f5f9';

    // Title / Header
    doc.fillColor(primaryColor).fontSize(26).font('Helvetica-Bold').text('⚡ SMART METER', { align: 'center' });
    doc.fillColor(darkColor).fontSize(14).font('Helvetica').text('Daily Electricity Consumption Report', { align: 'center' });
    doc.moveDown(2);

    // Metadata Panel
    doc.rect(50, doc.y, 500, 100).fill(lightGrey);
    doc.fillColor(darkColor).fontSize(10).font('Helvetica');
    
    // Position text inside panel
    const currentY = doc.y;
    doc.text(`Student Name: ${data.studentName || 'N/A'}`, 70, currentY + 15);
    doc.text(`Room Number: Room ${data.roomNumber || 'N/A'}`, 70, currentY + 35);
    doc.text(`Device ID: ${data.esp_id}`, 70, currentY + 55);
    doc.text(`Billing Month: ${data.billingMonth || 'N/A'}`, 70, currentY + 75);

    const reportDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    doc.text(`Report Date: ${reportDate}`, 350, currentY + 15);
    doc.text(`Status: Active`, 350, currentY + 35);

    doc.y = currentY + 120; // reset y below the panel

    // Headline Summary
    doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('Usage Summary');
    doc.moveDown(0.5);

    // Details Grid
    const usageY = doc.y;
    doc.rect(50, usageY, 240, 60).fill('#eefbf3');
    doc.fillColor('#10452e').fontSize(11).font('Helvetica-Bold').text("TODAY'S ENERGY CONSUMED", 65, usageY + 15);
    doc.fontSize(16).text(`${data.dailyKWh.toFixed(3)} kWh`, 65, usageY + 32);

    doc.rect(310, usageY, 240, 60).fill('#fef3c7');
    doc.fillColor('#78350f').fontSize(11).font('Helvetica-Bold').text("TODAY'S ESTIMATED COST", 325, usageY + 15);
    doc.fontSize(16).text(`BDT ${data.dailyCost.toFixed(2)} Tk`, 325, usageY + 32);

    doc.y = usageY + 80;

    // Cumulative stats
    doc.fillColor(darkColor).fontSize(11).font('Helvetica').text(`Cumulative Energy: ${data.cumulativeKWh.toFixed(3)} kWh`);
    doc.text(`Cumulative Estimated Bill: BDT ${data.cumulativeBill.toFixed(2)} Tk`);
    doc.moveDown(2);

    // Tip Box
    doc.rect(50, doc.y, 500, 50).fill('#eff6ff');
    doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Oblique')
       .text('Eco Tip: Unplug high-load devices (heaters, kettles) when not in use. Small changes make a big difference for the environment!', 65, doc.y + 15, { width: 470 });

    doc.moveDown(4);

    // Footer
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Powered by Smart Hostel Electricity Monitoring System. All rights reserved.', { align: 'center' });

    doc.end();
  });
};

module.exports = {
  generateDailyReportPDF
};

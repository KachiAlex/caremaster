const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReceiptGenerator {
  constructor() {
    this.receiptsDir = path.join(__dirname, '../receipts');
    this.ensureReceiptsDirectory();
  }

  ensureReceiptsDirectory() {
    if (!fs.existsSync(this.receiptsDir)) {
      fs.mkdirSync(this.receiptsDir, { recursive: true });
    }
  }

  async generateReceipt(transaction, user, receiptNumber) {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `receipt-${receiptNumber}.pdf`;
        const filePath = path.join(this.receiptsDir, fileName);
        
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20)
           .fillColor('#1a365d')
           .text('NIGER DELTA UNIVERSITY', { align: 'center' });
        
        doc.fontSize(16)
           .fillColor('#2d3748')
           .text('TUITION PAYMENT RECEIPT', { align: 'center' });
        
        doc.moveDown(2);

        // Receipt details
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text(`Receipt Number: ${receiptNumber}`, { align: 'right' })
           .text(`Date: ${new Date(transaction.paid_at || transaction.created_at).toLocaleDateString('en-NG')}`, { align: 'right' })
           .text(`Reference: ${transaction.reference}`, { align: 'right' });
        
        doc.moveDown(2);

        // Student Information
        doc.fontSize(14)
           .fillColor('#2d3748')
           .text('STUDENT INFORMATION', { underline: true });
        
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text(`Matric Number: ${user.matric_number}`)
           .text(`Full Name: ${user.first_name} ${user.last_name}`)
           .text(`Department: ${user.department}`)
           .text(`Level: ${user.level}`)
           .text(`Session: ${user.session}`);
        
        doc.moveDown(2);

        // Payment Information
        doc.fontSize(14)
           .fillColor('#2d3748')
           .text('PAYMENT INFORMATION', { underline: true });
        
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text(`Amount Paid: ₦${transaction.amount.toLocaleString()}`)
           .text(`Payment Status: ${transaction.status.toUpperCase()}`)
           .text(`Payment Method: ${transaction.payment_method || 'N/A'}`);
        
        if (transaction.paid_at) {
          doc.text(`Payment Date: ${new Date(transaction.paid_at).toLocaleString('en-NG')}`);
        }
        
        if (transaction.description) {
          doc.text(`Description: ${transaction.description}`);
        }

        doc.moveDown(2);

        // School Information
        doc.fontSize(14)
           .fillColor('#2d3748')
           .text('SCHOOL INFORMATION', { underline: true });
        
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text('Niger Delta University')
           .text('Wilberforce Island, Bayelsa State, Nigeria')
           .text('Email: info@ndu.edu.ng')
           .text('Website: www.ndu.edu.ng')
           .text('Phone: +234-XXX-XXX-XXXX');

        doc.moveDown(3);

        // Footer
        doc.fontSize(10)
           .fillColor('#718096')
           .text('This is a computer-generated receipt and does not require a signature.', { align: 'center' })
           .text('For inquiries, contact the Bursary Department.', { align: 'center' });

        // Add a border
        doc.rect(30, 30, 535, 750)
           .stroke('#e2e8f0');

        doc.end();

        stream.on('finish', () => {
          resolve({
            filePath,
            fileName,
            receiptNumber
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async generateReceiptBuffer(transaction, user, receiptNumber) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Same content as generateReceipt but without file writing
        doc.fontSize(20)
           .fillColor('#1a365d')
           .text('NIGER DELTA UNIVERSITY', { align: 'center' });
        
        doc.fontSize(16)
           .fillColor('#2d3748')
           .text('TUITION PAYMENT RECEIPT', { align: 'center' });
        
        doc.moveDown(2);

        doc.fontSize(12)
           .fillColor('#4a5568')
           .text(`Receipt Number: ${receiptNumber}`, { align: 'right' })
           .text(`Date: ${new Date(transaction.paid_at || transaction.created_at).toLocaleDateString('en-NG')}`, { align: 'right' })
           .text(`Reference: ${transaction.reference}`, { align: 'right' });
        
        doc.moveDown(2);

        doc.fontSize(14)
           .fillColor('#2d3748')
           .text('STUDENT INFORMATION', { underline: true });
        
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text(`Matric Number: ${user.matric_number}`)
           .text(`Full Name: ${user.first_name} ${user.last_name}`)
           .text(`Department: ${user.department}`)
           .text(`Level: ${user.level}`)
           .text(`Session: ${user.session}`);
        
        doc.moveDown(2);

        doc.fontSize(14)
           .fillColor('#2d3748')
           .text('PAYMENT INFORMATION', { underline: true });
        
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text(`Amount Paid: ₦${transaction.amount.toLocaleString()}`)
           .text(`Payment Status: ${transaction.status.toUpperCase()}`)
           .text(`Payment Method: ${transaction.payment_method || 'N/A'}`);
        
        if (transaction.paid_at) {
          doc.text(`Payment Date: ${new Date(transaction.paid_at).toLocaleString('en-NG')}`);
        }
        
        if (transaction.description) {
          doc.text(`Description: ${transaction.description}`);
        }

        doc.moveDown(2);

        doc.fontSize(14)
           .fillColor('#2d3748')
           .text('SCHOOL INFORMATION', { underline: true });
        
        doc.fontSize(12)
           .fillColor('#4a5568')
           .text('Niger Delta University')
           .text('Wilberforce Island, Bayelsa State, Nigeria')
           .text('Email: info@ndu.edu.ng')
           .text('Website: www.ndu.edu.ng')
           .text('Phone: +234-XXX-XXX-XXXX');

        doc.moveDown(3);

        doc.fontSize(10)
           .fillColor('#718096')
           .text('This is a computer-generated receipt and does not require a signature.', { align: 'center' })
           .text('For inquiries, contact the Bursary Department.', { align: 'center' });

        doc.rect(30, 30, 535, 750)
           .stroke('#e2e8f0');

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ReceiptGenerator;

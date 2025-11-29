import { db, functions } from '../firebase/config';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

/**
 * Pharmacy Notification Service
 * Handles email and SMS notifications for pharmacy operations
 */

// Firebase Cloud Functions for sending emails/SMS
const sendEmailFunction = httpsCallable(functions, 'sendEmail');
const sendSMSFunction = httpsCallable(functions, 'sendSMS');

export const pharmacyNotificationService = {
  
  /**
   * Send invoice receipt via email
   */
  sendInvoiceEmail: async (invoiceData, clientEmail) => {
    try {
      const emailTemplate = generateInvoiceEmailTemplate(invoiceData);
      
      await sendEmailFunction({
        to: clientEmail,
        subject: `Pharmacy Invoice ${invoiceData.invoiceNumber}`,
        html: emailTemplate,
        attachments: [] // Can add PDF attachment here
      });

      // Log notification
      await logNotification({
        type: 'invoice_email',
        recipient: clientEmail,
        invoiceId: invoiceData.id,
        status: 'sent'
      });

      return { success: true, message: 'Invoice email sent successfully' };
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  },

  /**
   * Send prescription ready SMS
   */
  sendPrescriptionReadySMS: async (clientPhone, clientName, pharmacyName) => {
    try {
      const message = `Hello ${clientName}, your prescription is ready for pickup at ${pharmacyName}. Please bring your ID. Thank you!`;
      
      await sendSMSFunction({
        to: clientPhone,
        message: message
      });

      // Log notification
      await logNotification({
        type: 'prescription_ready_sms',
        recipient: clientPhone,
        message: message,
        status: 'sent'
      });

      return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  },

  /**
   * Send prescription ready email
   */
  sendPrescriptionReadyEmail: async (clientEmail, clientName, prescriptions, pharmacyInfo) => {
    try {
      const emailTemplate = generatePrescriptionReadyTemplate(clientName, prescriptions, pharmacyInfo);
      
      await sendEmailFunction({
        to: clientEmail,
        subject: 'Your Prescription is Ready for Pickup',
        html: emailTemplate
      });

      await logNotification({
        type: 'prescription_ready_email',
        recipient: clientEmail,
        status: 'sent'
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending prescription ready email:', error);
      throw error;
    }
  },

  /**
   * Send refill reminder
   */
  sendRefillReminder: async (clientContact, medicationName, daysRemaining) => {
    try {
      const { email, phone } = clientContact;
      const message = `Your ${medicationName} prescription has ${daysRemaining} days remaining. Time to request a refill!`;

      // Send email
      if (email) {
        const emailTemplate = generateRefillReminderTemplate(medicationName, daysRemaining);
        await sendEmailFunction({
          to: email,
          subject: 'Prescription Refill Reminder',
          html: emailTemplate
        });
      }

      // Send SMS
      if (phone) {
        await sendSMSFunction({
          to: phone,
          message: message
        });
      }

      await logNotification({
        type: 'refill_reminder',
        recipient: email || phone,
        medicationName,
        status: 'sent'
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending refill reminder:', error);
      throw error;
    }
  },

  /**
   * Send safety alert to pharmacist
   */
  sendSafetyAlert: async (pharmacistEmail, alertDetails) => {
    try {
      const emailTemplate = generateSafetyAlertTemplate(alertDetails);
      
      await sendEmailFunction({
        to: pharmacistEmail,
        subject: '⚠️ Critical Drug Interaction Alert',
        html: emailTemplate,
        priority: 'high'
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending safety alert:', error);
      throw error;
    }
  },

  /**
   * Send payment confirmation
   */
  sendPaymentConfirmation: async (clientEmail, invoiceData, paymentDetails) => {
    try {
      const emailTemplate = generatePaymentConfirmationTemplate(invoiceData, paymentDetails);
      
      await sendEmailFunction({
        to: clientEmail,
        subject: `Payment Confirmation - Invoice ${invoiceData.invoiceNumber}`,
        html: emailTemplate
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      throw error;
    }
  },

  /**
   * Send medication counseling reminder
   */
  sendCounselingReminder: async (clientEmail, appointmentTime, pharmacistName) => {
    try {
      const emailTemplate = generateCounselingReminderTemplate(appointmentTime, pharmacistName);
      
      await sendEmailFunction({
        to: clientEmail,
        subject: 'Medication Counseling Appointment Reminder',
        html: emailTemplate
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending counseling reminder:', error);
      throw error;
    }
  },

  /**
   * Bulk notification for low stock alerts
   */
  sendLowStockAlert: async (pharmacistEmails, lowStockItems) => {
    try {
      const emailTemplate = generateLowStockAlertTemplate(lowStockItems);
      
      for (const email of pharmacistEmails) {
        await sendEmailFunction({
          to: email,
          subject: '⚠️ Low Stock Alert - Immediate Action Required',
          html: emailTemplate
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending low stock alert:', error);
      throw error;
    }
  }
};

/**
 * Helper: Log notifications for tracking
 */
async function logNotification(notificationData) {
  try {
    await addDoc(collection(db, 'pharmacyNotifications'), {
      ...notificationData,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

/**
 * Email Template: Invoice
 */
function generateInvoiceEmailTemplate(invoice) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
    .items-table td { padding: 12px; border-bottom: 1px solid #ddd; }
    .total { font-size: 24px; font-weight: bold; color: #667eea; text-align: right; margin: 20px 0; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Pharmacy Invoice</h1>
      <p>Thank you for your business!</p>
    </div>
    
    <div class="content">
      <div class="invoice-details">
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
        <p><strong>Client:</strong> ${invoice.clientName}</p>
        <p><strong>Pharmacist:</strong> ${invoice.pharmacistName}</p>
      </div>

      <h3>Items</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.name} (${item.dosage})</td>
              <td>${item.quantity}</td>
              <td>₦${item.totalPrice.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total">
        <p>Total: ₦${invoice.total.toLocaleString()}</p>
      </div>

      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #856404; margin: 0 0 10px 0;">Important Reminders:</h4>
        <ul style="color: #856404; margin: 0; padding-left: 20px;">
          <li>Take medications as prescribed</li>
          <li>Store in a cool, dry place</li>
          <li>Check expiry dates before use</li>
          <li>Contact your doctor if you experience side effects</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Services</p>
      <p>For questions, contact your pharmacist</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email Template: Prescription Ready
 */
function generatePrescriptionReadyTemplate(clientName, prescriptions, pharmacyInfo) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .prescription-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Your Prescription is Ready!</h1>
    </div>
    
    <div class="content">
      <p>Hello ${clientName},</p>
      <p>Great news! Your prescription(s) are now ready for pickup at ${pharmacyInfo.name}.</p>
      
      <h3>Ready for Pickup:</h3>
      ${prescriptions.map(p => `
        <div class="prescription-box">
          <h4>${p.name}</h4>
          <p>Dosage: ${p.dosage}</p>
          <p>Frequency: ${p.frequency}</p>
        </div>
      `).join('')}

      <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #0284c7; margin: 0 0 10px 0;">Pickup Information:</h4>
        <p style="margin: 5px 0;"><strong>Location:</strong> ${pharmacyInfo.address || 'Main Pharmacy'}</p>
        <p style="margin: 5px 0;"><strong>Hours:</strong> ${pharmacyInfo.hours || 'Mon-Fri: 8am-6pm'}</p>
        <p style="margin: 5px 0;"><strong>Important:</strong> Please bring a valid ID</p>
      </div>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Services</p>
      <p>Questions? Contact us at ${pharmacyInfo.phone || 'your pharmacy'}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email Template: Refill Reminder
 */
function generateRefillReminderTemplate(medicationName, daysRemaining) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Prescription Refill Reminder</h1>
    </div>
    
    <div class="content">
      <p>Your <strong>${medicationName}</strong> prescription has <strong>${daysRemaining} days</strong> remaining.</p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h4 style="color: #92400e; margin: 0 0 10px 0;">Time to Request a Refill!</h4>
        <p style="color: #92400e; margin: 0;">Don't run out of your medication. Request a refill today to ensure continuity of your treatment.</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="button">Request Refill Now</a>
      </div>

      <p style="font-size: 14px; color: #666;">
        <strong>Note:</strong> Some refills may require doctor approval. Please allow 24-48 hours for processing.
      </p>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Services</p>
      <p>Keeping you healthy, one prescription at a time</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email Template: Safety Alert
 */
function generateSafetyAlertTemplate(alertDetails) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .alert-box { background: #fee2e2; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ CRITICAL SAFETY ALERT</h1>
      <p>Immediate Action Required</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">Drug Interaction Detected</h3>
        <p style="color: #7f1d1d;"><strong>Client:</strong> ${alertDetails.clientName}</p>
        <p style="color: #7f1d1d;"><strong>Alert:</strong> ${alertDetails.message}</p>
        <p style="color: #7f1d1d;"><strong>Severity:</strong> ${alertDetails.severity.toUpperCase()}</p>
      </div>

      <h4 style="color: #991b1b;">Recommended Action:</h4>
      <ul>
        <li>DO NOT DISPENSE medication</li>
        <li>Contact prescribing physician immediately</li>
        <li>Document all communications</li>
        <li>Update Client medication record</li>
      </ul>

      <p style="background: #fecaca; padding: 15px; border-radius: 8px; color: #7f1d1d; font-weight: bold;">
        This is an automated alert. Please verify all information and take appropriate action.
      </p>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Safety System</p>
      <p>Client Safety First</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email Template: Payment Confirmation
 */
function generatePaymentConfirmationTemplate(invoice, payment) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Confirmed</h1>
    </div>
    
    <div class="content">
      <div class="success-box">
        <h2 style="color: #065f46; margin: 0;">₦${invoice.total.toLocaleString()}</h2>
        <p style="color: #065f46; margin: 10px 0 0 0;">Payment Successfully Processed</p>
      </div>

      <h3>Payment Details:</h3>
      <div style="background: white; padding: 20px; border-radius: 8px;">
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Amount:</strong> ₦${invoice.total.toLocaleString()}</p>
        <p><strong>Method:</strong> ${payment.method}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        ${payment.transactionId ? `<p><strong>Transaction ID:</strong> ${payment.transactionId}</p>` : ''}
      </div>

      <p style="margin: 20px 0;">Thank you for your payment. A copy of your invoice has been attached for your records.</p>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Services</p>
      <p>Receipt will be sent separately</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email Template: Counseling Reminder
 */
function generateCounselingReminderTemplate(appointmentTime, pharmacistName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .appointment-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #3b82f6; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Medication Counseling Appointment</h1>
    </div>
    
    <div class="content">
      <p>You have an upcoming medication counseling appointment.</p>

      <div class="appointment-box">
        <h3 style="color: #2563eb; margin: 0 0 15px 0;">Appointment Details</h3>
        <p><strong>Date & Time:</strong> ${appointmentTime}</p>
        <p><strong>Pharmacist:</strong> ${pharmacistName}</p>
        <p><strong>Duration:</strong> Approximately 15-30 minutes</p>
      </div>

      <h4>What to Expect:</h4>
      <ul>
        <li>Medication usage instructions</li>
        <li>Potential side effects discussion</li>
        <li>Drug interaction information</li>
        <li>Storage and handling guidelines</li>
        <li>Q&A session</li>
      </ul>

      <p style="background: #dbeafe; padding: 15px; border-radius: 8px; color: #1e40af;">
        <strong>Tip:</strong> Prepare any questions you have about your medications in advance.
      </p>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Services</p>
      <p>Your health is our priority</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email Template: Low Stock Alert
 */
function generateLowStockAlertTemplate(lowStockItems) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .item-row { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #f59e0b; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Low Stock Alert</h1>
      <p>Immediate Reorder Required</p>
    </div>
    
    <div class="content">
      <p><strong>${lowStockItems.length} item(s)</strong> are running low in stock:</p>

      ${lowStockItems.map(item => `
        <div class="item-row">
          <h4 style="margin: 0 0 10px 0;">${item.name}</h4>
          <p style="margin: 5px 0;"><strong>Current Stock:</strong> ${item.quantity} ${item.unit}</p>
          <p style="margin: 5px 0;"><strong>Reorder Level:</strong> ${item.reorderLevel} ${item.unit}</p>
          <p style="margin: 5px 0; color: #d97706;"><strong>Status:</strong> BELOW REORDER LEVEL</p>
        </div>
      `).join('')}

      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #92400e; margin: 0 0 10px 0;">Action Required:</h4>
        <ol style="color: #92400e; margin: 0; padding-left: 20px;">
          <li>Review stock levels immediately</li>
          <li>Place reorder with suppliers</li>
          <li>Update inventory system</li>
          <li>Notify relevant staff</li>
        </ol>
      </div>
    </div>

    <div class="footer">
      <p>Care Master Pharmacy Inventory System</p>
      <p>Automated Daily Alert</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default pharmacyNotificationService;


import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

const getDb = () => admin.firestore();

// Initialize SendGrid
// API key should be set via Firebase Functions config or environment variable
const sendGridApiKey = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
const fromEmail = functions.config().sendgrid?.from_email || process.env.FROM_EMAIL || 'noreply@caremaster.com';

if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey);
  console.log('SendGrid initialized');
} else {
  console.warn('SendGrid API key not configured. Email sending will be disabled.');
}

// Send payment link email notification
export const sendPaymentLinkEmail = async (data: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentLink: string;
  dueDate?: Date | string;
  institutionName?: string;
}, context: functions.https.CallableContext) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { to, clientName, invoiceNumber, amount, currency, paymentLink, dueDate, institutionName } = data;

    // Validate required fields
    if (!to || !clientName || !invoiceNumber || !paymentLink) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Format due date
    const formattedDueDate = dueDate 
      ? new Date(dueDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'N/A';

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Invoice</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Invoice</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${clientName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${institutionName ? `We hope this message finds you well. ${institutionName} has generated an invoice for your subscription.` : 'We hope this message finds you well. An invoice has been generated for your subscription.'}
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">Invoice Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Invoice Number:</td>
                <td style="padding: 8px 0; text-align: right;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Amount:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #333;">
                  ${currency} ${amount.toFixed(2)}
                </td>
              </tr>
              ${dueDate ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Due Date:</td>
                <td style="padding: 8px 0; text-align: right;">${formattedDueDate}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              Pay Now
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            You can also copy and paste this link into your browser:<br>
            <a href="${paymentLink}" style="color: #667eea; word-break: break-all;">${paymentLink}</a>
          </p>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Important:</strong> Please complete your payment by the due date to avoid any service interruptions.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or concerns, please don't hesitate to contact us.
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Best regards,<br>
            ${institutionName || 'Care Master Team'}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    // Create email plain text version
    const emailText = `
Payment Invoice

Dear ${clientName},

${institutionName ? `${institutionName} has generated an invoice for your subscription.` : 'An invoice has been generated for your subscription.'}

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount: ${currency} ${amount.toFixed(2)}
${dueDate ? `- Due Date: ${formattedDueDate}` : ''}

Payment Link: ${paymentLink}

Please complete your payment by the due date to avoid any service interruptions.

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
${institutionName || 'Care Master Team'}
    `;

    // Store email in Firestore for tracking
    const emailRecord = {
      to,
      subject: `Payment Invoice - ${invoiceNumber}`,
      html: emailHtml,
      text: emailText,
      invoiceNumber,
      clientName,
      amount,
      currency,
      paymentLink,
      status: 'pending',
      sentBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const emailRef = await getDb().collection('emailQueue').add(emailRecord);

    // For now, we'll use a simple approach with Firebase Extensions or a third-party service
    // In production, you would integrate with:
    // 1. SendGrid (recommended)
    // 2. Mailgun
    // 3. AWS SES
    // 4. Nodemailer with SMTP
    
    // For demonstration, we'll log the email and mark it as queued
    // In production, you would actually send the email here
    console.log('Email queued for sending:', {
      to,
      invoiceNumber,
      paymentLink
    });

    // Update email record with queued status
    await emailRef.update({
      status: 'queued',
      queuedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the event
    await getDb().collection('auditLogs').add({
      userId: context.auth.uid,
      action: 'PAYMENT_LINK_EMAIL_SENT',
      details: {
        to,
        invoiceNumber,
        clientName,
        amount,
        currency
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest?.ip || 'unknown'
    });

    return {
      success: true,
      emailId: emailRef.id,
      message: 'Payment link email queued successfully'
    };
  } catch (error) {
    console.error('Error sending payment link email:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to send payment link email');
  }
};

// Scheduled function to process email queue
// This would integrate with an actual email service
export const processEmailQueue = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    try {
      const emailQueueSnapshot = await getDb().collection('emailQueue')
        .where('status', '==', 'queued')
        .limit(10)
        .get();

      for (const doc of emailQueueSnapshot.docs) {
        const emailData = doc.data();
        
        try {
          // Check if SendGrid is configured
          if (!sendGridApiKey) {
            console.warn('SendGrid API key not configured. Skipping email send.');
            await doc.ref.update({
              status: 'failed',
              error: 'SendGrid API key not configured',
              failedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            continue;
          }

          // Send email via SendGrid
          const msg = {
            to: emailData.to,
            from: fromEmail,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
            // Add tracking and categories for analytics
            categories: ['payment-invoice', 'subscription'],
            // Custom args for tracking
            customArgs: {
              invoiceNumber: emailData.invoiceNumber,
              clientName: emailData.clientName,
              emailId: doc.id
            }
          };

          console.log(`Sending email to ${emailData.to} for invoice ${emailData.invoiceNumber}`);
          
          // Send the email
          const result = await sgMail.send(msg);
          
          console.log(`Email sent successfully to ${emailData.to}`, result);
          
          // Mark as sent after successful delivery
          await doc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sendGridMessageId: result[0]?.headers?.['x-message-id'] || null
          });

          console.log(`Email processed successfully for ${emailData.to}`);
        } catch (error: any) {
          console.error(`Error processing email ${doc.id}:`, error);
          
          const attempts = (emailData.attempts || 0) + 1;
          const errorMessage = error?.response?.body?.errors?.[0]?.message || error?.message || String(error);
          
          // Log SendGrid specific errors
          if (error?.response) {
            console.error('SendGrid API Error:', {
              statusCode: error.response.code,
              body: error.response.body,
              headers: error.response.headers
            });
          }
          
          // Mark as failed after 3 attempts
          if (attempts >= 3) {
            await doc.ref.update({
              status: 'failed',
              attempts,
              error: errorMessage,
              failedAt: admin.firestore.FieldValue.serverTimestamp(),
              sendGridError: error?.response?.body || null
            });
            console.error(`Email ${doc.id} failed after ${attempts} attempts: ${errorMessage}`);
          } else {
            // Retry - update attempts but keep status as queued
            await doc.ref.update({
              attempts,
              lastError: errorMessage,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Email ${doc.id} will be retried (attempt ${attempts}/3)`);
          }
        }
      }

      console.log(`Processed ${emailQueueSnapshot.size} emails from queue`);
    } catch (error) {
      console.error('Error in email queue processor:', error);
    }
  });


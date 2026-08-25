import * as billingPlansAPI from './billingPlansAPI';
import * as paymentGatewayAPI from './paymentGatewayAPI';
import { collection, doc, setDoc, getDocs, query, where, orderBy, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';

const SUBSCRIPTION_INVOICES_COLLECTION = 'subscriptionInvoices';
const PAYMENT_LINKS_COLLECTION = 'paymentLinks';

// Generate invoice from subscription
export const generateSubscriptionInvoice = async (subscriptionId, subscriptionData) => {
  try {
    const invoiceNumber = await generateInvoiceNumber(subscriptionData.institutionId);
    
    const invoice = {
      subscriptionId,
      clientId: subscriptionData.clientId,
      clientName: subscriptionData.clientName || 'Unknown Client',
      clientEmail: subscriptionData.clientEmail,
      planId: subscriptionData.planId,
      planName: subscriptionData.planName,
      planTier: subscriptionData.planTier,
      billingCycle: subscriptionData.billingCycle,
      amount: subscriptionData.price,
      currency: subscriptionData.currency || 'USD',
      status: 'pending',
      dueDate: subscriptionData.nextBillingDate,
      institutionId: subscriptionData.institutionId,
      invoiceNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const invoiceRef = doc(db, SUBSCRIPTION_INVOICES_COLLECTION, `${subscriptionId}_${Date.now()}`);
    await setDoc(invoiceRef, invoice);
    
    return {
      id: invoiceRef.id,
      ...invoice
    };
  } catch (error) {
    console.error('Error generating subscription invoice:', error);
    throw error;
  }
};

// Generate invoice and payment link
export const generateInvoiceWithPaymentLink = async (subscriptionId, subscriptionData) => {
  try {
    // Generate invoice
    const invoice = await generateSubscriptionInvoice(subscriptionId, subscriptionData);
    
    // Generate payment link if gateway is configured
    let paymentLinkData = null;
    try {
      paymentLinkData = await paymentGatewayAPI.generatePaymentLink(
        subscriptionData.institutionId,
        invoice.id,
        {
          amount: invoice.amount,
          currency: invoice.currency,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail
        }
      );
      
      // Update invoice with payment link
      await setDoc(
        doc(db, SUBSCRIPTION_INVOICES_COLLECTION, invoice.id),
        {
          paymentLinkId: paymentLinkData.paymentLinkId,
          paymentLink: paymentLinkData.paymentLink,
          gateway: paymentLinkData.gateway,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // Send email notification with payment link
      if (invoice.clientEmail) {
        try {
          await sendPaymentLinkNotification(invoice.id, invoice, paymentLinkData);
        } catch (emailError) {
          console.warn('Failed to send payment link email:', emailError);
          // Don't fail the whole process if email fails
        }
      }
    } catch (gatewayError) {
      console.warn('Payment gateway not configured or error generating link:', gatewayError);
      // Invoice is still created, just without payment link
    }
    
    return {
      invoice,
      paymentLink: paymentLinkData
    };
  } catch (error) {
    console.error('Error generating invoice with payment link:', error);
    throw error;
  }
};

// Get invoices for a client
export const getSubscriptionInvoicesByClient = async (clientId) => {
  try {
    const q = query(
      collection(db, SUBSCRIPTION_INVOICES_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const invoices = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        dueDate: data.dueDate?.toDate?.() || data.dueDate
      });
    });
    
    return invoices;
  } catch (error) {
    console.error('Error fetching subscription invoices:', error);
    throw error;
  }
};

// Get all subscription invoices for an institution
export const getSubscriptionInvoicesByInstitution = async (institutionId) => {
  try {
    const q = query(
      collection(db, SUBSCRIPTION_INVOICES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const invoices = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        dueDate: data.dueDate?.toDate?.() || data.dueDate
      });
    });
    
    return invoices;
  } catch (error) {
    console.error('Error fetching subscription invoices:', error);
    throw error;
  }
};

// Generate invoice number
async function generateInvoiceNumber(institutionId) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const q = query(
    collection(db, SUBSCRIPTION_INVOICES_COLLECTION),
    where('institutionId', '==', institutionId)
  );
  
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1;
  
  return `SUB-INV-${year}${month}-${String(count).padStart(4, '0')}`;
}

// Send payment link notification (email/SMS)
export const sendPaymentLinkNotification = async (invoiceId, invoiceData, paymentLink) => {
  try {
    if (!invoiceData.clientEmail) {
      console.warn('No client email provided, skipping email notification');
      return { success: false, message: 'No client email provided' };
    }

    // Call Firebase Cloud Function to send email
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const sendPaymentLinkEmail = httpsCallable(functions, 'sendPaymentLinkEmailFunction');

    const result = await sendPaymentLinkEmail({
      to: invoiceData.clientEmail,
      clientName: invoiceData.clientName || 'Valued Client',
      invoiceNumber: invoiceData.invoiceNumber,
      amount: invoiceData.amount,
      currency: invoiceData.currency || 'USD',
      paymentLink: paymentLink.paymentLink,
      dueDate: invoiceData.dueDate,
      institutionName: invoiceData.institutionName
    });

    console.log('Payment link email sent:', result.data);
    return { success: true, emailId: result.data?.emailId };
  } catch (error) {
    console.error('Error sending payment link notification:', error);
    // Don't throw error - email failure shouldn't break invoice generation
    return { success: false, error: error.message };
  }
};


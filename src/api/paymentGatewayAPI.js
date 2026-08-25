import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

const PAYMENT_GATEWAY_CONFIG_COLLECTION = 'paymentGatewayConfigs';
const SUBSCRIPTION_INVOICES_COLLECTION = 'subscriptionInvoices';
const PAYMENT_LINKS_COLLECTION = 'paymentLinks';

// Supported payment gateways
export const SUPPORTED_GATEWAYS = {
  stripe: {
    name: 'Stripe',
    icon: '💳',
    fields: {
      publishableKey: { label: 'Publishable Key', type: 'text', required: true },
      secretKey: { label: 'Secret Key', type: 'password', required: true },
      webhookSecret: { label: 'Webhook Secret', type: 'password', required: false }
    }
  },
  paystack: {
    name: 'Paystack',
    icon: '💰',
    fields: {
      publicKey: { label: 'Public Key', type: 'text', required: true },
      secretKey: { label: 'Secret Key', type: 'password', required: true }
    }
  },
  paypal: {
    name: 'PayPal',
    icon: '🌐',
    fields: {
      clientId: { label: 'Client ID', type: 'text', required: true },
      clientSecret: { label: 'Client Secret', type: 'password', required: true },
      mode: { label: 'Mode', type: 'select', options: ['sandbox', 'live'], required: true }
    }
  },
  flutterwave: {
    name: 'Flutterwave',
    icon: '🌍',
    fields: {
      publicKey: { label: 'Public Key', type: 'text', required: true },
      secretKey: { label: 'Secret Key', type: 'password', required: true }
    }
  }
};

// Get payment gateway configuration for an institution
export const getPaymentGatewayConfig = async (institutionId) => {
  try {
    const configRef = doc(db, PAYMENT_GATEWAY_CONFIG_COLLECTION, institutionId);
    const configDoc = await getDoc(configRef);
    
    if (!configDoc.exists()) {
      return null;
    }
    
    const data = configDoc.data();
    // Don't return sensitive keys in full - just indicate if they're set
    return {
      id: configDoc.id,
      institutionId: data.institutionId,
      gateway: data.gateway,
      isConfigured: !!data.secretKey || !!data.clientSecret, // Check if credentials are set
      mode: data.mode || 'live',
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
    };
  } catch (error) {
    console.error('Error fetching payment gateway config:', error);
    throw error;
  }
};

// Save payment gateway configuration
export const savePaymentGatewayConfig = async (institutionId, configData) => {
  try {
    const configRef = doc(db, PAYMENT_GATEWAY_CONFIG_COLLECTION, institutionId);
    
    // Encrypt sensitive data (in production, use proper encryption)
    const configPayload = {
      institutionId,
      gateway: configData.gateway,
      ...configData.credentials, // Store credentials (should be encrypted in production)
      mode: configData.mode || 'live',
      isActive: configData.isActive !== false,
      updatedAt: serverTimestamp()
    };
    
    // If updating, preserve createdAt
    const existingDoc = await getDoc(configRef);
    if (!existingDoc.exists()) {
      configPayload.createdAt = serverTimestamp();
    }
    
    await setDoc(configRef, configPayload, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving payment gateway config:', error);
    throw error;
  }
};

// Delete payment gateway configuration
export const deletePaymentGatewayConfig = async (institutionId) => {
  try {
    const configRef = doc(db, PAYMENT_GATEWAY_CONFIG_COLLECTION, institutionId);
    await deleteDoc(configRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment gateway config:', error);
    throw error;
  }
};

// Generate invoice from subscription
export const generateSubscriptionInvoice = async (subscriptionId, subscriptionData) => {
  try {
    const invoice = {
      subscriptionId,
      clientId: subscriptionData.clientId,
      clientName: subscriptionData.clientName || 'Unknown Client',
      planId: subscriptionData.planId,
      planName: subscriptionData.planName,
      planTier: subscriptionData.planTier,
      billingCycle: subscriptionData.billingCycle,
      amount: subscriptionData.price,
      currency: subscriptionData.currency || 'USD',
      status: 'pending',
      dueDate: subscriptionData.nextBillingDate,
      institutionId: subscriptionData.institutionId,
      invoiceNumber: await generateInvoiceNumber(subscriptionData.institutionId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const invoiceRef = await setDoc(
      doc(db, SUBSCRIPTION_INVOICES_COLLECTION, `${subscriptionId}_${Date.now()}`),
      invoice
    );
    
    return {
      id: invoiceRef.id || `${subscriptionId}_${Date.now()}`,
      ...invoice
    };
  } catch (error) {
    console.error('Error generating subscription invoice:', error);
    throw error;
  }
};

// Generate payment link using configured gateway
export const generatePaymentLink = async (institutionId, invoiceId, invoiceData) => {
  try {
    // Get payment gateway configuration
    const config = await getPaymentGatewayConfig(institutionId);
    
    if (!config || !config.isConfigured) {
      throw new Error('Payment gateway not configured for this institution');
    }
    
    // Get full config with credentials
    const configRef = doc(db, PAYMENT_GATEWAY_CONFIG_COLLECTION, institutionId);
    const configDoc = await getDoc(configRef);
    const fullConfig = configDoc.data();
    
    let paymentLink = null;
    let paymentLinkId = null;
    
    // Generate payment link based on gateway
    switch (config.gateway) {
      case 'stripe':
        paymentLink = await generateStripePaymentLink(fullConfig, invoiceData);
        break;
      case 'paystack':
        paymentLink = await generatePaystackPaymentLink(fullConfig, invoiceData);
        break;
      case 'paypal':
        paymentLink = await generatePayPalPaymentLink(fullConfig, invoiceData);
        break;
      case 'flutterwave':
        paymentLink = await generateFlutterwavePaymentLink(fullConfig, invoiceData);
        break;
      default:
        throw new Error(`Unsupported payment gateway: ${config.gateway}`);
    }
    
    // Store payment link
    const linkRef = doc(db, PAYMENT_LINKS_COLLECTION);
    const linkData = {
      institutionId,
      invoiceId,
      gateway: config.gateway,
      paymentLink,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
    
    await setDoc(linkRef, linkData);
    paymentLinkId = linkRef.id;
    
    return {
      paymentLinkId,
      paymentLink,
      gateway: config.gateway
    };
  } catch (error) {
    console.error('Error generating payment link:', error);
    throw error;
  }
};

// Stripe payment link generation (client-side simulation)
async function generateStripePaymentLink(config, invoiceData) {
  // In production, this would call Stripe API
  // For now, return a simulated link structure
  // The actual implementation would use Stripe SDK:
  // const stripe = require('stripe')(config.secretKey);
  // const session = await stripe.checkout.sessions.create({...});
  
  return `https://checkout.stripe.com/pay/${generateRandomId()}`;
}

// Paystack payment link generation
async function generatePaystackPaymentLink(config, invoiceData) {
  // In production, this would call Paystack API
  // For now, return a simulated link
  return `https://paystack.com/pay/${generateRandomId()}`;
}

// PayPal payment link generation
async function generatePayPalPaymentLink(config, invoiceData) {
  // In production, this would call PayPal API
  return `https://www.paypal.com/checkoutnow?token=${generateRandomId()}`;
}

// Flutterwave payment link generation
async function generateFlutterwavePaymentLink(config, invoiceData) {
  // In production, this would call Flutterwave API
  return `https://flutterwave.com/pay/${generateRandomId()}`;
}

// Helper function to generate invoice number
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

// Helper function to generate random ID
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

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


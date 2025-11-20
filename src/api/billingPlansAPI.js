import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const BILLING_PLANS_COLLECTION = 'billingPlans';
const CLIENT_SUBSCRIPTIONS_COLLECTION = 'clientSubscriptions';

// Get all billing plans for an institution
export const getBillingPlans = async (institutionId) => {
  try {
    const plansRef = collection(db, BILLING_PLANS_COLLECTION);
    const q = query(
      plansRef,
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const plans = [];
    
    querySnapshot.forEach((doc) => {
      plans.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      });
    });
    
    // If no plans exist, create default plans
    if (plans.length === 0) {
      const defaultPlans = await createDefaultPlans(institutionId);
      return defaultPlans;
    }
    
    return plans;
  } catch (error) {
    console.error('Error fetching billing plans:', error);
    throw error;
  }
};

// Get a single billing plan
export const getBillingPlan = async (planId) => {
  try {
    const planRef = doc(db, BILLING_PLANS_COLLECTION, planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      throw new Error('Billing plan not found');
    }
    
    return {
      id: planDoc.id,
      ...planDoc.data(),
      createdAt: planDoc.data().createdAt?.toDate?.() || planDoc.data().createdAt,
      updatedAt: planDoc.data().updatedAt?.toDate?.() || planDoc.data().updatedAt,
    };
  } catch (error) {
    console.error('Error fetching billing plan:', error);
    throw error;
  }
};

// Create default billing plans (Basic, Standard, Premium)
const createDefaultPlans = async (institutionId) => {
  const defaultPlans = [
    {
      name: 'Basic',
      tier: 'basic',
      description: 'Essential care services',
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      currency: 'USD',
      features: [
        '2 home visits per month',
        'Basic health monitoring',
        'Email support',
        'Medication reminders',
        'Emergency contact'
      ],
      institutionId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      name: 'Standard',
      tier: 'standard',
      description: 'Comprehensive care package',
      monthlyPrice: 39.99,
      yearlyPrice: 399.99,
      currency: 'USD',
      features: [
        '5 home visits per month',
        'Advanced health monitoring',
        '24/7 phone support',
        'Medication management',
        'Caregiver coordination',
        'Health reports',
        'Family notifications'
      ],
      institutionId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      name: 'Premium',
      tier: 'premium',
      description: 'Premium concierge service',
      monthlyPrice: 79.99,
      yearlyPrice: 799.99,
      currency: 'USD',
      features: [
        'Unlimited home visits',
        '24/7 emergency support',
        'Telemedicine consultations',
        'Medication management',
        'Caregiver coordination',
        'Health monitoring',
        'Family notifications',
        'Priority support',
        'Dedicated care manager'
      ],
      institutionId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ];
  
  const plansRef = collection(db, BILLING_PLANS_COLLECTION);
  const createdPlans = [];
  
  for (const planData of defaultPlans) {
    const docRef = await addDoc(plansRef, planData);
    createdPlans.push({
      id: docRef.id,
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return createdPlans;
};

// Create or update a billing plan
export const saveBillingPlan = async (planData) => {
  try {
    const planRef = planData.id 
      ? doc(db, BILLING_PLANS_COLLECTION, planData.id)
      : collection(db, BILLING_PLANS_COLLECTION);
    
    const planPayload = {
      ...planData,
      updatedAt: serverTimestamp(),
    };
    
    // Remove id from payload if updating
    if (planData.id) {
      delete planPayload.id;
      await updateDoc(planRef, planPayload);
      return planData.id;
    } else {
      planPayload.createdAt = serverTimestamp();
      const docRef = await addDoc(planRef, planPayload);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving billing plan:', error);
    throw error;
  }
};

// Delete a billing plan
export const deleteBillingPlan = async (planId) => {
  try {
    const planRef = doc(db, BILLING_PLANS_COLLECTION, planId);
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Error deleting billing plan:', error);
    throw error;
  }
};

// Get client subscription
export const getClientSubscription = async (clientId) => {
  try {
    const subscriptionsRef = collection(db, CLIENT_SUBSCRIPTIONS_COLLECTION);
    const q = query(
      subscriptionsRef,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const subscriptionDoc = querySnapshot.docs[0];
    const subscriptionData = subscriptionDoc.data();
    
    // Get plan details
    let plan = null;
    if (subscriptionData.planId) {
      plan = await getBillingPlan(subscriptionData.planId);
    }
    
    return {
      id: subscriptionDoc.id,
      ...subscriptionData,
      plan,
      createdAt: subscriptionData.createdAt?.toDate?.() || subscriptionData.createdAt,
      updatedAt: subscriptionData.updatedAt?.toDate?.() || subscriptionData.updatedAt,
      startDate: subscriptionData.startDate?.toDate?.() || subscriptionData.startDate,
      endDate: subscriptionData.endDate?.toDate?.() || subscriptionData.endDate,
      nextBillingDate: subscriptionData.nextBillingDate?.toDate?.() || subscriptionData.nextBillingDate,
    };
  } catch (error) {
    console.error('Error fetching client subscription:', error);
    throw error;
  }
};

// Assign subscription to client
export const assignSubscriptionToClient = async (clientId, planId, billingCycle = 'monthly') => {
  try {
    // Get the plan
    const plan = await getBillingPlan(planId);
    
    if (!plan) {
      throw new Error('Billing plan not found');
    }
    
    // Calculate pricing
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const startDate = new Date();
    const endDate = new Date();
    
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    // Check if client already has a subscription
    const existingSubscription = await getClientSubscription(clientId);
    
    const subscriptionData = {
      clientId,
      planId,
      planName: plan.name,
      planTier: plan.tier,
      billingCycle,
      price,
      currency: plan.currency || 'USD',
      status: 'active',
      startDate: serverTimestamp(),
      endDate: endDate,
      nextBillingDate: endDate,
      institutionId: plan.institutionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (existingSubscription) {
      // Update existing subscription
      const subscriptionRef = doc(db, CLIENT_SUBSCRIPTIONS_COLLECTION, existingSubscription.id);
      await updateDoc(subscriptionRef, {
        ...subscriptionData,
        createdAt: existingSubscription.createdAt, // Preserve original creation date
      });
      return existingSubscription.id;
    } else {
      // Create new subscription
      const subscriptionsRef = collection(db, CLIENT_SUBSCRIPTIONS_COLLECTION);
      const docRef = await addDoc(subscriptionsRef, subscriptionData);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error assigning subscription to client:', error);
    throw error;
  }
};

// Update client subscription
export const updateClientSubscription = async (subscriptionId, updateData) => {
  try {
    const subscriptionRef = doc(db, CLIENT_SUBSCRIPTIONS_COLLECTION, subscriptionId);
    await updateDoc(subscriptionRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating client subscription:', error);
    throw error;
  }
};

// Cancel client subscription
export const cancelClientSubscription = async (subscriptionId) => {
  try {
    const subscriptionRef = doc(db, CLIENT_SUBSCRIPTIONS_COLLECTION, subscriptionId);
    await updateDoc(subscriptionRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cancelling client subscription:', error);
    throw error;
  }
};

// Get all subscriptions for an institution
export const getInstitutionSubscriptions = async (institutionId) => {
  try {
    const subscriptionsRef = collection(db, CLIENT_SUBSCRIPTIONS_COLLECTION);
    const q = query(
      subscriptionsRef,
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const subscriptions = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const subscriptionData = docSnapshot.data();
      
      // Get plan details
      let plan = null;
      if (subscriptionData.planId) {
        try {
          plan = await getBillingPlan(subscriptionData.planId);
        } catch (error) {
          console.warn('Plan not found for subscription:', subscriptionData.planId);
        }
      }
      
      subscriptions.push({
        id: docSnapshot.id,
        ...subscriptionData,
        plan,
        createdAt: subscriptionData.createdAt?.toDate?.() || subscriptionData.createdAt,
        updatedAt: subscriptionData.updatedAt?.toDate?.() || subscriptionData.updatedAt,
        startDate: subscriptionData.startDate?.toDate?.() || subscriptionData.startDate,
        endDate: subscriptionData.endDate?.toDate?.() || subscriptionData.endDate,
        nextBillingDate: subscriptionData.nextBillingDate?.toDate?.() || subscriptionData.nextBillingDate,
        cancelledAt: subscriptionData.cancelledAt?.toDate?.() || subscriptionData.cancelledAt,
      });
    }
    
    return subscriptions;
  } catch (error) {
    console.error('Error fetching institution subscriptions:', error);
    throw error;
  }
};


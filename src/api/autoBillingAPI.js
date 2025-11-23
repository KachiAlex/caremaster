/**
 * Auto-Billing API
 * 
 * Automatically generates bills based on services rendered:
 * - Consultations
 * - Laboratory tests
 * - Pharmacy prescriptions
 * - Imaging/radiology
 * - Other medical services
 * 
 * Supports:
 * - HMO plan-based pricing
 * - Co-pay handling
 * - Outstanding payments tracking
 * - Credit limits
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { notificationsAPI } from './notificationsAPI';

const BILLS_COLLECTION = 'bills';
const HMO_PLANS_COLLECTION = 'hmoPlans';
const HMO_CLAIMS_COLLECTION = 'hmoClaims';
const SERVICE_PRICING_COLLECTION = 'servicePricing';

// Bill statuses
export const BILL_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// Service types
export const SERVICE_TYPE = {
  CONSULTATION: 'consultation',
  LAB_TEST: 'lab_test',
  PHARMACY: 'pharmacy',
  IMAGING: 'imaging',
  PROCEDURE: 'procedure',
  ADMISSION: 'admission',
  EMERGENCY: 'emergency',
  OTHER: 'other'
};

/**
 * Get service pricing for an institution
 */
const getServicePricing = async (institutionId, serviceType, serviceId = null) => {
  try {
    const pricingRef = collection(db, SERVICE_PRICING_COLLECTION);
    let q = query(
      pricingRef,
      where('institutionId', '==', institutionId),
      where('serviceType', '==', serviceType),
      where('isActive', '==', true)
    );

    if (serviceId) {
      q = query(q, where('serviceId', '==', serviceId));
    }

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const pricing = querySnapshot.docs[0].data();
      return pricing;
    }

    // Return default pricing if not found
    return {
      basePrice: 0,
      currency: 'NGN',
      hmoDiscount: 0,
      coPay: 0
    };
  } catch (error) {
    console.error('Error fetching service pricing:', error);
    return {
      basePrice: 0,
      currency: 'NGN',
      hmoDiscount: 0,
      coPay: 0
    };
  }
};

/**
 * Get HMO plan for a patient
 */
export const getHMOPlan = async (patientId) => {
  try {
    // Check patient's HMO plan
    const patientRef = doc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);
    
    if (patientSnap.exists()) {
      const patientData = patientSnap.data();
      if (patientData.hmoPlanId) {
        const hmoPlanRef = doc(db, HMO_PLANS_COLLECTION, patientData.hmoPlanId);
        const hmoPlanSnap = await getDoc(hmoPlanRef);
        
        if (hmoPlanSnap.exists()) {
          return {
            id: hmoPlanSnap.id,
            ...hmoPlanSnap.data()
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching HMO plan:', error);
    return null;
  }
};

/**
 * Calculate bill amount with HMO discounts and co-pays
 */
const calculateBillAmount = async (institutionId, patientId, serviceItems) => {
  try {
    const hmoPlan = await getHMOPlan(patientId);
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalCoPay = 0;
    const items = [];

    for (const item of serviceItems) {
      const pricing = await getServicePricing(
        institutionId,
        item.serviceType,
        item.serviceId
      );

      const basePrice = item.price || pricing.basePrice || 0;
      let discount = 0;
      let coPay = 0;
      let finalPrice = basePrice;

      // Apply HMO discount if applicable
      if (hmoPlan && hmoPlan.isActive) {
        const hmoDiscountPercent = hmoPlan.discountPercent || 0;
        discount = (basePrice * hmoDiscountPercent) / 100;
        finalPrice = basePrice - discount;

        // Calculate co-pay
        coPay = hmoPlan.coPayAmount || (finalPrice * (hmoPlan.coPayPercent || 0) / 100);
        finalPrice = coPay; // Patient pays co-pay, HMO covers the rest
      }

      items.push({
        ...item,
        basePrice,
        discount,
        coPay,
        finalPrice,
        hmoCovered: hmoPlan ? finalPrice - coPay : 0
      });

      totalAmount += basePrice;
      totalDiscount += discount;
      totalCoPay += coPay;
    }

    const finalAmount = hmoPlan ? totalCoPay : totalAmount;
    const hmoCovered = hmoPlan ? totalAmount - totalDiscount - totalCoPay : 0;

    return {
      items,
      subtotal: totalAmount,
      discount: totalDiscount,
      hmoCovered,
      coPay: totalCoPay,
      total: finalAmount,
      currency: 'NGN',
      hmoPlan: hmoPlan ? {
        id: hmoPlan.id,
        name: hmoPlan.name,
        planNumber: hmoPlan.planNumber
      } : null
    };
  } catch (error) {
    console.error('Error calculating bill amount:', error);
    throw error;
  }
};

/**
 * Generate bill from consultation
 */
export const generateBillFromConsultation = async (consultationId, options = {}) => {
  try {
    const consultationRef = doc(db, 'consultations', consultationId);
    const consultationSnap = await getDoc(consultationRef);

    if (!consultationSnap.exists()) {
      throw new Error('Consultation not found');
    }

    const consultation = consultationSnap.data();
    
    // Check if bill already exists
    const existingBillsQuery = query(
      collection(db, BILLS_COLLECTION),
      where('consultationId', '==', consultationId),
      where('status', '!=', BILL_STATUS.CANCELLED)
    );
    const existingBills = await getDocs(existingBillsQuery);
    if (!existingBills.empty) {
      return {
        id: existingBills.docs[0].id,
        ...existingBills.docs[0].data(),
        alreadyExists: true
      };
    }

    const serviceItems = [{
      serviceType: SERVICE_TYPE.CONSULTATION,
      serviceId: consultationId,
      description: `Consultation - ${consultation.consultationType || 'General'}`,
      quantity: 1,
      date: consultation.consultationDate || new Date().toISOString()
    }];

    const calculation = await calculateBillAmount(
      consultation.institutionId,
      consultation.clientId,
      serviceItems
    );

    const bill = {
      patientId: consultation.clientId,
      patientName: consultation.clientName || 'Unknown',
      institutionId: consultation.institutionId,
      consultationId,
      serviceType: SERVICE_TYPE.CONSULTATION,
      items: calculation.items,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      hmoCovered: calculation.hmoCovered,
      coPay: calculation.coPay,
      total: calculation.total,
      currency: calculation.currency,
      hmoPlan: calculation.hmoPlan,
      status: BILL_STATUS.PENDING,
      dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
      notes: options.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: null,
      paymentMethod: null
    };

    const billRef = await addDoc(collection(db, BILLS_COLLECTION), bill);

    // If HMO plan exists, create claim
    if (calculation.hmoPlan) {
      await createHMOClaim(billRef.id, calculation);
    }

    return {
      id: billRef.id,
      ...bill
    };
  } catch (error) {
    console.error('Error generating bill from consultation:', error);
    throw error;
  }
};

/**
 * Generate bill from lab test
 */
export const generateBillFromLabTest = async (labTestId, options = {}) => {
  try {
    const labTestRef = doc(db, 'diagnostics', labTestId);
    const labTestSnap = await getDoc(labTestRef);

    if (!labTestSnap.exists()) {
      throw new Error('Lab test not found');
    }

    const labTest = labTestSnap.data();
    
    const serviceItems = [{
      serviceType: SERVICE_TYPE.LAB_TEST,
      serviceId: labTestId,
      description: `Lab Test - ${labTest.testName || 'Diagnostic Test'}`,
      quantity: 1,
      date: labTest.testDate || new Date().toISOString()
    }];

    const calculation = await calculateBillAmount(
      labTest.institutionId,
      labTest.patientId,
      serviceItems
    );

    const bill = {
      patientId: labTest.patientId,
      patientName: labTest.patientName || 'Unknown',
      institutionId: labTest.institutionId,
      labTestId,
      serviceType: SERVICE_TYPE.LAB_TEST,
      items: calculation.items,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      hmoCovered: calculation.hmoCovered,
      coPay: calculation.coPay,
      total: calculation.total,
      currency: calculation.currency,
      hmoPlan: calculation.hmoPlan,
      status: BILL_STATUS.PENDING,
      dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: options.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: null,
      paymentMethod: null
    };

    const billRef = await addDoc(collection(db, BILLS_COLLECTION), bill);

    if (calculation.hmoPlan) {
      await createHMOClaim(billRef.id, calculation);
    }

    return {
      id: billRef.id,
      ...bill
    };
  } catch (error) {
    console.error('Error generating bill from lab test:', error);
    throw error;
  }
};

/**
 * Generate bill from pharmacy prescription
 */
export const generateBillFromPrescription = async (prescriptionId, options = {}) => {
  try {
    const prescriptionRef = doc(db, 'prescriptions', prescriptionId);
    const prescriptionSnap = await getDoc(prescriptionRef);

    if (!prescriptionSnap.exists()) {
      throw new Error('Prescription not found');
    }

    const prescription = prescriptionSnap.data();
    
    // Get prescription items/medications
    const medicationsQuery = query(
      collection(db, 'medications'),
      where('prescriptionId', '==', prescriptionId)
    );
    const medicationsSnap = await getDocs(medicationsQuery);
    
    const serviceItems = [];
    medicationsSnap.forEach((medDoc) => {
      const med = medDoc.data();
      serviceItems.push({
        serviceType: SERVICE_TYPE.PHARMACY,
        serviceId: medDoc.id,
        description: `${med.medicationName || med.name} - ${med.dosage || ''}`,
        quantity: med.quantity || 1,
        price: med.price || 0,
        date: prescription.prescriptionDate || new Date().toISOString()
      });
    });

    if (serviceItems.length === 0) {
      throw new Error('No medications found in prescription');
    }

    const calculation = await calculateBillAmount(
      prescription.institutionId,
      prescription.clientId,
      serviceItems
    );

    const bill = {
      patientId: prescription.clientId,
      patientName: prescription.clientName || 'Unknown',
      institutionId: prescription.institutionId,
      prescriptionId,
      serviceType: SERVICE_TYPE.PHARMACY,
      items: calculation.items,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      hmoCovered: calculation.hmoCovered,
      coPay: calculation.coPay,
      total: calculation.total,
      currency: calculation.currency,
      hmoPlan: calculation.hmoPlan,
      status: BILL_STATUS.PENDING,
      dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: options.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: null,
      paymentMethod: null
    };

    const billRef = await addDoc(collection(db, BILLS_COLLECTION), bill);

    if (calculation.hmoPlan) {
      await createHMOClaim(billRef.id, calculation);
    }

    return {
      id: billRef.id,
      ...bill
    };
  } catch (error) {
    console.error('Error generating bill from prescription:', error);
    throw error;
  }
};

/**
 * Generate comprehensive bill from multiple services
 */
export const generateComprehensiveBill = async (patientId, institutionId, serviceItems, options = {}) => {
  try {
    const calculation = await calculateBillAmount(institutionId, patientId, serviceItems);

    const bill = {
      patientId,
      institutionId,
      items: calculation.items,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      hmoCovered: calculation.hmoCovered,
      coPay: calculation.coPay,
      total: calculation.total,
      currency: calculation.currency,
      hmoPlan: calculation.hmoPlan,
      status: BILL_STATUS.PENDING,
      dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: options.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: null,
      paymentMethod: null
    };

    const billRef = await addDoc(collection(db, BILLS_COLLECTION), bill);

    if (calculation.hmoPlan) {
      await createHMOClaim(billRef.id, calculation);
    }

    return {
      id: billRef.id,
      ...bill
    };
  } catch (error) {
    console.error('Error generating comprehensive bill:', error);
    throw error;
  }
};

/**
 * Create HMO claim
 */
const createHMOClaim = async (billId, calculation) => {
  try {
    if (!calculation.hmoPlan) {
      return null;
    }

    // Get bill to get patientId and institutionId
    const billRef = doc(db, BILLS_COLLECTION, billId);
    const billSnap = await getDoc(billRef);
    if (!billSnap.exists()) {
      throw new Error('Bill not found');
    }
    const bill = billSnap.data();

    const claim = {
      billId,
      hmoPlanId: calculation.hmoPlan.id,
      hmoPlanName: calculation.hmoPlan.name,
      patientId: bill.patientId,
      institutionId: bill.institutionId,
      claimAmount: calculation.hmoCovered,
      status: 'pending', // pending, submitted, approved, rejected, paid
      submittedAt: null,
      approvedAt: null,
      paidAt: null,
      rejectionReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const claimRef = await addDoc(collection(db, HMO_CLAIMS_COLLECTION), claim);
    return {
      id: claimRef.id,
      ...claim
    };
  } catch (error) {
    console.error('Error creating HMO claim:', error);
    throw error;
  }
};

/**
 * Get bills for a patient
 */
export const getBillsByPatient = async (patientId, options = {}) => {
  try {
    const billsRef = collection(db, BILLS_COLLECTION);
    let q = query(
      billsRef,
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );

    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }

    const querySnapshot = await getDocs(q);
    const bills = [];

    querySnapshot.forEach((doc) => {
      const billData = doc.data();
      bills.push({
        id: doc.id,
        ...billData,
        createdAt: billData.createdAt?.toDate?.() || billData.createdAt,
        updatedAt: billData.updatedAt?.toDate?.() || billData.updatedAt,
        dueDate: billData.dueDate ? new Date(billData.dueDate) : null,
        paidAt: billData.paidAt?.toDate?.() || billData.paidAt
      });
    });

    return bills;
  } catch (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
};

/**
 * Get outstanding payments for a patient
 */
export const getOutstandingPayments = async (patientId) => {
  try {
    const allBills = await getBillsByPatient(patientId);
    const bills = allBills.filter(bill => 
      [BILL_STATUS.PENDING, BILL_STATUS.PARTIALLY_PAID, BILL_STATUS.OVERDUE].includes(bill.status)
    );

    const outstanding = bills.reduce((total, bill) => {
      const paid = bill.paidAmount || 0;
      return total + (bill.total - paid);
    }, 0);

    return {
      totalOutstanding: outstanding,
      bills: bills,
      count: bills.length
    };
  } catch (error) {
    console.error('Error calculating outstanding payments:', error);
    throw error;
  }
};

/**
 * Record payment
 */
export const recordPayment = async (billId, paymentData) => {
  try {
    const { amount, paymentMethod, transactionId, notes } = paymentData;
    const billRef = doc(db, BILLS_COLLECTION, billId);
    const billSnap = await getDoc(billRef);

    if (!billSnap.exists()) {
      throw new Error('Bill not found');
    }

    const bill = billSnap.data();
    const currentPaid = bill.paidAmount || 0;
    const newPaid = currentPaid + amount;
    const total = bill.total;

    let newStatus = bill.status;
    if (newPaid >= total) {
      newStatus = BILL_STATUS.PAID;
    } else if (newPaid > 0) {
      newStatus = BILL_STATUS.PARTIALLY_PAID;
    }

    await updateDoc(billRef, {
      paidAmount: newPaid,
      status: newStatus,
      paymentMethod: paymentMethod || bill.paymentMethod,
      paidAt: newPaid >= total ? serverTimestamp() : bill.paidAt,
      lastPaymentDate: serverTimestamp(),
      lastPaymentAmount: amount,
      lastTransactionId: transactionId,
      paymentNotes: notes,
      updatedAt: serverTimestamp()
    });

    // Send notification
    try {
      await notificationsAPI.createNotification({
        userId: bill.patientId,
        type: 'payment',
        title: 'Payment Recorded',
        message: `Payment of ${amount} ${bill.currency} recorded for bill ${billId}`,
        priority: 'medium'
      });
    } catch (notifError) {
      console.warn('Failed to send payment notification:', notifError);
    }

    return {
      success: true,
      billId,
      paidAmount: newPaid,
      remaining: total - newPaid,
      status: newStatus
    };
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
};

/**
 * Get HMO claims
 */
export const getHMOClaims = async (institutionId, options = {}) => {
  try {
    const claimsRef = collection(db, HMO_CLAIMS_COLLECTION);
    let q = query(
      claimsRef,
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }

    const querySnapshot = await getDocs(q);
    const claims = [];

    querySnapshot.forEach((doc) => {
      const claimData = doc.data();
      claims.push({
        id: doc.id,
        ...claimData,
        createdAt: claimData.createdAt?.toDate?.() || claimData.createdAt,
        updatedAt: claimData.updatedAt?.toDate?.() || claimData.updatedAt,
        submittedAt: claimData.submittedAt?.toDate?.() || claimData.submittedAt,
        approvedAt: claimData.approvedAt?.toDate?.() || claimData.approvedAt,
        paidAt: claimData.paidAt?.toDate?.() || claimData.paidAt
      });
    });

    return claims;
  } catch (error) {
    console.error('Error fetching HMO claims:', error);
    throw error;
  }
};

/**
 * Submit HMO claim
 */
export const submitHMOClaim = async (claimId) => {
  try {
    const claimRef = doc(db, HMO_CLAIMS_COLLECTION, claimId);
    await updateDoc(claimRef, {
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, claimId };
  } catch (error) {
    console.error('Error submitting HMO claim:', error);
    throw error;
  }
};


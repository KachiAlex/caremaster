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
} from 'backend/database';
import { db } from '../backend/config';
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
 * Get HMO plan for a Client
 */
export const getHMOPlan = async (clientId) => {
  try {
    // Check Client's HMO plan
    const patientRef = doc(db, 'clients', clientId);
    const patientSnap = await getDoc(patientRef);
    
    if (patientSnap.exists()) {
      const clientData = patientSnap.data();
      if (clientData.hmoPlanId) {
        const hmoPlanRef = doc(db, HMO_PLANS_COLLECTION, clientData.hmoPlanId);
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
const calculateBillAmount = async (institutionId, clientId, serviceItems) => {
  try {
    const hmoPlan = await getHMOPlan(clientId);
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
        finalPrice = coPay; // Client pays co-pay, HMO covers the rest
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
      clientId: consultation.clientId,
      clientName: consultation.clientName || 'Unknown',
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
      labTest.clientId,
      serviceItems
    );

    const bill = {
      clientId: labTest.clientId,
      clientName: labTest.clientName || 'Unknown',
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
 * Generate bill from imaging request
 */
export const generateBillFromImaging = async (imagingRequestId, options = {}) => {
  try {
    const imagingRef = doc(db, 'imagingRequests', imagingRequestId);
    const imagingSnap = await getDoc(imagingRef);

    if (!imagingSnap.exists()) {
      throw new Error('Imaging request not found');
    }

    const imaging = imagingSnap.data();
    
    // Check if bill already exists
    const existingBillsQuery = query(
      collection(db, BILLS_COLLECTION),
      where('imagingRequestId', '==', imagingRequestId),
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
      serviceType: SERVICE_TYPE.IMAGING,
      serviceId: imagingRequestId,
      description: `Imaging - ${imaging.imagingType || 'Diagnostic Imaging'} (${imaging.bodyPart || ''})`,
      quantity: 1,
      date: imaging.scheduledDate || imaging.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    }];

    const calculation = await calculateBillAmount(
      imaging.institutionId,
      imaging.clientId,
      serviceItems
    );

    const bill = {
      clientId: imaging.clientId,
      clientName: imaging.clientName || 'Unknown',
      institutionId: imaging.institutionId,
      imagingRequestId,
      serviceType: SERVICE_TYPE.IMAGING,
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
    console.error('Error generating bill from imaging:', error);
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
      clientId: prescription.clientId,
      clientName: prescription.clientName || 'Unknown',
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
export const generateComprehensiveBill = async (clientId, institutionId, serviceItems, options = {}) => {
  try {
    const calculation = await calculateBillAmount(institutionId, clientId, serviceItems);

    const bill = {
      clientId,
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

    // Get bill to get clientId and institutionId
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
      clientId: bill.clientId,
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
 * Get bills for a Client
 */
export const getBillsByClient = async (clientId, options = {}) => {
  try {
    const billsRef = collection(db, BILLS_COLLECTION);
    let q = query(
      billsRef,
      where('clientId', '==', clientId),
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
 * Get all bills for an institution
 */
export const getBillsByInstitution = async (institutionId, options = {}) => {
  try {
    const billsRef = collection(db, BILLS_COLLECTION);
    let q = query(
      billsRef,
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }

    if (options.clientId) {
      q = query(q, where('clientId', '==', options.clientId));
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
    console.error('Error fetching institution bills:', error);
    throw error;
  }
};

/**
 * Generate bills from task time tracking
 * Automatically creates bills for clients based on completed tasks with time tracking
 */
export const generateBillsFromTaskTime = async (institutionId, startDate, endDate) => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    
    // Get all completed tasks with time tracking in date range
    const tasksQuery = query(
      collection(db, BILLS_COLLECTION.replace('bills', 'careTasks')), // Use careTasks collection
      where('institutionId', '==', institutionId),
      where('status', '==', 'completed'),
      where('billed', '!=', true), // Not already billed
      where('taskEndTime', '>=', startTimestamp),
      where('taskEndTime', '<=', endTimestamp),
      orderBy('taskEndTime', 'asc')
    );
    
    // Try to get tasks - if collection doesn't exist or query fails, use alternative
    let snapshot;
    try {
      snapshot = await getDocs(tasksQuery);
    } catch (error) {
      // If query fails (e.g., missing index), get all tasks and filter in memory
      console.warn('Direct query failed, fetching all tasks and filtering:', error);
      const allTasksQuery = query(
        collection(db, 'careTasks'),
        where('institutionId', '==', institutionId),
        where('status', '==', 'completed'),
        orderBy('taskEndTime', 'desc'),
        limit(1000) // Limit to prevent memory issues
      );
      snapshot = await getDocs(allTasksQuery);
    }
    
    // Group by client
    const clientBills = {};
    
    snapshot.forEach(doc => {
      const task = doc.data();
      
      // Skip if already billed or no time tracking
      if (task.billed || !task.taskEndTime || !task.actualDuration) {
        return;
      }
      
      // Filter by date range in memory if needed
      const taskEndTime = task.taskEndTime?.toDate?.() || new Date(task.taskEndTime);
      if (taskEndTime < startDate || taskEndTime > endDate) {
        return;
      }
      
      const clientId = task.clientId || task.clientId;
      if (!clientId) return;
      
      if (!clientBills[clientId]) {
        clientBills[clientId] = {
          clientId: clientId,
          clientName: task.clientName || 'Unknown',
          tasks: [],
          totalHours: 0,
          totalAmount: 0
        };
      }
      
      const billableAmount = task.billableAmount || (task.actualDuration * (task.hourlyRate || 0));
      
      clientBills[clientId].tasks.push({
        taskId: doc.id,
        taskName: task.taskName || task.title || task.type || 'Care Task',
        duration: task.actualDuration,
        billableDuration: task.billableDuration || task.actualDuration,
        hourlyRate: task.hourlyRate || 0,
        amount: billableAmount,
        completedAt: taskEndTime
      });
      
      clientBills[clientId].totalHours += task.actualDuration || 0;
      clientBills[clientId].totalAmount += billableAmount;
    });
    
    // Generate bills for each client
    const bills = [];
    const batch = writeBatch(db);
    
    for (const [clientId, billData] of Object.entries(clientBills)) {
      if (billData.tasks.length === 0) continue;
      
      const bill = {
        clientId: clientId,
        clientName: billData.clientName,
        institutionId: institutionId,
        serviceType: SERVICE_TYPE.OTHER,
        items: billData.tasks.map(task => ({
          description: `Caregiver Service: ${task.taskName}`,
          quantity: task.billableDuration,
          unit: 'hours',
          unitPrice: task.hourlyRate,
          total: task.amount,
          taskId: task.taskId
        })),
        subtotal: billData.totalAmount,
        discount: 0,
        total: billData.totalAmount,
        currency: 'NGN',
        status: BILL_STATUS.PENDING,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Auto-generated from ${billData.tasks.length} completed task${billData.tasks.length > 1 ? 's' : ''} (${billData.totalHours.toFixed(2)} hours)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'task_time_tracking',
        taskIds: billData.tasks.map(t => t.taskId),
        billingPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      };
      
      const billRef = doc(collection(db, BILLS_COLLECTION));
      batch.set(billRef, bill);
      bills.push({ id: billRef.id, ...bill });
      
      // Mark tasks as billed
      billData.tasks.forEach(task => {
        const taskRef = doc(db, 'careTasks', task.taskId);
        batch.update(taskRef, {
          billed: true,
          billingPeriod: `${startDate.toISOString()}_${endDate.toISOString()}`,
          billId: billRef.id
        });
      });
    }
    
    // Commit all changes
    if (bills.length > 0) {
      await batch.commit();
    }
    
    return {
      success: true,
      billsGenerated: bills.length,
      bills: bills,
      totalAmount: bills.reduce((sum, bill) => sum + (bill.total || 0), 0)
    };
  } catch (error) {
    console.error('Error generating bills from task time:', error);
    throw error;
  }
};

/**
 * Get outstanding payments for a Client
 */
export const getOutstandingPayments = async (clientId) => {
  try {
    const allBills = await getBillsByClient(clientId);
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
        userId: bill.clientId,
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

/**
 * Approve HMO claim
 */
export const approveHMOClaim = async (claimId, approverId) => {
  try {
    const claimRef = doc(db, HMO_CLAIMS_COLLECTION, claimId);
    await updateDoc(claimRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: approverId,
      updatedAt: serverTimestamp()
    });

    return { success: true, claimId };
  } catch (error) {
    console.error('Error approving HMO claim:', error);
    throw error;
  }
};

/**
 * Reject HMO claim
 */
export const rejectHMOClaim = async (claimId, reason, rejectedBy) => {
  try {
    const claimRef = doc(db, HMO_CLAIMS_COLLECTION, claimId);
    await updateDoc(claimRef, {
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy: rejectedBy,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, claimId };
  } catch (error) {
    console.error('Error rejecting HMO claim:', error);
    throw error;
  }
};

/**
 * Mark HMO claim as paid
 */
export const markHMOClaimAsPaid = async (claimId, paymentData = {}) => {
  try {
    const { paymentDate, transactionId, notes } = paymentData;
    const claimRef = doc(db, HMO_CLAIMS_COLLECTION, claimId);
    await updateDoc(claimRef, {
      status: 'paid',
      paidAt: paymentDate ? serverTimestamp() : serverTimestamp(),
      paymentTransactionId: transactionId || null,
      paymentNotes: notes || null,
      updatedAt: serverTimestamp()
    });

    return { success: true, claimId };
  } catch (error) {
    console.error('Error marking HMO claim as paid:', error);
    throw error;
  }
};

/**
 * Get HMO claim statistics
 */
export const getHMOClaimStats = async (institutionId, startDate = null, endDate = null) => {
  try {
    const claims = await getHMOClaims(institutionId);
    
    let filteredClaims = claims;
    if (startDate || endDate) {
      filteredClaims = claims.filter(claim => {
        const claimDate = claim.createdAt instanceof Date 
          ? claim.createdAt 
          : new Date(claim.createdAt);
        if (startDate && claimDate < new Date(startDate)) return false;
        if (endDate && claimDate > new Date(endDate)) return false;
        return true;
      });
    }

    const stats = {
      total: filteredClaims.length,
      pending: filteredClaims.filter(c => c.status === 'pending').length,
      submitted: filteredClaims.filter(c => c.status === 'submitted').length,
      approved: filteredClaims.filter(c => c.status === 'approved').length,
      rejected: filteredClaims.filter(c => c.status === 'rejected').length,
      paid: filteredClaims.filter(c => c.status === 'paid').length,
      totalAmount: filteredClaims.reduce((sum, c) => sum + (c.claimAmount || 0), 0),
      pendingAmount: filteredClaims
        .filter(c => ['pending', 'submitted'].includes(c.status))
        .reduce((sum, c) => sum + (c.claimAmount || 0), 0),
      paidAmount: filteredClaims
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.claimAmount || 0), 0),
      averageClaimAmount: filteredClaims.length > 0
        ? filteredClaims.reduce((sum, c) => sum + (c.claimAmount || 0), 0) / filteredClaims.length
        : 0
    };

    return stats;
  } catch (error) {
    console.error('Error calculating HMO claim stats:', error);
    throw error;
  }
};


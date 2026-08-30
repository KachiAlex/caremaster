import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot
} from 'backend/database';
import { logClientActivity } from './clientActivitiesAPI';
import { db } from '../backend/config';

const PRESCRIPTIONS_COLLECTION = 'prescriptions';
const PRESCRIPTION_ITEMS_COLLECTION = 'prescriptionItems';

// Create a prescription
export const createPrescription = async (prescriptionData) => {
  try {
    if (!prescriptionData.clientId || !prescriptionData.doctorId) {
      throw new Error('Client ID and Doctor ID are required');
    }

    const prescriptionsRef = collection(db, PRESCRIPTIONS_COLLECTION);
    const newPrescription = {
      clientId: prescriptionData.clientId,
      clientName: prescriptionData.clientName || '',
      doctorId: prescriptionData.doctorId,
      doctorName: prescriptionData.doctorName || '',
      institutionId: prescriptionData.institutionId || '',
      prescriptionNumber: `RX-${Date.now()}`,
      prescriptionDate: prescriptionData.prescriptionDate || new Date().toISOString(),
      diagnosis: prescriptionData.diagnosis || '',
      notes: prescriptionData.notes || '',
      status: 'active', // active, dispensed, completed
      totalItems: prescriptionData.medications?.length || 0,
      totalCost: 0, // To be updated by pharmacist
      dispensedBy: null,
      dispensedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(prescriptionsRef, newPrescription);
    const prescriptionId = docRef.id;
    
    console.log('✅ Prescription created with ID:', prescriptionId);

    // Create prescription items (medications)
    if (prescriptionData.medications && prescriptionData.medications.length > 0) {
      const itemsRef = collection(db, PRESCRIPTION_ITEMS_COLLECTION);
      
      for (let i = 0; i < prescriptionData.medications.length; i++) {
        const medication = prescriptionData.medications[i];
        await addDoc(itemsRef, {
          prescriptionId: prescriptionId,
          prescriptionNumber: newPrescription.prescriptionNumber,
          itemNumber: i + 1,
          medicationName: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          duration: medication.duration,
          quantity: medication.quantity,
          instructions: medication.instructions || '',
          route: medication.route || 'oral',
          
          // Pharmacist fields
          isAvailable: null,
          availabilityCheckedBy: null,
          availabilityCheckedAt: null,
          unitPrice: null,
          totalPrice: null,
          alternativeSuggestion: null,
          pharmacistNotes: null,
          
          clientId: prescriptionData.clientId,
          doctorId: prescriptionData.doctorId,
          institutionId: prescriptionData.institutionId || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log(`✅ Created ${prescriptionData.medications.length} prescription items`);
    }

    // Log activity to client's activity log
    try {
      const medicationNames = prescriptionData.medications?.map(m => m.name).join(', ') || '';
      await logClientActivity({
        clientId: prescriptionData.clientId,
        activityType: 'prescription',
        performedBy: prescriptionData.doctorId,
        performerName: prescriptionData.doctorName,
        performerRole: 'doctor',
        description: `Prescription written: ${medicationNames}`,
        details: {
          prescriptionId: prescriptionId,
          prescriptionNumber: newPrescription.prescriptionNumber,
          diagnosis: prescriptionData.diagnosis,
          medicationCount: prescriptionData.medications?.length || 0
        },
        institutionId: prescriptionData.institutionId
      });
    } catch (activityError) {
      console.error('Error logging prescription activity:', activityError);
      // Don't throw - prescription was created successfully
    }

    // Auto-generate bill for prescription (Phase 1: Auto-billing integration)
    try {
      // Only auto-bill if autoBilling is enabled (default: true)
      const shouldAutoBill = prescriptionData.autoBilling !== false;
      
      if (shouldAutoBill && prescriptionData.institutionId) {
        const { generateBillFromPrescription } = await import('./autoBillingAPI');
        await generateBillFromPrescription(prescriptionId, {
          notes: `Auto-generated bill for prescription ${newPrescription.prescriptionNumber}`
        });
        console.log('✅ Auto-bill generated for prescription:', prescriptionId);
      }
    } catch (billingError) {
      console.warn('Could not auto-generate bill for prescription:', billingError);
      // Don't throw - prescription was created successfully, billing can be done manually
    }

    return { id: prescriptionId, ...newPrescription, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  } catch (error) {
    console.error('Error creating prescription:', error);
    throw error;
  }
};

// Update prescription
export const updatePrescription = async (prescriptionId, prescriptionData) => {
  try {
    const prescriptionRef = doc(db, PRESCRIPTIONS_COLLECTION, prescriptionId);
    const prescriptionDoc = await getDoc(prescriptionRef);
    
    if (!prescriptionDoc.exists()) {
      throw new Error('Prescription not found');
    }

    const existingData = prescriptionDoc.data();

    // Update main prescription document
    await updateDoc(prescriptionRef, {
      diagnosis: prescriptionData.diagnosis,
      notes: prescriptionData.notes,
      totalItems: prescriptionData.medications?.length || 0,
      updatedAt: serverTimestamp()
    });

    // Delete existing medication items
    const existingItemsQuery = query(
      collection(db, PRESCRIPTION_ITEMS_COLLECTION),
      where('prescriptionId', '==', prescriptionId)
    );
    const existingItemsSnapshot = await getDocs(existingItemsQuery);
    
    const deletePromises = existingItemsSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);

    // Create new medication items
    if (prescriptionData.medications && prescriptionData.medications.length > 0) {
      const itemsRef = collection(db, PRESCRIPTION_ITEMS_COLLECTION);
      const prescriptionNumber = existingData.prescriptionNumber;
      
      for (let i = 0; i < prescriptionData.medications.length; i++) {
        const medication = prescriptionData.medications[i];
        await addDoc(itemsRef, {
          prescriptionId: prescriptionId,
          prescriptionNumber: prescriptionNumber,
          itemNumber: i + 1,
          medicationName: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          duration: medication.duration,
          quantity: medication.quantity,
          instructions: medication.instructions || '',
          route: medication.route || 'oral',
          
          // Pharmacist fields
          isAvailable: null,
          availabilityCheckedBy: null,
          availabilityCheckedAt: null,
          unitPrice: null,
          totalPrice: null,
          alternativeSuggestion: '',
          pharmacistNotes: '',
          
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    // Log activity to client's activity log
    try {
      const medicationNames = prescriptionData.medications?.map(m => m.name).join(', ') || '';
      await logClientActivity({
        clientId: prescriptionData.clientId,
        activityType: 'prescription',
        performedBy: prescriptionData.doctorId,
        performerName: prescriptionData.doctorName,
        performerRole: 'doctor',
        description: `Prescription updated: ${medicationNames}`,
        details: {
          prescriptionId: prescriptionId,
          prescriptionNumber: existingData.prescriptionNumber,
          diagnosis: prescriptionData.diagnosis,
          medicationCount: prescriptionData.medications?.length || 0
        },
        institutionId: prescriptionData.institutionId
      });
    } catch (activityError) {
      console.error('Error logging prescription update activity:', activityError);
    }

    console.log('✅ Prescription updated:', prescriptionId);
    return { id: prescriptionId, ...existingData, ...prescriptionData };
  } catch (error) {
    console.error('Error updating prescription:', error);
    throw error;
  }
};

// Get prescriptions by client
export const getPrescriptionsByClient = async (clientId) => {
  try {
    const prescriptionsRef = collection(db, PRESCRIPTIONS_COLLECTION);
    let querySnapshot;
    try {
      const q = query(
        prescriptionsRef,
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const q = query(prescriptionsRef, where('clientId', '==', clientId));
        const fallbackSnapshot = await getDocs(q);
        const sortedDocs = [...fallbackSnapshot.docs].sort((a, b) => {
          const av = a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : new Date(a.data().createdAt).getTime();
          const bv = b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : new Date(b.data().createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
        });
        querySnapshot = { docs: sortedDocs };
      } else {
        throw error;
      }
    }
    const prescriptions = [];
    
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      
      // Get prescription items
      const items = await getPrescriptionItems(doc.id);
      
      prescriptions.push({
        id: doc.id,
        ...data,
        medications: items,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        prescriptionDate: data.prescriptionDate?.toDate?.() || data.prescriptionDate
      });
    }

    return prescriptions;
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return [];
  }
};

// Get prescription items for a prescription
export const getPrescriptionItems = async (prescriptionId) => {
  try {
    const itemsRef = collection(db, PRESCRIPTION_ITEMS_COLLECTION);
    try {
      const q = query(
        itemsRef,
        where('prescriptionId', '==', prescriptionId),
        orderBy('itemNumber', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const items = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          availabilityCheckedAt: data.availabilityCheckedAt?.toDate?.() || data.availabilityCheckedAt,
          dispensedAt: data.dispensedAt?.toDate?.() || data.dispensedAt,
        });
      });

      return items;
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const q = query(itemsRef, where('prescriptionId', '==', prescriptionId));
        const querySnapshot = await getDocs(q);
        const items = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            availabilityCheckedAt: data.availabilityCheckedAt?.toDate?.() || data.availabilityCheckedAt,
            dispensedAt: data.dispensedAt?.toDate?.() || data.dispensedAt,
          });
        });
        items.sort((a, b) => {
          const av = a.itemNumber ?? 0;
          const bv = b.itemNumber ?? 0;
          return av - bv;
        });
        return items;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching prescription items:', error);
    return [];
  }
};

// Get active prescriptions for pharmacist
export const getPendingPrescriptions = async (institutionId) => {
  try {
    const prescriptionsRef = collection(db, PRESCRIPTIONS_COLLECTION);
    let querySnapshot;
    try {
      const q = query(
        prescriptionsRef,
        where('institutionId', '==', institutionId),
        where('status', 'in', ['active', 'dispensed']),
        orderBy('createdAt', 'desc')
      );

      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const q = query(
          prescriptionsRef,
          where('institutionId', '==', institutionId),
          where('status', 'in', ['active', 'dispensed'])
        );
        const fallbackSnapshot = await getDocs(q);
        const sortedDocs = [...fallbackSnapshot.docs].sort((a, b) => {
          const av = a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : new Date(a.data().createdAt).getTime();
          const bv = b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : new Date(b.data().createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
        });
        querySnapshot = { docs: sortedDocs };
      } else {
        throw error;
      }
    }
    const prescriptions = [];
    
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const items = await getPrescriptionItems(doc.id);
      
      prescriptions.push({
        id: doc.id,
        ...data,
        medications: items,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        prescriptionDate: data.prescriptionDate?.toDate?.() || data.prescriptionDate
      });
    }

    return prescriptions;
  } catch (error) {
    console.error('Error fetching pending prescriptions:', error);
    return [];
  }
};

// Update prescription item (pharmacist adds price/availability)
export const updatePrescriptionItem = async (itemId, updates) => {
  try {
    const itemRef = doc(db, PRESCRIPTION_ITEMS_COLLECTION, itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating prescription item:', error);
    throw error;
  }
};

// Update prescription status
export const updatePrescriptionStatus = async (prescriptionId, status, userId, userName) => {
  try {
    const prescriptionRef = doc(db, PRESCRIPTIONS_COLLECTION, prescriptionId);
    const updates = {
      status: status,
      updatedAt: serverTimestamp()
    };

    if (status === 'verified') {
      updates.verifiedBy = userId;
      updates.verifiedByName = userName;
      updates.verifiedAt = serverTimestamp();
    } else if (status === 'dispensed') {
      updates.dispensedBy = userId;
      updates.dispensedByName = userName;
      updates.dispensedAt = serverTimestamp();
    }

    await updateDoc(prescriptionRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating prescription status:', error);
    throw error;
  }
};

// Calculate and update total prescription cost
export const updatePrescriptionTotalCost = async (prescriptionId) => {
  try {
    const items = await getPrescriptionItems(prescriptionId);
    const totalCost = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    const prescriptionRef = doc(db, PRESCRIPTIONS_COLLECTION, prescriptionId);
    await updateDoc(prescriptionRef, {
      totalCost: totalCost,
      updatedAt: serverTimestamp()
    });
    
    return totalCost;
  } catch (error) {
    console.error('Error updating prescription total cost:', error);
    throw error;
  }
};

// Real-time listener for prescriptions
export const subscribeToPrescriptionsByClient = (clientId, callback) => {
  const prescriptionsRef = collection(db, PRESCRIPTIONS_COLLECTION);
  const q = query(
    prescriptionsRef,
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  
  let fallbackUnsubscribe = null;
  
  const processSnapshot = async (querySnapshot) => {
    try {
      const prescriptions = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const items = await getPrescriptionItems(doc.id);
        
        prescriptions.push({
          id: doc.id,
          ...data,
          medications: items,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
        });
      }
      
      callback(prescriptions);
    } catch (error) {
      console.error('Error processing prescriptions snapshot:', error);
      callback([]);
    }
  };
  
  const unsubscribe = onSnapshot(q, processSnapshot, (error) => {
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      console.warn('Index missing, using fallback query for subscription:', error.message);
      const fallbackQuery = query(prescriptionsRef, where('clientId', '==', clientId));
      fallbackUnsubscribe = onSnapshot(fallbackQuery, async (querySnapshot) => {
        const sortedDocs = [...querySnapshot.docs].sort((a, b) => {
          const av = a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : new Date(a.data().createdAt).getTime();
          const bv = b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : new Date(b.data().createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
        });
        await processSnapshot({ docs: sortedDocs });
      }, (fallbackError) => {
        console.error('Fallback subscription error:', fallbackError);
      });
    } else {
      console.error('Subscription error:', error);
    }
  });
  
  return () => {
    unsubscribe();
    if (fallbackUnsubscribe) fallbackUnsubscribe();
  };
};

// Delete prescription
export const deletePrescription = async (prescriptionId) => {
  try {
    // Delete prescription items first
    const items = await getPrescriptionItems(prescriptionId);
    for (const item of items) {
      await deleteDoc(doc(db, PRESCRIPTION_ITEMS_COLLECTION, item.id));
    }
    
    // Delete prescription
    const prescriptionRef = doc(db, PRESCRIPTIONS_COLLECTION, prescriptionId);
    await deleteDoc(prescriptionRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting prescription:', error);
    throw error;
  }
};

export default {
  createPrescription,
  updatePrescription,
  getPrescriptionsByClient,
  getPrescriptionItems,
  getPendingPrescriptions,
  updatePrescriptionItem,
  updatePrescriptionStatus,
  updatePrescriptionTotalCost,
  subscribeToPrescriptionsByClient,
  deletePrescription
};


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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logClientActivity } from './clientActivitiesAPI';

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

    return { id: prescriptionId, ...newPrescription };
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
    const q = query(
      prescriptionsRef,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
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
        prescriptionDate: data.prescriptionDate || data.createdAt
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
    const q = query(
      itemsRef,
      where('prescriptionId', '==', prescriptionId),
      orderBy('itemNumber', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const items = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return items;
  } catch (error) {
    console.error('Error fetching prescription items:', error);
    return [];
  }
};

// Get active prescriptions for pharmacist
export const getPendingPrescriptions = async (institutionId) => {
  try {
    const prescriptionsRef = collection(db, PRESCRIPTIONS_COLLECTION);
    const q = query(
      prescriptionsRef,
      where('institutionId', '==', institutionId),
      where('status', 'in', ['active', 'dispensed']),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
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
  
  return onSnapshot(q, async (querySnapshot) => {
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
  });
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


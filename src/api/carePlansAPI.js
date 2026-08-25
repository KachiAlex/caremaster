import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'backend/database';
import { logCarePlanUpdate } from '../utils/patientLogger';
import { db } from '../backend/config';

const CARE_PLANS_COLLECTION = 'carePlans';
const CLIENTS_COLLECTION = 'clients';

// Create a new care plan (Doctor only)
export const createCarePlan = async (carePlanData, clinicianInfo = null) => {
  try {
    const docRef = await addDoc(collection(db, CARE_PLANS_COLLECTION), {
      ...carePlanData,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Care plan created:', docRef.id);
    
    // Log to patient logs if clinician info is provided
    if (clinicianInfo && carePlanData.clientId) {
      try {
        // Get client document to extract patientSimpleId (clientId field)
        const clientDocRef = doc(db, CLIENTS_COLLECTION, carePlanData.clientId);
        const clientDoc = await getDoc(clientDocRef);
        
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          const patientSimpleId = clientData.clientId || carePlanData.clientId;
          
          await logCarePlanUpdate(patientSimpleId, clinicianInfo, {
            ...carePlanData,
            planId: docRef.id,
            action: 'created'
          });
        }
      } catch (logError) {
        console.error('Error logging care plan creation:', logError);
        // Don't throw - care plan was created successfully
      }
    }
    
    return { id: docRef.id, ...carePlanData };
  } catch (error) {
    console.error('❌ Error creating care plan:', error);
    throw error;
  }
};

// Get care plans for a specific client
export const getCarePlansByClient = async (clientId) => {
  try {
    const q = query(
      collection(db, CARE_PLANS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('startDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(doc.data().startDate),
      reviewDate: doc.data().reviewDate?.toDate ? doc.data().reviewDate.toDate() : new Date(doc.data().reviewDate)
    }));
    
    console.log(`✅ Loaded ${plans.length} care plans for client ${clientId}`);
    return plans;
  } catch (error) {
    console.error('❌ Error fetching care plans:', error);
    throw error;
  }
};

// Get active care plan for a client
export const getActiveCarePlan = async (clientId) => {
  try {
    const q = query(
      collection(db, CARE_PLANS_COLLECTION),
      where('clientId', '==', clientId),
      where('status', '==', 'active'),
      orderBy('startDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
        reviewDate: data.reviewDate?.toDate ? data.reviewDate.toDate() : new Date(data.reviewDate)
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Error fetching active care plan:', error);
    throw error;
  }
};

// Get all care plans by a specific doctor
export const getCarePlansByDoctor = async (doctorId) => {
  try {
    const q = query(
      collection(db, CARE_PLANS_COLLECTION),
      where('doctorId', '==', doctorId),
      orderBy('startDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(doc.data().startDate),
      reviewDate: doc.data().reviewDate?.toDate ? doc.data().reviewDate.toDate() : new Date(doc.data().reviewDate)
    }));
    
    console.log(`✅ Loaded ${plans.length} care plans by doctor ${doctorId}`);
    return plans;
  } catch (error) {
    console.error('❌ Error fetching doctor care plans:', error);
    throw error;
  }
};

// Get a single care plan
export const getCarePlan = async (planId) => {
  try {
    const docRef = doc(db, CARE_PLANS_COLLECTION, planId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
        reviewDate: data.reviewDate?.toDate ? data.reviewDate.toDate() : new Date(data.reviewDate)
      };
    } else {
      throw new Error('Care plan not found');
    }
  } catch (error) {
    console.error('❌ Error fetching care plan:', error);
    throw error;
  }
};

// Update a care plan
export const updateCarePlan = async (planId, updateData, clinicianInfo = null) => {
  try {
    // Get existing care plan to access clientId
    const planDocRef = doc(db, CARE_PLANS_COLLECTION, planId);
    const planDoc = await getDoc(planDocRef);
    
    if (!planDoc.exists()) {
      throw new Error('Care plan not found');
    }
    
    const existingPlanData = planDoc.data();
    
    const docRef = doc(db, CARE_PLANS_COLLECTION, planId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Care plan updated:', planId);
    
    // Log to patient logs if clinician info is provided
    if (clinicianInfo && existingPlanData.clientId) {
      try {
        // Get client document to extract patientSimpleId (clientId field)
        const clientDocRef = doc(db, CLIENTS_COLLECTION, existingPlanData.clientId);
        const clientDoc = await getDoc(clientDocRef);
        
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          const patientSimpleId = clientData.clientId || existingPlanData.clientId;
          
          await logCarePlanUpdate(patientSimpleId, clinicianInfo, {
            ...updateData,
            planId: planId,
            action: 'updated'
          });
        }
      } catch (logError) {
        console.error('Error logging care plan update:', logError);
        // Don't throw - care plan was updated successfully
      }
    }
    
    return { id: planId, ...updateData };
  } catch (error) {
    console.error('❌ Error updating care plan:', error);
    throw error;
  }
};

// Archive a care plan (set status to completed)
export const archiveCarePlan = async (planId) => {
  try {
    const docRef = doc(db, CARE_PLANS_COLLECTION, planId);
    await updateDoc(docRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Care plan archived:', planId);
    return planId;
  } catch (error) {
    console.error('❌ Error archiving care plan:', error);
    throw error;
  }
};

// Delete a care plan
export const deleteCarePlan = async (planId) => {
  try {
    const docRef = doc(db, CARE_PLANS_COLLECTION, planId);
    await deleteDoc(docRef);
    
    console.log('✅ Care plan deleted:', planId);
    return planId;
  } catch (error) {
    console.error('❌ Error deleting care plan:', error);
    throw error;
  }
};

// Real-time subscription to care plans for a client
export const subscribeToCarePlansByClient = (clientId, callback) => {
  try {
    const q = query(
      collection(db, CARE_PLANS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('startDate', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(doc.data().startDate),
        reviewDate: doc.data().reviewDate?.toDate ? doc.data().reviewDate.toDate() : new Date(doc.data().reviewDate)
      }));
      
      console.log(`🔄 Real-time update: ${plans.length} care plans for client ${clientId}`);
      callback(plans);
    }, (error) => {
      console.error('❌ Error in care plans subscription:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up care plans subscription:', error);
    throw error;
  }
};

const carePlansAPI = {
  createCarePlan,
  getCarePlansByClient,
  getActiveCarePlan,
  getCarePlansByDoctor,
  getCarePlan,
  updateCarePlan,
  archiveCarePlan,
  deleteCarePlan,
  subscribeToCarePlansByClient
};

export { carePlansAPI };
export default carePlansAPI;

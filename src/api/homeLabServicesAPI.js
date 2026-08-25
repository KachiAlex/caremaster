/**
 * Home Laboratory Services API
 * 
 * Manages mobile lab technician services including:
 * - Home visit scheduling
 * - Sample collection tracking
 * - Chain of custody management
 * - Integration with main lab system
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import logger from '../utils/logger';
import ComprehensivePatientLogger from '../utils/comprehensivePatientLogger';
import { db } from '../backend/config';

const HOME_LAB_VISITS_COLLECTION = 'homeLabVisits';
const SAMPLE_COLLECTIONS_COLLECTION = 'sampleCollections';

/**
 * Create a home lab visit request
 * @param {Object} visitData - Visit details
 * @returns {Promise<string>} Visit ID
 */
export const createHomeLabVisit = async (visitData) => {
  try {
    logger.info('Creating home lab visit', { clientId: visitData.clientId });

    const visitWithTimestamp = {
      ...visitData,
      status: 'scheduled', // scheduled, in_progress, completed, cancelled
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      scheduledAt: visitData.scheduledAt ? Timestamp.fromDate(new Date(visitData.scheduledAt)) : serverTimestamp(),
      sampleCollected: false,
      sampleCollectionTime: null,
      resultsUploaded: false,
      resultsUploadTime: null
    };

    const docRef = await addDoc(collection(db, HOME_LAB_VISITS_COLLECTION), visitWithTimestamp);

    // Log activity to Client database
    try {
      await ComprehensivePatientLogger.logLabTestOrdered(
        visitData.clientId,
        {
          diagnosticId: docRef.id,
          testType: visitData.testType || 'Home Lab Visit',
          testName: visitData.testName || visitData.testType,
          reason: visitData.reason || 'Home laboratory service requested',
          urgency: visitData.urgency || 'normal',
          homeVisit: true,
          scheduledAt: visitData.scheduledAt,
          address: visitData.patientAddress
        },
        {
          id: visitData.orderedBy || visitData.doctorId,
          name: visitData.orderedByName || visitData.doctorName,
          role: 'doctor',
          userType: 'doctor',
          type: 'doctor',
          email: visitData.orderedByEmail,
          medicalQualification: 'Physician',
          institutionId: visitData.institutionId
        }
      );
    } catch (logError) {
      logger.error('Error logging home lab visit activity', { logError });
    }

    // Send notification to lab technician
    try {
      const { notificationsAPI } = await import('./notificationsAPI');
      await notificationsAPI.sendNotification({
        userId: visitData.assignedLabTechnicianId,
        type: 'home_lab_visit_assigned',
        title: 'New Home Lab Visit Assigned',
        message: `Home lab visit scheduled for ${visitData.clientName} on ${new Date(visitData.scheduledAt).toLocaleDateString()}`,
        data: {
          visitId: docRef.id,
          clientId: visitData.clientId,
          clientName: visitData.clientName,
          scheduledAt: visitData.scheduledAt,
          testType: visitData.testType
        },
        institutionId: visitData.institutionId
      });
    } catch (notificationError) {
      logger.error('Error sending notification', { notificationError });
    }

    logger.info('Home lab visit created successfully', { id: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error('Error creating home lab visit', { error, visitData });
    throw error;
  }
};

/**
 * Get home lab visits for a lab technician
 * @param {string} labTechnicianId - Lab technician ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of home lab visits
 */
export const getHomeLabVisitsByTechnician = async (labTechnicianId, filters = {}) => {
  try {
    const visitsRef = collection(db, HOME_LAB_VISITS_COLLECTION);
    let visitsQuery = query(
      visitsRef,
      where('assignedLabTechnicianId', '==', labTechnicianId),
      orderBy('scheduledAt', 'asc')
    );

    if (filters.status) {
      visitsQuery = query(visitsQuery, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(visitsQuery);
    const visits = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      visits.push({
        id: doc.id,
        ...data,
        scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        sampleCollectionTime: data.sampleCollectionTime?.toDate?.() || data.sampleCollectionTime
      });
    });

    return visits;
  } catch (error) {
    logger.error('Error fetching home lab visits', { error });
    throw error;
  }
};

/**
 * Get home lab visits for a Client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} List of home lab visits
 */
export const getHomeLabVisitsByClient = async (clientId) => {
  try {
    const visitsRef = collection(db, HOME_LAB_VISITS_COLLECTION);
    const visitsQuery = query(
      visitsRef,
      where('clientId', '==', clientId),
      orderBy('scheduledAt', 'desc')
    );

    const snapshot = await getDocs(visitsQuery);
    const visits = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      visits.push({
        id: doc.id,
        ...data,
        scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        sampleCollectionTime: data.sampleCollectionTime?.toDate?.() || data.sampleCollectionTime
      });
    });

    return visits;
  } catch (error) {
    logger.error('Error fetching Client home lab visits', { error });
    throw error;
  }
};

/**
 * Update home lab visit status
 * @param {string} visitId - Visit ID
 * @param {Object} updateData - Update data
 * @returns {Promise<void>}
 */
export const updateHomeLabVisit = async (visitId, updateData) => {
  try {
    const visitRef = doc(db, HOME_LAB_VISITS_COLLECTION, visitId);
    
    await updateDoc(visitRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    logger.info('Home lab visit updated', { visitId, updateData });
  } catch (error) {
    logger.error('Error updating home lab visit', { error, visitId });
    throw error;
  }
};

/**
 * Record sample collection
 * @param {string} visitId - Visit ID
 * @param {Object} collectionData - Sample collection details
 * @returns {Promise<string>} Collection record ID
 */
export const recordSampleCollection = async (visitId, collectionData) => {
  try {
    // Get visit details
    const visitRef = doc(db, HOME_LAB_VISITS_COLLECTION, visitId);
    const visitDoc = await getDoc(visitRef);
    const visitData = visitDoc.data();

    if (!visitData) {
      throw new Error('Visit not found');
    }

    // Create sample collection record
    const collectionRecord = {
      visitId: visitId,
      clientId: visitData.clientId,
      clientName: visitData.clientName,
      labTechnicianId: collectionData.labTechnicianId,
      labTechnicianName: collectionData.labTechnicianName,
      testType: visitData.testType,
      testName: visitData.testName,
      sampleType: collectionData.sampleType, // blood, urine, swab, etc.
      collectionMethod: collectionData.collectionMethod,
      collectionTime: serverTimestamp(),
      collectionLocation: collectionData.collectionLocation || visitData.patientAddress,
      samplePhotos: collectionData.samplePhotos || [],
      collectionNotes: collectionData.collectionNotes || '',
      chainOfCustody: {
        collectedBy: {
          id: collectionData.labTechnicianId,
          name: collectionData.labTechnicianName,
          timestamp: serverTimestamp()
        },
        transportedBy: null,
        receivedBy: null,
        status: 'collected' // collected, in_transit, received, processed
      },
      institutionId: visitData.institutionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const collectionRef = await addDoc(collection(db, SAMPLE_COLLECTIONS_COLLECTION), collectionRecord);

    // Update visit status
    await updateDoc(visitRef, {
      status: 'completed',
      sampleCollected: true,
      sampleCollectionTime: serverTimestamp(),
      sampleCollectionId: collectionRef.id,
      updatedAt: serverTimestamp()
    });

    // Log activity to Client database
    try {
      await ComprehensivePatientLogger.logLabTestResults(
        visitData.clientId,
        {
          diagnosticId: visitId,
          testName: visitData.testName || visitData.testType,
          testType: visitData.testType,
          sampleCollected: true,
          sampleType: collectionData.sampleType,
          collectionMethod: collectionData.collectionMethod,
          collectionTime: new Date().toISOString(),
          homeVisit: true,
          collectionId: collectionRef.id
        },
        {
          id: collectionData.labTechnicianId,
          name: collectionData.labTechnicianName,
          role: 'lab_technician',
          userType: 'lab_technician',
          type: 'lab_technician',
          email: collectionData.labTechnicianEmail,
          medicalQualification: 'Laboratory Technician',
          institutionId: visitData.institutionId
        }
      );
    } catch (logError) {
      logger.error('Error logging sample collection activity', { logError });
    }

    logger.info('Sample collection recorded', { visitId, collectionId: collectionRef.id });
    return collectionRef.id;
  } catch (error) {
    logger.error('Error recording sample collection', { error, visitId });
    throw error;
  }
};

/**
 * Update chain of custody
 * @param {string} collectionId - Collection record ID
 * @param {Object} custodyData - Chain of custody update
 * @returns {Promise<void>}
 */
export const updateChainOfCustody = async (collectionId, custodyData) => {
  try {
    const collectionRef = doc(db, SAMPLE_COLLECTIONS_COLLECTION, collectionId);
    const collectionDoc = await getDoc(collectionRef);
    const collectionData = collectionDoc.data();

    const chainOfCustody = {
      ...collectionData.chainOfCustody,
      ...custodyData,
      updatedAt: serverTimestamp()
    };

    await updateDoc(collectionRef, {
      chainOfCustody,
      updatedAt: serverTimestamp()
    });

    logger.info('Chain of custody updated', { collectionId, custodyData });
  } catch (error) {
    logger.error('Error updating chain of custody', { error, collectionId });
    throw error;
  }
};

/**
 * Get sample collection by ID
 * @param {string} collectionId - Collection ID
 * @returns {Promise<Object>} Collection record
 */
export const getSampleCollection = async (collectionId) => {
  try {
    const collectionRef = doc(db, SAMPLE_COLLECTIONS_COLLECTION, collectionId);
    const collectionDoc = await getDoc(collectionRef);
    
    if (!collectionDoc.exists()) {
      throw new Error('Sample collection not found');
    }

    const data = collectionDoc.data();
    return {
      id: collectionDoc.id,
      ...data,
      collectionTime: data.collectionTime?.toDate?.() || data.collectionTime,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
    };
  } catch (error) {
    logger.error('Error fetching sample collection', { error, collectionId });
    throw error;
  }
};

/**
 * Get all sample collections for a lab technician
 * @param {string} labTechnicianId - Lab technician ID
 * @returns {Promise<Array>} List of sample collections
 */
export const getSampleCollectionsByTechnician = async (labTechnicianId) => {
  try {
    const collectionsRef = collection(db, SAMPLE_COLLECTIONS_COLLECTION);
    const collectionsQuery = query(
      collectionsRef,
      where('labTechnicianId', '==', labTechnicianId),
      orderBy('collectionTime', 'desc')
    );

    const snapshot = await getDocs(collectionsQuery);
    const collections = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      collections.push({
        id: doc.id,
        ...data,
        collectionTime: data.collectionTime?.toDate?.() || data.collectionTime,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      });
    });

    return collections;
  } catch (error) {
    logger.error('Error fetching sample collections', { error });
    throw error;
  }
};

/**
 * Link home lab visit results to main lab system
 * @param {string} visitId - Visit ID
 * @param {string} diagnosticId - Diagnostic test ID from main lab system
 * @returns {Promise<void>}
 */
export const linkHomeLabVisitToDiagnostic = async (visitId, diagnosticId) => {
  try {
    const visitRef = doc(db, HOME_LAB_VISITS_COLLECTION, visitId);
    
    await updateDoc(visitRef, {
      linkedDiagnosticId: diagnosticId,
      resultsUploaded: true,
      resultsUploadTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    logger.info('Home lab visit linked to diagnostic', { visitId, diagnosticId });
  } catch (error) {
    logger.error('Error linking home lab visit to diagnostic', { error, visitId, diagnosticId });
    throw error;
  }
};

export default {
  createHomeLabVisit,
  getHomeLabVisitsByTechnician,
  getHomeLabVisitsByClient,
  updateHomeLabVisit,
  recordSampleCollection,
  updateChainOfCustody,
  getSampleCollection,
  getSampleCollectionsByTechnician,
  linkHomeLabVisitToDiagnostic
};


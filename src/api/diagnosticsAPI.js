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
  writeBatch,
  FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';
import logger from '../utils/logger';
import { logClientActivity as logActivity } from './clientActivitiesAPI';

const DIAGNOSTICS_COLLECTION = 'diagnostics';
const CLIENT_ACTIVITIES_COLLECTION = 'clientActivities';

// Create a new diagnostic test
export const createDiagnosticTest = async (diagnosticData) => {
  try {
    logger.info('Creating diagnostic test', { clientId: diagnosticData.clientId });

    const diagnosticWithTimestamp = {
      ...diagnosticData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'pending', // pending, completed, cancelled
      results: null,
      doctorNotes: null,
      uploadedDocuments: []
    };

    const docRef = await addDoc(collection(db, DIAGNOSTICS_COLLECTION), diagnosticWithTimestamp);

    // Log activity to client database
    try {
      await logActivity({
        clientId: diagnosticData.clientId,
        activityType: 'diagnostic',
        performedBy: diagnosticData.orderedBy,
        performerName: diagnosticData.orderedByName,
        performerRole: 'doctor',
        description: `Diagnostic test ordered: ${diagnosticData.testType}`,
        details: {
          diagnosticId: docRef.id,
          testType: diagnosticData.testType,
          reason: diagnosticData.reason,
          urgency: diagnosticData.urgency
        },
        institutionId: diagnosticData.institutionId
      });
    } catch (activityError) {
      logger.error('Error logging diagnostic activity', { activityError });
      // Don't throw - diagnostic was created successfully
    }

    logger.info('Diagnostic test created successfully', { id: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error('Error creating diagnostic test', { error, diagnosticData });
    throw error;
  }
};

// Upload diagnostic results (for nurses)
export const uploadDiagnosticResults = async (diagnosticId, resultsData) => {
  try {
    logger.info('Uploading diagnostic results', { diagnosticId });

    const diagnosticRef = doc(db, DIAGNOSTICS_COLLECTION, diagnosticId);
    
    const updateData = {
      results: resultsData.results,
      uploadedDocuments: resultsData.uploadedDocuments || [],
      uploadedBy: resultsData.uploadedBy,
      uploadedByName: resultsData.uploadedByName,
      uploadedAt: serverTimestamp(),
      status: 'completed',
      updatedAt: serverTimestamp()
    };

    await updateDoc(diagnosticRef, updateData);

    // Get diagnostic details for activity log
    const diagnosticDoc = await getDoc(diagnosticRef);
    const diagnostic = diagnosticDoc.data();

    // Log activity to client database
    try {
      await logActivity({
        clientId: diagnostic.clientId,
        activityType: 'diagnostic',
        performedBy: resultsData.uploadedBy,
        performerName: resultsData.uploadedByName,
        performerRole: 'nurse',
        description: `Diagnostic results uploaded for: ${diagnostic.testType}`,
        details: {
          diagnosticId,
          testType: diagnostic.testType,
          documentCount: resultsData.uploadedDocuments?.length || 0,
          hasResults: !!resultsData.results
        },
        institutionId: diagnostic.institutionId
      });
    } catch (activityError) {
      logger.error('Error logging results upload activity', { activityError });
      // Don't throw - results were uploaded successfully
    }

    logger.info('Diagnostic results uploaded successfully', { diagnosticId });
  } catch (error) {
    logger.error('Error uploading diagnostic results', { error, diagnosticId });
    throw error;
  }
};

// Add doctor notes to diagnostic test
export const addDoctorNotes = async (diagnosticId, notesData) => {
  try {
    logger.info('Adding doctor notes to diagnostic', { diagnosticId });

    const diagnosticRef = doc(db, DIAGNOSTICS_COLLECTION, diagnosticId);
    
    const updateData = {
      doctorNotes: {
        notes: notesData.notes,
        diagnosis: notesData.diagnosis,
        recommendations: notesData.recommendations,
        followUpRequired: notesData.followUpRequired,
        followUpDate: notesData.followUpDate,
        addedBy: notesData.addedBy,
        addedByName: notesData.addedByName,
        addedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };

    await updateDoc(diagnosticRef, updateData);

    // Get diagnostic details for activity log
    const diagnosticDoc = await getDoc(diagnosticRef);
    const diagnostic = diagnosticDoc.data();

    // Log activity to client database
    try {
      await logActivity({
        clientId: diagnostic.clientId,
        activityType: 'diagnostic',
        performedBy: notesData.addedBy,
        performerName: notesData.addedByName,
        performerRole: 'doctor',
        description: `Doctor notes added for diagnostic: ${diagnostic.testType}${notesData.diagnosis ? ` - Diagnosis: ${notesData.diagnosis}` : ''}`,
        details: {
          diagnosticId,
          testType: diagnostic.testType,
          hasDiagnosis: !!notesData.diagnosis,
          diagnosis: notesData.diagnosis,
          hasRecommendations: !!notesData.recommendations,
          followUpRequired: notesData.followUpRequired
        },
        institutionId: diagnostic.institutionId
      });
    } catch (activityError) {
      logger.error('Error logging doctor notes activity', { activityError });
      // Don't throw - notes were added successfully
    }

    logger.info('Doctor notes added successfully', { diagnosticId });
  } catch (error) {
    logger.error('Error adding doctor notes', { error, diagnosticId });
    throw error;
  }
};

// Get diagnostics for a specific client
export const getClientDiagnostics = async (clientId) => {
  try {
    logger.info('Fetching diagnostics for client', { clientId });

    const diagnosticsQuery = query(
      collection(db, DIAGNOSTICS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(diagnosticsQuery);
    const diagnostics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('Fetched client diagnostics', { clientId, count: diagnostics.length });
    return diagnostics;
  } catch (error) {
    logger.error('Error fetching client diagnostics', { error, clientId });
    throw error;
  }
};

// Get all diagnostics (for admin/doctor view)
export const getAllDiagnostics = async (institutionId) => {
  try {
    logger.info('Fetching all diagnostics for institution', { institutionId });

    const diagnosticsQuery = query(
      collection(db, DIAGNOSTICS_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(diagnosticsQuery);
    const diagnostics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('Fetched all diagnostics', { institutionId, count: diagnostics.length });
    return diagnostics;
  } catch (error) {
    logger.error('Error fetching all diagnostics', { error, institutionId });
    throw error;
  }
};

// Subscribe to real-time updates for client diagnostics
export const subscribeToClientDiagnostics = (clientId, callback) => {
  logger.info('Subscribing to client diagnostics', { clientId });

  const diagnosticsQuery = query(
    collection(db, DIAGNOSTICS_COLLECTION),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(diagnosticsQuery, (snapshot) => {
    const diagnostics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('Real-time diagnostics update', { clientId, count: diagnostics.length });
    callback(diagnostics);
  }, (error) => {
    logger.error('Error in diagnostics subscription', { error, clientId });
  });
};

// Update diagnostic test
export const updateDiagnosticTest = async (diagnosticId, updateData) => {
  try {
    logger.info('Updating diagnostic test', { diagnosticId });

    const diagnosticRef = doc(db, DIAGNOSTICS_COLLECTION, diagnosticId);
    
    const updateWithTimestamp = {
      ...updateData,
      updatedAt: serverTimestamp()
    };

    await updateDoc(diagnosticRef, updateWithTimestamp);

    logger.info('Diagnostic test updated successfully', { diagnosticId });
  } catch (error) {
    logger.error('Error updating diagnostic test', { error, diagnosticId });
    throw error;
  }
};

// Delete diagnostic test
export const deleteDiagnosticTest = async (diagnosticId) => {
  try {
    logger.info('Deleting diagnostic test', { diagnosticId });

    // Get diagnostic details for activity log
    const diagnosticDoc = await getDoc(doc(db, DIAGNOSTICS_COLLECTION, diagnosticId));
    const diagnostic = diagnosticDoc.data();

    await deleteDoc(doc(db, DIAGNOSTICS_COLLECTION, diagnosticId));

    // Log activity to client database
    await logClientActivity(diagnostic.clientId, {
      type: 'diagnostic_test_deleted',
      description: `Diagnostic test deleted: ${diagnostic.testType}`,
      performedBy: diagnostic.orderedBy,
      performedByName: diagnostic.orderedByName,
      metadata: {
        diagnosticId,
        testType: diagnostic.testType
      }
    });

    logger.info('Diagnostic test deleted successfully', { diagnosticId });
  } catch (error) {
    logger.error('Error deleting diagnostic test', { error, diagnosticId });
    throw error;
  }
};

// Get diagnostic statistics
export const getDiagnosticStats = async (institutionId) => {
  try {
    logger.info('Fetching diagnostic statistics', { institutionId });

    const diagnosticsQuery = query(
      collection(db, DIAGNOSTICS_COLLECTION),
      where('institutionId', '==', institutionId)
    );

    const snapshot = await getDocs(diagnosticsQuery);
    const diagnostics = snapshot.docs.map(doc => doc.data());

    const stats = {
      total: diagnostics.length,
      pending: diagnostics.filter(d => d.status === 'pending').length,
      completed: diagnostics.filter(d => d.status === 'completed').length,
      withDoctorNotes: diagnostics.filter(d => d.doctorNotes).length,
      thisWeek: diagnostics.filter(d => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d.createdAt?.toDate() > weekAgo;
      }).length
    };

    logger.info('Diagnostic statistics calculated', { institutionId, stats });
    return stats;
  } catch (error) {
    logger.error('Error fetching diagnostic statistics', { error, institutionId });
    throw error;
  }
};

// Log client activity (internal helper function)
// Activity logging is now handled by centralized clientActivitiesAPI

// Get client activity log
export const getClientActivities = async (clientId) => {
  try {
    logger.info('Fetching client activities', { clientId });

    const activitiesQuery = query(
      collection(db, CLIENT_ACTIVITIES_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(activitiesQuery);
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('Fetched client activities', { clientId, count: activities.length });
    return activities;
  } catch (error) {
    logger.error('Error fetching client activities', { error, clientId });
    throw error;
  }
};

// Subscribe to client activities
export const subscribeToClientActivities = (clientId, callback) => {
  logger.info('Subscribing to client activities', { clientId });

  const activitiesQuery = query(
    collection(db, CLIENT_ACTIVITIES_COLLECTION),
    where('clientId', '==', clientId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(activitiesQuery, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('Real-time activities update', { clientId, count: activities.length });
    callback(activities);
  }, (error) => {
    logger.error('Error in activities subscription', { error, clientId });
  });
};

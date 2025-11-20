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
import { db } from '../firebase/config';
import logger from '../utils/logger';
import { logClientActivity as logActivity } from './clientActivitiesAPI';
import { notificationsAPI } from './notificationsAPI';

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

    // Log activity to client database (comprehensive logging)
    try {
      // Try comprehensive logger first
      const ComprehensivePatientLogger = (await import('../utils/comprehensivePatientLogger')).default;
      await ComprehensivePatientLogger.logLabTestOrdered(
        diagnosticData.clientId,
        {
          diagnosticId: docRef.id,
          testType: diagnosticData.testType,
          testName: diagnosticData.testType,
          reason: diagnosticData.reason,
          urgency: diagnosticData.urgency,
          orderedBy: diagnosticData.orderedBy,
          orderedByName: diagnosticData.orderedByName
        },
        {
          id: diagnosticData.orderedBy,
          name: diagnosticData.orderedByName,
          role: 'doctor',
          userType: 'doctor',
          type: 'doctor',
          email: diagnosticData.orderedByEmail,
          medicalQualification: 'Physician',
          institutionId: diagnosticData.institutionId
        }
      );
    } catch (comprehensiveError) {
      // Fallback to old logger
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
        logger.error('Error logging diagnostic activity', { activityError, comprehensiveError });
        // Don't throw - diagnostic was created successfully
      }
    }
    
    // Send notification to admin
    try {
      await sendAdminNotification({
        type: 'diagnostic_test_ordered',
        title: 'New Diagnostic Test Ordered',
        message: `Dr. ${diagnosticData.orderedByName} ordered ${diagnosticData.testType} for ${diagnosticData.clientName}`,
        priority: diagnosticData.urgency === 'urgent' ? 'high' : 'medium',
        data: {
          clientId: diagnosticData.clientId,
          clientName: diagnosticData.clientName,
          diagnosticId: docRef.id,
          testType: diagnosticData.testType,
          orderedBy: diagnosticData.orderedBy,
          orderedByName: diagnosticData.orderedByName,
          urgency: diagnosticData.urgency,
          institutionId: diagnosticData.institutionId
        },
        institutionId: diagnosticData.institutionId
      });
    } catch (notificationError) {
      logger.error('Error sending admin notification', { notificationError });
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

    // Log activity to client database (comprehensive logging)
    try {
      // Try comprehensive logger first
      const ComprehensivePatientLogger = (await import('../utils/comprehensivePatientLogger')).default;
      const isAbnormal = resultsData.results?.abnormal || 
                        resultsData.results?.status === 'abnormal' ||
                        resultsData.results?.find(r => r.status === 'abnormal');
      
      await ComprehensivePatientLogger.logLabTestResults(
        diagnostic.clientId,
        {
          diagnosticId,
          testName: diagnostic.testType,
          testType: diagnostic.testType,
          results: resultsData.results,
          abnormal: isAbnormal,
          documentCount: resultsData.uploadedDocuments?.length || 0,
          uploadedBy: resultsData.uploadedBy,
          uploadedByName: resultsData.uploadedByName
        },
        {
          id: resultsData.uploadedBy,
          name: resultsData.uploadedByName,
          role: 'nurse',
          userType: 'nurse',
          type: 'nurse',
          email: resultsData.uploadedByEmail,
          medicalQualification: 'Laboratory Technician',
          institutionId: diagnostic.institutionId
        }
      );
    } catch (comprehensiveError) {
      // Fallback to old logger
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
        logger.error('Error logging results upload activity', { activityError, comprehensiveError });
        // Don't throw - results were uploaded successfully
      }
    }
    
    // Send notification to admin
    try {
      await sendAdminNotification({
        type: 'diagnostic_results_uploaded',
        title: 'Diagnostic Results Uploaded',
        message: `Nurse ${resultsData.uploadedByName} uploaded ${diagnostic.testType} results for ${diagnostic.clientName}`,
        priority: 'medium',
        data: {
          clientId: diagnostic.clientId,
          clientName: diagnostic.clientName,
          diagnosticId,
          testType: diagnostic.testType,
          uploadedBy: resultsData.uploadedBy,
          uploadedByName: resultsData.uploadedByName,
          documentCount: resultsData.uploadedDocuments?.length || 0,
          institutionId: diagnostic.institutionId
        },
        institutionId: diagnostic.institutionId
      });
    } catch (notificationError) {
      logger.error('Error sending admin notification', { notificationError });
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
    if (!institutionId) {
      logger.warn('No institutionId provided for getAllDiagnostics');
      return [];
    }

    logger.info('Fetching all diagnostics for institution', { institutionId });

    // Try query with orderBy first
    try {
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
    } catch (queryError) {
      // If query fails due to missing index, try without orderBy
      if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
        logger.warn('Composite index missing, fetching without orderBy', { institutionId });
        
        const diagnosticsQuery = query(
          collection(db, DIAGNOSTICS_COLLECTION),
          where('institutionId', '==', institutionId)
        );

        const snapshot = await getDocs(diagnosticsQuery);
        const diagnostics = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort client-side by createdAt
        diagnostics.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return bTime - aTime;
        });

        logger.info('Fetched all diagnostics (without index)', { institutionId, count: diagnostics.length });
        return diagnostics;
      }
      throw queryError;
    }
  } catch (error) {
    // Only log non-index errors to avoid console noise
    const isIndexError = error.code === 'failed-precondition' || error.message?.includes('index');
    if (!isIndexError) {
      logger.error('Error fetching all diagnostics', { error, institutionId });
    }
    // Return empty array instead of throwing to prevent breaking the dashboard
    return [];
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
    try {
      await logActivity({
        clientId: diagnostic.clientId,
        activityType: 'diagnostic',
        performedBy: diagnostic.orderedBy,
        performerName: diagnostic.orderedByName,
        performerRole: 'doctor',
        description: `Diagnostic test deleted: ${diagnostic.testType}`,
        details: {
          diagnosticId,
          testType: diagnostic.testType,
          action: 'deleted'
        },
        institutionId: diagnostic.institutionId
      });
    } catch (activityError) {
      logger.error('Error logging diagnostic deletion activity', { activityError });
      // Don't throw - deletion was successful
    }

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

// Helper function to send admin notifications
const sendAdminNotification = async (notificationData) => {
  try {
    // Get all admins for the institution
    const adminsQuery = query(
      collection(db, 'users'),
      where('userType', '==', 'admin'),
      where('institutionId', '==', notificationData.institutionId || null)
    );
    
    const adminsSnapshot = await getDocs(adminsQuery);
    
    // Send notification to each admin
    const notificationPromises = adminsSnapshot.docs.map(async (adminDoc) => {
      const adminId = adminDoc.id;
      const adminData = adminDoc.data();
      
      return await notificationsAPI.createNotification({
        userId: adminId,
        userEmail: adminData.email,
        userType: 'admin',
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'medium',
        data: notificationData.data || {},
        source: 'diagnostics_system'
      });
    });

    await Promise.all(notificationPromises);
    logger.info('Admin notifications sent', { count: adminsSnapshot.size });
  } catch (error) {
    logger.error('Error sending admin notifications', { error });
    // Don't throw error to avoid breaking the main operation
  }
};

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
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import logger from '../utils/logger';
import errorHandler from '../utils/errorHandler';
import { db } from '../backend/config';

const ASSIGNMENTS_COLLECTION = 'clientAssignments';
const ASSIGNMENT_REQUESTS_COLLECTION = 'assignmentRequests';

// Assignment Management API
export const assignmentAPI = {
  // Create new client-caregiver assignment
  createAssignment: async (assignmentData) => {
    try {
      // Ensure referenced client document exists; create a minimal placeholder if missing
      if (assignmentData.clientId) {
        const clientRef = doc(db, 'clients', assignmentData.clientId);
        const clientSnap = await getDoc(clientRef);
        if (!clientSnap.exists()) {
          await setDoc(clientRef, {
            name: assignmentData.clientName || 'Assigned Client',
            email: assignmentData.clientEmail || '',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
          logger.warn('Created placeholder client document for assignment', {
            clientId: assignmentData.clientId
          });
        }
      }

      const assignment = {
        ...assignmentData,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), assignment);
      
      logger.info('Client assignment created', { 
        assignmentId: docRef.id,
        clientId: assignmentData.clientId,
        caregiverId: assignmentData.caregiverId 
      });

      return {
        id: docRef.id,
        ...assignment
      };
    } catch (error) {
      logger.error('Error creating assignment', { error, assignmentData });
      errorHandler.handleError(error, { context: 'create_assignment' });
      throw error;
    }
  },

  // Get assignments by caregiver (no composite index required)
  getAssignmentsByCaregiver: async (caregiverId) => {
    try {
      // Keep the query minimal to avoid composite index requirements
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('caregiverId', '==', caregiverId)
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        const assignmentData = doc.data();
        assignments.push({
          id: doc.id,
          ...assignmentData,
          createdAt: assignmentData.createdAt?.toDate(),
          updatedAt: assignmentData.updatedAt?.toDate(),
          startDate: assignmentData.startDate?.toDate(),
          endDate: assignmentData.endDate?.toDate()
        });
      });

      // Filter and sort client-side
      // Include active, pending, and in_progress assignments (exclude completed and cancelled)
      return assignments
        .filter((a) => {
          const status = a.status ?? 'active';
          return status !== 'completed' && status !== 'cancelled' && status !== 'archived';
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.getTime?.() ?? 0;
          const bTime = b.createdAt?.getTime?.() ?? 0;
          return bTime - aTime;
        });
    } catch (error) {
      logger.error('Error fetching caregiver assignments', { error, caregiverId });
      throw error;
    }
  },

  // Get assignments by client (no composite index required)
  getAssignmentsByClient: async (clientId) => {
    try {
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('clientId', '==', clientId)
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        const assignmentData = doc.data();
        assignments.push({
          id: doc.id,
          ...assignmentData,
          createdAt: assignmentData.createdAt?.toDate(),
          updatedAt: assignmentData.updatedAt?.toDate(),
          startDate: assignmentData.startDate?.toDate(),
          endDate: assignmentData.endDate?.toDate()
        });
      });

      // Sort client-side by createdAt desc
      return assignments.sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() ?? 0;
        const bTime = b.createdAt?.getTime?.() ?? 0;
        return bTime - aTime;
      });
    } catch (error) {
      logger.error('Error fetching client assignments', { error, clientId });
      throw error;
    }
  },

  // Get all assignments (admin view)
  getAllAssignments: async () => {
    try {
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        const assignmentData = doc.data();
        assignments.push({
          id: doc.id,
          ...assignmentData,
          createdAt: assignmentData.createdAt?.toDate(),
          updatedAt: assignmentData.updatedAt?.toDate(),
          startDate: assignmentData.startDate?.toDate(),
          endDate: assignmentData.endDate?.toDate()
        });
      });

      return assignments;
    } catch (error) {
      logger.error('Error fetching all assignments', { error });
      throw error;
    }
  },

  // Get assignments by institution (institution admin view)
  getAssignmentsByInstitution: async (institutionId) => {
    try {
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('institutionId', '==', institutionId)
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        const assignmentData = doc.data();
        assignments.push({
          id: doc.id,
          ...assignmentData,
          createdAt: assignmentData.createdAt?.toDate(),
          updatedAt: assignmentData.updatedAt?.toDate(),
          startDate: assignmentData.startDate?.toDate(),
          endDate: assignmentData.endDate?.toDate()
        });
      });

      // Sort by createdAt desc on client side
      return assignments.sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() ?? 0;
        const bTime = b.createdAt?.getTime?.() ?? 0;
        return bTime - aTime;
      });
    } catch (error) {
      logger.error('Error fetching institution assignments', { error, institutionId });
      throw error;
    }
  },

  // Update assignment
  updateAssignment: async (assignmentId, updateData) => {
    try {
      const assignmentRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
      await updateDoc(assignmentRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      logger.info('Assignment updated', { assignmentId, updateData });
      return true;
    } catch (error) {
      logger.error('Error updating assignment', { error, assignmentId, updateData });
      throw error;
    }
  },

  // Delete assignment
  deleteAssignment: async (assignmentId) => {
    try {
      const assignmentRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
      await deleteDoc(assignmentRef);

      logger.info('Assignment deleted', { assignmentId });
      return true;
    } catch (error) {
      logger.error('Error deleting assignment', { error, assignmentId });
      throw error;
    }
  },

  // End assignment
  endAssignment: async (assignmentId, reason = '') => {
    try {
      const assignmentRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
      await updateDoc(assignmentRef, {
        status: 'completed',
        endDate: serverTimestamp(),
        endReason: reason,
        updatedAt: serverTimestamp()
      });

      logger.info('Assignment ended', { assignmentId, reason });
      return true;
    } catch (error) {
      logger.error('Error ending assignment', { error, assignmentId });
      throw error;
    }
  },

  // Assignment Request Management
  createAssignmentRequest: async (requestData) => {
    try {
      const request = {
        ...requestData,
        status: 'pending',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, ASSIGNMENT_REQUESTS_COLLECTION), request);
      
      logger.info('Assignment request created', { 
        requestId: docRef.id,
        caregiverId: requestData.caregiverId 
      });

      return {
        id: docRef.id,
        ...request
      };
    } catch (error) {
      logger.error('Error creating assignment request', { error, requestData });
      throw error;
    }
  },

  // Get pending assignment requests (admin view)
  getPendingRequests: async () => {
    try {
      const requestsQuery = query(
        collection(db, ASSIGNMENT_REQUESTS_COLLECTION),
        where('status', '==', 'pending'),
        orderBy('requestedAt', 'desc')
      );

      const querySnapshot = await getDocs(requestsQuery);
      const requests = [];

      querySnapshot.forEach((doc) => {
        const requestData = doc.data();
        requests.push({
          id: doc.id,
          ...requestData,
          requestedAt: requestData.requestedAt?.toDate(),
          createdAt: requestData.createdAt?.toDate()
        });
      });

      return requests;
    } catch (error) {
      logger.error('Error fetching assignment requests', { error });
      throw error;
    }
  },

  // Approve assignment request
  approveAssignmentRequest: async (requestId, assignmentData) => {
    try {
      // Create the actual assignment
      const assignment = await assignmentAPI.createAssignment(assignmentData);
      
      // Update request status
      const requestRef = doc(db, ASSIGNMENT_REQUESTS_COLLECTION, requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        assignmentId: assignment.id,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      logger.info('Assignment request approved', { requestId, assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      logger.error('Error approving assignment request', { error, requestId });
      throw error;
    }
  },

  // Reject assignment request
  rejectAssignmentRequest: async (requestId, reason = '') => {
    try {
      const requestRef = doc(db, ASSIGNMENT_REQUESTS_COLLECTION, requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      logger.info('Assignment request rejected', { requestId, reason });
      return true;
    } catch (error) {
      logger.error('Error rejecting assignment request', { error, requestId });
      throw error;
    }
  },

  // Get assignment statistics
  getAssignmentStats: async () => {
    try {
      const [allAssignments, activeAssignments, pendingRequests] = await Promise.all([
        getDocs(collection(db, ASSIGNMENTS_COLLECTION)),
        getDocs(query(collection(db, ASSIGNMENTS_COLLECTION), where('status', '==', 'active'))),
        getDocs(query(collection(db, ASSIGNMENT_REQUESTS_COLLECTION), where('status', '==', 'pending')))
      ]);

      return {
        totalAssignments: allAssignments.size,
        activeAssignments: activeAssignments.size,
        pendingRequests: pendingRequests.size,
        completedAssignments: allAssignments.size - activeAssignments.size
      };
    } catch (error) {
      logger.error('Error fetching assignment statistics', { error });
      throw error;
    }
  },

  // Subscribe to assignment changes (real-time)
  subscribeToAssignments: (callback, caregiverId = null) => {
    try {
      let assignmentsQuery;
      
      if (caregiverId) {
        assignmentsQuery = query(
          collection(db, ASSIGNMENTS_COLLECTION),
          where('caregiverId', '==', caregiverId),
          orderBy('createdAt', 'desc')
        );
      } else {
        assignmentsQuery = query(
          collection(db, ASSIGNMENTS_COLLECTION),
          orderBy('createdAt', 'desc')
        );
      }

      return onSnapshot(assignmentsQuery, (snapshot) => {
        const assignments = [];
        snapshot.forEach((doc) => {
          const assignmentData = doc.data();
          assignments.push({
            id: doc.id,
            ...assignmentData,
            createdAt: assignmentData.createdAt?.toDate(),
            updatedAt: assignmentData.updatedAt?.toDate(),
            startDate: assignmentData.startDate?.toDate(),
            endDate: assignmentData.endDate?.toDate()
          });
        });
        callback(assignments);
      });
    } catch (error) {
      logger.error('Error setting up assignment subscription', { error, caregiverId });
      throw error;
    }
  },

  // Real-time subscription for assignments by client
  subscribeToAssignmentsByClient: (clientId, callback) => {
    try {
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(assignmentsQuery, (snapshot) => {
        const assignments = [];
        snapshot.forEach((doc) => {
          const assignmentData = doc.data();
          assignments.push({
            id: doc.id,
            ...assignmentData,
            createdAt: assignmentData.createdAt?.toDate(),
            updatedAt: assignmentData.updatedAt?.toDate(),
            startDate: assignmentData.startDate?.toDate(),
            endDate: assignmentData.endDate?.toDate()
          });
        });
        callback(assignments);
      });
    } catch (error) {
      logger.error('Error setting up client assignment subscription', { error, clientId });
      throw error;
    }
  },

  // Get assigned clients for a caregiver/pharmacist
  getAssignedClients: async (caregiverId) => {
    try {
      logger.info('Fetching assigned clients', { caregiverId });
      console.log('🔍 assignmentAPI - Searching for assignments with caregiverId:', caregiverId);
      console.log('🔍 assignmentAPI - Collection:', ASSIGNMENTS_COLLECTION);

      // Query assignments for this caregiver
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );

      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      console.log('🔍 assignmentAPI - Found assignments:', assignmentsSnapshot.size);
      assignmentsSnapshot.forEach((doc) => {
        console.log('🔍 assignmentAPI - Assignment:', doc.id, doc.data());
      });
      
      if (assignmentsSnapshot.empty) {
        logger.info('No assignments found for caregiver', { caregiverId });
        console.log('⚠️ assignmentAPI - No assignments found for caregiverId:', caregiverId);
        return [];
      }

      // Get all unique client IDs
      const clientIds = new Set();
      assignmentsSnapshot.forEach((doc) => {
        const assignment = doc.data();
        if (assignment.clientId) {
          clientIds.add(assignment.clientId);
        }
      });

      // Fetch client details
      const clients = [];
      for (const clientId of clientIds) {
        try {
          const clientDoc = await getDoc(doc(db, 'clients', clientId));
          if (clientDoc.exists()) {
            clients.push({
              id: clientDoc.id,
              ...clientDoc.data()
            });
          }
        } catch (error) {
          logger.warn('Error fetching client details', { clientId, error });
        }
      }

      logger.info('Fetched assigned clients', { 
        caregiverId, 
        assignmentCount: assignmentsSnapshot.size,
        clientCount: clients.length 
      });

      return clients;
    } catch (error) {
      logger.error('Error fetching assigned clients', { error, caregiverId });
      throw error;
    }
  }
};

export default assignmentAPI;

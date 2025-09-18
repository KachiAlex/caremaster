import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import logger from '../utils/logger';
import errorHandler from '../utils/errorHandler';

const ASSIGNMENTS_COLLECTION = 'patientAssignments';
const ASSIGNMENT_REQUESTS_COLLECTION = 'assignmentRequests';

// Assignment Management API
export const assignmentAPI = {
  // Create new patient-caregiver assignment
  createAssignment: async (assignmentData) => {
    try {
      const assignment = {
        ...assignmentData,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), assignment);
      
      logger.info('Patient assignment created', { 
        assignmentId: docRef.id,
        patientId: assignmentData.patientId,
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

  // Get assignments by caregiver
  getAssignmentsByCaregiver: async (caregiverId) => {
    try {
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active'),
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
      logger.error('Error fetching caregiver assignments', { error, caregiverId });
      throw error;
    }
  },

  // Get assignments by patient
  getAssignmentsByPatient: async (patientId) => {
    try {
      const assignmentsQuery = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('patientId', '==', patientId),
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
      logger.error('Error fetching patient assignments', { error, patientId });
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
  }
};

export default assignmentAPI;

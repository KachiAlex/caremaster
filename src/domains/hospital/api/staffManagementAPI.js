/**
 * Staff Management API
 * --------------------
 * Handles operations around staff directory, shifts, and scheduling.
 */

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
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'backend/database';
import { db } from '../../../backend/config';

const USERS_COLLECTION = 'users';
const HOSPITAL_SHIFTS_COLLECTION = 'hospitalShifts';
const HOSPITAL_INCIDENTS_COLLECTION = 'hospitalIncidents';

export const staffManagementAPI = {
  /**
   * Get staff roster for a hospital with optional filters.
   * @param {string} hospitalId - Institution ID
   * @param {Object} filters - { department, role, status, searchTerm }
   * @returns {Promise<Object>}
   */
  async getStaffRoster(hospitalId, filters = {}) {
    try {
      const usersRef = collection(db, USERS_COLLECTION);
      let q = query(
        usersRef,
        where('institutionId', '==', hospitalId)
      );

      // Apply status filter if provided
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      } else {
        // Default to active staff
        q = query(q, where('status', '==', 'active'));
      }

      // Apply role filter if provided
      if (filters.role || filters.userType) {
        const roleFilter = filters.role || filters.userType;
        q = query(q, where('userType', '==', roleFilter));
      }

      const querySnapshot = await getDocs(q);
      let staff = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        staff.push({
          id: doc.id,
          uid: doc.id,
          ...userData,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
          lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        });
      });

      // Apply client-side filters
      if (filters.department) {
        staff = staff.filter(s => 
          s.department === filters.department || 
          s.specialization?.includes(filters.department)
        );
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        staff = staff.filter(s =>
          s.name?.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower) ||
          s.displayName?.toLowerCase().includes(searchLower) ||
          s.medicalQualification?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by name
      staff.sort((a, b) => {
        const nameA = (a.name || a.displayName || '').toLowerCase();
        const nameB = (b.name || b.displayName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      return {
        hospitalId,
        filters,
        staff,
        total: staff.length,
      };
    } catch (error) {
      console.error('Error fetching staff roster:', error);
      throw error;
    }
  },

  /**
   * Get shift calendar for a hospital.
   * @param {string} hospitalId
   * @param {Object} params - { startDate, endDate, staffId, department }
   * @returns {Promise<Object>}
   */
  async getShiftCalendar(hospitalId, params = {}) {
    try {
      const shiftsRef = collection(db, HOSPITAL_SHIFTS_COLLECTION);
      let q = query(
        shiftsRef,
        where('institutionId', '==', hospitalId),
        orderBy('startTime', 'asc')
      );

      // Apply date range filter if provided
      if (params.startDate) {
        const startTimestamp = Timestamp.fromDate(
          params.startDate instanceof Date ? params.startDate : new Date(params.startDate)
        );
        q = query(q, where('startTime', '>=', startTimestamp));
      }

      if (params.endDate) {
        const endTimestamp = Timestamp.fromDate(
          params.endDate instanceof Date ? params.endDate : new Date(params.endDate)
        );
        q = query(q, where('startTime', '<=', endTimestamp));
      }

      // Apply staff filter if provided
      if (params.staffId) {
        q = query(q, where('staffId', '==', params.staffId));
      }

      // Apply department filter if provided
      if (params.department) {
        q = query(q, where('department', '==', params.department));
      }

      const querySnapshot = await getDocs(q);
      const shifts = [];
      
      querySnapshot.forEach((doc) => {
        const shiftData = doc.data();
        shifts.push({
          id: doc.id,
          ...shiftData,
          startTime: shiftData.startTime?.toDate?.() || shiftData.startTime,
          endTime: shiftData.endTime?.toDate?.() || shiftData.endTime,
          createdAt: shiftData.createdAt?.toDate?.() || shiftData.createdAt,
          updatedAt: shiftData.updatedAt?.toDate?.() || shiftData.updatedAt,
        });
      });

      return {
        hospitalId,
        params,
        shifts,
        total: shifts.length,
      };
    } catch (error) {
      console.error('Error fetching shift calendar:', error);
      throw error;
    }
  },

  /**
   * Assign a shift to a staff member.
   * @param {Object} payload - { institutionId, staffId, staffName, startTime, endTime, department, role, notes }
   * @returns {Promise<Object>}
   */
  async assignShift(payload) {
    try {
      const shiftsRef = collection(db, HOSPITAL_SHIFTS_COLLECTION);
      const newShift = {
        ...payload,
        status: payload.status || 'scheduled',
        startTime: payload.startTime instanceof Date 
          ? Timestamp.fromDate(payload.startTime)
          : Timestamp.fromDate(new Date(payload.startTime)),
        endTime: payload.endTime instanceof Date
          ? Timestamp.fromDate(payload.endTime)
          : Timestamp.fromDate(new Date(payload.endTime)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(shiftsRef, newShift);
      return {
        success: true,
        id: docRef.id,
        ...newShift,
      };
    } catch (error) {
      console.error('Error assigning shift:', error);
      throw error;
    }
  },

  /**
   * Update a shift.
   * @param {string} shiftId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateShift(shiftId, updateData) {
    try {
      const shiftRef = doc(db, HOSPITAL_SHIFTS_COLLECTION, shiftId);
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp(),
      };

      // Convert date strings to Timestamps if needed
      if (updateData.startTime) {
        updatePayload.startTime = updateData.startTime instanceof Date
          ? Timestamp.fromDate(updateData.startTime)
          : Timestamp.fromDate(new Date(updateData.startTime));
      }

      if (updateData.endTime) {
        updatePayload.endTime = updateData.endTime instanceof Date
          ? Timestamp.fromDate(updateData.endTime)
          : Timestamp.fromDate(new Date(updateData.endTime));
      }

      await updateDoc(shiftRef, updatePayload);
      return { success: true, shiftId };
    } catch (error) {
      console.error('Error updating shift:', error);
      throw error;
    }
  },

  /**
   * Delete a shift.
   * @param {string} shiftId
   * @returns {Promise<Object>}
   */
  async deleteShift(shiftId) {
    try {
      const shiftRef = doc(db, HOSPITAL_SHIFTS_COLLECTION, shiftId);
      await deleteDoc(shiftRef);
      return { success: true, shiftId };
    } catch (error) {
      console.error('Error deleting shift:', error);
      throw error;
    }
  },

  /**
   * Record an incident (delegates to hospitalOperationsAPI but kept here for convenience).
   * @param {Object} payload - { institutionId, reportedBy, type, severity, description, location, department }
   * @returns {Promise<Object>}
   */
  async recordIncident(payload) {
    try {
      const incidentsRef = collection(db, HOSPITAL_INCIDENTS_COLLECTION);
      const newIncident = {
        ...payload,
        status: 'open',
        reportedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(incidentsRef, newIncident);
      return {
        success: true,
        id: docRef.id,
        ...newIncident,
      };
    } catch (error) {
      console.error('Error recording incident:', error);
      throw error;
    }
  },

  /**
   * Get staff member details.
   * @param {string} staffId
   * @returns {Promise<Object>}
   */
  async getStaffMember(staffId) {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, staffId));
      if (!userDoc.exists()) {
        throw new Error('Staff member not found');
      }

      const userData = userDoc.data();
      return {
        id: userDoc.id,
        uid: userDoc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
      };
    } catch (error) {
      console.error('Error fetching staff member:', error);
      throw error;
    }
  },

  /**
   * Update staff member information.
   * @param {string} staffId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateStaffMember(staffId, updateData) {
    try {
      const userRef = doc(db, USERS_COLLECTION, staffId);
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updatePayload);
      return { success: true, staffId };
    } catch (error) {
      console.error('Error updating staff member:', error);
      throw error;
    }
  },

  /**
   * Subscribe to shift calendar changes in real-time
   * @param {string} hospitalId
   * @param {Object} params
   * @param {Function} callback - Called with shift calendar data
   * @returns {Function} Unsubscribe function
   */
  subscribeToShiftCalendar(hospitalId, params = {}, callback) {
    try {
      const shiftsRef = collection(db, HOSPITAL_SHIFTS_COLLECTION);
      let q = query(
        shiftsRef,
        where('institutionId', '==', hospitalId),
        orderBy('startTime', 'asc')
      );

      // Apply date range filter if provided
      if (params.startDate) {
        const startTimestamp = Timestamp.fromDate(
          params.startDate instanceof Date ? params.startDate : new Date(params.startDate)
        );
        q = query(q, where('startTime', '>=', startTimestamp));
      }

      if (params.endDate) {
        const endTimestamp = Timestamp.fromDate(
          params.endDate instanceof Date ? params.endDate : new Date(params.endDate)
        );
        q = query(q, where('startTime', '<=', endTimestamp));
      }

      // Apply staff filter if provided
      if (params.staffId) {
        q = query(q, where('staffId', '==', params.staffId));
      }

      // Apply department filter if provided
      if (params.department) {
        q = query(q, where('department', '==', params.department));
      }

      return onSnapshot(
        q,
        (querySnapshot) => {
          const shifts = [];
          querySnapshot.forEach((doc) => {
            const shiftData = doc.data();
            shifts.push({
              id: doc.id,
              ...shiftData,
              startTime: shiftData.startTime?.toDate?.() || shiftData.startTime,
              endTime: shiftData.endTime?.toDate?.() || shiftData.endTime,
              createdAt: shiftData.createdAt?.toDate?.() || shiftData.createdAt,
              updatedAt: shiftData.updatedAt?.toDate?.() || shiftData.updatedAt,
            });
          });

          callback({
            hospitalId,
            params,
            shifts,
            total: shifts.length,
          });
        },
        (error) => {
          console.error('Error in shift calendar subscription:', error);
          callback({ hospitalId, params, shifts: [], total: 0, error: error.message });
        }
      );
    } catch (error) {
      console.error('Error setting up shift calendar subscription:', error);
      throw error;
    }
  },
};

export default staffManagementAPI;


/**
 * Hospital Operations API
 * -----------------------
 * Handles hospital operations data access via Firestore.
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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

const HOSPITAL_BEDS_COLLECTION = 'hospitalBeds';
const HOSPITAL_INCIDENTS_COLLECTION = 'hospitalIncidents';
const INSTITUTIONS_COLLECTION = 'institutions';
const USERS_COLLECTION = 'users';

export const hospitalOperationsAPI = {
  /**
   * Fetch all hospitals (institutions) visible to the current user.
   * For super-admin: returns all institutions
   * For institution admin: returns their institution
   * @param {string} [institutionId] - Optional institution ID to filter
   * @returns {Promise<Array>} list of hospitals/institutions
   */
  async getHospitals(institutionId = null) {
    try {
      const institutionsRef = collection(db, INSTITUTIONS_COLLECTION);
      let q;

      if (institutionId) {
        // Get specific institution
        const institutionDoc = await getDoc(doc(db, INSTITUTIONS_COLLECTION, institutionId));
        if (institutionDoc.exists()) {
          return [{
            id: institutionDoc.id,
            ...institutionDoc.data(),
          }];
        }
        return [];
      } else {
        // Get all active institutions
        q = query(
          institutionsRef,
          where('active', '==', true),
          orderBy('name', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      const hospitals = [];
      querySnapshot.forEach((doc) => {
        hospitals.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return hospitals;
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      throw error;
    }
  },

  /**
   * Fetch KPI snapshot for a hospital (beds, incidents, census).
   * @param {string} hospitalId - Institution ID
   * @param {Object} [dateRange] - Optional date range { start, end }
   * @returns {Promise<Object>}
   */
  async getHospitalSummary(hospitalId, dateRange = null) {
    try {
      // Get bed statistics
      const bedsRef = collection(db, HOSPITAL_BEDS_COLLECTION);
      const bedsQuery = query(
        bedsRef,
        where('institutionId', '==', hospitalId)
      );
      const bedsSnapshot = await getDocs(bedsQuery);

      let bedCapacity = 0;
      let occupiedBeds = 0;
      const beds = [];
      bedsSnapshot.forEach((doc) => {
        const bedData = doc.data();
        beds.push({ id: doc.id, ...bedData });
        bedCapacity++;
        if (bedData.status === 'occupied' || bedData.status === 'reserved') {
          occupiedBeds++;
        }
      });

      // Get incident statistics
      const incidentsRef = collection(db, HOSPITAL_INCIDENTS_COLLECTION);
      let incidentsQuery = query(
        incidentsRef,
        where('institutionId', '==', hospitalId),
        where('status', '==', 'open'),
        orderBy('reportedAt', 'desc')
      );

      if (dateRange?.start) {
        incidentsQuery = query(
          incidentsRef,
          where('institutionId', '==', hospitalId),
          where('status', '==', 'open'),
          where('reportedAt', '>=', Timestamp.fromDate(dateRange.start)),
          where('reportedAt', '<=', Timestamp.fromDate(dateRange.end || new Date())),
          orderBy('reportedAt', 'desc')
        );
      }

      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidentsOpen = incidentsSnapshot.size;

      // Get staff on duty (users with active status in this institution)
      const usersRef = collection(db, USERS_COLLECTION);
      const staffQuery = query(
        usersRef,
        where('institutionId', '==', hospitalId),
        where('status', '==', 'active')
      );
      const staffSnapshot = await getDocs(staffQuery);
      const staffOnDuty = staffSnapshot.size;

      // Get patient census
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(
        patientsRef,
        where('institutionId', '==', hospitalId),
        where('status', '==', 'active')
      );
      const patientsSnapshot = await getDocs(patientsQuery);
      const patientCensus = patientsSnapshot.size;

      return {
        hospitalId,
        bedCapacity,
        occupiedBeds,
        availableBeds: bedCapacity - occupiedBeds,
        occupancyRate: bedCapacity > 0 ? (occupiedBeds / bedCapacity * 100).toFixed(1) : 0,
        incidentsOpen,
        staffOnDuty,
        patientCensus,
        beds,
      };
    } catch (error) {
      console.error('Error fetching hospital summary:', error);
      throw error;
    }
  },

  /**
   * Fetch bed status list with optional filters.
   * @param {string} hospitalId
   * @param {Object} filters - { department, status, floor, unit }
   */
  async getBedStatus(hospitalId, filters = {}) {
    try {
      const bedsRef = collection(db, HOSPITAL_BEDS_COLLECTION);
      let q = query(
        bedsRef,
        where('institutionId', '==', hospitalId),
        orderBy('bedNumber', 'asc')
      );

      // Apply filters if provided
      if (filters.department) {
        q = query(q, where('department', '==', filters.department));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.floor) {
        q = query(q, where('floor', '==', filters.floor));
      }
      if (filters.unit) {
        q = query(q, where('unit', '==', filters.unit));
      }

      const querySnapshot = await getDocs(q);
      const beds = [];
      querySnapshot.forEach((doc) => {
        const bedData = doc.data();
        beds.push({
          id: doc.id,
          ...bedData,
          lastUpdated: bedData.lastUpdated?.toDate?.() || bedData.lastUpdated,
          occupiedAt: bedData.occupiedAt?.toDate?.() || bedData.occupiedAt,
        });
      });

      return {
        hospitalId,
        filters,
        beds,
        total: beds.length,
      };
    } catch (error) {
      console.error('Error fetching bed status:', error);
      throw error;
    }
  },

  /**
   * Update bed status (occupy, vacate, reserve, etc.)
   * @param {string} bedId
   * @param {Object} updateData - { status, patientId, patientName, notes }
   */
  async updateBedStatus(bedId, updateData) {
    try {
      const bedRef = doc(db, HOSPITAL_BEDS_COLLECTION, bedId);
      const updatePayload = {
        ...updateData,
        lastUpdated: serverTimestamp(),
      };

      if (updateData.status === 'occupied') {
        updatePayload.occupiedAt = serverTimestamp();
      } else if (updateData.status === 'available') {
        updatePayload.vacatedAt = serverTimestamp();
        updatePayload.patientId = null;
        updatePayload.patientName = null;
      }

      await updateDoc(bedRef, updatePayload);
      return { success: true, bedId };
    } catch (error) {
      console.error('Error updating bed status:', error);
      throw error;
    }
  },

  /**
   * Create a new bed record
   * @param {Object} bedData
   */
  async createBed(bedData) {
    try {
      const bedsRef = collection(db, HOSPITAL_BEDS_COLLECTION);
      const newBed = {
        ...bedData,
        status: bedData.status || 'available',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };
      const docRef = await addDoc(bedsRef, newBed);
      return { id: docRef.id, ...newBed };
    } catch (error) {
      console.error('Error creating bed:', error);
      throw error;
    }
  },

  /**
   * Fetch recent incidents for timeline feed.
   * @param {string} hospitalId
   * @param {Object} params - { limit, status, severity, startDate, endDate }
   */
  async getIncidentFeed(hospitalId, params = {}) {
    try {
      const incidentsRef = collection(db, HOSPITAL_INCIDENTS_COLLECTION);
      const limitCount = params.limit || 50;
      let q = query(
        incidentsRef,
        where('institutionId', '==', hospitalId),
        orderBy('reportedAt', 'desc'),
        limit(limitCount)
      );

      if (params.status) {
        q = query(
          incidentsRef,
          where('institutionId', '==', hospitalId),
          where('status', '==', params.status),
          orderBy('reportedAt', 'desc'),
          limit(limitCount)
        );
      }

      if (params.severity) {
        q = query(
          incidentsRef,
          where('institutionId', '==', hospitalId),
          where('severity', '==', params.severity),
          orderBy('reportedAt', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      const incidents = [];
      querySnapshot.forEach((doc) => {
        const incidentData = doc.data();
        incidents.push({
          id: doc.id,
          ...incidentData,
          reportedAt: incidentData.reportedAt?.toDate?.() || incidentData.reportedAt,
          resolvedAt: incidentData.resolvedAt?.toDate?.() || incidentData.resolvedAt,
          createdAt: incidentData.createdAt?.toDate?.() || incidentData.createdAt,
        });
      });

      return {
        hospitalId,
        params,
        incidents,
        total: incidents.length,
      };
    } catch (error) {
      console.error('Error fetching incident feed:', error);
      throw error;
    }
  },

  /**
   * Create a new incident
   * @param {Object} incidentData
   */
  async createIncident(incidentData) {
    try {
      const incidentsRef = collection(db, HOSPITAL_INCIDENTS_COLLECTION);
      const newIncident = {
        ...incidentData,
        status: incidentData.status || 'open',
        reportedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(incidentsRef, newIncident);
      return { id: docRef.id, ...newIncident };
    } catch (error) {
      console.error('Error creating incident:', error);
      throw error;
    }
  },

  /**
   * Update incident status
   * @param {string} incidentId
   * @param {Object} updateData
   */
  async updateIncident(incidentId, updateData) {
    try {
      const incidentRef = doc(db, HOSPITAL_INCIDENTS_COLLECTION, incidentId);
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp(),
      };

      if (updateData.status === 'resolved' || updateData.status === 'closed') {
        updatePayload.resolvedAt = serverTimestamp();
      }

      await updateDoc(incidentRef, updatePayload);
      return { success: true, incidentId };
    } catch (error) {
      console.error('Error updating incident:', error);
      throw error;
    }
  },

  /**
   * Subscribe to bed status changes in real-time
   * @param {string} hospitalId
   * @param {Object} filters
   * @param {Function} callback - Called with bed status data
   * @returns {Function} Unsubscribe function
   */
  subscribeToBedStatus(hospitalId, filters = {}, callback) {
    try {
      const bedsRef = collection(db, HOSPITAL_BEDS_COLLECTION);
      let q = query(
        bedsRef,
        where('institutionId', '==', hospitalId),
        orderBy('bedNumber', 'asc')
      );

      // Apply filters if provided
      if (filters.department) {
        q = query(q, where('department', '==', filters.department));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.floor) {
        q = query(q, where('floor', '==', filters.floor));
      }
      if (filters.unit) {
        q = query(q, where('unit', '==', filters.unit));
      }

      return onSnapshot(
        q,
        (querySnapshot) => {
          const beds = [];
          querySnapshot.forEach((doc) => {
            const bedData = doc.data();
            beds.push({
              id: doc.id,
              ...bedData,
              lastUpdated: bedData.lastUpdated?.toDate?.() || bedData.lastUpdated,
              occupiedAt: bedData.occupiedAt?.toDate?.() || bedData.occupiedAt,
            });
          });

          callback({
            hospitalId,
            filters,
            beds,
            total: beds.length,
          });
        },
        (error) => {
          console.error('Error in bed status subscription:', error);
          callback({ hospitalId, filters, beds: [], total: 0, error: error.message });
        }
      );
    } catch (error) {
      console.error('Error setting up bed status subscription:', error);
      throw error;
    }
  },

  /**
   * Subscribe to incident feed changes in real-time
   * @param {string} hospitalId
   * @param {Object} params
   * @param {Function} callback - Called with incident feed data
   * @returns {Function} Unsubscribe function
   */
  subscribeToIncidentFeed(hospitalId, params = {}, callback) {
    try {
      const incidentsRef = collection(db, HOSPITAL_INCIDENTS_COLLECTION);
      const limitCount = params.limit || 50;
      let q = query(
        incidentsRef,
        where('institutionId', '==', hospitalId),
        orderBy('reportedAt', 'desc'),
        limit(limitCount)
      );

      if (params.status && params.status !== 'all') {
        q = query(
          incidentsRef,
          where('institutionId', '==', hospitalId),
          where('status', '==', params.status),
          orderBy('reportedAt', 'desc'),
          limit(limitCount)
        );
      }

      if (params.severity) {
        q = query(
          incidentsRef,
          where('institutionId', '==', hospitalId),
          where('severity', '==', params.severity),
          orderBy('reportedAt', 'desc'),
          limit(limitCount)
        );
      }

      return onSnapshot(
        q,
        (querySnapshot) => {
          const incidents = [];
          querySnapshot.forEach((doc) => {
            const incidentData = doc.data();
            incidents.push({
              id: doc.id,
              ...incidentData,
              reportedAt: incidentData.reportedAt?.toDate?.() || incidentData.reportedAt,
              resolvedAt: incidentData.resolvedAt?.toDate?.() || incidentData.resolvedAt,
              createdAt: incidentData.createdAt?.toDate?.() || incidentData.createdAt,
            });
          });

          callback({
            hospitalId,
            params,
            incidents,
            total: incidents.length,
          });
        },
        (error) => {
          console.error('Error in incident feed subscription:', error);
          callback({ hospitalId, params, incidents: [], total: 0, error: error.message });
        }
      );
    } catch (error) {
      console.error('Error setting up incident feed subscription:', error);
      throw error;
    }
  },
};

export default hospitalOperationsAPI;


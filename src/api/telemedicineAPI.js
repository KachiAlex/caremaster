import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Collection names
const COLLECTIONS = {
  APPOINTMENTS: 'telemedicine_appointments',
  CALLS: 'telemedicine_calls',
  RECORDINGS: 'telemedicine_recordings',
  DOCTORS: 'doctors',
  PATIENTS: 'patients'
};

class TelemedicineAPI {
  // ===== APPOINTMENTS =====
  
  // Create a new appointment
  async createAppointment(appointmentData) {
    try {
      const appointment = {
        ...appointmentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'scheduled'
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.APPOINTMENTS), appointment);
      return { id: docRef.id, ...appointment };
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  // Get appointments for a user
  async getAppointments(userId, userType = 'patient') {
    try {
      const field = userType === 'patient' ? 'patientId' : 'doctorId';
      const q = query(
        collection(db, COLLECTIONS.APPOINTMENTS),
        where(field, '==', userId),
        orderBy('appointmentDate', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const appointments = [];
      
      querySnapshot.forEach((doc) => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return appointments;
    } catch (error) {
      console.error('Error getting appointments:', error);
      throw error;
    }
  }

  // Get upcoming appointments
  async getUpcomingAppointments(userId, userType = 'patient') {
    try {
      const now = new Date();
      const field = userType === 'patient' ? 'patientId' : 'doctorId';
      
      const q = query(
        collection(db, COLLECTIONS.APPOINTMENTS),
        where(field, '==', userId),
        where('appointmentDate', '>=', Timestamp.fromDate(now)),
        where('status', '==', 'scheduled'),
        orderBy('appointmentDate', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const appointments = [];
      
      querySnapshot.forEach((doc) => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return appointments;
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      throw error;
    }
  }

  // Update appointment status
  async updateAppointmentStatus(appointmentId, status, additionalData = {}) {
    try {
      const appointmentRef = doc(db, COLLECTIONS.APPOINTMENTS, appointmentId);
      await updateDoc(appointmentRef, {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      });
      
      return true;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  // ===== CALLS =====
  
  // Start a call session
  async startCall(appointmentId, callData) {
    try {
      const call = {
        appointmentId,
        ...callData,
        startTime: serverTimestamp(),
        status: 'active',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.CALLS), call);
      
      // Update appointment status
      await this.updateAppointmentStatus(appointmentId, 'in-progress', {
        callId: docRef.id
      });
      
      return { id: docRef.id, ...call };
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  // End a call session
  async endCall(callId, callData = {}) {
    try {
      const callRef = doc(db, COLLECTIONS.CALLS, callId);
      await updateDoc(callRef, {
        endTime: serverTimestamp(),
        status: 'completed',
        updatedAt: serverTimestamp(),
        ...callData
      });
      
      // Get the call to find the appointment ID
      const callDoc = await getDoc(callRef);
      if (callDoc.exists()) {
        const callData = callDoc.data();
        // Update appointment status
        await this.updateAppointmentStatus(callData.appointmentId, 'completed');
      }
      
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  // Get call history
  async getCallHistory(userId, userType = 'patient') {
    try {
      const field = userType === 'patient' ? 'patientId' : 'doctorId';
      const q = query(
        collection(db, COLLECTIONS.CALLS),
        where(field, '==', userId),
        orderBy('startTime', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const calls = [];
      
      querySnapshot.forEach((doc) => {
        calls.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return calls;
    } catch (error) {
      console.error('Error getting call history:', error);
      throw error;
    }
  }

  // ===== RECORDINGS =====
  
  // Save recording information
  async saveRecording(callId, recordingData) {
    try {
      const recording = {
        callId,
        ...recordingData,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.RECORDINGS), recording);
      
      // Update call with recording info
      const callRef = doc(db, COLLECTIONS.CALLS, callId);
      await updateDoc(callRef, {
        recordingId: docRef.id,
        hasRecording: true,
        updatedAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...recording };
    } catch (error) {
      console.error('Error saving recording:', error);
      throw error;
    }
  }

  // Get recordings for a call
  async getCallRecordings(callId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.RECORDINGS),
        where('callId', '==', callId)
      );
      
      const querySnapshot = await getDocs(q);
      const recordings = [];
      
      querySnapshot.forEach((doc) => {
        recordings.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return recordings;
    } catch (error) {
      console.error('Error getting call recordings:', error);
      throw error;
    }
  }

  // ===== DOCTORS =====
  
  // Get available doctors
  async getAvailableDoctors(specialty = null) {
    try {
      let q = query(
        collection(db, COLLECTIONS.DOCTORS),
        where('isActive', '==', true)
      );
      
      if (specialty) {
        q = query(q, where('specialty', '==', specialty));
      }
      
      const querySnapshot = await getDocs(q);
      const doctors = [];
      
      querySnapshot.forEach((doc) => {
        doctors.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return doctors;
    } catch (error) {
      console.error('Error getting available doctors:', error);
      throw error;
    }
  }

  // Get doctor by ID
  async getDoctor(doctorId) {
    try {
      const doctorRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      const doctorDoc = await getDoc(doctorRef);
      
      if (doctorDoc.exists()) {
        return { id: doctorDoc.id, ...doctorDoc.data() };
      } else {
        throw new Error('Doctor not found');
      }
    } catch (error) {
      console.error('Error getting doctor:', error);
      throw error;
    }
  }

  // ===== REAL-TIME LISTENERS =====
  
  // Listen to appointment updates
  subscribeToAppointments(userId, userType, callback) {
    const field = userType === 'patient' ? 'patientId' : 'doctorId';
    const q = query(
      collection(db, COLLECTIONS.APPOINTMENTS),
      where(field, '==', userId),
      orderBy('appointmentDate', 'asc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const appointments = [];
      querySnapshot.forEach((doc) => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(appointments);
    });
  }

  // Listen to call updates
  subscribeToCalls(userId, userType, callback) {
    const field = userType === 'patient' ? 'patientId' : 'doctorId';
    const q = query(
      collection(db, COLLECTIONS.CALLS),
      where(field, '==', userId),
      orderBy('startTime', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const calls = [];
      querySnapshot.forEach((doc) => {
        calls.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(calls);
    });
  }

  // ===== UTILITY METHODS =====
  
  // Convert Firestore timestamp to JavaScript Date
  convertTimestamp(timestamp) {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
    }
    return timestamp;
  }

  // Format appointment data for display
  formatAppointmentForDisplay(appointment) {
    return {
      ...appointment,
      appointmentDate: this.convertTimestamp(appointment.appointmentDate),
      createdAt: this.convertTimestamp(appointment.createdAt),
      updatedAt: this.convertTimestamp(appointment.updatedAt)
    };
  }

  // Format call data for display
  formatCallForDisplay(call) {
    return {
      ...call,
      startTime: this.convertTimestamp(call.startTime),
      endTime: this.convertTimestamp(call.endTime),
      createdAt: this.convertTimestamp(call.createdAt),
      updatedAt: this.convertTimestamp(call.updatedAt)
    };
  }
}

// Create and export singleton instance
const telemedicineAPI = new TelemedicineAPI();
export default telemedicineAPI;

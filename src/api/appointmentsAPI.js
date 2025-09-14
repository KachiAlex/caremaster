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

const APPOINTMENTS_COLLECTION = 'appointments';

// Get all appointments
export const getAllAppointments = async () => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    const q = query(appointmentsRef, orderBy('scheduledTime', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

// Get appointment by ID
export const getAppointmentById = async (appointmentId) => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (appointmentSnap.exists()) {
      const appointmentData = appointmentSnap.data();
      return {
        id: appointmentSnap.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      };
    } else {
      throw new Error('Appointment not found');
    }
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw error;
  }
};

// Get appointments for a patient
export const getAppointmentsByPatient = async (patientId) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    const q = query(
      appointmentsRef, 
      where('patientId', '==', patientId),
      orderBy('scheduledTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    throw error;
  }
};

// Get appointments for a doctor
export const getAppointmentsByDoctor = async (doctorId) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    const q = query(
      appointmentsRef, 
      where('doctorId', '==', doctorId),
      orderBy('scheduledTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    throw error;
  }
};

// Get appointments for a caregiver
export const getAppointmentsByCaregiver = async (caregiverId) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    const q = query(
      appointmentsRef, 
      where('caregiverId', '==', caregiverId),
      orderBy('scheduledTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching caregiver appointments:', error);
    throw error;
  }
};

// Create new appointment
export const createAppointment = async (appointmentData) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    const newAppointment = {
      ...appointmentData,
      status: 'scheduled',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(appointmentsRef, newAppointment);
    return docRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// Update appointment
export const updateAppointment = async (appointmentId, updateData) => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(appointmentRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

// Cancel appointment
export const cancelAppointment = async (appointmentId, reason) => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
};

// Complete appointment
export const completeAppointment = async (appointmentId, notes) => {
  try {
    const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentRef, {
      status: 'completed',
      completionNotes: notes,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error completing appointment:', error);
    throw error;
  }
};

// Get today's appointments
export const getTodaysAppointments = async (userId, userRole) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    let q;

    if (userRole === 'doctor') {
      q = query(
        appointmentsRef,
        where('doctorId', '==', userId),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('scheduledTime', '<', Timestamp.fromDate(tomorrow)),
        orderBy('scheduledTime', 'asc')
      );
    } else if (userRole === 'caregiver') {
      q = query(
        appointmentsRef,
        where('caregiverId', '==', userId),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('scheduledTime', '<', Timestamp.fromDate(tomorrow)),
        orderBy('scheduledTime', 'asc')
      );
    } else if (userRole === 'elderly') {
      q = query(
        appointmentsRef,
        where('patientId', '==', userId),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('scheduledTime', '<', Timestamp.fromDate(tomorrow)),
        orderBy('scheduledTime', 'asc')
      );
    } else {
      throw new Error('Invalid user role');
    }

    const querySnapshot = await getDocs(q);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    throw error;
  }
};

// Get upcoming appointments (next 7 days)
export const getUpcomingAppointments = async (userId, userRole) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    let q;

    if (userRole === 'doctor') {
      q = query(
        appointmentsRef,
        where('doctorId', '==', userId),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('scheduledTime', '<=', Timestamp.fromDate(nextWeek)),
        orderBy('scheduledTime', 'asc')
      );
    } else if (userRole === 'caregiver') {
      q = query(
        appointmentsRef,
        where('caregiverId', '==', userId),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('scheduledTime', '<=', Timestamp.fromDate(nextWeek)),
        orderBy('scheduledTime', 'asc')
      );
    } else if (userRole === 'elderly') {
      q = query(
        appointmentsRef,
        where('patientId', '==', userId),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('scheduledTime', '<=', Timestamp.fromDate(nextWeek)),
        orderBy('scheduledTime', 'asc')
      );
    } else {
      throw new Error('Invalid user role');
    }

    const querySnapshot = await getDocs(q);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    throw error;
  }
};

// Get appointment statistics
export const getAppointmentStats = async () => {
  try {
    const appointments = await getAllAppointments();
    
    const stats = {
      total: appointments.length,
      scheduled: appointments.filter(apt => apt.status === 'scheduled').length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledTime);
        const today = new Date();
        return aptDate.toDateString() === today.toDateString();
      }).length,
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting appointment stats:', error);
    throw error;
  }
};

// Real-time listener for appointments
export const subscribeToAppointments = (callback, userId, userRole) => {
  const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
  let q;

  if (userRole === 'doctor') {
    q = query(appointmentsRef, where('doctorId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else if (userRole === 'caregiver') {
    q = query(appointmentsRef, where('caregiverId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else if (userRole === 'elderly') {
    q = query(appointmentsRef, where('patientId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else {
    q = query(appointmentsRef, orderBy('scheduledTime', 'asc'));
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const appointments = [];
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      appointments.push({
        id: doc.id,
        ...appointmentData,
        scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
        createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
        updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
      });
    });
    callback(appointments);
  });
};

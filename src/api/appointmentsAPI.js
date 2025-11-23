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
export const getAllAppointments = async (institutionId = null) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    let q = query(appointmentsRef, orderBy('scheduledTime', 'asc'));
    
    // Add institution filtering if provided
    if (institutionId) {
      q = query(appointmentsRef, 
        where('institutionId', '==', institutionId),
        orderBy('scheduledTime', 'asc')
      );
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
    
    // Send SMS/WhatsApp appointment reminder if enabled
    try {
      const patientId = appointmentData.clientId || appointmentData.patientId;
      if (patientId) {
        const patientDoc = await getDoc(doc(db, 'patients', patientId)).catch(() => null);
        const patientData = patientDoc?.exists() ? patientDoc.data() : null;
        const patientPhone = patientData?.phone || patientData?.phoneNumber;
        
        if (patientPhone && appointmentData.institutionId) {
          const { getSettings, sendAppointmentReminder } = await import('./smsWhatsAppAPI');
          const settings = await getSettings(appointmentData.institutionId);
          
          if (settings?.enabled && settings?.appointmentReminders?.enabled) {
            await sendAppointmentReminder(
              patientPhone,
              {
                appointmentDate: appointmentData.appointmentDate || appointmentData.scheduledTime,
                appointmentTime: appointmentData.appointmentTime,
                doctorName: appointmentData.caregiverName || appointmentData.doctorName,
                type: appointmentData.type,
                notes: appointmentData.notes
              },
              settings.appointmentReminders.channel || 'sms'
            );
          }
        }
      }
    } catch (smsError) {
      console.warn('Could not send appointment reminder SMS/WhatsApp:', smsError);
      // Don't throw - SMS failure shouldn't break appointment creation
    }
    
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
export const getTodaysAppointments = async (userId, userRole, options = {}) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    let q;

    // Use simple queries that don't require complex indexes
    if (userRole === 'admin') {
      // Admin can see all appointments
      q = query(appointmentsRef);
    } else if (userRole === 'doctor') {
      q = query(appointmentsRef, where('doctorId', '==', userId));
    } else if (userRole === 'caregiver') {
      q = query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'patient' || userRole === 'elderly') {
      q = query(appointmentsRef, where('patientId', '==', userId));
    } else {
      throw new Error('Invalid user role');
    }

    // Add status filtering if provided
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }

    // Add institution filtering if provided
    if (options.institutionId) {
      q = query(q, where('institutionId', '==', options.institutionId));
    }

    const querySnapshot = await getDocs(q);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      const scheduledTime = appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime;
      
      // Filter for today's appointments on client side
      if (scheduledTime && scheduledTime >= today && scheduledTime < tomorrow) {
        appointments.push({
          id: doc.id,
          ...appointmentData,
          scheduledTime: scheduledTime,
          createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
          updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
        });
      }
    });
    
    // Sort by scheduled time
    appointments.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
    
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

    // Use simple queries that don't require complex indexes
    if (userRole === 'admin') {
      // Admin can see all appointments
      q = query(appointmentsRef);
    } else if (userRole === 'doctor') {
      q = query(appointmentsRef, where('doctorId', '==', userId));
    } else if (userRole === 'caregiver') {
      q = query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'patient' || userRole === 'elderly') {
      q = query(appointmentsRef, where('patientId', '==', userId));
    } else {
      throw new Error('Invalid user role');
    }

    const querySnapshot = await getDocs(q);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      const scheduledTime = appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime;
      
      // Filter for upcoming appointments (next 7 days) on client side
      if (scheduledTime && scheduledTime >= today && scheduledTime <= nextWeek) {
        appointments.push({
          id: doc.id,
          ...appointmentData,
          scheduledTime: scheduledTime,
          createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
          updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
        });
      }
    });
    
    // Sort by scheduled time
    appointments.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
    
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

  if (userRole === 'admin') {
    // Admin can see all appointments
    q = query(appointmentsRef, orderBy('scheduledTime', 'asc'));
  } else if (userRole === 'doctor') {
    q = query(appointmentsRef, where('doctorId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else if (userRole === 'caregiver') {
    q = query(appointmentsRef, where('caregiverId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else if (userRole === 'patient' || userRole === 'elderly') {
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


// Get appointment analytics for a user
export const getAppointmentAnalytics = async (userId, userRole, dateRange = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    let q;

    // Use simple queries that don't require complex indexes
    if (userRole === 'admin') {
      q = query(appointmentsRef);
    } else if (userRole === 'doctor') {
      q = query(appointmentsRef, where('doctorId', '==', userId));
    } else if (userRole === 'caregiver') {
      q = query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'patient' || userRole === 'elderly') {
      q = query(appointmentsRef, where('patientId', '==', userId));
    } else {
      throw new Error('Invalid user role');
    }

    const querySnapshot = await getDocs(q);
    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      const scheduledTime = appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime;
      
      // Filter for date range on client side
      if (scheduledTime && scheduledTime >= startDate && scheduledTime <= endDate) {
        appointments.push({
          id: doc.id,
          ...appointmentData,
          scheduledTime: scheduledTime,
          createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
          updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
        });
      }
    });
    
    // Calculate analytics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const pendingAppointments = appointments.filter(apt => apt.status === 'scheduled').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
    const noShowAppointments = appointments.filter(apt => apt.status === 'no-show').length;
    
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
    
    // Group by date for trend analysis
    const appointmentsByDate = {};
    appointments.forEach(appointment => {
      const date = new Date(appointment.scheduledTime).toISOString().split('T')[0];
      if (!appointmentsByDate[date]) {
        appointmentsByDate[date] = { total: 0, completed: 0, pending: 0, cancelled: 0, noShow: 0 };
      }
      appointmentsByDate[date].total++;
      appointmentsByDate[date][appointment.status] = (appointmentsByDate[date][appointment.status] || 0) + 1;
    });
    
    // Group by type
    const appointmentsByType = {};
    appointments.forEach(appointment => {
      const type = appointment.type || 'general';
      appointmentsByType[type] = (appointmentsByType[type] || 0) + 1;
    });
    
    return {
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      noShowAppointments,
      completionRate: Math.round(completionRate * 100) / 100,
      appointmentsByDate,
      appointmentsByType,
      dateRange
    };
  } catch (error) {
    console.error('Error fetching appointment analytics:', error);
    throw error;
  }
};

// Bulk update appointment status
export const bulkUpdateAppointmentStatus = async (appointmentIds, status, userId) => {
  try {
    const updatePromises = appointmentIds.map(appointmentId => {
      const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      
      // If completing appointment, add completion timestamp
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }
      
      return updateDoc(appointmentRef, updateData);
    });
    
    await Promise.all(updatePromises);
    return { success: true, updatedCount: appointmentIds.length };
  } catch (error) {
    console.error('Error bulk updating appointment status:', error);
    throw error;
  }
};

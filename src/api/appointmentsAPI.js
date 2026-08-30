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
} from 'backend/database';
import { db } from '../backend/config';

const APPOINTMENTS_COLLECTION = 'appointments';

// Get all appointments
export const getAllAppointments = async (institutionId = null) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    let appointments = [];
    
    // Try with orderBy first (requires index)
    try {
      let q = query(appointmentsRef, orderBy('scheduledTime', 'asc'));
      
      // Add institution filtering if provided
      if (institutionId) {
        q = query(appointmentsRef, 
          where('institutionId', '==', institutionId),
          orderBy('scheduledTime', 'asc')
        );
      }
      
      const querySnapshot = await getDocs(q);
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
      
      // Filter by institution if needed and sort in memory
      if (institutionId) {
        appointments = appointments.filter(apt => apt.institutionId === institutionId);
      }
      
      // Sort by scheduledTime
      const toMs = (v) => {
        if (!v) return 0;
        if (v.toDate) return v.toDate().getTime() || 0;
        if (v.getTime) return v.getTime();
        const d = new Date(v);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      appointments.sort((a, b) => {
        return toMs(a.scheduledTime) - toMs(b.scheduledTime);
      });
    } catch (indexError) {
      if (indexError.code !== 'failed-precondition' && !indexError.message?.includes('index') && !indexError.message?.includes('query requires an index')) {
        throw indexError; // Re-throw non-index errors
      }
      // Fallback: query without orderBy if index doesn't exist
      console.warn('Database index not found for appointments, using simpler query:', indexError);
      let q = query(appointmentsRef);
      
      if (institutionId) {
        q = query(appointmentsRef, where('institutionId', '==', institutionId));
      }
      
      const querySnapshot = await getDocs(q);
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
      
      // Sort in memory by scheduledTime
      const toMs = (v) => {
        if (!v) return 0;
        if (v.toDate) return v.toDate().getTime() || 0;
        if (v.getTime) return v.getTime();
        const d = new Date(v);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      appointments.sort((a, b) => {
        return toMs(a.scheduledTime) - toMs(b.scheduledTime);
      });
    }
    
    return appointments;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      // Return empty array only for genuine index errors to prevent UI crashes
      return [];
    }
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

// Get appointments for a Client
export const getAppointmentsByClient = async (clientId) => {
  try {
    const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
    const q = query(
      appointmentsRef, 
      where('clientId', '==', clientId),
      orderBy('scheduledTime', 'desc')
    );
    
    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(appointmentsRef, where('clientId', '==', clientId));
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }
    
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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime desc (original orderBy)
      appointments.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return bTime - aTime; // desc
      });
    }
    
    return appointments;
  } catch (error) {
    console.error('Error fetching Client appointments:', error);
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
    
    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(appointmentsRef, where('doctorId', '==', doctorId));
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }
    
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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      appointments.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
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
    
    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(appointmentsRef, where('caregiverId', '==', caregiverId));
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }
    
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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      appointments.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
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
      const clientId = appointmentData.clientId || appointmentData.clientId;
      if (clientId) {
        const patientDoc = await getDoc(doc(db, 'clients', clientId)).catch(() => null);
        const clientData = patientDoc?.exists() ? patientDoc.data() : null;
        const patientPhone = clientData?.phone || clientData?.phoneNumber;
        
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
    } else if (userRole === 'caregiver' || userRole === 'nurse') {
      q = query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'elderly') {
      q = query(appointmentsRef, where('clientId', '==', userId));
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

    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        // Rebuild query from base where clause only, filter rest in memory
        if (userRole === 'admin') {
          q = query(appointmentsRef);
        } else if (userRole === 'doctor') {
          q = query(appointmentsRef, where('doctorId', '==', userId));
        } else if (userRole === 'caregiver' || userRole === 'nurse') {
          q = query(appointmentsRef, where('caregiverId', '==', userId));
        } else if (userRole === 'elderly') {
          q = query(appointmentsRef, where('clientId', '==', userId));
        }
        querySnapshot = await getDocs(q);
        usedFallback = true;
      } else {
        throw error;
      }
    }

    const appointments = [];
    
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      const scheduledTime = appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime;
      
      // Filter for today's appointments on client side
      if (scheduledTime && scheduledTime >= today && scheduledTime < tomorrow) {
        // If fallback was used, also filter by status and institution in memory
        if (usedFallback) {
          if (options.status && appointmentData.status !== options.status) return;
          if (options.institutionId && appointmentData.institutionId !== options.institutionId) return;
        }
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
    const toMs = (v) => !v ? 0 : (v.toDate ? v.toDate().getTime() : (v.getTime ? v.getTime() : new Date(v).getTime() || 0));
    appointments.sort((a, b) => toMs(a.scheduledTime) - toMs(b.scheduledTime));
    
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
    } else if (userRole === 'caregiver' || userRole === 'nurse') {
      q = query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'elderly') {
      q = query(appointmentsRef, where('clientId', '==', userId));
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
    const toMs = (v) => !v ? 0 : (v.toDate ? v.toDate().getTime() : (v.getTime ? v.getTime() : new Date(v).getTime() || 0));
    appointments.sort((a, b) => toMs(a.scheduledTime) - toMs(b.scheduledTime));
    
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
  } else if (userRole === 'caregiver' || userRole === 'nurse') {
    q = query(appointmentsRef, where('caregiverId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else if (userRole === 'elderly') {
    q = query(appointmentsRef, where('clientId', '==', userId), orderBy('scheduledTime', 'asc'));
  } else {
    q = query(appointmentsRef, orderBy('scheduledTime', 'asc'));
  }
  
  const processSnapshot = (querySnapshot) => {
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
  };
  
  // Build fallback query (without orderBy) for index error recovery
  const buildFallbackQuery = () => {
    if (userRole === 'admin') {
      return query(appointmentsRef);
    } else if (userRole === 'doctor') {
      return query(appointmentsRef, where('doctorId', '==', userId));
    } else if (userRole === 'caregiver' || userRole === 'nurse') {
      return query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'elderly') {
      return query(appointmentsRef, where('clientId', '==', userId));
    } else {
      return query(appointmentsRef);
    }
  };
  
  let fallbackUnsubscribe = null;
  
  const unsubscribe = onSnapshot(q, processSnapshot, (error) => {
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      console.warn('Index missing, using fallback snapshot query:', error.message);
      // Fallback: query without orderBy, sort in memory
      const fallbackQ = buildFallbackQuery();
      fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
        const appointments = [];
        snapshot.forEach((doc) => {
          const appointmentData = doc.data();
          appointments.push({
            id: doc.id,
            ...appointmentData,
            scheduledTime: appointmentData.scheduledTime?.toDate?.() || appointmentData.scheduledTime,
            createdAt: appointmentData.createdAt?.toDate?.() || appointmentData.createdAt,
            updatedAt: appointmentData.updatedAt?.toDate?.() || appointmentData.updatedAt,
          });
        });
        // Sort in memory by scheduledTime asc (original orderBy)
        appointments.sort((a, b) => {
          const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
          const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
          return aTime - bTime; // asc
        });
        callback(appointments);
      }, (err) => {
        console.error('Fallback snapshot error:', err);
        callback([]);
      });
    } else {
      console.error('Snapshot error:', error);
      callback([]);
    }
  });
  
  return () => {
    unsubscribe();
    if (fallbackUnsubscribe) fallbackUnsubscribe();
  };
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
    } else if (userRole === 'caregiver' || userRole === 'nurse') {
      q = query(appointmentsRef, where('caregiverId', '==', userId));
    } else if (userRole === 'elderly') {
      q = query(appointmentsRef, where('clientId', '==', userId));
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

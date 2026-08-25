/**
 * Attendance Tracking API
 * 
 * Comprehensive attendance management:
 * - Check-in/check-out with multiple methods (QR code, biometric, geofencing)
 * - Leave management with approval workflow
 * - Overtime tracking and calculation
 * - Attendance reports and analytics
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
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';
import { notificationsAPI } from './notificationsAPI';

const ATTENDANCE_COLLECTION = 'attendance';
const LEAVE_REQUESTS_COLLECTION = 'leaveRequests';
const OVERTIME_RECORDS_COLLECTION = 'overtimeRecords';

// Attendance methods
export const ATTENDANCE_METHOD = {
  QR_CODE: 'qr_code',
  BIOMETRIC: 'biometric',
  GEOFENCING: 'geofencing',
  MANUAL: 'manual',
  MOBILE_APP: 'mobile_app'
};

// Attendance status
export const ATTENDANCE_STATUS = {
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  ABSENT: 'absent',
  LATE: 'late',
  EARLY_LEAVE: 'early_leave',
  ON_LEAVE: 'on_leave'
};

// Leave types
export const LEAVE_TYPE = {
  SICK: 'sick',
  VACATION: 'vacation',
  PERSONAL: 'personal',
  EMERGENCY: 'emergency',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  UNPAID: 'unpaid'
};

// Leave status
export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

/**
 * Check in staff member
 */
export const checkIn = async (staffId, checkInData) => {
  try {
    const {
      institutionId,
      method = ATTENDANCE_METHOD.MANUAL,
      location = null,
      coordinates = null,
      notes = '',
      deviceInfo = null
    } = checkInData;

    if (!staffId || !institutionId) {
      throw new Error('Staff ID and Institution ID are required');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if already checked in today
    const existingCheckIn = await getTodayAttendance(staffId, institutionId);
    if (existingCheckIn && existingCheckIn.status === ATTENDANCE_STATUS.CHECKED_IN) {
      throw new Error('Already checked in today');
    }

    // Get staff schedule to check if late
    const staffDoc = await getDoc(doc(db, 'users', staffId));
    const staffData = staffDoc.exists() ? staffDoc.data() : null;
    
    let status = ATTENDANCE_STATUS.CHECKED_IN;
    let isLate = false;
    
    if (staffData?.workingHoursStart) {
      const expectedStart = new Date(`${today.toISOString().split('T')[0]}T${staffData.workingHoursStart}`);
      if (now > expectedStart) {
        status = ATTENDANCE_STATUS.LATE;
        isLate = true;
      }
    }

    const attendance = {
      staffId,
      institutionId,
      date: today.toISOString().split('T')[0],
      checkInTime: serverTimestamp(),
      checkInMethod: method,
      checkInLocation: location,
      checkInCoordinates: coordinates,
      checkInNotes: notes,
      checkInDeviceInfo: deviceInfo,
      status,
      isLate,
      checkOutTime: null,
      checkOutMethod: null,
      checkOutLocation: null,
      checkOutNotes: null,
      totalHours: null,
      overtimeHours: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const attendanceRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), attendance);

    // Send notification
    try {
      await notificationsAPI.createNotification({
        userId: staffId,
        type: 'attendance',
        title: isLate ? 'Checked In (Late)' : 'Checked In',
        message: isLate 
          ? `You checked in at ${now.toLocaleTimeString()} (Late)`
          : `You checked in at ${now.toLocaleTimeString()}`,
        priority: isLate ? 'medium' : 'low'
      });
    } catch (notifError) {
      console.warn('Failed to send attendance notification:', notifError);
    }

    return {
      id: attendanceRef.id,
      ...attendance,
      checkInTime: now
    };
  } catch (error) {
    console.error('Error checking in:', error);
    throw error;
  }
};

/**
 * Check out staff member
 */
export const checkOut = async (staffId, checkOutData) => {
  try {
    const {
      institutionId,
      method = ATTENDANCE_METHOD.MANUAL,
      location = null,
      coordinates = null,
      notes = '',
      deviceInfo = null
    } = checkOutData;

    if (!staffId || !institutionId) {
      throw new Error('Staff ID and Institution ID are required');
    }

    // Get today's check-in
    const attendance = await getTodayAttendance(staffId, institutionId);
    if (!attendance || attendance.status !== ATTENDANCE_STATUS.CHECKED_IN) {
      throw new Error('No active check-in found');
    }

    const now = new Date();
    const checkInTime = attendance.checkInTime?.toDate?.() || new Date(attendance.checkInTime);
    const totalHours = (now - checkInTime) / (1000 * 60 * 60); // Convert to hours

    // Get staff schedule to check for early leave and overtime
    const staffDoc = await getDoc(doc(db, 'users', staffId));
    const staffData = staffDoc.exists() ? staffDoc.data() : null;
    
    let status = ATTENDANCE_STATUS.CHECKED_OUT;
    let isEarlyLeave = false;
    let overtimeHours = 0;

    if (staffData?.workingHoursEnd) {
      const expectedEnd = new Date(`${attendance.date}T${staffData.workingHoursEnd}`);
      if (now < expectedEnd) {
        status = ATTENDANCE_STATUS.EARLY_LEAVE;
        isEarlyLeave = true;
      } else {
        // Calculate overtime
        const expectedHours = (expectedEnd - checkInTime) / (1000 * 60 * 60);
        overtimeHours = Math.max(0, totalHours - expectedHours);
      }
    }

    const attendanceRef = doc(db, ATTENDANCE_COLLECTION, attendance.id);
    await updateDoc(attendanceRef, {
      checkOutTime: serverTimestamp(),
      checkOutMethod: method,
      checkOutLocation: location,
      checkOutCoordinates: coordinates,
      checkOutNotes: notes,
      checkOutDeviceInfo: deviceInfo,
      status,
      isEarlyLeave,
      totalHours: parseFloat(totalHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      updatedAt: serverTimestamp()
    });

    // Create overtime record if applicable
    if (overtimeHours > 0) {
      await createOvertimeRecord(staffId, institutionId, attendance.id, overtimeHours);
    }

    return {
      id: attendance.id,
      ...attendance,
      checkOutTime: now,
      totalHours: parseFloat(totalHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2))
    };
  } catch (error) {
    console.error('Error checking out:', error);
    throw error;
  }
};

/**
 * Get today's attendance for a staff member
 */
export const getTodayAttendance = async (staffId, institutionId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendanceQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('staffId', '==', staffId),
      where('institutionId', '==', institutionId),
      where('date', '==', today),
      orderBy('checkInTime', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(attendanceQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const attendanceData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...attendanceData,
      checkInTime: attendanceData.checkInTime?.toDate?.() || attendanceData.checkInTime,
      checkOutTime: attendanceData.checkOutTime?.toDate?.() || attendanceData.checkOutTime
    };
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return null;
  }
};

/**
 * Get attendance records for a staff member
 */
export const getAttendanceByStaff = async (staffId, institutionId, options = {}) => {
  try {
    const { startDate, endDate, limitCount = 100 } = options;
    
    let attendanceQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('staffId', '==', staffId),
      where('institutionId', '==', institutionId),
      orderBy('date', 'desc')
    );

    if (limitCount) {
      attendanceQuery = query(attendanceQuery, limit(limitCount));
    }

    const querySnapshot = await getDocs(attendanceQuery);
    const attendanceRecords = [];

    querySnapshot.forEach((doc) => {
      const attendanceData = doc.data();
      const recordDate = attendanceData.date;
      
      // Filter by date range if provided
      if (startDate && recordDate < startDate) return;
      if (endDate && recordDate > endDate) return;

      attendanceRecords.push({
        id: doc.id,
        ...attendanceData,
        checkInTime: attendanceData.checkInTime?.toDate?.() || attendanceData.checkInTime,
        checkOutTime: attendanceData.checkOutTime?.toDate?.() || attendanceData.checkOutTime
      });
    });

    return attendanceRecords;
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw error;
  }
};

/**
 * Create leave request
 */
export const createLeaveRequest = async (leaveData) => {
  try {
    const {
      staffId,
      institutionId,
      leaveType,
      startDate,
      endDate,
      reason,
      emergencyContact = null
    } = leaveData;

    if (!staffId || !institutionId || !leaveType || !startDate || !endDate) {
      throw new Error('Missing required fields');
    }

    const leaveRequest = {
      staffId,
      institutionId,
      leaveType,
      startDate,
      endDate,
      reason,
      emergencyContact,
      status: LEAVE_STATUS.PENDING,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const leaveRequestRef = await addDoc(collection(db, LEAVE_REQUESTS_COLLECTION), leaveRequest);

    // Send notification to admin
    try {
      // Get admins for the institution
      const adminsQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', institutionId),
        where('userType', '==', 'admin')
      );
      const adminsSnap = await getDocs(adminsQuery);
      
      adminsSnap.forEach(async (adminDoc) => {
        await notificationsAPI.createNotification({
          userId: adminDoc.id,
          type: 'leave_request',
          title: 'New Leave Request',
          message: `Staff member has requested ${leaveType} leave`,
          priority: 'medium',
          data: {
            leaveRequestId: leaveRequestRef.id,
            staffId,
            leaveType,
            startDate,
            endDate
          }
        });
      });
    } catch (notifError) {
      console.warn('Failed to send leave request notification:', notifError);
    }

    return {
      id: leaveRequestRef.id,
      ...leaveRequest
    };
  } catch (error) {
    console.error('Error creating leave request:', error);
    throw error;
  }
};

/**
 * Approve/reject leave request
 */
export const updateLeaveRequestStatus = async (leaveRequestId, status, approverId, reason = null) => {
  try {
    if (![LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED, LEAVE_STATUS.CANCELLED].includes(status)) {
      throw new Error('Invalid status');
    }

    const leaveRequestRef = doc(db, LEAVE_REQUESTS_COLLECTION, leaveRequestId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === LEAVE_STATUS.APPROVED) {
      updateData.approvedBy = approverId;
      updateData.approvedAt = serverTimestamp();
    } else if (status === LEAVE_STATUS.REJECTED) {
      updateData.rejectionReason = reason;
    }

    await updateDoc(leaveRequestRef, updateData);

    // Get leave request to send notification
    const leaveRequestSnap = await getDoc(leaveRequestRef);
    const leaveRequest = leaveRequestSnap.data();

    // Send notification to staff
    try {
      await notificationsAPI.createNotification({
        userId: leaveRequest.staffId,
        type: 'leave_request',
        title: `Leave Request ${status === LEAVE_STATUS.APPROVED ? 'Approved' : 'Rejected'}`,
        message: status === LEAVE_STATUS.APPROVED
          ? `Your ${leaveRequest.leaveType} leave request has been approved`
          : `Your leave request has been rejected. ${reason || ''}`,
        priority: 'medium'
      });
    } catch (notifError) {
      console.warn('Failed to send leave status notification:', notifError);
    }

    return { success: true, leaveRequestId };
  } catch (error) {
    console.error('Error updating leave request:', error);
    throw error;
  }
};

/**
 * Create overtime record
 */
const createOvertimeRecord = async (staffId, institutionId, attendanceId, hours) => {
  try {
    const overtimeRecord = {
      staffId,
      institutionId,
      attendanceId,
      hours: parseFloat(hours.toFixed(2)),
      date: new Date().toISOString().split('T')[0],
      status: 'pending', // pending, approved, paid
      approvedBy: null,
      approvedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(collection(db, OVERTIME_RECORDS_COLLECTION), overtimeRecord);
  } catch (error) {
    console.error('Error creating overtime record:', error);
    // Don't throw - attendance was recorded successfully
  }
};

/**
 * Get attendance statistics
 */
export const getAttendanceStats = async (institutionId, startDate, endDate) => {
  try {
    const attendanceQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('institutionId', '==', institutionId)
    );

    const querySnapshot = await getDocs(attendanceQuery);
    const stats = {
      totalRecords: 0,
      checkedIn: 0,
      checkedOut: 0,
      late: 0,
      earlyLeave: 0,
      absent: 0,
      totalHours: 0,
      totalOvertimeHours: 0,
      averageHoursPerDay: 0
    };

    const records = [];
    querySnapshot.forEach((doc) => {
      const attendanceData = doc.data();
      const recordDate = attendanceData.date;
      
      if (startDate && recordDate < startDate) return;
      if (endDate && recordDate > endDate) return;

      records.push(attendanceData);
      stats.totalRecords++;

      if (attendanceData.status === ATTENDANCE_STATUS.CHECKED_IN || 
          attendanceData.status === ATTENDANCE_STATUS.CHECKED_OUT) {
        stats.checkedIn++;
      }

      if (attendanceData.status === ATTENDANCE_STATUS.CHECKED_OUT) {
        stats.checkedOut++;
      }

      if (attendanceData.isLate) {
        stats.late++;
      }

      if (attendanceData.isEarlyLeave) {
        stats.earlyLeave++;
      }

      if (attendanceData.totalHours) {
        stats.totalHours += attendanceData.totalHours;
      }

      if (attendanceData.overtimeHours) {
        stats.totalOvertimeHours += attendanceData.overtimeHours;
      }
    });

    if (records.length > 0) {
      stats.averageHoursPerDay = parseFloat((stats.totalHours / records.length).toFixed(2));
    }

    return stats;
  } catch (error) {
    console.error('Error calculating attendance stats:', error);
    throw error;
  }
};

/**
 * Get leave requests
 */
export const getLeaveRequests = async (institutionId, options = {}) => {
  try {
    const { staffId, status } = options;
    
    let leaveQuery = query(
      collection(db, LEAVE_REQUESTS_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    if (staffId) {
      leaveQuery = query(leaveQuery, where('staffId', '==', staffId));
    }

    if (status) {
      leaveQuery = query(leaveQuery, where('status', '==', status));
    }

    const querySnapshot = await getDocs(leaveQuery);
    const leaveRequests = [];

    querySnapshot.forEach((doc) => {
      const leaveData = doc.data();
      leaveRequests.push({
        id: doc.id,
        ...leaveData,
        createdAt: leaveData.createdAt?.toDate?.() || leaveData.createdAt,
        updatedAt: leaveData.updatedAt?.toDate?.() || leaveData.updatedAt,
        approvedAt: leaveData.approvedAt?.toDate?.() || leaveData.approvedAt
      });
    });

    return leaveRequests;
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    throw error;
  }
};


/**
 * Wage Calculator Utility
 * 
 * Calculates caregiver wages based on:
 * - Hourly rates with clock-in/clock-out tracking
 * - Monthly flat rates
 * - Overtime calculations
 * - Activity-based time tracking
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';

/**
 * SUGGESTED HOURLY RATE WAGE STRUCTURE:
 * 
 * 1. CLOCK-IN/CLOCK-OUT METHOD (Most Accurate)
 *    - Caregiver clocks in when starting shift
 *    - Clocks out when ending shift
 *    - System calculates exact hours worked
 *    - Supports breaks and overtime
 * 
 * 2. ACTIVITY-BASED TRACKING (Alternative)
 *    - Track time spent on each activity/client
 *    - Aggregate total time per day/week/month
 *    - Useful when caregivers work with multiple clients
 * 
 * 3. SCHEDULED HOURS (Simplified)
 *    - Pay based on scheduled hours
 *    - Assumes caregiver worked full scheduled time
 *    - Easier but less accurate
 */

export const WageCalculator = {
  /**
   * Calculate hourly wages based on clock-in/clock-out
   * 
   * @param {string} caregiverId - Caregiver ID
   * @param {Date} startDate - Start date for calculation
   * @param {Date} endDate - End date for calculation
   * @param {number} hourlyRate - Hourly rate
   * @param {object} options - Additional options (overtime, breaks, etc.)
   * @returns {object} Wage calculation breakdown
   */
  calculateHourlyWages: async (caregiverId, startDate, endDate, hourlyRate, options = {}) => {
    try {
      const {
        overtimeRate = 1.5, // 1.5x for overtime
        standardHoursPerWeek = 40,
        breakDeduction = true, // Deduct break time
        breakMinutesPerShift = 30
      } = options;

      // Get all clock records for the period
      const clockRecordsQuery = query(
        collection(db, 'caregiverClockRecords'),
        where('caregiverId', '==', caregiverId),
        where('clockInTime', '>=', startDate),
        where('clockInTime', '<=', endDate),
        orderBy('clockInTime', 'asc')
      );

      const clockRecordsSnapshot = await getDocs(clockRecordsQuery);
      const clockRecords = [];
      
      clockRecordsSnapshot.forEach(doc => {
        const data = doc.data();
        clockRecords.push({
          id: doc.id,
          ...data,
          clockInTime: data.clockInTime?.toDate?.() || new Date(data.clockInTime),
          clockOutTime: data.clockOutTime?.toDate?.() || new Date(data.clockOutTime)
        });
      });

      // Calculate total hours
      let regularHours = 0;
      let overtimeHours = 0;
      let totalBreakHours = 0;
      const dailyHours = {};
      const weeklyHours = {};

      clockRecords.forEach(record => {
        if (!record.clockOutTime) return; // Skip incomplete records

        const hoursWorked = (record.clockOutTime - record.clockInTime) / (1000 * 60 * 60);
        const breakHours = breakDeduction ? breakMinutesPerShift / 60 : 0;
        const netHours = hoursWorked - breakHours;

        const dateKey = record.clockInTime.toISOString().split('T')[0];
        const weekKey = getWeekKey(record.clockInTime);

        dailyHours[dateKey] = (dailyHours[dateKey] || 0) + netHours;
        weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + netHours;
        totalBreakHours += breakHours;
      });

      // Calculate regular and overtime hours
      Object.entries(weeklyHours).forEach(([week, hours]) => {
        if (hours > standardHoursPerWeek) {
          regularHours += standardHoursPerWeek;
          overtimeHours += hours - standardHoursPerWeek;
        } else {
          regularHours += hours;
        }
      });

      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeRate;
      const totalPay = regularPay + overtimePay;

      return {
        caregiverId,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        hours: {
          regular: Math.round(regularHours * 100) / 100,
          overtime: Math.round(overtimeHours * 100) / 100,
          total: Math.round((regularHours + overtimeHours) * 100) / 100,
          breaks: Math.round(totalBreakHours * 100) / 100
        },
        rates: {
          hourly: hourlyRate,
          overtime: hourlyRate * overtimeRate
        },
        pay: {
          regular: Math.round(regularPay * 100) / 100,
          overtime: Math.round(overtimePay * 100) / 100,
          total: Math.round(totalPay * 100) / 100
        },
        dailyBreakdown: dailyHours,
        weeklyBreakdown: weeklyHours,
        recordsCount: clockRecords.length
      };
    } catch (error) {
      console.error('Error calculating hourly wages:', error);
      throw error;
    }
  },

  /**
   * Calculate wages based on activity time tracking
   * (For caregivers who log time per activity/client)
   */
  calculateActivityBasedWages: async (caregiverId, startDate, endDate, hourlyRate) => {
    try {
      // Get all ADL logs for this caregiver (then filter by date in memory to avoid complex index)
      const adlLogsQuery = query(
        collection(db, 'adlLogs'),
        where('caregiverId', '==', caregiverId),
        orderBy('timestamp', 'desc')
      );

      // Get all care logs for this caregiver
      const careLogsQuery = query(
        collection(db, 'careLogs'),
        where('caregiverId', '==', caregiverId),
        orderBy('createdAt', 'desc')
      );

      const [adlLogsSnapshot, careLogsSnapshot] = await Promise.all([
        getDocs(adlLogsQuery),
        getDocs(careLogsQuery)
      ]);

      // Filter by date range in memory
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      let totalHours = 0;
      const clientHours = {};
      const activityBreakdown = [];

      // Process ADL logs with date filtering
      adlLogsSnapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
        const timestampMs = timestamp.getTime();
        
        // Filter by date range
        if (timestampMs >= startTimestamp && timestampMs <= endTimestamp) {
          const duration = data.duration || 0.25; // Default 15 minutes if not specified
          totalHours += duration;
          
          if (data.clientId) {
            clientHours[data.clientId] = (clientHours[data.clientId] || 0) + duration;
          }

          activityBreakdown.push({
            type: 'ADL',
            activity: data.activityName,
            client: data.clientName,
            duration,
            timestamp
          });
        }
      });

      // Process care logs (if they have duration) with date filtering
      careLogsSnapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.createdAt?.toDate?.() || new Date(data.createdAt);
        const timestampMs = timestamp.getTime();
        
        // Filter by date range
        if (timestampMs >= startTimestamp && timestampMs <= endTimestamp) {
          const duration = parseDuration(data.duration);
          if (duration > 0) {
            totalHours += duration;
            
            if (data.clientId) {
              clientHours[data.clientId] = (clientHours[data.clientId] || 0) + duration;
            }

            activityBreakdown.push({
              type: 'Care Log',
              activity: data.activityType || 'Care Activity',
              client: data.clientName,
              duration,
              timestamp
            });
          }
        }
      });

      const totalPay = totalHours * hourlyRate;

      return {
        caregiverId,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        hours: {
          total: Math.round(totalHours * 100) / 100
        },
        rate: hourlyRate,
        pay: {
          total: Math.round(totalPay * 100) / 100
        },
        clientBreakdown: clientHours,
        activityBreakdown: activityBreakdown.sort((a, b) => b.timestamp - a.timestamp),
        activitiesCount: activityBreakdown.length
      };
    } catch (error) {
      console.error('Error calculating activity-based wages:', error);
      throw error;
    }
  },

  /**
   * Calculate wages based on task time tracking
   * Uses task-level clock in/out data for accurate billing
   */
  calculateTaskBasedWages: async (caregiverId, startDate, endDate, hourlyRate) => {
    try {
      // Import task time tracking API
      const { getWorkHours } = await import('../api/taskTimeTrackingAPI');
      
      // Get work hours from task time tracking
      const workData = await getWorkHours(caregiverId, startDate, endDate);
      
      // If hourly rate not provided, try to get from caregiver profile
      if (!hourlyRate || hourlyRate === 0) {
        try {
          const caregiversRef = collection(db, 'caregivers');
          const caregiverQuery = query(caregiversRef, where('userId', '==', caregiverId));
          const caregiverSnapshot = await getDocs(caregiverQuery);
          
          if (!caregiverSnapshot.empty) {
            hourlyRate = caregiverSnapshot.docs[0].data()?.hourlyRate || 0;
          }
        } catch (error) {
          console.warn('Could not fetch caregiver hourly rate:', error);
        }
      }
      
      // Calculate billable amount if not already calculated
      let totalBillable = workData.totalBillable;
      if (totalBillable === 0 && hourlyRate > 0) {
        totalBillable = workData.totalHours * hourlyRate;
      }
      
      // Calculate client breakdown with billable amounts
      const clientBreakdown = {};
      Object.keys(workData.clientBreakdown).forEach(clientId => {
        const clientData = workData.clientBreakdown[clientId];
        clientBreakdown[clientId] = {
          hours: clientData.hours,
          billableAmount: clientData.billableAmount || (clientData.hours * hourlyRate),
          taskCount: clientData.taskCount
        };
      });
      
      // Calculate daily breakdown
      const dailyBreakdown = {};
      workData.taskBreakdown.forEach(task => {
        const dateKey = task.timestamp.toISOString().split('T')[0];
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = {
            hours: 0,
            billableAmount: 0,
            taskCount: 0
          };
        }
        dailyBreakdown[dateKey].hours += task.duration;
        dailyBreakdown[dateKey].billableAmount += task.billableAmount || (task.duration * hourlyRate);
        dailyBreakdown[dateKey].taskCount += 1;
      });
      
      // Round daily breakdown values
      Object.keys(dailyBreakdown).forEach(date => {
        dailyBreakdown[date].hours = Math.round(dailyBreakdown[date].hours * 100) / 100;
        dailyBreakdown[date].billableAmount = Math.round(dailyBreakdown[date].billableAmount * 100) / 100;
      });
      
      return {
        caregiverId,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        hours: {
          total: workData.totalHours
        },
        rate: hourlyRate,
        pay: {
          total: Math.round(totalBillable * 100) / 100
        },
        clientBreakdown: clientBreakdown,
        dailyBreakdown: dailyBreakdown,
        taskBreakdown: workData.taskBreakdown,
        taskCount: workData.taskCount
      };
    } catch (error) {
      console.error('Error calculating task-based wages:', error);
      throw error;
    }
  },

  /**
   * Calculate monthly flat rate wages
   */
  calculateMonthlyWages: async (caregiverId, year, month, monthlyRate) => {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get attendance/work days
      const clockRecordsQuery = query(
        collection(db, 'caregiverClockRecords'),
        where('caregiverId', '==', caregiverId),
        where('clockInTime', '>=', startDate),
        where('clockInTime', '<=', endDate)
      );

      const clockRecordsSnapshot = await getDocs(clockRecordsQuery);
      const workDays = new Set();

      clockRecordsSnapshot.forEach(doc => {
        const data = doc.data();
        const dateKey = data.clockInTime?.toDate?.().toISOString().split('T')[0];
        if (dateKey) workDays.add(dateKey);
      });

      const daysInMonth = new Date(year, month, 0).getDate();
      const daysWorked = workDays.size;
      const attendanceRate = daysWorked / daysInMonth;

      return {
        caregiverId,
        period: {
          year,
          month,
          monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
        },
        rate: {
          monthly: monthlyRate,
          daily: Math.round((monthlyRate / daysInMonth) * 100) / 100
        },
        attendance: {
          daysWorked,
          daysInMonth,
          attendanceRate: Math.round(attendanceRate * 100)
        },
        pay: {
          base: monthlyRate,
          prorated: Math.round((monthlyRate * attendanceRate) * 100) / 100
        },
        workDaysList: Array.from(workDays).sort()
      };
    } catch (error) {
      console.error('Error calculating monthly wages:', error);
      throw error;
    }
  },

  /**
   * Clock in a caregiver
   */
  clockIn: async (caregiverId, caregiverName, location = null) => {
    try {
      const clockRecord = {
        caregiverId,
        caregiverName,
        clockInTime: serverTimestamp(),
        clockOutTime: null,
        location,
        status: 'active',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'caregiverClockRecords'), clockRecord);
      
      return {
        id: docRef.id,
        ...clockRecord,
        message: 'Clocked in successfully'
      };
    } catch (error) {
      console.error('Error clocking in:', error);
      throw error;
    }
  },

  /**
   * Clock out a caregiver
   */
  clockOut: async (clockRecordId, notes = '') => {
    try {
      const clockRef = doc(db, 'caregiverClockRecords', clockRecordId);
      
      await updateDoc(clockRef, {
        clockOutTime: serverTimestamp(),
        status: 'completed',
        notes,
        updatedAt: serverTimestamp()
      });

      return {
        message: 'Clocked out successfully'
      };
    } catch (error) {
      console.error('Error clocking out:', error);
      throw error;
    }
  },

  /**
   * Get active clock-in session for a caregiver
   */
  getActiveClock: async (caregiverId) => {
    try {
      const activeClockQuery = query(
        collection(db, 'caregiverClockRecords'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active'),
        orderBy('clockInTime', 'desc')
      );

      const snapshot = await getDocs(activeClockQuery);
      
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        clockInTime: doc.data().clockInTime?.toDate?.()
      };
    } catch (error) {
      console.error('Error getting active clock:', error);
      throw error;
    }
  },

  /**
   * Save wage calculation to database
   */
  saveWageCalculation: async (wageData) => {
    try {
      const wageRecord = {
        ...wageData,
        calculatedAt: serverTimestamp(),
        status: 'pending', // pending, approved, paid
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'caregiverEarnings'), wageRecord);
      
      return {
        id: docRef.id,
        ...wageRecord
      };
    } catch (error) {
      console.error('Error saving wage calculation:', error);
      throw error;
    }
  }
};

// Helper function to get week key (ISO week)
function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}

// Helper function to parse duration string (e.g., "30 minutes", "1.5 hours")
function parseDuration(durationString) {
  if (typeof durationString === 'number') return durationString;
  if (!durationString) return 0;

  const str = durationString.toLowerCase();
  
  // Match patterns like "30 minutes", "1.5 hours", "2h", "45m"
  const hoursMatch = str.match(/(\d+\.?\d*)\s*(hour|hr|h)/);
  const minutesMatch = str.match(/(\d+)\s*(minute|min|m)/);

  let hours = 0;
  
  if (hoursMatch) {
    hours += parseFloat(hoursMatch[1]);
  }
  
  if (minutesMatch) {
    hours += parseFloat(minutesMatch[1]) / 60;
  }

  return hours;
}

export default WageCalculator;


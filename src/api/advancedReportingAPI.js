/**
 * Advanced Reporting API
 * 
 * Features:
 * - Custom report builder
 * - Scheduled report generation
 * - Export to Excel/CSV/PDF
 * - Email report delivery
 * - Report templates
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { analyticsAPI } from './analyticsAPI';

const REPORTS_COLLECTION = 'customReports';
const REPORT_SCHEDULES_COLLECTION = 'reportSchedules';
const REPORT_EXPORTS_COLLECTION = 'reportExports';

/**
 * Generate CSV content from data
 */
const generateCSV = (data, headers) => {
  const csvHeaders = headers.map(h => `"${h.label}"`).join(',');
  const csvRows = data.map(row => {
    return headers.map(h => {
      const value = row[h.key] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Generate Excel-compatible CSV (with BOM for UTF-8)
 */
const generateExcelCSV = (data, headers) => {
  const csv = generateCSV(data, headers);
  const BOM = '\uFEFF';
  return BOM + csv;
};

/**
 * Custom Report Builder API
 */
export const customReportAPI = {
  /**
   * Create a custom report definition
   */
  createReport: async (reportData) => {
    try {
      const report = {
        ...reportData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      };

      const docRef = await addDoc(collection(db, REPORTS_COLLECTION), report);
      return {
        id: docRef.id,
        ...report
      };
    } catch (error) {
      console.error('Error creating custom report:', error);
      throw error;
    }
  },

  /**
   * Get all custom reports for an institution
   */
  getReports: async (institutionId) => {
    try {
      const q = query(
        collection(db, REPORTS_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const reports = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt
        });
      });

      return reports;
    } catch (error) {
      console.error('Error fetching custom reports:', error);
      throw error;
    }
  },

  /**
   * Generate report data based on report definition
   */
  generateReportData: async (reportId, dateRange = {}) => {
    try {
      const reportRef = doc(db, REPORTS_COLLECTION, reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const report = reportDoc.data();
      const { dataSource, fields, filters, groupBy, sortBy } = report;

      // Get data based on data source
      let data = [];
      
      switch (dataSource) {
        case 'clients':
          data = await getPatientReportData(fields, filters, dateRange);
          break;
        case 'appointments':
          data = await getAppointmentReportData(fields, filters, dateRange);
          break;
        case 'consultations':
          data = await getConsultationReportData(fields, filters, dateRange);
          break;
        case 'billing':
          data = await getBillingReportData(fields, filters, dateRange);
          break;
        case 'inventory':
          data = await getInventoryReportData(fields, filters, dateRange);
          break;
        case 'staff':
          data = await getStaffReportData(fields, filters, dateRange);
          break;
        default:
          throw new Error(`Unknown data source: ${dataSource}`);
      }

      // Apply grouping
      if (groupBy && groupBy.length > 0) {
        data = groupData(data, groupBy);
      }

      // Apply sorting
      if (sortBy && sortBy.field) {
        data.sort((a, b) => {
          const aVal = a[sortBy.field];
          const bVal = b[sortBy.field];
          if (sortBy.order === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }

      return data;
    } catch (error) {
      console.error('Error generating report data:', error);
      throw error;
    }
  },

  /**
   * Export report to CSV
   */
  exportToCSV: async (reportId, dateRange = {}) => {
    try {
      const data = await customReportAPI.generateReportData(reportId, dateRange);
      const reportRef = doc(db, REPORTS_COLLECTION, reportId);
      const reportDoc = await getDoc(reportRef);
      const report = reportDoc.data();

      const headers = report.fields.map(field => ({
        key: field.key,
        label: field.label || field.key
      }));

      const csv = generateExcelCSV(data, headers);

      // Save export record
      await addDoc(collection(db, REPORT_EXPORTS_COLLECTION), {
        reportId,
        format: 'csv',
        dateRange,
        exportedAt: serverTimestamp(),
        exportedBy: 'current-user-id' // Replace with actual user ID
      });

      return {
        content: csv,
        filename: `${report.name || 'report'}-${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv;charset=utf-8;'
      };
    } catch (error) {
      console.error('Error exporting report to CSV:', error);
      throw error;
    }
  },

  /**
   * Export report to JSON
   */
  exportToJSON: async (reportId, dateRange = {}) => {
    try {
      const data = await customReportAPI.generateReportData(reportId, dateRange);
      const reportRef = doc(db, REPORTS_COLLECTION, reportId);
      const reportDoc = await getDoc(reportRef);
      const report = reportDoc.data();

      const json = JSON.stringify({
        report: {
          name: report.name,
          description: report.description,
          generatedAt: new Date().toISOString(),
          dateRange,
          data
        }
      }, null, 2);

      return {
        content: json,
        filename: `${report.name || 'report'}-${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json'
      };
    } catch (error) {
      console.error('Error exporting report to JSON:', error);
      throw error;
    }
  }
};

/**
 * Scheduled Reports API
 */
export const scheduledReportAPI = {
  /**
   * Create a scheduled report
   */
  createSchedule: async (scheduleData) => {
    try {
      const schedule = {
        ...scheduleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        nextRun: calculateNextRun(scheduleData.frequency, scheduleData.schedule),
        active: true
      };

      const docRef = await addDoc(collection(db, REPORT_SCHEDULES_COLLECTION), schedule);
      return {
        id: docRef.id,
        ...schedule
      };
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      throw error;
    }
  },

  /**
   * Get scheduled reports for an institution
   */
  getSchedules: async (institutionId) => {
    try {
      const q = query(
        collection(db, REPORT_SCHEDULES_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('nextRun', 'asc')
      );

      const snapshot = await getDocs(q);
      const schedules = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        schedules.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          nextRun: data.nextRun?.toDate?.() || data.nextRun
        });
      });

      return schedules;
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw error;
    }
  }
};

/**
 * Helper functions for data retrieval
 */
const getPatientReportData = async (fields, filters, dateRange) => {
  // Implementation for Client data
  const q = query(collection(db, 'clients'));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach((doc) => {
    const clientData = doc.data();
    const row = {};
    fields.forEach(field => {
      row[field.key] = clientData[field.key] || '';
    });
    data.push(row);
  });

  return data;
};

const getAppointmentReportData = async (fields, filters, dateRange) => {
  const q = query(collection(db, 'appointments'));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach((doc) => {
    const appointmentData = doc.data();
    const row = {};
    fields.forEach(field => {
      row[field.key] = appointmentData[field.key] || '';
    });
    data.push(row);
  });

  return data;
};

const getConsultationReportData = async (fields, filters, dateRange) => {
  const q = query(collection(db, 'consultations'));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach((doc) => {
    const consultationData = doc.data();
    const row = {};
    fields.forEach(field => {
      row[field.key] = consultationData[field.key] || '';
    });
    data.push(row);
  });

  return data;
};

const getBillingReportData = async (fields, filters, dateRange) => {
  const q = query(collection(db, 'bills'));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach((doc) => {
    const billingData = doc.data();
    const row = {};
    fields.forEach(field => {
      row[field.key] = billingData[field.key] || '';
    });
    data.push(row);
  });

  return data;
};

const getInventoryReportData = async (fields, filters, dateRange) => {
  const q = query(collection(db, 'inventory'));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach((doc) => {
    const inventoryData = doc.data();
    const row = {};
    fields.forEach(field => {
      row[field.key] = inventoryData[field.key] || '';
    });
    data.push(row);
  });

  return data;
};

const getStaffReportData = async (fields, filters, dateRange) => {
  const q = query(collection(db, 'users'));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach((doc) => {
    const staffData = doc.data();
    const row = {};
    fields.forEach(field => {
      row[field.key] = staffData[field.key] || '';
    });
    data.push(row);
  });

  return data;
};

/**
 * Group data by specified fields
 */
const groupData = (data, groupBy) => {
  const groups = {};
  
  data.forEach(row => {
    const groupKey = groupBy.map(field => row[field]).join('|');
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(row);
  });

  // Convert to array with summary
  return Object.keys(groups).map(key => {
    const groupRows = groups[key];
    const summary = {
      _groupKey: key,
      _count: groupRows.length
    };
    
    // Add aggregated values
    groupBy.forEach(field => {
      summary[field] = groupRows[0][field];
    });

    return summary;
  });
};

/**
 * Calculate next run time for scheduled report
 */
const calculateNextRun = (frequency, schedule) => {
  const now = new Date();
  let nextRun = new Date(now);

  switch (frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
      break;
    case 'weekly':
      const daysUntilNext = (schedule.dayOfWeek - now.getDay() + 7) % 7 || 7;
      nextRun.setDate(now.getDate() + daysUntilNext);
      nextRun.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1);
      nextRun.setDate(schedule.dayOfMonth || 1);
      nextRun.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
      break;
    default:
      nextRun.setDate(now.getDate() + 1);
  }

  return Timestamp.fromDate(nextRun);
};

export default {
  customReport: customReportAPI,
  scheduledReport: scheduledReportAPI
};


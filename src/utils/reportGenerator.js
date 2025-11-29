/**
 * Client Reports Generator
 * Generates reports based on Client logs and data
 */

import { getPatientLogs, getLogsByCategory, getLogsByClinician } from './patientLogger';
import { getPatientByPatientId, getAllClients } from '../api/patientsAPI';

/**
 * Generate activity report for a Client
 * @param {string} clientId - Client simple ID (e.g., UC-2025-0001)
 * @param {Date} startDate - Start date for report
 * @param {Date} endDate - End date for report
 * @returns {Promise<Object>} Activity report data
 */
export const generatePatientActivityReport = async (clientId, startDate, endDate) => {
  try {
    const logs = await getPatientLogs(clientId, 1000); // Get more logs for report
    
    // Filter by date range
    const filteredLogs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });

    // Group by category
    const byCategory = {};
    filteredLogs.forEach(log => {
      const category = log.category || 'general';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(log);
    });

    // Group by clinician
    const byClinician = {};
    filteredLogs.forEach(log => {
      const clinicianId = log.clinicianId;
      if (!byClinician[clinicianId]) {
        byClinician[clinicianId] = {
          name: log.clinicianName,
          role: log.clinicianRole,
          count: 0,
          logs: []
        };
      }
      byClinician[clinicianId].count++;
      byClinician[clinicianId].logs.push(log);
    });

    // Calculate statistics
    const stats = {
      totalActivities: filteredLogs.length,
      byCategory: Object.keys(byCategory).map(cat => ({
        category: cat,
        count: byCategory[cat].length,
        percentage: ((byCategory[cat].length / filteredLogs.length) * 100).toFixed(1)
      })),
      byClinician: Object.values(byClinician).map(clin => ({
        name: clin.name,
        role: clin.role,
        count: clin.count,
        percentage: ((clin.count / filteredLogs.length) * 100).toFixed(1)
      })),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    };

    return {
      clientId,
      reportDate: new Date().toISOString(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      statistics: stats,
      logs: filteredLogs,
      byCategory,
      byClinician
    };
  } catch (error) {
    console.error('Error generating Client activity report:', error);
    throw error;
  }
};

/**
 * Generate clinician activity report
 * @param {string} clinicianId - Clinician user ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Clinician report data
 */
export const generateClinicianActivityReport = async (clinicianId, startDate, endDate) => {
  try {
    const logs = await getLogsByClinician(clinicianId, 1000);
    
    // Filter by date range
    const filteredLogs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });

    // Group by Client
    const byPatient = {};
    filteredLogs.forEach(log => {
      const clientId = log.clientId;
      if (!byPatient[clientId]) {
        byPatient[clientId] = {
          clientId,
          count: 0,
          logs: []
        };
      }
      byPatient[clientId].count++;
      byPatient[clientId].logs.push(log);
    });

    // Group by activity type
    const byActivity = {};
    filteredLogs.forEach(log => {
      const action = log.action || 'unknown';
      if (!byActivity[action]) {
        byActivity[action] = 0;
      }
      byActivity[action]++;
    });

    return {
      clinicianId,
      reportDate: new Date().toISOString(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      statistics: {
        totalActivities: filteredLogs.length,
        uniquePatients: Object.keys(byPatient).length,
        byActivity
      },
      logs: filteredLogs,
      byPatient: Object.values(byPatient)
    };
  } catch (error) {
    console.error('Error generating clinician activity report:', error);
    throw error;
  }
};

/**
 * Generate institution-wide activity report
 * @param {string} institutionId - Institution ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Institution report data
 */
export const generateInstitutionActivityReport = async (institutionId, startDate, endDate) => {
  try {
    const clients = await getAllClients(institutionId);
    
    // Get logs for all clients
    const allLogs = [];
    for (const Client of clients) {
      try {
        const clientId = client.clientId || client.id;
        const logs = await getPatientLogs(clientId, 500);
        const filteredLogs = logs.filter(log => {
          const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
          return logDate >= startDate && logDate <= endDate;
        });
        allLogs.push(...filteredLogs);
      } catch (error) {
        console.warn(`Could not fetch logs for Client ${client.id}:`, error);
      }
    }

    // Group by category
    const byCategory = {};
    allLogs.forEach(log => {
      const category = log.category || 'general';
      if (!byCategory[category]) {
        byCategory[category] = 0;
      }
      byCategory[category]++;
    });

    // Group by clinician
    const byClinician = {};
    allLogs.forEach(log => {
      const clinicianId = log.clinicianId;
      if (!byClinician[clinicianId]) {
        byClinician[clinicianId] = {
          name: log.clinicianName,
          role: log.clinicianRole,
          count: 0
        };
      }
      byClinician[clinicianId].count++;
    });

    return {
      institutionId,
      reportDate: new Date().toISOString(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      statistics: {
        totalActivities: allLogs.length,
        totalPatients: clients.length,
        byCategory,
        byClinician: Object.values(byClinician)
      },
      logs: allLogs
    };
  } catch (error) {
    console.error('Error generating institution activity report:', error);
    throw error;
  }
};

/**
 * Export report data to CSV format
 * @param {Object} reportData - Report data object
 * @param {string} filename - Output filename
 */
export const exportReportToCSV = (reportData, filename = 'Client-report.csv') => {
  try {
    if (!reportData.logs || reportData.logs.length === 0) {
      throw new Error('No log data to export');
    }

    // CSV headers
    const headers = [
      'Date',
      'Time',
      'Client ID',
      'Clinician Name',
      'Clinician Role',
      'Activity Type',
      'Category',
      'Description',
      'Details'
    ];

    // CSV rows
    const rows = reportData.logs.map(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
      return [
        logDate.toISOString().split('T')[0],
        logDate.toTimeString().split(' ')[0],
        log.clientId || '',
        log.clinicianName || '',
        log.clinicianRole || '',
        log.action || '',
        log.category || '',
        log.description || '',
        JSON.stringify(log.details || {})
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error exporting report to CSV:', error);
    throw error;
  }
};

/**
 * Export report data to JSON format
 * @param {Object} reportData - Report data object
 * @param {string} filename - Output filename
 */
export const exportReportToJSON = (reportData, filename = 'Client-report.json') => {
  try {
    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error exporting report to JSON:', error);
    throw error;
  }
};

export default {
  generatePatientActivityReport,
  generateClinicianActivityReport,
  generateInstitutionActivityReport,
  exportReportToCSV,
  exportReportToJSON
};


/**
 * Hospital Operations Data Exporter
 * Exports hospital operations data (beds, incidents, shifts) to CSV format
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} headers - Array of header objects { key, label }
 * @returns {string} CSV string
 */
function arrayToCSV(data, headers) {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return headers.map(h => {
      const value = item[h.key];
      if (value === null || value === undefined) {
        return '""';
      }
      // Handle dates
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      // Handle objects (stringify)
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape quotes in strings
      const stringValue = String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export bed status to CSV
 * @param {Array} beds - Array of bed objects
 * @param {string} filename - Optional filename
 */
export function exportBedStatus(beds, filename = null) {
  const headers = [
    { key: 'bedNumber', label: 'Bed Number' },
    { key: 'department', label: 'Department' },
    { key: 'floor', label: 'Floor' },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'Status' },
    { key: 'roomType', label: 'Room Type' },
    { key: 'patientName', label: 'Patient Name' },
    { key: 'patientId', label: 'Patient ID' },
    { key: 'occupiedAt', label: 'Occupied At' },
    { key: 'lastUpdated', label: 'Last Updated' },
    { key: 'notes', label: 'Notes' },
  ];

  const csvContent = arrayToCSV(beds, headers);
  const defaultFilename = `bed-status-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}

/**
 * Export incidents to CSV
 * @param {Array} incidents - Array of incident objects
 * @param {string} filename - Optional filename
 */
export function exportIncidents(incidents, filename = null) {
  const headers = [
    { key: 'type', label: 'Type' },
    { key: 'severity', label: 'Severity' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' },
    { key: 'location', label: 'Location' },
    { key: 'department', label: 'Department' },
    { key: 'reportedBy', label: 'Reported By' },
    { key: 'reportedAt', label: 'Reported At' },
    { key: 'resolvedAt', label: 'Resolved At' },
    { key: 'notes', label: 'Notes' },
  ];

  const csvContent = arrayToCSV(incidents, headers);
  const defaultFilename = `incidents-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}

/**
 * Export shifts to CSV
 * @param {Array} shifts - Array of shift objects
 * @param {string} filename - Optional filename
 */
export function exportShifts(shifts, filename = null) {
  const headers = [
    { key: 'staffName', label: 'Staff Name' },
    { key: 'staffId', label: 'Staff ID' },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'endTime', label: 'End Time' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ];

  const csvContent = arrayToCSV(shifts, headers);
  const defaultFilename = `shifts-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}

/**
 * Export hospital summary report
 * @param {Object} summary - Hospital summary object
 * @param {Array} beds - Array of bed objects
 * @param {Array} incidents - Array of incident objects
 * @param {string} filename - Optional filename
 */
export function exportHospitalSummary(summary, beds, incidents, filename = null) {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalBeds: summary?.totalBeds || 0,
      occupiedBeds: summary?.occupiedBeds || 0,
      availableBeds: summary?.availableBeds || 0,
      openIncidents: summary?.openIncidents || 0,
      staffOnDuty: summary?.staffOnDuty || 0,
      patientCensus: summary?.patientCensus || 0,
    },
    beds: beds || [],
    incidents: incidents || [],
  };

  const bedsCSV = beds && beds.length > 0 ? arrayToCSV(beds, [
    { key: 'bedNumber', label: 'Bed Number' },
    { key: 'department', label: 'Department' },
    { key: 'floor', label: 'Floor' },
    { key: 'status', label: 'Status' },
  ]) : 'No beds data';
  
  const incidentsCSV = incidents && incidents.length > 0 ? arrayToCSV(incidents, [
    { key: 'type', label: 'Type' },
    { key: 'severity', label: 'Severity' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Reported At' },
  ]) : 'No incidents data';

  const csvContent = `Hospital Operations Summary Report
Generated: ${report.generatedAt}

Summary
Total Beds,${report.summary.totalBeds}
Occupied Beds,${report.summary.occupiedBeds}
Available Beds,${report.summary.availableBeds}
Open Incidents,${report.summary.openIncidents}
Staff On Duty,${report.summary.staffOnDuty}
Patient Census,${report.summary.patientCensus}

Beds
${bedsCSV}

Incidents
${incidentsCSV}
`;

  const defaultFilename = `hospital-summary-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}

/**
 * Format date for display
 * @param {Date|Timestamp|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return date.toLocaleString();
  }
  if (date?.toDate) {
    return date.toDate().toLocaleString();
  }
  if (typeof date === 'string') {
    return new Date(date).toLocaleString();
  }
  return String(date);
}

export default {
  exportBedStatus,
  exportIncidents,
  exportShifts,
  exportHospitalSummary,
};


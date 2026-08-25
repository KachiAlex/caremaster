/**
 * Export Service
 * Provides utility functions for exporting data to various formats
 */

import * as XLSX from 'xlsx';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional array of column definitions [{key: 'field', label: 'Label'}]
 */
export const exportToCSV = (data, filename = 'export', columns = null) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // If columns are provided, use them; otherwise use all keys from first object
  const headers = columns 
    ? columns.map(col => col.label || col.key)
    : Object.keys(data[0]);

  const keys = columns
    ? columns.map(col => col.key)
    : Object.keys(data[0]);

  // Create CSV content
  const csvRows = [
    headers.join(','),
    ...data.map(row => {
      return keys.map(key => {
        const value = getNestedValue(row, key);
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * Export data to Excel
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional array of column definitions
 * @param {string} sheetName - Name of the Excel sheet
 */
export const exportToExcel = (data, filename = 'export', columns = null, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Prepare data for Excel
  const keys = columns
    ? columns.map(col => col.key)
    : Object.keys(data[0]);

  const excelData = data.map(row => {
    const excelRow = {};
    keys.forEach(key => {
      const value = getNestedValue(row, key);
      excelRow[columns ? columns.find(c => c.key === key)?.label || key : key] = value || '';
    });
    return excelRow;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export data to JSON
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 */
export const exportToJSON = (data, filename = 'export') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot notation path (e.g., 'user.email')
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      // Handle Database Timestamps
      if (current[key]?.toDate) {
        return current[key].toDate().toLocaleString();
      }
      return current[key];
    }
    return undefined;
  }, obj);
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename
 */
const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format date for export
 * @param {Date|Timestamp|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForExport = (date) => {
  if (!date) return '';
  if (date.toDate) return date.toDate().toLocaleString();
  if (date instanceof Date) return date.toLocaleString();
  return new Date(date).toLocaleString();
};


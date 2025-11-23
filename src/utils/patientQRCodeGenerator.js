/**
 * Patient QR Code Generator Utility
 * 
 * Generates QR codes for patient identification cards
 */

import QRCode from 'qrcode.react';

/**
 * Generate QR code data for a patient
 * @param {string} patientId - Patient ID (e.g., UC-2025-0001)
 * @param {string} institutionId - Institution ID
 * @param {Object} patientData - Additional patient data
 * @returns {string} QR code data URL
 */
export const generatePatientQRCodeData = (patientId, institutionId, patientData = {}) => {
  // Create QR code payload with patient information
  const qrData = {
    patientId,
    institutionId,
    name: patientData.name || patientData.fullName || '',
    phone: patientData.phone || '',
    dateOfBirth: patientData.dateOfBirth || '',
    // Add timestamp for validation
    generatedAt: new Date().toISOString()
  };

  // Convert to JSON string
  return JSON.stringify(qrData);
};

/**
 * Generate QR code URL for patient card
 * @param {string} patientId - Patient ID
 * @param {string} institutionId - Institution ID
 * @param {Object} patientData - Patient data
 * @returns {string} QR code data URL
 */
export const generatePatientQRCodeURL = async (patientId, institutionId, patientData = {}) => {
  try {
    const qrData = generatePatientQRCodeData(patientId, institutionId, patientData);
    
    // Use QRCode library to generate data URL
    // Note: This is a client-side generation
    // For server-side, use: const QRCode = require('qrcode');
    // const dataUrl = await QRCode.toDataURL(qrData);
    
    return qrData;
  } catch (error) {
    console.error('Error generating QR code URL:', error);
    throw error;
  }
};

/**
 * Parse QR code data
 * @param {string} qrData - QR code data string
 * @returns {Object} Parsed patient data
 */
export const parsePatientQRCode = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    return {
      patientId: data.patientId,
      institutionId: data.institutionId,
      name: data.name,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      generatedAt: data.generatedAt
    };
  } catch (error) {
    console.error('Error parsing QR code:', error);
    throw new Error('Invalid QR code data');
  }
};

/**
 * Validate QR code data
 * @param {string} qrData - QR code data string
 * @param {string} institutionId - Expected institution ID
 * @returns {boolean} True if valid
 */
export const validatePatientQRCode = (qrData, institutionId) => {
  try {
    const data = parsePatientQRCode(qrData);
    
    // Check if institution matches
    if (data.institutionId !== institutionId) {
      return false;
    }
    
    // Check if QR code is not too old (optional - 1 year validity)
    const generatedAt = new Date(data.generatedAt);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (generatedAt < oneYearAgo) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * React component for displaying patient QR code
 * Note: This is exported separately for React component usage
 * Import QRCode from 'qrcode.react' in the component file instead
 */
export const PatientQRCodeComponent = ({ patientId, institutionId, patientData = {}, size = 200 }) => {
  const qrData = generatePatientQRCodeData(patientId, institutionId, patientData);
  
  // Note: QRCode component should be imported in the component file
  // This is just a placeholder - actual implementation in CreatePatientModal
  return null;
};

export default {
  generatePatientQRCodeData,
  generatePatientQRCodeURL,
  parsePatientQRCode,
  validatePatientQRCode,
  PatientQRCode
};


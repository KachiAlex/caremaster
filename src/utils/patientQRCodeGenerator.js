/**
 * Client QR Code Generator Utility
 * 
 * Generates QR codes for Client identification cards
 */

/**
 * Generate QR code data for a Client
 * @param {string} clientId - Client ID (e.g., UC-2025-0001)
 * @param {string} institutionId - Institution ID
 * @param {Object} clientData - Additional Client data
 * @returns {string} QR code data URL
 */
export const generateClientQRCodeData = (clientId, institutionId, clientData = {}) => {
  // Create QR code payload with Client information
  const qrData = {
    clientId,
    institutionId,
    name: clientData.name || clientData.fullName || '',
    phone: clientData.phone || '',
    dateOfBirth: clientData.dateOfBirth || '',
    // Add timestamp for validation
    generatedAt: new Date().toISOString()
  };

  // Convert to JSON string
  return JSON.stringify(qrData);
};

/**
 * Generate QR code URL for Client card
 * @param {string} clientId - Client ID
 * @param {string} institutionId - Institution ID
 * @param {Object} clientData - Client data
 * @returns {string} QR code data URL
 */
export const generatePatientQRCodeURL = async (clientId, institutionId, clientData = {}) => {
  try {
    const qrData = generateClientQRCodeData(clientId, institutionId, clientData);
    
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
 * @returns {Object} Parsed Client data
 */
export const parsePatientQRCode = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    return {
      clientId: data.clientId,
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
 * React component for displaying Client QR code
 * Note: This is exported separately for React component usage
 * Import QRCode from 'qrcode.react' in the component file instead
 */
export const PatientQRCodeComponent = ({ clientId, institutionId, clientData = {}, size = 200 }) => {
  const qrData = generateClientQRCodeData(clientId, institutionId, clientData);
  
  // Note: QRCode component should be imported in the component file
  // This is just a placeholder - actual implementation in CreateClientModal
  return null;
};

export default {
  generateClientQRCodeData,
  generatePatientQRCodeURL,
  parsePatientQRCode,
  validatePatientQRCode,
  PatientQRCodeComponent
};


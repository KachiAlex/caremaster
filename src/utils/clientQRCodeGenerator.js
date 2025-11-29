// Client QR Code Generator Utility
// Generates QR code data for client identification

/**
 * Generate QR code data for a client
 * @param {string} clientId - The client ID
 * @param {Object} clientData - Additional client data
 * @returns {string} - QR code data string
 */
export const generateClientQRCodeData = (clientId, clientData = {}) => {
  const qrData = {
    clientId,
    name: clientData.name || clientData.fullName || '',
    institutionId: clientData.institutionId || '',
    timestamp: new Date().toISOString()
  };
  
  return JSON.stringify(qrData);
};


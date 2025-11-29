// Client ID Generator Utility
// Generates unique client IDs for new client registrations

/**
 * Generate a unique client ID
 * @param {string} institutionId - Optional institution ID to include in the ID
 * @returns {Promise<string>} - Generated client ID
 */
export const generateClientId = async (institutionId = null) => {
  // Generate a timestamp-based ID
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Format: INST-YYYYMMDD-RRRR or CLT-YYYYMMDD-RRRR
  const prefix = institutionId ? `INST-${institutionId.slice(0, 4)}` : 'CLT';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  return `${prefix}-${date}-${random}`;
};


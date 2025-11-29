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

/**
 * Validate Client ID format
 * Supports both formats: UC-YYYY-NNNN and CLT-YYYYMMDD-RRRR
 * @param {string} clientId - Client ID to validate
 * @returns {boolean} - True if valid format
 */
export function isValidPatientId(clientId) {
  if (!clientId || typeof clientId !== 'string') return false;
  
  // Pattern 1: UC-YYYY-NNNN (3 parts: UC, YYYY, NNNN)
  const ucPattern = /^UC-\d{4}-\d{4}$/;
  if (ucPattern.test(clientId)) return true;
  
  // Pattern 2: UC-XXXX-YYYY-NNNN (4 parts: UC, XXXX, YYYY, NNNN - with institution prefix)
  const ucInstitutionPattern = /^UC-[A-Z0-9]{4}-\d{4}-\d{4}$/;
  if (ucInstitutionPattern.test(clientId)) return true;
  
  // Pattern 3: CLT-YYYYMMDD-RRRR or INST-XXXX-YYYYMMDD-RRRR
  const cltPattern = /^(CLT|INST-[A-Z0-9]{4})-\d{8}-\d{4}$/;
  if (cltPattern.test(clientId)) return true;
  
  return false;
}

/**
 * Extract year from Client ID
 * @param {string} clientId - Client ID
 * @returns {number|null} - Year or null if invalid
 */
export function extractYearFromPatientId(clientId) {
  if (!clientId || typeof clientId !== 'string') return null;
  
  const parts = clientId.split('-');
  
  // UC-YYYY-NNNN format (3 parts: UC, YYYY, NNNN)
  if (parts.length === 3 && parts[0] === 'UC') {
    const year = parseInt(parts[1], 10);
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      return year;
    }
  }
  
  // UC-XXXX-YYYY-NNNN format (4 parts: UC, XXXX, YYYY, NNNN - with institution)
  if (parts.length === 4 && parts[0] === 'UC') {
    const year = parseInt(parts[2], 10);
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      return year;
    }
  }
  
  // CLT-YYYYMMDD-RRRR format - extract year from YYYYMMDD
  if (parts.length === 3 && parts[0] === 'CLT') {
    const dateStr = parts[1];
    if (dateStr.length >= 4) {
      const year = parseInt(dateStr.substring(0, 4), 10);
      if (!isNaN(year) && year >= 2000 && year <= 2100) {
        return year;
      }
    }
  }
  
  // INST-XXXX-YYYYMMDD-RRRR format
  if (parts.length === 4 && parts[0] === 'INST') {
    const dateStr = parts[2];
    if (dateStr && dateStr.length >= 4) {
      const year = parseInt(dateStr.substring(0, 4), 10);
      if (!isNaN(year) && year >= 2000 && year <= 2100) {
        return year;
      }
    }
  }
  
  return null;
}


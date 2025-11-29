/**
 * Client ID Generator
 * 
 * Generates simple, memorable Client IDs for hospital operations
 * Format: UC-YYYY-NNNN (e.g., UC-2025-0001)
 * - UC: ElderX prefix
 * - YYYY: Year of registration
 * - NNNN: Sequential number (4 digits, zero-padded)
 */

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Generate a simple, memorable Client ID
 * @param {string} institutionId - Optional institution ID for institution-specific numbering
 * @returns {Promise<string>} - Generated Client ID (e.g., "UC-2025-0001")
 */
export async function generateClientId(institutionId = null) {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = institutionId ? `UC-${institutionId.slice(0, 4).toUpperCase()}-${currentYear}` : `UC-${currentYear}`;
    
    // Query for existing Client IDs with this prefix
    const patientsRef = collection(db, 'clients');
    const yearPrefix = institutionId 
      ? `${institutionId.slice(0, 4).toUpperCase()}-${currentYear}`
      : currentYear.toString();
    
    // Get the highest existing number for this year
    let maxNumber = 0;
    
    try {
      // Query clients with matching prefix pattern
      const allPatients = await getDocs(patientsRef);
      allPatients.forEach((doc) => {
        const data = doc.data();
        const clientId = data.clientId || data.id;
        
        if (clientId && typeof clientId === 'string') {
          // Check if it matches our pattern
          if (institutionId) {
            const pattern = new RegExp(`^UC-${institutionId.slice(0, 4).toUpperCase()}-${currentYear}-(\\d+)$`);
            const match = clientId.match(pattern);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          } else {
            const pattern = new RegExp(`^UC-${currentYear}-(\\d+)$`);
            const match = clientId.match(pattern);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          }
        }
      });
    } catch (error) {
      console.warn('Error checking existing Client IDs, starting from 1:', error);
    }
    
    // Generate next sequential number
    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    
    const clientId = `${prefix}-${paddedNumber}`;
    
    console.log(`✅ Generated Client ID: ${clientId}`);
    return clientId;
  } catch (error) {
    console.error('Error generating Client ID:', error);
    // Fallback: use timestamp-based ID
    const fallbackId = `UC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    console.warn(`⚠️ Using fallback Client ID: ${fallbackId}`);
    return fallbackId;
  }
}

/**
 * Validate Client ID format
 * @param {string} clientId - Client ID to validate
 * @returns {boolean} - True if valid format
 */
export function isValidPatientId(clientId) {
  if (!clientId || typeof clientId !== 'string') return false;
  
  // Pattern: UC-YYYY-NNNN or UC-XXXX-YYYY-NNNN (with institution prefix)
  const pattern = /^UC-(\d{4}|[A-Z0-9]{4})-\d{4}-\d{4}$/;
  return pattern.test(clientId);
}

/**
 * Extract year from Client ID
 * @param {string} clientId - Client ID
 * @returns {number|null} - Year or null if invalid
 */
export function extractYearFromPatientId(clientId) {
  if (!isValidPatientId(clientId)) return null;
  
  const parts = clientId.split('-');
  if (parts.length === 3) {
    // UC-YYYY-NNNN format
    return parseInt(parts[1], 10);
  } else if (parts.length === 4) {
    // UC-XXXX-YYYY-NNNN format (with institution)
    return parseInt(parts[2], 10);
  }
  
  return null;
}

export default {
  generateClientId,
  isValidPatientId,
  extractYearFromPatientId
};


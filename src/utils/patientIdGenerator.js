/**
 * Patient ID Generator
 * 
 * Generates simple, memorable patient IDs for hospital operations
 * Format: UC-YYYY-NNNN (e.g., UC-2025-0001)
 * - UC: UltimateCare prefix
 * - YYYY: Year of registration
 * - NNNN: Sequential number (4 digits, zero-padded)
 */

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Generate a simple, memorable patient ID
 * @param {string} institutionId - Optional institution ID for institution-specific numbering
 * @returns {Promise<string>} - Generated patient ID (e.g., "UC-2025-0001")
 */
export async function generatePatientId(institutionId = null) {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = institutionId ? `UC-${institutionId.slice(0, 4).toUpperCase()}-${currentYear}` : `UC-${currentYear}`;
    
    // Query for existing patient IDs with this prefix
    const patientsRef = collection(db, 'patients');
    const yearPrefix = institutionId 
      ? `${institutionId.slice(0, 4).toUpperCase()}-${currentYear}`
      : currentYear.toString();
    
    // Get the highest existing number for this year
    let maxNumber = 0;
    
    try {
      // Query patients with matching prefix pattern
      const allPatients = await getDocs(patientsRef);
      allPatients.forEach((doc) => {
        const data = doc.data();
        const patientId = data.patientId || data.id;
        
        if (patientId && typeof patientId === 'string') {
          // Check if it matches our pattern
          if (institutionId) {
            const pattern = new RegExp(`^UC-${institutionId.slice(0, 4).toUpperCase()}-${currentYear}-(\\d+)$`);
            const match = patientId.match(pattern);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          } else {
            const pattern = new RegExp(`^UC-${currentYear}-(\\d+)$`);
            const match = patientId.match(pattern);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          }
        }
      });
    } catch (error) {
      console.warn('Error checking existing patient IDs, starting from 1:', error);
    }
    
    // Generate next sequential number
    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    
    const patientId = `${prefix}-${paddedNumber}`;
    
    console.log(`✅ Generated patient ID: ${patientId}`);
    return patientId;
  } catch (error) {
    console.error('Error generating patient ID:', error);
    // Fallback: use timestamp-based ID
    const fallbackId = `UC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    console.warn(`⚠️ Using fallback patient ID: ${fallbackId}`);
    return fallbackId;
  }
}

/**
 * Validate patient ID format
 * @param {string} patientId - Patient ID to validate
 * @returns {boolean} - True if valid format
 */
export function isValidPatientId(patientId) {
  if (!patientId || typeof patientId !== 'string') return false;
  
  // Pattern: UC-YYYY-NNNN or UC-XXXX-YYYY-NNNN (with institution prefix)
  const pattern = /^UC-(\d{4}|[A-Z0-9]{4})-\d{4}-\d{4}$/;
  return pattern.test(patientId);
}

/**
 * Extract year from patient ID
 * @param {string} patientId - Patient ID
 * @returns {number|null} - Year or null if invalid
 */
export function extractYearFromPatientId(patientId) {
  if (!isValidPatientId(patientId)) return null;
  
  const parts = patientId.split('-');
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
  generatePatientId,
  isValidPatientId,
  extractYearFromPatientId
};


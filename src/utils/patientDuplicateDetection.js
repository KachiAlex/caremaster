import { collection, query, getDocs, where } from 'backend/database';
import { db } from '../backend/config';
/**
 * Client Duplicate Detection Utility
 * 
 * Advanced duplicate detection for Client registration
 */


const CLIENTS_COLLECTION = 'clients';

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance algorithm
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
};

/**
 * Normalize phone number for comparison
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
};

/**
 * Normalize date of birth for comparison
 */
const normalizeDateOfBirth = (dob) => {
  if (!dob) return '';
  // Convert to YYYY-MM-DD format
  if (dob instanceof Date) {
    return dob.toISOString().split('T')[0];
  }
  if (typeof dob === 'string') {
    return dob.split('T')[0];
  }
  return '';
};

/**
 * Check for duplicate clients
 * @param {Object} clientData - New Client data
 * @param {string} institutionId - Institution ID
 * @returns {Promise<Object>} Duplicate detection results
 */
export const checkForDuplicates = async (clientData, institutionId) => {
  try {
    const {
      name,
      fullName,
      phone,
      email,
      dateOfBirth,
      nationalId
    } = clientData;

    const potentialDuplicates = [];
    const exactMatches = [];
    const similarMatches = [];

    // Build queries for potential duplicates
    const queries = [];

    // Query by phone (exact match)
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone.length >= 10) {
        // Get all clients with similar phone numbers
        const phoneQuery = query(
          collection(db, CLIENTS_COLLECTION),
          where('institutionId', '==', institutionId)
        );
        queries.push({ type: 'phone', query: phoneQuery, value: normalizedPhone });
      }
    }

    // Query by email (exact match)
    if (email) {
      const emailQuery = query(
        collection(db, CLIENTS_COLLECTION),
        where('institutionId', '==', institutionId),
        where('email', '==', email.toLowerCase().trim())
      );
      queries.push({ type: 'email', query: emailQuery, value: email.toLowerCase().trim() });
    }

    // Query by national ID (exact match)
    if (nationalId) {
      const nationalIdQuery = query(
        collection(db, CLIENTS_COLLECTION),
        where('institutionId', '==', institutionId),
        where('nationalId', '==', nationalId.trim())
      );
      queries.push({ type: 'nationalId', query: nationalIdQuery, value: nationalId.trim() });
    }

    // Execute all queries
    const allPatients = new Map();
    
    for (const { query: q, type, value } of queries) {
      try {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const Client = { id: doc.id, ...doc.data() };
          if (!allPatients.has(client.id)) {
            allPatients.set(client.id, Client);
          }
        });
      } catch (error) {
        console.warn(`Error executing ${type} query:`, error);
      }
    }

    // If no queries, get all clients for name/DOB comparison (limited)
    if (queries.length === 0 && (name || fullName || dateOfBirth)) {
      const allPatientsQuery = query(
        collection(db, CLIENTS_COLLECTION),
        where('institutionId', '==', institutionId)
      );
      const snapshot = await getDocs(allPatientsQuery);
      snapshot.forEach(doc => {
        const Client = { id: doc.id, ...doc.data() };
        allPatients.set(client.id, Client);
      });
    }

    // Compare with all found clients
    const clientName = name || fullName || '';
    const normalizedNewPhone = phone ? normalizePhone(phone) : '';
    const normalizedNewDOB = normalizeDateOfBirth(dateOfBirth);

    for (const [clientId, existingPatient] of allPatients) {
      const existingName = existingPatient.name || existingPatient.fullName || '';
      const existingPhone = existingPatient.phone ? normalizePhone(existingPatient.phone) : '';
      const existingEmail = (existingPatient.email || '').toLowerCase().trim();
      const existingDOB = normalizeDateOfBirth(existingPatient.dateOfBirth);
      const existingNationalId = existingPatient.nationalId || '';

      let matchScore = 0;
      let matchReasons = [];

      // Exact matches
      if (phone && existingPhone && normalizedNewPhone === existingPhone) {
        matchScore += 0.4;
        matchReasons.push('Phone number');
      }

      if (email && existingEmail === email.toLowerCase().trim()) {
        matchScore += 0.4;
        matchReasons.push('Email address');
      }

      if (nationalId && existingNationalId === nationalId.trim()) {
        matchScore += 0.5;
        matchReasons.push('National ID');
      }

      // Name similarity
      if (clientName && existingName) {
        const nameSimilarity = calculateSimilarity(clientName, existingName);
        if (nameSimilarity > 0.8) {
          matchScore += nameSimilarity * 0.3;
          matchReasons.push(`Name similarity: ${Math.round(nameSimilarity * 100)}%`);
        }
      }

      // Date of birth match
      if (normalizedNewDOB && existingDOB && normalizedNewDOB === existingDOB) {
        matchScore += 0.2;
        matchReasons.push('Date of birth');
      }

      // Phone similarity (partial match)
      if (normalizedNewPhone && existingPhone && normalizedNewPhone.length >= 10) {
        const phoneSimilarity = calculateSimilarity(normalizedNewPhone, existingPhone);
        if (phoneSimilarity > 0.7 && phoneSimilarity < 1.0) {
          matchScore += phoneSimilarity * 0.2;
          matchReasons.push(`Phone similarity: ${Math.round(phoneSimilarity * 100)}%`);
        }
      }

      if (matchScore > 0) {
        const match = {
          clientId: existingPatient.clientId || clientId,
          clientName: existingName,
          matchScore: Math.min(matchScore, 1.0),
          matchReasons,
          clientData: existingPatient
        };

        if (matchScore >= 0.8) {
          exactMatches.push(match);
        } else if (matchScore >= 0.5) {
          similarMatches.push(match);
        }

        potentialDuplicates.push(match);
      }
    }

    // Sort by match score
    exactMatches.sort((a, b) => b.matchScore - a.matchScore);
    similarMatches.sort((a, b) => b.matchScore - a.matchScore);
    potentialDuplicates.sort((a, b) => b.matchScore - a.matchScore);

    return {
      hasDuplicates: potentialDuplicates.length > 0,
      hasExactMatches: exactMatches.length > 0,
      exactMatches,
      similarMatches,
      allMatches: potentialDuplicates,
      recommendation: getRecommendation(exactMatches, similarMatches)
    };
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    throw error;
  }
};

/**
 * Get recommendation based on duplicate detection results
 */
const getRecommendation = (exactMatches, similarMatches) => {
  if (exactMatches.length > 0) {
    return {
      action: 'block',
      message: `Found ${exactMatches.length} exact match(es). This may be a duplicate client.`,
      severity: 'high'
    };
  }

  if (similarMatches.length > 0) {
    return {
      action: 'warn',
      message: `Found ${similarMatches.length} similar Client(s). Please review before proceeding.`,
      severity: 'medium'
    };
  }

  return {
    action: 'proceed',
    message: 'No duplicates found. You can proceed with registration.',
    severity: 'low'
  };
};

/**
 * Check if Client should be blocked from registration
 * @param {Object} duplicateResults - Results from checkForDuplicates
 * @returns {boolean} True if should be blocked
 */
export const shouldBlockRegistration = (duplicateResults) => {
  if (!duplicateResults) return false;
  return duplicateResults.hasExactMatches && duplicateResults.recommendation.action === 'block';
};

export default {
  checkForDuplicates,
  shouldBlockRegistration,
  calculateSimilarity
};


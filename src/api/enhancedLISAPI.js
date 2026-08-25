/**
 * Enhanced LIS (Laboratory Information System) API
 * 
 * Phase 2 Implementation - Enhanced lab workflow:
 * - Barcode sample labeling
 * - Sample tracking workflow (collected → in process → completed)
 * - Automated normal range comparisons
 * - Pathologist verification workflow
 * - Auto-notification of completed results
 * - Lab test result attachments (PDF, image)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';
import { notificationsAPI } from './notificationsAPI';
import { updateDiagnosticTest } from './diagnosticsAPI';

const LAB_SAMPLES_COLLECTION = 'labSamples';
const LAB_RESULTS_COLLECTION = 'labResults';
const NORMAL_RANGES_COLLECTION = 'normalRanges';

// Sample status
export const SAMPLE_STATUS = {
  COLLECTED: 'collected',
  IN_PROCESS: 'in_process',
  COMPLETED: 'completed',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// Test result status
export const RESULT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

/**
 * Generate barcode for sample
 */
export const generateSampleBarcode = (institutionId, testId) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `LAB-${institutionId.substring(0, 4).toUpperCase()}-${testId.substring(0, 6)}-${timestamp}-${random}`;
};

/**
 * Create lab sample with barcode
 */
export const createLabSample = async (sampleData) => {
  try {
    const {
      testId,
      clientId,
      clientName,
      institutionId,
      testType,
      testName,
      collectedBy,
      collectedByName,
      collectionDate = new Date().toISOString(),
      sampleType = 'blood', // blood, urine, stool, sputum, etc.
      sampleVolume = null,
      collectionSite = null,
      notes = ''
    } = sampleData;

    if (!testId || !clientId || !institutionId || !testType) {
      throw new Error('Missing required fields: testId, clientId, institutionId, testType');
    }

    // Generate barcode
    const barcode = generateSampleBarcode(institutionId, testId);

    const sample = {
      testId,
      clientId,
      clientName,
      institutionId,
      testType,
      testName,
      barcode,
      sampleType,
      sampleVolume,
      collectionSite,
      status: SAMPLE_STATUS.COLLECTED,
      collectedBy,
      collectedByName,
      collectionDate,
      inProcessAt: null,
      completedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      verifiedByName: null,
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const sampleRef = await addDoc(collection(db, LAB_SAMPLES_COLLECTION), sample);

    // Update diagnostic test with sample ID and barcode
    try {
      await updateDiagnosticTest(testId, {
        sampleId: sampleRef.id,
        barcode,
        sampleStatus: SAMPLE_STATUS.COLLECTED
      });
    } catch (updateError) {
      console.warn('Failed to update diagnostic test with sample info:', updateError);
    }

    return {
      id: sampleRef.id,
      ...sample,
      barcode
    };
  } catch (error) {
    console.error('Error creating lab sample:', error);
    throw error;
  }
};

/**
 * Update sample status
 */
export const updateSampleStatus = async (sampleId, status, additionalData = {}) => {
  try {
    const sampleRef = doc(db, LAB_SAMPLES_COLLECTION, sampleId);
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    // Add timestamp based on status
    if (status === SAMPLE_STATUS.IN_PROCESS && !additionalData.inProcessAt) {
      updateData.inProcessAt = serverTimestamp();
    } else if (status === SAMPLE_STATUS.COMPLETED && !additionalData.completedAt) {
      updateData.completedAt = serverTimestamp();
    } else if (status === SAMPLE_STATUS.VERIFIED && !additionalData.verifiedAt) {
      updateData.verifiedAt = serverTimestamp();
    }

    await updateDoc(sampleRef, updateData);

    // Get updated sample
    const sampleSnap = await getDoc(sampleRef);
    if (sampleSnap.exists()) {
      return {
        id: sampleSnap.id,
        ...sampleSnap.data(),
        createdAt: sampleSnap.data().createdAt?.toDate?.() || sampleSnap.data().createdAt,
        updatedAt: sampleSnap.data().updatedAt?.toDate?.() || sampleSnap.data().updatedAt,
        collectionDate: sampleSnap.data().collectionDate ? new Date(sampleSnap.data().collectionDate) : null,
        inProcessAt: sampleSnap.data().inProcessAt?.toDate?.() || sampleSnap.data().inProcessAt,
        completedAt: sampleSnap.data().completedAt?.toDate?.() || sampleSnap.data().completedAt,
        verifiedAt: sampleSnap.data().verifiedAt?.toDate?.() || sampleSnap.data().verifiedAt
      };
    }

    return null;
  } catch (error) {
    console.error('Error updating sample status:', error);
    throw error;
  }
};

/**
 * Create lab test result with normal range comparison
 */
export const createLabResult = async (sampleId, resultData) => {
  try {
    const {
      testId,
      clientId,
      institutionId,
      testName,
      results = [], // Array of { parameter, value, unit, normalRange, isAbnormal }
      technicianId,
      technicianName,
      notes = '',
      attachments = []
    } = resultData;

    // Get sample
    const sampleRef = doc(db, LAB_SAMPLES_COLLECTION, sampleId);
    const sampleSnap = await getDoc(sampleRef);
    
    if (!sampleSnap.exists()) {
      throw new Error('Sample not found');
    }

    const sample = sampleSnap.data();

    // Check for abnormal values
    const abnormalResults = results.filter(r => r.isAbnormal === true);
    const hasAbnormal = abnormalResults.length > 0;

    const result = {
      sampleId,
      testId,
      clientId,
      clientName: sample.clientName,
      institutionId,
      testName,
      results,
      hasAbnormal,
      abnormalResults: abnormalResults.map(r => r.parameter),
      technicianId,
      technicianName,
      status: RESULT_STATUS.COMPLETED,
      notes,
      attachments,
      verifiedBy: null,
      verifiedByName: null,
      verifiedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const resultRef = await addDoc(collection(db, LAB_RESULTS_COLLECTION), result);

    // Update sample status
    await updateSampleStatus(sampleId, SAMPLE_STATUS.COMPLETED, {
      resultId: resultRef.id
    });

    // Update diagnostic test
    try {
      await updateDiagnosticTest(testId, {
        status: 'completed',
        results: results,
        resultId: resultRef.id,
        hasAbnormal,
        completedAt: serverTimestamp()
      });
    } catch (updateError) {
      console.warn('Failed to update diagnostic test:', updateError);
    }

    // Auto-notify if abnormal results
    if (hasAbnormal) {
      try {
        // Notify requesting doctor
        const diagnosticRef = doc(db, 'diagnostics', testId);
        const diagnosticSnap = await getDoc(diagnosticRef);
        if (diagnosticSnap.exists()) {
          const diagnostic = diagnosticSnap.data();
          if (diagnostic.orderedBy) {
            await notificationsAPI.createNotification({
              userId: diagnostic.orderedBy,
              type: 'lab_result_abnormal',
              title: 'Abnormal Lab Results',
              message: `Abnormal results detected for ${testName}. Please review.`,
              priority: 'high',
              data: {
                testId,
                resultId: resultRef.id,
                abnormalParameters: abnormalResults.map(r => r.parameter)
              },
              institutionId
            });
          }
        }
      } catch (notifError) {
        console.warn('Failed to send abnormal result notification:', notifError);
      }
    }

    // Notify Client/caregiver of completed results
    try {
      await notificationsAPI.createNotification({
        userId: clientId,
        type: 'lab_result_ready',
        title: 'Lab Results Ready',
        message: `Your ${testName} results are ready for review.`,
        priority: hasAbnormal ? 'high' : 'medium',
        data: {
          testId,
          resultId: resultRef.id,
          hasAbnormal
        },
        institutionId
      });
    } catch (notifError) {
      console.warn('Failed to send result notification:', notifError);
    }

    return {
      id: resultRef.id,
      ...result
    };
  } catch (error) {
    console.error('Error creating lab result:', error);
    throw error;
  }
};

/**
 * Verify lab result (pathologist verification)
 */
export const verifyLabResult = async (resultId, verificationData) => {
  try {
    const {
      verifiedBy,
      verifiedByName,
      verificationNotes = '',
      isApproved = true
    } = verificationData;

    const resultRef = doc(db, LAB_RESULTS_COLLECTION, resultId);
    const resultSnap = await getDoc(resultRef);
    
    if (!resultSnap.exists()) {
      throw new Error('Lab result not found');
    }

    const result = resultSnap.data();
    const newStatus = isApproved ? RESULT_STATUS.VERIFIED : RESULT_STATUS.REJECTED;

    await updateDoc(resultRef, {
      status: newStatus,
      verifiedBy,
      verifiedByName,
      verifiedAt: serverTimestamp(),
      verificationNotes,
      updatedAt: serverTimestamp()
    });

    // Update sample status
    if (result.sampleId) {
      await updateSampleStatus(result.sampleId, isApproved ? SAMPLE_STATUS.VERIFIED : SAMPLE_STATUS.REJECTED, {
        verifiedBy,
        verifiedByName,
        verificationNotes
      });
    }

    return { success: true, resultId, status: newStatus };
  } catch (error) {
    console.error('Error verifying lab result:', error);
    throw error;
  }
};

/**
 * Get normal range for a test parameter
 */
export const getNormalRange = async (institutionId, testType, parameter) => {
  try {
    const rangesQuery = query(
      collection(db, NORMAL_RANGES_COLLECTION),
      where('institutionId', '==', institutionId),
      where('testType', '==', testType),
      where('parameter', '==', parameter),
      limit(1)
    );

    const querySnapshot = await getDocs(rangesQuery);
    
    if (querySnapshot.empty) {
      // Return default ranges if not found
      return getDefaultNormalRange(parameter);
    }

    const rangeData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...rangeData
    };
  } catch (error) {
    console.error('Error fetching normal range:', error);
    return getDefaultNormalRange(parameter);
  }
};

/**
 * Get default normal ranges (fallback)
 */
const getDefaultNormalRange = (parameter) => {
  const defaultRanges = {
    'hemoglobin': { min: 12, max: 16, unit: 'g/dL' },
    'hematocrit': { min: 36, max: 48, unit: '%' },
    'wbc': { min: 4000, max: 11000, unit: '/μL' },
    'rbc': { min: 4.5, max: 5.5, unit: 'million/μL' },
    'platelets': { min: 150000, max: 450000, unit: '/μL' },
    'glucose': { min: 70, max: 100, unit: 'mg/dL' },
    'creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL' },
    'urea': { min: 7, max: 20, unit: 'mg/dL' },
    'alt': { min: 7, max: 56, unit: 'U/L' },
    'ast': { min: 10, max: 40, unit: 'U/L' }
  };

  return defaultRanges[parameter.toLowerCase()] || { min: null, max: null, unit: '' };
};

/**
 * Compare result value with normal range
 */
export const compareWithNormalRange = async (institutionId, testType, parameter, value, unit) => {
  try {
    const normalRange = await getNormalRange(institutionId, testType, parameter);
    
    if (!normalRange.min || !normalRange.max) {
      return {
        isAbnormal: false,
        comparison: 'normal_range_not_available'
      };
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        isAbnormal: false,
        comparison: 'value_not_numeric'
      };
    }

    const isAbnormal = numValue < normalRange.min || numValue > normalRange.max;
    const comparison = isAbnormal 
      ? (numValue < normalRange.min ? 'below_normal' : 'above_normal')
      : 'normal';

    return {
      isAbnormal,
      comparison,
      normalRange: {
        min: normalRange.min,
        max: normalRange.max,
        unit: normalRange.unit || unit
      },
      value: numValue
    };
  } catch (error) {
    console.error('Error comparing with normal range:', error);
    return {
      isAbnormal: false,
      comparison: 'error'
    };
  }
};

/**
 * Get lab samples
 */
export const getLabSamples = async (institutionId, options = {}) => {
  try {
    const { status, testId, limitCount = 100 } = options;
    
    let samplesQuery = query(
      collection(db, LAB_SAMPLES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      samplesQuery = query(samplesQuery, where('status', '==', status));
    }

    if (testId) {
      samplesQuery = query(samplesQuery, where('testId', '==', testId));
    }

    if (limitCount) {
      samplesQuery = query(samplesQuery, limit(limitCount));
    }

    const querySnapshot = await getDocs(samplesQuery);
    const samples = [];

    querySnapshot.forEach((doc) => {
      const sampleData = doc.data();
      samples.push({
        id: doc.id,
        ...sampleData,
        createdAt: sampleData.createdAt?.toDate?.() || sampleData.createdAt,
        updatedAt: sampleData.updatedAt?.toDate?.() || sampleData.updatedAt,
        collectionDate: sampleData.collectionDate ? new Date(sampleData.collectionDate) : null,
        inProcessAt: sampleData.inProcessAt?.toDate?.() || sampleData.inProcessAt,
        completedAt: sampleData.completedAt?.toDate?.() || sampleData.completedAt,
        verifiedAt: sampleData.verifiedAt?.toDate?.() || sampleData.verifiedAt
      });
    });

    return samples;
  } catch (error) {
    console.error('Error fetching lab samples:', error);
    throw error;
  }
};

/**
 * Get lab result by sample ID
 */
export const getLabResultBySample = async (sampleId) => {
  try {
    const resultsQuery = query(
      collection(db, LAB_RESULTS_COLLECTION),
      where('sampleId', '==', sampleId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(resultsQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const resultData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...resultData,
      createdAt: resultData.createdAt?.toDate?.() || resultData.createdAt,
      updatedAt: resultData.updatedAt?.toDate?.() || resultData.updatedAt,
      verifiedAt: resultData.verifiedAt?.toDate?.() || resultData.verifiedAt
    };
  } catch (error) {
    console.error('Error fetching lab result:', error);
    throw error;
  }
};

/**
 * Get lab result by test ID
 */
export const getLabResultByTest = async (testId) => {
  try {
    const resultsQuery = query(
      collection(db, LAB_RESULTS_COLLECTION),
      where('testId', '==', testId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(resultsQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const resultData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...resultData,
      createdAt: resultData.createdAt?.toDate?.() || resultData.createdAt,
      updatedAt: resultData.updatedAt?.toDate?.() || resultData.updatedAt,
      verifiedAt: resultData.verifiedAt?.toDate?.() || resultData.verifiedAt
    };
  } catch (error) {
    console.error('Error fetching lab result:', error);
    throw error;
  }
};

/**
 * Get sample by barcode
 */
export const getSampleByBarcode = async (barcode) => {
  try {
    const samplesQuery = query(
      collection(db, LAB_SAMPLES_COLLECTION),
      where('barcode', '==', barcode),
      limit(1)
    );

    const querySnapshot = await getDocs(samplesQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const sampleData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...sampleData,
      createdAt: sampleData.createdAt?.toDate?.() || sampleData.createdAt,
      updatedAt: sampleData.updatedAt?.toDate?.() || sampleData.updatedAt,
      collectionDate: sampleData.collectionDate ? new Date(sampleData.collectionDate) : null,
      inProcessAt: sampleData.inProcessAt?.toDate?.() || sampleData.inProcessAt,
      completedAt: sampleData.completedAt?.toDate?.() || sampleData.completedAt,
      verifiedAt: sampleData.verifiedAt?.toDate?.() || sampleData.verifiedAt
    };
  } catch (error) {
    console.error('Error fetching sample by barcode:', error);
    throw error;
  }
};

/**
 * Get lab statistics
 */
export const getLabStats = async (institutionId, startDate = null, endDate = null) => {
  try {
    const samples = await getLabSamples(institutionId);
    
    let filteredSamples = samples;
    if (startDate || endDate) {
      filteredSamples = samples.filter(sample => {
        const sampleDate = sample.createdAt instanceof Date 
          ? sample.createdAt 
          : new Date(sample.createdAt);
        if (startDate && sampleDate < new Date(startDate)) return false;
        if (endDate && sampleDate > new Date(endDate)) return false;
        return true;
      });
    }

    const stats = {
      total: filteredSamples.length,
      collected: filteredSamples.filter(s => s.status === SAMPLE_STATUS.COLLECTED).length,
      inProcess: filteredSamples.filter(s => s.status === SAMPLE_STATUS.IN_PROCESS).length,
      completed: filteredSamples.filter(s => s.status === SAMPLE_STATUS.COMPLETED).length,
      verified: filteredSamples.filter(s => s.status === SAMPLE_STATUS.VERIFIED).length,
      rejected: filteredSamples.filter(s => s.status === SAMPLE_STATUS.REJECTED).length
    };

    return stats;
  } catch (error) {
    console.error('Error calculating lab stats:', error);
    throw error;
  }
};


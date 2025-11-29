/**
 * Enhanced Triage Management API
 * 
 * Features:
 * - Color-coded severity system (red/yellow/green)
 * - Automatic queue priority assignment based on vitals
 * - High-risk vital signs alerts
 * - Automatic queue routing (GP, Emergency, Specialist)
 * - Nurse preliminary assessment notes
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { notificationsAPI } from './notificationsAPI';
import { addToQueue, QUEUE_PRIORITY, DEPARTMENT_TYPES, QUEUE_STATUS, updateQueueStatus, getQueueByDepartment } from './queueAPI';
import { getLatestVitalSigns } from './vitalSignsAPI';

const TRIAGE_ASSESSMENTS_COLLECTION = 'triageAssessments';

// Triage severity levels
export const TRIAGE_SEVERITY = {
  RED: 'red',      // Critical - Immediate attention required
  YELLOW: 'yellow', // Urgent - Needs attention soon
  GREEN: 'green'    // Non-urgent - Can wait
};

// Triage color codes for UI
export const TRIAGE_COLORS = {
  [TRIAGE_SEVERITY.RED]: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    icon: '🔴'
  },
  [TRIAGE_SEVERITY.YELLOW]: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    icon: '🟡'
  },
  [TRIAGE_SEVERITY.GREEN]: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-800',
    icon: '🟢'
  }
};

/**
 * Calculate triage severity based on vital signs
 * Returns: { severity, score, reasons, recommendedQueue, recommendedPriority }
 */
export const calculateTriageSeverity = (vitalSigns) => {
  let severityScore = 0; // Higher = more critical
  const reasons = [];
  const criticalVitals = [];

  // Extract vital values
  const vitals = {};
  vitalSigns.forEach(vs => {
    vitals[vs.type] = {
      value: vs.value,
      unit: vs.unit,
      status: vs.status
    };
  });

  // Blood Pressure Analysis
  if (vitals['Blood Pressure']) {
    const bp = vitals['Blood Pressure'].value;
    const [systolic, diastolic] = bp.split('/').map(v => parseFloat(v));
    
    if (systolic >= 180 || diastolic >= 120) {
      severityScore += 10; // Hypertensive crisis
      reasons.push('Severe hypertension (BP ≥180/120)');
      criticalVitals.push('Blood Pressure');
    } else if (systolic >= 160 || diastolic >= 100) {
      severityScore += 5; // Stage 2 hypertension
      reasons.push('High blood pressure');
    } else if (systolic < 90 || diastolic < 60) {
      severityScore += 8; // Hypotension
      reasons.push('Low blood pressure');
      criticalVitals.push('Blood Pressure');
    }
  }

  // Heart Rate Analysis
  if (vitals['Heart Rate']) {
    const hr = parseFloat(vitals['Heart Rate'].value);
    if (hr > 120) {
      severityScore += 6; // Tachycardia
      reasons.push('Rapid heart rate (>120 bpm)');
      criticalVitals.push('Heart Rate');
    } else if (hr < 50) {
      severityScore += 7; // Bradycardia
      reasons.push('Slow heart rate (<50 bpm)');
      criticalVitals.push('Heart Rate');
    }
  }

  // Temperature Analysis
  if (vitals['Temperature']) {
    const temp = parseFloat(vitals['Temperature'].value);
    if (temp >= 103) {
      severityScore += 8; // High fever
      reasons.push('High fever (≥103°F)');
      criticalVitals.push('Temperature');
    } else if (temp < 96) {
      severityScore += 9; // Hypothermia
      reasons.push('Low body temperature (<96°F)');
      criticalVitals.push('Temperature');
    } else if (temp >= 101) {
      severityScore += 3; // Moderate fever
      reasons.push('Fever');
    }
  }

  // Oxygen Saturation Analysis
  if (vitals['Oxygen Saturation']) {
    const spo2 = parseFloat(vitals['Oxygen Saturation'].value);
    if (spo2 < 90) {
      severityScore += 10; // Critical hypoxia
      reasons.push('Low oxygen saturation (<90%)');
      criticalVitals.push('Oxygen Saturation');
    } else if (spo2 < 95) {
      severityScore += 5; // Mild hypoxia
      reasons.push('Reduced oxygen saturation');
    }
  }

  // Respiratory Rate Analysis
  if (vitals['Respiratory Rate']) {
    const rr = parseFloat(vitals['Respiratory Rate'].value);
    if (rr > 30 || rr < 10) {
      severityScore += 8; // Abnormal respiratory rate
      reasons.push(`Abnormal respiratory rate (${rr} breaths/min)`);
      criticalVitals.push('Respiratory Rate');
    } else if (rr > 20 || rr < 12) {
      severityScore += 3; // Slightly abnormal
      reasons.push('Elevated respiratory rate');
    }
  }

  // Pain Level Analysis
  if (vitals['Pain Level']) {
    const pain = parseFloat(vitals['Pain Level'].value);
    if (pain >= 8) {
      severityScore += 4; // Severe pain
      reasons.push('Severe pain (≥8/10)');
    } else if (pain >= 5) {
      severityScore += 2; // Moderate pain
      reasons.push('Moderate pain');
    }
  }

  // Determine severity level
  let severity;
  let recommendedQueue = DEPARTMENT_TYPES.GP;
  let recommendedPriority = QUEUE_PRIORITY.NORMAL;

  if (severityScore >= 15) {
    severity = TRIAGE_SEVERITY.RED;
    recommendedQueue = DEPARTMENT_TYPES.GP; // Could be Emergency if available
    recommendedPriority = QUEUE_PRIORITY.EMERGENCY;
  } else if (severityScore >= 8) {
    severity = TRIAGE_SEVERITY.YELLOW;
    recommendedQueue = DEPARTMENT_TYPES.GP;
    recommendedPriority = QUEUE_PRIORITY.URGENT;
  } else {
    severity = TRIAGE_SEVERITY.GREEN;
    recommendedQueue = DEPARTMENT_TYPES.GP;
    recommendedPriority = QUEUE_PRIORITY.NORMAL;
  }

  return {
    severity,
    score: severityScore,
    reasons,
    criticalVitals,
    recommendedQueue,
    recommendedPriority
  };
};

/**
 * Create a triage assessment
 */
export const createTriageAssessment = async (assessmentData) => {
  try {
    const {
      clientId,
      clientName,
      institutionId,
      nurseId,
      nurseName,
      vitalSigns = [],
      chiefComplaint = '',
      preliminaryAssessment = '',
      notes = '',
      autoCalculateSeverity = true
    } = assessmentData;

    if (!clientId || !institutionId || !nurseId) {
      throw new Error('Missing required fields: clientId, institutionId, nurseId');
    }

    // Calculate severity if auto-calculate is enabled
    let severityData = null;
    if (autoCalculateSeverity && vitalSigns.length > 0) {
      severityData = calculateTriageSeverity(vitalSigns);
    } else {
      // Use manual severity if provided
      severityData = {
        severity: assessmentData.severity || TRIAGE_SEVERITY.GREEN,
        score: assessmentData.severityScore || 0,
        reasons: assessmentData.reasons || [],
        criticalVitals: assessmentData.criticalVitals || [],
        recommendedQueue: assessmentData.recommendedQueue || DEPARTMENT_TYPES.GP,
        recommendedPriority: assessmentData.recommendedPriority || QUEUE_PRIORITY.NORMAL
      };
    }

    const assessment = {
      clientId,
      clientName,
      institutionId,
      nurseId,
      nurseName,
      vitalSigns,
      chiefComplaint,
      preliminaryAssessment,
      notes,
      severity: severityData.severity,
      severityScore: severityData.score,
      severityReasons: severityData.reasons,
      criticalVitals: severityData.criticalVitals,
      recommendedQueue: severityData.recommendedQueue,
      recommendedPriority: severityData.recommendedPriority,
      status: 'completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, TRIAGE_ASSESSMENTS_COLLECTION), assessment);

    // Send high-risk alerts if severity is RED
    if (severityData.severity === TRIAGE_SEVERITY.RED) {
      await sendHighRiskAlert(clientId, clientName, institutionId, severityData);
    }

    return {
      id: docRef.id,
      ...assessment,
      severityData
    };
  } catch (error) {
    console.error('Error creating triage assessment:', error);
    throw error;
  }
};

/**
 * Send high-risk alert to doctors
 */
const sendHighRiskAlert = async (clientId, clientName, institutionId, severityData) => {
  try {
    // Send notification to all doctors in the institution
    await notificationsAPI.createNotification({
      userId: institutionId, // Will be broadcast to all doctors
      type: 'triage_alert',
      title: '🚨 High-Risk Client Alert',
      message: `${clientName} has critical vital signs requiring immediate attention. Severity: ${severityData.severity.toUpperCase()}`,
      priority: 'high',
      data: {
        clientId,
        clientName,
        severity: severityData.severity,
        criticalVitals: severityData.criticalVitals,
        reasons: severityData.reasons
      }
    });

    // Also create a system alert
    console.warn(`HIGH-RISK ALERT: Client ${clientName} (${clientId}) - ${severityData.reasons.join(', ')}`);
  } catch (error) {
    console.error('Error sending high-risk alert:', error);
    // Don't throw - alert failure shouldn't block triage assessment
  }
};

/**
 * Complete triage and automatically route Client to appropriate queue
 */
export const completeTriageAndRoute = async (assessmentId, options = {}) => {
  try {
    const {
      routeToQueue = true,
      overrideQueue = null,
      overridePriority = null,
      additionalNotes = ''
    } = options;

    // Get the assessment
    const assessmentRef = doc(db, TRIAGE_ASSESSMENTS_COLLECTION, assessmentId);
    const assessmentSnap = await getDoc(assessmentRef);

    if (!assessmentSnap.exists()) {
      throw new Error('Triage assessment not found');
    }

    const assessment = assessmentSnap.data();

    // Update assessment status
    await updateDoc(assessmentRef, {
      status: 'routed',
      routedAt: serverTimestamp(),
      routedToQueue: routeToQueue,
      additionalNotes,
      updatedAt: serverTimestamp()
    });

    // Route Client to appropriate queue
    if (routeToQueue) {
      const targetQueue = overrideQueue || assessment.recommendedQueue;
      const targetPriority = overridePriority || assessment.recommendedPriority;

      // Check if Client is already in triage queue
      const triageQueue = await getQueueByDepartment(
        assessment.institutionId,
        DEPARTMENT_TYPES.TRIAGE,
        { status: QUEUE_STATUS.WAITING }
      );

      const existingTriageEntry = triageQueue.find(q => q.clientId === assessment.clientId);

      if (existingTriageEntry) {
        // Update existing triage queue entry to completed
        await updateQueueStatus(existingTriageEntry.id, QUEUE_STATUS.COMPLETED);
      }

      // Add to target queue
      const queueEntry = await addToQueue({
        clientId: assessment.clientId,
        clientName: assessment.clientName,
        institutionId: assessment.institutionId,
        department: targetQueue,
        priority: targetPriority,
        notes: `Triage completed. Severity: ${assessment.severity}. ${assessment.preliminaryAssessment || ''} ${additionalNotes}`.trim()
      });

      return {
        assessmentId,
        queueEntry,
        routed: true
      };
    }

    return {
      assessmentId,
      routed: false
    };
  } catch (error) {
    console.error('Error completing triage and routing:', error);
    throw error;
  }
};

/**
 * Get triage assessment by Client
 */
export const getTriageAssessmentByPatient = async (clientId, institutionId) => {
  try {
    const q = query(
      collection(db, TRIAGE_ASSESSMENTS_COLLECTION),
      where('clientId', '==', clientId),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      routedAt: data.routedAt?.toDate?.() || data.routedAt
    };
  } catch (error) {
    console.error('Error fetching triage assessment:', error);
    throw error;
  }
};

/**
 * Get all triage assessments for an institution
 */
export const getTriageAssessments = async (institutionId, options = {}) => {
  try {
    const { status, limitCount = 100, startDate, endDate } = options;
    const q = query(
      collection(db, TRIAGE_ASSESSMENTS_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const assessments = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      assessments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        routedAt: data.routedAt?.toDate?.() || data.routedAt
      });
    });

    // Filter by status if provided
    let filtered = assessments;
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      filtered = filtered.filter(a => {
        const createdAt = new Date(a.createdAt);
        if (startDate && createdAt < new Date(startDate)) return false;
        if (endDate && createdAt > new Date(endDate)) return false;
        return true;
      });
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching triage assessments:', error);
    throw error;
  }
};

/**
 * Get triage statistics
 */
export const getTriageStats = async (institutionId, dateRange = 7) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const assessments = await getTriageAssessments(institutionId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const stats = {
      total: assessments.length,
      bySeverity: {
        [TRIAGE_SEVERITY.RED]: 0,
        [TRIAGE_SEVERITY.YELLOW]: 0,
        [TRIAGE_SEVERITY.GREEN]: 0
      },
      averageSeverityScore: 0,
      criticalVitalsCount: {},
      topReasons: {}
    };

    let totalScore = 0;
    assessments.forEach(assessment => {
      stats.bySeverity[assessment.severity] = (stats.bySeverity[assessment.severity] || 0) + 1;
      totalScore += assessment.severityScore || 0;

      // Count critical vitals
      if (assessment.criticalVitals) {
        assessment.criticalVitals.forEach(vital => {
          stats.criticalVitalsCount[vital] = (stats.criticalVitalsCount[vital] || 0) + 1;
        });
      }

      // Count reasons
      if (assessment.severityReasons) {
        assessment.severityReasons.forEach(reason => {
          stats.topReasons[reason] = (stats.topReasons[reason] || 0) + 1;
        });
      }
    });

    stats.averageSeverityScore = assessments.length > 0 ? (totalScore / assessments.length).toFixed(2) : 0;

    return stats;
  } catch (error) {
    console.error('Error getting triage stats:', error);
    throw error;
  }
};



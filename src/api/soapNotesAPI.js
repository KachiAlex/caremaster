/**
 * SOAP Notes API
 * 
 * Structured SOAP (Subjective, Objective, Assessment, Plan) notes:
 * - S: Symptoms, history, chief complaint
 * - O: Observations, vital signs, physical exam findings
 * - A: Assessments with ICD-10 diagnosis codes
 * - P: Plan with medications, procedures, follow-ups
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
import { updateConsultation } from './consultationsAPI';

const SOAP_NOTES_COLLECTION = 'soapNotes';
const ICD10_CODES_COLLECTION = 'icd10Codes';

/**
 * ICD-10 Code structure
 */
export const ICD10_CATEGORIES = {
  INFECTIOUS: 'A00-B99',
  NEOPLASMS: 'C00-D49',
  BLOOD: 'D50-D89',
  IMMUNE: 'E00-E89',
  MENTAL: 'F01-F99',
  NERVOUS: 'G00-G99',
  EYE: 'H00-H59',
  EAR: 'H60-H95',
  CIRCULATORY: 'I00-I99',
  RESPIRATORY: 'J00-J99',
  DIGESTIVE: 'K00-K95',
  SKIN: 'L00-L99',
  MUSCULOSKELETAL: 'M00-M99',
  GENITOURINARY: 'N00-N99',
  PREGNANCY: 'O00-O9A',
  PERINATAL: 'P00-P96',
  CONGENITAL: 'Q00-Q99',
  ABNORMAL: 'R00-R94',
  INJURY: 'S00-T88',
  EXTERNAL: 'V00-Y99',
  HEALTH_SERVICES: 'Z00-Z99'
};

/**
 * Create structured SOAP note
 */
export const createSOAPNote = async (consultationId, soapData) => {
  try {
    const {
      // Subjective (S)
      chiefComplaint,
      historyOfPresentIllness,
      reviewOfSystems,
      pastMedicalHistory,
      medications,
      allergies,
      socialHistory,
      familyHistory,
      
      // Objective (O)
      vitalSigns,
      physicalExamination,
      laboratoryFindings,
      imagingFindings,
      otherObservations,
      
      // Assessment (A)
      primaryDiagnosis,
      primaryDiagnosisICD10,
      secondaryDiagnoses,
      differentialDiagnoses,
      clinicalImpression,
      
      // Plan (P)
      medicationsPlan,
      proceduresPlan,
      diagnosticTestsPlan,
      patientEducation,
      followUpPlan,
      referrals,
      
      // Metadata
      patientId,
      doctorId,
      institutionId
    } = soapData;

    const soapNote = {
      consultationId,
      patientId,
      doctorId,
      institutionId,
      
      // Subjective
      subjective: {
        chiefComplaint: chiefComplaint || '',
        historyOfPresentIllness: historyOfPresentIllness || '',
        reviewOfSystems: reviewOfSystems || {},
        pastMedicalHistory: pastMedicalHistory || [],
        medications: medications || [],
        allergies: allergies || [],
        socialHistory: socialHistory || {},
        familyHistory: familyHistory || {}
      },
      
      // Objective
      objective: {
        vitalSigns: vitalSigns || {},
        physicalExamination: physicalExamination || {},
        laboratoryFindings: laboratoryFindings || [],
        imagingFindings: imagingFindings || [],
        otherObservations: otherObservations || ''
      },
      
      // Assessment
      assessment: {
        primaryDiagnosis: primaryDiagnosis || '',
        primaryDiagnosisICD10: primaryDiagnosisICD10 || '',
        secondaryDiagnoses: secondaryDiagnoses || [],
        differentialDiagnoses: differentialDiagnoses || [],
        clinicalImpression: clinicalImpression || ''
      },
      
      // Plan
      plan: {
        medications: medicationsPlan || [],
        procedures: proceduresPlan || [],
        diagnosticTests: diagnosticTestsPlan || [],
        patientEducation: patientEducation || [],
        followUp: followUpPlan || {},
        referrals: referrals || []
      },
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const soapNoteRef = await addDoc(collection(db, SOAP_NOTES_COLLECTION), soapNote);

    // Update consultation with SOAP note reference
    await updateConsultation(consultationId, {
      soapNoteId: soapNoteRef.id,
      hasSOAPNote: true
    });

    return {
      id: soapNoteRef.id,
      ...soapNote
    };
  } catch (error) {
    console.error('Error creating SOAP note:', error);
    throw error;
  }
};

/**
 * Update SOAP note
 */
export const updateSOAPNote = async (soapNoteId, updates) => {
  try {
    const soapNoteRef = doc(db, SOAP_NOTES_COLLECTION, soapNoteId);
    await updateDoc(soapNoteRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true, soapNoteId };
  } catch (error) {
    console.error('Error updating SOAP note:', error);
    throw error;
  }
};

/**
 * Get SOAP note by consultation ID
 */
export const getSOAPNoteByConsultation = async (consultationId) => {
  try {
    const soapNotesQuery = query(
      collection(db, SOAP_NOTES_COLLECTION),
      where('consultationId', '==', consultationId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(soapNotesQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const soapNoteData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...soapNoteData,
      createdAt: soapNoteData.createdAt?.toDate?.() || soapNoteData.createdAt,
      updatedAt: soapNoteData.updatedAt?.toDate?.() || soapNoteData.updatedAt
    };
  } catch (error) {
    console.error('Error fetching SOAP note:', error);
    throw error;
  }
};

/**
 * Get SOAP notes by patient
 */
export const getSOAPNotesByPatient = async (patientId, limitCount = 50) => {
  try {
    const soapNotesQuery = query(
      collection(db, SOAP_NOTES_COLLECTION),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(soapNotesQuery);
    const soapNotes = [];

    querySnapshot.forEach((doc) => {
      const soapNoteData = doc.data();
      soapNotes.push({
        id: doc.id,
        ...soapNoteData,
        createdAt: soapNoteData.createdAt?.toDate?.() || soapNoteData.createdAt,
        updatedAt: soapNoteData.updatedAt?.toDate?.() || soapNoteData.updatedAt
      });
    });

    return soapNotes;
  } catch (error) {
    console.error('Error fetching SOAP notes:', error);
    throw error;
  }
};

/**
 * Search ICD-10 codes
 */
export const searchICD10Codes = async (searchTerm, category = null) => {
  try {
    // This would typically connect to an ICD-10 database
    // For now, we'll use a simplified local search
    // In production, you'd want to use a proper ICD-10 API or database
    
    const commonICD10Codes = [
      { code: 'I10', description: 'Essential (primary) hypertension', category: ICD10_CATEGORIES.CIRCULATORY },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: ICD10_CATEGORIES.IMMUNE },
      { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: ICD10_CATEGORIES.RESPIRATORY },
      { code: 'K59.00', description: 'Constipation, unspecified', category: ICD10_CATEGORIES.DIGESTIVE },
      { code: 'M79.3', description: 'Panniculitis, unspecified', category: ICD10_CATEGORIES.MUSCULOSKELETAL },
      { code: 'R50.9', description: 'Fever, unspecified', category: ICD10_CATEGORIES.ABNORMAL },
      { code: 'R51', description: 'Headache', category: ICD10_CATEGORIES.ABNORMAL },
      { code: 'R06.02', description: 'Shortness of breath', category: ICD10_CATEGORIES.ABNORMAL },
      { code: 'R53.83', description: 'Other fatigue', category: ICD10_CATEGORIES.ABNORMAL },
      { code: 'Z00.00', description: 'Encounter for general adult medical examination without abnormal findings', category: ICD10_CATEGORIES.HEALTH_SERVICES }
    ];

    if (!searchTerm) {
      return commonICD10Codes;
    }

    const searchLower = searchTerm.toLowerCase();
    return commonICD10Codes.filter(code => 
      code.code.toLowerCase().includes(searchLower) ||
      code.description.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error('Error searching ICD-10 codes:', error);
    return [];
  }
};

/**
 * Get ICD-10 code details
 */
export const getICD10CodeDetails = async (code) => {
  try {
    // In production, fetch from ICD-10 database
    const codes = await searchICD10Codes(code);
    return codes.find(c => c.code === code) || null;
  } catch (error) {
    console.error('Error fetching ICD-10 code details:', error);
    return null;
  }
};

/**
 * Format SOAP note for display
 */
export const formatSOAPNoteForDisplay = (soapNote) => {
  if (!soapNote) return null;

  return {
    subjective: {
      chiefComplaint: soapNote.subjective?.chiefComplaint || '',
      historyOfPresentIllness: soapNote.subjective?.historyOfPresentIllness || '',
      reviewOfSystems: formatReviewOfSystems(soapNote.subjective?.reviewOfSystems),
      pastMedicalHistory: soapNote.subjective?.pastMedicalHistory || [],
      medications: soapNote.subjective?.medications || [],
      allergies: soapNote.subjective?.allergies || [],
      socialHistory: formatSocialHistory(soapNote.subjective?.socialHistory),
      familyHistory: soapNote.subjective?.familyHistory || {}
    },
    objective: {
      vitalSigns: formatVitalSigns(soapNote.objective?.vitalSigns),
      physicalExamination: formatPhysicalExamination(soapNote.objective?.physicalExamination),
      laboratoryFindings: soapNote.objective?.laboratoryFindings || [],
      imagingFindings: soapNote.objective?.imagingFindings || [],
      otherObservations: soapNote.objective?.otherObservations || ''
    },
    assessment: {
      primaryDiagnosis: soapNote.assessment?.primaryDiagnosis || '',
      primaryDiagnosisICD10: soapNote.assessment?.primaryDiagnosisICD10 || '',
      secondaryDiagnoses: soapNote.assessment?.secondaryDiagnoses || [],
      differentialDiagnoses: soapNote.assessment?.differentialDiagnoses || [],
      clinicalImpression: soapNote.assessment?.clinicalImpression || ''
    },
    plan: {
      medications: soapNote.plan?.medications || [],
      procedures: soapNote.plan?.procedures || [],
      diagnosticTests: soapNote.plan?.diagnosticTests || [],
      patientEducation: soapNote.plan?.patientEducation || [],
      followUp: soapNote.plan?.followUp || {},
      referrals: soapNote.plan?.referrals || []
    }
  };
};

/**
 * Helper functions for formatting
 */
const formatReviewOfSystems = (ros) => {
  if (!ros || typeof ros !== 'object') return {};
  
  const systems = [
    'constitutional', 'eyes', 'ears', 'nose', 'throat',
    'cardiovascular', 'respiratory', 'gastrointestinal',
    'genitourinary', 'musculoskeletal', 'neurological',
    'psychiatric', 'endocrine', 'hematologic', 'allergic'
  ];

  const formatted = {};
  systems.forEach(system => {
    formatted[system] = ros[system] || 'Not reviewed';
  });

  return formatted;
};

const formatSocialHistory = (socialHistory) => {
  if (!socialHistory || typeof socialHistory !== 'object') {
    return {
      smoking: 'Not documented',
      alcohol: 'Not documented',
      exercise: 'Not documented',
      occupation: 'Not documented'
    };
  }

  return {
    smoking: socialHistory.smoking || 'Not documented',
    alcohol: socialHistory.alcohol || 'Not documented',
    exercise: socialHistory.exercise || 'Not documented',
    occupation: socialHistory.occupation || 'Not documented',
    ...socialHistory
  };
};

const formatVitalSigns = (vitalSigns) => {
  if (!vitalSigns || typeof vitalSigns !== 'object') {
    return {
      bloodPressure: 'Not recorded',
      heartRate: 'Not recorded',
      temperature: 'Not recorded',
      respiratoryRate: 'Not recorded',
      oxygenSaturation: 'Not recorded',
      weight: 'Not recorded',
      height: 'Not recorded',
      bmi: 'Not calculated'
    };
  }

  return {
    bloodPressure: vitalSigns.bloodPressure || vitalSigns.bp || 'Not recorded',
    heartRate: vitalSigns.heartRate || vitalSigns.pulse || 'Not recorded',
    temperature: vitalSigns.temperature || vitalSigns.temp || 'Not recorded',
    respiratoryRate: vitalSigns.respiratoryRate || vitalSigns.rr || 'Not recorded',
    oxygenSaturation: vitalSigns.oxygenSaturation || vitalSigns.spo2 || 'Not recorded',
    weight: vitalSigns.weight || 'Not recorded',
    height: vitalSigns.height || 'Not recorded',
    bmi: vitalSigns.bmi || (vitalSigns.weight && vitalSigns.height 
      ? (vitalSigns.weight / ((vitalSigns.height / 100) ** 2)).toFixed(1) 
      : 'Not calculated')
  };
};

const formatPhysicalExamination = (physicalExam) => {
  if (!physicalExam || typeof physicalExam !== 'object') {
    return {
      general: 'Not documented',
      cardiovascular: 'Not documented',
      respiratory: 'Not documented',
      abdomen: 'Not documented',
      neurological: 'Not documented',
      musculoskeletal: 'Not documented',
      skin: 'Not documented'
    };
  }

  return {
    general: physicalExam.general || 'Not documented',
    cardiovascular: physicalExam.cardiovascular || 'Not documented',
    respiratory: physicalExam.respiratory || 'Not documented',
    abdomen: physicalExam.abdomen || 'Not documented',
    neurological: physicalExam.neurological || 'Not documented',
    musculoskeletal: physicalExam.musculoskeletal || 'Not documented',
    skin: physicalExam.skin || 'Not documented',
    ...physicalExam
  };
};


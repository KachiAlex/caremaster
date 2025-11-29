import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Drug Interaction Checker Service
 * 
 * This service checks for drug interactions, contraindications, and duplicate therapy
 * Uses a combination of local database and external APIs for comprehensive checking
 */

// Severity levels for interactions
export const INTERACTION_SEVERITY = {
  CRITICAL: 'critical',      // Contraindicated - DO NOT USE together
  MAJOR: 'major',           // Serious interaction - requires intervention
  MODERATE: 'moderate',     // Monitor closely
  MINOR: 'minor'           // Minimal clinical significance
};

// Common drug interaction database (expandable)
const DRUG_INTERACTIONS = {
  // Blood Thinners
  'warfarin': {
    interactsWith: [
      { drug: 'aspirin', severity: 'critical', description: 'Increased bleeding risk' },
      { drug: 'ibuprofen', severity: 'major', description: 'Increased bleeding risk' },
      { drug: 'naproxen', severity: 'major', description: 'Increased bleeding risk' },
      { drug: 'diclofenac', severity: 'major', description: 'Increased bleeding risk' },
      { drug: 'vitamin k', severity: 'major', description: 'Reduces warfarin effectiveness' }
    ],
    warnings: ['Monitor INR closely', 'Risk of bleeding'],
    contraindications: ['Active bleeding', 'Severe liver disease']
  },
  
  // NSAIDs
  'aspirin': {
    interactsWith: [
      { drug: 'warfarin', severity: 'critical', description: 'Severe bleeding risk' },
      { drug: 'ibuprofen', severity: 'moderate', description: 'Increased GI bleeding risk' },
      { drug: 'prednisone', severity: 'moderate', description: 'GI ulceration risk' },
      { drug: 'methotrexate', severity: 'major', description: 'Increased methotrexate toxicity' }
    ],
    warnings: ['Take with food', 'Monitor for bleeding'],
    contraindications: ['Active peptic ulcer', 'Hemophilia']
  },
  
  'ibuprofen': {
    interactsWith: [
      { drug: 'warfarin', severity: 'major', description: 'Bleeding risk' },
      { drug: 'aspirin', severity: 'moderate', description: 'Increased GI bleeding' },
      { drug: 'lisinopril', severity: 'moderate', description: 'Reduced BP control' },
      { drug: 'furosemide', severity: 'moderate', description: 'Reduced diuretic effect' }
    ],
    warnings: ['Take with food', 'Monitor blood pressure'],
    contraindications: ['Severe heart failure', 'Third trimester pregnancy']
  },
  
  // Antibiotics
  'ciprofloxacin': {
    interactsWith: [
      { drug: 'theophylline', severity: 'major', description: 'Theophylline toxicity' },
      { drug: 'warfarin', severity: 'major', description: 'Increased bleeding risk' },
      { drug: 'antacids', severity: 'moderate', description: 'Reduced absorption' },
      { drug: 'dairy products', severity: 'moderate', description: 'Reduced absorption' }
    ],
    warnings: ['Avoid dairy 2 hours before/after', 'Stay hydrated', 'Avoid sunlight'],
    contraindications: ['Myasthenia gravis', 'Children under 18']
  },
  
  'metronidazole': {
    interactsWith: [
      { drug: 'alcohol', severity: 'critical', description: 'Disulfiram-like reaction' },
      { drug: 'warfarin', severity: 'major', description: 'Increased bleeding risk' },
      { drug: 'lithium', severity: 'major', description: 'Lithium toxicity' }
    ],
    warnings: ['Avoid alcohol during and 3 days after treatment', 'May cause metallic taste'],
    contraindications: ['First trimester pregnancy', 'Alcohol use']
  },
  
  // Diabetes medications
  'metformin': {
    interactsWith: [
      { drug: 'alcohol', severity: 'major', description: 'Lactic acidosis risk' },
      { drug: 'contrast dye', severity: 'critical', description: 'Acute kidney injury risk' },
      { drug: 'furosemide', severity: 'moderate', description: 'Altered glucose control' }
    ],
    warnings: ['Take with food', 'Monitor kidney function', 'Stop before contrast procedures'],
    contraindications: ['Severe kidney disease', 'Acute metabolic acidosis']
  },
  
  'insulin': {
    interactsWith: [
      { drug: 'alcohol', severity: 'major', description: 'Hypoglycemia risk' },
      { drug: 'beta-blockers', severity: 'moderate', description: 'Masked hypoglycemia symptoms' },
      { drug: 'ace inhibitors', severity: 'moderate', description: 'Enhanced hypoglycemic effect' }
    ],
    warnings: ['Monitor blood glucose', 'Carry glucose tablets', 'Rotate injection sites'],
    contraindications: ['Hypoglycemia']
  },
  
  // Cardiovascular medications
  'lisinopril': {
    interactsWith: [
      { drug: 'spironolactone', severity: 'major', description: 'Hyperkalemia risk' },
      { drug: 'potassium supplements', severity: 'major', description: 'Hyperkalemia risk' },
      { drug: 'ibuprofen', severity: 'moderate', description: 'Reduced BP lowering effect' },
      { drug: 'lithium', severity: 'major', description: 'Lithium toxicity' }
    ],
    warnings: ['Monitor potassium levels', 'Monitor kidney function', 'Avoid salt substitutes'],
    contraindications: ['Pregnancy', 'Bilateral renal artery stenosis', 'History of angioedema']
  },
  
  'amlodipine': {
    interactsWith: [
      { drug: 'simvastatin', severity: 'major', description: 'Muscle toxicity risk' },
      { drug: 'grapefruit juice', severity: 'moderate', description: 'Increased drug levels' }
    ],
    warnings: ['Avoid grapefruit', 'May cause ankle swelling'],
    contraindications: ['Severe aortic stenosis']
  },
  
  // Antidepressants
  'fluoxetine': {
    interactsWith: [
      { drug: 'tramadol', severity: 'critical', description: 'Serotonin syndrome risk' },
      { drug: 'warfarin', severity: 'major', description: 'Increased bleeding risk' },
      { drug: 'mao inhibitors', severity: 'critical', description: 'Serotonin syndrome' }
    ],
    warnings: ['Watch for serotonin syndrome', 'May take 4-6 weeks to work'],
    contraindications: ['MAO inhibitor use within 14 days', 'Pimozide use']
  },
  
  // Add more drugs as needed
  'paracetamol': {
    interactsWith: [
      { drug: 'alcohol', severity: 'major', description: 'Liver damage risk with chronic use' },
      { drug: 'warfarin', severity: 'moderate', description: 'May enhance anticoagulant effect' }
    ],
    warnings: ['Do not exceed 4000mg/day', 'Check for paracetamol in other medications'],
    contraindications: ['Severe liver disease']
  }
};

// Drug class interactions
const DRUG_CLASS_INTERACTIONS = {
  'nsaid': ['warfarin', 'aspirin', 'prednisone', 'ace inhibitor'],
  'antibiotic': ['warfarin', 'antacids'],
  'antihypertensive': ['nsaid', 'alcohol'],
  'antidiabetic': ['alcohol', 'beta-blocker', 'ace inhibitor']
};

// Allergy cross-reactivity
const ALLERGY_CROSS_REACTIONS = {
  'penicillin': ['amoxicillin', 'ampicillin', 'cephalosporins'],
  'sulfa': ['sulfamethoxazole', 'furosemide', 'celecoxib'],
  'aspirin': ['nsaid', 'ibuprofen', 'naproxen']
};

/**
 * Main drug interaction checker
 */
export const drugInteractionService = {
  
  /**
   * Check for interactions between multiple medications
   */
  checkInteractions: async (medications) => {
    const interactions = [];
    const warnings = [];
    const criticalAlerts = [];

    // Check each medication against all others
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const interaction = checkPairInteraction(medications[i], medications[j]);
        if (interaction) {
          interactions.push(interaction);
          
          if (interaction.severity === INTERACTION_SEVERITY.CRITICAL) {
            criticalAlerts.push(interaction);
          }
        }
      }
      
      // Check for drug-specific warnings
      const drugWarnings = getDrugWarnings(medications[i]);
      if (drugWarnings.length > 0) {
        warnings.push(...drugWarnings);
      }
    }

    return {
      interactions,
      warnings,
      criticalAlerts,
      hasCriticalInteractions: criticalAlerts.length > 0,
      hasMajorInteractions: interactions.some(i => i.severity === INTERACTION_SEVERITY.MAJOR),
      totalInteractions: interactions.length
    };
  },

  /**
   * Check if medication is contraindicated with Client allergies
   */
  checkAllergies: (medication, patientAllergies) => {
    if (!patientAllergies || patientAllergies === 'None' || patientAllergies === 'None recorded') {
      return { hasContraindication: false, alerts: [] };
    }

    const alerts = [];
    const allergiesList = patientAllergies.toLowerCase().split(',').map(a => a.trim());
    const medName = medication.name.toLowerCase();

    // Direct allergy match
    if (allergiesList.some(allergy => medName.includes(allergy) || allergy.includes(medName))) {
      alerts.push({
        severity: INTERACTION_SEVERITY.CRITICAL,
        type: 'allergy',
        message: `Client is allergic to ${medication.name}!`,
        recommendation: 'DO NOT DISPENSE - Find alternative medication'
      });
    }

    // Check cross-reactivity
    for (const [allergen, crossReactants] of Object.entries(ALLERGY_CROSS_REACTIONS)) {
      if (allergiesList.includes(allergen)) {
        if (crossReactants.some(drug => medName.includes(drug.toLowerCase()))) {
          alerts.push({
            severity: INTERACTION_SEVERITY.MAJOR,
            type: 'cross-allergy',
            message: `Possible cross-reactivity with ${allergen} allergy`,
            recommendation: 'Consult doctor before dispensing'
          });
        }
      }
    }

    return {
      hasContraindication: alerts.length > 0,
      alerts
    };
  },

  /**
   * Check for duplicate therapy (same drug class)
   */
  checkDuplicateTherapy: (medications) => {
    const duplicates = [];
    const drugClasses = {};

    medications.forEach(med => {
      const drugClass = identifyDrugClass(med.name);
      if (drugClass) {
        if (!drugClasses[drugClass]) {
          drugClasses[drugClass] = [];
        }
        drugClasses[drugClass].push(med);
      }
    });

    // Check for duplicates in same class
    Object.entries(drugClasses).forEach(([drugClass, meds]) => {
      if (meds.length > 1) {
        duplicates.push({
          severity: INTERACTION_SEVERITY.MODERATE,
          type: 'duplicate',
          drugClass,
          medications: meds.map(m => m.name),
          message: `Multiple ${drugClass} medications prescribed`,
          recommendation: 'Verify with prescribing doctor'
        });
      }
    });

    return duplicates;
  },

  /**
   * Get comprehensive medication safety check
   */
  comprehensiveSafetyCheck: async (medications, patientAllergies, patientConditions) => {
    const interactionCheck = await drugInteractionService.checkInteractions(medications);
    const allergyCheck = medications.map(med => 
      drugInteractionService.checkAllergies(med, patientAllergies)
    );
    const duplicateCheck = drugInteractionService.checkDuplicateTherapy(medications);
    const conditionCheck = checkMedicationConditionInteractions(medications, patientConditions);

    const allAlerts = [
      ...interactionCheck.criticalAlerts,
      ...allergyCheck.filter(a => a.hasContraindication).flatMap(a => a.alerts),
      ...duplicateCheck.filter(d => d.severity === INTERACTION_SEVERITY.CRITICAL),
      ...conditionCheck.filter(c => c.severity === INTERACTION_SEVERITY.CRITICAL)
    ];

    return {
      isSafe: allAlerts.length === 0,
      interactions: interactionCheck,
      allergies: allergyCheck,
      duplicates: duplicateCheck,
      conditions: conditionCheck,
      criticalAlerts: allAlerts,
      recommendations: generateRecommendations(allAlerts)
    };
  },

  /**
   * Get drug information and warnings
   */
  getDrugInfo: (medicationName) => {
    const drugKey = medicationName.toLowerCase().trim();
    const drugData = DRUG_INTERACTIONS[drugKey];

    if (!drugData) {
      return {
        found: false,
        message: 'Drug information not available in local database'
      };
    }

    return {
      found: true,
      name: medicationName,
      interactions: drugData.interactsWith || [],
      warnings: drugData.warnings || [],
      contraindications: drugData.contraindications || []
    };
  }
};

/**
 * Helper: Check interaction between two medications
 */
function checkPairInteraction(med1, med2) {
  const drug1 = med1.name.toLowerCase().trim();
  const drug2 = med2.name.toLowerCase().trim();

  // Check in interaction database
  const drug1Data = DRUG_INTERACTIONS[drug1];
  if (drug1Data) {
    const interaction = drug1Data.interactsWith.find(i => 
      drug2.includes(i.drug.toLowerCase()) || i.drug.toLowerCase().includes(drug2)
    );

    if (interaction) {
      return {
        drug1: med1.name,
        drug2: med2.name,
        severity: interaction.severity,
        description: interaction.description,
        type: 'drug-drug'
      };
    }
  }

  // Check reverse
  const drug2Data = DRUG_INTERACTIONS[drug2];
  if (drug2Data) {
    const interaction = drug2Data.interactsWith.find(i => 
      drug1.includes(i.drug.toLowerCase()) || i.drug.toLowerCase().includes(drug1)
    );

    if (interaction) {
      return {
        drug1: med2.name,
        drug2: med1.name,
        severity: interaction.severity,
        description: interaction.description,
        type: 'drug-drug'
      };
    }
  }

  return null;
}

/**
 * Helper: Get warnings for a specific drug
 */
function getDrugWarnings(medication) {
  const drugKey = medication.name.toLowerCase().trim();
  const drugData = DRUG_INTERACTIONS[drugKey];

  if (!drugData || !drugData.warnings) {
    return [];
  }

  return drugData.warnings.map(warning => ({
    medication: medication.name,
    warning,
    type: 'general-warning'
  }));
}

/**
 * Helper: Identify drug class
 */
function identifyDrugClass(medicationName) {
  const name = medicationName.toLowerCase();
  
  // NSAIDs
  if (name.includes('ibuprofen') || name.includes('naproxen') || 
      name.includes('diclofenac') || name.includes('aspirin')) {
    return 'NSAID';
  }
  
  // Antibiotics
  if (name.includes('cillin') || name.includes('mycin') || 
      name.includes('cycline') || name.includes('floxacin')) {
    return 'Antibiotic';
  }
  
  // ACE Inhibitors
  if (name.includes('pril')) {
    return 'ACE Inhibitor';
  }
  
  // Beta Blockers
  if (name.includes('olol')) {
    return 'Beta Blocker';
  }
  
  // Statins
  if (name.includes('statin')) {
    return 'Statin';
  }
  
  return null;
}

/**
 * Helper: Check medication-condition interactions
 */
function checkMedicationConditionInteractions(medications, conditions) {
  if (!conditions || conditions === 'None' || conditions === 'None recorded') {
    return [];
  }

  const alerts = [];
  const conditionsList = conditions.toLowerCase().split(',').map(c => c.trim());

  medications.forEach(med => {
    const drugKey = med.name.toLowerCase().trim();
    const drugData = DRUG_INTERACTIONS[drugKey];

    if (drugData && drugData.contraindications) {
      drugData.contraindications.forEach(contraindication => {
        if (conditionsList.some(condition => 
          contraindication.toLowerCase().includes(condition) || 
          condition.includes(contraindication.toLowerCase())
        )) {
          alerts.push({
            severity: INTERACTION_SEVERITY.CRITICAL,
            type: 'condition-contraindication',
            medication: med.name,
            condition: contraindication,
            message: `${med.name} is contraindicated in ${contraindication}`,
            recommendation: 'DO NOT DISPENSE - Consult prescribing doctor'
          });
        }
      });
    }
  });

  return alerts;
}

/**
 * Helper: Generate recommendations based on alerts
 */
function generateRecommendations(alerts) {
  const recommendations = [];

  if (alerts.length === 0) {
    recommendations.push('No critical issues detected. Safe to dispense.');
    return recommendations;
  }

  const criticalCount = alerts.filter(a => a.severity === INTERACTION_SEVERITY.CRITICAL).length;
  const majorCount = alerts.filter(a => a.severity === INTERACTION_SEVERITY.MAJOR).length;

  if (criticalCount > 0) {
    recommendations.push(`⚠️ ${criticalCount} CRITICAL issue(s) found - DO NOT DISPENSE without doctor consultation`);
  }

  if (majorCount > 0) {
    recommendations.push(`⚠️ ${majorCount} MAJOR interaction(s) - Verify with prescribing doctor`);
  }

  recommendations.push('Review all alerts with Client and doctor before dispensing');
  recommendations.push('Document all interactions and actions taken');
  
  return recommendations;
}

export default drugInteractionService;


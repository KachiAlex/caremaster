/**
 * Enhanced E-Prescription Component
 * 
 * Features:
 * - Drug database search
 * - Drug interaction checking
 * - Dosage calculator
 * - Allergy checking
 * - Prescription template
 */

import React, { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  X,
  Search,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Save
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createPrescription } from '../api/prescriptionsAPI';
import drugInteractionService, { INTERACTION_SEVERITY } from '../services/drugInteractionService';

const EnhancedEPrescription = ({ clientId, clientName, doctorId, doctorName, institutionId, onSave, onCancel }) => {
  const [medications, setMedications] = useState([]);
  const [currentMedication, setCurrentMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    route: 'oral',
    instructions: ''
  });
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [drugSearchResults, setDrugSearchResults] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);
  const [interactionWarnings, setInteractionWarnings] = useState([]);
  const [allergyWarnings, setAllergyWarnings] = useState([]);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [saving, setSaving] = useState(false);

  // Common drug database (in production, this would be from an API)
  const DRUG_DATABASE = [
    { name: 'Paracetamol', genericName: 'Acetaminophen', dosageForms: ['tablet', 'syrup', 'injection'] },
    { name: 'Ibuprofen', genericName: 'Ibuprofen', dosageForms: ['tablet', 'syrup', 'gel'] },
    { name: 'Amoxicillin', genericName: 'Amoxicillin', dosageForms: ['capsule', 'syrup', 'injection'] },
    { name: 'Azithromycin', genericName: 'Azithromycin', dosageForms: ['tablet', 'syrup'] },
    { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin', dosageForms: ['tablet', 'injection'] },
    { name: 'Metformin', genericName: 'Metformin', dosageForms: ['tablet'] },
    { name: 'Amlodipine', genericName: 'Amlodipine', dosageForms: ['tablet'] },
    { name: 'Lisinopril', genericName: 'Lisinopril', dosageForms: ['tablet'] },
    { name: 'Atorvastatin', genericName: 'Atorvastatin', dosageForms: ['tablet'] },
    { name: 'Omeprazole', genericName: 'Omeprazole', dosageForms: ['capsule', 'tablet'] }
  ];

  useEffect(() => {
    // Load Client allergies (would fetch from Client record)
    // For now, using placeholder
    setPatientAllergies(['Penicillin', 'Sulfa']);
  }, [clientId]);

  useEffect(() => {
    // Check for drug interactions whenever medications change
    if (medications.length > 1) {
      checkInteractions();
    } else {
      setInteractionWarnings([]);
    }
  }, [medications]);

  const searchDrugs = (term) => {
    setDrugSearchTerm(term);
    if (term.length >= 2) {
      const results = DRUG_DATABASE.filter(drug =>
        drug.name.toLowerCase().includes(term.toLowerCase()) ||
        drug.genericName.toLowerCase().includes(term.toLowerCase())
      );
      setDrugSearchResults(results);
      setShowDrugSearch(true);
    } else {
      setShowDrugSearch(false);
    }
  };

  const selectDrug = (drug) => {
    setCurrentMedication(prev => ({
      ...prev,
      name: drug.name
    }));
    setShowDrugSearch(false);
    setDrugSearchTerm('');
  };

  const checkInteractions = async () => {
    try {
      const drugNames = medications.map(m => m.name.toLowerCase());
      const warnings = [];

      for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
          const interactionResult = await drugInteractionService.checkInteractions([medications[i], medications[j]]);
          const interaction = interactionResult.interactions[0];
          if (interaction) {
            warnings.push({
              drug1: medications[i].name,
              drug2: medications[j].name,
              severity: interaction.severity,
              description: interaction.description
            });
          }
        }
      }

      setInteractionWarnings(warnings);
    } catch (error) {
      console.error('Error checking drug interactions:', error);
    }
  };

  const checkAllergies = (drugName) => {
    const warnings = [];
    const drugLower = drugName.toLowerCase();

    patientAllergies.forEach(allergy => {
      if (drugLower.includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(drugLower)) {
        warnings.push({
          drug: drugName,
          allergy: allergy,
          severity: 'critical'
        });
      }
    });

    setAllergyWarnings(warnings);
    return warnings.length === 0;
  };

  const addMedication = () => {
    if (!currentMedication.name || !currentMedication.dosage || !currentMedication.frequency) {
      toast.error('Please fill in medication name, dosage, and frequency');
      return;
    }

    // Check for allergies
    if (!checkAllergies(currentMedication.name)) {
      toast.error(`⚠️ WARNING: ${currentMedication.name} may interact with Client's known allergies!`);
      // Still allow adding but with warning
    }

    // Calculate quantity if not provided
    let quantity = currentMedication.quantity;
    if (!quantity && currentMedication.frequency && currentMedication.duration) {
      // Simple calculation: frequency per day * duration in days
      const freqPerDay = parseFrequency(currentMedication.frequency);
      const days = parseDuration(currentMedication.duration);
      quantity = freqPerDay * days;
    }

    const newMedication = {
      ...currentMedication,
      quantity: quantity || 0,
      id: Date.now()
    };

    setMedications([...medications, newMedication]);
    setCurrentMedication({
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: '',
      route: 'oral',
      instructions: ''
    });
    toast.success('Medication added');
  };

  const removeMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const parseFrequency = (freq) => {
    // Parse frequency like "2x daily", "3 times a day", etc.
    const match = freq.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  };

  const parseDuration = (duration) => {
    // Parse duration like "7 days", "2 weeks", "1 month"
    const match = duration.match(/(\d+)/);
    const number = match ? parseInt(match[1]) : 1;
    
    if (duration.toLowerCase().includes('week')) return number * 7;
    if (duration.toLowerCase().includes('month')) return number * 30;
    return number; // days
  };

  const handleSave = async () => {
    if (medications.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    // Show warnings if there are critical interactions
    const criticalWarnings = interactionWarnings.filter(w => w.severity === INTERACTION_SEVERITY.CRITICAL);
    if (criticalWarnings.length > 0) {
      const proceed = window.confirm(
        `⚠️ CRITICAL WARNING: There are ${criticalWarnings.length} critical drug interactions. Do you want to proceed?`
      );
      if (!proceed) return;
    }

    try {
      setSaving(true);
      const prescription = await createPrescription({
        clientId: clientId,
        clientName: clientName,
        doctorId,
        doctorName,
        institutionId,
        diagnosis: '',
        notes: '',
        medications: medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          route: m.route,
          instructions: m.instructions
        })),
        autoBilling: true
      });

      toast.success('Prescription created successfully!');
      if (onSave) {
        onSave(prescription);
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {interactionWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h4 className="font-semibold text-yellow-800">Drug Interaction Warnings</h4>
          </div>
          <ul className="space-y-1 text-sm">
            {interactionWarnings.map((warning, idx) => (
              <li key={idx} className="text-yellow-700">
                <span className={`font-semibold ${
                  warning.severity === INTERACTION_SEVERITY.CRITICAL ? 'text-red-600' : ''
                }`}>
                  {warning.drug1} + {warning.drug2}:
                </span> {warning.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {allergyWarnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h4 className="font-semibold text-red-800">Allergy Warnings</h4>
          </div>
          <ul className="space-y-1 text-sm">
            {allergyWarnings.map((warning, idx) => (
              <li key={idx} className="text-red-700">
                <span className="font-semibold">{warning.drug}</span> may interact with known allergy: <span className="font-semibold">{warning.allergy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Medication Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Pill className="h-5 w-5 mr-2 text-blue-600" />
          Add Medication
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Drug Name with Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medication Name *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={currentMedication.name}
                onChange={(e) => {
                  setCurrentMedication(prev => ({ ...prev, name: e.target.value }));
                  searchDrugs(e.target.value);
                }}
                placeholder="Search or type medication name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {showDrugSearch && drugSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {drugSearchResults.map((drug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectDrug(drug)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100"
                    >
                      <div className="font-medium">{drug.name}</div>
                      <div className="text-xs text-gray-600">{drug.genericName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dosage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dosage *
            </label>
            <input
              type="text"
              value={currentMedication.dosage}
              onChange={(e) => setCurrentMedication(prev => ({ ...prev, dosage: e.target.value }))}
              placeholder="e.g., 500mg, 10ml"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency *
            </label>
            <input
              type="text"
              value={currentMedication.frequency}
              onChange={(e) => setCurrentMedication(prev => ({ ...prev, frequency: e.target.value }))}
              placeholder="e.g., 2x daily, 3 times a day"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <input
              type="text"
              value={currentMedication.duration}
              onChange={(e) => setCurrentMedication(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="e.g., 7 days, 2 weeks"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Route */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route
            </label>
            <select
              value={currentMedication.route}
              onChange={(e) => setCurrentMedication(prev => ({ ...prev, route: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="oral">Oral</option>
              <option value="topical">Topical</option>
              <option value="injection">Injection</option>
              <option value="inhalation">Inhalation</option>
              <option value="nasal">Nasal</option>
              <option value="ophthalmic">Ophthalmic</option>
              <option value="otic">Otic</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={currentMedication.quantity}
              onChange={(e) => setCurrentMedication(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="Auto-calculated if duration provided"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructions
          </label>
          <textarea
            value={currentMedication.instructions}
            onChange={(e) => setCurrentMedication(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="e.g., Take with food, Avoid alcohol"
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={addMedication}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </button>
      </div>

      {/* Medication List */}
      {medications.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Prescribed Medications</h3>
          <div className="space-y-2">
            {medications.map((med, index) => (
              <div key={med.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold">{med.name}</div>
                  <div className="text-sm text-gray-600">
                    {med.dosage} • {med.frequency} • {med.duration || 'As needed'} • {med.route}
                  </div>
                  {med.instructions && (
                    <div className="text-xs text-gray-500 mt-1">{med.instructions}</div>
                  )}
                </div>
                <button
                  onClick={() => removeMedication(index)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || medications.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Prescription
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EnhancedEPrescription;


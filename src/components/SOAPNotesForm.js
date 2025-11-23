/**
 * SOAP Notes Form Component
 * 
 * Comprehensive form for doctors to enter structured SOAP notes:
 * - Subjective: Chief complaint, history, review of systems
 * - Objective: Vital signs, physical examination, lab findings
 * - Assessment: Diagnosis with ICD-10 codes
 * - Plan: Medications, procedures, follow-up
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  X,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  createSOAPNote,
  updateSOAPNote,
  getSOAPNoteByConsultation,
  searchICD10Codes,
  formatSOAPNoteForDisplay
} from '../api/soapNotesAPI';

const SOAPNotesForm = ({ consultationId, patientId, doctorId, institutionId, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [icd10SearchTerm, setIcd10SearchTerm] = useState('');
  const [icd10Results, setIcd10Results] = useState([]);
  const [showICD10Search, setShowICD10Search] = useState(false);
  const [existingSOAPNote, setExistingSOAPNote] = useState(null);

  const [formData, setFormData] = useState({
    // Subjective
    chiefComplaint: '',
    historyOfPresentIllness: '',
    reviewOfSystems: {
      constitutional: '',
      eyes: '',
      ears: '',
      nose: '',
      throat: '',
      cardiovascular: '',
      respiratory: '',
      gastrointestinal: '',
      genitourinary: '',
      musculoskeletal: '',
      neurological: '',
      psychiatric: '',
      endocrine: '',
      hematologic: '',
      allergic: ''
    },
    pastMedicalHistory: [],
    medications: [],
    allergies: [],
    socialHistory: {
      smoking: '',
      alcohol: '',
      exercise: '',
      occupation: ''
    },
    familyHistory: '',
    
    // Objective
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: ''
    },
    physicalExamination: {
      general: '',
      cardiovascular: '',
      respiratory: '',
      abdomen: '',
      neurological: '',
      musculoskeletal: '',
      skin: ''
    },
    laboratoryFindings: [],
    imagingFindings: [],
    otherObservations: '',
    
    // Assessment
    primaryDiagnosis: '',
    primaryDiagnosisICD10: '',
    secondaryDiagnoses: [],
    differentialDiagnoses: [],
    clinicalImpression: '',
    
    // Plan
    medicationsPlan: [],
    proceduresPlan: [],
    diagnosticTestsPlan: [],
    patientEducation: [],
    followUpPlan: {
      required: false,
      date: '',
      interval: '',
      notes: ''
    },
    referrals: []
  });

  useEffect(() => {
    if (consultationId) {
      loadExistingSOAPNote();
    }
  }, [consultationId]);

  const loadExistingSOAPNote = async () => {
    try {
      setLoading(true);
      const soapNote = await getSOAPNoteByConsultation(consultationId);
      if (soapNote) {
        setExistingSOAPNote(soapNote);
        // Populate form with existing data
        setFormData({
          chiefComplaint: soapNote.subjective?.chiefComplaint || '',
          historyOfPresentIllness: soapNote.subjective?.historyOfPresentIllness || '',
          reviewOfSystems: soapNote.subjective?.reviewOfSystems || formData.reviewOfSystems,
          pastMedicalHistory: soapNote.subjective?.pastMedicalHistory || [],
          medications: soapNote.subjective?.medications || [],
          allergies: soapNote.subjective?.allergies || [],
          socialHistory: soapNote.subjective?.socialHistory || formData.socialHistory,
          familyHistory: soapNote.subjective?.familyHistory || '',
          vitalSigns: soapNote.objective?.vitalSigns || formData.vitalSigns,
          physicalExamination: soapNote.objective?.physicalExamination || formData.physicalExamination,
          laboratoryFindings: soapNote.objective?.laboratoryFindings || [],
          imagingFindings: soapNote.objective?.imagingFindings || [],
          otherObservations: soapNote.objective?.otherObservations || '',
          primaryDiagnosis: soapNote.assessment?.primaryDiagnosis || '',
          primaryDiagnosisICD10: soapNote.assessment?.primaryDiagnosisICD10 || '',
          secondaryDiagnoses: soapNote.assessment?.secondaryDiagnoses || [],
          differentialDiagnoses: soapNote.assessment?.differentialDiagnoses || [],
          clinicalImpression: soapNote.assessment?.clinicalImpression || '',
          medicationsPlan: soapNote.plan?.medications || [],
          proceduresPlan: soapNote.plan?.procedures || [],
          diagnosticTestsPlan: soapNote.plan?.diagnosticTests || [],
          patientEducation: soapNote.plan?.patientEducation || [],
          followUpPlan: soapNote.plan?.followUp || formData.followUpPlan,
          referrals: soapNote.plan?.referrals || []
        });
      }
    } catch (error) {
      console.error('Error loading SOAP note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleICD10Search = async (term) => {
    setIcd10SearchTerm(term);
    if (term.length >= 2) {
      const results = await searchICD10Codes(term);
      setIcd10Results(results);
      setShowICD10Search(true);
    } else {
      setShowICD10Search(false);
    }
  };

  const handleSelectICD10 = (code) => {
    setFormData({
      ...formData,
      primaryDiagnosisICD10: code.code,
      primaryDiagnosis: code.description
    });
    setShowICD10Search(false);
    setIcd10SearchTerm('');
  };

  const handleAddItem = (field, item) => {
    if (!item.trim()) return;
    setFormData({
      ...formData,
      [field]: [...formData[field], item]
    });
  };

  const handleRemoveItem = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const soapData = {
        ...formData,
        patientId,
        doctorId,
        institutionId
      };

      if (existingSOAPNote) {
        await updateSOAPNote(existingSOAPNote.id, soapData);
        toast.success('SOAP note updated successfully');
      } else {
        await createSOAPNote(consultationId, soapData);
        toast.success('SOAP note created successfully');
      }

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving SOAP note:', error);
      toast.error('Failed to save SOAP note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subjective Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          S - Subjective
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chief Complaint <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Patient's main complaint"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              History of Present Illness
            </label>
            <textarea
              value={formData.historyOfPresentIllness}
              onChange={(e) => setFormData({ ...formData, historyOfPresentIllness: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Detailed history of the current complaint"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review of Systems
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(formData.reviewOfSystems).map(([system, value]) => (
                <div key={system}>
                  <label className="block text-xs text-gray-600 mb-1 capitalize">
                    {system.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setFormData({
                      ...formData,
                      reviewOfSystems: {
                        ...formData.reviewOfSystems,
                        [system]: e.target.value
                      }
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="Normal / Abnormal"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Past Medical History
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('pastMedicalHistory', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add medical history (press Enter)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.pastMedicalHistory.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem('pastMedicalHistory', index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Medications
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('medications', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add medication (press Enter)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.medications.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem('medications', index)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allergies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('allergies', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add allergy (press Enter)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergies.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem('allergies', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Objective Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          O - Objective
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vital Signs
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Blood Pressure</label>
                <input
                  type="text"
                  value={formData.vitalSigns.bloodPressure}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, bloodPressure: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="120/80"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={formData.vitalSigns.heartRate}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, heartRate: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="72"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  value={formData.vitalSigns.temperature}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, temperature: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="37.0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Respiratory Rate</label>
                <input
                  type="number"
                  value={formData.vitalSigns.respiratoryRate}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, respiratoryRate: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="16"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">O2 Saturation (%)</label>
                <input
                  type="number"
                  value={formData.vitalSigns.oxygenSaturation}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, oxygenSaturation: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="98"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.vitalSigns.weight}
                  onChange={(e) => setFormData({
                    ...formData,
                    vitalSigns: { ...formData.vitalSigns, weight: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="70"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Physical Examination
            </label>
            <div className="space-y-2">
              {Object.entries(formData.physicalExamination).map(([system, value]) => (
                <div key={system}>
                  <label className="block text-xs text-gray-600 mb-1 capitalize">
                    {system.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => setFormData({
                      ...formData,
                      physicalExamination: {
                        ...formData.physicalExamination,
                        [system]: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Examination findings"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Observations
            </label>
            <textarea
              value={formData.otherObservations}
              onChange={(e) => setFormData({ ...formData, otherObservations: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional objective findings"
            />
          </div>
        </div>
      </div>

      {/* Assessment Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-yellow-600" />
          A - Assessment
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Diagnosis <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.primaryDiagnosis}
                onChange={(e) => {
                  setFormData({ ...formData, primaryDiagnosis: e.target.value });
                  handleICD10Search(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter diagnosis or search ICD-10"
              />
              {showICD10Search && icd10Results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {icd10Results.map((code, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectICD10(code)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100"
                    >
                      <div className="font-medium text-sm">{code.code}</div>
                      <div className="text-xs text-gray-600">{code.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ICD-10 Code
            </label>
            <input
              type="text"
              value={formData.primaryDiagnosisICD10}
              onChange={(e) => setFormData({ ...formData, primaryDiagnosisICD10: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="I10, E11.9, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Impression
            </label>
            <textarea
              value={formData.clinicalImpression}
              onChange={(e) => setFormData({ ...formData, clinicalImpression: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Clinical reasoning and assessment"
            />
          </div>
        </div>
      </div>

      {/* Plan Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          P - Plan
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medications Plan
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('medicationsPlan', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add medication plan (press Enter)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.medicationsPlan.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem('medicationsPlan', index)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Procedures Plan
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('proceduresPlan', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add procedure plan (press Enter)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.proceduresPlan.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem('proceduresPlan', index)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnostic Tests Plan
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem('diagnosticTestsPlan', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add diagnostic test (press Enter)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.diagnosticTestsPlan.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem('diagnosticTestsPlan', index)}
                    className="text-cyan-600 hover:text-cyan-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.followUpPlan.required}
                onChange={(e) => setFormData({
                  ...formData,
                  followUpPlan: { ...formData.followUpPlan, required: e.target.checked }
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Follow-up Required</span>
            </label>
            {formData.followUpPlan.required && (
              <div className="space-y-2 ml-6">
                <input
                  type="date"
                  value={formData.followUpPlan.date}
                  onChange={(e) => setFormData({
                    ...formData,
                    followUpPlan: { ...formData.followUpPlan, date: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={formData.followUpPlan.notes}
                  onChange={(e) => setFormData({
                    ...formData,
                    followUpPlan: { ...formData.followUpPlan, notes: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Follow-up instructions"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {existingSOAPNote ? 'Update SOAP Note' : 'Save SOAP Note'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SOAPNotesForm;


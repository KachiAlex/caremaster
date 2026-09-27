import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  CheckCircle, 
  Save,
  X,
  History
} from 'lucide-react';
import { toast } from 'react-toastify';
import { collection, addDoc, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';
import { getMedicationsByClient } from '../api/medicationAPI';
import {
  recordMedicationAdministration,
  getAdministrationsByClient,
  ADMINISTRATION_STATUSES
} from '../api/medicationAdministrationAPI';

const ROUTES = [
  { value: 'oral', label: 'Oral (PO)' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'topical', label: 'Topical' },
  { value: 'injection', label: 'Injection' },
  { value: 'iv', label: 'IV' },
  { value: 'im', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'other', label: 'Other' }
];

const PATIENT_RESPONSES = [
  { value: 'normal', label: 'Normal Response' },
  { value: 'mild_side_effects', label: 'Mild Side Effects' },
  { value: 'moderate_side_effects', label: 'Moderate Side Effects' },
  { value: 'severe_side_effects', label: 'Severe Side Effects' },
  { value: 'allergic_reaction', label: 'Allergic Reaction' },
  { value: 'no_response', label: 'No Response' }
];

const STATUS_COLORS = {
  administered: 'bg-green-100 text-green-800',
  held: 'bg-orange-100 text-orange-800',
  refused: 'bg-red-100 text-red-800',
  missed: 'bg-red-100 text-red-800',
  not_available: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = ADMINISTRATION_STATUSES.reduce((acc, s) => {
  acc[s.value] = s.label;
  return acc;
}, {});

// Normalize a registration-medication entry (string or object) into the
// same shape as a prescription record.
const normalizeRegistrationMed = (med, index) => {
  if (typeof med === 'string') {
    return { key: `reg-${index}`, name: med, source: 'registration' };
  }
  return {
    key: `reg-${index}`,
    name: med.name || med.medicationName || med.medication_name || 'Medication',
    dosage: med.dosage || med.dose,
    frequency: med.frequency,
    route: med.route,
    instructions: med.instructions || med.notes,
    source: 'registration'
  };
};

const normalizePrescription = (med) => {
  let metadata = med.metadata;
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = null; }
  }
  return {
    key: `rx-${med.id}`,
    id: med.id,
    name: med.name || med.medicationName || 'Medication',
    dosage: med.dosage || med.dose,
    frequency: med.frequency,
    route: med.route,
    instructions: med.instructions,
    prescribedBy: med.doctorName || med.prescribedBy || med.doctor_name || metadata?.enteredByName,
    status: med.status,
    needsDoctorReview: !!metadata?.requiresDoctorReview,
    source: 'prescription'
  };
};

const getFrequencyHours = (frequency) => {
  if (!frequency) return 24;
  const freq = String(frequency).toLowerCase();
  if (freq.includes('every 4')) return 4;
  if (freq.includes('every 6')) return 6;
  if (freq.includes('every 8')) return 8;
  if (freq.includes('every 12')) return 12;
  if (freq.includes('twice') || freq.includes('bid')) return 12;
  if (freq.includes('three') || freq.includes('tid')) return 8;
  if (freq.includes('four') || freq.includes('qid')) return 6;
  return 24; // once daily / default
};

const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  const d = new Date(timeString);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
};

const NurseMedicationManager = ({
  clientId,
  clientName,
  nurseId,
  nurseName,
  institutionId,
  registrationMedications = [],
  onSave,
  onCancel
}) => {
  const [medications, setMedications] = useState([]);
  const [administrations, setAdministrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [administeringMed, setAdministeringMed] = useState(null);
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [addingMed, setAddingMed] = useState(false);
  const [addMedForm, setAddMedForm] = useState({
    name: '', dosage: '', frequency: 'once daily', route: 'oral', instructions: ''
  });
  const [administerForm, setAdministerForm] = useState({
    status: 'administered',
    administeredAt: '',
    dose: '',
    route: 'oral',
    reason: '',
    notes: '',
    sideEffects: '',
    patientResponse: 'normal'
  });

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rxMeds, logs] = await Promise.all([
        getMedicationsByClient(clientId).catch(() => []),
        getAdministrationsByClient(clientId).catch(() => [])
      ]);

      // Merge doctor prescriptions with registration medications. When a
      // name appears in both, prefer the prescription (it carries a real
      // medication_id uuid for linking).
      const rxNormalized = (rxMeds || []).map(normalizePrescription);
      const rxNames = new Set(rxNormalized.map(m => m.name.toLowerCase().trim()));
      const regNormalized = (Array.isArray(registrationMedications) ? registrationMedications : [registrationMedications])
        .filter(Boolean)
        .map(normalizeRegistrationMed)
        .filter(m => m.name && !rxNames.has(m.name.toLowerCase().trim()));

      setMedications([...rxNormalized, ...regNormalized]);
      setAdministrations(logs || []);
    } catch (error) {
      console.error('Error loading medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  // Latest chart entry per medication (by prescription id or name).
  const latestLogFor = (med) => administrations.find(log =>
    (med.id && log.medicationId === med.id) ||
    (log.medicationName || '').toLowerCase().trim() === med.name.toLowerCase().trim()
  );

  const getMedicationStatus = (medication) => {
    const last = latestLogFor(medication);
    if (!last?.administeredAt) {
      return { status: 'pending', color: 'yellow', text: 'Pending', last };
    }
    const hours = (Date.now() - new Date(last.administeredAt).getTime()) / 36e5;
    const freqHours = getFrequencyHours(medication.frequency);
    if (last.status !== 'administered') {
      return { status: 'pending', color: 'yellow', text: `Last: ${STATUS_LABELS[last.status] || last.status}`, last };
    }
    if (hours >= freqHours) {
      return { status: 'due', color: 'red', text: 'Due Now', last };
    }
    if (hours >= freqHours * 0.8) {
      return { status: 'soon', color: 'orange', text: 'Due Soon', last };
    }
    return { status: 'administered', color: 'green', text: 'Administered', last };
  };

  const getStatusColor = (status) => ({
    pending: 'bg-yellow-100 text-yellow-800',
    due: 'bg-red-100 text-red-800',
    soon: 'bg-orange-100 text-orange-800',
    administered: 'bg-green-100 text-green-800'
  }[status] || 'bg-gray-100 text-gray-800');

  const handleAdministerMedication = (medication) => {
    setAdministeringMed(medication);
    setAdministerForm({
      status: 'administered',
      administeredAt: new Date().toISOString().slice(0, 16),
      dose: medication.dosage || '',
      route: medication.route && ROUTES.some(r => r.value === medication.route) ? medication.route : 'oral',
      reason: '',
      notes: '',
      sideEffects: '',
      patientResponse: 'normal'
    });
    setShowAdministerModal(true);
  };

  const handleSubmitAdministration = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!administerForm.dose.trim() && administerForm.status === 'administered') {
      toast.error('Please enter the administered dose');
      return;
    }
    if (administerForm.status !== 'administered' && !administerForm.reason.trim()) {
      toast.error('Please provide a reason for not administering');
      return;
    }

    try {
      setSubmitting(true);

      await recordMedicationAdministration({
        clientId,
        nurseId,
        institutionId,
        medicationId: administeringMed.source === 'prescription' ? administeringMed.id : null,
        medicationName: administeringMed.name,
        dose: administerForm.dose,
        status: administerForm.status,
        administeredAt: administerForm.administeredAt,
        notes: administerForm.notes,
        metadata: {
          route: administerForm.route,
          patientResponse: administerForm.patientResponse,
          sideEffects: administerForm.sideEffects,
          reason: administerForm.reason,
          medSource: administeringMed.source,
          prescriptionId: administeringMed.source === 'prescription' ? administeringMed.id : null,
          administeredByName: nurseName,
          clientName,
          prescribedBy: administeringMed.prescribedBy || null,
          frequency: administeringMed.frequency || null
        }
      });

      toast.success(`${administeringMed.name} charted as ${STATUS_LABELS[administerForm.status]}`);

      setShowAdministerModal(false);
      setAdministeringMed(null);
      await loadData();

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error recording medication administration:', error);
      const detail = error?.response?.detail || error?.response?.message || error?.message;
      toast.error(`Failed to chart medication${detail ? `: ${detail}` : ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (addingMed) return;
    if (!addMedForm.name.trim()) {
      toast.error('Please enter the medication name');
      return;
    }
    try {
      setAddingMed(true);
      await addDoc(collection(db, 'prescriptions'), {
        patient_id: clientId,
        institution_id: institutionId || null,
        medication_name: addMedForm.name.trim(),
        dosage: addMedForm.dosage.trim() || null,
        frequency: addMedForm.frequency,
        route: addMedForm.route,
        instructions: addMedForm.instructions.trim() || null,
        status: 'active',
        start_date: new Date().toISOString(),
        metadata: {
          enteredByRole: 'nurse',
          enteredById: nurseId || null,
          enteredByName: nurseName || null,
          enteredVia: 'medication-chart',
          requiresDoctorReview: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success(`${addMedForm.name} added — flagged for doctor review`);
      setShowAddMedModal(false);
      setAddMedForm({ name: '', dosage: '', frequency: 'once daily', route: 'oral', instructions: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding medication:', error);
      const detail = error?.response?.detail || error?.response?.message || error?.message;
      toast.error(`Failed to add medication${detail ? `: ${detail}` : ''}`);
    } finally {
      setAddingMed(false);
    }
  };

  const needsReason = administerForm.status !== 'administered';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Medication Chart</h2>
                <p className="text-sm text-gray-600">Client: {clientName}</p>
                <p className="text-xs text-gray-500">Charting as: {nurseName}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Current Medications ({medications.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline text-xs text-gray-500">
                      Prescriptions + registration meds
                    </span>
                    <button
                      onClick={() => setShowAddMedModal(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center"
                    >
                      <Pill className="h-3.5 w-3.5 mr-1" />
                      Add Medication
                    </button>
                  </div>
                </div>

                {medications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No medications on record</p>
                    <p className="text-sm mb-4">No prescriptions or registration medications for this client.</p>
                    <button
                      onClick={() => setShowAddMedModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center"
                    >
                      <Pill className="h-4 w-4 mr-2" />
                      Add Medication to Chart
                    </button>
                  </div>
                ) : (
                  medications.map((medication) => {
                    const status = getMedicationStatus(medication);
                    const last = status.last;
                    return (
                      <div key={medication.key} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                              <h4 className="text-lg font-semibold text-gray-900">{medication.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                                {status.text}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                {medication.source === 'prescription' ? 'Prescription' : 'Registration'}
                              </span>
                              {medication.needsDoctorReview && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  Nurse-entered · review
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Dose:</span>
                                <p className="font-medium text-gray-900">{medication.dosage || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Frequency:</span>
                                <p className="font-medium text-gray-900">{medication.frequency || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Route:</span>
                                <p className="font-medium text-gray-900 capitalize">{medication.route || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Prescribed By:</span>
                                <p className="font-medium text-gray-900">{medication.prescribedBy || 'N/A'}</p>
                              </div>
                            </div>

                            {medication.instructions && (
                              <div className="mt-3">
                                <span className="text-gray-500 text-sm">Instructions:</span>
                                <p className="text-sm text-gray-700 mt-1">{medication.instructions}</p>
                              </div>
                            )}

                            {last && (
                              <div className="mt-3">
                                <span className="text-gray-500 text-sm">Last Charted:</span>
                                <p className="text-sm text-gray-700">
                                  {formatTime(last.administeredAt)} — {STATUS_LABELS[last.status] || last.status}
                                  {last.administeredByName ? ` by ${last.administeredByName}` : ''}
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleAdministerMedication(medication)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center flex-shrink-0 text-sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Chart
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Administration History (MAR) */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <History className="h-5 w-5 text-gray-600 mr-2" />
                  Administration History
                </h3>
                {administrations.length === 0 ? (
                  <p className="text-sm text-gray-500">No administrations charted yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {administrations.slice(0, 25).map((log) => (
                      <div key={log.id} className="bg-white rounded-lg border border-gray-100 p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">{log.medicationName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-800'}`}>
                              {STATUS_LABELS[log.status] || log.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(log.administeredAt)}
                            {log.administeredByName ? ` · ${log.administeredByName}` : ''}
                            {log.dosage ? ` · ${log.dosage}` : ''}
                            {log.route ? ` · ${log.route}` : ''}
                          </p>
                          {(log.reason || log.notes) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {log.reason ? `Reason: ${log.reason}` : log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Medication Modal */}
        {showAddMedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Pill className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Add Medication</h3>
                      <p className="text-xs text-gray-500">Added to this client's MAR — flagged for doctor review</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddMedModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddMedication} className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medication Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addMedForm.name}
                      onChange={(e) => setAddMedForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Paracetamol"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dose</label>
                      <input
                        type="text"
                        value={addMedForm.dosage}
                        onChange={(e) => setAddMedForm(prev => ({ ...prev, dosage: e.target.value }))}
                        placeholder="e.g., 500mg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={addMedForm.frequency}
                        onChange={(e) => setAddMedForm(prev => ({ ...prev, frequency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="once daily">Once daily</option>
                        <option value="twice daily">Twice daily</option>
                        <option value="three times daily">Three times daily</option>
                        <option value="four times daily">Four times daily</option>
                        <option value="every 4 hours">Every 4 hours</option>
                        <option value="every 6 hours">Every 6 hours</option>
                        <option value="every 8 hours">Every 8 hours</option>
                        <option value="every 12 hours">Every 12 hours</option>
                        <option value="as needed">As needed (PRN)</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                    <select
                      value={addMedForm.route}
                      onChange={(e) => setAddMedForm(prev => ({ ...prev, route: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ROUTES.map(route => (
                        <option key={route.value} value={route.value}>{route.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                    <textarea
                      value={addMedForm.instructions}
                      onChange={(e) => setAddMedForm(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="e.g., Take with food, monitor blood pressure..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMedModal(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingMed}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {addingMed ? 'Adding…' : 'Add Medication'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Medication Administration Modal */}
        {showAdministerModal && administeringMed && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <Pill className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Chart Medication</h3>
                      <p className="text-sm text-gray-600 truncate">{administeringMed.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdministerModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitAdministration} className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={administerForm.status}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        {ADMINISTRATION_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {needsReason ? 'Recorded At' : 'Administered At'}
                      </label>
                      <input
                        type="datetime-local"
                        value={administerForm.administeredAt}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, administeredAt: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                  </div>

                  {needsReason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={administerForm.reason}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="e.g., Client refused, medication unavailable, held per doctor order"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dose {needsReason ? '' : 'Administered'}
                      </label>
                      <input
                        type="text"
                        value={administerForm.dose}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, dose: e.target.value }))}
                        placeholder="e.g., 10mg, 1 tablet"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required={!needsReason}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                      <select
                        value={administerForm.route}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, route: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        {ROUTES.map(route => (
                          <option key={route.value} value={route.value}>{route.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {administerForm.status === 'administered' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Client Response</label>
                      <select
                        value={administerForm.patientResponse}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, patientResponse: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        {PATIENT_RESPONSES.map(response => (
                          <option key={response.value} value={response.value}>{response.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Side Effects Observed</label>
                    <textarea
                      value={administerForm.sideEffects}
                      onChange={(e) => setAdministerForm(prev => ({ ...prev, sideEffects: e.target.value }))}
                      placeholder="Describe any side effects observed..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={administerForm.notes}
                      onChange={(e) => setAdministerForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAdministerModal(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {submitting ? 'Saving…' : 'Record Administration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseMedicationManager;

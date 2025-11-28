import React, { useState, useEffect } from 'react';
import { X, Plus, Pill, Clock, User, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { getPrescriptionsByClient, createPrescription } from '../api/prescriptionsAPI';
import { useUser } from '../contexts/UserContext';

const PrescriptionsLogModal = ({ patient, isOpen, onClose, institutionId }) => {
  const { user, userProfile } = useUser();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [prescriptionFormData, setPrescriptionFormData] = useState({
    diagnosis: '',
    notes: '',
    medications: []
  });

  useEffect(() => {
    if (isOpen && patient?.id) {
      loadPrescriptions();
    }
  }, [isOpen, patient]);

  const loadPrescriptions = async () => {
    if (!patient?.id) return;
    
    setLoading(true);
    try {
      const patientId = patient.id || patient.patientId || patient.uid;
      const prescriptionsData = await getPrescriptionsByClient(patientId);
      setPrescriptions(prescriptionsData || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrescription = () => {
    setShowAddForm(true);
    setPrescriptionFormData({
      diagnosis: '',
      notes: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
  };

  const handleAddMedication = () => {
    setPrescriptionFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  const handleRemoveMedication = (index) => {
    setPrescriptionFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    const updatedMedications = [...prescriptionFormData.medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value
    };
    setPrescriptionFormData(prev => ({
      ...prev,
      medications: updatedMedications
    }));
  };

  const handleSubmitPrescription = async () => {
    try {
      if (!prescriptionFormData.diagnosis) {
        toast.error('Please enter a diagnosis');
        return;
      }

      if (prescriptionFormData.medications.length === 0 || 
          prescriptionFormData.medications.some(m => !m.name)) {
        toast.error('Please add at least one medication with a name');
        return;
      }

      const patientId = patient.id || patient.patientId || patient.uid;
      const patientName = patient.name || patient.fullName || 'Patient';
      const doctorId = user?.uid;
      const doctorName = userProfile?.name || userProfile?.displayName || 'Doctor';

      await createPrescription({
        clientId: patientId,
        clientName: patientName,
        doctorId: doctorId,
        doctorName: doctorName,
        institutionId: institutionId,
        diagnosis: prescriptionFormData.diagnosis,
        notes: prescriptionFormData.notes,
        medications: prescriptionFormData.medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          quantity: med.quantity || 1
        }))
      });

      toast.success('Prescription created successfully');
      await loadPrescriptions();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  if (!isOpen) return null;

  const patientId = patient?.id || patient?.patientId || patient?.uid;
  const patientName = patient?.name || patient?.fullName || 'Patient';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Pill className="h-7 w-7 mr-3" />
              Prescriptions Log
            </h2>
            <p className="text-green-100 text-sm mt-1">
              {patientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Prescription</h3>
                <p className="text-sm text-gray-600">Fill in the prescription details</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={prescriptionFormData.diagnosis}
                    onChange={(e) => setPrescriptionFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                    placeholder="e.g., Hypertension, Type 2 Diabetes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={prescriptionFormData.notes}
                    onChange={(e) => setPrescriptionFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Medications *
                    </label>
                    <button
                      onClick={handleAddMedication}
                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Medication
                    </button>
                  </div>
                  <div className="space-y-3">
                    {prescriptionFormData.medications.map((medication, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Medication Name *</label>
                            <input
                              type="text"
                              value={medication.name}
                              onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                              placeholder="e.g., Amoxicillin"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Dosage</label>
                            <input
                              type="text"
                              value={medication.dosage}
                              onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                              placeholder="e.g., 500mg"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                            <input
                              type="text"
                              value={medication.frequency}
                              onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                              placeholder="e.g., Twice daily"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                            <input
                              type="text"
                              value={medication.duration}
                              onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                              placeholder="e.g., 7 days"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                            <input
                              type="text"
                              value={medication.instructions}
                              onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                              placeholder="Special instructions"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        {prescriptionFormData.medications.length > 1 && (
                          <button
                            onClick={() => handleRemoveMedication(index)}
                            className="mt-2 text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelAdd}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitPrescription}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Prescription
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Add Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleAddPrescription}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Prescription
                </button>
              </div>

              {/* Logs List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading prescriptions...</p>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No prescriptions recorded yet</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Create New Prescription" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((prescription) => {
                    const prescriptionDate = formatDate(prescription.prescriptionDate || prescription.createdAt);
                    const doctorName = prescription.doctorName || 'Unknown Doctor';
                    const medications = prescription.medications || [];

                    return (
                      <div
                        key={prescription.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                <Pill className="h-5 w-5 mr-2 text-green-600" />
                                {prescription.prescriptionNumber || `Prescription #${prescription.id.slice(0, 8)}`}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                prescription.status === 'active' ? 'bg-green-100 text-green-800' :
                                prescription.status === 'dispensed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {prescription.status || 'active'}
                              </span>
                            </div>
                            {prescription.diagnosis && (
                              <p className="text-sm text-gray-700 mb-2">
                                <span className="font-medium">Diagnosis:</span> {prescription.diagnosis}
                              </p>
                            )}
                            {medications.length > 0 && (
                              <div className="mb-2">
                                <p className="text-sm font-medium text-gray-700 mb-1">Medications:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {medications.map((med, idx) => (
                                    <li key={idx}>
                                      {med.medicationName} - {med.dosage} {med.frequency} for {med.duration}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {prescription.notes && (
                              <p className="text-sm text-gray-600 mb-2">{prescription.notes}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span>Dr. {doctorName}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{prescriptionDate}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionsLogModal;


import React from 'react';
import { X, Plus, Trash2, Pill } from 'lucide-react';

const PrescriptionModal = ({
  isOpen,
  onClose,
  prescriptionFormData,
  setPrescriptionFormData,
  onAddMedication,
  onRemoveMedication,
  onSubmit,
  selectedClient
}) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Pill className="h-7 w-7 mr-3" />
              Write Prescription
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {selectedClient ? `For ${selectedClient.name || selectedClient.fullName}` : 'No client selected'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Diagnosis *
            </label>
            <input
              type="text"
              value={prescriptionFormData.diagnosis}
              onChange={(e) => setPrescriptionFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="e.g., Hypertension, Type 2 Diabetes"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Medications *
              </label>
              <button
                onClick={onAddMedication}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {prescriptionFormData.medications.map((medication, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-lg p-5">
                  {/* Item Number Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-3">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        Medication Item #{index + 1}
                      </h3>
                    </div>
                    {prescriptionFormData.medications.length > 1 && (
                      <button
                        onClick={() => onRemoveMedication(index)}
                        className="text-red-600 hover:bg-red-50 rounded-lg p-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Medication Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Medication Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medication Name *
                      </label>
                      <input
                        type="text"
                        value={medication.name}
                        onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                        placeholder="e.g., Lisinopril, Metformin"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dosage *
                      </label>
                      <input
                        type="text"
                        value={medication.dosage}
                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        placeholder="e.g., 10mg, 500mg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Route */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Route of Administration
                      </label>
                      <select
                        value={medication.route}
                        onChange={(e) => handleMedicationChange(index, 'route', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="oral">Oral</option>
                        <option value="topical">Topical</option>
                        <option value="injection">Injection</option>
                        <option value="inhalation">Inhalation</option>
                        <option value="rectal">Rectal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency *
                      </label>
                      <input
                        type="text"
                        value={medication.frequency}
                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                        placeholder="e.g., Once daily, Twice daily"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={medication.duration}
                        onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                        placeholder="e.g., 7 days, 30 days"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="text"
                        value={medication.quantity}
                        onChange={(e) => handleMedicationChange(index, 'quantity', e.target.value)}
                        placeholder="e.g., 30 tablets"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Instructions
                      </label>
                      <textarea
                        value={medication.instructions}
                        onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                        placeholder="e.g., Take with food, Take at bedtime"
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={prescriptionFormData.notes}
              onChange={(e) => setPrescriptionFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information or precautions..."
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
          >
            <Pill className="h-4 w-4 mr-2" />
            Create Prescription
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;


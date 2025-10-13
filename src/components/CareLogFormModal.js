import React, { useState } from 'react';
import { X, CheckCircle, FileText, Clock, Calendar } from 'lucide-react';

const CareLogFormModal = ({ 
  client, 
  caregiver, 
  institutionId,
  roleType, // 'doctor', 'nurse', 'caregiver'
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    logDate: new Date().toISOString().split('T')[0],
    logTime: new Date().toTimeString().slice(0, 5), // HH:MM format
    activity: '',
    observations: '',
    vitalSigns: '',
    medications: '',
    foodIntake: '',
    moodBehavior: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.activity.trim()) {
      alert('Please describe the care activity');
      return;
    }

    setSaving(true);
    try {
      const careLogPayload = {
        clientId: client.id,
        clientName: client.name || client.fullName,
        caregiverId: caregiver.uid,
        caregiverName: caregiver.name,
        institutionId: institutionId,
        roleType: roleType,
        logDate: new Date(formData.logDate),
        logTime: formData.logTime,
        activity: formData.activity,
        observations: formData.observations,
        vitalSigns: formData.vitalSigns,
        medications: formData.medications,
        foodIntake: formData.foodIntake,
        moodBehavior: formData.moodBehavior,
        additionalNotes: formData.notes
      };

      await onSave(careLogPayload);
      
      // Reset form
      setFormData({
        logDate: new Date().toISOString().split('T')[0],
        logTime: new Date().toTimeString().slice(0, 5),
        activity: '',
        observations: '',
        vitalSigns: '',
        medications: '',
        foodIntake: '',
        moodBehavior: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error in handleSave:', error);
      alert('Failed to save care log: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleTitle = () => {
    switch (roleType) {
      case 'doctor': return 'Doctor Care Log';
      case 'nurse': return 'Nurse Care Log';
      case 'caregiver': return 'Caregiver Activity Log';
      default: return 'Care Log';
    }
  };

  const getRoleColor = () => {
    switch (roleType) {
      case 'doctor': return 'from-blue-600 to-indigo-600';
      case 'nurse': return 'from-red-600 to-orange-600';
      case 'caregiver': return 'from-green-600 to-teal-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${getRoleColor()} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">{getRoleTitle()}</h2>
              <p className="text-white text-opacity-90">For: {client.name || client.fullName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Date
                </label>
                <input
                  type="date"
                  value={formData.logDate}
                  onChange={(e) => setFormData({...formData, logDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  Time
                </label>
                <input
                  type="time"
                  value={formData.logTime}
                  onChange={(e) => setFormData({...formData, logTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Activity/Care Provided */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {roleType === 'doctor' ? 'Medical Activity' : roleType === 'nurse' ? 'Nursing Care Provided' : 'Care Activity'} *
              </label>
              <textarea
                placeholder={
                  roleType === 'doctor' 
                    ? 'Describe medical examination, procedures performed, etc...'
                    : roleType === 'nurse'
                    ? 'Describe nursing care provided, treatments administered, etc...'
                    : 'Describe care activities: bathing, feeding, mobility assistance, etc...'
                }
                rows={3}
                value={formData.activity}
                onChange={(e) => setFormData({...formData, activity: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Observations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {roleType === 'doctor' ? 'Clinical Observations' : roleType === 'nurse' ? 'Patient Observations' : 'General Observations'}
              </label>
              <textarea
                placeholder={
                  roleType === 'doctor' 
                    ? 'Clinical findings, patient response to treatment...'
                    : roleType === 'nurse'
                    ? 'Patient condition, response to care, any concerns...'
                    : 'Client mood, behavior, physical condition...'
                }
                rows={3}
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Vital Signs (Doctor & Nurse only) */}
            {(roleType === 'doctor' || roleType === 'nurse') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vital Signs (Optional)
                </label>
                <textarea
                  placeholder="BP: 120/80, HR: 72, Temp: 98.6°F, O2: 98%..."
                  rows={2}
                  value={formData.vitalSigns}
                  onChange={(e) => setFormData({...formData, vitalSigns: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* Medications (Doctor & Nurse only) */}
            {(roleType === 'doctor' || roleType === 'nurse') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medications Administered
                </label>
                <textarea
                  placeholder="List medications given, dosage, time administered..."
                  rows={2}
                  value={formData.medications}
                  onChange={(e) => setFormData({...formData, medications: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* Food/Fluid Intake (All roles) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Food & Fluid Intake
              </label>
              <textarea
                placeholder="Meals consumed, fluid intake, dietary notes..."
                rows={2}
                value={formData.foodIntake}
                onChange={(e) => setFormData({...formData, foodIntake: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Mood & Behavior (All roles) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood & Behavior
              </label>
              <textarea
                placeholder="Patient mood, emotional state, behavioral observations..."
                rows={2}
                value={formData.moodBehavior}
                onChange={(e) => setFormData({...formData, moodBehavior: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                placeholder="Any other relevant information or observations..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Care Log
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareLogFormModal;


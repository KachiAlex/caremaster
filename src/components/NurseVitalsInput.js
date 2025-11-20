import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  Thermometer, 
  Droplets, 
  Weight, 
  Ruler,
  Save, 
  X,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createVitalSign } from '../api/vitalSignsAPI';
import { useUser } from '../contexts/UserContext';

const NurseVitalsInput = ({ patientId, patientName, nurseId, nurseName, onSave, onCancel }) => {
  const { institutionId, userProfile } = useUser();
  const [formData, setFormData] = useState({
    // Blood Pressure
    systolic: '',
    diastolic: '',
    
    // Heart Rate
    heartRate: '',
    
    // Temperature
    temperature: '',
    
    // Weight
    weight: '',
    
    // Height
    height: '',
    
    // Oxygen Saturation
    oxygenSaturation: '',
    
    // Respiratory Rate
    respiratoryRate: '',
    
    // Pain Level (0-10)
    painLevel: '',
    
    // Additional Notes
    notes: '',
    
    // Assessment Time
    assessmentTime: new Date().toISOString().slice(0, 16)
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // At least one vital sign should be entered
    const hasAnyVital = formData.systolic || formData.diastolic || formData.heartRate || 
                       formData.temperature || formData.weight || formData.height || 
                       formData.oxygenSaturation || formData.respiratoryRate || formData.painLevel;
    
    if (!hasAnyVital) {
      newErrors.general = 'Please enter at least one vital sign';
    }
    
    // Validate blood pressure
    if (formData.systolic && (isNaN(formData.systolic) || formData.systolic < 50 || formData.systolic > 250)) {
      newErrors.systolic = 'Systolic pressure should be between 50-250 mmHg';
    }
    if (formData.diastolic && (isNaN(formData.diastolic) || formData.diastolic < 30 || formData.diastolic > 150)) {
      newErrors.diastolic = 'Diastolic pressure should be between 30-150 mmHg';
    }
    
    // Validate heart rate
    if (formData.heartRate && (isNaN(formData.heartRate) || formData.heartRate < 30 || formData.heartRate > 200)) {
      newErrors.heartRate = 'Heart rate should be between 30-200 bpm';
    }
    
    // Validate temperature
    if (formData.temperature && (isNaN(formData.temperature) || formData.temperature < 95 || formData.temperature > 110)) {
      newErrors.temperature = 'Temperature should be between 95-110°F';
    }
    
    // Validate weight
    if (formData.weight && (isNaN(formData.weight) || formData.weight < 50 || formData.weight > 500)) {
      newErrors.weight = 'Weight should be between 50-500 lbs';
    }
    
    // Validate height
    if (formData.height && (isNaN(formData.height) || formData.height < 36 || formData.height > 84)) {
      newErrors.height = 'Height should be between 36-84 inches';
    }
    
    // Validate oxygen saturation
    if (formData.oxygenSaturation && (isNaN(formData.oxygenSaturation) || formData.oxygenSaturation < 70 || formData.oxygenSaturation > 100)) {
      newErrors.oxygenSaturation = 'Oxygen saturation should be between 70-100%';
    }
    
    // Validate respiratory rate
    if (formData.respiratoryRate && (isNaN(formData.respiratoryRate) || formData.respiratoryRate < 8 || formData.respiratoryRate > 40)) {
      newErrors.respiratoryRate = 'Respiratory rate should be between 8-40 breaths/min';
    }
    
    // Validate pain level
    if (formData.painLevel && (isNaN(formData.painLevel) || formData.painLevel < 0 || formData.painLevel > 10)) {
      newErrors.painLevel = 'Pain level should be between 0-10';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getVitalStatus = (type, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';
    
    switch (type) {
      case 'Blood Pressure':
        if (numValue > 140) return 'high';
        if (numValue < 90) return 'low';
        return 'normal';
      case 'Heart Rate':
        if (numValue > 100) return 'high';
        if (numValue < 60) return 'low';
        return 'normal';
      case 'Temperature':
        if (numValue > 100.4) return 'high';
        if (numValue < 97) return 'low';
        return 'normal';
      case 'Oxygen Saturation':
        if (numValue < 95) return 'low';
        return 'normal';
      case 'Respiratory Rate':
        if (numValue > 20) return 'high';
        if (numValue < 12) return 'low';
        return 'normal';
      case 'Pain Level':
        if (numValue > 7) return 'high';
        if (numValue > 4) return 'moderate';
        return 'low';
      default:
        return 'normal';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const vitalSignsToSave = [];
      
      // Save Blood Pressure
      if (formData.systolic && formData.diastolic) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Blood Pressure',
          value: `${formData.systolic}/${formData.diastolic}`,
          unit: 'mmHg',
          status: getVitalStatus('Blood Pressure', formData.systolic),
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Heart Rate
      if (formData.heartRate) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Heart Rate',
          value: formData.heartRate,
          unit: 'bpm',
          status: getVitalStatus('Heart Rate', formData.heartRate),
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Temperature
      if (formData.temperature) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Temperature',
          value: formData.temperature,
          unit: '°F',
          status: getVitalStatus('Temperature', formData.temperature),
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Weight
      if (formData.weight) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Weight',
          value: formData.weight,
          unit: 'lbs',
          status: 'normal',
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Height
      if (formData.height) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Height',
          value: formData.height,
          unit: 'inches',
          status: 'normal',
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Oxygen Saturation
      if (formData.oxygenSaturation) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Oxygen Saturation',
          value: formData.oxygenSaturation,
          unit: '%',
          status: getVitalStatus('Oxygen Saturation', formData.oxygenSaturation),
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Respiratory Rate
      if (formData.respiratoryRate) {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Respiratory Rate',
          value: formData.respiratoryRate,
          unit: 'breaths/min',
          status: getVitalStatus('Respiratory Rate', formData.respiratoryRate),
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Save Pain Level
      if (formData.painLevel !== '') {
        vitalSignsToSave.push({
          patientId,
          patientName,
          nurseId,
          nurseName,
          type: 'Pain Level',
          value: formData.painLevel,
          unit: '/10',
          status: getVitalStatus('Pain Level', formData.painLevel),
          notes: formData.notes,
          recordedAt: new Date(formData.assessmentTime)
        });
      }
      
      // Prepare clinician info for logging
      const clinicianInfo = {
        id: nurseId || userProfile?.id || userProfile?.uid,
        name: nurseName || userProfile?.name || userProfile?.displayName,
        role: userProfile?.userType || userProfile?.type || 'nurse',
        email: userProfile?.email,
        institutionId: institutionId
      };
      
      // Save all vital signs with clinician info for logging
      for (const vitalSign of vitalSignsToSave) {
        await createVitalSign(vitalSign, institutionId, clinicianInfo);
      }
      
      // Log vital signs activity to patient database (comprehensive logging)
      try {
        const ComprehensivePatientLogger = (await import('../utils/comprehensivePatientLogger')).default;
        const vitalSignsData = {
          vitals: vitalSignsToSave.map(v => ({
            type: v.type,
            value: v.value,
            unit: v.unit,
            status: v.status
          })),
          assessmentTime: formData.assessmentTime,
          notes: formData.notes
        };
        
        await ComprehensivePatientLogger.logVitalSigns(
          patientId,
          vitalSignsData,
          {
            ...clinicianInfo,
            medicalQualification: userProfile?.medicalQualification
          }
        );
      } catch (logError) {
        console.warn('Could not log vital signs to patient database:', logError);
        // Don't fail the vital signs recording if logging fails
      }
      
      toast.success(`Successfully recorded ${vitalSignsToSave.length} vital sign(s) for ${patientName}`);
      
      if (onSave) {
        onSave(vitalSignsToSave);
      }
      
      // Reset form
      setFormData({
        systolic: '',
        diastolic: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        oxygenSaturation: '',
        respiratoryRate: '',
        painLevel: '',
        notes: '',
        assessmentTime: new Date().toISOString().slice(0, 16)
      });
      
    } catch (error) {
      console.error('Error saving vital signs:', error);
      toast.error('Failed to save vital signs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Activity className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Vital Signs</h2>
                <p className="text-sm text-gray-600">Patient: {patientName}</p>
                <p className="text-xs text-gray-500">Nurse: {nurseName}</p>
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

        <form onSubmit={handleSubmit} className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">{errors.general}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Blood Pressure */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Heart className="h-4 w-4 text-red-600 mr-2" />
                Blood Pressure
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Systolic"
                    value={formData.systolic}
                    onChange={(e) => handleInputChange('systolic', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      errors.systolic ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.systolic && <p className="text-red-500 text-xs mt-1">{errors.systolic}</p>}
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Diastolic"
                    value={formData.diastolic}
                    onChange={(e) => handleInputChange('diastolic', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      errors.diastolic ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.diastolic && <p className="text-red-500 text-xs mt-1">{errors.diastolic}</p>}
                </div>
              </div>
            </div>

            {/* Heart Rate */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Activity className="h-4 w-4 text-red-600 mr-2" />
                Heart Rate
              </label>
              <input
                type="number"
                placeholder="bpm"
                value={formData.heartRate}
                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.heartRate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.heartRate && <p className="text-red-500 text-xs mt-1">{errors.heartRate}</p>}
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Thermometer className="h-4 w-4 text-orange-600 mr-2" />
                Temperature
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="°F"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.temperature ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.temperature && <p className="text-red-500 text-xs mt-1">{errors.temperature}</p>}
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Weight className="h-4 w-4 text-blue-600 mr-2" />
                Weight
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="lbs"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.weight ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Ruler className="h-4 w-4 text-green-600 mr-2" />
                Height
              </label>
              <input
                type="number"
                placeholder="inches"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.height ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
            </div>

            {/* Oxygen Saturation */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Droplets className="h-4 w-4 text-cyan-600 mr-2" />
                Oxygen Saturation
              </label>
              <input
                type="number"
                placeholder="%"
                value={formData.oxygenSaturation}
                onChange={(e) => handleInputChange('oxygenSaturation', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.oxygenSaturation ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.oxygenSaturation && <p className="text-red-500 text-xs mt-1">{errors.oxygenSaturation}</p>}
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Activity className="h-4 w-4 text-purple-600 mr-2" />
                Respiratory Rate
              </label>
              <input
                type="number"
                placeholder="breaths/min"
                value={formData.respiratoryRate}
                onChange={(e) => handleInputChange('respiratoryRate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.respiratoryRate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.respiratoryRate && <p className="text-red-500 text-xs mt-1">{errors.respiratoryRate}</p>}
            </div>

            {/* Pain Level */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Heart className="h-4 w-4 text-pink-600 mr-2" />
                Pain Level
              </label>
              <input
                type="number"
                min="0"
                max="10"
                placeholder="0-10"
                value={formData.painLevel}
                onChange={(e) => handleInputChange('painLevel', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.painLevel ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.painLevel && <p className="text-red-500 text-xs mt-1">{errors.painLevel}</p>}
            </div>

            {/* Assessment Time */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 text-gray-600 mr-2" />
                Assessment Time
              </label>
              <input
                type="datetime-local"
                value={formData.assessmentTime}
                onChange={(e) => handleInputChange('assessmentTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 space-y-2">
            <label className="text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              placeholder="Enter any additional observations or notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Vital Signs
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NurseVitalsInput;

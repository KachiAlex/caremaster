import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Weight, 
  Ruler, 
  Eye, 
  FileText, 
  Camera, 
  Save, 
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createNurseReport } from '../api/nurseReportsAPI';
import { emergencyAPI } from '../api/emergencyAPI';

const MedicalHistoryForm = ({ patientId, nurseId, nurseName, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    // Vital Signs
    bloodPressure: { systolic: '', diastolic: '' },
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    
    // Pain Assessment
    painLevel: 0,
    painLocation: '',
    painDescription: '',
    
    // Physical Assessment
    generalAppearance: '',
    mentalStatus: '',
    skinCondition: '',
    mobilityStatus: '',
    nutritionStatus: '',
    
    // Symptoms and Observations
    symptoms: [],
    observations: '',
    concerns: '',
    
    // Medications
    currentMedications: [],
    medicationCompliance: '',
    
    // Care Plan Adherence
    carePlanAdherence: '',
    carePlanNotes: '',
    
    // Photos and Documentation
    photos: [],
    additionalNotes: '',
    
    // Emergency Indicators
    emergencyIndicators: {
      severePain: false,
      breathingDifficulty: false,
      chestPain: false,
      confusion: false,
      severeNausea: false,
      highFever: false,
      severeWeakness: false,
      other: false
    },
    
    status: 'stable' // stable, concerning, critical
  });

  const [loading, setLoading] = useState(false);
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');

  const painScaleOptions = [
    { value: 0, label: '0 - No Pain' },
    { value: 1, label: '1-3 - Mild Pain' },
    { value: 4, label: '4-6 - Moderate Pain' },
    { value: 7, label: '7-8 - Severe Pain' },
    { value: 9, label: '9-10 - Unbearable Pain' }
  ];

  const symptomOptions = [
    'Nausea', 'Dizziness', 'Headache', 'Fatigue', 'Weakness', 
    'Shortness of breath', 'Chest pain', 'Abdominal pain', 
    'Confusion', 'Sleep disturbances', 'Appetite loss', 'Other'
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    // In a real implementation, you would upload these to cloud storage
    // For now, we'll just store the file names
    const photoUrls = files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      timestamp: new Date().toISOString()
    }));
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...photoUrls]
    }));
  };

  const checkEmergencyConditions = () => {
    const { emergencyIndicators, bloodPressure, heartRate, temperature, oxygenSaturation, painLevel } = formData;
    
    // Check for critical vital signs
    const criticalVitals = 
      (bloodPressure.systolic && parseInt(bloodPressure.systolic) > 180) ||
      (bloodPressure.systolic && parseInt(bloodPressure.systolic) < 90) ||
      (heartRate && parseInt(heartRate) > 120) ||
      (heartRate && parseInt(heartRate) < 50) ||
      (temperature && parseFloat(temperature) > 102) ||
      (oxygenSaturation && parseInt(oxygenSaturation) < 90);

    // Check emergency indicators
    const hasEmergencyIndicator = Object.values(emergencyIndicators).some(value => value === true);
    
    return criticalVitals || hasEmergencyIndicator || painLevel >= 8;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Check if this is an emergency situation
      if (checkEmergencyConditions()) {
        setShowEmergencyAlert(true);
        return;
      }

      await createNurseReport({
        patientId,
        nurseId,
        nurseName,
        bloodPressure: `${formData.bloodPressure.systolic}/${formData.bloodPressure.diastolic}`,
        heartRate: parseInt(formData.heartRate) || 0,
        temperature: parseFloat(formData.temperature) || 0,
        weight: parseFloat(formData.weight) || 0,
        height: parseFloat(formData.height) || 0,
        oxygenSaturation: parseInt(formData.oxygenSaturation) || 0,
        painLevel: formData.painLevel,
        notes: JSON.stringify({
          respiratoryRate: formData.respiratoryRate,
          painLocation: formData.painLocation,
          painDescription: formData.painDescription,
          generalAppearance: formData.generalAppearance,
          mentalStatus: formData.mentalStatus,
          skinCondition: formData.skinCondition,
          mobilityStatus: formData.mobilityStatus,
          nutritionStatus: formData.nutritionStatus,
          symptoms: formData.symptoms,
          observations: formData.observations,
          concerns: formData.concerns,
          currentMedications: formData.currentMedications,
          medicationCompliance: formData.medicationCompliance,
          carePlanAdherence: formData.carePlanAdherence,
          carePlanNotes: formData.carePlanNotes,
          photos: formData.photos,
          additionalNotes: formData.additionalNotes,
          emergencyIndicators: formData.emergencyIndicators
        }),
        status: formData.status
      });

      toast.success('Medical history report saved successfully!');
      if (onSave) onSave(formData);
      
    } catch (error) {
      console.error('Error saving medical history:', error);
      toast.error('Failed to save medical history report');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyAlert = async () => {
    try {
      setLoading(true);
      
      const emergencyData = {
        patientId,
        nurseId,
        nurseName,
        emergencyType: 'Medical Emergency',
        severity: 'Critical',
        description: emergencyReason || 'Critical medical condition detected during patient assessment',
        location: 'Patient Residence',
        triggeredBy: 'Nurse Assessment',
        medicalData: formData
      };

      await emergencyAPI.createEmergency(emergencyData);
      
      // Also save the medical report
      await createNurseReport({
        patientId,
        nurseId,
        nurseName,
        bloodPressure: `${formData.bloodPressure.systolic}/${formData.bloodPressure.diastolic}`,
        heartRate: parseInt(formData.heartRate) || 0,
        temperature: parseFloat(formData.temperature) || 0,
        weight: parseFloat(formData.weight) || 0,
        height: parseFloat(formData.height) || 0,
        oxygenSaturation: parseInt(formData.oxygenSaturation) || 0,
        painLevel: formData.painLevel,
        notes: JSON.stringify({
          ...formData,
          emergencyTriggered: true,
          emergencyReason
        }),
        status: 'critical'
      });

      toast.success('Emergency alert sent and medical report saved!');
      setShowEmergencyAlert(false);
      if (onSave) onSave(formData);
      
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FileText className="mr-2 text-blue-600" />
          Medical History Assessment
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="mr-2" size={16} />
            Save Report
          </button>
        </div>
      </div>

      {/* Emergency Alert Modal */}
      {showEmergencyAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-red-600 mr-2" size={24} />
              <h3 className="text-lg font-bold text-red-600">Emergency Alert</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Critical conditions detected in patient assessment. This will trigger an emergency alert to doctors and admin.
            </p>
            <textarea
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder="Describe the emergency situation..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              rows={3}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEmergencyAlert(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyAlert}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Send Emergency Alert
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vital Signs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Heart className="mr-2 text-red-500" />
            Vital Signs
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Pressure (mmHg)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Systolic"
                  value={formData.bloodPressure.systolic}
                  onChange={(e) => handleInputChange('bloodPressure.systolic', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Diastolic"
                  value={formData.bloodPressure.diastolic}
                  onChange={(e) => handleInputChange('bloodPressure.diastolic', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heart Rate (BPM)
              </label>
              <input
                type="number"
                value={formData.heartRate}
                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Thermometer className="inline mr-1" size={16} />
                Temperature (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oxygen Saturation (%)
              </label>
              <input
                type="number"
                value={formData.oxygenSaturation}
                onChange={(e) => handleInputChange('oxygenSaturation', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Weight className="inline mr-1" size={16} />
                Weight (lbs)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Ruler className="inline mr-1" size={16} />
                Height (inches)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Pain Assessment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Activity className="mr-2 text-orange-500" />
            Pain Assessment
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pain Level (0-10)
            </label>
            <select
              value={formData.painLevel}
              onChange={(e) => handleInputChange('painLevel', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              {painScaleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pain Location
            </label>
            <input
              type="text"
              value={formData.painLocation}
              onChange={(e) => handleInputChange('painLocation', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="e.g., chest, back, joints"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pain Description
            </label>
            <textarea
              value={formData.painDescription}
              onChange={(e) => handleInputChange('painDescription', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Describe the pain (sharp, dull, throbbing, etc.)"
            />
          </div>
        </div>
      </div>

      {/* Physical Assessment */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Eye className="mr-2 text-green-500" />
          Physical Assessment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General Appearance
            </label>
            <textarea
              value={formData.generalAppearance}
              onChange={(e) => handleInputChange('generalAppearance', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Overall appearance, alertness, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mental Status
            </label>
            <textarea
              value={formData.mentalStatus}
              onChange={(e) => handleInputChange('mentalStatus', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Orientation, memory, mood, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skin Condition
            </label>
            <textarea
              value={formData.skinCondition}
              onChange={(e) => handleInputChange('skinCondition', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Skin color, temperature, moisture, lesions, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobility Status
            </label>
            <textarea
              value={formData.mobilityStatus}
              onChange={(e) => handleInputChange('mobilityStatus', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Walking, balance, strength, etc."
            />
          </div>
        </div>
      </div>

      {/* Symptoms */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Symptoms</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {symptomOptions.map(symptom => (
            <label key={symptom} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.symptoms.includes(symptom)}
                onChange={(e) => handleArrayChange('symptoms', symptom, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">{symptom}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Emergency Indicators */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <AlertTriangle className="mr-2 text-red-500" />
          Emergency Indicators
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(formData.emergencyIndicators).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleInputChange(`emergencyIndicators.${key}`, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Observations and Notes */}
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observations
          </label>
          <textarea
            value={formData.observations}
            onChange={(e) => handleInputChange('observations', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            rows={4}
            placeholder="Detailed observations during the visit..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Concerns
          </label>
          <textarea
            value={formData.concerns}
            onChange={(e) => handleInputChange('concerns', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Any concerns or recommendations..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            value={formData.additionalNotes}
            onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Any additional notes or comments..."
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Camera className="mr-2 text-purple-500" />
          Photo Documentation
        </h3>
        
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoUpload}
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
        
        {formData.photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {formData.photos.map((photo, index) => (
              <div key={index} className="relative">
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      photos: prev.photos.filter((_, i) => i !== index)
                    }));
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg"
        >
          <option value="stable">Stable</option>
          <option value="concerning">Concerning</option>
          <option value="critical">Critical</option>
        </select>
      </div>
    </div>
  );
};

export default MedicalHistoryForm;

import React, { useState } from 'react';
import { X, Heart, Thermometer, Activity, Droplet, Scale, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'react-toastify';

const VitalsQuickEntry = ({ Client, onClose, onSave }) => {
  const [vitals, setVitals] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    painLevel: '',
    respiratoryRate: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);

  // Normal ranges for validation
  const normalRanges = {
    bloodPressureSystolic: { min: 90, max: 140, unit: 'mmHg' },
    bloodPressureDiastolic: { min: 60, max: 90, unit: 'mmHg' },
    heartRate: { min: 60, max: 100, unit: 'bpm' },
    temperature: { min: 97.0, max: 99.0, unit: '°F' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
    respiratoryRate: { min: 12, max: 20, unit: '/min' }
  };

  const getVitalStatus = (field, value) => {
    if (!value || !normalRanges[field]) return null;
    const num = parseFloat(value);
    const range = normalRanges[field];
    
    if (num < range.min) return 'low';
    if (num > range.max) return 'high';
    return 'normal';
  };

  const handleChange = (field, value) => {
    setVitals(prev => ({ ...prev, [field]: value }));
  };

  const handleQuickPainLevel = (level) => {
    setVitals(prev => ({ ...prev, painLevel: level.toString() }));
  };

  const getStatusIcon = (status) => {
    if (status === 'low') return <TrendingDown className="h-4 w-4 text-blue-600" />;
    if (status === 'high') return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (status === 'normal') return <Minus className="h-4 w-4 text-green-600" />;
    return null;
  };

  const getStatusColor = (status) => {
    if (status === 'low') return 'border-blue-300 bg-blue-50';
    if (status === 'high') return 'border-red-300 bg-red-50';
    if (status === 'normal') return 'border-green-300 bg-green-50';
    return 'border-gray-300';
  };

  const validateVitals = () => {
    // At least one vital must be entered
    const hasAnyVital = Object.keys(vitals).some(key => 
      key !== 'notes' && vitals[key] !== ''
    );
    
    if (!hasAnyVital) {
      toast.error('Please enter at least one vital sign');
      return false;
    }

    // Check if blood pressure values are both provided or both empty
    const hasSystolic = vitals.bloodPressureSystolic !== '';
    const hasDiastolic = vitals.bloodPressureDiastolic !== '';
    
    if (hasSystolic !== hasDiastolic) {
      toast.error('Please provide both systolic and diastolic blood pressure values');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateVitals()) return;

    try {
      setSaving(true);

      const vitalData = {
        clientId: client.id,
        clientName: client.name,
        bloodPressure: vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic 
          ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`
          : null,
        heartRate: vitals.heartRate || null,
        temperature: vitals.temperature || null,
        oxygenSaturation: vitals.oxygenSaturation || null,
        weight: vitals.weight || null,
        painLevel: vitals.painLevel || null,
        respiratoryRate: vitals.respiratoryRate || null,
        notes: vitals.notes || '',
        recordedAt: new Date().toISOString(),
        status: determineOverallStatus()
      };

      await onSave(vitalData);
      toast.success('Vitals recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error saving vitals:', error);
      toast.error('Failed to save vitals');
    } finally {
      setSaving(false);
    }
  };

  const determineOverallStatus = () => {
    const statuses = [
      getVitalStatus('bloodPressureSystolic', vitals.bloodPressureSystolic),
      getVitalStatus('bloodPressureDiastolic', vitals.bloodPressureDiastolic),
      getVitalStatus('heartRate', vitals.heartRate),
      getVitalStatus('temperature', vitals.temperature),
      getVitalStatus('oxygenSaturation', vitals.oxygenSaturation),
      getVitalStatus('respiratoryRate', vitals.respiratoryRate)
    ].filter(Boolean);

    if (statuses.includes('high') || statuses.includes('low')) return 'abnormal';
    return 'normal';
  };

  const VitalInput = ({ icon: Icon, label, field, type = 'number', step, placeholder }) => {
    const status = getVitalStatus(field, vitals[field]);
    const statusColor = getStatusColor(status);

    return (
      <div className={`border rounded-lg p-3 ${statusColor}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">{label}</label>
          </div>
          {status && getStatusIcon(status)}
        </div>
        <input
          type={type}
          step={step}
          value={vitals[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border-0 bg-white rounded-md focus:ring-2 focus:ring-blue-500"
        />
        {normalRanges[field] && (
          <p className="text-xs text-gray-500 mt-1">
            Normal: {normalRanges[field].min}-{normalRanges[field].max} {normalRanges[field].unit}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div>
            <h2 className="text-2xl font-bold text-white">Record Vital Signs</h2>
            <p className="text-sm text-blue-100 mt-1">{Client?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vitals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Blood Pressure */}
            <div className="md:col-span-2 lg:col-span-1">
              <div className="border rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Heart className="h-4 w-4 text-red-600" />
                  <label className="text-sm font-medium text-gray-700">Blood Pressure</label>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={vitals.bloodPressureSystolic}
                    onChange={(e) => handleChange('bloodPressureSystolic', e.target.value)}
                    placeholder="Systolic"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-2xl text-gray-400">/</span>
                  <input
                    type="number"
                    value={vitals.bloodPressureDiastolic}
                    onChange={(e) => handleChange('bloodPressureDiastolic', e.target.value)}
                    placeholder="Diastolic"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Normal: 90-140 / 60-90 mmHg</p>
              </div>
            </div>

            <VitalInput
              icon={Heart}
              label="Heart Rate"
              field="heartRate"
              placeholder="72"
            />

            <VitalInput
              icon={Thermometer}
              label="Temperature"
              field="temperature"
              step="0.1"
              placeholder="98.6"
            />

            <VitalInput
              icon={Droplet}
              label="O₂ Saturation"
              field="oxygenSaturation"
              placeholder="98"
            />

            <VitalInput
              icon={Activity}
              label="Respiratory Rate"
              field="respiratoryRate"
              placeholder="16"
            />

            <VitalInput
              icon={Scale}
              label="Weight (lbs)"
              field="weight"
              step="0.1"
              placeholder="150"
            />
          </div>

          {/* Pain Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pain Level (0-10)
            </label>
            <div className="grid grid-cols-11 gap-2">
              {[0,1,2,3,4,5,6,7,8,9,10].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleQuickPainLevel(level)}
                  className={`h-12 rounded-lg font-bold transition-all ${
                    vitals.painLevel === level.toString()
                      ? level <= 3 ? 'bg-green-600 text-white' :
                        level <= 6 ? 'bg-yellow-500 text-white' :
                        'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>No Pain</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={vitals.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any observations, symptoms, or concerns..."
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Vitals
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VitalsQuickEntry;


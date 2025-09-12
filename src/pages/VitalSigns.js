import React, { useState } from 'react';
import { Plus, Heart, Activity, Thermometer, Droplets, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const VitalSigns = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  
  // Mock data - will be replaced with real data from Data Connect
  const [vitalSigns, setVitalSigns] = useState([
    {
      id: 1,
      type: 'Blood Pressure',
      value: '120/80',
      unit: 'mmHg',
      recordedAt: '2024-01-15T10:00:00',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      status: 'normal'
    },
    {
      id: 2,
      type: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      recordedAt: '2024-01-15T09:30:00',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      status: 'normal'
    },
    {
      id: 3,
      type: 'Temperature',
      value: '98.6',
      unit: '°F',
      recordedAt: '2024-01-15T09:00:00',
      icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      status: 'normal'
    },
    {
      id: 4,
      type: 'Weight',
      value: '165',
      unit: 'lbs',
      recordedAt: '2024-01-14T08:00:00',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      status: 'normal'
    }
  ]);

  const [newVitalSign, setNewVitalSign] = useState({
    type: 'Blood Pressure',
    value: '',
    unit: 'mmHg',
    recordedAt: new Date().toISOString().slice(0, 16)
  });

  const vitalTypes = [
    { value: 'Blood Pressure', unit: 'mmHg', icon: Heart, color: 'text-red-600' },
    { value: 'Heart Rate', unit: 'bpm', icon: Activity, color: 'text-green-600' },
    { value: 'Temperature', unit: '°F', icon: Thermometer, color: 'text-orange-600' },
    { value: 'Weight', unit: 'lbs', icon: Droplets, color: 'text-blue-600' },
    { value: 'Blood Sugar', unit: 'mg/dL', icon: Activity, color: 'text-purple-600' },
    { value: 'Oxygen Saturation', unit: '%', icon: Heart, color: 'text-blue-600' }
  ];

  const handleAddVitalSign = (e) => {
    e.preventDefault();
    const selectedType = vitalTypes.find(t => t.value === newVitalSign.type);
    const vitalSign = {
      id: Date.now(),
      ...newVitalSign,
      icon: selectedType.icon,
      color: selectedType.color,
      bgColor: 'bg-gray-50',
      status: 'normal'
    };
    setVitalSigns([vitalSign, ...vitalSigns]);
    setNewVitalSign({
      type: 'Blood Pressure',
      value: '',
      unit: 'mmHg',
      recordedAt: new Date().toISOString().slice(0, 16)
    });
    setShowAddForm(false);
    toast.success('Vital sign recorded successfully');
  };

  const handleTypeChange = (type) => {
    const selectedType = vitalTypes.find(t => t.value === type);
    setNewVitalSign({
      ...newVitalSign,
      type,
      unit: selectedType.unit
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vital Signs</h1>
          <p className="text-gray-600">Track and monitor your health metrics</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Record Vital Sign
        </button>
      </div>

      {/* Add Vital Sign Form */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record New Vital Sign</h2>
          <form onSubmit={handleAddVitalSign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Vital Sign Type</label>
                <select
                  className="form-input"
                  value={newVitalSign.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {vitalTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Value</label>
                <input
                  type="text"
                  className="form-input"
                  value={newVitalSign.value}
                  onChange={(e) => setNewVitalSign({...newVitalSign, value: e.target.value})}
                  placeholder={`Enter ${newVitalSign.type.toLowerCase()} value`}
                  required
                />
              </div>
              <div>
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className="form-input"
                  value={newVitalSign.unit}
                  onChange={(e) => setNewVitalSign({...newVitalSign, unit: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="form-label">Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newVitalSign.recordedAt}
                  onChange={(e) => setNewVitalSign({...newVitalSign, recordedAt: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button type="submit" className="btn btn-primary">
                Record Vital Sign
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {vitalSigns.slice(0, 4).map((vital) => {
          const Icon = vital.icon;
          return (
            <div key={vital.id} className={`card ${vital.bgColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{vital.type}</p>
                  <p className="text-2xl font-bold text-gray-900">{vital.value}</p>
                  <p className="text-sm text-gray-500">{vital.unit}</p>
                </div>
                <Icon className={`h-8 w-8 ${vital.color}`} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">{formatDate(vital.recordedAt)}</p>
                <div className="flex items-center">
                  {vital.status === 'normal' ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Records */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Records</h2>
          <button className="btn btn-outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Trends
          </button>
        </div>
        <div className="space-y-3">
          {vitalSigns.slice(0, 10).map((vital) => {
            const Icon = vital.icon;
            return (
              <div key={vital.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Icon className={`h-5 w-5 ${vital.color} mr-3`} />
                  <div>
                    <p className="font-medium text-gray-900">{vital.type}</p>
                    <p className="text-sm text-gray-500">{formatDate(vital.recordedAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{vital.value}</p>
                  <p className="text-xs text-gray-500">{vital.unit}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VitalSigns;

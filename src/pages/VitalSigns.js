import React, { useState } from 'react';
import { 
  Heart, 
  Droplets, 
  Plus, 
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

const VitalSigns = () => {
  const [formData, setFormData] = useState({
    vitalType: 'Blood Pressure',
    reading: '',
    notes: ''
  });

  // Mock data for current vitals
  const currentVitals = [
    {
      id: 1,
      type: 'Blood Pressure',
      value: '140/90',
      unit: 'mmHg',
      timestamp: '9/3/2025, 9:00:00 AM',
      status: 'Warning',
      statusColor: 'bg-yellow-100 text-yellow-800',
      icon: Heart
    },
    {
      id: 2,
      type: 'Blood Sugar',
      value: '120',
      unit: 'mg/dL',
      timestamp: '9/3/2025, 9:15:00 AM',
      status: 'Normal',
      statusColor: 'bg-green-100 text-green-800',
      icon: Droplets
    }
  ];

  // Mock data for health trends
  const healthTrends = [
    {
      id: 1,
      type: 'Blood Pressure',
      trend: 'Improving',
      trendColor: 'text-green-600',
      average: 'Average',
      icon: Heart
    }
  ];

  const vitalTypes = [
    'Blood Pressure',
    'Blood Sugar',
    'Heart Rate',
    'Temperature',
    'Weight',
    'Oxygen Saturation',
    'Respiratory Rate',
    'Pain Level'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Vital reading submitted:', formData);
    toast.success('Vital reading saved successfully');
    // Reset form
    setFormData({
      vitalType: 'Blood Pressure',
      reading: '',
      notes: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Normal':
        return 'bg-green-100 text-green-800';
      case 'Warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'Critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Vitals Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Heart className="h-6 w-6 text-gray-700 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Current Vitals</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentVitals.map((vital) => {
            const Icon = vital.icon;
            return (
              <div key={vital.id} className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Icon className="h-6 w-6 text-gray-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">{vital.type}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(vital.status)}`}>
                    {vital.status}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-gray-900">{vital.value}</span>
                  <span className="text-lg text-gray-600 ml-2">{vital.unit}</span>
                </div>
                <p className="text-sm text-gray-500">{vital.timestamp}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record New Reading Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Plus className="h-6 w-6 text-gray-700 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Record New Reading</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vital Type
            </label>
            <div className="relative">
              <select
                value={formData.vitalType}
                onChange={(e) => setFormData({...formData, vitalType: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                {vitalTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reading
            </label>
            <input
              type="text"
              value={formData.reading}
              onChange={(e) => setFormData({...formData, reading: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 120/80 or 98.6"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Any additional observations..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Save Reading
            </button>
          </div>
        </form>
      </div>

      {/* Health Trends Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <TrendingUp className="h-6 w-6 text-gray-700 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Health Trends (Last 7 Days)</h2>
        </div>

        <div className="space-y-4">
          {healthTrends.map((trend) => {
            const Icon = trend.icon;
            return (
              <div key={trend.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Icon className="h-6 w-6 text-gray-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{trend.type}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${trend.trendColor}`}>
                        {trend.trend}
                      </span>
                      <span className="text-sm text-gray-500">{trend.average}</span>
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VitalSigns;
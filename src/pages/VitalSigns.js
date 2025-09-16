import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Droplets, 
  Plus, 
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { getVitalSignsByPatient, createVitalSign, getVitalSignsTrends } from '../api/vitalSignsAPI';

const VitalSigns = () => {
  const { user, userProfile } = useUser();
  const [formData, setFormData] = useState({
    vitalType: 'Blood Pressure',
    reading: '',
    notes: ''
  });
  const [currentVitals, setCurrentVitals] = useState([]);
  const [healthTrends, setHealthTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch vital signs data
  useEffect(() => {
    const fetchVitalSigns = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        
        // Fetch recent vital signs
        const vitalSigns = await getVitalSignsByPatient(user.uid);
        
        // Get the latest reading for each type
        const latestByType = {};
        vitalSigns.forEach(vital => {
          if (!latestByType[vital.type] || new Date(vital.recordedAt) > new Date(latestByType[vital.type].recordedAt)) {
            latestByType[vital.type] = vital;
          }
        });
        
        // Convert to display format
        const currentVitalsData = Object.values(latestByType).map(vital => ({
          id: vital.id,
          type: vital.type,
          value: vital.value,
          unit: vital.unit,
          timestamp: new Date(vital.recordedAt).toLocaleString(),
          status: vital.status || 'Normal',
          statusColor: getStatusColor(vital.status || 'Normal'),
          icon: getVitalIcon(vital.type)
        }));
        
        setCurrentVitals(currentVitalsData);
        
        // Fetch trends
        const trends = await getVitalSignsTrends(user.uid);
        const trendsData = Object.keys(trends).map(type => ({
          id: type,
          type: type,
          trend: trends[type].trend || 'Stable',
          trendColor: getTrendColor(trends[type].trend || 'Stable'),
          average: trends[type].average || 'N/A',
          icon: getVitalIcon(type)
        }));
        
        setHealthTrends(trendsData);
        
      } catch (error) {
        console.error('Error fetching vital signs:', error);
        toast.error('Failed to load vital signs data');
      } finally {
        setLoading(false);
      }
    };

    fetchVitalSigns();
  }, [user?.uid]);

  // Helper function to get icon for vital type
  const getVitalIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'blood pressure':
        return Heart;
      case 'blood sugar':
        return Droplets;
      default:
        return Heart;
    }
  };

  // Helper function to get trend color
  const getTrendColor = (trend) => {
    switch (trend.toLowerCase()) {
      case 'increasing':
        return 'text-red-600';
      case 'decreasing':
        return 'text-green-600';
      case 'improving':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error('Please log in to record vital signs');
      return;
    }

    if (!formData.reading.trim()) {
      toast.error('Please enter a reading value');
      return;
    }

    try {
      const vitalSignData = {
        patientId: user.uid,
        patientName: userProfile?.name || userProfile?.displayName || user?.displayName || 'Patient',
        type: formData.vitalType,
        value: formData.reading,
        unit: getVitalUnit(formData.vitalType),
        notes: formData.notes,
        status: getVitalStatus(formData.vitalType, formData.reading)
      };

      await createVitalSign(vitalSignData);
      
      toast.success('Vital reading saved successfully!');
      
      // Reset form
      setFormData({
        vitalType: 'Blood Pressure',
        reading: '',
        notes: ''
      });

      // Refresh the data
      const vitalSigns = await getVitalSignsByPatient(user.uid);
      
      // Get the latest reading for each type
      const latestByType = {};
      vitalSigns.forEach(vital => {
        if (!latestByType[vital.type] || new Date(vital.recordedAt) > new Date(latestByType[vital.type].recordedAt)) {
          latestByType[vital.type] = vital;
        }
      });
      
      // Convert to display format
      const currentVitalsData = Object.values(latestByType).map(vital => ({
        id: vital.id,
        type: vital.type,
        value: vital.value,
        unit: vital.unit,
        timestamp: new Date(vital.recordedAt).toLocaleString(),
        status: vital.status || 'Normal',
        statusColor: getStatusColor(vital.status || 'Normal'),
        icon: getVitalIcon(vital.type)
      }));
      
      setCurrentVitals(currentVitalsData);
      
    } catch (error) {
      console.error('Error saving vital sign:', error);
      toast.error('Failed to save vital reading. Please try again.');
    }
  };

  // Helper function to get unit for vital type
  const getVitalUnit = (type) => {
    switch (type) {
      case 'Blood Pressure':
        return 'mmHg';
      case 'Blood Sugar':
        return 'mg/dL';
      case 'Heart Rate':
        return 'bpm';
      case 'Temperature':
        return '°F';
      case 'Weight':
        return 'lbs';
      case 'Oxygen Saturation':
        return '%';
      case 'Respiratory Rate':
        return 'breaths/min';
      case 'Pain Level':
        return '/10';
      default:
        return '';
    }
  };

  // Helper function to determine status based on reading
  const getVitalStatus = (type, reading) => {
    const value = parseFloat(reading);
    
    switch (type) {
      case 'Blood Pressure':
        if (value >= 140 || value <= 90) return 'Warning';
        return 'Normal';
      case 'Blood Sugar':
        if (value >= 140 || value <= 70) return 'Warning';
        return 'Normal';
      case 'Heart Rate':
        if (value >= 100 || value <= 60) return 'Warning';
        return 'Normal';
      case 'Temperature':
        if (value >= 100.4 || value <= 97) return 'Warning';
        return 'Normal';
      case 'Oxygen Saturation':
        if (value < 95) return 'Warning';
        return 'Normal';
      default:
        return 'Normal';
    }
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading vital signs...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Vitals Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Heart className="h-6 w-6 text-gray-700 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Current Vitals</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentVitals.length > 0 ? (
            currentVitals.map((vital) => {
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
            })
          ) : (
            <div className="col-span-2 p-6 border border-gray-200 rounded-lg text-center">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vital Signs Recorded</h3>
              <p className="text-gray-600">Start recording your vital signs below to track your health.</p>
            </div>
          )}
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
          {healthTrends.length > 0 ? (
            healthTrends.map((trend) => {
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
                        <span className="text-sm text-gray-500">Avg: {trend.average}</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-6 border border-gray-200 rounded-lg text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trends Available</h3>
              <p className="text-gray-600">Record more vital signs to see health trends over time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VitalSigns;
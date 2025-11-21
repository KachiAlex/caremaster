import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Clock, 
  User, 
  Heart, 
  Activity,
  Send,
  X,
  CheckCircle,
  Eye,
  Download,
  Bell,
  Shield,
  Zap
} from 'lucide-react';
import { toast } from 'react-toastify';
import { emergencyAPI } from '../api/emergencyAPI';

const EmergencyAlertSystem = ({ userRole, userId, userName, patientId, patientName }) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [emergencyForm, setEmergencyForm] = useState({
    emergencyType: '',
    severity: 'critical',
    description: '',
    location: '',
    patientCondition: '',
    immediateActions: '',
    contactNumber: '',
    additionalInfo: ''
  });

  const [emergencyHistory, setEmergencyHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const emergencyTypes = [
    { value: 'medical', label: 'Medical Emergency', icon: Heart, color: 'text-red-600' },
    { value: 'fall', label: 'Fall Incident', icon: AlertTriangle, color: 'text-blue-600' },
    { value: 'cardiac', label: 'Cardiac Emergency', icon: Activity, color: 'text-red-700' },
    { value: 'respiratory', label: 'Respiratory Distress', icon: Activity, color: 'text-red-600' },
    { value: 'medication', label: 'Medication Error', icon: Shield, color: 'text-yellow-600' },
    { value: 'behavioral', label: 'Behavioral Emergency', icon: User, color: 'text-blue-600' },
    { value: 'environmental', label: 'Environmental Hazard', icon: MapPin, color: 'text-gray-600' },
    { value: 'other', label: 'Other Emergency', icon: AlertTriangle, color: 'text-gray-600' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low Priority', color: 'bg-blue-100 text-blue-800' },
    { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High Priority', color: 'bg-blue-100 text-orange-800' },
    { value: 'critical', label: 'Critical Emergency', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadActiveEmergencies();
    loadEmergencyHistory();
    
    // Subscribe to real-time emergency updates
    const unsubscribe = emergencyAPI.subscribeToEmergencies((emergencies) => {
      setActiveEmergencies(emergencies.filter(e => e.status === 'active'));
    });

    return () => unsubscribe();
  }, []);

  const loadActiveEmergencies = async () => {
    try {
      const emergencies = await emergencyAPI.getEmergencyHistory({ 
        status: 'active', 
        limit: 10 
      });
      setActiveEmergencies(emergencies);
    } catch (error) {
      console.error('Error loading active emergencies:', error);
    }
  };

  const loadEmergencyHistory = async () => {
    try {
      const history = await emergencyAPI.getEmergencyHistory({ limit: 20 });
      setEmergencyHistory(history);
    } catch (error) {
      console.error('Error loading emergency history:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setEmergencyForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const triggerEmergencyAlert = async () => {
    try {
      setLoading(true);

      const emergencyData = {
        patientId,
        patientName,
        triggeredBy: userId,
        triggeredByName: userName,
        emergencyType: emergencyForm.emergencyType,
        severity: emergencyForm.severity,
        description: emergencyForm.description,
        location: emergencyForm.location || 'Patient Residence',
        patientCondition: emergencyForm.patientCondition,
        immediateActions: emergencyForm.immediateActions,
        contactNumber: emergencyForm.contactNumber,
        additionalInfo: emergencyForm.additionalInfo,
        triggeredAt: new Date().toISOString()
      };

      const result = await emergencyAPI.createEmergency(emergencyData);
      
      if (result.success) {
        toast.success('Emergency alert sent successfully!');
        
        // Send notifications to relevant parties
        await emergencyAPI.sendEmergencyNotification(result.id, {
          recipients: ['admin', 'doctors', 'emergency_services'],
          message: `Emergency Alert: ${emergencyForm.emergencyType} - ${patientName}`,
          priority: 'high'
        });
        
        setShowEmergencyModal(false);
        resetForm();
        loadActiveEmergencies();
      }
      
    } catch (error) {
      console.error('Error triggering emergency alert:', error);
      toast.error('Failed to send emergency alert');
    } finally {
      setLoading(false);
    }
  };

  const updateEmergencyStatus = async (emergencyId, status, notes = '') => {
    try {
      await emergencyAPI.updateEmergencyStatus(emergencyId, status, { notes });
      
      // Add action to emergency log
      await emergencyAPI.addEmergencyAction(emergencyId, {
        action: `Status updated to ${status}`,
        description: notes || `Emergency status changed to ${status}`,
        performedBy: userName,
        timestamp: new Date().toISOString()
      });
      
      toast.success(`Emergency status updated to ${status}`);
      loadActiveEmergencies();
      
    } catch (error) {
      console.error('Error updating emergency status:', error);
      toast.error('Failed to update emergency status');
    }
  };

  const resetForm = () => {
    setEmergencyForm({
      emergencyType: '',
      severity: 'critical',
      description: '',
      location: '',
      patientCondition: '',
      immediateActions: '',
      contactNumber: '',
      additionalInfo: ''
    });
  };

  const getEmergencyIcon = (type) => {
    const emergencyType = emergencyTypes.find(et => et.value === type);
    return emergencyType ? emergencyType.icon : AlertTriangle;
  };

  const getEmergencyColor = (type) => {
    const emergencyType = emergencyTypes.find(et => et.value === type);
    return emergencyType ? emergencyType.color : 'text-gray-600';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Emergency Trigger Button */}
      <div className="text-center">
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 mx-auto shadow-lg transform hover:scale-105 transition-all duration-200"
        >
          <Zap size={24} />
          <span className="text-lg font-bold">EMERGENCY ALERT</span>
        </button>
        <p className="text-sm text-gray-600 mt-2">
          Use this button only for urgent medical emergencies
        </p>
      </div>

      {/* Active Emergencies */}
      {activeEmergencies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            <Bell className="mr-2" />
            Active Emergencies ({activeEmergencies.length})
          </h3>
          <div className="space-y-3">
            {activeEmergencies.map((emergency) => {
              const IconComponent = getEmergencyIcon(emergency.emergencyType);
              return (
                <div key={emergency.id} className="bg-white border border-red-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <IconComponent className={`${getEmergencyColor(emergency.emergencyType)}`} size={20} />
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {emergencyTypes.find(et => et.value === emergency.emergencyType)?.label}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Patient: {emergency.patientName || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${severityLevels.find(s => s.value === emergency.severity)?.color}`}>
                        {emergency.severity.toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {getTimeAgo(emergency.triggeredAt)}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{emergency.description}</p>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateEmergencyStatus(emergency.id, 'in_progress', 'Emergency response initiated')}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-orange-700"
                    >
                      Respond
                    </button>
                    <button
                      onClick={() => updateEmergencyStatus(emergency.id, 'resolved', 'Emergency resolved')}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emergency History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Clock className="mr-2" />
          Recent Emergency History
        </h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emergencyHistory.slice(0, 10).map((emergency) => {
                  const IconComponent = getEmergencyIcon(emergency.emergencyType);
                  return (
                    <tr key={emergency.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <IconComponent className={`${getEmergencyColor(emergency.emergencyType)} mr-2`} size={16} />
                          <span className="text-sm text-gray-900">
                            {emergencyTypes.find(et => et.value === emergency.emergencyType)?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emergency.patientName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityLevels.find(s => s.value === emergency.severity)?.color}`}>
                          {emergency.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          emergency.status === 'active' ? 'bg-red-100 text-red-800' :
                          emergency.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {emergency.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(emergency.triggeredAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {/* View emergency details */}}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Emergency Alert Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-red-600 flex items-center">
                  <AlertTriangle className="mr-2" size={24} />
                  Emergency Alert
                </h3>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Emergency Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Type *
                  </label>
                  <select
                    value={emergencyForm.emergencyType}
                    onChange={(e) => handleInputChange('emergencyType', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select emergency type</option>
                    {emergencyTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity Level *
                  </label>
                  <select
                    value={emergencyForm.severity}
                    onChange={(e) => handleInputChange('severity', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    required
                  >
                    {severityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={emergencyForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Describe the emergency situation..."
                    required
                  />
                </div>

                {/* Patient Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Patient Condition
                  </label>
                  <textarea
                    value={emergencyForm.patientCondition}
                    onChange={(e) => handleInputChange('patientCondition', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Describe patient's current condition..."
                  />
                </div>

                {/* Immediate Actions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Immediate Actions Taken
                  </label>
                  <textarea
                    value={emergencyForm.immediateActions}
                    onChange={(e) => handleInputChange('immediateActions', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="What immediate actions have been taken?"
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={emergencyForm.contactNumber}
                      onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Your contact number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={emergencyForm.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Patient location"
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    value={emergencyForm.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Any additional relevant information..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={triggerEmergencyAlert}
                  disabled={loading || !emergencyForm.emergencyType || !emergencyForm.description}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  <Send className="mr-2" size={16} />
                  {loading ? 'Sending...' : 'Send Emergency Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyAlertSystem;

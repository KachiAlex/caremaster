import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Clock, 
  User, 
  Heart, 
  FileText, 
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  MessageCircle,
  Camera,
  Send,
  Activity,
  Zap,
  Shield,
  Cross
} from 'lucide-react';

const CaregiverEmergency = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewEmergencyModal, setShowNewEmergencyModal] = useState(false);

  useEffect(() => {
    // Simulate loading emergency data
    const loadEmergencies = async () => {
      try {
        setTimeout(() => {
          const mockEmergencies = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              type: 'medical',
              severity: 'critical',
              description: 'Patient experiencing chest pain and difficulty breathing',
              location: '123 Victoria Island, Lagos',
              coordinates: { lat: 6.4281, lng: 3.4219 },
              reportedAt: '2024-01-21T14:30:00Z',
              status: 'active',
              reportedBy: 'Patient',
              contactNumber: '+234 801 234 5678',
              emergencyContacts: [
                { name: 'Dr. Adebayo', number: '+234 805 123 4567', type: 'doctor' },
                { name: 'Family Contact', number: '+234 802 345 6789', type: 'family' }
              ],
              actions: [
                { timestamp: '2024-01-21T14:30:00Z', action: 'Emergency reported', user: 'System' },
                { timestamp: '2024-01-21T14:31:00Z', action: 'Caregiver notified', user: 'System' },
                { timestamp: '2024-01-21T14:32:00Z', action: 'En route to patient', user: 'You' }
              ],
              notes: 'Patient has diabetes and hypertension. Last medication taken at 9 AM.'
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              type: 'fall',
              severity: 'high',
              description: 'Patient fell in bathroom and cannot get up',
              location: '456 Ikoyi, Lagos',
              coordinates: { lat: 6.4474, lng: 3.4288 },
              reportedAt: '2024-01-21T12:15:00Z',
              status: 'resolved',
              reportedBy: 'Caregiver',
              contactNumber: '+234 802 345 6789',
              emergencyContacts: [
                { name: 'Dr. Johnson', number: '+234 806 234 5678', type: 'doctor' },
                { name: 'Son - David', number: '+234 803 456 7890', type: 'family' }
              ],
              actions: [
                { timestamp: '2024-01-21T12:15:00Z', action: 'Fall reported', user: 'Caregiver' },
                { timestamp: '2024-01-21T12:20:00Z', action: 'Patient assessed', user: 'You' },
                { timestamp: '2024-01-21T12:25:00Z', action: 'Patient assisted to bed', user: 'You' },
                { timestamp: '2024-01-21T12:30:00Z', action: 'Doctor contacted', user: 'You' },
                { timestamp: '2024-01-21T12:35:00Z', action: 'Emergency resolved', user: 'You' }
              ],
              notes: 'No serious injuries. Patient is comfortable and resting.'
            },
            {
              id: 3,
              patientName: 'Michael Adebayo',
              patientId: 'ELD003',
              type: 'medication',
              severity: 'medium',
              description: 'Patient missed critical medication and showing symptoms',
              location: '789 Lekki, Lagos',
              coordinates: { lat: 6.4698, lng: 3.5852 },
              reportedAt: '2024-01-21T10:45:00Z',
              status: 'in-progress',
              reportedBy: 'Family Member',
              contactNumber: '+234 803 456 7890',
              emergencyContacts: [
                { name: 'Dr. Adebayo', number: '+234 807 345 6789', type: 'doctor' },
                { name: 'Wife - Mary', number: '+234 804 567 8901', type: 'family' }
              ],
              actions: [
                { timestamp: '2024-01-21T10:45:00Z', action: 'Medication emergency reported', user: 'Family' },
                { timestamp: '2024-01-21T10:50:00Z', action: 'Caregiver dispatched', user: 'System' },
                { timestamp: '2024-01-21T11:00:00Z', action: 'Arrived at patient location', user: 'You' },
                { timestamp: '2024-01-21T11:05:00Z', action: 'Medication administered', user: 'You' }
              ],
              notes: 'Patient feeling better after medication. Monitoring for any adverse effects.'
            }
          ];

          setEmergencies(mockEmergencies);
          setActiveEmergency(mockEmergencies[0]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading emergencies:', error);
        setLoading(false);
      }
    };

    loadEmergencies();
  }, []);

  const filteredEmergencies = emergencies.filter(emergency => {
    const matchesSearch = emergency.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emergency.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || emergency.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'medical':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'fall':
        return <User className="h-5 w-5 text-orange-600" />;
      case 'medication':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'fire':
        return <Zap className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleEmergencyAction = (emergencyId, action) => {
    const timestamp = new Date().toISOString();
    const newAction = {
      timestamp,
      action,
      user: 'You'
    };

    setEmergencies(emergencies.map(emergency =>
      emergency.id === emergencyId
        ? {
            ...emergency,
            actions: [...emergency.actions, newAction],
            status: action.includes('resolved') ? 'resolved' : 
                   action.includes('responding') ? 'in-progress' : emergency.status
          }
        : emergency
    ));

    if (activeEmergency?.id === emergencyId) {
      setActiveEmergency({
        ...activeEmergency,
        actions: [...activeEmergency.actions, newAction],
        status: action.includes('resolved') ? 'resolved' : 
               action.includes('responding') ? 'in-progress' : activeEmergency.status
      });
    }
  };

  const handleCallEmergencyContact = (contact) => {
    // Simulate making a call
    console.log(`Calling ${contact.name} at ${contact.number}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Emergency Response</h1>
              <p className="text-gray-600">Manage emergency situations and patient safety</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNewEmergencyModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Report Emergency
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex dashboard-full-width">
        {/* Emergencies List */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search emergencies..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Emergencies */}
          <div className="flex-1 overflow-y-auto">
            {filteredEmergencies.map((emergency) => (
              <div
                key={emergency.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  activeEmergency?.id === emergency.id ? 'bg-red-50 border-red-200' : ''
                }`}
                onClick={() => setActiveEmergency(emergency)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(emergency.type)}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{emergency.patientName}</h3>
                      <p className="text-xs text-gray-600">ID: {emergency.patientId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(emergency.severity)}`}>
                      {emergency.severity}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(emergency.status)}`}>
                      {emergency.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{emergency.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatTime(emergency.reportedAt)}</span>
                  </div>
                  <span className="font-medium">{formatDate(emergency.reportedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Details */}
        <div className="flex-1 flex flex-col">
          {activeEmergency ? (
            <>
              {/* Emergency Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      {getTypeIcon(activeEmergency.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{activeEmergency.patientName}</h3>
                      <p className="text-sm text-gray-600">
                        ID: {activeEmergency.patientId} • {activeEmergency.type} emergency
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(activeEmergency.severity)}`}>
                      {activeEmergency.severity}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeEmergency.status)}`}>
                      {activeEmergency.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Emergency Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900">Emergency Details</h4>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-1">Description</p>
                          <p className="text-sm text-gray-600">{activeEmergency.description}</p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Location</span>
                          </div>
                          <span className="text-sm text-gray-600">{activeEmergency.location}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Reported At</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {formatTime(activeEmergency.reportedAt)} {formatDate(activeEmergency.reportedAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Reported By</span>
                          </div>
                          <span className="text-sm text-gray-600">{activeEmergency.reportedBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900">Emergency Contacts</h4>
                      
                      <div className="space-y-3">
                        {activeEmergency.emergencyContacts.map((contact, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                              <p className="text-xs text-gray-600">{contact.type}</p>
                              <p className="text-sm text-gray-600">{contact.number}</p>
                            </div>
                            <button
                              onClick={() => handleCallEmergencyContact(contact)}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Action Timeline</h4>
                    
                    <div className="space-y-3">
                      {activeEmergency.actions.map((action, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{action.action}</p>
                            <p className="text-xs text-gray-600">
                              {formatTime(action.timestamp)} • {action.user}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {activeEmergency.notes && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900">Notes</h4>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{activeEmergency.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Quick Actions</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {activeEmergency.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleEmergencyAction(activeEmergency.id, 'Responding to emergency')}
                            className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                          >
                            <Activity className="h-5 w-5 mx-auto mb-1" />
                            Responding
                          </button>
                          <button
                            onClick={() => handleEmergencyAction(activeEmergency.id, 'Emergency resolved')}
                            className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                            Resolve
                          </button>
                        </>
                      )}
                      
                      <button className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <MessageCircle className="h-5 w-5 mx-auto mb-1" />
                        Message
                      </button>
                      <button className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                        <Camera className="h-5 w-5 mx-auto mb-1" />
                        Photo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an emergency</h3>
                <p className="text-gray-600">Choose an emergency from the list to view details and take action</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Emergency Modal */}
      {showNewEmergencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Emergency</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  <option>Adunni Okafor</option>
                  <option>Grace Johnson</option>
                  <option>Michael Adebayo</option>
                  <option>Sarah Williams</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  <option value="medical">Medical</option>
                  <option value="fall">Fall</option>
                  <option value="medication">Medication</option>
                  <option value="fire">Fire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows="3"
                  placeholder="Describe the emergency situation..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewEmergencyModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Report Emergency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverEmergency;

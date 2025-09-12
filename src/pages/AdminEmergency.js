import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Heart, 
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Bell,
  Search,
  Filter,
  Play,
  Pause,
  RefreshCw,
  Map,
  Calendar,
  TrendingUp,
  Users,
  Shield
} from 'lucide-react';

const AdminEmergency = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [filteredEmergencies, setFilteredEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [stats, setStats] = useState({
    active: 0,
    resolved: 0,
    averageResponseTime: 0,
    totalToday: 0
  });

  useEffect(() => {
    // Simulate loading emergency data
    const loadEmergencyData = async () => {
      try {
        setTimeout(() => {
          const mockEmergencies = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              patientPhone: '+234 801 987 6543',
              patientEmail: 'adunni@example.com',
              emergencyType: 'Medical Emergency',
              severity: 'Critical',
              description: 'Chest pain and difficulty breathing',
              location: 'Lagos, Nigeria',
              coordinates: { lat: 6.5244, lng: 3.3792 },
              triggeredAt: '2024-01-20T14:30:00Z',
              status: 'active',
              responseTime: 0,
              assignedTo: 'Dr. Kemi Okafor',
              assignedToPhone: '+234 802 123 4567',
              familyContact: 'Tunde Adebayo',
              familyPhone: '+234 803 456 7890',
              medicalHistory: ['Hypertension', 'Diabetes Type 2'],
              currentMedications: ['Metformin', 'Lisinopril'],
              notes: 'Patient reported severe chest pain. Emergency services contacted.',
              actions: [
                {
                  id: 1,
                  action: 'Emergency services contacted',
                  timestamp: '2024-01-20T14:32:00Z',
                  performedBy: 'System',
                  status: 'completed'
                },
                {
                  id: 2,
                  action: 'Family notified',
                  timestamp: '2024-01-20T14:35:00Z',
                  performedBy: 'Admin',
                  status: 'completed'
                }
              ]
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              patientPhone: '+234 803 456 7890',
              patientEmail: 'grace@example.com',
              emergencyType: 'Fall Detection',
              severity: 'High',
              description: 'Patient fell and may be injured',
              location: 'Abuja, Nigeria',
              coordinates: { lat: 9.0765, lng: 7.3986 },
              triggeredAt: '2024-01-20T10:15:00Z',
              status: 'resolved',
              responseTime: 12,
              assignedTo: 'Dr. Michael Johnson',
              assignedToPhone: '+234 804 567 8901',
              familyContact: 'John Johnson',
              familyPhone: '+234 805 678 9012',
              medicalHistory: ['Arthritis', 'Osteoporosis'],
              currentMedications: ['Calcium', 'Vitamin D'],
              notes: 'Patient fell in bathroom. Minor injuries reported. Family assisted.',
              actions: [
                {
                  id: 1,
                  action: 'Fall detected by sensor',
                  timestamp: '2024-01-20T10:15:00Z',
                  performedBy: 'IoT Device',
                  status: 'completed'
                },
                {
                  id: 2,
                  action: 'Family contacted',
                  timestamp: '2024-01-20T10:18:00Z',
                  performedBy: 'System',
                  status: 'completed'
                },
                {
                  id: 3,
                  action: 'Emergency resolved',
                  timestamp: '2024-01-20T10:27:00Z',
                  performedBy: 'Dr. Michael Johnson',
                  status: 'completed'
                }
              ]
            },
            {
              id: 3,
              patientName: 'Tunde Adebayo',
              patientId: 'ELD003',
              patientPhone: '+234 802 123 4567',
              patientEmail: 'tunde@example.com',
              emergencyType: 'Medication Overdose',
              severity: 'Critical',
              description: 'Patient may have taken double dose of medication',
              location: 'Ibadan, Nigeria',
              coordinates: { lat: 7.3775, lng: 3.9470 },
              triggeredAt: '2024-01-20T08:45:00Z',
              status: 'active',
              responseTime: 0,
              assignedTo: 'Dr. Sarah Williams',
              assignedToPhone: '+234 806 789 0123',
              familyContact: 'Adebayo Family',
              familyPhone: '+234 807 890 1234',
              medicalHistory: ['Diabetes Type 2', 'Heart Disease'],
              currentMedications: ['Insulin', 'Metformin', 'Aspirin'],
              notes: 'Patient accidentally took double dose of insulin. Monitoring blood sugar levels.',
              actions: [
                {
                  id: 1,
                  action: 'Overdose alert triggered',
                  timestamp: '2024-01-20T08:45:00Z',
                  performedBy: 'Medication Tracker',
                  status: 'completed'
                },
                {
                  id: 2,
                  action: 'Emergency services contacted',
                  timestamp: '2024-01-20T08:47:00Z',
                  performedBy: 'System',
                  status: 'completed'
                }
              ]
            }
          ];

          // Calculate stats
          const activeCount = mockEmergencies.filter(e => e.status === 'active').length;
          const resolvedCount = mockEmergencies.filter(e => e.status === 'resolved').length;
          const totalToday = mockEmergencies.length;
          const avgResponseTime = mockEmergencies
            .filter(e => e.responseTime > 0)
            .reduce((sum, e) => sum + e.responseTime, 0) / resolvedCount || 0;

          setStats({
            active: activeCount,
            resolved: resolvedCount,
            averageResponseTime: Math.round(avgResponseTime),
            totalToday: totalToday
          });

          setEmergencies(mockEmergencies);
          setFilteredEmergencies(mockEmergencies);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading emergency data:', error);
        setLoading(false);
      }
    };

    loadEmergencyData();
  }, []);

  useEffect(() => {
    let filtered = emergencies;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(emergency =>
        emergency.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emergency.emergencyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emergency.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(emergency => emergency.status === statusFilter);
    }

    setFilteredEmergencies(filtered);
  }, [searchTerm, statusFilter, emergencies]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleEmergencyAction = (action, emergency) => {
    setSelectedEmergency(emergency);
    switch (action) {
      case 'view':
        setShowEmergencyModal(true);
        break;
      case 'resolve':
        // Handle resolve
        break;
      case 'assign':
        // Handle assign
        break;
      default:
        break;
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getTimeAgo = (dateTime) => {
    const now = new Date();
    const emergencyTime = new Date(dateTime);
    const diffInMinutes = Math.floor((now - emergencyTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency Management</h1>
          <p className="text-gray-600">Monitor and manage emergency alerts in real-time</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Bell className="h-4 w-4 mr-2" />
            Test Alert
          </button>
        </div>
      </div>

      {/* Emergency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Emergencies</p>
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-blue-600">{stats.averageResponseTime}m</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Today</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Emergency Alert */}
      {stats.active > 0 && (
        <div className="card border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Active Emergency Alert</h3>
                <p className="text-red-600">
                  {stats.active} emergency{stats.active > 1 ? 'ies' : ''} requiring immediate attention
                </p>
              </div>
            </div>
            <button className="btn btn-red">
              <Eye className="h-4 w-4 mr-2" />
              View Active
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search emergencies by patient, type, or description..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Emergencies List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Emergency Alerts</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Auto-refresh: ON</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredEmergencies.map((emergency) => {
            const { date, time } = formatDateTime(emergency.triggeredAt);
            return (
              <div key={emergency.id} className={`border rounded-lg p-4 hover:bg-gray-50 ${
                emergency.status === 'active' ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {emergency.status === 'active' ? (
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{emergency.patientName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(emergency.severity)}`}>
                          {emergency.severity}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(emergency.status)}`}>
                          {getStatusIcon(emergency.status)}
                          <span className="ml-1">{emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{emergency.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {emergency.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {getTimeAgo(emergency.triggeredAt)}
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {emergency.assignedTo}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEmergencyAction('view', emergency)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {emergency.status === 'active' && (
                      <button
                        onClick={() => handleEmergencyAction('resolve', emergency)}
                        className="p-2 text-green-600 hover:text-green-800"
                        title="Mark as Resolved"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEmergencies.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No emergencies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No emergency alerts at this time.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Emergency Details Modal */}
      {showEmergencyModal && selectedEmergency && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <h3 className="text-lg font-medium text-gray-900">Emergency Details</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedEmergency.status)}`}>
                    {getStatusIcon(selectedEmergency.status)}
                    <span className="ml-1">{selectedEmergency.status.charAt(0).toUpperCase() + selectedEmergency.status.slice(1)}</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Patient Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Patient Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                        <p className="text-sm text-gray-900">{selectedEmergency.patientName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{selectedEmergency.patientPhone}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{selectedEmergency.patientEmail}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{selectedEmergency.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Medical Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medical History</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEmergency.medicalHistory.map((condition, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Current Medications</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEmergency.currentMedications.map((medication, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {medication}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Emergency Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Emergency Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Type</label>
                        <p className="text-sm text-gray-900">{selectedEmergency.emergencyType}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(selectedEmergency.severity)}`}>
                          {selectedEmergency.severity}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="text-sm text-gray-900">{selectedEmergency.description}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Triggered At</label>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatDateTime(selectedEmergency.triggeredAt).date} at {formatDateTime(selectedEmergency.triggeredAt).time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Assigned Personnel</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Assigned Doctor</label>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{selectedEmergency.assignedTo}</span>
                          <button className="text-blue-600 hover:text-blue-800">
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Family Contact</label>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{selectedEmergency.familyContact}</span>
                          <button className="text-blue-600 hover:text-blue-800">
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Response Actions</h4>
                    <div className="space-y-2">
                      {selectedEmergency.actions.map((action) => (
                        <div key={action.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{action.action}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(action.timestamp).date} at {formatDateTime(action.timestamp).time} by {action.performedBy}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                {selectedEmergency.status === 'active' && (
                  <button className="btn btn-green">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </button>
                )}
                <button className="btn btn-primary">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmergency;

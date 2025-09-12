import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  AlertTriangle,
  Heart,
  Activity,
  Clock,
  Users,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Save,
  Copy
} from 'lucide-react';

const AdminEmergencyProtocols = () => {
  const [protocols, setProtocols] = useState([]);
  const [filteredProtocols, setFilteredProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState(null);

  useEffect(() => {
    // Simulate loading protocols data
    const loadProtocols = async () => {
      try {
        setTimeout(() => {
          const mockProtocols = [
            {
              id: 1,
              name: 'Cardiac Emergency Response',
              category: 'Medical Emergency',
              severity: 'Critical',
              description: 'Standard protocol for handling cardiac emergencies including heart attacks and cardiac arrest',
              triggerConditions: [
                'Chest pain reported',
                'Heart rate irregular',
                'Cardiac arrest detected',
                'ECG abnormalities'
              ],
              steps: [
                {
                  id: 1,
                  step: 'Immediate Assessment',
                  description: 'Assess patient consciousness and vital signs',
                  duration: '2 minutes',
                  responsible: 'Emergency Response Team',
                  priority: 'Critical'
                },
                {
                  id: 2,
                  step: 'Call Emergency Services',
                  description: 'Contact local emergency services (911/999)',
                  duration: '1 minute',
                  responsible: 'System/Admin',
                  priority: 'Critical'
                },
                {
                  id: 3,
                  step: 'Notify Family',
                  description: 'Contact emergency family contacts',
                  duration: '2 minutes',
                  responsible: 'Admin',
                  priority: 'High'
                },
                {
                  id: 4,
                  step: 'CPR if Needed',
                  description: 'Begin CPR if patient is unresponsive',
                  duration: 'Ongoing',
                  responsible: 'Trained Personnel',
                  priority: 'Critical'
                },
                {
                  id: 5,
                  step: 'Medical History Review',
                  description: 'Review patient medical history and medications',
                  duration: '3 minutes',
                  responsible: 'Medical Team',
                  priority: 'Medium'
                }
              ],
              escalationRules: [
                {
                  condition: 'No response in 5 minutes',
                  action: 'Escalate to senior medical staff',
                  contact: 'Dr. Sarah Williams (+234 802 123 4567)'
                },
                {
                  condition: 'Patient condition worsens',
                  action: 'Contact emergency services again',
                  contact: 'Emergency Services (911)'
                }
              ],
              contacts: [
                {
                  type: 'Emergency Services',
                  name: 'Lagos Emergency Services',
                  phone: '199',
                  priority: 'Critical'
                },
                {
                  type: 'Medical Director',
                  name: 'Dr. Sarah Williams',
                  phone: '+234 802 123 4567',
                  priority: 'High'
                },
                {
                  type: 'Family Contact',
                  name: 'Emergency Family Contact',
                  phone: 'Patient-specific',
                  priority: 'High'
                }
              ],
              isActive: true,
              createdAt: '2024-01-15T10:00:00Z',
              updatedAt: '2024-01-20T14:30:00Z',
              createdBy: 'Dr. Sarah Williams'
            },
            {
              id: 2,
              name: 'Fall Detection Response',
              category: 'Fall Detection',
              severity: 'High',
              description: 'Protocol for responding to fall detection alerts from IoT devices',
              triggerConditions: [
                'Fall detected by sensor',
                'Patient reports fall',
                'Caregiver reports fall',
                'Motion sensor alerts'
              ],
              steps: [
                {
                  id: 1,
                  step: 'Immediate Check',
                  description: 'Contact patient immediately via phone or app',
                  duration: '1 minute',
                  responsible: 'System/Admin',
                  priority: 'High'
                },
                {
                  id: 2,
                  step: 'Assess Injury',
                  description: 'Determine if patient is injured and needs medical attention',
                  duration: '3 minutes',
                  responsible: 'Medical Team',
                  priority: 'High'
                },
                {
                  id: 3,
                  step: 'Notify Family',
                  description: 'Contact family members about the fall',
                  duration: '2 minutes',
                  responsible: 'Admin',
                  priority: 'Medium'
                },
                {
                  id: 4,
                  step: 'Arrange Care',
                  description: 'Arrange for caregiver or medical assistance if needed',
                  duration: '5 minutes',
                  responsible: 'Care Team',
                  priority: 'Medium'
                }
              ],
              escalationRules: [
                {
                  condition: 'Patient unresponsive',
                  action: 'Treat as medical emergency',
                  contact: 'Emergency Services (199)'
                },
                {
                  condition: 'Injury suspected',
                  action: 'Arrange immediate medical assessment',
                  contact: 'Dr. Michael Johnson (+234 803 456 7890)'
                }
              ],
              contacts: [
                {
                  type: 'Emergency Services',
                  name: 'Lagos Emergency Services',
                  phone: '199',
                  priority: 'Critical'
                },
                {
                  type: 'Orthopedic Specialist',
                  name: 'Dr. Michael Johnson',
                  phone: '+234 803 456 7890',
                  priority: 'High'
                }
              ],
              isActive: true,
              createdAt: '2024-01-10T09:00:00Z',
              updatedAt: '2024-01-18T16:45:00Z',
              createdBy: 'Dr. Michael Johnson'
            },
            {
              id: 3,
              name: 'Medication Overdose Response',
              category: 'Medication Emergency',
              severity: 'Critical',
              description: 'Protocol for handling medication overdoses and adverse reactions',
              triggerConditions: [
                'Double dose detected',
                'Wrong medication taken',
                'Adverse reaction reported',
                'Medication interaction alert'
              ],
              steps: [
                {
                  id: 1,
                  step: 'Immediate Assessment',
                  description: 'Assess patient condition and vital signs',
                  duration: '2 minutes',
                  responsible: 'Medical Team',
                  priority: 'Critical'
                },
                {
                  id: 2,
                  step: 'Identify Medication',
                  description: 'Determine which medication and dosage was taken',
                  duration: '3 minutes',
                  responsible: 'Medical Team',
                  priority: 'Critical'
                },
                {
                  id: 3,
                  step: 'Contact Poison Control',
                  description: 'Contact poison control center for guidance',
                  duration: '2 minutes',
                  responsible: 'Medical Team',
                  priority: 'Critical'
                },
                {
                  id: 4,
                  step: 'Emergency Services',
                  description: 'Call emergency services if needed',
                  duration: '1 minute',
                  responsible: 'System/Admin',
                  priority: 'Critical'
                },
                {
                  id: 5,
                  step: 'Monitor Patient',
                  description: 'Continuous monitoring of patient condition',
                  duration: 'Ongoing',
                  responsible: 'Medical Team',
                  priority: 'High'
                }
              ],
              escalationRules: [
                {
                  condition: 'Severe symptoms',
                  action: 'Immediate emergency services',
                  contact: 'Emergency Services (199)'
                },
                {
                  condition: 'Unknown medication',
                  action: 'Contact poison control immediately',
                  contact: 'Poison Control (+234 800 123 4567)'
                }
              ],
              contacts: [
                {
                  type: 'Emergency Services',
                  name: 'Lagos Emergency Services',
                  phone: '199',
                  priority: 'Critical'
                },
                {
                  type: 'Poison Control',
                  name: 'National Poison Control',
                  phone: '+234 800 123 4567',
                  priority: 'Critical'
                },
                {
                  type: 'Pharmacist',
                  name: 'Dr. Kemi Okafor',
                  phone: '+234 804 567 8901',
                  priority: 'High'
                }
              ],
              isActive: true,
              createdAt: '2024-01-12T11:30:00Z',
              updatedAt: '2024-01-19T13:20:00Z',
              createdBy: 'Dr. Kemi Okafor'
            }
          ];
          
          setProtocols(mockProtocols);
          setFilteredProtocols(mockProtocols);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading protocols:', error);
        setLoading(false);
      }
    };

    loadProtocols();
  }, []);

  useEffect(() => {
    let filtered = protocols;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(protocol =>
        protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(protocol => protocol.category === categoryFilter);
    }

    setFilteredProtocols(filtered);
  }, [searchTerm, categoryFilter, protocols]);

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Medical Emergency':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'Fall Detection':
        return <Activity className="h-5 w-5 text-orange-600" />;
      case 'Medication Emergency':
        return <Shield className="h-5 w-5 text-purple-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleProtocolAction = (action, protocol) => {
    setSelectedProtocol(protocol);
    switch (action) {
      case 'view':
        setShowProtocolModal(true);
        break;
      case 'edit':
        setEditingProtocol(protocol);
        setShowCreateModal(true);
        break;
      case 'copy':
        // Handle copy
        break;
      case 'delete':
        // Handle delete
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency Protocols</h1>
          <p className="text-gray-600">Manage emergency response protocols and procedures</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Protocol
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Protocols</p>
              <p className="text-2xl font-bold text-gray-900">{protocols.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Protocols</p>
              <p className="text-2xl font-bold text-gray-900">
                {protocols.filter(p => p.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Protocols</p>
              <p className="text-2xl font-bold text-gray-900">
                {protocols.filter(p => p.severity === 'Critical').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(protocols.map(p => p.category)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search protocols by name, description, or category..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="form-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Fall Detection">Fall Detection</option>
              <option value="Medication Emergency">Medication Emergency</option>
            </select>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Protocols List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Protocol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProtocols.map((protocol) => (
                <tr key={protocol.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getCategoryIcon(protocol.category)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{protocol.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{protocol.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {protocol.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(protocol.severity)}`}>
                      {protocol.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      protocol.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {protocol.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(protocol.updatedAt).date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleProtocolAction('view', protocol)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProtocolAction('edit', protocol)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Protocol"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProtocolAction('copy', protocol)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Copy Protocol"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProtocols.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No protocols found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first emergency protocol to get started.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Protocol Details Modal */}
      {showProtocolModal && selectedProtocol && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(selectedProtocol.category)}
                  <h3 className="text-lg font-medium text-gray-900">{selectedProtocol.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(selectedProtocol.severity)}`}>
                    {selectedProtocol.severity}
                  </span>
                </div>
                <button
                  onClick={() => setShowProtocolModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-700">{selectedProtocol.description}</p>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Trigger Conditions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedProtocol.triggerConditions.map((condition, index) => (
                      <li key={index} className="text-sm text-gray-700">{condition}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Response Steps</h4>
                  <div className="space-y-3">
                    {selectedProtocol.steps.map((step) => (
                      <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{step.step}</h5>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(step.priority)}`}>
                            {step.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {step.duration}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {step.responsible}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Escalation Rules</h4>
                  <div className="space-y-2">
                    {selectedProtocol.escalationRules.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{rule.condition}</p>
                          <p className="text-sm text-gray-600">{rule.action}</p>
                          <p className="text-xs text-gray-500">Contact: {rule.contact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Emergency Contacts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProtocol.contacts.map((contact, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          <p className="text-xs text-gray-500">{contact.type}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(contact.priority)}`}>
                            {contact.priority}
                          </span>
                          <button className="text-blue-600 hover:text-blue-800">
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowProtocolModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleProtocolAction('edit', selectedProtocol)}
                  className="btn btn-primary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Protocol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmergencyProtocols;

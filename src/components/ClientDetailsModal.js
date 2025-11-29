import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  AlertCircle,
  Activity,
  Stethoscope,
  Pill,
  TestTube,
  FileText,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ClientActivityTimeline from './ClientActivityTimeline';
import { useUser } from '../contexts/UserContext';

const ClientDetailsModal = ({ 
  client, 
  onClose, 
  onAssignTask, 
  onDelete, 
  onUnarchive,
  pharmacists,
  institutionId,
  onAssignPharmacist
}) => {
  const navigate = useNavigate();
  const { userProfile } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!client) return null;

  const handleRecordVitals = () => {
    // Navigate to vitals recording page with Client ID
    navigate(`/service-provider/diagnostics?clientId=${client.id}&clientName=${encodeURIComponent(client.name || '')}`);
    onClose();
  };

  const handleScheduleConsultation = () => {
    // Navigate to consultation booking with Client ID
    navigate(`/service-provider/consultations?clientId=${client.id}&clientName=${encodeURIComponent(client.name || '')}`);
    onClose();
  };

  const handleViewPrescriptions = () => {
    // Navigate to prescriptions page
    navigate(`/service-provider/prescriptions?clientId=${client.id}&clientName=${encodeURIComponent(client.name || '')}`);
    onClose();
  };

  const handleOrderLabTest = () => {
    // Navigate to diagnostics/lab ordering
    navigate(`/service-provider/diagnostics?clientId=${client.id}&clientName=${encodeURIComponent(client.name || '')}&action=order`);
    onClose();
  };

  const operationalFlows = [
    {
      id: 'vitals',
      name: 'Record Vitals',
      icon: Activity,
      color: 'bg-red-500',
      description: 'Record client vital signs',
      action: handleRecordVitals
    },
    {
      id: 'consultation',
      name: 'Schedule Consultation',
      icon: Stethoscope,
      color: 'bg-blue-500',
      description: 'Book doctor consultation',
      action: handleScheduleConsultation
    },
    {
      id: 'prescriptions',
      name: 'View Prescriptions',
      icon: Pill,
      color: 'bg-green-500',
      description: 'View and manage medications',
      action: handleViewPrescriptions
    },
    {
      id: 'lab',
      name: 'Order Lab Test',
      icon: TestTube,
      color: 'bg-purple-500',
      description: 'Order diagnostic tests',
      action: handleOrderLabTest
    },
    {
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{client.name || 'Unknown Client'}</h2>
              <p className="text-sm text-blue-100">{client.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-4">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'operations', label: 'Operations' },
              { id: 'medical', label: 'Medical Info' },
              { id: 'activity', label: 'Activity Log' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Age</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{client.age || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Gender</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{client.gender || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{client.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    client.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status || 'active'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {operationalFlows.map(flow => {
                    const Icon = flow.icon;
                    return (
                      <button
                        key={flow.id}
                        onClick={flow.action}
                        className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className={`${flow.color} p-3 rounded-lg mb-2 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-gray-900 text-center">{flow.name}</span>
                        <span className="text-[10px] text-gray-500 text-center mt-1">{flow.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'operations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Flows</h3>
                <div className="grid gap-4">
                  {operationalFlows.map(flow => {
                    const Icon = flow.icon;
                    return (
                      <button
                        key={flow.id}
                        onClick={flow.action}
                        className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`${flow.color} p-3 rounded-lg`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">{flow.name}</p>
                            <p className="text-sm text-gray-500">{flow.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Medical Conditions</h3>
                <p className="text-sm text-gray-600">
                  {client.medicalConditions?.length > 0 
                    ? client.medicalConditions.join(', ')
                    : 'No medical conditions recorded'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Allergies</h3>
                <p className="text-sm text-gray-600">
                  {client.allergies?.length > 0 
                    ? client.allergies.join(', ')
                    : 'No known allergies'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Medications</h3>
                <p className="text-sm text-gray-600">
                  {client.medications?.length > 0 
                    ? client.medications.join(', ')
                    : 'No current medications'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Activity Timeline</h3>
                <p className="text-sm text-gray-600 mb-6">
                  View all activities, interactions, and changes logged for this client. Every action by caregivers, admins, and system events is recorded here.
                </p>
                <ClientActivityTimeline
                  clientId={client.id || client.uid || client.clientId}
                  clientName={client.name || client.fullName || 'Client'}
                  userRole={userProfile?.role || userProfile?.userType || 'admin'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="flex gap-2">
            {onAssignTask && (
              <button
                onClick={() => {
                  onAssignTask(client);
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Assign Task
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {onUnarchive && client.status === 'archived' && (
              <button
                onClick={() => {
                  onUnarchive(client);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Unarchive Client
              </button>
            )}
            {onDelete && client.status !== 'archived' && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to archive this client?')) {
                    onDelete(client);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Archive Client
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;


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
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { toast } from 'react-toastify';
import ClientActivityTimeline from './ClientActivityTimeline';
import { useUser } from '../contexts/UserContext';
import VitalsLogModal from './VitalsLogModal';
import ConsultationsLogModal from './ConsultationsLogModal';
import PrescriptionsLogModal from './PrescriptionsLogModal';
import LabTestsLogModal from './LabTestsLogModal';
import CarePlanManager from './CarePlanManager';

const ClientDetailsModal = ({ 
  client, 
  onClose, 
  onAssignTask, 
  onDelete, 
  onUnarchive,
  institutionId
}) => {
  const { userProfile, user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');

  const formatList = (val) => {
    if (!val) return 'None Recorded';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') return val;
    return 'None Recorded';
  };

  // Quick Action Modal States
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showConsultationsModal, setShowConsultationsModal] = useState(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState(false);
  const [showLabTestsModal, setShowLabTestsModal] = useState(false);
  
  if (!client) return null;

  const handleRecordVitals = () => {
    setShowVitalsModal(true);
  };

  const handleScheduleConsultation = () => {
    setShowConsultationsModal(true);
  };

  const handleViewPrescriptions = () => {
    setShowPrescriptionsModal(true);
  };

  const handleOrderLabTest = () => {
    setShowLabTestsModal(true);
  };

  const operationalFlows = [
    {
      id: 'vitals',
      name: 'Record Vitals',
      icon: Activity,
      color: 'bg-red-500',
      description: 'Record and track vital signs',
      action: handleRecordVitals
    },
    {
      id: 'consultation',
      name: 'Doctor Consultation',
      icon: Stethoscope,
      color: 'bg-blue-500',
      description: 'Document clinical encounter & SOAP notes',
      action: handleScheduleConsultation
    },
    {
      id: 'prescriptions',
      name: 'Prescriptions & Rx',
      icon: Pill,
      color: 'bg-green-500',
      description: 'View, prescribe, and manage medications',
      action: handleViewPrescriptions
    },
    {
      id: 'lab',
      name: 'Diagnostic & Lab Tests',
      icon: TestTube,
      color: 'bg-purple-500',
      description: 'Order lab tests and review results',
      action: handleOrderLabTest
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
            <div className="space-y-8">
              {/* Clinical Care Plan Section */}
              <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white border border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Clinical Care Plan & Orders</h3>
                      <p className="text-xs text-gray-600">
                        Create, review, and manage individualized physician care plans, treatment goals, and interventions with standardized clinical templates.
                      </p>
                    </div>
                  </div>
                </div>

                <CarePlanManager
                  clientId={client.id || client.uid || client.clientId}
                  doctorId={user?.uid}
                  doctorName={userProfile?.name || userProfile?.displayName || 'Attending Physician'}
                  clientName={client.name || client.fullName || 'Client'}
                />
              </div>

              {/* Quick Operational Flows */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Quick Actions</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {operationalFlows.map(flow => {
                    const Icon = flow.icon;
                    return (
                      <button
                        key={flow.id}
                        onClick={flow.action}
                        className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`${flow.color} p-3 rounded-xl shadow-sm`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{flow.name}</p>
                            <p className="text-xs text-gray-500">{flow.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
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
                  {formatList(client.medicalConditions)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Allergies</h3>
                <p className="text-sm text-gray-600">
                  {formatList(client.allergies)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Medications</h3>
                <p className="text-sm text-gray-600">
                  {formatList(client.medications)}
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

      {/* Quick Action Clinical Modals */}
      {showVitalsModal && (
        <VitalsLogModal
          client={client}
          isOpen={showVitalsModal}
          onClose={() => setShowVitalsModal(false)}
          institutionId={institutionId}
        />
      )}

      {showConsultationsModal && (
        <ConsultationsLogModal
          client={client}
          isOpen={showConsultationsModal}
          onClose={() => setShowConsultationsModal(false)}
          institutionId={institutionId}
        />
      )}

      {showPrescriptionsModal && (
        <PrescriptionsLogModal
          client={client}
          isOpen={showPrescriptionsModal}
          onClose={() => setShowPrescriptionsModal(false)}
          institutionId={institutionId}
        />
      )}

      {showLabTestsModal && (
        <LabTestsLogModal
          client={client}
          isOpen={showLabTestsModal}
          onClose={() => setShowLabTestsModal(false)}
          institutionId={institutionId}
        />
      )}
    </div>
  );
};

export default ClientDetailsModal;


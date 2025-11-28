import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  AlertCircle,
  FileText,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Briefcase,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';

const CaregiverDetailsModal = ({ 
  caregiver, 
  onClose, 
  onSuspend,
  onActivate,
  onDelete,
  institutionId
}) => {
  const { userProfile } = useUser();
  const [activeTab, setActiveTab] = useState('overview');

  if (!caregiver) return null;

  const onboardingStatus = caregiver.onboardingComplete ? 'completed' : 
                           (caregiver.onboardingStarted ? 'in-progress' : 'not-started');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{caregiver.name || caregiver.displayName || 'Caregiver'}</h2>
              <p className="text-sm text-blue-100">{caregiver.email || 'No email'}</p>
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
              { id: 'documents', label: 'Documents' },
              { id: 'activity', label: 'Activity' }
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
              {/* Caregiver Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{caregiver.name || caregiver.displayName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{caregiver.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{caregiver.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Role</label>
                  <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{caregiver.role || caregiver.userType || 'Caregiver'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    caregiver.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : caregiver.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : caregiver.status === 'suspended'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {caregiver.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Onboarding</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    onboardingStatus === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : onboardingStatus === 'in-progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {onboardingStatus === 'completed' ? 'Completed' :
                     onboardingStatus === 'in-progress' ? 'In Progress' :
                     'Not Started'}
                  </span>
                </div>
              </div>

              {/* Additional Info */}
              {(caregiver.medicalQualification || caregiver.specialization || caregiver.licenseNumber) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Professional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {caregiver.medicalQualification && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Medical Qualification</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{caregiver.medicalQualification}</p>
                      </div>
                    )}
                    {caregiver.specialization && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Specialization</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{caregiver.specialization}</p>
                      </div>
                    )}
                    {caregiver.licenseNumber && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">License Number</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{caregiver.licenseNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="grid grid-cols-2 gap-4">
                  {caregiver.createdAt && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Joined</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {caregiver.createdAt?.toDate ? new Date(caregiver.createdAt.toDate()).toLocaleDateString() : 
                         caregiver.createdAt ? new Date(caregiver.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  )}
                  {caregiver.lastActive && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Last Active</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {caregiver.lastActive?.toDate ? new Date(caregiver.lastActive.toDate()).toLocaleDateString() : 
                         caregiver.lastActive ? new Date(caregiver.lastActive).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Onboarding Documents</h3>
                {caregiver.qualificationDocumentUrl ? (
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">Qualification Document</p>
                            <p className="text-sm text-gray-500">Professional qualification certificate</p>
                          </div>
                        </div>
                        <a
                          href={caregiver.qualificationDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Activity timeline coming soon</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="flex gap-2">
            {caregiver.status === 'pending' && onActivate && (
              <button
                onClick={() => {
                  onActivate(caregiver);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Activate
              </button>
            )}
            {caregiver.status === 'active' && onSuspend && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to suspend this caregiver?')) {
                    onSuspend(caregiver);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                Suspend
              </button>
            )}
            {caregiver.status === 'suspended' && onActivate && (
              <button
                onClick={() => {
                  onActivate(caregiver);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Activate
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) {
                    onDelete(caregiver.id || caregiver.uid);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Delete
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

export default CaregiverDetailsModal;


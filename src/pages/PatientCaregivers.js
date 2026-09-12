import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  Clock,
  MessageSquare,
  Video,
  Heart,
  Stethoscope,
  Shield,
  Search,
  Eye,
  Activity,
  X,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { assignmentAPI } from '../api/assignmentAPI';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ClientCaregivers = () => {
  const { userProfile } = useUser();
  const navigate = useNavigate();
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showCaregiverDetails, setShowCaregiverDetails] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  // Default to list view on small screens where cards waste too much space
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('list');
    }
  }, []);

  const loadCaregivers = async () => {
    if (!userProfile?.id && !userProfile?.uid) return;
    const patientId = userProfile?.id || userProfile?.uid;

    try {
      setLoading(true);

      // Load assigned caregivers from admin-created assignments.
      // The backend scopes results to the authenticated patient/client.
      const assignments = await assignmentAPI.getAssignmentsByClient();
      const list = assignments || [];
      console.log(`Found ${list.length} caregiver assignments for client ${patientId}`);

      // Extract caregiver information from assignments
      const caregiversData = list.map(assignment => ({
        id: assignment.caregiverId || assignment.assignedTo,
        name: assignment.caregiverName || assignment.assignedToName || 'Unknown',
        email: assignment.caregiverEmail || '',
        role: assignment.caregiverRole || assignment.assignedToRole || 'Caregiver',
        assignedAt: assignment.createdAt || assignment.assignedAt,
        status: assignment.status,
        assignmentId: assignment.id
      }));

      console.log(`Loading assigned caregivers for client ${patientId}:`, caregiversData.length);
      setCaregivers(caregiversData || []);
    } catch (error) {
      console.error('Error loading caregivers:', error);
      toast.error('Failed to load caregiver data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.id || userProfile?.uid) {
      const patientId = userProfile?.id || userProfile?.uid;
      loadCaregivers();

      // Set up real-time subscription for assignments
      const unsubscribe = assignmentAPI.subscribeToAssignmentsByClient(null, (assignments) => {
        const list = assignments || [];
        console.log(`Real-time update: Found ${list.length} caregiver assignments for client ${patientId}`);

        // Extract caregiver information from assignments
        const caregiversData = list.map(assignment => ({
          id: assignment.caregiverId || assignment.assignedTo,
          name: assignment.caregiverName || assignment.assignedToName || 'Unknown',
          email: assignment.caregiverEmail || '',
          role: assignment.caregiverRole || assignment.assignedToRole || 'Caregiver',
          assignedAt: assignment.createdAt || assignment.assignedAt,
          status: assignment.status,
          assignmentId: assignment.id
        }));

        setCaregivers(caregiversData || []);
      });

      return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }
  }, [userProfile?.id, userProfile?.uid]);

  const filteredCaregivers = caregivers.filter(caregiver => {
    const matchesSearch = (caregiver.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (caregiver.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || (caregiver.role || '').toLowerCase().includes(filterRole.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role) => {
    if (!role) return User;
    if (role.toLowerCase().includes('doctor')) return Stethoscope;
    if (role.toLowerCase().includes('nurse')) return Heart;
    if (role.toLowerCase().includes('therapist')) return Activity;
    return Shield;
  };

  const getRoleColor = (role) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    if (role.toLowerCase().includes('doctor')) return 'bg-blue-100 text-blue-800';
    if (role.toLowerCase().includes('nurse')) return 'bg-red-100 text-red-800';
    if (role.toLowerCase().includes('therapist')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDateSafe = (v) => {
    if (!v) return 'N/A';
    const d = v?.toDate ? v.toDate() : new Date(v);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Care Team</h1>
        <p className="text-gray-600">Your assigned caregivers and healthcare providers</p>
      </div>

      {/* Search, Filter, and View Toggle */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search caregivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="therapist">Therapists</option>
            <option value="caregiver">Caregivers</option>
          </select>
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center px-3 py-2 text-sm font-medium ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center px-3 py-2 text-sm font-medium ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4 mr-1" />
            List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading your care team...</span>
        </div>
      ) : filteredCaregivers.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Caregivers Assigned</h3>
          <p className="text-gray-600">
            {caregivers.length === 0 
              ? "You haven't been assigned any caregivers yet. Contact the admin to get assigned to a care team."
              : "No caregivers match your current search criteria."
            }
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCaregivers.map((caregiver) => {
            const RoleIcon = getRoleIcon(caregiver.role);
            return (
              <div key={caregiver.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <RoleIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{caregiver.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(caregiver.role)}`}>
                        {caregiver.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCaregiver(caregiver);
                      setShowCaregiverDetails(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="truncate">{caregiver.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Assigned: {formatDateSafe(caregiver.assignedAt)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      caregiver.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {caregiver.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button onClick={() => navigate('/messages')} className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </button>
                  <button onClick={() => navigate('/telemedicine')} className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <Video className="h-4 w-4 mr-1" />
                    Video Call
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {filteredCaregivers.map((caregiver) => {
            const RoleIcon = getRoleIcon(caregiver.role);
            return (
              <div
                key={caregiver.id}
                className="p-4 sm:p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <RoleIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{caregiver.name}</h3>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleColor(caregiver.role)}`}>
                        {caregiver.role}
                      </span>
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        <span className="truncate">{caregiver.email}</span>
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDateSafe(caregiver.assignedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    caregiver.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {caregiver.status || 'Active'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCaregiver(caregiver);
                        setShowCaregiverDetails(true);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="Message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate('/telemedicine')}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      aria-label="Video call"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Caregiver Details Modal */}
      {showCaregiverDetails && selectedCaregiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Caregiver Details</h3>
                <button
                  onClick={() => setShowCaregiverDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    {(() => {
                      const RoleIcon = getRoleIcon(selectedCaregiver.role);
                      return <RoleIcon className="h-6 w-6 text-blue-600" />;
                    })()}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedCaregiver.name}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedCaregiver.role)}`}>
                      {selectedCaregiver.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{selectedCaregiver.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Assigned: {formatDateSafe(selectedCaregiver.assignedAt)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="h-4 w-4 mr-2" />
                    <span>Status: {selectedCaregiver.status || 'Active'}</span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button onClick={() => navigate('/messages')} className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </button>
                  <button onClick={() => navigate('/telemedicine')} className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <Video className="h-4 w-4 mr-2" />
                    Video Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCaregivers;

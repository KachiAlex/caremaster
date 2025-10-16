import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import InstitutionUserCreationModal from '../components/InstitutionUserCreationModal';

const InstitutionUserManagement = () => {
  const { userProfile, institutionId } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Load institution users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      if (!institutionId) {
        console.warn('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Query users belonging to this institution
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('institutionId', '==', institutionId)
        );
        
        const snapshot = await getDocs(q);
        const institutionUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Normalize role field for filtering
          role: doc.data().userType || doc.data().type || doc.data().role || 'unknown'
        }));
        
        console.log(`✅ Loaded ${institutionUsers.length} users for institution:`, institutionId);
        setUsers(institutionUsers);
      } catch (error) {
        console.error('Error loading institution users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [institutionId]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleUserCreated = (result) => {
    console.log('✅ New user created:', result);
    
    // Reload users to show the new one
    const fetchUsers = async () => {
      if (!institutionId) return;
      
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('institutionId', '==', institutionId)
        );
        
        const snapshot = await getDocs(q);
        const institutionUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          role: doc.data().userType || doc.data().type || doc.data().role || 'unknown'
        }));
        
        setUsers(institutionUsers);
      } catch (error) {
        console.error('Error reloading users:', error);
      }
    };
    
    fetchUsers();
  };

  const handleUserAction = (action, userId) => {
    const user = users.find(u => u.id === userId);
    
    if (action === 'remove' || action === 'delete') {
      // Prevent deleting primary admin
      if (user?.isPrimaryAdmin || user?.adminTier === 'primary' || user?.roles?.includes('primary-admin') || user?.cannotBeDeleted) {
        toast.error('❌ Primary administrators cannot be deleted for security reasons');
        return;
      }
      
      if (window.confirm(`Are you sure you want to delete ${user?.firstName} ${user?.lastName}? This action cannot be undone.`)) {
        toast.info('Delete user functionality - Coming soon!');
      }
    } else if (action === 'edit') {
      toast.info('Edit user functionality - Coming soon!');
    } else {
      toast.info(`${action} user action - Coming soon!`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'inactive': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore Timestamp
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      
      // Handle Date object
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      
      // Handle timestamp number
      if (typeof date === 'number') {
        return new Date(date).toLocaleDateString();
      }
      
      // Handle string date
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString() : 'N/A';
      }
      
      return 'N/A';
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate(`/onboard?institution=${institutionId}`)}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </button>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage caregivers and doctors in your institution
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="caregiver">Caregivers</option>
              <option value="nurse">Nurses</option>
              <option value="doctor">Doctors</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {user.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {user.role}
                          </span>
                          {/* Admin tier badge */}
                          {user.adminTier === 'primary' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-300">
                              🔒 PRIMARY
                            </span>
                          )}
                          {user.adminTier === 'secondary' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">
                              👤 SECONDARY
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.specialization || user.medicalQualification}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {getStatusIcon(user.status)}
                      <span className="ml-1 capitalize">{user.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {formatDate(user.joinDate || user.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.lastActive ? (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(user.lastActive)}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUserAction('edit', user.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction('remove', user.id)}
                        disabled={user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin') || user.cannotBeDeleted}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin') || user.cannotBeDeleted
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={
                          user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin')
                            ? '🔒 Primary admin cannot be deleted'
                            : 'Delete user'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institution User Creation Modal */}
      <InstitutionUserCreationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        institutionId={institutionId}
        createdBy={userProfile?.id}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};

export default InstitutionUserManagement;

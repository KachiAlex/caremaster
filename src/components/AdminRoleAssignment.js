import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import { 
  Users, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit
} from 'lucide-react';
import UserNameWithAvatar from './UserNameWithAvatar';

const AdminRoleAssignment = ({ institutionId }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);

  // Load all users in the institution
  useEffect(() => {
    loadUsers();
  }, [institutionId]);

  // Filter users based on search and role filter
  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Query users by institution
      const usersQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', institutionId)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const usersList = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          ...userData
        });
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.userType || user.type];
        return userRoles.includes(roleFilter);
      });
    }

    setFilteredUsers(filtered);
  };

  const handleAssignAdminRole = async (userId, assign) => {
    try {
      setAssigningRole(true);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error('User not found');
        return;
      }

      const userData = userDoc.data();
      const currentRoles = Array.isArray(userData.roles) ? userData.roles : [userData.userType || userData.type];

      let newRoles;
      if (assign) {
        // Add admin role if not already present
        if (!currentRoles.includes('admin')) {
          newRoles = [...currentRoles, 'admin'];
        } else {
          newRoles = currentRoles;
        }
      } else {
        // Remove admin role
        newRoles = currentRoles.filter(role => role !== 'admin');
      }

      await updateDoc(userRef, {
        roles: newRoles,
        userType: assign ? 'admin' : userData.userType,
        type: assign ? 'admin' : userData.type,
        adminRoleAssigned: assign,
        adminRoleAssignedAt: assign ? new Date().toISOString() : null,
        adminRoleAssignedBy: assign ? 'current-admin' : null
      });

      toast.success(`${assign ? 'Admin role assigned to' : 'Admin role removed from'} user successfully`);
      
      // Refresh users list
      await loadUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error assigning admin role:', error);
      toast.error('Failed to assign admin role');
    } finally {
      setAssigningRole(false);
    }
  };

  const getRoleDisplayName = (user) => {
    const roles = Array.isArray(user.roles) ? user.roles : [user.userType || user.type];
    return roles.join(', ');
  };

  const isAdmin = (user) => {
    const roles = Array.isArray(user.roles) ? user.roles : [user.userType || user.type];
    return roles.includes('admin');
  };

  const getRoleColor = (user) => {
    const roles = Array.isArray(user.roles) ? user.roles : [user.userType || user.type];
    
    if (roles.includes('admin')) return 'bg-red-100 text-red-800';
    if (roles.includes('doctor')) return 'bg-blue-100 text-blue-800';
    if (roles.includes('nurse')) return 'bg-blue-100 text-blue-800';
    if (roles.includes('pharmacist')) return 'bg-blue-100 text-purple-800';
    if (roles.includes('caregiver')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Role Assignment</h2>
            <p className="text-gray-600">Assign or remove admin roles for users in your institution</p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-red-600" />
            <span className="text-sm text-gray-500">
              {filteredUsers.filter(isAdmin).length} Admin(s)
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="caregiver">Caregiver</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserNameWithAvatar
                        userId={user.id}
                        userName={user.name || user.fullName || 'No Name'}
                        userType={user.userType || 'user'}
                        profilePictureUrl={user.profilePictureUrl}
                        size="medium"
                        className="mr-4"
                      />
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user)}`}>
                      {getRoleDisplayName(user)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {isAdmin(user) ? (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <UserMinus className="h-3 w-3 mr-1" />
                          Remove Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Make Admin
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isAdmin(selectedUser) ? 'Remove Admin Role' : 'Assign Admin Role'}
              </h3>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-medium text-blue-800">
                    {(selectedUser.name || selectedUser.fullName || selectedUser.email)?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedUser.name || selectedUser.fullName || 'No Name'}
                  </div>
                  <div className="text-sm text-gray-500">{selectedUser.email}</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">Current Role:</div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedUser)}`}>
                  {getRoleDisplayName(selectedUser)}
                </span>
              </div>
            </div>

            {isAdmin(selectedUser) ? (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-900">Remove Admin Access</span>
                </div>
                <p className="text-sm text-gray-600">
                  This will remove admin privileges from {selectedUser.name || selectedUser.fullName}. 
                  They will no longer be able to access the admin dashboard.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">Grant Admin Access</span>
                </div>
                <p className="text-sm text-gray-600">
                  This will give {selectedUser.name || selectedUser.fullName} admin privileges. 
                  They will be able to access the admin dashboard and manage users.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={assigningRole}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignAdminRole(selectedUser.id, !isAdmin(selectedUser))}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isAdmin(selectedUser)
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                } ${assigningRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={assigningRole}
              >
                {assigningRole ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  isAdmin(selectedUser) ? 'Remove Admin' : 'Make Admin'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoleAssignment;

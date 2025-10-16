import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase
} from 'lucide-react';
import { getAllUsers, updateUser, deleteUser } from '../api/usersAPI';
import { toast } from 'react-toastify';

const UserManagement = ({ institutionId }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoles, setEditingRoles] = useState([]);

  const availableRoles = [
    { value: 'admin', label: 'Administrator', color: 'red', icon: Shield },
    { value: 'doctor', label: 'Doctor', color: 'blue', icon: Briefcase },
    { value: 'nurse', label: 'Nurse', color: 'green', icon: UserCheck },
    { value: 'caregiver', label: 'Caregiver', color: 'purple', icon: Users },
    { value: 'pharmacist', label: 'Pharmacist', color: 'amber', icon: Briefcase },
    { value: 'client', label: 'Client', color: 'gray', icon: Users }
  ];

  useEffect(() => {
    loadUsers();
  }, [institutionId]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, filterRole, filterStatus, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      
      // Filter by institution if institutionId is provided
      const institutionUsers = institutionId 
        ? allUsers.filter(user => user.institutionId === institutionId)
        : allUsers;
      
      setUsers(institutionUsers);
      setFilteredUsers(institutionUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => {
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.userType || user.role];
        return userRoles.includes(filterRole);
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.status === filterStatus);
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    // Initialize roles - support both single role and multiple roles
    const currentRoles = Array.isArray(user.roles) 
      ? user.roles 
      : [user.userType || user.role].filter(Boolean);
    setEditingRoles(currentRoles);
    setShowEditModal(true);
  };

  const toggleRole = (roleValue) => {
    setEditingRoles(prev => {
      if (prev.includes(roleValue)) {
        // Remove role if it exists
        return prev.filter(r => r !== roleValue);
      } else {
        // Add role if it doesn't exist
        return [...prev, roleValue];
      }
    });
  };

  const handleSaveRoles = async () => {
    if (editingRoles.length === 0) {
      toast.warning('User must have at least one role');
      return;
    }

    try {
      await updateUser(selectedUser.id, {
        roles: editingRoles,
        userType: editingRoles[0], // Primary role for backward compatibility
        updatedAt: new Date()
      });

      toast.success('User roles updated successfully');
      setShowEditModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error updating user roles:', error);
      toast.error('Failed to update user roles');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    
    try {
      await updateUser(user.id, {
        status: newStatus,
        updatedAt: new Date()
      });

      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser(userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getRoleColor = (role) => {
    const roleConfig = availableRoles.find(r => r.value === role);
    return roleConfig?.color || 'gray';
  };

  const getRoleLabel = (role) => {
    const roleConfig = availableRoles.find(r => r.value === role);
    return roleConfig?.label || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="h-7 w-7 text-blue-600 mr-3" />
            User Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage users and assign roles ({filteredUsers.length} users)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Roles</option>
            {availableRoles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roles</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>No users found</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const userRoles = Array.isArray(user.roles) 
                  ? user.roles 
                  : [user.userType || user.role].filter(Boolean);

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-gray-900">{user.name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">{user.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900 mb-1">
                          <Mail className="h-3 w-3 text-gray-400 mr-1" />
                          {user.email || 'No email'}
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Phone className="h-3 w-3 text-gray-400 mr-1" />
                          {user.phone || 'No phone'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((role, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs font-medium rounded-full bg-${getRoleColor(role)}-100 text-${getRoleColor(role)}-700`}
                          >
                            {getRoleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-700' :
                        user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {user.joinDate?.toLocaleDateString() || user.createdAt?.toLocaleDateString() || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit roles"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 ${
                            user.status === 'active' 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          } rounded-lg transition-colors`}
                          title={user.status === 'active' ? 'Suspend user' : 'Activate user'}
                        >
                          {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Roles Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Manage User Roles</h3>
                  <p className="text-blue-100 text-sm">{selectedUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">User Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">{selectedUser.phone || 'No phone'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Assign Roles (Select multiple)</h4>
                <div className="grid grid-cols-2 gap-3">
                  {availableRoles.map((role) => {
                    const isSelected = editingRoles.includes(role.value);
                    const RoleIcon = role.icon;

                    return (
                      <button
                        key={role.value}
                        onClick={() => toggleRole(role.value)}
                        className={`p-4 border-2 rounded-xl transition-all ${
                          isSelected
                            ? `border-${role.color}-500 bg-${role.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <RoleIcon className={`h-5 w-5 ${isSelected ? `text-${role.color}-600` : 'text-gray-400'}`} />
                          {isSelected && <CheckCircle className={`h-5 w-5 text-${role.color}-600`} />}
                        </div>
                        <p className={`text-sm font-semibold ${isSelected ? `text-${role.color}-700` : 'text-gray-700'}`}>
                          {role.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {editingRoles.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-700">User must have at least one role</p>
                </div>
              )}

              {editingRoles.length > 1 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-700">
                    User can switch between {editingRoles.length} dashboards
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={editingRoles.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Roles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;


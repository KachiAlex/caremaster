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
  Briefcase,
  UserPlus,
  Heart,
  Save,
  Eye,
  EyeOff,
  DollarSign
} from 'lucide-react';
import { getAllUsers, updateUser, deleteUser, createUser } from '../api/usersAPI';
import { toast } from 'react-toastify';
import UserDataFixer from './UserDataFixer';
import ProfilePicture from './ProfilePicture';
import UserNameWithAvatar from './UserNameWithAvatar';
import CaregiverWageEditModal from './CaregiverWageEditModal';

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
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddCaregiverModal, setShowAddCaregiverModal] = useState(false);
  const [showWageModal, setShowWageModal] = useState(false);
  const [selectedCaregiverForWage, setSelectedCaregiverForWage] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    careLevel: 'basic',
    hourlyRate: '',
    monthlyRate: '',
    specializations: '',
    experience: '',
    certifications: '',
    availability: 'full-time',
    profilePictureUrl: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    // Prevent suspending primary admin
    if (user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin')) {
      toast.error('❌ Primary administrators cannot be suspended');
      return;
    }

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
    // Find the user to check if they're primary admin
    const user = users.find(u => u.id === userId);
    
    // Prevent deleting primary admin
    if (user?.isPrimaryAdmin || user?.adminTier === 'primary' || user?.roles?.includes('primary-admin') || user?.cannotBeDeleted) {
      toast.error('❌ Primary administrators cannot be deleted for security reasons');
      return;
    }

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

  const handleInputChange = (field, value) => {
    setNewUserForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setNewUserForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      medicalConditions: '',
      medications: '',
      allergies: '',
      careLevel: 'basic',
      hourlyRate: '',
      monthlyRate: '',
      specializations: '',
      experience: '',
      certifications: '',
      availability: 'full-time',
      profilePictureUrl: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateForm = (userType) => {
    const { name, email, phone, password, confirmPassword } = newUserForm;

    if (!name.trim()) {
      toast.error('Name is required');
      return false;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (userType === 'caregiver') {
      const { hourlyRate, monthlyRate } = newUserForm;
      if (!hourlyRate && !monthlyRate) {
        toast.error('Please set either hourly rate or monthly rate for caregiver');
        return false;
      }
    }

    return true;
  };

  const handleCreateUser = async (userType) => {
    if (!validateForm(userType)) return;

    try {
      // Generate a unique ID for the user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const userData = {
        id: userId,
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        phone: newUserForm.phone.trim(),
        roles: [userType],
        userType: userType,
        status: 'active',
        institutionId: institutionId,
        profilePictureUrl: newUserForm.profilePictureUrl || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add role-specific data
      if (userType === 'client') {
        userData.clientData = {
          address: newUserForm.address.trim(),
          emergencyContact: newUserForm.emergencyContact.trim(),
          emergencyPhone: newUserForm.emergencyPhone.trim(),
          medicalConditions: newUserForm.medicalConditions.trim(),
          medications: newUserForm.medications.trim(),
          allergies: newUserForm.allergies.trim(),
          careLevel: newUserForm.careLevel
        };
      } else if (userType === 'caregiver') {
        userData.caregiverData = {
          hourlyRate: newUserForm.hourlyRate ? parseFloat(newUserForm.hourlyRate) : null,
          monthlyRate: newUserForm.monthlyRate ? parseFloat(newUserForm.monthlyRate) : null,
          specializations: newUserForm.specializations.trim(),
          experience: newUserForm.experience.trim(),
          certifications: newUserForm.certifications.trim(),
          availability: newUserForm.availability
        };
      }

      // Create the user in Firestore
      await createUser(userData);
      
      toast.success(`${userType === 'client' ? 'Client' : 'Caregiver'} created successfully!`);
      resetForm();
      setShowAddClientModal(false);
      setShowAddCaregiverModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create ${userType}: ${error.message}`);
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
    <div className="space-y-6">
      {/* User Data Fixer Tool */}
      <UserDataFixer institutionId={institutionId} />

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
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                resetForm();
                setShowAddClientModal(true);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Heart className="h-4 w-4 mr-2" />
              Add Client
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowAddCaregiverModal(true);
              }}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Caregiver
            </button>
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
                        <UserNameWithAvatar
                          userId={user.id}
                          userName={user.name || 'Unknown User'}
                          userType={userRoles[0] || user.userType || 'user'}
                          profilePictureUrl={user.profilePictureUrl}
                          size="small"
                          className="mr-3"
                        />
                        <div className="ml-2">
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
                        {/* Admin tier badge */}
                        {user.adminTier && (
                          <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                            user.adminTier === 'primary' 
                              ? 'bg-red-100 text-red-700 border border-red-300' 
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}>
                            {user.adminTier === 'primary' ? '🔒 PRIMARY' : '👤 SECONDARY'}
                          </span>
                        )}
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
                        {(() => {
                          const date = user.joinDate || user.createdAt;
                          if (!date) return 'N/A';
                          
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
                        })()}
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
                        {/* Wage Management Button - Only show for caregivers */}
                        {(userRoles.includes('caregiver') || userRoles.includes('nurse') || userRoles.includes('doctor')) && (
                          <button
                            onClick={() => {
                              setSelectedCaregiverForWage(user);
                              setShowWageModal(true);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Manage wages"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin')}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin')
                              ? 'text-gray-300 cursor-not-allowed'
                              : user.status === 'active' 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={
                            user.isPrimaryAdmin || user.adminTier === 'primary' || user.roles?.includes('primary-admin')
                              ? 'Primary admin cannot be suspended'
                              : user.status === 'active' ? 'Suspend user' : 'Activate user'
                          }
                        >
                          {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
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
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center">
                    <UserNameWithAvatar
                      userId={selectedUser.id}
                      userName={selectedUser.name || 'Unknown User'}
                      userType={selectedUser.userType || 'user'}
                      profilePictureUrl={selectedUser.profilePictureUrl}
                      size="medium"
                      className="mb-2"
                    />
                  </div>
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

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Heart className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Add New Client</h3>
                  <p className="text-green-100 text-sm">Create a new client profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddClientModal(false)}
                className="text-white hover:bg-green-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Picture Section */}
                <div className="md:col-span-2 flex items-center space-x-6 mb-4 p-4 bg-gray-50 rounded-lg">
                  <ProfilePicture
                    userId="temp_client"
                    userType="client"
                    currentImageUrl={newUserForm.profilePictureUrl}
                    userName={newUserForm.name || 'New Client'}
                    onImageChange={(url) => handleInputChange('profilePictureUrl', url)}
                    onImageRemove={() => handleInputChange('profilePictureUrl', '')}
                    size="large"
                    editable={true}
                    showUploadButton={true}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Profile Picture</h4>
                    <p className="text-xs text-gray-500 mb-2">Upload a profile picture for the client</p>
                    <div className="text-xs text-gray-400">
                      <p>• Supported formats: JPEG, PNG, WebP</p>
                      <p>• Maximum size: 5MB</p>
                      <p>• Recommended: 400x400 pixels</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Care Level</label>
                  <select
                    value={newUserForm.careLevel}
                    onChange={(e) => handleInputChange('careLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="basic">Basic Care</option>
                    <option value="intermediate">Intermediate Care</option>
                    <option value="advanced">Advanced Care</option>
                    <option value="specialized">Specialized Care</option>
                  </select>
                </div>

                {/* Password Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUserForm.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={newUserForm.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Medical Information</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={newUserForm.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={newUserForm.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={newUserForm.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                  <textarea
                    value={newUserForm.medicalConditions}
                    onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="List medical conditions"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                  <textarea
                    value={newUserForm.medications}
                    onChange={(e) => handleInputChange('medications', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="List current medications"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                  <textarea
                    value={newUserForm.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="List known allergies"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddClientModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateUser('client')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Caregiver Modal */}
      {showAddCaregiverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserPlus className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Add New Caregiver</h3>
                  <p className="text-purple-100 text-sm">Create a new caregiver profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCaregiverModal(false)}
                className="text-white hover:bg-purple-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Picture Section */}
                <div className="md:col-span-2 flex items-center space-x-6 mb-4 p-4 bg-gray-50 rounded-lg">
                  <ProfilePicture
                    userId="temp_caregiver"
                    userType="caregiver"
                    currentImageUrl={newUserForm.profilePictureUrl}
                    userName={newUserForm.name || 'New Caregiver'}
                    onImageChange={(url) => handleInputChange('profilePictureUrl', url)}
                    onImageRemove={() => handleInputChange('profilePictureUrl', '')}
                    size="large"
                    editable={true}
                    showUploadButton={true}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Profile Picture</h4>
                    <p className="text-xs text-gray-500 mb-2">Upload a profile picture for the caregiver</p>
                    <div className="text-xs text-gray-400">
                      <p>• Supported formats: JPEG, PNG, WebP</p>
                      <p>• Maximum size: 5MB</p>
                      <p>• Recommended: 400x400 pixels</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <select
                    value={newUserForm.availability}
                    onChange={(e) => handleInputChange('availability', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="on-call">On Call</option>
                  </select>
                </div>

                {/* Password Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUserForm.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={newUserForm.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Professional Information</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newUserForm.hourlyRate}
                    onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter hourly rate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newUserForm.monthlyRate}
                    onChange={(e) => handleInputChange('monthlyRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter monthly rate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specializations</label>
                  <textarea
                    value={newUserForm.specializations}
                    onChange={(e) => handleInputChange('specializations', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="List specializations (e.g., dementia care, mobility assistance)"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                  <textarea
                    value={newUserForm.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe relevant experience"
                    rows="2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                  <textarea
                    value={newUserForm.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="List certifications and licenses"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddCaregiverModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateUser('caregiver')}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Caregiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wage Management Modal */}
      <CaregiverWageEditModal
        isOpen={showWageModal}
        onClose={() => {
          setShowWageModal(false);
          setSelectedCaregiverForWage(null);
        }}
        caregiver={selectedCaregiverForWage}
        onSave={(updatedCaregiver) => {
          // Reload users to reflect the updated wage
          loadUsers();
        }}
      />
      </div>
    </div>
  );
};

export default UserManagement;


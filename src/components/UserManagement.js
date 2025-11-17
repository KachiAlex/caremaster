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

  const createInitialClientForm = () => ({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    profilePictureUrl: '',
    availability: 'full-time',
    hourlyRate: '',
    monthlyRate: '',
    specializations: '',
    experience: '',
    certifications: '',
    dateOfBirth: '',
    gender: '',
    preferredLanguage: '',
    medicalHistory: '',
    allergies: '',
    medicationsDosages: '',
    primaryContactName: '',
    primaryContactRelationship: '',
    primaryContactGender: '',
    primaryContactPhone: '',
    primaryContactEmail: '',
    primaryContactAddress: '',
    preferredCommunication: '',
    caregiverTypes: [],
    serviceFrequency: '',
    serviceFrequencyDetails: '',
    careTypes: [],
    careTypeOther: '',
    preferredCareTimes: '',
    preferredStartDate: '',
    homeEquipment: '',
    specialInstructions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    additionalNotes: '',
    referralSource: ''
  });

  const [newUserForm, setNewUserForm] = useState(() => createInitialClientForm());
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
  const caregiverTypeOptions = [
    'Private Doctor',
    'Registered Nurse',
    'Certified Caregiver (Female)',
    'Certified Caregiver (Male)',
    'No Preferences'
  ];
  const careTypeOptions = [
    'Personal care',
    'Companionship',
    'Medication management',
    'Mobility assistance',
    'Feeding',
    'Home cleaning services',
    'Activities of daily living (grooming, laundry, grocery)',
    'Other (please specify)'
  ];
  const serviceFrequencyOptions = [
    'Full time (Live in)',
    'Part-time (Daily living)',
    'Weekly visits',
    'Others (please specify)'
  ];
  const communicationOptions = ['Phone Call', 'Text Message', 'WhatsApp', 'Email'];
  const languageOptions = ['English', 'French', 'Spanish', 'Yoruba', 'Igbo', 'Hausa', 'Other'];
  const referralOptions = ['Family', 'Friends', 'Referral', 'Social Media'];
  const genderOptions = ['Male', 'Female', 'Other'];

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

  const toggleCaregiverType = (option) => {
    setNewUserForm(prev => {
      const current = prev.caregiverTypes || [];
      if (option === 'No Preferences') {
        return {
          ...prev,
          caregiverTypes: current.includes(option) ? [] : [option]
        };
      }
      const filtered = current.filter(item => item !== option && item !== 'No Preferences');
      const next = current.includes(option)
        ? filtered
        : [...filtered, option];
      return { ...prev, caregiverTypes: next };
    });
  };

  const toggleCareType = (option) => {
    setNewUserForm(prev => {
      const current = prev.careTypes || [];
      const next = current.includes(option)
        ? current.filter(item => item !== option)
        : [...current, option];
      return { ...prev, careTypes: next };
    });
  };

  const Label = ({ text, required }) => (
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-semibold text-gray-700">{text}</span>
      {required && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">
          Required
        </span>
      )}
    </div>
  );

  const SectionCard = ({ title, subtitle, children }) => (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">{subtitle}</p>
        <h4 className="mt-1 text-lg font-bold text-gray-900">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const resetForm = () => {
    setNewUserForm(createInitialClientForm());
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateForm = (userType) => {
    const { 
      name, 
      email, 
      phone, 
      password, 
      confirmPassword,
      dateOfBirth,
      gender,
      preferredLanguage,
      primaryContactName,
      primaryContactRelationship,
      primaryContactPhone,
      primaryContactEmail,
      caregiverTypes,
      serviceFrequency,
      serviceFrequencyDetails,
      careTypes,
      preferredCareTimes,
      preferredStartDate,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      preferredCommunication
    } = newUserForm;

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

    if (!dateOfBirth && userType === 'client') {
      toast.error('Date of birth is required');
      return false;
    }

    if (!gender && userType === 'client') {
      toast.error('Please select a gender');
      return false;
    }

    if (!preferredLanguage.trim() && userType === 'client') {
      toast.error('Preferred language is required');
      return false;
    }

    if (userType === 'client') {
      if (!primaryContactName.trim()) {
        toast.error('Primary contact name is required');
        return false;
      }
      if (!primaryContactRelationship.trim()) {
        toast.error('Relationship to client is required');
        return false;
      }
      if (!primaryContactPhone.trim()) {
        toast.error('Primary contact phone number is required');
        return false;
      }
      if (!primaryContactEmail.trim()) {
        toast.error('Primary contact email is required');
        return false;
      }
      if (!preferredCommunication.trim()) {
        toast.error('Select a preferred communication method');
        return false;
      }
      if (!caregiverTypes.length) {
        toast.error('Select at least one caregiver preference');
        return false;
      }
      if (!serviceFrequency.trim()) {
        toast.error('Select a service frequency');
        return false;
      }
      if (serviceFrequency === 'Others (please specify)' && !serviceFrequencyDetails.trim()) {
        toast.error('Provide details for the selected service frequency');
        return false;
      }
      if (!careTypes.length) {
        toast.error('Select at least one type of care required');
        return false;
      }
      if (!preferredCareTimes.trim()) {
        toast.error('Preferred days/times for care is required');
        return false;
      }
      if (!preferredStartDate) {
        toast.error('Preferred start date of care is required');
        return false;
      }
      if (!emergencyContactName.trim() || !emergencyContactPhone.trim() || !emergencyContactRelationship.trim()) {
        toast.error('Emergency contact details are required');
        return false;
      }
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
        const primaryContact = {
          name: newUserForm.primaryContactName.trim(),
          relationship: newUserForm.primaryContactRelationship.trim(),
          gender: newUserForm.primaryContactGender,
          phone: newUserForm.primaryContactPhone.trim(),
          email: newUserForm.primaryContactEmail.trim(),
          address: newUserForm.primaryContactAddress.trim(),
          preferredCommunication: newUserForm.preferredCommunication
        };

        const emergencyContact = {
          name: newUserForm.emergencyContactName.trim(),
          phone: newUserForm.emergencyContactPhone.trim(),
          relationship: newUserForm.emergencyContactRelationship.trim()
        };

        const carePreferences = {
          caregiverTypes: newUserForm.caregiverTypes,
          serviceFrequency: newUserForm.serviceFrequency,
          serviceFrequencyDetails: newUserForm.serviceFrequencyDetails.trim(),
          careTypes: newUserForm.careTypes,
          careTypeOther: newUserForm.careTypeOther.trim(),
          preferredCareTimes: newUserForm.preferredCareTimes.trim(),
          preferredStartDate: newUserForm.preferredStartDate,
          homeEquipment: newUserForm.homeEquipment.trim(),
          routineInstructions: newUserForm.specialInstructions.trim()
        };

        userData.clientData = {
          address: newUserForm.address.trim(),
          addressOfResidence: newUserForm.address.trim(),
          dateOfBirth: newUserForm.dateOfBirth,
          gender: newUserForm.gender,
          preferredLanguage: newUserForm.preferredLanguage.trim(),
          medicalHistory: newUserForm.medicalHistory.trim(),
          medicalConditions: newUserForm.medicalHistory.trim(),
          allergies: newUserForm.allergies.trim(),
          medications: newUserForm.medicationsDosages.trim(),
          medicationsDosages: newUserForm.medicationsDosages.trim(),
          careLevel: 'custom',
          primaryContact,
          emergencyContact,
          emergencyContactName: emergencyContact.name,
          emergencyContactPhone: emergencyContact.phone,
          carePreferences,
          preferredCommunication: newUserForm.preferredCommunication,
          homeEquipment: newUserForm.homeEquipment.trim(),
          routineInstructions: newUserForm.specialInstructions.trim(),
          additionalNotes: newUserForm.additionalNotes.trim(),
          referralSource: newUserForm.referralSource
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Heart className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Client Intake & Service Request</h3>
                  <p className="text-emerald-100 text-sm">Collect every detail needed to onboard a new client</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddClientModal(false);
                  resetForm();
                }}
                className="text-white hover:bg-emerald-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-gray-50">
              {/* Profile */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4 md:flex-row md:items-center">
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
                  <h4 className="text-base font-semibold text-gray-900">Client Photo</h4>
                  <p className="text-sm text-gray-500">
                    Upload a clear photo to help caregivers recognise the client. Supported formats: JPG, PNG, WebP (max 5MB).
                  </p>
                </div>
              </div>

              <SectionCard subtitle="Section A" title="Client Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label text="Full Name" required />
                    <input
                      type="text"
                      value={newUserForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter client's full name"
                    />
                  </div>
                  <div>
                    <Label text="Email" required />
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="name@email.com"
                    />
                  </div>
                  <div>
                    <Label text="Phone Number" required />
                    <input
                      type="tel"
                      value={newUserForm.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                  <div>
                    <Label text="Date of Birth" required />
                    <input
                      type="date"
                      value={newUserForm.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <Label text="Preferred Language" required />
                    <select
                      value={newUserForm.preferredLanguage}
                      onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select language</option>
                      {languageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label text="Gender" required />
                    <div className="flex flex-wrap gap-3">
                      {genderOptions.map(option => (
                        <label
                          key={option}
                          className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium ${
                            newUserForm.gender === option
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={newUserForm.gender === option}
                            onChange={() => handleInputChange('gender', option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label text="Address of Residence" required />
                    <textarea
                      value={newUserForm.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={2}
                      placeholder="Street, city, state"
                    />
                  </div>
                  <div>
                    <Label text="Password" required />
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newUserForm.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label text="Confirm Password" required />
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={newUserForm.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard subtitle="Section B" title="Client Medical Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label text="Medical history, diagnosis, or known conditions" required />
                    <textarea
                      value={newUserForm.medicalHistory}
                      onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="Provide relevant medical background"
                    />
                  </div>
                  <div>
                    <Label text="Allergies" required />
                    <textarea
                      value={newUserForm.allergies}
                      onChange={(e) => handleInputChange('allergies', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="List allergies, if any"
                    />
                  </div>
                  <div>
                    <Label text="Medications and dosages" required />
                    <textarea
                      value={newUserForm.medicationsDosages}
                      onChange={(e) => handleInputChange('medicationsDosages', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="e.g. Metformin 500mg, 2x daily"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard subtitle="Section C" title="Primary Contact Person">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label text="Full Name" required />
                    <input
                      type="text"
                      value={newUserForm.primaryContactName}
                      onChange={(e) => handleInputChange('primaryContactName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Contact person's name"
                    />
                  </div>
                  <div>
                    <Label text="Relationship to Client" required />
                    <input
                      type="text"
                      value={newUserForm.primaryContactRelationship}
                      onChange={(e) => handleInputChange('primaryContactRelationship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g. Daughter, Son"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label text="Gender" />
                    <div className="flex flex-wrap gap-3">
                      {genderOptions.map(option => (
                        <label
                          key={option + '-primary'}
                          className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium ${
                            newUserForm.primaryContactGender === option
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={newUserForm.primaryContactGender === option}
                            onChange={() => handleInputChange('primaryContactGender', option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label text="Phone Number (include country code)" required />
                    <input
                      type="tel"
                      value={newUserForm.primaryContactPhone}
                      onChange={(e) => handleInputChange('primaryContactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="+44 0000 0000"
                    />
                  </div>
                  <div>
                    <Label text="Email Address" required />
                    <input
                      type="email"
                      value={newUserForm.primaryContactEmail}
                      onChange={(e) => handleInputChange('primaryContactEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="contact@email.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label text="Residential Address" />
                    <textarea
                      value={newUserForm.primaryContactAddress}
                      onChange={(e) => handleInputChange('primaryContactAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={2}
                      placeholder="Street, city, country"
                    />
                  </div>
                  <div>
                    <Label text="Preferred means of communication" required />
                    <select
                      value={newUserForm.preferredCommunication}
                      onChange={(e) => handleInputChange('preferredCommunication', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select option</option>
                      {communicationOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard subtitle="Section D" title="Care Preferences">
                <div className="space-y-6">
                  <div>
                    <Label text="Type of caregiver required" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {caregiverTypeOptions.map(option => (
                        <label
                          key={option}
                          className={`flex items-center justify-between px-4 py-3 border rounded-lg cursor-pointer ${
                            (newUserForm.caregiverTypes || []).includes(option)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                          onClick={() => toggleCaregiverType(option)}
                        >
                          <span className="text-sm font-medium">{option}</span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={(newUserForm.caregiverTypes || []).includes(option)}
                            readOnly
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label text="Frequency of service" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {serviceFrequencyOptions.map(option => (
                        <label
                          key={option}
                          className={`px-4 py-3 border rounded-lg cursor-pointer text-sm font-medium ${
                            newUserForm.serviceFrequency === option
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={newUserForm.serviceFrequency === option}
                            onChange={() => handleInputChange('serviceFrequency', option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {newUserForm.serviceFrequency === 'Others (please specify)' && (
                      <input
                        type="text"
                        value={newUserForm.serviceFrequencyDetails}
                        onChange={(e) => handleInputChange('serviceFrequencyDetails', e.target.value)}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Describe service frequency"
                      />
                    )}
                  </div>

                  <div>
                    <Label text="Type of care required" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {careTypeOptions.map(option => (
                        <label
                          key={option}
                          className={`px-4 py-3 border rounded-lg cursor-pointer text-sm font-medium ${
                            (newUserForm.careTypes || []).includes(option)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                          onClick={() => toggleCareType(option)}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={(newUserForm.careTypes || []).includes(option)}
                            readOnly
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {(newUserForm.careTypes || []).includes('Other (please specify)') && (
                      <input
                        type="text"
                        value={newUserForm.careTypeOther}
                        onChange={(e) => handleInputChange('careTypeOther', e.target.value)}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Describe the care required"
                      />
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard subtitle="Section E" title="Scheduling & Home Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label text="Preferred days/times for care" required />
                    <textarea
                      value={newUserForm.preferredCareTimes}
                      onChange={(e) => handleInputChange('preferredCareTimes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="e.g. Weekdays 8am - 6pm"
                    />
                  </div>
                  <div>
                    <Label text="Preferred start date of care" required />
                    <input
                      type="date"
                      value={newUserForm.preferredStartDate}
                      onChange={(e) => handleInputChange('preferredStartDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <Label text="Equipment and supplies at home" />
                    <textarea
                      value={newUserForm.homeEquipment}
                      onChange={(e) => handleInputChange('homeEquipment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="Wheelchair, oxygen, grab bars..."
                    />
                  </div>
                  <div>
                    <Label text="Special instructions / routine" />
                    <textarea
                      value={newUserForm.specialInstructions}
                      onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="Feeding schedule, mobility assistance, safety instructions..."
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard subtitle="Section F" title="Local Support & Emergency Contact">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label text="Emergency contact name" required />
                    <input
                      type="text"
                      value={newUserForm.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Local emergency contact"
                    />
                  </div>
                  <div>
                    <Label text="Phone number" required />
                    <input
                      type="tel"
                      value={newUserForm.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="+234..."
                    />
                  </div>
                  <div>
                    <Label text="Relationship to client" required />
                    <input
                      type="text"
                      value={newUserForm.emergencyContactRelationship}
                      onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g. Brother"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard subtitle="Section G" title="Additional Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label text="Specific instructions or notes" />
                    <textarea
                      value={newUserForm.additionalNotes}
                      onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                      placeholder="Any other information we should know"
                    />
                  </div>
                  <div>
                    <Label text="How did you hear about us?" required />
                    <div className="grid grid-cols-2 gap-3">
                      {referralOptions.map(option => (
                        <label
                          key={option}
                          className={`px-4 py-3 border rounded-lg cursor-pointer text-sm font-medium ${
                            newUserForm.referralSource === option
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={newUserForm.referralSource === option}
                            onChange={() => handleInputChange('referralSource', option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Clear Form
              </button>
              <div className="flex w-full sm:w-auto gap-3">
                <button
                  onClick={() => {
                    setShowAddClientModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreateUser('client')}
                  className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Client
                </button>
              </div>
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


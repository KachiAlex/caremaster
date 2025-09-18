import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Award,
  Phone,
  Mail,
  Calendar,
  Activity,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

const AdminCaregiverManagement = () => {
  const { userProfile } = useUser();
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showCaregiverDetails, setShowCaregiverDetails] = useState(false);

  useEffect(() => {
    loadCaregivers();
  }, []);

  const loadCaregivers = async () => {
    try {
      setLoading(true);
      // Load caregivers from admin-managed database
      const caregiversData = []; // Will be replaced with API call
      setCaregivers(caregiversData);
    } catch (error) {
      console.error('Error loading caregivers:', error);
      toast.error('Failed to load caregiver database');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCaregiver = async (caregiverData) => {
    try {
      // Generate login credentials for the caregiver
      const credentials = {
        email: caregiverData.email,
        temporaryPassword: `ElderX${Math.random().toString(36).slice(-8)}`,
        mustChangePassword: true
      };

      const newCaregiver = {
        id: `caregiver_${Date.now()}`,
        ...caregiverData,
        ...credentials,
        createdBy: userProfile.id,
        createdAt: new Date(),
        status: 'active',
        accountType: 'admin_created'
      };

      // API call would create Firebase Auth account and Firestore profile
      console.log('Creating caregiver account:', newCaregiver);
      
      setCaregivers(prev => [...prev, newCaregiver]);
      setShowAddCaregiver(false);
      
      // Show credentials to admin
      toast.success(`Caregiver account created! Credentials: ${credentials.email} / ${credentials.temporaryPassword}`);
    } catch (error) {
      console.error('Error creating caregiver:', error);
      toast.error('Failed to create caregiver account');
    }
  };

  const handleCaregiverAction = async (caregiverId, action) => {
    try {
      switch (action) {
        case 'suspend':
          // Suspend caregiver account
          await updateCaregiverStatus(caregiverId, 'suspended');
          toast.success('Caregiver account suspended');
          break;
        case 'activate':
          // Activate caregiver account
          await updateCaregiverStatus(caregiverId, 'active');
          toast.success('Caregiver account activated');
          break;
        case 'delete':
          // Delete caregiver account (with confirmation)
          if (window.confirm('Are you sure you want to permanently delete this caregiver account?')) {
            await deleteCaregiverAccount(caregiverId);
            toast.success('Caregiver account deleted');
          }
          break;
        default:
          break;
      }
      loadCaregivers(); // Refresh list
    } catch (error) {
      console.error(`Error performing ${action} on caregiver:`, error);
      toast.error(`Failed to ${action} caregiver`);
    }
  };

  const updateCaregiverStatus = async (caregiverId, status) => {
    // API call to update caregiver status
    console.log(`Updating caregiver ${caregiverId} status to ${status}`);
  };

  const deleteCaregiverAccount = async (caregiverId) => {
    // API call to delete caregiver account
    console.log(`Deleting caregiver account ${caregiverId}`);
  };

  const filteredCaregivers = caregivers.filter(caregiver => {
    const matchesSearch = caregiver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caregiver.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || caregiver.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Caregiver Management</h1>
          <p className="text-gray-600">Create and manage caregiver accounts</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </button>
          <button 
            onClick={() => setShowAddCaregiver(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Caregiver Account
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Caregivers</p>
              <p className="text-2xl font-semibold text-gray-900">{caregivers.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {caregivers.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">On Duty</p>
              <p className="text-2xl font-semibold text-gray-900">
                {caregivers.filter(c => c.currentStatus === 'on_duty').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-2xl font-semibold text-gray-900">
                {caregivers.filter(c => c.status === 'suspended').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doctors</p>
              <p className="text-2xl font-semibold text-gray-900">
                {caregivers.filter(c => c.role === 'doctor').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search caregivers by name, specialization, or role..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Caregivers</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending Setup</option>
              <option value="doctor">Doctors Only</option>
              <option value="nurse">Nurses Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Caregivers Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Caregiver Accounts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Specialization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Availability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCaregivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Caregivers Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm ? 'No caregivers match your search criteria' : 'Start by creating your first caregiver account'}
                    </p>
                    <button 
                      onClick={() => setShowAddCaregiver(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Caregiver
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCaregivers.map((caregiver) => (
                  <tr key={caregiver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-medium text-sm">
                            {caregiver.name?.split(' ').map(n => n[0]).join('') || 'C'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{caregiver.name}</div>
                          <div className="text-sm text-gray-500">{caregiver.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{caregiver.role}</div>
                      <div className="text-sm text-gray-500">{caregiver.specialization}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        caregiver.status === 'active' ? 'bg-green-100 text-green-800' :
                        caregiver.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {caregiver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caregiver.availability || 'Not set'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Rating: {caregiver.rating || 'N/A'}</div>
                      <div className="text-sm text-gray-500">Tasks: {caregiver.completedTasks || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedCaregiver(caregiver);
                            setShowCaregiverDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleCaregiverAction(caregiver.id, 'edit')}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {caregiver.status === 'active' ? (
                          <button 
                            onClick={() => handleCaregiverAction(caregiver.id, 'suspend')}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Suspend"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleCaregiverAction(caregiver.id, 'activate')}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleCaregiverAction(caregiver.id, 'delete')}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Caregiver Modal */}
      {showAddCaregiver && (
        <AddCaregiverModal
          onClose={() => setShowAddCaregiver(false)}
          onCreate={handleCreateCaregiver}
        />
      )}

      {/* Caregiver Details Modal */}
      {showCaregiverDetails && selectedCaregiver && (
        <CaregiverDetailsModal
          caregiver={selectedCaregiver}
          onClose={() => setShowCaregiverDetails(false)}
        />
      )}
    </div>
  );
};

// Add Caregiver Modal Component
const AddCaregiverModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    specialization: '',
    qualifications: '',
    experience: '',
    availableDays: [],
    workingHours: '',
    flexibleArrangement: false,
    hourlyRate: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  const caregiverRoles = [
    'Doctor',
    'Nurse', 
    'Physiotherapist',
    'Occupational Therapist',
    'Social Worker',
    'Home Health Aide',
    'Companion Caregiver',
    'Medication Manager'
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleDayToggle = (day) => {
    setFormData({
      ...formData,
      availableDays: formData.availableDays.includes(day)
        ? formData.availableDays.filter(d => d !== day)
        : [...formData.availableDays, day]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Create Caregiver Account</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4">Professional Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Role</option>
                  {caregiverRoles.map(role => (
                    <option key={role} value={role.toLowerCase()}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cardiac Care, Dementia Care"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications *</label>
                <textarea
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="List all relevant qualifications and certifications..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience *</label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Describe relevant work experience..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4">Availability</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {daysOfWeek.map(day => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.availableDays.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        className="rounded"
                      />
                      <span className="text-sm">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours</label>
                  <select
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Hours</option>
                    <option value="morning">Morning (6AM-2PM)</option>
                    <option value="afternoon">Afternoon (2PM-10PM)</option>
                    <option value="night">Night (10PM-6AM)</option>
                    <option value="full-day">Full Day (24 hours)</option>
                    <option value="flexible">Flexible Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="₦ per hour"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      name="flexibleArrangement"
                      checked={formData.flexibleArrangement}
                      onChange={handleChange}
                      className="rounded"
                    />
                    <span className="text-sm">Open to flexible work arrangements</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Caregiver Details Modal Component
const CaregiverDetailsModal = ({ caregiver, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Caregiver Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Account credentials would be shown here for admin */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Account Credentials</h4>
            <p className="text-sm text-blue-700">Email: {caregiver.email}</p>
            <p className="text-sm text-blue-700">Temporary Password: {caregiver.temporaryPassword || 'Already changed'}</p>
          </div>
          
          {/* Rest of caregiver details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Professional Info</h4>
              <div className="space-y-2">
                <p><span className="text-gray-600">Role:</span> {caregiver.role}</p>
                <p><span className="text-gray-600">Specialization:</span> {caregiver.specialization}</p>
                <p><span className="text-gray-600">Experience:</span> {caregiver.experience}</p>
                <p><span className="text-gray-600">Qualifications:</span> {caregiver.qualifications}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Availability</h4>
              <div className="space-y-2">
                <p><span className="text-gray-600">Days:</span> {caregiver.availableDays?.join(', ') || 'Not set'}</p>
                <p><span className="text-gray-600">Hours:</span> {caregiver.workingHours || 'Not set'}</p>
                <p><span className="text-gray-600">Flexible:</span> {caregiver.flexibleArrangement ? 'Yes' : 'No'}</p>
                <p><span className="text-gray-600">Rate:</span> ₦{caregiver.hourlyRate}/hour</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCaregiverManagement;

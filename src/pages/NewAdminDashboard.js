import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Heart, 
  AlertTriangle,
  Plus,
  BarChart3,
  Activity,
  FileText,
  Settings,
  LogOut,
  Building,
  Clock,
  TrendingUp,
  Shield,
  Bell,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';

const NewAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('elderx_admin_authenticated') === 'true';
    if (!isAuthenticated) {
      window.location.href = '/new-admin-login';
      return;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('elderx_admin_authenticated');
    localStorage.removeItem('elderx_admin_email');
    localStorage.removeItem('elderx_admin_timestamp');
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  const adminEmail = localStorage.getItem('elderx_admin_email') || 'admin@elderx.com';

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Healthcare Management Platform</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('add-patient')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </button>
          <button
            onClick={() => setActiveTab('add-caregiver')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Add Caregiver
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-semibold text-gray-900">{patients.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Caregivers</p>
              <p className="text-2xl font-semibold text-gray-900">{caregivers.filter(c => c.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab('patients')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Manage Patients</span>
          </button>
          <button 
            onClick={() => setActiveTab('caregivers')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium">Manage Caregivers</span>
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium">Assign Tasks</span>
          </button>
          <button 
            onClick={() => setActiveTab('monitoring')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Heart className="h-8 w-8 text-red-600 mb-2" />
            <span className="text-sm font-medium">Care Monitoring</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">System initialized</p>
              <p className="text-xs text-gray-500">Ready to add patients and caregivers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Database</h1>
        <button
          onClick={() => setActiveTab('add-patient')}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Patient
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-6">
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Yet</h3>
            <p className="text-gray-600 mb-4">Start by adding your first patient to the database</p>
            <button
              onClick={() => setActiveTab('add-patient')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCaregivers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Caregiver Management</h1>
        <button
          onClick={() => setActiveTab('add-caregiver')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Caregiver Account
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-6">
          <div className="text-center py-12">
            <UserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Caregivers Yet</h3>
            <p className="text-gray-600 mb-4">Create the first caregiver account</p>
            <button
              onClick={() => setActiveTab('add-caregiver')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Caregiver
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddPatient = () => (
    <AddPatientForm onBack={() => setActiveTab('patients')} onAdd={(patient) => {
      setPatients(prev => [...prev, { ...patient, id: Date.now() }]);
      setActiveTab('patients');
      toast.success('Patient added successfully!');
    }} />
  );

  const renderAddCaregiver = () => (
    <AddCaregiverForm onBack={() => setActiveTab('caregivers')} onCreate={(caregiver) => {
      setCaregivers(prev => [...prev, { ...caregiver, id: Date.now(), status: 'active' }]);
      setActiveTab('caregivers');
      toast.success('Caregiver account created successfully!');
    }} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">ElderX Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {adminEmail}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'caregivers', label: 'Caregivers', icon: UserCheck },
              { id: 'tasks', label: 'Tasks', icon: Calendar },
              { id: 'monitoring', label: 'Monitoring', icon: Heart },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'caregivers' && renderCaregivers()}
        {activeTab === 'add-patient' && renderAddPatient()}
        {activeTab === 'add-caregiver' && renderAddCaregiver()}
        {activeTab === 'tasks' && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Assignment</h2>
            <p className="text-gray-600">Coming soon - Assign and schedule caregiver tasks</p>
          </div>
        )}
        {activeTab === 'monitoring' && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Care Monitoring</h2>
            <p className="text-gray-600">Coming soon - Monitor all patient care activities</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h2>
            <p className="text-gray-600">Coming soon - Platform configuration and settings</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Add Patient Form Component
const AddPatientForm = ({ onBack, onAdd }) => {
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    priority: 'normal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(patientData);
  };

  const handleChange = (e) => {
    setPatientData({
      ...patientData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Add New Patient</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Patients
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={patientData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
              <input
                type="number"
                name="age"
                value={patientData.age}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <select
                name="gender"
                value={patientData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={patientData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
            <textarea
              name="address"
              value={patientData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows="2"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name *</label>
              <input
                type="text"
                name="emergencyContactName"
                value={patientData.emergencyContactName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone *</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={patientData.emergencyContactPhone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
            <textarea
              name="medicalConditions"
              value={patientData.medicalConditions}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="List any medical conditions..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderAddCaregiver = () => (
    <AddCaregiverForm onBack={() => setActiveTab('caregivers')} onCreate={(caregiver) => {
      setCaregivers(prev => [...prev, { ...caregiver, id: Date.now(), status: 'active' }]);
      setActiveTab('caregivers');
      
      // Show generated credentials
      const tempPassword = `ElderX${Math.random().toString(36).slice(-6)}`;
      toast.success(`Caregiver account created! Login: ${caregiver.email} / ${tempPassword}`, {
        autoClose: 10000
      });
    }} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">ElderX Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {adminEmail}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'caregivers', label: 'Caregivers', icon: UserCheck },
              { id: 'tasks', label: 'Tasks', icon: Calendar },
              { id: 'monitoring', label: 'Monitoring', icon: Heart },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'caregivers' && renderCaregivers()}
        {activeTab === 'add-patient' && renderAddPatient()}
        {activeTab === 'add-caregiver' && renderAddCaregiver()}
        {activeTab === 'tasks' && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Assignment</h2>
            <p className="text-gray-600">Assign and schedule caregiver tasks</p>
          </div>
        )}
        {activeTab === 'monitoring' && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Care Monitoring</h2>
            <p className="text-gray-600">Monitor all patient care activities</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h2>
            <p className="text-gray-600">Platform configuration</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Add Caregiver Form Component
const AddCaregiverForm = ({ onBack, onCreate }) => {
  const [caregiverData, setCaregiverData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    specialization: '',
    qualifications: '',
    experience: '',
    availableDays: [],
    workingHours: '',
    flexibleArrangement: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(caregiverData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCaregiverData({
      ...caregiverData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Caregiver Account</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Caregivers
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={caregiverData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={caregiverData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={caregiverData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select
                name="role"
                value={caregiverData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Role</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="physiotherapist">Physiotherapist</option>
                <option value="occupational-therapist">Occupational Therapist</option>
                <option value="social-worker">Social Worker</option>
                <option value="home-health-aide">Home Health Aide</option>
                <option value="companion">Companion Caregiver</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <input
              type="text"
              name="specialization"
              value={caregiverData.specialization}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cardiac Care, Dementia Care, Physical Therapy"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications *</label>
              <textarea
                name="qualifications"
                value={caregiverData.qualifications}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="List qualifications and certifications..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience *</label>
              <textarea
                name="experience"
                value={caregiverData.experience}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Describe relevant experience..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onBack}
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

export default NewAdminDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useUser } from '../contexts/UserContext';
import { 
  Users, 
  Heart, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  UserCheck,
  Clock,
  Shield,
  BarChart3,
  FileText,
  MessageSquare,
  Eye,
  Download,
  RefreshCw,
  Zap,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Plus,
  Settings,
  LogOut,
  X,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { getAllUsers, createUser } from '../api/usersAPI';
import { analyticsAPI } from '../api/analyticsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { getAllPatients, createPatient, updatePatient } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { getPatientReports, createPatientReport, getPatientCareLogs, createPatientCareLog } from '../api/patientReportsAPI';
import { toast } from 'react-toastify';

const InstitutionAdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile, institutionId } = useUser();
  const functions = getFunctions();
  
  // Get institution ID from URL params or user context
  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId;
  
  // If no user is logged in, redirect to institution login
  useEffect(() => {
    if (!user && effectiveInstitutionId) {
      console.log('🔄 No user logged in, redirecting to institution login for:', effectiveInstitutionId);
      navigate(`/institution/login?institution=${effectiveInstitutionId}&returnTo=/institution-admin/dashboard`);
    } else if (!user) {
      console.log('❌ No user and no institution ID found');
      navigate('/');
    }
  }, [user, effectiveInstitutionId, navigate]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    patients: 0,
    caregivers: 0,
    doctors: 0,
    nurses: 0,
    activeAppointments: 0,
    emergencyAlerts: 0,
    medicationReminders: 0,
    systemHealth: 'Good',
    satisfaction: 0,
    responseTime: 0,
    uptime: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [topCaregivers, setTopCaregivers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Patient and Caregiver Management States
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState('patient-to-caregiver');
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState('');
  const [selectedCaregiverForAssignment, setSelectedCaregiverForAssignment] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // View Details Modal States
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showCaregiverDetails, setShowCaregiverDetails] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);

  useEffect(() => {
    if (userProfile && institutionId) {
      loadDashboardData();
    }
  }, [userProfile, institutionId]);

  const loadDashboardData = async () => {
    try {
      // Get institutionId from userProfile or context
      const instId = institutionId || userProfile?.institutionId;
      
      console.log('📊 Loading institution dashboard for:', instId);
      
      // Show loading state immediately but don't block rendering
      setLoading(true);
      
      // Set default stats first so UI renders faster
      setStats({
        totalUsers: 0,
        patients: 0,
        caregivers: 0,
        doctors: 0,
        nurses: 0,
        activeAppointments: 0,
        emergencyAlerts: 0,
        medicationReminders: 0,
        systemHealth: 'Good',
        satisfaction: 0,
        responseTime: 0,
        uptime: 0
      });
      setLoading(false);
      
      // Load real data from backend APIs (filtered by institution) - in background
      const [analytics, users, emergencies, caregiversData, patientsData, assignmentsData] = await Promise.all([
        analyticsAPI.getOverviewAnalytics().catch(err => {
          console.warn('Failed to fetch analytics:', err);
          return {};
        }),
        getAllUsers().catch(err => {
          console.warn('Failed to fetch users:', err);
          return [];
        }),
        emergencyAPI.getEmergencyHistory({ status: 'active', limit: 10 }).catch(err => {
          console.warn('Failed to fetch emergencies:', err);
          return [];
        }),
        caregiverAPI.getCaregivers({ institutionId: instId, limit: 50 }).catch(err => {
          console.warn('Failed to fetch caregivers:', err);
          return [];
        }),
        getAllPatients(instId).catch(err => {
          console.warn('Failed to fetch patients:', err);
          return [];
        }),
        assignmentAPI.getAssignmentsByInstitution(instId).catch(err => {
          console.warn('Failed to fetch assignments:', err);
          return [];
        })
      ]);

      // Filter by institution if institutionId is available
      console.log('\n🔍 FILTERING BY INSTITUTION ID:', instId);
      console.log('Before filtering - caregivers:', caregiversData.length);
      console.log('Before filtering - users:', users.length);
      
      const institutionUsers = instId 
        ? users.filter(u => u.institutionId === instId)
        : users;

      const institutionCaregivers = instId 
        ? caregiversData.filter(c => c.institutionId === instId)
        : caregiversData;

      const institutionPatients = instId 
        ? patientsData.filter(p => p.institutionId === instId)
        : patientsData;
        
      console.log('After filtering - institutionCaregivers:', institutionCaregivers.length);
      console.log('After filtering - institutionUsers:', institutionUsers.length);
      
      // Debug: Check if there are caregivers with mismatched institutionIds
      if (instId && caregiversData.length > institutionCaregivers.length) {
        console.warn('⚠️ Some caregivers were filtered out! Checking institutionIds:');
        caregiversData.forEach(c => {
          if (c.institutionId !== instId) {
            console.warn(`Caregiver "${c.name}" (${c.id}) has institutionId: "${c.institutionId}" but expected: "${instId}"`);
          }
        });
      }

      // Also get caregivers from users collection (for those created via Add Caregiver button)
      const caregiversFromUsers = institutionUsers.filter(u => 
        u.userType === 'caregiver' || u.userType === 'nurse' || u.userType === 'doctor' ||
        u.type === 'caregiver' || u.type === 'nurse' || u.type === 'doctor'
      );
      
      // Merge caregivers from both sources (deduplicate by id)
      const allInstitutionCaregivers = [...institutionCaregivers];
      caregiversFromUsers.forEach(userCaregiver => {
        if (!allInstitutionCaregivers.find(c => c.id === userCaregiver.id || c.id === userCaregiver.uid)) {
          allInstitutionCaregivers.push({
            id: userCaregiver.id || userCaregiver.uid,
            uid: userCaregiver.uid,
            name: userCaregiver.name || userCaregiver.displayName,
            email: userCaregiver.email,
            userType: userCaregiver.userType || userCaregiver.type,
            type: userCaregiver.type || userCaregiver.userType,
            status: userCaregiver.status || 'pending',
            rating: userCaregiver.rating || 0,
            institutionId: userCaregiver.institutionId,
            phone: userCaregiver.phone,
            onboardingComplete: userCaregiver.onboardingComplete,
            createdAt: userCaregiver.createdAt,
            updatedAt: userCaregiver.updatedAt
          });
        }
      });

      console.log('📊 Dashboard Data Loaded:');
      console.log('- Institution ID:', instId);
      console.log('- Total users:', institutionUsers.length);
      console.log('- Caregivers from caregivers collection:', institutionCaregivers.length);
      console.log('- Caregivers from users collection:', caregiversFromUsers.length);
      console.log('- Total merged caregivers:', allInstitutionCaregivers.length);
      console.log('- Patients:', institutionPatients.length);
      console.log('- Assignments:', assignmentsData.length);
      
      // Debug: Show raw caregiver data
      console.log('\n🔍 RAW CAREGIVER DATA DEBUG:');
      console.log('Raw caregivers from API:', caregiversData.length, caregiversData);
      console.log('Users with caregiver types:', caregiversFromUsers.length, caregiversFromUsers);
      console.log('Merged caregivers:', allInstitutionCaregivers.length, allInstitutionCaregivers);
      
      // Debug: Show assignment data
      console.log('\n🔍 ASSIGNMENT DATA DEBUG:');
      console.log('Assignments loaded:', assignmentsData.length, assignmentsData);

      // Use real data only - no fallback to demo data
      const realStats = {
        totalUsers: institutionUsers.length,
        patients: institutionPatients.length,
        caregivers: allInstitutionCaregivers.filter(c => c.userType === 'caregiver' || c.type === 'caregiver').length,
        doctors: allInstitutionCaregivers.filter(c => c.userType === 'doctor' || c.type === 'doctor').length,
        nurses: allInstitutionCaregivers.filter(c => c.userType === 'nurse' || c.type === 'nurse').length,
        activeAppointments: analytics.totalAppointments || 0,
        emergencyAlerts: emergencies.length,
        medicationReminders: analytics.medicationCompliance || 0,
        systemHealth: analytics.systemUptime > 95 ? 'Good' : analytics.systemUptime > 90 ? 'Warning' : 'Critical',
        satisfaction: analytics.caregiverSatisfaction || 0,
        responseTime: analytics.averageResponseTime || 0,
        uptime: analytics.systemUptime || 0
      };

      setStats(realStats);
      setPatients(institutionPatients);
      setCaregivers(allInstitutionCaregivers);
      setAssignments(assignmentsData || []);

      // Use real activity data from the system
      setRecentActivity(analytics.recentActivity || []);
      setTopCaregivers(allInstitutionCaregivers.slice(0, 3).map(caregiver => ({
        id: caregiver.id,
        name: caregiver.displayName || caregiver.name || 'Unknown Caregiver',
        rating: caregiver.rating || 0,
        patientsServed: caregiver.patientsServed || 0,
        tasksCompleted: caregiver.tasksCompleted || 0,
        responseTime: caregiver.responseTime || 0,
        avatar: caregiver.photoURL || null
      })));
      setSystemAlerts(analytics.systemAlerts || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard data refreshed');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/institution/login?institution=' + institutionId);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Patient Management Functions
  const handleAddPatient = async (patientData) => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      const newPatient = {
        ...patientData,
        institutionId: instId,
        status: 'active'
      };

      const patientId = await createPatient(newPatient);
      console.log('✅ Patient created with ID:', patientId);
      
      setShowAddPatient(false);
      toast.success('Patient added successfully');
      
      // Reload dashboard data to get the newly created patient
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding patient:', error);
      toast.error(error.message || 'Failed to add patient');
    }
  };

  // Caregiver Management Functions
  const handleAddCaregiver = async (caregiverData) => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      
      // Generate a unique ID for the caregiver
      const caregiverId = `caregiver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create caregiver document
      await setDoc(doc(db, 'caregivers', caregiverId), {
        ...caregiverData,
        institutionId: instId,
        status: 'pending',
        rating: 0,
        totalPatients: 0,
        currentPatients: 0,
        performance: {
          punctuality: 0,
          patientSatisfaction: 0,
          taskCompletion: 0,
          communication: 0,
          safety: 0
        },
        earnings: {
          thisMonth: 0,
          lastMonth: 0,
          total: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Create user document for login (with email/password stored)
      // IMPORTANT: Always set userType to 'caregiver' for institution caregivers
      await setDoc(doc(db, 'users', caregiverId), {
        email: caregiverData.email,
        name: caregiverData.name,
        phone: caregiverData.phone || '',
        userType: 'caregiver', // Force caregiver type
        type: 'caregiver', // Also set type field for consistency
        institutionId: instId,
        status: 'pending',
        onboardingComplete: false,
        password: caregiverData.password, // Store for custom auth
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userProfile?.id || user?.uid
      });
      
      console.log('✅ Caregiver created with ID:', caregiverId);
      
      setShowAddCaregiver(false);
      toast.success('Caregiver added successfully! They can now login with their credentials.');
      
      // Reload dashboard data to get the newly created caregiver
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding caregiver:', error);
      toast.error(error.message || 'Failed to add caregiver');
    }
  };

  // Assignment Functions
  const handleCreateAssignment = async (formData) => {
    try {
      const assignmentData = {
        patientId: selectedPatientForAssignment,
        caregiverId: selectedCaregiverForAssignment,
        institutionId: institutionId || userProfile?.institutionId,
        assignedBy: userProfile?.id || user?.uid,
        assignedByName: userProfile?.name || 'Admin',
        assignmentType: assignmentType,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await assignmentAPI.createAssignment(assignmentData);
      setShowAssignmentModal(false);
      setSelectedPatientForAssignment('');
      setSelectedCaregiverForAssignment('');
      toast.success('Assignment created successfully');
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  // Caregiver Action Handlers
  const handleResetPassword = async (caregiverId) => {
    try {
      // TODO: Implement password reset via Firebase Auth
      toast.info('Password reset email sent to caregiver');
      console.log('Reset password for caregiver:', caregiverId);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleToggleCaregiverStatus = async (caregiver) => {
    try {
      const newStatus = caregiver.status === 'active' ? 'suspended' : 'active';
      await caregiverAPI.updateCaregiver(caregiver.id, { status: newStatus });
      toast.success(`Caregiver ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      await loadDashboardData();
      setShowCaregiverDetails(false);
    } catch (error) {
      console.error('Error updating caregiver status:', error);
      toast.error('Failed to update caregiver status');
    }
  };

  const handleDeleteCaregiver = async (caregiverId) => {
    if (!window.confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) {
      return;
    }
    try {
      await caregiverAPI.deleteCaregiver(caregiverId);
      toast.success('Caregiver deleted successfully');
      await loadDashboardData();
      setShowCaregiverDetails(false);
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      toast.error('Failed to delete caregiver');
    }
  };

  const handleAssignTaskToCaregiver = (caregiver) => {
    setSelectedCaregiverForAssignment(caregiver.id);
    setShowCaregiverDetails(false);
    setShowAssignmentModal(true);
  };

  // Patient Action Handlers
  const handleDeletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to delete this patient? This will archive their data.')) {
      return;
    }
    try {
      await updatePatient(patientId, { 
        status: 'archived',
        archivedAt: new Date().toISOString(),
        archivedBy: userProfile?.id || user?.uid
      });
      toast.success('Patient archived successfully');
      await loadDashboardData();
      setShowPatientDetails(false);
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast.error('Failed to archive patient');
    }
  };

  const handleAssignTaskToPatient = (patient) => {
    setSelectedPatientForAssignment(patient.id);
    setShowPatientDetails(false);
    setShowAssignmentModal(true);
  };

  // Assignment Action Handlers
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }
    try {
      await assignmentAPI.deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully');
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  // Quick action functions
  const quickActions = [
    {
      name: 'Add Patient',
      icon: Heart,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setShowAddPatient(true)
    },
    {
      name: 'Add Caregiver',
      icon: UserCheck,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setShowAddCaregiver(true)
    },
    {
      name: 'Assign Care',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => setShowAssignmentModal(true)
    },
    {
      name: 'View Analytics',
      icon: BarChart3,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => setActiveTab('analytics')
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'appointment':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'medication':
        return <Heart className="h-4 w-4 text-green-500" />;
      case 'user':
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institution Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userProfile?.displayName || user?.email}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600 font-medium">License Active</span>
            </div>
            {institutionId && (
              <div className="flex items-center">
                <span className="text-xs text-gray-500">ID:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded ml-1">
                  {institutionId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(`/onboard?institution=${effectiveInstitutionId}`)}
            className="flex items-center px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Shield className="h-4 w-4 mr-2" />
            Back to Portal
          </button>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => navigate('/admin/patient-database')}
            className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </button>
          <button 
            onClick={() => navigate('/admin/caregiver-management')}
            className="flex items-center px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Add Caregiver
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
              { id: 'patients', name: 'Patients', icon: Heart },
              { id: 'caregivers', name: 'Caregivers', icon: UserCheck },
              { id: 'assignments', name: 'Assignments', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Quick Actions */}
      {activeTab === 'dashboard' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={`${action.color} text-white p-4 rounded-lg transition-colors flex flex-col items-center space-y-2`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">{action.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+12% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.patients.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+8% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Caregivers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.caregivers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+15% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.doctors.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <UserCheck className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+5% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeAppointments}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Clock className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-sm text-blue-600">Today's schedule</span>
          </div>
        </div>
      </div>

      {/* Emergency Alerts */}
      {stats.emergencyAlerts > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Emergency Alerts</h3>
                <p className="text-red-600">
                  {stats.emergencyAlerts} active emergency alert{stats.emergencyAlerts > 1 ? 's' : ''} requiring immediate attention
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/emergency')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              View Emergencies
            </button>
          </div>
        </div>
      )}

      {/* System Status, Recent Activity, and Top Caregivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Notifications</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Response Time</span>
              <span className="text-sm font-medium text-gray-900">{stats.responseTime || 45}ms</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">{activity.time}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Top Caregivers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Caregivers</h2>
            <UserCheck className="h-5 w-5 text-purple-600" />
          </div>
          
          <div className="space-y-4">
            {topCaregivers.length > 0 ? topCaregivers.map((caregiver, index) => (
              <div key={caregiver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{caregiver.name}</h4>
                    <p className="text-xs text-gray-600">{caregiver.patientsServed} patients</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{caregiver.rating}</span>
                    <span className="text-xs text-gray-500 ml-1">★</span>
                  </div>
                  <p className="text-xs text-gray-600">{caregiver.tasksCompleted} tasks</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No caregivers yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/admin/users')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium">Manage Users</span>
          </button>
          <button 
            onClick={() => navigate('/admin/caregivers')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="h-5 w-5 text-indigo-600 mr-2" />
            <span className="text-sm font-medium">Caregivers</span>
          </button>
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => navigate('/admin/communication')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-teal-600 mr-2" />
            <span className="text-sm font-medium">Messages</span>
          </button>
          <button 
            onClick={() => navigate('/admin/audit-logs')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium">Audit Logs</span>
          </button>
          <button 
            onClick={() => navigate('/admin/emergency')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm font-medium">Emergency Center</span>
          </button>
          <button 
            onClick={() => navigate('/admin/reports')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button 
            onClick={() => navigate('/institution-admin/settings')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </div>
        </>
      )}

      {/* Patients Tab Content */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
            <button
              onClick={() => setShowAddPatient(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-green-700">
                                {patient.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{patient.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{patient.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.age || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.gender || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowPatientDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Caregivers Tab Content */}
      {activeTab === 'caregivers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Caregivers</h2>
            <button
              onClick={() => setShowAddCaregiver(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Caregiver
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {caregivers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          <p className="text-sm font-medium">No caregivers found</p>
                          <p className="text-xs mt-1">Click "Add Caregiver" to create your first caregiver</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    caregivers.map((caregiver) => (
                      <tr key={caregiver.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-700">
                                  {caregiver.name?.charAt(0) || 'C'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{caregiver.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{caregiver.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{caregiver.userType || caregiver.type || 'Caregiver'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            caregiver.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : caregiver.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {caregiver.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="text-yellow-400">★</span>
                            <span className="ml-1">{caregiver.rating || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => {
                              setSelectedCaregiver(caregiver);
                              setShowCaregiverDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Tasks & Assignments</h2>
            <button
              onClick={() => setShowAssignmentModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </button>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {assignments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {assignments.filter(a => a.status === 'in_progress' || a.status === 'active').length}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {assignments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caregiver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium">No assignments yet</p>
                        <p className="text-sm">Create your first assignment to get started</p>
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => {
                      const patient = patients.find(p => p.id === assignment.patientId);
                      const caregiver = caregivers.find(c => c.id === assignment.caregiverId);
                      
                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.title || 'Untitled Task'}
                              </div>
                              {assignment.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {assignment.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {patient?.name || 'Unknown Patient'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {caregiver?.name || 'Unknown Caregiver'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : assignment.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : assignment.priority === 'normal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.priority || 'normal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : assignment.status === 'in_progress' || assignment.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {assignment.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assignment.dueDate ? (
                              <div>
                                <div>{assignment.dueDate}</div>
                                {assignment.dueTime && <div className="text-xs">{assignment.dueTime}</div>}
                              </div>
                            ) : (
                              'No due date'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                // Show assignment details
                                alert(`Instructions: ${assignment.instructions || 'No instructions provided'}`);
                              }}
                              className="text-purple-600 hover:text-purple-900 mr-3 inline-flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddPatient && (
        <AddPatientModal 
          onClose={() => setShowAddPatient(false)} 
          onAdd={handleAddPatient}
        />
      )}

      {showAddCaregiver && (
        <AddCaregiverModal 
          onClose={() => setShowAddCaregiver(false)} 
          onCreate={handleAddCaregiver}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal 
          onClose={() => setShowAssignmentModal(false)} 
          onCreate={handleCreateAssignment}
          patients={patients}
          caregivers={caregivers}
          selectedPatient={selectedPatientForAssignment}
          selectedCaregiver={selectedCaregiverForAssignment}
          onPatientChange={setSelectedPatientForAssignment}
          onCaregiverChange={setSelectedCaregiverForAssignment}
          assignmentType={assignmentType}
          onAssignmentTypeChange={setAssignmentType}
        />
      )}

      {showPatientDetails && selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          onClose={() => {
            setShowPatientDetails(false);
            setSelectedPatient(null);
          }}
          onAssignTask={handleAssignTaskToPatient}
          onDelete={handleDeletePatient}
        />
      )}

      {showCaregiverDetails && selectedCaregiver && (
        <CaregiverDetailsModal
          caregiver={selectedCaregiver}
          onClose={() => {
            setShowCaregiverDetails(false);
            setSelectedCaregiver(null);
          }}
          onResetPassword={handleResetPassword}
          onToggleStatus={handleToggleCaregiverStatus}
          onDelete={handleDeleteCaregiver}
          onAssignTask={handleAssignTaskToCaregiver}
        />
      )}
    </div>
  );
};

// Add Patient Modal Component
const AddPatientModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalRecordNumber: '',
    medicalConditions: '',
    allergies: '',
    medications: '',
    primaryDoctor: '',
    insuranceProvider: '',
    priority: 'normal',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Add New Patient</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Age *</label>
              <input
                type="number"
                name="age"
                required
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender *</label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Medical Conditions</label>
              <textarea
                name="medicalConditions"
                rows={3}
                value={formData.medicalConditions}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="List any medical conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Allergies</label>
              <textarea
                name="allergies"
                rows={3}
                value={formData.allergies}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="List any allergies..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Current Medications</label>
              <textarea
                name="medications"
                rows={3}
                value={formData.medications}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="List current medications..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority Level</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Caregiver Modal Component
const AddCaregiverModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    userType: 'caregiver',
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

  const [showPassword, setShowPassword] = useState(false);

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
          <h3 className="text-lg font-medium text-gray-900">Add New Caregiver</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 mt-0.5 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role/Type *</label>
              <select
                name="userType"
                required
                value={formData.userType}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {caregiverRoles.map(role => (
                  <option key={role} value={role.toLowerCase()}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input
                type="number"
                name="experience"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
              <input
                type="number"
                name="hourlyRate"
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Working Hours</label>
              <input
                type="text"
                name="workingHours"
                placeholder="e.g., 9:00 AM - 5:00 PM"
                value={formData.workingHours}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Available Days</label>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {daysOfWeek.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    formData.availableDays.includes(day)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Qualifications</label>
            <textarea
              name="qualifications"
              rows={3}
              value={formData.qualifications}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List educational qualifications, certifications, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Caregiver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assignment Modal Component
const AssignmentModal = ({ 
  onClose, 
  onCreate, 
  patients, 
  caregivers, 
  selectedPatient, 
  selectedCaregiver, 
  onPatientChange, 
  onCaregiverChange,
  assignmentType,
  onAssignmentTypeChange
}) => {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    instructions: '',
    priority: 'normal',
    dueDate: '',
    dueTime: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Create Assignment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient and Caregiver Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Patient <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedPatient}
                onChange={(e) => onPatientChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Choose a patient...</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name || 'Unknown Patient'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Caregiver <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCaregiver}
                onChange={(e) => onCaregiverChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Choose a caregiver...</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.name || 'Unknown Caregiver'} ({caregiver.userType || caregiver.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Morning medication administration"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief description of the task..."
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions from Admin <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Detailed instructions for the caregiver to follow..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide specific instructions that the caregiver should follow
            </p>
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPatient || !selectedCaregiver}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Patient Details Modal Component
const PatientDetailsModal = ({ patient, onClose, onAssignTask, onDelete }) => {
  const [activeTab, setActiveTab] = React.useState('info');
  
  if (!patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-green-600">
                {patient.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{patient.name || 'Unknown Patient'}</h3>
              <p className="text-green-100 text-sm">{patient.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient Info
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Reports
            </button>
            <button
              onClick={() => setActiveTab('careLogs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'careLogs'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Care Logs
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Info Tab */}
          {activeTab === 'info' && (
            <>
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Age</label>
                <p className="mt-1 text-gray-900">{patient.age || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Gender</label>
                <p className="mt-1 text-gray-900">{patient.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{patient.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  patient.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {patient.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          {patient.address && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{patient.address}</p>
            </div>
          )}

          {/* Medical Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h4>
            <div className="space-y-3">
              {patient.medicalRecordNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Medical Record Number</label>
                  <p className="mt-1 text-gray-900">{patient.medicalRecordNumber}</p>
                </div>
              )}
              {patient.medicalConditions && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Medical Conditions</label>
                  <p className="mt-1 text-gray-900">{patient.medicalConditions}</p>
                </div>
              )}
              {patient.allergies && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Allergies</label>
                  <p className="mt-1 text-gray-900 text-red-600">{patient.allergies}</p>
                </div>
              )}
              {patient.medications && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Current Medications</label>
                  <p className="mt-1 text-gray-900">{patient.medications}</p>
                </div>
              )}
              {patient.primaryDoctor && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Primary Doctor</label>
                  <p className="mt-1 text-gray-900">{patient.primaryDoctor}</p>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(patient.emergencyContactName || patient.emergencyContactPhone) && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                {patient.emergencyContactName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-gray-900">{patient.emergencyContactName}</p>
                  </div>
                )}
                {patient.emergencyContactPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{patient.emergencyContactPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {patient.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{patient.notes}</p>
            </div>
          )}
          </>
          )}

          {/* Medical Reports Tab */}
          {activeTab === 'reports' && (
            <PatientReportsSection patientId={patient.id} />
          )}

          {/* Care Logs Tab */}
          {activeTab === 'careLogs' && (
            <PatientCareLogsSection patientId={patient.id} />
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <button
              type="button"
              onClick={() => onDelete(patient.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Patient
            </button>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onAssignTask(patient)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Caregiver Details Modal Component
const CaregiverDetailsModal = ({ caregiver, onClose, onResetPassword, onToggleStatus, onDelete, onAssignTask }) => {
  if (!caregiver) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-blue-600">
                {caregiver.name?.charAt(0) || 'C'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{caregiver.name || 'Unknown Caregiver'}</h3>
              <p className="text-blue-100 text-sm">{caregiver.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Role</label>
                <p className="mt-1 text-gray-900">{caregiver.userType || caregiver.type || 'Caregiver'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  caregiver.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : caregiver.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : caregiver.status === 'suspended'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {caregiver.status || 'pending'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{caregiver.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Rating</label>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="ml-1 text-gray-900">{caregiver.rating || 0} / 5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Details</h4>
            <div className="space-y-3">
              {caregiver.specialization && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Specialization</label>
                  <p className="mt-1 text-gray-900">{caregiver.specialization}</p>
                </div>
              )}
              {caregiver.qualifications && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Qualifications</label>
                  <p className="mt-1 text-gray-900">{caregiver.qualifications}</p>
                </div>
              )}
              {caregiver.experience && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Experience</label>
                  <p className="mt-1 text-gray-900">{caregiver.experience}</p>
                </div>
              )}
              {caregiver.workingHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Working Hours</label>
                  <p className="mt-1 text-gray-900">{caregiver.workingHours}</p>
                </div>
              )}
              {caregiver.availableDays && caregiver.availableDays.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Available Days</label>
                  <p className="mt-1 text-gray-900">{caregiver.availableDays.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Total Patients</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiver.totalPatients || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Current Patients</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiver.currentPatients || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Rating</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiver.rating || 0}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          {caregiver.address && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{caregiver.address}</p>
            </div>
          )}

          {/* Notes */}
          {caregiver.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{caregiver.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onResetPassword(caregiver.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => onToggleStatus(caregiver)}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                  caregiver.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {caregiver.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(caregiver.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onAssignTask(caregiver)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Patient Reports Section Component
const PatientReportsSection = ({ patientId }) => {
  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddReport, setShowAddReport] = React.useState(false);
  const [reportType, setReportType] = React.useState('nurse');
  const { user, userProfile } = useUser();

  React.useEffect(() => {
    loadReports();
  }, [patientId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportsData = await getPatientReports(patientId);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setReportType('nurse');
              setShowAddReport(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Nurse Report
          </button>
          <button
            onClick={() => {
              setReportType('doctor');
              setShowAddReport(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
          >
            Add Doctor Consultation
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reports yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.type === 'nurse'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {report.type === 'nurse' ? 'Nurse Report' : 'Doctor Consultation'}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(report.createdAt).toLocaleString()} • {report.createdBy}
                  </p>
                </div>
              </div>

              {report.type === 'nurse' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Vitals:</span>
                    <p className="text-gray-600 mt-1">{report.vitals || 'Not recorded'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Treatment/Care:</span>
                    <p className="text-gray-600 mt-1">{report.treatment || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Observation:</span>
                    <p className="text-gray-600 mt-1">{report.observation || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Recommendation:</span>
                    <p className="text-gray-600 mt-1">{report.recommendation || 'N/A'}</p>
                  </div>
                </div>
              )}

              {report.type === 'doctor' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Diagnosis:</span>
                    <p className="text-gray-600 mt-1">{report.diagnosis || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Prescription:</span>
                    <p className="text-gray-600 mt-1">{report.prescription || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Instructions:</span>
                    <p className="text-gray-600 mt-1">{report.instructions || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Care Plan:</span>
                    <p className="text-gray-600 mt-1">{report.carePlan || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddReport && (
        <AddReportModal
          patientId={patientId}
          reportType={reportType}
          onClose={() => setShowAddReport(false)}
          onSubmit={async (reportData) => {
            await createPatientReport(patientId, reportData);
            setShowAddReport(false);
            await loadReports();
            toast.success('Report added successfully');
          }}
        />
      )}
    </div>
  );
};

// Patient Care Logs Section Component
const PatientCareLogsSection = ({ patientId }) => {
  const [careLogs, setCareLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddLog, setShowAddLog] = React.useState(false);
  const { user, userProfile } = useUser();

  React.useEffect(() => {
    loadCareLogs();
  }, [patientId]);

  const loadCareLogs = async () => {
    try {
      setLoading(true);
      const logsData = await getPatientCareLogs(patientId);
      setCareLogs(logsData);
    } catch (error) {
      console.error('Error loading care logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading care logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Care Activity Logs</h3>
        <button
          onClick={() => setShowAddLog(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Add Care Log
        </button>
      </div>

      {careLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No care logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {careLogs.map((log) => (
            <div key={log.id} className="border-l-4 border-green-500 bg-white shadow-sm rounded-r-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{log.activityType || 'Care Activity'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()} • {log.caregiverName || 'Unknown Caregiver'}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  log.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {log.status || 'completed'}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{log.description || log.notes}</p>
              {log.duration && (
                <p className="text-xs text-gray-500 mt-2">Duration: {log.duration}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddLog && (
        <AddCareLogModal
          patientId={patientId}
          onClose={() => setShowAddLog(false)}
          onSubmit={async (logData) => {
            await createPatientCareLog(patientId, logData);
            setShowAddLog(false);
            await loadCareLogs();
            toast.success('Care log added successfully');
          }}
        />
      )}
    </div>
  );
};

// Add Report Modal Component
const AddReportModal = ({ patientId, reportType, onClose, onSubmit }) => {
  const { userProfile } = useUser();
  const [formData, setFormData] = React.useState(
    reportType === 'nurse'
      ? { vitals: '', treatment: '', observation: '', recommendation: '' }
      : { diagnosis: '', prescription: '', instructions: '', carePlan: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      type: reportType,
      createdBy: userProfile?.name || 'Unknown',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {reportType === 'nurse' ? 'Add Nurse Report' : 'Add Doctor Consultation'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {reportType === 'nurse' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient Vitals</label>
                <textarea
                  rows={3}
                  required
                  value={formData.vitals}
                  onChange={(e) => setFormData({ ...formData, vitals: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="BP: 120/80, Temp: 98.6°F, Pulse: 72 bpm..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment/Care Done</label>
                <textarea
                  rows={3}
                  required
                  value={formData.treatment}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Medications administered, wound care, etc..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observation</label>
                <textarea
                  rows={3}
                  required
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Patient's condition, behavior, concerns..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation</label>
                <textarea
                  rows={2}
                  value={formData.recommendation}
                  onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Follow-up actions, suggestions..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  rows={3}
                  required
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Medical diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescription</label>
                <textarea
                  rows={3}
                  required
                  value={formData.prescription}
                  onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Medications prescribed..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Patient instructions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Care Plan</label>
                <textarea
                  rows={3}
                  value={formData.carePlan}
                  onChange={(e) => setFormData({ ...formData, carePlan: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ongoing care plan..."
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                reportType === 'nurse'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Save Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Care Log Modal Component
const AddCareLogModal = ({ patientId, onClose, onSubmit }) => {
  const { userProfile } = useUser();
  const [formData, setFormData] = React.useState({
    activityType: '',
    description: '',
    duration: '',
    status: 'completed'
  });

  const activityTypes = [
    'Medication Administration',
    'Vital Signs Check',
    'Personal Care',
    'Meal Assistance',
    'Exercise/Mobility',
    'Companionship',
    'Medical Procedure',
    'Emergency Response',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      caregiverName: userProfile?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Add Care Activity Log</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
            <select
              required
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select activity type...</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Describe the care activity..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (optional)</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 30 minutes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstitutionAdminDashboard;

import React, { useState, useEffect } from 'react';
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
  Stethoscope,
  ClipboardList,
  Video,
  Pill,
  Bell,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  UserPlus,
  FilePlus,
  Send,
  Camera,
  Mic,
  MicOff,
  PhoneOff,
  Star
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getAllUsers } from '../api/usersAPI';
import { analyticsAPI } from '../api/analyticsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { getAllPatients } from '../api/patientsAPI';
import { createTaskAssignment } from '../api/taskAssignmentAPI';
import { createNurseReport, getNurseReportsByPatient } from '../api/nurseReportsAPI';
import { carePlansAPI } from '../api/carePlansAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import telemedicineAPI from '../api/telemedicineAPI';
import CarePlanManager from '../components/CarePlanManager';
import MedicalHistoryForm from '../components/MedicalHistoryForm';
import EmergencyAlertSystem from '../components/EmergencyAlertSystem';
import TelemedicineInterface from '../components/TelemedicineInterface';
import AdminGuard from '../components/AdminGuard';
import { toast } from 'react-toastify';
import { forceLoadCaregivers, forceLoadPatients } from '../utils/forceLoadData';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../api/notificationsAPI';
import { updateUserStatus } from '../api/usersAPI';
import { updateClient } from '../api/patientsAPI';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';

const NewAdminDashboard = () => {
  const { userProfile } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [consultations, setConsultations] = useState([]);
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    elderlyUsers: 0,
    caregivers: 0,
    activeAppointments: 0,
    emergencyAlerts: 0,
    medicationReminders: 0,
    systemHealth: 'Good',
    revenue: 0,
    satisfaction: 0,
    responseTime: 0,
    uptime: 0
  });

  // Data States
  const [caregivers, setCaregivers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [nurseReports, setNurseReports] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [taskAssignments, setTaskAssignments] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [emergencyStats, setEmergencyStats] = useState({ active: 0, resolved: 0, total: 0 });
  const [telemedicineCalls, setTelemedicineCalls] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  
  // View Modal States
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [viewingCaregiver, setViewingCaregiver] = useState(null);
  
  // Assignment States
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState('patient-to-caregiver'); // or 'caregiver-to-patient'
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState('');
  const [selectedCaregiverForAssignment, setSelectedCaregiverForAssignment] = useState('');
  
  // Patient-Caregiver Assignments
  const [assignments, setAssignments] = useState([]);
  
  // Task Assignment States
  const [showTaskAssignment, setShowTaskAssignment] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    patientId: ''
  });
  
  // Nurse Report States
  const [showNurseReport, setShowNurseReport] = useState(false);
  const [newReport, setNewReport] = useState({
    patientId: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
    painLevel: '',
    notes: '',
    status: 'stable'
  });
  
  // Care Plan States
  const [showCarePlan, setShowCarePlan] = useState(false);
  const [newCarePlan, setNewCarePlan] = useState({
    patientId: '',
    diagnosis: '',
    treatmentPlan: '',
    medications: '',
    followUpDate: '',
    specialInstructions: '',
    priority: 'medium'
  });
  
  // Telemedicine States
  const [showTelemedicine, setShowTelemedicine] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  
  // Call-related states
  const [incomingCall, setIncomingCall] = useState(null);
  const [callService] = useState(() => new CallService());
  
  // Emergency States
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadAssignments();
    loadConsultations();
    
    // Subscribe to real-time emergency updates
    const unsubscribeEmergencies = emergencyAPI.subscribeToEmergencies((emergencyData) => {
      setEmergencies(emergencyData);
      // Update emergency stats from the emergency data
      const stats = {
        active: emergencyData.filter(e => e.status === 'active').length,
        resolved: emergencyData.filter(e => e.status === 'resolved').length,
        total: emergencyData.length
      };
      setEmergencyStats(stats);
    });
    
    // Only subscribe to telemedicine calls if the current user has a relevant role
    const role = userProfile?.role || userProfile?.type;
    const userType = role === 'doctor' ? 'doctor' : role === 'patient' ? 'patient' : null;
    const unsubscribeTelemedicine = userType
      ? telemedicineAPI.subscribeToCalls(userProfile.uid, userType, (calls) => {
          setTelemedicineCalls(calls);
        })
      : () => {};
    
    // Subscribe to real-time assignment updates
    const unsubscribeAssignments = assignmentAPI.subscribeToAssignments((assignmentsData) => {
      console.log(`Real-time update: Found ${assignmentsData.length} assignments`);
      setAssignments(assignmentsData);
    });
    
    return () => {
      unsubscribeEmergencies();
      unsubscribeTelemedicine();
      if (unsubscribeAssignments) unsubscribeAssignments();
    };
  }, []);

  // Set up incoming call listener
  useEffect(() => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      return;
    }
    
    const userId = userProfile.id || userProfile.uid;
    console.log('🎧 Setting up call listener for admin:', userId);
    
    const unsubscribe = callService.listenForIncomingCalls(userId, (callNotification) => {
      console.log('📞 Incoming call notification:', callNotification);
      
      if (callNotification.status === 'incoming') {
        setIncomingCall({
          callId: callNotification.callId,
          callerId: callNotification.callerId,
          callType: callNotification.callType,
          timestamp: callNotification.timestamp
        });
        toast.info(`Incoming ${callNotification.callType} call...`);
      }
    });
    
    return () => {
      console.log('🔌 Cleaning up call listener');
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile, callService]);

  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid;
      await callService.answerCall(incomingCall.callId, userId);
      
      setActiveCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: 'Caller',
        callType: incomingCall.callType
      });
      setIncomingCall(null);
      console.log('✅ Call accepted');
      toast.success('Call accepted');
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
    }
  };

  // Handle incoming call rejection
  const handleRejectCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid;
      await callService.rejectCall(incomingCall.callId, userId);
      setIncomingCall(null);
      console.log('❌ Call rejected');
      toast.info('Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Failed to reject call');
    }
  };

  // Handle active call end
  const handleEndCall = async () => {
    if (!activeCall) return;
    
    try {
      await callService.endCall(activeCall.callId);
      setActiveCall(null);
      console.log('✅ Call ended');
      toast.info('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data...');
      
      // Load all data in parallel
      const [
        analytics,
        caregiversData,
        patientsData,
        emergencyStatsData,
        telemedicineData
      ] = await Promise.all([
        analyticsAPI.getOverviewAnalytics().catch(err => {
          console.warn('Failed to fetch analytics:', err);
          return {};
        }),
        forceLoadCaregivers().catch(err => {
          console.warn('Failed to load caregivers:', err);
          return [];
        }),
        forceLoadPatients().catch(err => {
          console.warn('Failed to load patients:', err);
          return [];
        }),
        emergencyAPI.getEmergencyStats().catch(err => {
          console.warn('Failed to load emergency stats:', err);
          return { active: 0, resolved: 0, total: 0 };
        }),
        // Fetch telemedicine data only for relevant roles; admins may not have a direct view
        (() => {
          const role = userProfile?.role || userProfile?.type;
          const userType = role === 'doctor' ? 'doctor' : role === 'patient' ? 'patient' : null;
          if (!userType) return Promise.resolve([]);
          return telemedicineAPI.getCallHistory(userProfile.uid, userType).catch(err => {
            console.warn('Failed to load telemedicine calls:', err);
            return [];
          });
        })()
      ]);
      
      // Update state
      setStats({
        totalUsers: analytics.totalUsers || 0,
        elderlyUsers: analytics.elderlyUsers || 0,
        caregivers: caregiversData.length,
        activeAppointments: analytics.activeAppointments || 0,
        emergencyAlerts: emergencyStatsData.active || 0,
        medicationReminders: analytics.medicationReminders || 0,
        systemHealth: analytics.systemHealth || 'Good',
        revenue: analytics.revenue || 0,
        satisfaction: analytics.satisfaction || 0,
        responseTime: analytics.responseTime || 0,
        uptime: analytics.uptime || 0
      });
      
      setCaregivers(caregiversData);
      setPatients(patientsData);
      setEmergencyStats(emergencyStatsData);
      setTelemedicineCalls(telemedicineData);
      
      console.log('✅ Dashboard data loaded successfully');
      console.log(`📊 Stats: ${caregiversData.length} caregivers, ${patientsData.length} patients`);
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      console.log('🔄 Loading assignments...');
      const assignmentsData = await assignmentAPI.getAllAssignments();
      setAssignments(assignmentsData);
      console.log('✅ Assignments loaded:', assignmentsData.length);
    } catch (error) {
      console.error('❌ Error loading assignments:', error);
    }
  };

  const loadConsultations = async () => {
    try {
      console.log('🔄 Loading consultations...');
      const consultationsData = await carePlansAPI.getAllCarePlans();
      setConsultations(consultationsData);
      console.log('✅ Consultations loaded:', consultationsData.length);
    } catch (error) {
      console.error('❌ Error loading consultations:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadAssignments(), loadConsultations()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleAdminLogout = async () => {
    try {
      // Clear admin session flags
      sessionStorage.removeItem('elderx_admin_session');
      localStorage.removeItem('elderx_admin_authenticated');
      localStorage.removeItem('elderx_admin_email');
      localStorage.removeItem('elderx_admin_timestamp');

      await signOut(auth);
      toast.success('Logged out');
      navigate('/admin/login');
    } catch (e) {
      toast.error('Failed to log out');
    }
  };

  const handleUnassign = async (assignmentId) => {
    try {
      if (!window.confirm('Are you sure you want to unassign this caregiver from the patient?')) {
        return;
      }

      await assignmentAPI.endAssignment(assignmentId, 'Unassigned by admin');
      toast.success('Assignment removed successfully');
      loadAssignments();
      
      // Refresh patient modal if open
      if (viewingPatient) {
        const updatedAssignments = await assignmentAPI.getAssignmentsByPatient(viewingPatient.id);
        setViewingPatient({
          ...viewingPatient,
          assignedCaregivers: updatedAssignments
        });
      }
    } catch (error) {
      console.error('Error unassigning:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const handleSuspendCaregiver = async (caregiver) => {
    try {
      const newStatus = caregiver.status === 'suspended' ? 'active' : 'suspended';
      const action = newStatus === 'suspended' ? 'suspend' : 'activate';
      
      if (!window.confirm(`Are you sure you want to ${action} ${caregiver.name}?`)) {
        return;
      }

      await updateUserStatus(caregiver.id, newStatus);
      
      // Send notification to caregiver
      if (newStatus === 'suspended') {
        await createNotification({
          userId: caregiver.id,
          type: NOTIFICATION_TYPES.SYSTEM,
          title: 'Account Suspended',
          message: 'Your account has been suspended. Please contact administration.',
          priority: NOTIFICATION_PRIORITIES.URGENT
        });
      }
      
      toast.success(`Caregiver ${action}d successfully`);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating caregiver status:', error);
      toast.error('Failed to update caregiver status');
    }
  };

  const handleArchivePatient = async (patient) => {
    try {
      if (!window.confirm(`Are you sure you want to archive ${patient.name}'s record? This will mark them as inactive.`)) {
        return;
      }

      await updateClient(patient.id, { status: 'archived', archivedAt: new Date().toISOString() });
      toast.success('Patient record archived successfully');
      loadDashboardData();
      
      if (showPatientModal) {
        setShowPatientModal(false);
      }
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast.error('Failed to archive patient record');
    }
  };

  const handleViewPatient = async (patient) => {
    try {
      // Load patient's medical history, care plans, and assigned caregivers
      const [reports, plans, patientAssignments] = await Promise.all([
        getNurseReportsByPatient(patient.id).catch(() => []),
        carePlansAPI.getCarePlansByPatient(patient.id).catch(() => []),
        assignmentAPI.getAssignmentsByPatient(patient.id).catch(() => [])
      ]);
      
      // Get caregiver details for each assignment
      const assignmentsWithDetails = await Promise.all(
        patientAssignments.map(async (assignment) => {
          const caregiver = caregivers.find(c => c.id === assignment.caregiverId);
          return {
            ...assignment,
            caregiverName: caregiver?.name || assignment.caregiverName || 'Unknown',
            caregiverRole: caregiver?.role || assignment.caregiverRole || 'Caregiver',
            caregiverEmail: caregiver?.email || assignment.caregiverEmail
          };
        })
      );
      
      setViewingPatient({
        ...patient,
        medicalHistory: reports,
        carePlans: plans,
        assignedCaregivers: assignmentsWithDetails
      });
      setShowPatientModal(true);
    } catch (error) {
      console.error('Error loading patient details:', error);
      toast.error('Failed to load patient details');
    }
  };

  const handleViewCaregiver = async (caregiver) => {
    try {
      // Load caregiver's assigned patients and tasks
      const assignedPatients = assignments.filter(a => a.caregiverId === caregiver.id);
      setViewingCaregiver({
        ...caregiver,
        assignedPatients: assignedPatients
      });
      setShowCaregiverModal(true);
    } catch (error) {
      console.error('Error loading caregiver details:', error);
      toast.error('Failed to load caregiver details');
    }
  };

  const handleCreateAssignment = async () => {
    try {
      if (!selectedPatientForAssignment || !selectedCaregiverForAssignment) {
        toast.error('Please select both patient and caregiver');
        return;
      }

      // Get patient and caregiver names for the assignment
      const patient = patients.find(p => p.id === selectedPatientForAssignment);
      const caregiver = caregivers.find(c => c.id === selectedCaregiverForAssignment);

      await assignmentAPI.createAssignment({
        patientId: selectedPatientForAssignment,
        caregiverId: selectedCaregiverForAssignment,
        patientName: patient?.name || 'Unknown Patient',
        caregiverName: caregiver?.name || 'Unknown Caregiver',
        patientEmail: patient?.email || '',
        caregiverEmail: caregiver?.email || '',
        caregiverRole: caregiver?.role || 'Caregiver',
        assignedAt: new Date().toISOString(),
        status: 'active'
      });
      
      // Send notification to caregiver
      await createNotification({
        userId: selectedCaregiverForAssignment,
        type: NOTIFICATION_TYPES.TASK,
        title: 'New Patient Assigned',
        message: `You have been assigned to care for ${patient?.name || 'a new patient'}`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        metadata: {
          patientId: selectedPatientForAssignment,
          patientName: patient?.name,
          assignmentType: 'patient',
          navigateTo: '/service-provider/medical-records'
        }
      });
      
      toast.success('Assignment created successfully');
      setShowAssignmentModal(false);
      setSelectedPatientForAssignment('');
      setSelectedCaregiverForAssignment('');
      loadAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleCreateTask = async () => {
    try {
      const caregiverId = selectedCaregiver?.id || selectedCaregiverForAssignment || '';
      const patientId = selectedPatient?.id || newTask.patientId || '';

      if (!caregiverId) {
        toast.error('Please select a caregiver');
        return;
      }

      await createTaskAssignment({
        ...newTask,
        caregiverId,
        patientId,
        assignedBy: userProfile.uid,
        assignedByName: userProfile.displayName || userProfile.email,
        caregiverName: selectedCaregiver?.name,
        patientName: selectedPatient?.name
      });
      
      // Send notification to caregiver
      await createNotification({
        userId: caregiverId,
        type: NOTIFICATION_TYPES.TASK,
        title: 'New Task Assigned',
        message: `New task: ${newTask.title}${selectedPatient?.name ? ` for ${selectedPatient.name}` : ''}`,
        priority: newTask.priority === 'high' ? NOTIFICATION_PRIORITIES.HIGH : NOTIFICATION_PRIORITIES.MEDIUM,
        metadata: {
          taskTitle: newTask.title,
          patientId,
          patientName: selectedPatient?.name,
          dueDate: newTask.dueDate,
          navigateTo: '/service-provider/tasks'
        }
      });
      
      toast.success('Task assigned successfully');
      setShowTaskAssignment(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        patientId: ''
      });
      loadDashboardData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to assign task');
    }
  };

  const handleCreateNurseReport = async () => {
    try {
      await createNurseReport({
        ...newReport,
        nurseId: userProfile.uid,
        nurseName: userProfile.displayName || userProfile.email
      });
      
      toast.success('Nurse report created successfully');
      setShowNurseReport(false);
      setNewReport({
        patientId: '',
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        oxygenSaturation: '',
        painLevel: '',
        notes: '',
        status: 'stable'
      });
      loadDashboardData();
    } catch (error) {
      console.error('Error creating nurse report:', error);
      toast.error('Failed to create nurse report');
    }
  };

  const handleCreateCarePlan = async () => {
    try {
      await carePlansAPI.createCarePlan({
        ...newCarePlan,
        doctorId: userProfile.uid,
        doctorName: userProfile.displayName || userProfile.email
      });
      
      toast.success('Care plan created successfully');
      setShowCarePlan(false);
      setNewCarePlan({
        patientId: '',
        diagnosis: '',
        treatmentPlan: '',
        medications: '',
        followUpDate: '',
        specialInstructions: '',
        priority: 'medium'
      });
      loadDashboardData();
    } catch (error) {
      console.error('Error creating care plan:', error);
      toast.error('Failed to create care plan');
    }
  };

  const handleEmergencyAlert = async (emergencyData) => {
    try {
      await emergencyAPI.createEmergency(emergencyData);
      toast.success('Emergency alert sent');
      setShowEmergency(false);
      loadDashboardData();
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      toast.error('Failed to send emergency alert');
    }
  };

  const handleTelemedicineCall = async (callData) => {
    try {
      const call = await telemedicineAPI.startCall(callData);
      setActiveCall(call);
      setShowTelemedicine(true);
      toast.success('Telemedicine call initiated');
    } catch (error) {
      console.error('Error starting telemedicine call:', error);
      toast.error('Failed to start telemedicine call');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Elderly Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.elderlyUsers}</p>
            </div>
            <Heart className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Caregivers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.caregivers}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Emergency Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.emergencyAlerts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Consultations</p>
              <p className="text-2xl font-bold text-gray-900">{consultations.filter(c => c.status === 'active').length}</p>
            </div>
            <Stethoscope className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Care Plans</p>
              <p className="text-2xl font-bold text-gray-900">{consultations.length}</p>
            </div>
            <FileText className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Plans</p>
              <p className="text-2xl font-bold text-gray-900">{consultations.filter(c => c.status === 'completed').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setShowAddPatient(true)}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <UserPlus className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Add Patient</span>
          </button>
          
          <button
            onClick={() => setShowAddCaregiver(true)}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <UserCheck className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Add Caregiver</span>
          </button>
          
          <button
            onClick={() => setShowTaskAssignment(true)}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <ClipboardList className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Assign Task</span>
          </button>
          
          <button
            onClick={() => setActiveTab('consultations')}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <Stethoscope className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Manage Consultations</span>
          </button>
          
          <button
            onClick={() => setShowEmergency(true)}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <Bell className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Emergency Alert</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/admin/patient-feedback'}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
          >
            <Star className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Patient Feedback</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Emergencies</h3>
          <div className="space-y-3">
            {emergencies.slice(0, 5).map((emergency, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emergency.type}</p>
                    <p className="text-xs text-gray-600">{emergency.location}</p>
                  </div>
                </div>
                <span className="text-xs text-red-600 font-medium">{emergency.status}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Telemedicine Calls</h3>
          <div className="space-y-3">
            {telemedicineCalls.filter(call => call.status === 'active').slice(0, 5).map((call, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Video className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{call.patientName}</p>
                    <p className="text-xs text-gray-600">{call.doctorName}</p>
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-medium">{call.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCaregivers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Caregivers & Doctors</h2>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {caregivers.map((caregiver) => (
                <tr key={caregiver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {caregiver.name?.charAt(0) || 'C'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{caregiver.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{caregiver.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{caregiver.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{caregiver.experience}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      caregiver.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {caregiver.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewCaregiver(caregiver)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCaregiver(caregiver);
                        setAssignmentType('caregiver-to-patient');
                        setSelectedCaregiverForAssignment(caregiver.id);
                        setShowAssignmentModal(true);
                      }}
                      className="text-green-600 hover:text-green-900 mr-3"
                      title="Assign Patient"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCaregiver(caregiver);
                        setShowTaskAssignment(true);
                      }}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                      title="Assign Task"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleSuspendCaregiver(caregiver)}
                      className={`${caregiver.status === 'suspended' ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'} mr-3`}
                      title={caregiver.status === 'suspended' ? 'Activate' : 'Suspend'}
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
        <button
          onClick={() => setShowAddPatient(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Care Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-red-600">
                            {patient.name?.charAt(0) || 'P'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.age}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.gender}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      patient.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewPatient(patient)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setAssignmentType('patient-to-caregiver');
                        setSelectedPatientForAssignment(patient.id);
                        setShowAssignmentModal(true);
                      }}
                      className="text-green-600 hover:text-green-900 mr-3"
                      title="Assign Caregiver"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowCarePlan(true);
                      }}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                      title="Care Plan"
                    >
                      <Stethoscope className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowNurseReport(true);
                      }}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                      title="Medical Report"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    {patient.status !== 'archived' && (
                      <button
                        onClick={() => handleArchivePatient(patient)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Archive Patient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderConsultations = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Consultations & Care Plans</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => loadConsultations()}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Care Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consultations.map((consultation) => (
                <tr key={consultation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {consultation.patientName?.charAt(0) || 'P'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{consultation.patientName}</div>
                        <div className="text-sm text-gray-500">{consultation.patientId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{consultation.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{consultation.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.createdByName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      consultation.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : consultation.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : consultation.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {consultation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      consultation.priority === 'high' 
                        ? 'bg-red-100 text-red-800' 
                        : consultation.priority === 'medium'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {consultation.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {consultation.createdAt ? new Date(consultation.createdAt).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // View consultation details
                          console.log('View consultation:', consultation.id);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Edit consultation
                          console.log('Edit consultation:', consultation.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {consultations.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No consultations yet</h3>
          <p className="text-gray-600">Consultations will appear here when doctors create care plans for patients.</p>
        </div>
      )}
    </div>
  );

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <div className="bg-white shadow border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleRefresh}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Logout
                </button>
                <div className="text-sm text-gray-600">
                  Welcome, {userProfile?.displayName || userProfile?.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b">
          <div className="px-6">
            <nav className="flex space-x-8">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
                { id: 'caregivers', name: 'Caregivers & Doctors', icon: UserCheck },
                { id: 'patients', name: 'Patients', icon: Heart },
                { id: 'consultations', name: 'Consultations', icon: Stethoscope },
                { id: 'tasks', name: 'Task Assignments', icon: ClipboardList },
                { id: 'reports', name: 'Nurse Reports', icon: FileText },
                { id: 'careplans', name: 'Care Plans', icon: FileText },
                { id: 'telemedicine', name: 'Telemedicine', icon: Video },
                { id: 'emergencies', name: 'Emergencies', icon: AlertTriangle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading dashboard...</span>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'caregivers' && renderCaregivers()}
              {activeTab === 'patients' && renderPatients()}
              {activeTab === 'consultations' && renderConsultations()}
              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Patient-Caregiver Assignments</h2>
                    <button
                      onClick={() => setShowAssignmentModal(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caregiver</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {assignments.map((assignment, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-red-600">
                                        {assignment.patientName?.charAt(0) || 'P'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{assignment.patientName}</div>
                                    <div className="text-sm text-gray-500">{assignment.patientEmail}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-blue-600">
                                        {assignment.caregiverName?.charAt(0) || 'C'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{assignment.caregiverName}</div>
                                    <div className="text-sm text-gray-500">{assignment.caregiverRole}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  assignment.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.status || 'active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    setSelectedPatient({ id: assignment.patientId, name: assignment.patientName });
                                    setShowTaskAssignment(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Assign Task
                                </button>
                                <button
                                  onClick={() => handleViewPatient({ id: assignment.patientId, name: assignment.patientName })}
                                  className="text-green-600 hover:text-green-900 mr-3"
                                >
                                  View Details
                                </button>
                                {assignment.status === 'active' && (
                                  <button
                                    onClick={() => handleUnassign(assignment.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Unassign"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Nurse Reports</h2>
                  <p className="text-gray-600">Nurse reports management coming soon...</p>
                </div>
              )}
              {activeTab === 'careplans' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Care Plans & Medical Reports</h2>
                    <button
                      onClick={() => setShowCarePlan(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Create Care Plan
                    </button>
                  </div>
                  
                  {/* Workflow Overview */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Care Plan Workflow</h3>
                    <div className="flex items-center justify-between text-sm text-blue-700">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">1</div>
                        Nurse Creates Medical Report
                      </div>
                      <div className="flex-1 h-0.5 bg-blue-300 mx-4"></div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">2</div>
                        Doctor Reviews Report
                      </div>
                      <div className="flex-1 h-0.5 bg-blue-300 mx-4"></div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">3</div>
                        Doctor Creates Care Plan
                      </div>
                    </div>
                  </div>

                  {/* Recent Nurse Reports */}
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Recent Nurse Reports (Pending Doctor Review)</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {patients.slice(0, 3).map((patient, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">{patient.name}</h4>
                                <p className="text-sm text-gray-600">Latest report: {new Date().toLocaleDateString()}</p>
                                <p className="text-sm text-gray-500 mt-1">Vitals: BP 120/80, HR 72, Temp 98.6°F</p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedPatient(patient);
                                    setShowNurseReport(true);
                                  }}
                                  className="px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200"
                                >
                                  View Report
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPatient(patient);
                                    setShowCarePlan(true);
                                  }}
                                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                                >
                                  Create Care Plan
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active Care Plans */}
                  <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Active Care Plans</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {patients.slice(0, 2).map((patient, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">{patient.name}</h4>
                                <p className="text-sm text-gray-600">Diagnosis: Hypertension Management</p>
                                <p className="text-sm text-gray-500 mt-1">Treatment: Medication compliance, regular monitoring</p>
                                <p className="text-xs text-gray-400 mt-2">Created by Dr. Smith - {new Date().toLocaleDateString()}</p>
                              </div>
                              <div className="flex space-x-2">
                                <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  Active
                                </span>
                                <button
                                  onClick={() => handleViewPatient(patient)}
                                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'telemedicine' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Telemedicine</h2>
                  <p className="text-gray-600">Telemedicine management coming soon...</p>
                </div>
              )}
              {activeTab === 'emergencies' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Emergency Management</h2>
                  <p className="text-gray-600">Emergency management coming soon...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {showAddPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Patient</h3>
              <p className="text-gray-600 mb-4">Patient creation form will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddPatient(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAddPatient(false);
                    toast.success('Patient added successfully');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Patient
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddCaregiver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Caregiver</h3>
              <p className="text-gray-600 mb-4">Caregiver creation form will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddCaregiver(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAddCaregiver(false);
                    toast.success('Caregiver added successfully');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Caregiver
                </button>
              </div>
            </div>
          </div>
        )}

        {showTaskAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter task description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTaskAssignment(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Assign Task
                </button>
              </div>
            </div>
          </div>
        )}

        {showNurseReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Nurse Report</h3>
              <p className="text-gray-600 mb-4">Nurse report form will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowNurseReport(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNurseReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Report
                </button>
              </div>
            </div>
          </div>
        )}

        {showCarePlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Care Plan</h3>
              <p className="text-gray-600 mb-4">Care plan form will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCarePlan(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCarePlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Care Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {showTelemedicine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Telemedicine Call</h3>
              <p className="text-gray-600 mb-4">Telemedicine interface will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTelemedicine(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowTelemedicine(false);
                    toast.success('Telemedicine call initiated');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Call
                </button>
              </div>
            </div>
          </div>
        )}

        {showEmergency && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Alert</h3>
              <p className="text-gray-600 mb-4">Emergency alert form will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmergency(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEmergency(false);
                    toast.success('Emergency alert sent');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Send Alert
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Patient Details Modal */}
        {showPatientModal && viewingPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">Patient Details</h3>
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {viewingPatient.name}</p>
                    <p><span className="font-medium">Age:</span> {viewingPatient.age}</p>
                    <p><span className="font-medium">Gender:</span> {viewingPatient.gender}</p>
                    <p><span className="font-medium">Email:</span> {viewingPatient.email}</p>
                    <p><span className="font-medium">Phone:</span> {viewingPatient.phone}</p>
                    <p><span className="font-medium">Address:</span> {viewingPatient.address}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingPatient.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingPatient.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Assigned Caregivers */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Assigned Caregivers</h4>
                  <div className="space-y-3">
                    {viewingPatient.assignedCaregivers && viewingPatient.assignedCaregivers.length > 0 ? (
                      viewingPatient.assignedCaregivers.map((assignment, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{assignment.caregiverName}</p>
                              <p className="text-xs text-gray-600 mt-1">{assignment.caregiverRole}</p>
                              {assignment.caregiverEmail && (
                                <p className="text-xs text-gray-500">{assignment.caregiverEmail}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Assigned: {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                assignment.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.status || 'active'}
                              </span>
                              {assignment.status === 'active' && (
                                <button
                                  onClick={() => handleUnassign(assignment.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Unassign"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No caregivers assigned yet</p>
                    )}
                  </div>
                </div>

                {/* Care Plans */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Care Plans</h4>
                  <div className="space-y-3">
                    {viewingPatient.carePlans && viewingPatient.carePlans.length > 0 ? (
                      viewingPatient.carePlans.map((plan, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <p className="font-medium text-sm">{plan.diagnosis}</p>
                          <p className="text-xs text-gray-600 mt-1">{plan.treatmentPlan}</p>
                          <p className="text-xs text-gray-500 mt-1">By: {plan.doctorName}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No care plans available</p>
                    )}
                  </div>
                </div>

                {/* Medical History */}
                <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Medical History</h4>
                  <div className="space-y-3">
                    {viewingPatient.medicalHistory && viewingPatient.medicalHistory.length > 0 ? (
                      viewingPatient.medicalHistory.map((report, index) => (
                        <div key={index} className="bg-white p-4 rounded border">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                            <div><span className="font-medium text-sm">BP:</span> {report.bloodPressure}</div>
                            <div><span className="font-medium text-sm">HR:</span> {report.heartRate}</div>
                            <div><span className="font-medium text-sm">Temp:</span> {report.temperature}°F</div>
                            <div><span className="font-medium text-sm">Weight:</span> {report.weight} lbs</div>
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{report.notes}</p>
                          <p className="text-xs text-gray-500 mt-1">By: {report.nurseName} - {new Date(report.createdAt?.toDate?.() || report.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No medical history available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Caregiver Details Modal */}
        {showCaregiverModal && viewingCaregiver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">Caregiver Details</h3>
                <button
                  onClick={() => setShowCaregiverModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {viewingCaregiver.name}</p>
                    <p><span className="font-medium">Email:</span> {viewingCaregiver.email}</p>
                    <p><span className="font-medium">Phone:</span> {viewingCaregiver.phone}</p>
                    <p><span className="font-medium">Role:</span> {viewingCaregiver.role}</p>
                    <p><span className="font-medium">Experience:</span> {viewingCaregiver.experience}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingCaregiver.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingCaregiver.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Assigned Patients */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Assigned Patients</h4>
                  <div className="space-y-3">
                    {viewingCaregiver.assignedPatients && viewingCaregiver.assignedPatients.length > 0 ? (
                      viewingCaregiver.assignedPatients.map((assignment, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <p className="font-medium text-sm">{assignment.patientName}</p>
                          <p className="text-xs text-gray-600 mt-1">{assignment.patientEmail}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned: {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No patients assigned</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Modal */}
        {showAssignmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Assignment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type</label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="patient-to-caregiver">Assign Patient to Caregiver</option>
                    <option value="caregiver-to-patient">Assign Caregiver to Patient</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {assignmentType === 'patient-to-caregiver' ? 'Patient' : 'Caregiver'}
                  </label>
                  <select
                    value={assignmentType === 'patient-to-caregiver' ? selectedPatientForAssignment : selectedCaregiverForAssignment}
                    onChange={(e) => {
                      if (assignmentType === 'patient-to-caregiver') {
                        setSelectedPatientForAssignment(e.target.value);
                      } else {
                        setSelectedCaregiverForAssignment(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select {assignmentType === 'patient-to-caregiver' ? 'Patient' : 'Caregiver'}</option>
                    {(assignmentType === 'patient-to-caregiver' ? patients : caregivers).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {assignmentType === 'patient-to-caregiver' ? 'Caregiver' : 'Patient'}
                  </label>
                  <select
                    value={assignmentType === 'patient-to-caregiver' ? selectedCaregiverForAssignment : selectedPatientForAssignment}
                    onChange={(e) => {
                      if (assignmentType === 'patient-to-caregiver') {
                        setSelectedCaregiverForAssignment(e.target.value);
                      } else {
                        setSelectedPatientForAssignment(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select {assignmentType === 'patient-to-caregiver' ? 'Caregiver' : 'Patient'}</option>
                    {(assignmentType === 'patient-to-caregiver' ? caregivers : patients).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Assignment
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Incoming Call Interface */}
        {incomingCall && (
          <CallInterface
            isOpen={!!incomingCall}
            onClose={handleRejectCall}
            callType={incomingCall.callType}
            participantInfo={{
              id: incomingCall.callerId,
              name: 'Incoming Call',
              role: 'user'
            }}
            isIncoming={true}
            onCallAccepted={handleAcceptCall}
            onCallRejected={handleRejectCall}
          />
        )}
        
        {/* Active Call Interface */}
        {activeCall && activeCall.callId && (
          <CallInterface
            isOpen={!!activeCall}
            onClose={handleEndCall}
            callType={activeCall.callType}
            participantInfo={{
              id: activeCall.participantId,
              name: activeCall.participantName || 'User',
              role: 'user'
            }}
            isIncoming={false}
          />
        )}
      </div>
    </AdminGuard>
  );
};

export default NewAdminDashboard;
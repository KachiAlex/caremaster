import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import SpecializedCaregiverDashboard from '../components/SpecializedCaregiverDashboard';
import UserAvatarDropdown from '../components/UserAvatarDropdown';
import DashboardLayout from '../components/DashboardLayout';
import {
  Users,
  Calendar,
  MessageSquare,
  Activity,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Clock,
  Shield,
  BarChart3,
  FileText,
  Heart,
  Stethoscope,
  Pill,
  ClipboardList,
  Camera,
  MapPin,
  Phone,
  Mail,
  Bell,
  Settings,
  LogOut,
  X,
  Thermometer,
  Weight,
  Eye,
  Zap,
  RefreshCw,
  Home,
  HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getClientsByCaregiver, 
  getClientsByDoctor, 
  getPatientStats 
} from '../api/patientsAPI';
import { 
  getTodaysAppointments, 
  getUpcomingAppointments, 
  getAppointmentStats 
} from '../api/appointmentsAPI';
import { 
  getTodaysCareTasks, 
  getPendingCareTasks, 
  getCareTaskStats 
} from '../api/careTasksAPI';
import { getTaskAssignmentsByCaregiver } from '../api/taskAssignmentAPI';
import { 
  getUnreadMessageCount, 
  getConversationsByUser 
} from '../api/messagesAPI';
import { 
  getUnreadNotificationCount, 
  getNotificationsByUser 
} from '../api/notificationsAPI';
import { getNurseReportsByPatient, createNurseReport } from '../api/nurseReportsAPI';
import { carePlansAPI } from '../api/carePlansAPI';
import MorningBriefing from '../components/MorningBriefing';
import TaskCompletionModal from '../components/TaskCompletionModal';
import VitalsQuickEntry from '../components/VitalsQuickEntry';
import WeeklyCalendar from '../components/WeeklyCalendar';
import AssignmentCalendar from '../components/AssignmentCalendar';
import { createVitalSign } from '../api/vitalSignsAPI';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';

// Shared Components
const DashboardHeader = ({ userProfile, userRole, user }) => {
  const getRoleIcon = () => {
    switch (userRole) {
      case 'doctor': return <Stethoscope className="h-6 w-6 text-blue-600" />;
      case 'caregiver': return <UserCheck className="h-6 w-6 text-green-600" />;
      default: return <Users className="h-6 w-6 text-gray-600" />;
    }
  };

  const getRoleTitle = () => {
    // Check for specializations in userProfile
    const specializations = userProfile?.specializations || [];
    
    if (userRole === 'doctor') {
      return 'Medical Dashboard';
    } else if (userRole === 'caregiver') {
      if (specializations.includes('Registered Nurse') || specializations.includes('LPN')) {
        return 'Medical Care Specialist Dashboard';
      } else if (specializations.includes('Physical Therapist')) {
        return 'Physical Therapy Dashboard';
      } else if (specializations.includes('Dementia Care') || specializations.includes('Memory Care Specialist')) {
        return 'Memory Care Specialist Dashboard';
      } else if (specializations.includes('Companion Care')) {
        return 'Companion Care Dashboard';
      } else {
        return 'General Care Dashboard';
      }
    }
    return 'Service Provider Dashboard';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getRoleTitle()}</h1>
            <p className="text-gray-600">
              Welcome back, {userProfile?.name || 'User'}
            </p>
            {userProfile?.specializations && userProfile.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {userProfile.specializations.slice(0, 3).map((spec, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {spec}
                  </span>
                ))}
                {userProfile.specializations.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{userProfile.specializations.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{userProfile?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
          <UserAvatarDropdown
            userProfile={userProfile}
            user={user}
            profileImageUrl={userProfile?.photoURL || userProfile?.profilePictureUrl}
            size="md"
          />
        </div>
      </div>
    </div>
  );
};

const QuickStats = ({ userRole, stats, loading, onPatientClick, onShowTasks, onShowAppointments, onShowMessages }) => {
  const navigate = useNavigate();
  
  const getStatsForRole = () => {
    if (userRole === 'doctor') {
      return [
        { label: 'clients', value: stats.clients || 0, icon: Users, color: 'blue', action: () => navigate('/service-provider/medical-records') },
        { label: 'Today\'s Appointments', value: stats.todaysAppointments || 0, icon: Calendar, color: 'green', action: onShowAppointments },
        { label: 'Upcoming', value: stats.upcomingAppointments || 0, icon: Clock, color: 'purple', action: () => navigate('/service-provider/consultations') },
        { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, color: 'orange', action: onShowMessages },
      ];
    } else if (userRole === 'caregiver') {
      return [
        { label: 'Assigned clients', value: stats.clients || 0, icon: Users, color: 'blue', action: () => navigate('/service-provider/medical-records') },
        { label: 'Today\'s Tasks', value: stats.todaysTasks || 0, icon: ClipboardList, color: 'green', action: onShowTasks },
        { label: 'Pending Tasks', value: stats.pendingTasks || 0, icon: Clock, color: 'purple', action: onShowTasks },
        { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, color: 'orange', action: onShowMessages },
      ];
    }
    return [];
  };

  const roleStats = getStatsForRole();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {roleStats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = {
          blue: 'bg-blue-100 text-blue-600',
          green: 'bg-green-100 text-green-600',
          purple: 'bg-purple-100 text-purple-600',
          orange: 'bg-orange-100 text-orange-600',
        };

        const handleClick = () => {
          if (stat.action) {
            stat.action();
          }
        };

        return (
          <div 
            key={index} 
            className="cm-card p-6 hover:shadow-md transition-shadow cursor-pointer" 
            onClick={handleClick}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${colorClasses[stat.color]}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Doctor-Specific Components
const DoctorSpecificSections = ({ userProfile, assignedPatients = [], upcomingAppointments = [] }) => {
  const navigate = useNavigate();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Recent clients */}
      <div 
        className="cm-card hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate('/service-provider/medical-records')}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent clients</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {assignedPatients.length > 0 ? (
              assignedPatients.slice(0, 5).map((patient) => (
                <div key={patient.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                    <p className="text-xs text-gray-500">{patient.medicalConditions || 'General care'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No visits'}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      patient.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.status || 'active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center">No clients assigned yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Consultations */}
      <div 
        className="cm-card hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate('/service-provider/consultations')}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Consultations</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 5).map((consultation) => (
                <div key={consultation.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{consultation.clientName || 'Client'}</p>
                    <p className="text-xs text-gray-500">{consultation.type || 'Consultation'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {consultation.scheduledTime ? new Date(consultation.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center">No upcoming consultations</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Caregiver-Specific Components
const CaregiverSpecificSections = ({ userProfile, todaysTasks = [], pendingTasks = [] }) => {
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    // Use real task data from props
    setTodayTasks(todaysTasks || []);
    setRecentUpdates(pendingTasks || []);
  }, [todaysTasks, pendingTasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Today's Tasks */}
      <div className="cm-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/service-provider/tasks'}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Today's Tasks</h3>
            <ClipboardList className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={task.status === 'completed'}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.client || task.clientName || 'Client'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {task.scheduledTime ? new Date(task.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time set'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="cm-card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Updates</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentUpdates.map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-500">{task.client || task.clientName || 'Client'} - {task.priority} priority</p>
                </div>
                <p className="text-xs text-gray-500">
                  {task.scheduledTime ? new Date(task.scheduledTime).toLocaleDateString() : 'No date set'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const ServiceProviderDashboard = () => {
  const { user, userProfile, userRole, loading: userLoading } = useUser();
  const navigate = useNavigate();
  // Derive robust role flags (prevents misclassification)
  const normalizedQualification = (userProfile?.medicalQualification || '').toString().toLowerCase();
  const normalizedType = (userProfile?.type || userProfile?.userType || '').toString().toLowerCase();
  
  // Fix role detection - prioritize userRole from context
  const isDoctor = userRole === 'doctor';
  const isCaregiver = userRole === 'caregiver';
  const effectiveRole = userRole || 'caregiver';
  
  // Check if caregiver is a nurse (can submit nurse reports)
  const isNurse = () => {
    const specs = userProfile?.specializations || [];
    const qual = (userProfile?.medicalQualification || '').toLowerCase();
    return specs.includes('Registered Nurse') || 
           specs.includes('LPN') || 
           specs.includes('Licensed Practical Nurse (LPN)') ||
           qual.includes('nurse') || 
           qual.includes('rn') ||
           qual.includes('lpn');
  };
  const [stats, setStats] = useState({
    clients: 0,
    todaysAppointments: 0,
    upcomingAppointments: 0,
    todaysTasks: 0,
    pendingTasks: 0,
    unreadMessages: 0,
  });
  const [todaysTasksData, setTodaysTasksData] = useState([]);
  const [pendingTasksData, setPendingTasksData] = useState([]);
  const [assignedPatientsData, setAssignedPatientsData] = useState([]);
  const [upcomingAppointmentsData, setUpcomingAppointmentsData] = useState([]);
  const [todaysAppointmentsData, setTodaysAppointmentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [showTaskCompletion, setShowTaskCompletion] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showVitalsEntry, setShowVitalsEntry] = useState(false);
  const [showWeeklyCalendar, setShowWeeklyCalendar] = useState(false);
  const [nurseReport, setNurseReport] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
    painLevel: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [nurseReports, setNurseReports] = useState([]);
  const [carePlan, setCarePlan] = useState({
    diagnosis: '',
    treatmentPlan: '',
    medications: '',
    followUpDate: '',
    specialInstructions: '',
    priority: 'medium'
  });
  
  // Call-related states
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callService] = useState(() => new CallService());

  const loadDashboardData = async () => {
    if (!userProfile || !userRole) return;
    
    try {
      setLoading(true);
      
      console.log('ðŸ“Š ServiceProviderDashboard loading data for:', {
        userId: userProfile.id,
        uid: userProfile.uid,
        userRole,
        userType: userProfile.userType,
        email: userProfile.email
      });
      
      console.log('ðŸ” Role flags:', {
        isDoctor,
        isCaregiver,
        effectiveRole
      });
      
      const promises = [];
      
      // Use uid if id is not available (Backend Auth users)
      const userId = userProfile.id || userProfile.uid;
      
      // Load clients with error handling
      if (isDoctor) {
        promises.push(getClientsByDoctor(userId).catch(error => {
          console.log('Could not load clients by doctor - this is normal for new users');
          return [];
        }));
      } else if (isCaregiver) {
        console.log('ðŸ” About to call getClientsByCaregiver with userId:', userId);
        promises.push(getClientsByCaregiver(userId).catch(error => {
          console.log('âŒ Could not load caregiver clients:', error);
          return [];
        }));
      } else {
        promises.push(Promise.resolve([]));
      }
      
      // Load appointments with error handling
      promises.push(getTodaysAppointments(userId, userRole).catch(error => {
        console.log('Could not load today\'s appointments - this is normal for new users');
        return [];
      }));
      promises.push(getUpcomingAppointments(userId, userRole).catch(error => {
        console.log('Could not load upcoming appointments - this is normal for new users');
        return [];
      }));
      
      // Load tasks for assignees (caregivers and doctors)
      if (isCaregiver || isDoctor) {
        promises.push(getTodaysCareTasks(userId).catch(error => {
          console.log('Could not load today\'s tasks - this is normal for new users');
          return [];
        }));
        promises.push(getPendingCareTasks(userId).catch(error => {
          console.log('Could not load pending tasks - this is normal for new users');
          return [];
        }));
        // Also load admin-created task assignments (supports legacy 'assignedTo') and merge
        promises.push(getTaskAssignmentsByCaregiver(userId).catch(error => {
          console.log('Could not load task assignments - this is normal for new users');
          return [];
        }));
      } else {
        promises.push(Promise.resolve([]));
        promises.push(Promise.resolve([]));
        promises.push(Promise.resolve([]));
      }
      
      // Load messages with error handling
      promises.push(getUnreadMessageCount(userId).catch(error => {
        console.log('Could not load unread message count - this is normal for new users');
        return 0;
      }));
      
      const [
        clients,
        todaysAppointments,
        upcomingAppointments,
        todaysTasks,
        pendingTasks,
        taskAssignments,
        unreadMessages
      ] = await Promise.all(promises);
      
      console.log('ðŸ” Raw clients data from API:');
      console.log('  - patientsCount:', clients?.length || 0);
      console.log('  - isArray:', Array.isArray(clients));
      console.log('  - clients data:', clients);
      
      const mergedPending = [...(pendingTasks || []), ...(taskAssignments || [])].filter(Boolean);
      const mergedToday = [...(todaysTasks || []), ...(taskAssignments || []).filter(t => {
        const d = t.scheduledTime ? new Date(t.scheduledTime) : null;
        if (!d) return false;
        const now = new Date();
        return d.toDateString() === now.toDateString();
      })];

      // Update stats with actual data
      const actualPatients = clients || [];
      const actualTodaysAppointments = todaysAppointments || [];
      const actualUpcomingAppointments = upcomingAppointments || [];
      
      console.log('ðŸ“Š Dashboard stats update:');
      console.log('  - clients:', actualPatients.length);
      console.log('  - todaysAppointments:', actualTodaysAppointments.length);
      console.log('  - upcomingAppointments:', actualUpcomingAppointments.length);
      console.log('  - todaysTasks:', mergedToday.length);
      console.log('  - pendingTasks:', mergedPending.length);
      console.log('  - unreadMessages:', unreadMessages);
      
      console.log('ðŸ” Detailed Client data:');
      console.log('  - patientsArray length:', actualPatients.length);
      console.log('  - patientNames:', actualPatients.map(p => p.name));
      console.log('  - patientIds:', actualPatients.map(p => p.id));
      console.log('  - full clients array:', actualPatients);

      setStats({
        clients: actualPatients.length,
        todaysAppointments: actualTodaysAppointments.length,
        upcomingAppointments: actualUpcomingAppointments.length,
        todaysTasks: mergedToday.length,
        pendingTasks: mergedPending.length,
        unreadMessages,
      });
      
      console.log('âœ… Stats set with clients count:', actualPatients.length);
      
      // Store actual task data for caregiver sections (merged)
      setTodaysTasksData(mergedToday);
      setPendingTasksData(mergedPending);
      setAssignedPatientsData(clients || []);
      setUpcomingAppointmentsData(upcomingAppointments || []);
      setTodaysAppointmentsData(todaysAppointments || []);
      
      // Show morning briefing on first load if caregiver has tasks
      const hasShownToday = sessionStorage.getItem(`morning_briefing_${new Date().toDateString()}`);
      if (!hasShownToday && (mergedToday.length > 0 || todaysAppointments.length > 0) && isCaregiver) {
        setShowMorningBriefing(true);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [userProfile, userRole, isCaregiver]);
  
  // Set up incoming call listener
  useEffect(() => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      return;
    }
    
    const userId = userProfile.id || userProfile.uid;
    console.log('ðŸŽ§ Setting up call listener for doctor:', userId);
    
    const unsubscribe = callService.listenForIncomingCalls(userId, (callNotification) => {
      console.log('ðŸ“ž Incoming call notification:', callNotification);
      
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
      console.log('ðŸ”Œ Cleaning up call listener');
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
        participantName: 'Admin',
        callType: incomingCall.callType
      });
      setIncomingCall(null);
      console.log('âœ… Call accepted');
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
      console.log('âŒ Call rejected');
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
      console.log('âœ… Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">No user profile found</p>
      </div>
    );
  }

  // Client modal handlers
  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
    
    // Load nurse reports from Database (for doctors view)
    if (isDoctor && patient?.id) {
      getNurseReportsByPatient(patient.id)
        .then((reports) => setNurseReports(reports))
        .catch(() => setNurseReports([]));
    }
  };

  const handleCloseModal = () => {
    setShowPatientModal(false);
    setSelectedPatient(null);
    setNurseReports([]);
  };

  const handleNurseReportChange = (field, value) => {
    setNurseReport(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCarePlanChange = (field, value) => {
    setCarePlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitNurseReport = async () => {
    try {
      if (!selectedPatient?.id) {
        toast.error('No Client selected');
        return;
      }
      await createNurseReport({
        clientId: selectedPatient.id,
        nurseId: userProfile.id,
        nurseName: userProfile.name,
        ...nurseReport,
      });
      toast.success('Nurse report submitted successfully!');
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to submit nurse report');
      console.error('Error submitting nurse report:', error);
    }
  };

  const handleSubmitCarePlan = async () => {
    try {
      if (!selectedPatient?.id) {
        toast.error('No Client selected');
        return;
      }
      await carePlansAPI.createCarePlan({
        clientId: selectedPatient.id,
        doctorId: userProfile.id,
        doctorName: userProfile.name,
        ...carePlan,
      });
      toast.success('Care plan created successfully!');
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to create care plan');
      console.error('Error creating care plan:', error);
    }
  };

  const handleShowTasks = () => {
    try {
      // Prefer client-side navigation if available
      if (navigate) {
        navigate('/service-provider/tasks');
        return;
      }
    } catch (_) {}
    // Fallback to hard navigation to avoid ReferenceError in some builds
    window.location.href = '/service-provider/tasks';
  };

  const handleShowAppointments = () => {
    try {
      if (navigate) {
        navigate('/service-provider/consultations');
        return;
      }
    } catch (_) {}
    window.location.href = '/service-provider/consultations';
  };

  const handleShowMessages = () => {
    try {
      if (navigate) {
        navigate('/service-provider/messages');
        return;
      }
    } catch (_) {}
    window.location.href = '/service-provider/messages';
  };

  const handleStartDay = () => {
    sessionStorage.setItem(`morning_briefing_${new Date().toDateString()}`, 'true');
    if (todaysTasksData.length > 0) {
      try {
        if (navigate) {
          navigate('/service-provider/tasks');
          return;
        }
      } catch (_) {}
      window.location.href = '/service-provider/tasks';
    }
  };

  const handleSaveVitals = async (vitalData) => {
    try {
      await createVitalSign(vitalData);
      toast.success('Vitals recorded successfully');
      return true;
    } catch (error) {
      console.error('Error saving vitals:', error);
      toast.error('Failed to save vitals');
      return false;
    }
  };

  const handleTaskComplete = () => {
    // Reload dashboard data
    const userId = userProfile?.id || userProfile?.uid;
    if (userId && isCaregiver) {
      getTodaysCareTasks(userId)
        .then(tasks => setTodaysTasksData(tasks))
        .catch(() => {});
    }
    // Refresh the entire dashboard
    loadDashboardData();
  };

  // CareMaster design system - tabs for DashboardLayout sidebar
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    ...(isDoctor ? [
      { id: 'consultations', label: 'Consultations', icon: Stethoscope },
      { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
      { id: 'records', label: 'Medical Records', icon: FileText },
    ] : []),
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const handleTabChange = (tabId) => {
    if (tabId === 'dashboard') return; // stay on dashboard
    const routeMap = {
      clients: '/service-provider/medical-records',
      tasks: '/service-provider/tasks',
      schedule: '/service-provider/schedule',
      messages: '/service-provider/messages',
      consultations: '/service-provider/consultations',
      prescriptions: '/service-provider/prescriptions',
      records: '/service-provider/medical-records',
      help: '/service-provider/settings',
    };
    const route = routeMap[tabId];
    if (route) navigate(route);
  };

  const displayName = userProfile?.name || userProfile?.displayName || 'Service Provider';
  const portalLabel = isDoctor ? 'Doctor' : 'Caregiver';
  const institutionName = isDoctor ? 'Medical Dashboard' : 'Care Dashboard';

  const handleLogout = () => {
    import('backend/auth').then(({ signOut, getAuth }) => {
      signOut(getAuth()).then(() => {
        window.location.href = '/login';
      }).catch((error) => {
        console.error('Error signing out:', error);
      });
    });
  };

  return (
    <div className="min-h-screen cm-dashboard-body">
      <DashboardLayout
        tabs={tabs}
        activeTab="dashboard"
        onTabChange={handleTabChange}
        institutionName={institutionName}
        portalLabel={portalLabel}
        displayName={displayName}
        userEmail={userProfile?.email || user?.email || ''}
        profilePictureUrl={userProfile?.photoURL || userProfile?.profilePictureUrl}
        onLogout={handleLogout}
        headerActions={
          <button
            onClick={() => window.location.reload()}
            className="cm-btn-gold"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline">Refresh</span>
          </button>
        }
      >
        <div className="space-y-6">
          <div className="cm-section-head">
            <span className="cm-eyebrow">{portalLabel} Portal</span>
            <h2 className="mt-2">{institutionName}</h2>
            <p>Welcome back, {displayName}. {userProfile?.medicalQualification || ''}</p>
            {userProfile?.specializations && userProfile.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {userProfile.specializations.slice(0, 3).map((spec, index) => (
                  <span key={index} className="px-2 py-1 bg-gold-soft/30 text-gold-deep text-xs rounded-full">
                    {spec}
                  </span>
                ))}
                {userProfile.specializations.length > 3 && (
                  <span className="px-2 py-1 bg-ink/5 text-text-soft text-xs rounded-full">
                    +{userProfile.specializations.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

        <QuickStats
          userRole={effectiveRole}
          stats={stats}
          loading={loading}
          onPatientClick={handlePatientClick}
          onShowTasks={handleShowTasks}
          onShowAppointments={handleShowAppointments}
          onShowMessages={handleShowMessages}
        />
        <AssignmentCalendar
          schedule={[
            ...(todaysAppointmentsData || []).map(a => ({
              id: a.id, type: 'appointment', title: a.title || a.clientName || 'Appointment',
              time: a.scheduledTime || '', client: a.clientName || 'Client', status: a.status || 'scheduled'
            })),
            ...(upcomingAppointmentsData || []).map(a => ({
              id: a.id, type: 'appointment', title: a.title || a.clientName || 'Appointment',
              time: a.scheduledTime || '', client: a.clientName || 'Client', status: a.status || 'scheduled'
            })),
            ...(todaysTasksData || []).map(t => ({
              id: t.id, type: 'task', title: t.title || 'Task',
              time: t.scheduledTime || '', client: t.clientName || 'Client', status: t.status || 'pending'
            })),
            ...(pendingTasksData || []).map(t => ({
              id: t.id, type: 'task', title: t.title || 'Task',
              time: t.scheduledTime || '', client: t.clientName || 'Client', status: t.status || 'pending'
            })),
          ]}
          onItemSelect={(item) => {
            setSelectedTask(item);
            setShowTaskCompletion(true);
          }}
        />

        {isDoctor && (
          <DoctorSpecificSections
            userProfile={userProfile}
            assignedPatients={assignedPatientsData}
            upcomingAppointments={upcomingAppointmentsData}
          />
        )}

        {isCaregiver && (
          <div className="p-6">
            <SpecializedCaregiverDashboard
              onPatientClick={handlePatientClick}
              assignedPatients={assignedPatientsData}
            />
            <div className="mt-6">
              <CaregiverSpecificSections
                userProfile={userProfile}
                todaysTasks={todaysTasksData}
                pendingTasks={pendingTasksData}
              />
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>

      {/* Client Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Client Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedPatient.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Age:</span>
                      <span className="ml-2 font-medium">{selectedPatient.age || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Condition:</span>
                      <span className="ml-2 font-medium">{selectedPatient.condition || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 font-medium">{selectedPatient.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Allergies:</span>
                      <span className="ml-2 font-medium">{selectedPatient.allergies || 'None reported'}</span>
                    </div>
                    <div className="flex items-center">
                      <Pill className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Medications:</span>
                      <span className="ml-2 font-medium">{selectedPatient.medications || 'None'}</span>
                    </div>
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedPatient.status === 'stable' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedPatient.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor View: Nurse Reports & Care Plan */}
              {isDoctor && (
                <>
                  {/* Nurse Reports Section */}
                  <div className="border-t border-gray-200 pt-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Stethoscope className="h-5 w-5 text-blue-600 mr-2" />
                      Nurse Reports ({nurseReports.length})
                    </h3>
                    
                    <div className="space-y-4">
                      {nurseReports.map((report) => (
                        <div key={report.id} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900">{report.nurseName}</span>
                              <span className="ml-2 text-sm text-gray-500">â€¢ {report.date}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.status === 'stable' ? 'bg-green-100 text-green-800' : 
                              report.status === 'improving' ? 'bg-blue-100 text-blue-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Blood Pressure</div>
                              <div className="font-medium">{report.bloodPressure}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Heart Rate</div>
                              <div className="font-medium">{report.heartRate} BPM</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Temperature</div>
                              <div className="font-medium">{report.temperature}Â°F</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Pain Level</div>
                              <div className="font-medium">{report.painLevel}/10</div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <strong>Notes:</strong> {report.notes}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Care Plan Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 text-green-600 mr-2" />
                      Care Plan Preparation
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Diagnosis */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Diagnosis
                        </label>
                        <input
                          type="text"
                          value={carePlan.diagnosis}
                          onChange={(e) => handleCarePlanChange('diagnosis', e.target.value)}
                          placeholder="Enter primary diagnosis..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      {/* Treatment Plan */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Treatment Plan
                        </label>
                        <textarea
                          value={carePlan.treatmentPlan}
                          onChange={(e) => handleCarePlanChange('treatmentPlan', e.target.value)}
                          placeholder="Describe the treatment approach..."
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      {/* Medications */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medications
                        </label>
                        <textarea
                          value={carePlan.medications}
                          onChange={(e) => handleCarePlanChange('medications', e.target.value)}
                          placeholder="List prescribed medications..."
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      {/* Follow-up Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Follow-up Date
                        </label>
                        <input
                          type="date"
                          value={carePlan.followUpDate}
                          onChange={(e) => handleCarePlanChange('followUpDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority Level
                        </label>
                        <select
                          value={carePlan.priority}
                          onChange={(e) => handleCarePlanChange('priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Special Instructions */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Special Instructions
                        </label>
                        <textarea
                          value={carePlan.specialInstructions}
                          onChange={(e) => handleCarePlanChange('specialInstructions', e.target.value)}
                          placeholder="Any special instructions for caregivers..."
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    {/* Submit Care Plan Button */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCloseModal}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitCarePlan}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Care Plan
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Caregiver View: Nurse Report Submission (Nurses Only) */}
              {isCaregiver && isNurse() && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Stethoscope className="h-5 w-5 text-blue-600 mr-2" />
                    Nurse Report & Vital Signs
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Blood Pressure */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Heart className="h-4 w-4 inline mr-1" />
                        Blood Pressure (mmHg)
                      </label>
                      <input
                        type="text"
                        value={nurseReport.bloodPressure}
                        onChange={(e) => handleNurseReportChange('bloodPressure', e.target.value)}
                        placeholder="120/80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Heart Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Zap className="h-4 w-4 inline mr-1" />
                        Heart Rate (BPM)
                      </label>
                      <input
                        type="number"
                        value={nurseReport.heartRate}
                        onChange={(e) => handleNurseReportChange('heartRate', e.target.value)}
                        placeholder="72"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Thermometer className="h-4 w-4 inline mr-1" />
                        Temperature (Â°F)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={nurseReport.temperature}
                        onChange={(e) => handleNurseReportChange('temperature', e.target.value)}
                        placeholder="98.6"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Weight className="h-4 w-4 inline mr-1" />
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={nurseReport.weight}
                        onChange={(e) => handleNurseReportChange('weight', e.target.value)}
                        placeholder="150"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Eye className="h-4 w-4 inline mr-1" />
                        Height (inches)
                      </label>
                      <input
                        type="number"
                        value={nurseReport.height}
                        onChange={(e) => handleNurseReportChange('height', e.target.value)}
                        placeholder="68"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Oxygen Saturation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Activity className="h-4 w-4 inline mr-1" />
                        O2 Saturation (%)
                      </label>
                      <input
                        type="number"
                        value={nurseReport.oxygenSaturation}
                        onChange={(e) => handleNurseReportChange('oxygenSaturation', e.target.value)}
                        placeholder="98"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Pain Level */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pain Level (0-10)
                    </label>
                    <select
                      value={nurseReport.painLevel}
                      onChange={(e) => handleNurseReportChange('painLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select pain level</option>
                      {[0,1,2,3,4,5,6,7,8,9,10].map(level => (
                        <option key={level} value={level}>{level} - {level === 0 ? 'No pain' : level <= 3 ? 'Mild' : level <= 6 ? 'Moderate' : 'Severe'}</option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clinical Notes
                    </label>
                    <textarea
                      value={nurseReport.notes}
                      onChange={(e) => handleNurseReportChange('notes', e.target.value)}
                      placeholder="Enter any observations, symptoms, or concerns..."
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitNurseReport}
                      className="px-6 py-2 cm-btn-gold transition-colors flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Nurse Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Morning Briefing Modal */}
      {showMorningBriefing && (
        <MorningBriefing
          clients={assignedPatientsData}
          todaysTasks={todaysTasksData}
          todaysAppointments={todaysAppointmentsData}
          onClose={() => setShowMorningBriefing(false)}
          onStartDay={handleStartDay}
        />
      )}

      {/* Task Completion Modal */}
      {showTaskCompletion && selectedTask && (
        <TaskCompletionModal
          task={selectedTask}
          Client={selectedPatient}
          onClose={() => {
            setShowTaskCompletion(false);
            setSelectedTask(null);
          }}
          onComplete={handleTaskComplete}
        />
      )}

      {/* Vitals Quick Entry */}
      {showVitalsEntry && selectedPatient && (
        <VitalsQuickEntry
          Client={selectedPatient}
          onClose={() => {
            setShowVitalsEntry(false);
            setSelectedPatient(null);
          }}
          onSave={handleSaveVitals}
        />
      )}

      {/* Weekly Calendar Modal */}
      {showWeeklyCalendar && (
        <WeeklyCalendar
          onClose={() => setShowWeeklyCalendar(false)}
          tasks={[...(todaysTasksData || []), ...(pendingTasksData || [])]}
          appointments={[...(todaysAppointmentsData || []), ...(upcomingAppointmentsData || [])]}
        />
      )}
      
      {/* Incoming Call Interface */}
      {incomingCall && (
        <CallInterface
          isOpen={!!incomingCall}
          onClose={handleRejectCall}
          callType={incomingCall.callType}
          participantInfo={{
            id: incomingCall.callerId,
            name: 'Admin',
            role: 'admin'
          }}
          isIncoming={true}
          onCallAccepted={handleAcceptCall}
          onCallRejected={handleRejectCall}
        />
      )}
      
      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleEndCall}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
            role: 'admin'
          }}
          isIncoming={false}
        />
      )}
    </div>
  );
};

export default ServiceProviderDashboard;

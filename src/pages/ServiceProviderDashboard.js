import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import SpecializedCaregiverDashboard from '../components/SpecializedCaregiverDashboard';
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
  RefreshCw
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
import { createVitalSign } from '../api/vitalSignsAPI';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';

// Shared Components
const DashboardHeader = ({ userProfile, userRole }) => {
  const getRoleIcon = () => {
    switch (userRole) {
      case 'doctor': return <Stethoscope className="h-5 w-5 text-slate-950" />;
      case 'caregiver': return <UserCheck className="h-5 w-5 text-slate-950" />;
      default: return <Users className="h-5 w-5 text-slate-950" />;
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

  const getIconColor = () => {
    switch (userRole) {
      case 'doctor': return 'from-blue-400 to-blue-500';
      case 'caregiver': return 'from-blue-400 to-blue-500';
      default: return 'from-blue-400 to-blue-500';
    }
  };

  return (
    <div className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${getIconColor()} shadow-lg shadow-blue-500/40`}>
            {getRoleIcon()}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300 capitalize">
              {userRole}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">{getRoleTitle()}</h1>
            <p className="text-xs text-slate-400">
              Welcome back, {userProfile?.name || 'User'}
            </p>
            {userProfile?.specializations && userProfile.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {userProfile.specializations.slice(0, 3).map((spec, index) => (
                  <span key={index} className="px-2 py-0.5 bg-blue-400/10 text-blue-300 border border-blue-400/30 text-xs rounded-full">
                    {spec}
                  </span>
                ))}
                {userProfile.specializations.length > 3 && (
                  <span className="px-2 py-0.5 bg-slate-800/60 text-slate-400 border border-slate-700 text-xs rounded-full">
                    +{userProfile.specializations.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-slate-800/60 text-slate-300 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center gap-2 text-xs font-medium border border-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-50">{userProfile?.name}</p>
            <p className="text-[11px] text-slate-400 capitalize">{userRole}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-400 flex items-center justify-center ring-2 ring-slate-800">
            <span className="text-sm font-medium text-slate-950">
              {userProfile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
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
        { label: 'Patients', value: stats.patients || 0, icon: Users, color: 'blue', action: () => navigate('/service-provider/medical-records') },
        { label: 'Today\'s Appointments', value: stats.todaysAppointments || 0, icon: Calendar, color: 'green', action: onShowAppointments },
        { label: 'Upcoming', value: stats.upcomingAppointments || 0, icon: Clock, color: 'purple', action: () => navigate('/service-provider/consultations') },
        { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, color: 'orange', action: onShowMessages },
      ];
    } else if (userRole === 'caregiver') {
      return [
        { label: 'Assigned Patients', value: stats.patients || 0, icon: Users, color: 'blue', action: () => navigate('/service-provider/medical-records') },
        { label: 'Today\'s Tasks', value: stats.todaysTasks || 0, icon: ClipboardList, color: 'green', action: onShowTasks },
        { label: 'Pending Tasks', value: stats.pendingTasks || 0, icon: Clock, color: 'purple', action: onShowTasks },
        { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, color: 'orange', action: onShowMessages },
      ];
    }
    return [];
  };

  const roleStats = getStatsForRole();

  const getAccentColor = (color) => {
    const accents = {
      blue: 'from-blue-400 to-blue-300',
      green: 'from-blue-400 to-blue-300',
      purple: 'from-blue-400 to-blue-300',
      orange: 'from-blue-400 to-blue-300',
    };
    return accents[color] || accents.blue;
  };

  return (
    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-6">
      {roleStats.map((stat, index) => {
        const Icon = stat.icon;

        const handleClick = () => {
          if (stat.action) {
            stat.action();
          }
        };

        return (
          <div 
            key={index} 
            className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40 hover:bg-slate-950/80 transition-all cursor-pointer" 
            onClick={handleClick}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">{stat.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${getAccentColor(stat.color)}`}>
                <Icon className="h-4 w-4 text-slate-950" />
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
      {/* Recent Patients */}
      <div 
        className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate('/service-provider/medical-records')}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Patients</h3>
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
                      patient.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.status || 'active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center">No patients assigned yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Consultations */}
      <div 
        className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
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
                    <p className="text-sm font-medium text-gray-900">{consultation.patientName || 'Patient'}</p>
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
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/service-provider/tasks'}>
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
                    <p className="text-xs text-gray-500">{task.patient}</p>
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
      <div className="bg-white rounded-lg shadow">
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
                  <p className="text-xs text-gray-500">{task.patient} - {task.priority} priority</p>
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
  const { userProfile, userRole, loading: userLoading } = useUser();
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
    patients: 0,
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
      
      console.log('📊 ServiceProviderDashboard loading data for:', {
        userId: userProfile.id,
        uid: userProfile.uid,
        userRole,
        userType: userProfile.userType,
        email: userProfile.email
      });
      
      console.log('🔍 Role flags:', {
        isDoctor,
        isCaregiver,
        effectiveRole
      });
      
      const promises = [];
      
      // Use uid if id is not available (Firebase Auth users)
      const userId = userProfile.id || userProfile.uid;
      
      // Load patients with error handling
      if (isDoctor) {
        promises.push(getClientsByDoctor(userId).catch(error => {
          console.log('Could not load patients by doctor - this is normal for new users');
          return [];
        }));
      } else if (isCaregiver) {
        console.log('🔍 About to call getClientsByCaregiver with userId:', userId);
        promises.push(getClientsByCaregiver(userId).catch(error => {
          console.log('❌ Could not load caregiver patients:', error);
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
        patients,
        todaysAppointments,
        upcomingAppointments,
        todaysTasks,
        pendingTasks,
        taskAssignments,
        unreadMessages
      ] = await Promise.all(promises);
      
      console.log('🔍 Raw patients data from API:');
      console.log('  - patientsCount:', patients?.length || 0);
      console.log('  - isArray:', Array.isArray(patients));
      console.log('  - patients data:', patients);
      
      const mergedPending = [...(pendingTasks || []), ...(taskAssignments || [])].filter(Boolean);
      const mergedToday = [...(todaysTasks || []), ...(taskAssignments || []).filter(t => {
        const d = t.scheduledTime ? new Date(t.scheduledTime) : null;
        if (!d) return false;
        const now = new Date();
        return d.toDateString() === now.toDateString();
      })];

      // Update stats with actual data
      const actualPatients = patients || [];
      const actualTodaysAppointments = todaysAppointments || [];
      const actualUpcomingAppointments = upcomingAppointments || [];
      
      console.log('📊 Dashboard stats update:');
      console.log('  - patients:', actualPatients.length);
      console.log('  - todaysAppointments:', actualTodaysAppointments.length);
      console.log('  - upcomingAppointments:', actualUpcomingAppointments.length);
      console.log('  - todaysTasks:', mergedToday.length);
      console.log('  - pendingTasks:', mergedPending.length);
      console.log('  - unreadMessages:', unreadMessages);
      
      console.log('🔍 Detailed patient data:');
      console.log('  - patientsArray length:', actualPatients.length);
      console.log('  - patientNames:', actualPatients.map(p => p.name));
      console.log('  - patientIds:', actualPatients.map(p => p.id));
      console.log('  - full patients array:', actualPatients);

      setStats({
        patients: actualPatients.length,
        todaysAppointments: actualTodaysAppointments.length,
        upcomingAppointments: actualUpcomingAppointments.length,
        todaysTasks: mergedToday.length,
        pendingTasks: mergedPending.length,
        unreadMessages,
      });
      
      console.log('✅ Stats set with patients count:', actualPatients.length);
      
      // Store actual task data for caregiver sections (merged)
      setTodaysTasksData(mergedToday);
      setPendingTasksData(mergedPending);
      setAssignedPatientsData(patients || []);
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
    console.log('🎧 Setting up call listener for doctor:', userId);
    
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
        participantName: 'Admin',
        callType: incomingCall.callType
      });
      setIncomingCall(null);
      console.log('✅ Call accepted');
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
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  // Patient modal handlers
  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
    
    // Load nurse reports from Firestore (for doctors view)
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
        toast.error('No patient selected');
        return;
      }
      await createNurseReport({
        patientId: selectedPatient.id,
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
        toast.error('No patient selected');
        return;
      }
      await carePlansAPI.createCarePlan({
        patientId: selectedPatient.id,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />
      
      <DashboardHeader userProfile={userProfile} userRole={effectiveRole} />
      <QuickStats 
        userRole={effectiveRole} 
        stats={stats} 
        loading={loading} 
        onPatientClick={handlePatientClick}
        onShowTasks={handleShowTasks}
        onShowAppointments={handleShowAppointments}
        onShowMessages={handleShowMessages}
      />
      <div className="relative z-10 px-6 -mt-4 mb-2 flex items-center justify-end">
        <button
          onClick={() => setShowWeeklyCalendar(true)}
          className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 border border-blue-500/30 transition-colors text-xs font-medium"
        >
          Weekly Overview
        </button>
      </div>
      
      {isDoctor && (
        <DoctorSpecificSections 
          userProfile={userProfile}
          assignedPatients={assignedPatientsData}
          upcomingAppointments={upcomingAppointmentsData}
        />
      )}
      
      {isCaregiver && (
        <div className="relative z-10 p-6">
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

      {/* Patient Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
              <h2 className="text-xl font-semibold text-slate-50">Patient Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-50 transition-colors p-1 rounded-lg hover:bg-slate-800/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
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
                        selectedPatient.status === 'stable' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
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
                              <span className="ml-2 text-sm text-gray-500">• {report.date}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.status === 'stable' ? 'bg-blue-100 text-blue-800' : 
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
                              <div className="font-medium">{report.temperature}°F</div>
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
                      <FileText className="h-5 w-5 text-blue-600 mr-2" />
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
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
                        Temperature (°F)
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
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
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
          patients={assignedPatientsData}
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
          patient={selectedPatient}
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
          patient={selectedPatient}
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

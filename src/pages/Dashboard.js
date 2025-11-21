import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Calendar, 
  Phone, 
  MessageCircle, 
  AlertTriangle, 
  User,
  Plus,
  Activity,
  Pill,
  Video,
  Shield,
  Bell,
  Settings,
  HelpCircle,
  Stethoscope,
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getUpcomingAppointments } from '../api/appointmentsAPI';
import { getLatestVitalSigns } from '../api/vitalSignsAPI';
import { getUnreadMessageCount } from '../api/messagesAPI';
import { medicationAPI } from '../api/medicationAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';

const Dashboard = () => {
  const { user, userProfile } = useUser();
  const navigate = useNavigate();
  const displayName = userProfile?.name || userProfile?.displayName || user?.displayName || user?.email || 'there';
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState({
    upcomingAppointments: [],
    latestVitalSigns: null,
    unreadMessages: 0,
    activeMedications: [],
    caregiverTasks: [],
    loading: true
  });
  
  // Call-related states
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callService] = useState(() => new CallService());

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format medical conditions for display
  const formatMedicalConditions = (conditions) => {
    if (!conditions) return [];
    return conditions.split(',').map(condition => condition.trim()).filter(condition => condition);
  };

  // Get subscription status (placeholder for now)
  const getSubscriptionStatus = () => {
    return userProfile?.subscriptionStatus || 'Premium';
  };

  // Emergency alert function
  const handleEmergencyAlert = async () => {
    try {
      const result = await emergencyAPI.triggerEmergencyAlert({
        userId: user.uid,
        type: 'medical',
        severity: 'high',
        location: userProfile?.address || 'Unknown location',
        description: 'Emergency assistance requested from client dashboard'
      });
      
      if (result.success) {
        toast.success('Emergency alert sent! Help is on the way.');
      } else {
        toast.error('Failed to send emergency alert');
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert');
    }
  };

  // Quick actions
  const quickActions = [
    {
      name: 'Request Care Visit',
      icon: Calendar,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/appointments')
    },
    {
      name: 'Record Vital Signs',
      icon: Heart,
      color: 'bg-red-600 hover:bg-red-700',
      action: () => navigate('/vital-signs')
    },
    {
      name: 'Message Caregiver',
      icon: MessageCircle,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/messages')
    },
    {
      name: 'Video Consultation',
      icon: Video,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/telemedicine')
    },
    {
      name: 'View Medications',
      icon: Pill,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/medications')
    },
    {
      name: 'Medical Documents',
      icon: FileText,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/medical-documents')
    },
    {
      name: 'Emergency Help',
      icon: AlertTriangle,
      color: 'bg-red-600 hover:bg-red-700',
      action: handleEmergencyAlert
    }
  ];

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) return;
      
      try {
        setDashboardData(prev => ({ ...prev, loading: true }));
        
        // Fetch data in parallel
        const [appointments, vitalSigns, unreadCount, medications, assignments] = await Promise.all([
          getUpcomingAppointments(user.uid, 'patient').catch(err => {
            console.warn('Failed to fetch appointments:', err);
            return [];
          }),
          getLatestVitalSigns(user.uid).catch(err => {
            console.warn('Failed to fetch vital signs:', err);
            return null;
          }),
          getUnreadMessageCount(user.uid).catch(err => {
            console.warn('Failed to fetch unread messages:', err);
            return 0;
          }),
          medicationAPI.getMedications({ clientId: user.uid, status: 'active' }).catch(err => {
            console.warn('Failed to fetch medications:', err);
            return [];
          }),
          assignmentAPI.getAssignmentsByClient(user.uid).catch(err => {
            console.warn('Failed to fetch caregiver tasks:', err);
            return [];
          })
        ]);
        
        console.log('📋 Client assignments loaded:', assignments?.length || 0);
        
        setDashboardData({
          upcomingAppointments: appointments || [],
          latestVitalSigns: vitalSigns,
          unreadMessages: unreadCount || 0,
          caregiverTasks: assignments || [],
          activeMedications: medications || [],
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, [user?.uid]);

  // Set up incoming call listener
  useEffect(() => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      return;
    }
    
    const userId = userProfile.id || userProfile.uid || user?.uid;
    console.log('🎧 Setting up call listener for user:', userId);
    
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
  }, [userProfile, user, callService]);

  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid || user?.uid;
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
      const userId = userProfile.id || userProfile.uid || user?.uid;
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

  return (
    <div className="space-y-6 text-slate-50">
      {/* Welcome + emergency row */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
        {/* Left - User Info */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">
                Welcome back
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">
                {displayName}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Your health, care team, and next steps in one place.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
              <Shield className="h-3.5 w-3.5 text-blue-300" />
              {getSubscriptionStatus()} plan
            </span>
          </div>
          <div className="mt-4 grid gap-4 text-xs text-slate-300 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-slate-400">Age</p>
              <p className="mt-1 text-sm font-medium text-slate-50">
                {userProfile?.dateOfBirth
                  ? `${calculateAge(userProfile.dateOfBirth)} years`
                  : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Emergency contact</p>
              <p className="mt-1 text-sm font-medium text-slate-50">
                {userProfile?.emergencyContactName || 'Not provided'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {userProfile?.emergencyContactPhone || 'No phone number'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] text-slate-400">Medical conditions</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {formatMedicalConditions(userProfile?.medicalConditions).length > 0 ? (
                  formatMedicalConditions(userProfile.medicalConditions).map((condition, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200"
                    >
                      {condition}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">No conditions listed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Emergency & Contact */}
        <div className="space-y-3">
          <button 
            onClick={handleEmergencyAlert}
            className="flex w-full items-center justify-between gap-3 rounded-3xl border border-rose-500/40 bg-gradient-to-r from-rose-600 to-blue-500 px-4 py-3 text-left text-xs font-medium text-white shadow-lg shadow-rose-500/40 hover:from-rose-500 hover:to-blue-400"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em]">Emergency</p>
                <p className="text-xs">Tap if you need urgent help right now.</p>
              </div>
            </div>
            <Clock className="h-4 w-4 opacity-80" />
          </button>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <button 
              className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-left text-slate-200 hover:border-blue-400/60 hover:bg-slate-900"
              onClick={() =>
                userProfile?.emergencyContactPhone &&
                window.open(`tel:${userProfile.emergencyContactPhone}`)
              }
            >
              <p className="flex items-center gap-1 text-[11px] text-slate-400">
                <Phone className="h-3.5 w-3.5 text-blue-300" />
                Family contact
              </p>
              <p className="mt-1 text-xs font-medium">
              {userProfile?.emergencyContactName || 'Family'}
              </p>
            </button>
            <button 
              className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-left text-slate-200 hover:border-blue-400/60 hover:bg-slate-900"
              onClick={() =>
                userProfile?.doctorPhone && window.open(`tel:${userProfile.doctorPhone}`)
              }
            >
              <p className="flex items-center gap-1 text-[11px] text-slate-400">
                <Stethoscope className="h-3.5 w-3.5 text-blue-300" />
                Primary doctor
              </p>
              <p className="mt-1 text-xs font-medium">
              {userProfile?.primaryCareDoctor || userProfile?.doctorName || 'Doctor'}
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
        <h3 className="text-sm font-semibold text-slate-50 sm:text-base">Quick actions</h3>
        <p className="mt-1 text-[11px] text-slate-400">
          Jump straight into the tools you use the most.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-center text-[11px] text-slate-200 hover:border-blue-400/60 hover:bg-slate-900"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-blue-300">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="line-clamp-2">{action.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <button 
          onClick={() => navigate('/appointments')}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-left text-xs text-slate-300 hover:border-blue-400/60 hover:bg-slate-900"
        >
          <Calendar className="h-4 w-4 text-blue-300" />
          <p className="mt-3 text-[11px] text-slate-400">Upcoming visits</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">
            {dashboardData.loading ? '…' : dashboardData.upcomingAppointments.length}
          </p>
        </button>
        <button 
          onClick={() => navigate('/vital-signs')}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-left text-xs text-slate-300 hover:border-blue-400/60 hover:bg-slate-900"
        >
          <Heart className="h-4 w-4 text-rose-300" />
          <p className="mt-3 text-[11px] text-slate-400">
            {dashboardData.latestVitalSigns?.type || 'Last reading'}
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-50">
            {dashboardData.loading
              ? '…'
              : dashboardData.latestVitalSigns?.type === 'Blood Pressure'
                ? dashboardData.latestVitalSigns.value 
              : dashboardData.latestVitalSigns?.value || '--'}
          </p>
        </button>
        <button 
          onClick={() => navigate('/messages')}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-left text-xs text-slate-300 hover:border-blue-400/60 hover:bg-slate-900"
        >
          <MessageCircle className="h-4 w-4 text-blue-300" />
          <p className="mt-3 text-[11px] text-slate-400">New messages</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">
            {dashboardData.loading ? '…' : dashboardData.unreadMessages}
          </p>
        </button>
        <button 
          onClick={() => navigate('/medications')}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-left text-xs text-slate-300 hover:border-violet-400/60 hover:bg-slate-900"
        >
          <Pill className="h-4 w-4 text-violet-300" />
          <p className="mt-3 text-[11px] text-slate-400">Active medications</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">
            {dashboardData.loading ? '…' : dashboardData.activeMedications.length}
          </p>
        </button>
      </div>

      {/* Upcoming Care Visits */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-50 sm:text-base">Upcoming care visits</h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Your next scheduled appointments and home visits.
        </p>
        {dashboardData.loading ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-3 rounded bg-slate-800" />
              <div className="h-3 rounded bg-slate-800/80" />
              <div className="h-3 w-1/2 rounded bg-slate-800/80" />
            </div>
          </div>
        ) : dashboardData.upcomingAppointments.length > 0 ? (
          <div className="mt-4 space-y-3">
            {dashboardData.upcomingAppointments.slice(0, 3).map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-50">
                      {appointment.type || 'Healthcare visit'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {appointment.doctorName ||
                        appointment.caregiverName ||
                        'Healthcare provider'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {appointment.scheduledTime
                        ? new Date(appointment.scheduledTime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Time TBD'}
                    </p>
                    {appointment.location && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {appointment.location}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                      appointment.status === 'scheduled'
                        ? 'bg-slate-900 text-blue-300'
                        : appointment.status === 'confirmed'
                        ? 'bg-blue-500/10 text-blue-300'
                        : appointment.status === 'pending'
                        ? 'bg-blue-500/10 text-blue-300'
                        : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    {appointment.status
                      ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)
                      : 'Scheduled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-400">
            <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-700" />
            <p>No upcoming appointments</p>
            <p className="mt-1">
              Schedule your next visit with your care team from the appointments page.
            </p>
          </div>
        )}
      </div>

      {/* Caregiver Tasks & Care Activities */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
          Care tasks & activities
        </h2>
        <p className="mt-1 text-[11px] text-slate-400">
          What your caregivers have queued up for you.
        </p>
        {dashboardData.loading ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-3 rounded bg-slate-800" />
              <div className="h-3 rounded bg-slate-800/80" />
              <div className="h-3 w-1/2 rounded bg-slate-800/80" />
            </div>
          </div>
        ) : dashboardData.caregiverTasks.length > 0 ? (
          <div className="mt-4 space-y-3">
            {dashboardData.caregiverTasks
              .filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200 hover:border-blue-400/60"
                >
                  <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-blue-300" />
                        <h3 className="text-sm font-medium text-slate-50">
                          {task.title || 'Care task'}
                        </h3>
                    </div>
                    {task.description && (
                        <p className="mb-1 text-[11px] text-slate-400">{task.description}</p>
                    )}
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {task.caregiverName && (
                          <span>
                            <User className="mr-1 inline h-3 w-3" />
                          Assigned to: {task.caregiverName}
                        </span>
                      )}
                      {task.dueDate && (
                          <span>
                            <Clock className="mr-1 inline h-3 w-3" />
                          Due: {task.dueDate} {task.dueTime && `at ${task.dueTime}`}
                        </span>
                      )}
                    </div>
                  </div>
                    <div className="ml-3 flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-medium ${
                          task.priority === 'urgent'
                            ? 'bg-rose-500/15 text-rose-300'
                            : task.priority === 'high'
                            ? 'bg-blue-500/15 text-blue-300'
                            : task.priority === 'normal'
                            ? 'bg-blue-500/15 text-blue-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {task.priority || 'Normal'} priority
                    </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-medium ${
                          task.status === 'pending'
                            ? 'bg-blue-500/15 text-blue-300'
                            : task.status === 'in_progress' || task.status === 'active'
                            ? 'bg-blue-500/15 text-blue-300'
                            : task.status === 'completed'
                            ? 'bg-blue-500/15 text-blue-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {task.status
                          ? task.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                          : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {dashboardData.caregiverTasks.filter((t) => t.status !== 'completed').length > 5 && (
              <p className="mt-2 text-center text-[11px] text-slate-400">
                +
                {dashboardData.caregiverTasks.filter((t) => t.status !== 'completed').length - 5} more
                tasks
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-400">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-700" />
            <p>No active care tasks</p>
            <p className="mt-1">Your caregiver will assign tasks as needed.</p>
          </div>
        )}
      </div>
      
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
      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleEndCall}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
            role: 'user'
          }}
          isIncoming={false}
        />
      )}
    </div>
  );
};

export default Dashboard;
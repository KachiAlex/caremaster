import React, { useState, useEffect } from 'react';
import {
  Heart,
  Calendar,
  Phone,
  MessageCircle,
  AlertTriangle,
  User,
  Pill,
  Video,
  Clock,
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
    if (Array.isArray(conditions)) return conditions.filter(c => c);
    if (typeof conditions !== 'string') return [];
    return conditions.split(',').map(condition => condition.trim()).filter(condition => condition);
  };

  // Format vital sign value for display
  const formatVitalValue = (vital) => {
    if (!vital) return '--';
    const val = vital.value;
    if (val == null) return '--';
    if (typeof val === 'object') {
      if (val.systolic != null && val.diastolic != null) return `${val.systolic}/${val.diastolic}`;
      if (typeof val === 'object' && val !== null) return '--';
      return String(val);
    }
    return val ?? '--';
  };

  // Get subscription status (placeholder for now)
  const getSubscriptionStatus = () => {
    return userProfile?.subscriptionStatus || 'Premium';
  };

  // Emergency alert function
  const handleEmergencyAlert = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to send an emergency alert');
      return;
    }
    try {
      const result = await emergencyAPI.createEmergency({
        userId: user.uid,
        type: 'medical',
        severity: 'high',
        location: userProfile?.address || 'Unknown',
        description: 'Emergency alert triggered from client dashboard',
        clientId: user.uid,
        clientName: userProfile?.name || userProfile?.displayName || 'Client',
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
      color: 'bg-green-600 hover:bg-green-700',
      action: () => navigate('/messages')
    },
    {
      name: 'Video Consultation',
      icon: Video,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => navigate('/telemedicine')
    },
    {
      name: 'View Medications',
      icon: Pill,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => navigate('/medications')
    },
    {
      name: 'Medical Documents',
      icon: FileText,
      color: 'bg-indigo-600 hover:bg-indigo-700',
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
    let isCancelled = false;
    const fetchDashboardData = async () => {
      if (!user?.uid) return;

      try {
        setDashboardData(prev => ({ ...prev, loading: true }));

        // Fetch data in parallel
        const [appointments, vitalSigns, unreadCount, medications, assignments] = await Promise.all([
          getUpcomingAppointments(user.uid, userProfile?.userType || 'elderly').catch(err => {
            console.warn('Failed to fetch appointments:', err);
            toast.error('Could not load appointments.');
            return [];
          }),
          getLatestVitalSigns(user.uid).catch(err => {
            console.warn('Failed to fetch vital signs:', err);
            toast.error('Could not load vitals.');
            return null;
          }),
          getUnreadMessageCount(user.uid).catch(err => {
            console.warn('Failed to fetch unread messages:', err);
            return 0;
          }),
          medicationAPI.getMedications({ clientId: user.uid, status: 'active' }).catch(err => {
            console.warn('Failed to fetch medications:', err);
            toast.error('Could not load medications.');
            return [];
          }),
          assignmentAPI.getAssignmentsByClient(user.uid).catch(err => {
            console.warn('Failed to fetch caregiver tasks:', err);
            toast.error('Could not load care tasks.');
            return [];
          })
        ]);

        console.log('📋 Client assignments loaded:', assignments?.length || 0);

        if (!isCancelled) {
          setDashboardData({
            upcomingAppointments: appointments || [],
            latestVitalSigns: vitalSigns,
            unreadMessages: unreadCount || 0,
            caregiverTasks: assignments || [],
            activeMedications: medications || [],
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Could not load dashboard data. Please refresh the page.');
        if (!isCancelled) {
          setDashboardData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchDashboardData();
    return () => { isCancelled = true; };
  }, [user?.uid]);

  // Set up incoming call listener
  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const userId = userProfile?.id || userProfile?.uid || user?.uid;
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
  }, [userProfile?.id, userProfile?.uid, user?.uid]);

  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile?.id || userProfile?.uid || user?.uid;
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
      const userId = userProfile?.id || userProfile?.uid || user?.uid;
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

  const visibleTasks = (dashboardData.caregiverTasks || []).filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  return (
    <>
      <div className="space-y-6">
          <div className="cm-section-head">
            <span className="cm-eyebrow">Client Portal</span>
            <h2 className="mt-2">Welcome back, {displayName}</h2>
            <p>Your personalized care dashboard.</p>
          </div>

      {/* Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - User Info */}
        <div className="cm-card p-6">
          <h2 className="cm-display text-xl text-ink mb-4">Welcome back, {displayName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft">Age</p>
              <p className="text-lg font-semibold text-ink">
                {userProfile?.dateOfBirth ? `${calculateAge(userProfile.dateOfBirth)} years` : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft">Emergency Contact</p>
              <p className="text-lg font-semibold text-ink">
                {userProfile?.emergencyContactName || 'Not provided'}
              </p>
              <p className="text-sm text-text-soft">
                {userProfile?.emergencyContactPhone || 'No phone number'}
              </p>
            </div>
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft">Subscription</p>
              <span className="inline-block bg-gold-soft/40 text-gold-deep px-3 py-1 rounded-full text-sm font-medium">
                {getSubscriptionStatus()}
              </span>
            </div>
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft">Medical Conditions</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {formatMedicalConditions(userProfile?.medicalConditions).length > 0 ? (
                  formatMedicalConditions(userProfile.medicalConditions).map((condition, index) => (
                    <span key={index} className="bg-ink/5 text-ink px-2 py-1 rounded-full text-xs">
                      {condition}
                    </span>
                  ))
                ) : (
                  <span className="text-text-soft text-xs">No conditions listed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Emergency & Contact */}
        <div className="space-y-4">
          <button
            onClick={handleEmergencyAlert}
            className="w-full bg-coral text-white py-4 px-6 rounded-xl font-bold text-lg hover:brightness-95 transition"
          >
            <AlertTriangle className="h-6 w-6 inline mr-2" />
            EMERGENCY - NEED HELP NOW
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button
              className="bg-coral-soft text-coral py-3 px-4 rounded-xl hover:brightness-95 transition"
              onClick={() => userProfile?.emergencyContactPhone && window.open(`tel:${userProfile.emergencyContactPhone}`)}
            >
              <Phone className="h-5 w-5 inline mr-2" />
              {userProfile?.emergencyContactName || 'Family'}
            </button>
            <button
              className="bg-sage-soft text-sage py-3 px-4 rounded-xl hover:brightness-95 transition"
              onClick={() => userProfile?.doctorPhone && window.open(`tel:${userProfile.doctorPhone}`)}
            >
              <Heart className="h-5 w-5 inline mr-2" />
              {userProfile?.primaryCareDoctor || userProfile?.doctorName || 'Doctor'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="cm-card p-6">
        <h3 className="cm-display text-lg text-ink mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button
          onClick={() => navigate('/appointments')}
          className="cm-card p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-ink">
            {dashboardData.loading ? '...' : dashboardData.upcomingAppointments.length}
          </div>
          <div className="text-sm text-text-soft">Upcoming Visits</div>
        </button>
        <button
          onClick={() => navigate('/vital-signs')}
          className="cm-card p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <Heart className="h-8 w-8 text-coral mx-auto mb-2" />
          <div className="text-2xl font-bold text-ink">
            {dashboardData.loading ? '...' : formatVitalValue(dashboardData.latestVitalSigns)}
          </div>
          <div className="text-sm text-text-soft">
            {dashboardData.latestVitalSigns?.type || 'Last Reading'}
          </div>
        </button>
        <button
          onClick={() => navigate('/messages')}
          className="cm-card p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <MessageCircle className="h-8 w-8 text-sage mx-auto mb-2" />
          <div className="text-2xl font-bold text-ink">
            {dashboardData.loading ? '...' : dashboardData.unreadMessages}
          </div>
          <div className="text-sm text-text-soft">New Messages</div>
        </button>
        <button
          onClick={() => navigate('/medications')}
          className="cm-card p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <Pill className="h-8 w-8 text-gold-deep mx-auto mb-2" />
          <div className="text-2xl font-bold text-ink">
            {dashboardData.loading ? '...' : dashboardData.activeMedications.length}
          </div>
          <div className="text-sm text-text-soft">Active Medications</div>
        </button>
      </div>

      {/* Upcoming Care Visits */}
      <div className="cm-card p-6">
        <h2 className="cm-display text-lg text-ink mb-4">Upcoming Care Visits</h2>
        {dashboardData.loading ? (
          <div className="bg-white border border-ink/8 rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-ink/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-ink/10 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-ink/10 rounded w-1/3"></div>
            </div>
          </div>
        ) : dashboardData.upcomingAppointments.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.upcomingAppointments.slice(0, 3).map((appointment) => (
              <div key={appointment.id} className="bg-white border border-ink/8 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-ink">
                      {appointment.type || 'Healthcare Visit'}
                    </h3>
                    <p className="text-sm text-text-soft">
                      {appointment.doctorName || appointment.caregiverName || 'Healthcare Provider'}
                    </p>
                    <p className="text-sm text-text-soft">
                      {appointment.scheduledTime ?
                        new Date(appointment.scheduledTime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        }) : 'Time TBD'
                      }
                    </p>
                    {appointment.location && (
                      <p className="text-sm text-text-soft">{appointment.location}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Scheduled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-ink/8 rounded-lg p-4 text-center text-text-soft">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-ink/20" />
            <p>No upcoming appointments</p>
            <p className="text-sm">Schedule your next visit with a caregiver</p>
          </div>
        )}
      </div>

      {/* Caregiver Tasks & Care Activities */}
      <div className="cm-card p-6">
        <h2 className="cm-display text-lg text-ink mb-4">Care Tasks & Activities</h2>
        {dashboardData.loading ? (
          <div className="bg-white border border-ink/8 rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-ink/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-ink/10 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-ink/10 rounded w-1/3"></div>
            </div>
          </div>
        ) : dashboardData.caregiverTasks.length > 0 ? (
          <div className="space-y-3">
            {visibleTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="bg-white border border-l-4 border-l-gold rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gold-deep" />
                      <h3 className="font-semibold text-ink">{task.title || 'Care Task'}</h3>
                    </div>
                    {task.description && (
                      <p className="text-sm text-text-soft mb-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm">
                      {task.caregiverName && (
                        <span className="text-text-soft">
                          <User className="h-3 w-3 inline mr-1" />
                          Assigned to: {task.caregiverName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-text-soft">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Due: {task.dueDate} {task.dueTime && `at ${task.dueTime}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      task.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority || 'Normal'} Priority
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      task.status === 'in_progress' || task.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status ? task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {visibleTasks.length > 5 && (
              <p className="text-sm text-text-soft text-center mt-2">
                + {visibleTasks.length - 5} more tasks
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white border border-ink/8 rounded-lg p-4 text-center text-text-soft">
            <FileText className="h-12 w-12 mx-auto mb-2 text-ink/20" />
            <p>No active care tasks</p>
            <p className="text-sm">Your caregiver will assign tasks as needed</p>
          </div>
        )}
      </div>
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
    </>
  );
};

export default Dashboard;

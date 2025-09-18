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
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

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
    loading: true
  });

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
    const fetchDashboardData = async () => {
      if (!user?.uid) return;
      
      try {
        setDashboardData(prev => ({ ...prev, loading: true }));
        
        // Fetch data in parallel
        const [appointments, vitalSigns, unreadCount, medications] = await Promise.all([
          getUpcomingAppointments(user.uid, 'elderly').catch(err => {
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
          medicationAPI.getMedications({ patientId: user.uid, status: 'active' }).catch(err => {
            console.warn('Failed to fetch medications:', err);
            return [];
          })
        ]);
        
        setDashboardData({
          upcomingAppointments: appointments || [],
          latestVitalSigns: vitalSigns,
          unreadMessages: unreadCount || 0,
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - User Info */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Welcome back, {displayName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="text-lg font-semibold text-gray-900">
                {userProfile?.dateOfBirth ? `${calculateAge(userProfile.dateOfBirth)} years` : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Emergency Contact</p>
              <p className="text-lg font-semibold text-gray-900">
                {userProfile?.emergencyContactName || 'Not provided'}
              </p>
              <p className="text-sm text-gray-600">
                {userProfile?.emergencyContactPhone || 'No phone number'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Subscription</p>
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {getSubscriptionStatus()}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Medical Conditions</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {formatMedicalConditions(userProfile?.medicalConditions).length > 0 ? (
                  formatMedicalConditions(userProfile.medicalConditions).map((condition, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                      {condition}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs">No conditions listed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Emergency & Contact */}
        <div className="space-y-4">
          <button 
            onClick={handleEmergencyAlert}
            className="w-full bg-red-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="h-6 w-6 inline mr-2" />
            EMERGENCY - NEED HELP NOW
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button 
              className="bg-orange-100 text-orange-700 py-3 px-4 rounded-lg hover:bg-orange-200 transition-colors"
              onClick={() => userProfile?.emergencyContactPhone && window.open(`tel:${userProfile.emergencyContactPhone}`)}
            >
              <Phone className="h-5 w-5 inline mr-2" />
              {userProfile?.emergencyContactName || 'Family'}
            </button>
            <button 
              className="bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors"
              onClick={() => userProfile?.doctorPhone && window.open(`tel:${userProfile.doctorPhone}`)}
            >
              <Heart className="h-5 w-5 inline mr-2" />
              {userProfile?.primaryCareDoctor || userProfile?.doctorName || 'Doctor'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
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
          className="card text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {dashboardData.loading ? '...' : dashboardData.upcomingAppointments.length}
          </div>
          <div className="text-sm text-gray-500">Upcoming Visits</div>
        </button>
        <button 
          onClick={() => navigate('/vital-signs')}
          className="card text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {dashboardData.loading ? '...' : (
              dashboardData.latestVitalSigns?.type === 'Blood Pressure' 
                ? dashboardData.latestVitalSigns.value 
                : dashboardData.latestVitalSigns?.value || '--'
            )}
          </div>
          <div className="text-sm text-gray-500">
            {dashboardData.latestVitalSigns?.type || 'Last Reading'}
          </div>
        </button>
        <button 
          onClick={() => navigate('/messages')}
          className="card text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {dashboardData.loading ? '...' : dashboardData.unreadMessages}
          </div>
          <div className="text-sm text-gray-500">New Messages</div>
        </button>
        <button 
          onClick={() => navigate('/medications')}
          className="card text-center hover:shadow-md transition-shadow cursor-pointer"
        >
          <Pill className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {dashboardData.loading ? '...' : dashboardData.activeMedications.length}
          </div>
          <div className="text-sm text-gray-500">Active Medications</div>
        </button>
      </div>

      {/* Upcoming Care Visits */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Care Visits</h2>
        {dashboardData.loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ) : dashboardData.upcomingAppointments.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.upcomingAppointments.slice(0, 3).map((appointment) => (
              <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {appointment.type || 'Healthcare Visit'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {appointment.doctorName || appointment.caregiverName || 'Healthcare Provider'}
                    </p>
                    <p className="text-sm text-gray-600">
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
                      <p className="text-sm text-gray-600">{appointment.location}</p>
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
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No upcoming appointments</p>
            <p className="text-sm">Schedule your next visit with a caregiver</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
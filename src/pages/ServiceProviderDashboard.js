import React, { useState, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getPatientsByCaregiver, 
  getPatientsByDoctor, 
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
import { 
  getUnreadMessageCount, 
  getConversationsByUser 
} from '../api/messagesAPI';
import { 
  getUnreadNotificationCount, 
  getNotificationsByUser 
} from '../api/notificationsAPI';

// Shared Components
const DashboardHeader = ({ userProfile, userRole }) => {
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
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{userProfile?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {userProfile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickStats = ({ userRole, stats, loading }) => {
  const getStatsForRole = () => {
    if (userRole === 'doctor') {
      return [
        { label: 'Patients', value: stats.patients || 0, icon: Users, color: 'blue' },
        { label: 'Today\'s Appointments', value: stats.todaysAppointments || 0, icon: Calendar, color: 'green' },
        { label: 'Upcoming', value: stats.upcomingAppointments || 0, icon: Clock, color: 'purple' },
        { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, color: 'orange' },
      ];
    } else if (userRole === 'caregiver') {
      return [
        { label: 'Assigned Patients', value: stats.patients || 0, icon: Users, color: 'blue' },
        { label: 'Today\'s Tasks', value: stats.todaysTasks || 0, icon: ClipboardList, color: 'green' },
        { label: 'Pending Tasks', value: stats.pendingTasks || 0, icon: Clock, color: 'purple' },
        { label: 'Unread Messages', value: stats.unreadMessages || 0, icon: MessageSquare, color: 'orange' },
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

        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
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
const DoctorSpecificSections = ({ userProfile }) => {
  const [recentPatients, setRecentPatients] = useState([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState([]);

  useEffect(() => {
    // Mock data - replace with real API calls
    setRecentPatients([
      { id: 1, name: 'Adunni Okafor', lastVisit: '2024-01-20', condition: 'Hypertension', status: 'stable' },
      { id: 2, name: 'Grace Johnson', lastVisit: '2024-01-19', condition: 'Diabetes', status: 'improving' },
    ]);
    
    setUpcomingConsultations([
      { id: 1, patient: 'Samuel Adekunle', time: '10:00 AM', type: 'Follow-up' },
      { id: 2, patient: 'Maryam Ibrahim', time: '2:00 PM', type: 'Initial Consultation' },
    ]);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Recent Patients */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Patients</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                  <p className="text-xs text-gray-500">{patient.condition}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{patient.lastVisit}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    patient.status === 'stable' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {patient.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Consultations */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Consultations</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {upcomingConsultations.map((consultation) => (
              <div key={consultation.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{consultation.patient}</p>
                  <p className="text-xs text-gray-500">{consultation.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{consultation.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Caregiver-Specific Components
const CaregiverSpecificSections = ({ userProfile }) => {
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    // Mock data - replace with real API calls
    setTodayTasks([
      { id: 1, patient: 'Adunni Okafor', task: 'Morning medication', time: '8:00 AM', completed: false },
      { id: 2, patient: 'Grace Johnson', task: 'Physical therapy', time: '10:00 AM', completed: true },
    ]);
    
    setRecentUpdates([
      { id: 1, patient: 'Samuel Adekunle', type: 'Photo Update', time: '2 hours ago' },
      { id: 2, patient: 'Maryam Ibrahim', type: 'Care Log', time: '4 hours ago' },
    ]);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Today's Tasks */}
      <div className="bg-white rounded-lg shadow">
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
                    checked={task.completed}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.task}</p>
                    <p className="text-xs text-gray-500">{task.patient}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{task.time}</p>
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
            {recentUpdates.map((update) => (
              <div key={update.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{update.type}</p>
                  <p className="text-xs text-gray-500">{update.patient}</p>
                </div>
                <p className="text-xs text-gray-500">{update.time}</p>
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
  const [stats, setStats] = useState({
    patients: 0,
    todaysAppointments: 0,
    upcomingAppointments: 0,
    todaysTasks: 0,
    pendingTasks: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!userProfile || !userRole) return;
      
      try {
        setLoading(true);
        
        const promises = [];
        
        // Load patients
        if (userRole === 'doctor') {
          promises.push(getPatientsByDoctor(userProfile.id));
        } else if (userRole === 'caregiver') {
          promises.push(getPatientsByCaregiver(userProfile.id));
        } else {
          promises.push(Promise.resolve([]));
        }
        
        // Load appointments
        promises.push(getTodaysAppointments(userProfile.id, userRole));
        promises.push(getUpcomingAppointments(userProfile.id, userRole));
        
        // Load tasks (for caregivers)
        if (userRole === 'caregiver') {
          promises.push(getTodaysCareTasks(userProfile.id));
          promises.push(getPendingCareTasks(userProfile.id));
        } else {
          promises.push(Promise.resolve([]));
          promises.push(Promise.resolve([]));
        }
        
        // Load messages
        promises.push(getUnreadMessageCount(userProfile.id));
        
        const [
          patients,
          todaysAppointments,
          upcomingAppointments,
          todaysTasks,
          pendingTasks,
          unreadMessages
        ] = await Promise.all(promises);
        
        setStats({
          patients: patients.length,
          todaysAppointments: todaysAppointments.length,
          upcomingAppointments: upcomingAppointments.length,
          todaysTasks: todaysTasks.length,
          pendingTasks: pendingTasks.length,
          unreadMessages,
        });
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userProfile, userRole]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader userProfile={userProfile} userRole={userRole} />
      <QuickStats userRole={userRole} stats={stats} loading={loading} />
      
      {userRole === 'doctor' && (
        <DoctorSpecificSections userProfile={userProfile} />
      )}
      
      {userRole === 'caregiver' && (
        <div className="p-6">
          <SpecializedCaregiverDashboard />
          <div className="mt-6">
            <CaregiverSpecificSections userProfile={userProfile} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceProviderDashboard;

import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
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
    switch (userRole) {
      case 'doctor': return 'Medical Dashboard';
      case 'caregiver': return 'Care Dashboard';
      default: return 'Service Provider Dashboard';
    }
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

const QuickStats = ({ userRole, stats }) => {
  const getStatsForRole = () => {
    if (userRole === 'doctor') {
      return [
        { label: 'Patients', value: stats.patients || 0, icon: Users, color: 'blue' },
        { label: 'Consultations', value: stats.consultations || 0, icon: Stethoscope, color: 'green' },
        { label: 'Prescriptions', value: stats.prescriptions || 0, icon: Pill, color: 'purple' },
        { label: 'Appointments', value: stats.appointments || 0, icon: Calendar, color: 'orange' },
      ];
    } else if (userRole === 'caregiver') {
      return [
        { label: 'Assigned Patients', value: stats.patients || 0, icon: Users, color: 'blue' },
        { label: 'Tasks Completed', value: stats.tasksCompleted || 0, icon: ClipboardList, color: 'green' },
        { label: 'Photo Updates', value: stats.photoUpdates || 0, icon: Camera, color: 'purple' },
        { label: 'Hours Worked', value: stats.hoursWorked || 0, icon: Clock, color: 'orange' },
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
  const { userProfile, userRole, loading } = useUser();
  const [stats, setStats] = useState({
    patients: 0,
    consultations: 0,
    prescriptions: 0,
    appointments: 0,
    tasksCompleted: 0,
    photoUpdates: 0,
    hoursWorked: 0,
  });

  useEffect(() => {
    // Mock stats - replace with real API calls
    if (userRole === 'doctor') {
      setStats({
        patients: 12,
        consultations: 8,
        prescriptions: 15,
        appointments: 6,
      });
    } else if (userRole === 'caregiver') {
      setStats({
        patients: 5,
        tasksCompleted: 12,
        photoUpdates: 8,
        hoursWorked: 32,
      });
    }
  }, [userRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <QuickStats userRole={userRole} stats={stats} />
      
      {userRole === 'doctor' && (
        <DoctorSpecificSections userProfile={userProfile} />
      )}
      
      {userRole === 'caregiver' && (
        <CaregiverSpecificSections userProfile={userProfile} />
      )}
    </div>
  );
};

export default ServiceProviderDashboard;

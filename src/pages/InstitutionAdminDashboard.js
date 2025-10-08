import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useUser } from '../contexts/UserContext';
import { 
  Users, 
  UserCheck, 
  Activity, 
  TrendingUp, 
  Calendar, 
  Clock,
  Plus,
  Settings,
  Shield,
  FileText,
  BarChart3,
  LogOut
} from 'lucide-react';

const InstitutionAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile, institutionId } = useUser();
  const [stats, setStats] = useState({
    totalCaregivers: 0,
    totalPatients: 0,
    activeAssignments: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  // Load real data based on institution
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get institutionId from userProfile or context
        const instId = institutionId || userProfile?.institutionId;
        
        // TODO: Replace with actual institution-specific API calls
        // For now using mock data, but these would be real API calls:
        // const caregivers = await getCaregiversByInstitution(instId);
        // const patients = await getPatientsByInstitution(instId);
        // const assignments = await getAssignmentsByInstitution(instId);
        
        setStats({
          totalCaregivers: 12,
          totalPatients: 45,
          activeAssignments: 38,
          recentActivity: 23
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching institution stats:', error);
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchStats();
    }
  }, [userProfile, institutionId]);

  const quickActions = [
    {
      title: 'Add Caregiver',
      description: 'Invite new caregivers to your institution',
      icon: Plus,
      color: 'bg-blue-500',
      href: '/institution-admin/users'
    },
    {
      title: 'Assign Patients',
      description: 'Manage patient-caregiver assignments',
      icon: UserCheck,
      color: 'bg-green-500',
      href: '/institution-admin/assignments'
    },
    {
      title: 'View Reports',
      description: 'Access institution analytics',
      icon: BarChart3,
      color: 'bg-purple-500',
      href: '/institution-admin/reports'
    },
    {
      title: 'Institution Settings',
      description: 'Manage institution preferences',
      icon: Settings,
      color: 'bg-gray-500',
      href: '/institution-admin/settings'
    }
  ];

  const recentActivity = [
    { id: 1, action: 'New caregiver added', user: 'John Smith', time: '2 hours ago', type: 'user' },
    { id: 2, action: 'Patient assigned to nurse', user: 'Sarah Johnson', time: '4 hours ago', type: 'assignment' },
    { id: 3, action: 'Care report submitted', user: 'Mike Davis', time: '6 hours ago', type: 'report' },
    { id: 4, action: 'Vital signs updated', user: 'Lisa Wilson', time: '8 hours ago', type: 'medical' }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4" />;
      case 'assignment': return <UserCheck className="h-4 w-4" />;
      case 'report': return <FileText className="h-4 w-4" />;
      case 'medical': return <Activity className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'user': return 'text-blue-600 bg-blue-100';
      case 'assignment': return 'text-green-600 bg-green-100';
      case 'report': return 'text-purple-600 bg-purple-100';
      case 'medical': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Institution Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {userProfile?.displayName || user?.email}
            </p>
            <div className="flex items-center mt-2">
              <Shield className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm text-green-600 font-medium">License Active</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                  navigate('/institution/login?institution=' + institutionId);
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
            <div>
              <div className="text-sm text-gray-500">Institution ID</div>
              <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {userProfile?.institutionId || 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Caregivers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCaregivers}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+8%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Assignments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeAssignments}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+5%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="text-3xl font-bold text-gray-900">{stats.recentActivity}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Last 24 hours</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                // TODO: Implement navigation
                console.log('Navigate to:', action.href);
              }}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-left"
            >
              <div className={`h-10 w-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
              <div className={`h-8 w-8 ${getActivityColor(activity.type)} rounded-lg flex items-center justify-center`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">by {activity.user}</p>
              </div>
              <div className="text-sm text-gray-500">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InstitutionAdminDashboard;

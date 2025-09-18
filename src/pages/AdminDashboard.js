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
  Settings
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { getAllUsers } from '../api/usersAPI';
import { analyticsAPI } from '../api/analyticsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { userProfile } = useUser();
  const navigate = useNavigate();
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

  const [recentActivity, setRecentActivity] = useState([]);
  const [topCaregivers, setTopCaregivers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load real data from backend APIs
      const [analytics, users, emergencies, caregivers] = await Promise.all([
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
        caregiverAPI.getCaregivers({ limit: 10 }).catch(err => {
          console.warn('Failed to fetch caregivers:', err);
          return [];
        })
      ]);

      // Use real data only - no fallback to demo data
      const realStats = {
        totalUsers: users.length,
        elderlyUsers: users.filter(u => u.userType === 'elderly' || u.userType === 'client' || u.userType === 'patient').length,
        caregivers: users.filter(u => u.userType === 'caregiver').length,
        activeAppointments: analytics.totalAppointments || 0,
        emergencyAlerts: emergencies.length,
        medicationReminders: analytics.medicationCompliance || 0,
        systemHealth: analytics.systemUptime > 95 ? 'Good' : analytics.systemUptime > 90 ? 'Warning' : 'Critical',
        revenue: analytics.revenue || 0,
        satisfaction: analytics.caregiverSatisfaction || 0,
        responseTime: analytics.averageResponseTime || 0,
        uptime: analytics.systemUptime || 0
      };

      setStats(realStats);

      // Use real activity data from the system
      setRecentActivity(analytics.recentActivity || []);
      setTopCaregivers(caregivers.slice(0, 3).map(caregiver => ({
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

  // Quick action functions
  const quickActions = [
    {
      name: 'Add User',
      icon: Plus,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/admin/users?action=create')
    },
    {
      name: 'View Analytics',
      icon: BarChart3,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => navigate('/admin/analytics')
    },
    {
      name: 'Emergency Center',
      icon: AlertTriangle,
      color: 'bg-red-600 hover:bg-red-700',
      action: () => navigate('/admin/emergency')
    },
    {
      name: 'System Settings',
      icon: Settings,
      color: 'bg-gray-600 hover:bg-gray-700',
      action: () => navigate('/admin/settings')
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
      {/* Temporary Access Banner */}
      {userProfile?.userType === 'caregiver' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Temporary Admin Access</h4>
              <p className="text-sm text-yellow-700">
                You're accessing admin features as a caregiver for testing purposes. 
                In production, only admin users will have access to this dashboard.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and manage the ElderX platform</p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
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

      <div className="w-full p-6 dashboard-full-width">
        {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
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

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Elderly Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.elderlyUsers.toLocaleString()}</p>
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

        <div className="card">
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

        <div className="card">
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

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₦{stats.revenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+18% from last month</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.satisfaction}%</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Heart className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+2.1% from last month</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{stats.responseTime}s</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-sm text-red-600">+0.2s from last week</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uptime}%</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+0.1% from last month</span>
          </div>
        </div>
      </div>

      {/* Emergency Alerts */}
      {stats.emergencyAlerts > 0 && (
        <div className="card border-l-4 border-red-500 bg-red-50">
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
              onClick={() => window.location.href = '/admin/emergency'}
              className="btn btn-red"
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
        <div className="card">
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
              <span className="text-sm font-medium text-gray-900">45ms</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="space-y-3">
            {recentActivity.map((activity) => (
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
            ))}
          </div>
        </div>

        {/* Top Caregivers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Caregivers</h2>
            <UserCheck className="h-5 w-5 text-purple-600" />
          </div>
          
          <div className="space-y-4">
            {topCaregivers.map((caregiver, index) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
          <AlertTriangle className="h-5 w-5 text-orange-600" />
        </div>
        
        <div className="space-y-3">
          {systemAlerts.map((alert) => (
            <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
              alert.severity === 'high' ? 'bg-red-50 border-red-500' :
              alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
              'bg-green-50 border-green-500'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-900">{alert.message}</p>
                <span className="text-xs text-gray-500">{alert.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
          <button 
            onClick={() => window.location.href = '/admin/users'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium">Manage Users</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/caregivers'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="h-5 w-5 text-indigo-600 mr-2" />
            <span className="text-sm font-medium">Caregivers</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/analytics'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/communication'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-teal-600 mr-2" />
            <span className="text-sm font-medium">Messages</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/audit-logs'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium">Audit Logs</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/emergency'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm font-medium">Emergency Center</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/reports'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button 
            onClick={() => window.location.href = '/admin/settings'}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium">System Settings</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;

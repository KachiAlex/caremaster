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
  Mail
} from 'lucide-react';

const AdminDashboard = () => {
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

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      try {
        // In a real app, this would fetch from your API
        setTimeout(() => {
          setStats({
            totalUsers: 1247,
            elderlyUsers: 892,
            caregivers: 355,
            activeAppointments: 23,
            emergencyAlerts: 2,
            medicationReminders: 156,
            systemHealth: 'Good',
            revenue: 45680,
            satisfaction: 94.5,
            responseTime: 2.3,
            uptime: 99.8
          });

          setRecentActivity([
            {
              id: 1,
              type: 'emergency',
              message: 'Emergency alert from Adunni Okafor',
              time: '2 minutes ago',
              status: 'active'
            },
            {
              id: 2,
              type: 'appointment',
              message: 'New appointment scheduled with Dr. Kemi',
              time: '15 minutes ago',
              status: 'completed'
            },
            {
              id: 3,
              type: 'medication',
              message: 'Medication reminder sent to 12 users',
              time: '1 hour ago',
              status: 'completed'
            },
            {
              id: 4,
              type: 'user',
              message: 'New caregiver registered: Tunde Adebayo',
              time: '2 hours ago',
              status: 'completed'
            }
          ]);

          setTopCaregivers([
            {
              id: 1,
              name: 'Sarah Johnson',
              rating: 4.9,
              patientsServed: 12,
              tasksCompleted: 145,
              responseTime: 2.1,
              avatar: null
            },
            {
              id: 2,
              name: 'Michael Adebayo',
              rating: 4.8,
              patientsServed: 10,
              tasksCompleted: 132,
              responseTime: 2.3,
              avatar: null
            },
            {
              id: 3,
              name: 'Grace Okafor',
              rating: 4.7,
              patientsServed: 8,
              tasksCompleted: 118,
              responseTime: 2.5,
              avatar: null
            }
          ]);

          setSystemAlerts([
            {
              id: 1,
              type: 'warning',
              message: 'High server load detected',
              time: '5 minutes ago',
              severity: 'medium'
            },
            {
              id: 2,
              type: 'info',
              message: 'Database backup completed',
              time: '1 hour ago',
              severity: 'low'
            },
            {
              id: 3,
              type: 'success',
              message: 'New caregiver verification completed',
              time: '2 hours ago',
              severity: 'low'
            }
          ]);

          setLastUpdated(new Date());
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const refreshData = () => {
    setLoading(true);
    loadDashboardData();
  };

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
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and manage the ElderX platform</p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">System Healthy</span>
          </div>
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { 
  Users, 
  Building2, 
  FileText, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  Shield,
  Settings,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInstitutions: 0,
    activeInstitutions: 0,
    totalLicenses: 0,
    activeLicenses: 0,
    expiringLicenses: 0,
    totalRevenue: 0,
    totalUsers: 0,
    activeUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load institutions
      const institutionsSnapshot = await getDocs(collection(db, 'institutions'));
      const institutions = institutionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeInstitutions = institutions.filter(i => i.active !== false);

      // Load licenses
      const licensesSnapshot = await getDocs(collection(db, 'licenses'));
      const licenses = licensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeLicenses = licenses.filter(l => l.active !== false);
      
      // Check for expiring licenses (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringLicenses = licenses.filter(l => {
        if (!l.endsAt) return false;
        const endDate = new Date(l.endsAt);
        const now = new Date();
        return endDate > now && endDate <= thirtyDaysFromNow;
      });

      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeUsers = users.filter(u => u.active !== false);

      // Calculate revenue (mock calculation based on license plans)
      const revenue = licenses.reduce((total, license) => {
        const planPrices = { basic: 100, standard: 250, enterprise: 500 };
        return total + (planPrices[license.plan] || 0) * (license.seats || 10);
      }, 0);

      // Load recent activity (audit logs)
      const auditQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const auditSnapshot = await getDocs(auditQuery);
      const activities = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));

      // Generate alerts
      const generatedAlerts = [];
      
      if (expiringLicenses.length > 0) {
        generatedAlerts.push({
          type: 'warning',
          message: `${expiringLicenses.length} license(s) expiring within 30 days`,
          action: 'View Licenses'
        });
      }

      const expiredLicenses = licenses.filter(l => {
        if (!l.endsAt) return false;
        return new Date(l.endsAt) < new Date();
      });

      if (expiredLicenses.length > 0) {
        generatedAlerts.push({
          type: 'error',
          message: `${expiredLicenses.length} expired license(s) require renewal`,
          action: 'View Licenses'
        });
      }

      const inactiveInstitutions = institutions.filter(i => i.active === false);
      if (inactiveInstitutions.length > 0) {
        generatedAlerts.push({
          type: 'info',
          message: `${inactiveInstitutions.length} inactive institution(s)`,
          action: 'View Institutions'
        });
      }

      setStats({
        totalInstitutions: institutions.length,
        activeInstitutions: activeInstitutions.length,
        totalLicenses: licenses.length,
        activeLicenses: activeLicenses.length,
        expiringLicenses: expiringLicenses.length,
        totalRevenue: revenue,
        totalUsers: users.length,
        activeUsers: activeUsers.length
      });

      setRecentActivity(activities);
      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/super-admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`mt-2 flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const AlertBanner = ({ type, message, action }) => {
    const styles = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800'
    };

    const icons = {
      warning: <AlertCircle className="h-5 w-5" />,
      error: <XCircle className="h-5 w-5" />,
      info: <Activity className="h-5 w-5" />,
      success: <CheckCircle className="h-5 w-5" />
    };

    return (
      <div className={`p-4 rounded-lg border ${styles[type]} flex items-center justify-between`}>
        <div className="flex items-center">
          <div className="mr-3">{icons[type]}</div>
          <p className="text-sm font-medium">{message}</p>
        </div>
        {action && (
          <button 
            onClick={() => navigate('/super-admin')}
            className="text-sm font-semibold hover:underline"
          >
            {action} →
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Portal</h1>
                <p className="text-sm text-gray-600">System-wide management and monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/super-admin/licensing')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Licensing Console
              </button>
              <button
                onClick={() => navigate('/super-admin/settings')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert, index) => (
              <AlertBanner key={index} {...alert} />
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Building2}
            label="Active Institutions"
            value={stats.activeInstitutions}
            trend={5}
            color="blue"
          />
          <StatCard
            icon={FileText}
            label="Active Licenses"
            value={stats.activeLicenses}
            trend={3}
            color="green"
          />
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            trend={8}
            color="purple"
          />
          <StatCard
            icon={DollarSign}
            label="Monthly Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            trend={12}
            color="emerald"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Institutions</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalInstitutions}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.expiringLicenses}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/super-admin/licensing')}
              className="flex flex-col items-center p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Building2 className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Manage Institutions</span>
            </button>

            <button
              onClick={() => navigate('/super-admin/licensing')}
              className="flex flex-col items-center p-4 rounded-lg border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Issue License</span>
            </button>

            <button
              onClick={() => navigate('/super-admin/licensing')}
              className="flex flex-col items-center p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Assign Admin</span>
            </button>

            <button
              onClick={() => navigate('/super-admin/settings')}
              className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-8 w-8 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">System Settings</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.type?.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.email || activity.userId || 'System'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;


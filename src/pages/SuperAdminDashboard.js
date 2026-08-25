import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authManager from '../utils/authManager';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
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
  DollarSign,
  Eye
} from 'lucide-react';
import FontSizeToggle from '../components/FontSizeToggle';
import { collection, query, getDocs, orderBy, limit, onSnapshot } from 'backend/database';
import { db } from '../backend/config';
import DashboardLayout from '../components/DashboardLayout';

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
  const [chartData, setChartData] = useState({
    revenueTrend: [],
    institutionGrowth: [],
    licenseDistribution: [],
    userGrowth: []
  });
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Session info for the top bar / sidebar
  const session = authManager.getRoleSession('super-admin');
  const displayName = session?.displayName || session?.email || 'Super Admin';
  const userEmail = session?.email || '';

  useEffect(() => {
    let institutionsData = [];
    let licensesData = [];
    let usersData = [];

    // Set up real-time listeners
    const unsubscribeInstitutions = onSnapshot(
      collection(db, 'institutions'),
      (snapshot) => {
        institutionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeInstitutions = institutionsData.filter(i => i.active !== false);
        setStats(prev => ({
          ...prev,
          totalInstitutions: institutionsData.length,
          activeInstitutions: activeInstitutions.length
        }));
        // Update chart data
        if (usersData.length > 0 && licensesData.length > 0) {
          prepareChartData(institutionsData, licensesData, usersData);
        }
      }
    );

    const unsubscribeLicenses = onSnapshot(
      collection(db, 'licenses'),
      (snapshot) => {
        licensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeLicenses = licensesData.filter(l => l.active !== false);
        
        // Calculate revenue
        const revenue = licensesData.reduce((total, license) => {
          const planPrices = { basic: 100, standard: 250, professional: 400, enterprise: 500 };
          return total + (planPrices[license.plan] || 0) * (license.seats || 10);
        }, 0);
        
        setStats(prev => ({
          ...prev,
          totalLicenses: licensesData.length,
          activeLicenses: activeLicenses.length,
          revenue
        }));
        
        // Update chart data
        if (institutionsData.length > 0 && usersData.length > 0) {
          prepareChartData(institutionsData, licensesData, usersData);
        }
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeUsers = usersData.filter(u => u.active !== false);
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length,
          activeUsers: activeUsers.length
        }));
        // Update chart data
        if (institutionsData.length > 0 && licensesData.length > 0) {
          prepareChartData(institutionsData, licensesData, usersData);
        }
      }
    );

    const unsubscribeAuditLogs = onSnapshot(
      query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(10)
      ),
      (snapshot) => {
        const activities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));
        setRecentActivity(activities);
      }
    );

    // Initial load
    loadDashboardData();

    // Cleanup listeners on unmount
    return () => {
      unsubscribeInstitutions();
      unsubscribeLicenses();
      unsubscribeUsers();
      unsubscribeAuditLogs();
    };
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

      // Prepare chart data
      prepareChartData(institutions, licenses, users);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (institutions, licenses, users) => {
    // Helper to get month key from date
    const getMonthKey = (date) => {
      const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // Revenue Trend (last 6 months)
    const revenueTrend = [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = getMonthKey(date);
      months.push(monthKey);
      
      const monthLicenses = licenses.filter(l => {
        if (!l.createdAt) return false;
        const licenseMonth = getMonthKey(l.createdAt);
        return licenseMonth === monthKey;
      });
      
      const monthRevenue = monthLicenses.reduce((total, license) => {
        const planPrices = { basic: 100, standard: 250, professional: 400, enterprise: 500 };
        return total + (planPrices[license.plan] || 0) * (license.seats || 10);
      }, 0);
      
      revenueTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue
      });
    }

    // Institution Growth (last 6 months)
    const institutionGrowth = [];
    months.forEach(monthKey => {
      const monthInstitutions = institutions.filter(i => {
        if (!i.createdAt) return false;
        const instMonth = getMonthKey(i.createdAt);
        return instMonth === monthKey;
      });
      
      const date = new Date(monthKey + '-01');
      institutionGrowth.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthInstitutions.length
      });
    });

    // License Distribution by Plan
    const planCounts = {};
    licenses.forEach(license => {
      const plan = license.plan || 'unknown';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });
    const licenseDistribution = Object.entries(planCounts).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: count
    }));

    // User Growth (last 6 months)
    const userGrowth = [];
    months.forEach(monthKey => {
      const monthUsers = users.filter(u => {
        if (!u.createdAt) return false;
        const userMonth = getMonthKey(u.createdAt);
        return userMonth === monthKey;
      });
      
      const date = new Date(monthKey + '-01');
      userGrowth.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: monthUsers.length
      });
    });

    setChartData({
      revenueTrend,
      institutionGrowth,
      licenseDistribution,
      userGrowth
    });
  };

  const handleLogout = async () => {
    try {
      await authManager.signOutFromRole('super-admin');
      navigate('/super-admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'licensing', label: 'Licensing', icon: FileText, route: '/super-admin/licensing' },
    { id: 'users', label: 'Users', icon: Users, route: '/super-admin/users' },
    { id: 'audit-logs', label: 'Audit Logs', icon: Eye, route: '/super-admin/audit-logs' },
    { id: 'settings', label: 'Settings', icon: Settings, route: '/super-admin/settings' },
    { id: 'management', label: 'Manage Admins', icon: Shield, route: '/super-admin/management' },
  ];

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Dashboard';

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.route) {
      navigate(tab.route);
    }
  };

  const StatCard = ({ icon: Icon, label, value, trend, accent = 'from-sage to-ink' }) => (
    <div className="cm-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="cm-stat-label">{label}</p>
          <p className="cm-stat-value">{value}</p>
          {trend && (
            <div className={`mt-2 flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{Math.abs(trend)}% {trend > 0 ? 'increase' : 'decrease'}</span>
            </div>
          )}
        </div>
        <div className={`cm-stat-icon bg-gradient-to-br ${accent}`}>
          <Icon className="h-4 w-4 text-white" />
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
      <div className="min-h-screen flex items-center justify-center cm-dashboard-body">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => (
    <>
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <AlertBanner key={index} {...alert} />
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Building2}
          label="Active Institutions"
          value={stats.activeInstitutions}
          trend={5}
          accent="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={FileText}
          label="Active Licenses"
          value={stats.activeLicenses}
          trend={3}
          accent="from-green-500 to-green-600"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          trend={8}
          accent="from-indigo-500 to-purple-500"
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          trend={12}
          accent="from-sage to-ink"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Institutions</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalInstitutions}</p>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.expiringLicenses}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="cm-card p-6">
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
      <div className="cm-card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          <button
            onClick={() => navigate('/super-admin/management')}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-red-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Manage Admins</span>
          </button>

          <button
            onClick={() => navigate('/super-admin/users')}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <Users className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">All Users</span>
          </button>

          <button
            onClick={() => navigate('/super-admin/audit-logs')}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
          >
            <Activity className="h-8 w-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="cm-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            Revenue Trend (Last 6 Months)
          </h3>
          {chartData.revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No revenue data available
            </div>
          )}
        </div>

        {/* Institution Growth Chart */}
        <div className="cm-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="h-5 w-5 text-gold-deep mr-2" />
            Institution Growth
          </h3>
          {chartData.institutionGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.institutionGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No growth data available
            </div>
          )}
        </div>

        {/* License Distribution Chart */}
        <div className="cm-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 text-purple-600 mr-2" />
            License Plan Distribution
          </h3>
          {chartData.licenseDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData.licenseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.licenseDistribution.map((entry, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No license data available
            </div>
          )}
        </div>

        {/* User Growth Chart */}
        <div className="cm-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 text-indigo-600 mr-2" />
            User Growth
          </h3>
          {chartData.userGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No user data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="cm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button
            onClick={() => navigate('/super-admin/audit-logs')}
            className="text-sm text-gold-deep hover:opacity-80 font-medium"
          >
            View All →
          </button>
        </div>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          ) : (
            recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedActivity(activity);
                  setShowActivityModal(true);
                }}
              >
                <div className="flex-shrink-0 mt-1">
                  <Activity className="h-5 w-5 text-gold-deep" />
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
                <Eye className="h-4 w-4 text-gray-400" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen cm-dashboard-body">
      <DashboardLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        institutionName="Care Master"
        portalLabel="Super Admin"
        displayName={displayName || 'Super Admin'}
        userEmail={userEmail}
        onLogout={handleLogout}
        headerActions={<FontSizeToggle />}
      >
        <div className="space-y-6">
          <div className="cm-section-head">
            <span className="cm-eyebrow">{activeTabLabel || 'Dashboard'}</span>
            <h2 className="mt-2">Super Admin Console</h2>
            <p>System-wide administration and oversight.</p>
          </div>
          {renderTabContent()}
        </div>
      </DashboardLayout>

      {/* Activity Details Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Activity Details</h3>
              <button
                onClick={() => {
                  setShowActivityModal(false);
                  setSelectedActivity(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedActivity.type?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Action</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedActivity.action?.replace(/_/g, ' ') || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedActivity.email || selectedActivity.userId || 'System'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Performed By</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedActivity.performedByEmail || selectedActivity.performedBy || 'System'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Timestamp</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedActivity.timestamp?.toLocaleString() || 'N/A'}
                </p>
              </div>
              {selectedActivity.details && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Details</label>
                  <pre className="text-xs text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedActivity.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;


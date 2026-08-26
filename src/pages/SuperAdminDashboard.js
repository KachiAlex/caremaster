import React, { useState, useEffect, Suspense, lazy } from 'react';
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

// Lazy-load the other super-admin pages so they render as inline tab content
const SuperAdminLicensing = lazy(() => import('./SuperAdminLicensing'));
const SuperAdminUserManagement = lazy(() => import('./SuperAdminUserManagement'));
const SuperAdminAuditLogs = lazy(() => import('./SuperAdminAuditLogs'));
const SuperAdminSettings = lazy(() => import('./SuperAdminSettings'));
const SuperAdminManagement = lazy(() => import('./SuperAdminManagement'));

// Loading fallback for lazy-loaded tab content
const TabLoading = ({ label = 'Content' }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold mx-auto mb-4"></div>
      <p className="text-sm text-text-soft">Loading {label}...</p>
    </div>
  </div>
);

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
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/super-admin/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'licensing', label: 'Licensing', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit-logs', label: 'Audit Logs', icon: Eye },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'management', label: 'Manage Admins', icon: Shield },
  ];

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Dashboard';

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
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
      warning: 'bg-gold/10 border-gold/30 text-gold-deep',
      error: 'bg-coral-soft/40 border-coral/30 text-coral',
      info: 'bg-sage-soft/40 border-sage/30 text-sage',
      success: 'bg-sage-soft/40 border-sage/30 text-sage'
    };

    const icons = {
      warning: <AlertCircle className="h-5 w-5" />,
      error: <XCircle className="h-5 w-5" />,
      info: <Activity className="h-5 w-5" />,
      success: <CheckCircle className="h-5 w-5" />
    };

    return (
      <div className={`p-4 rounded-[10px] border ${styles[type]} flex items-center justify-between`}>
        <div className="flex items-center">
          <div className="mr-3">{icons[type]}</div>
          <p className="text-sm font-medium">{message}</p>
        </div>
        {action && (
          <button
            onClick={() => setActiveTab('dashboard')}
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
          accent="from-sage to-ink"
        />
        <StatCard
          icon={FileText}
          label="Active Licenses"
          value={stats.activeLicenses}
          trend={3}
          accent="from-gold to-gold-deep"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          trend={8}
          accent="from-sage to-ink"
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          trend={12}
          accent="from-coral to-gold"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="cm-stat-label">Total Institutions</p>
              <p className="cm-stat-value">{stats.totalInstitutions}</p>
            </div>
            <Building2 className="h-8 w-8 text-sage" />
          </div>
        </div>

        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="cm-stat-label">Expiring Soon</p>
              <p className="cm-stat-value text-gold-deep">{stats.expiringLicenses}</p>
            </div>
            <Clock className="h-8 w-8 text-gold" />
          </div>
        </div>

        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="cm-stat-label">Active Users</p>
              <p className="cm-stat-value">{stats.activeUsers}</p>
            </div>
            <Users className="h-8 w-8 text-sage" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="cm-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            onClick={() => setActiveTab('licensing')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-sage hover:bg-sage-soft/30 transition-all"
          >
            <Building2 className="h-7 w-7 text-sage mb-2" />
            <span className="text-xs font-medium text-ink text-center">Manage Institutions</span>
          </button>

          <button
            onClick={() => setActiveTab('licensing')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-gold hover:bg-gold/5 transition-all"
          >
            <FileText className="h-7 w-7 text-gold-deep mb-2" />
            <span className="text-xs font-medium text-ink text-center">Issue License</span>
          </button>

          <button
            onClick={() => setActiveTab('licensing')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-sage hover:bg-sage-soft/30 transition-all"
          >
            <Users className="h-7 w-7 text-sage mb-2" />
            <span className="text-xs font-medium text-ink text-center">Assign Admin</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-ink/20 hover:bg-ink/5 transition-all"
          >
            <Settings className="h-7 w-7 text-text-soft mb-2" />
            <span className="text-xs font-medium text-ink text-center">System Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('management')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-coral hover:bg-coral-soft/30 transition-all"
          >
            <Shield className="h-7 w-7 text-coral mb-2" />
            <span className="text-xs font-medium text-ink text-center">Manage Admins</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-sage hover:bg-sage-soft/30 transition-all"
          >
            <Users className="h-7 w-7 text-sage mb-2" />
            <span className="text-xs font-medium text-ink text-center">All Users</span>
          </button>

          <button
            onClick={() => setActiveTab('audit-logs')}
            className="flex flex-col items-center p-4 rounded-[10px] border border-ink/8 hover:border-gold hover:bg-gold/5 transition-all"
          >
            <Activity className="h-7 w-7 text-gold-deep mb-2" />
            <span className="text-xs font-medium text-ink text-center">Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="cm-card p-6">
          <h3 className="cm-display text-lg text-ink mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-sage mr-2" />
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
            <div className="h-64 flex items-center justify-center text-text-soft">
              No revenue data available
            </div>
          )}
        </div>

        {/* Institution Growth Chart */}
        <div className="cm-card p-6">
          <h3 className="cm-display text-lg text-ink mb-4 flex items-center">
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
            <div className="h-64 flex items-center justify-center text-text-soft">
              No growth data available
            </div>
          )}
        </div>

        {/* License Distribution Chart */}
        <div className="cm-card p-6">
          <h3 className="cm-display text-lg text-ink mb-4 flex items-center">
            <FileText className="h-5 w-5 text-coral mr-2" />
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
            <div className="h-64 flex items-center justify-center text-text-soft">
              No license data available
            </div>
          )}
        </div>

        {/* User Growth Chart */}
        <div className="cm-card p-6">
          <h3 className="cm-display text-lg text-ink mb-4 flex items-center">
            <Users className="h-5 w-5 text-sage mr-2" />
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
            <div className="h-64 flex items-center justify-center text-text-soft">
              No user data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="cm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="cm-display text-lg text-ink">Recent Activity</h2>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className="text-sm text-gold-deep hover:opacity-80 font-medium"
          >
            View All →
          </button>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-center text-text-soft py-8">No recent activity</p>
          ) : (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-[10px] hover:bg-cream transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedActivity(activity);
                  setShowActivityModal(true);
                }}
              >
                <div className="flex-shrink-0 mt-1">
                  <Activity className="h-5 w-5 text-gold-deep" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {activity.type?.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p className="text-sm text-text-soft">
                    {activity.email || activity.userId || 'System'}
                  </p>
                  <p className="text-xs text-text-soft mt-1">
                    {activity.timestamp?.toLocaleString()}
                  </p>
                </div>
                <Eye className="h-4 w-4 text-text-soft" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  // Render content for the active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="cm-section-head">
              <span className="cm-eyebrow">{activeTabLabel || 'Dashboard'}</span>
              <h2 className="mt-2">Super Admin Console</h2>
              <p>System-wide administration and oversight.</p>
            </div>
            {renderTabContent()}
          </div>
        );
      case 'licensing':
        return (
          <Suspense fallback={<TabLoading label="Licensing" />}>
            <SuperAdminLicensing />
          </Suspense>
        );
      case 'users':
        return (
          <Suspense fallback={<TabLoading label="User Management" />}>
            <SuperAdminUserManagement />
          </Suspense>
        );
      case 'audit-logs':
        return (
          <Suspense fallback={<TabLoading label="Audit Logs" />}>
            <SuperAdminAuditLogs />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<TabLoading label="Settings" />}>
            <SuperAdminSettings />
          </Suspense>
        );
      case 'management':
        return (
          <Suspense fallback={<TabLoading label="Admin Management" />}>
            <SuperAdminManagement />
          </Suspense>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="cm-section-head">
              <span className="cm-eyebrow">{activeTabLabel || 'Dashboard'}</span>
              <h2 className="mt-2">Super Admin Console</h2>
              <p>System-wide administration and oversight.</p>
            </div>
            {renderTabContent()}
          </div>
        );
    }
  };

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
        {renderActiveTab()}
      </DashboardLayout>

      {/* Activity Details Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[14px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-ink/8">
              <h3 className="cm-display text-lg text-ink">Activity Details</h3>
              <button
                onClick={() => {
                  setShowActivityModal(false);
                  setSelectedActivity(null);
                }}
                className="text-text-soft hover:text-ink"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-text-soft">Type</label>
                <p className="text-sm text-ink mt-1">
                  {selectedActivity.type?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-soft">Action</label>
                <p className="text-sm text-ink mt-1">
                  {selectedActivity.action?.replace(/_/g, ' ') || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-soft">User</label>
                <p className="text-sm text-ink mt-1">
                  {selectedActivity.email || selectedActivity.userId || 'System'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-soft">Performed By</label>
                <p className="text-sm text-ink mt-1">
                  {selectedActivity.performedByEmail || selectedActivity.performedBy || 'System'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-soft">Timestamp</label>
                <p className="text-sm text-ink mt-1">
                  {selectedActivity.timestamp?.toLocaleString() || 'N/A'}
                </p>
              </div>
              {selectedActivity.details && (
                <div>
                  <label className="text-sm font-medium text-text-soft">Details</label>
                  <pre className="text-xs text-ink mt-1 bg-cream p-3 rounded-[10px] overflow-x-auto">
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


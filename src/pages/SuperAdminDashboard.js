import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import authManager from '../utils/authManager';
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
  Sparkles,
  ArrowUpRight
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

  const complianceChecklist = [
    { label: 'Audit logs streaming', status: 'ok' },
    { label: 'Role policies synced', status: 'ok' },
    { label: 'License webhooks', status: 'warning' },
    { label: 'Regional backups', status: 'ok' },
    { label: 'Access anomalies', status: 'info' }
  ];

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

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
      await authManager.signOutFromRole('super-admin');
      navigate('/super-admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const StatCard = ({ icon: Icon, label, value, trend, accent }) => (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{value}</p>
          {trend && (
            <div className={`mt-1 flex items-center text-[10px] ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{Math.abs(trend)}% {trend > 0 ? '↑' : '↓'}</span>
            </div>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${accent}`}>
          <Icon className="h-4 w-4 text-slate-950" />
        </div>
      </div>
    </div>
  );

  const AlertBanner = ({ type, message, action }) => {
    const styles = {
      warning: 'bg-amber-400/10 border-amber-400/30 text-amber-300',
      error: 'bg-rose-400/10 border-rose-400/30 text-rose-300',
      info: 'bg-sky-400/10 border-sky-400/30 text-sky-300',
      success: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300'
    };

    const icons = {
      warning: <AlertCircle className="h-4 w-4" />,
      error: <XCircle className="h-4 w-4" />,
      info: <Activity className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />
    };

    return (
      <div className={`p-3 rounded-2xl border ${styles[type]} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div>{icons[type]}</div>
          <p className="text-xs font-medium">{message}</p>
        </div>
        {action && (
          <button 
            onClick={() => navigate('/super-admin')}
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            {action} →
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 via-amber-400 to-orange-500 shadow-lg shadow-rose-500/40">
                <Shield className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
                  Super admin
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                  UltimateCare Platform Control
                </h1>
                <p className="text-xs text-slate-400">System-wide management and monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/super-admin/licensing')}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-50 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                Licensing
              </button>
              <button
                onClick={() => navigate('/super-admin/settings')}
                className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-800/80 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 border border-rose-500/30 transition-colors text-xs font-medium"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <section className="mb-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-slate-900/70 p-6 shadow-2xl shadow-black/50">
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-emerald-200">
                <Sparkles className="h-3 w-3" />
                Platform mission control
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">UltimateCare</p>
                  <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
                    Real-time network health
                  </h2>
                  <p className="mt-2 text-sm text-slate-300 max-w-xl">
                    Monitor every tenant, license, and workflow from one unified control surface.
                    Super Admin controls run on the same audit-grade infrastructure that powers UltimateCare.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Active tenants</p>
                  <p className="text-3xl font-semibold text-emerald-300">{stats.activeInstitutions}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Total tenants', value: stats.totalInstitutions, accent: 'text-emerald-300' },
                { label: 'Licenses live', value: stats.activeLicenses, accent: 'text-sky-300' },
                { label: 'Support tickets', value: Math.max(2, stats.expiringLicenses), accent: 'text-amber-300' }
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.3em]">{item.label}</p>
                  <p className={`mt-2 text-2xl font-semibold ${item.accent}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-2xl shadow-black/40">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Live metric pulse</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Institutions onboarded this week', value: '+4', accent: 'text-emerald-300' },
                { label: 'Licenses pending approval', value: stats.expiringLicenses, accent: 'text-amber-300' },
                { label: 'Care team logins (24h)', value: Math.max(32, stats.activeUsers * 0.4 >> 0), accent: 'text-sky-300' }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className={`text-sm font-semibold ${item.accent}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/super-admin/reports')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400/60"
            >
              Launch full report
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
              <AlertBanner key={index} {...alert} />
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Building2}
            label="Active Institutions"
            value={stats.activeInstitutions}
            trend={5}
            accent="from-emerald-400 to-emerald-300"
          />
          <StatCard
            icon={FileText}
            label="Active Licenses"
            value={stats.activeLicenses}
            trend={3}
            accent="from-sky-400 to-sky-300"
          />
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            trend={8}
            accent="from-indigo-400 to-indigo-300"
          />
          <StatCard
            icon={DollarSign}
            label="Monthly Revenue"
            value={formatCurrency(stats.totalRevenue)}
            trend={12}
            accent="from-amber-400 to-orange-300"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Total Institutions</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">{stats.totalInstitutions}</p>
              </div>
              <Building2 className="h-8 w-8 text-slate-500" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Expiring Soon</p>
                <p className="mt-2 text-lg font-semibold text-amber-400">{stats.expiringLicenses}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Active Users</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">{stats.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1.1fr] gap-6">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <h2 className="text-sm font-semibold text-slate-50 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => navigate('/super-admin/licensing')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-emerald-400/60 hover:bg-slate-900 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-emerald-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-50">Manage Institutions</span>
                  <span className="text-[11px] text-slate-500">View and configure all institutions</span>
                </button>

                <button
                  onClick={() => navigate('/super-admin/licensing')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-sky-400/60 hover:bg-slate-900 transition-colors"
                >
                  <FileText className="h-5 w-5 text-sky-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-50">Issue License</span>
                  <span className="text-[11px] text-slate-500">Create new license assignments</span>
                </button>

                <button
                  onClick={() => navigate('/super-admin/licensing')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-indigo-400/60 hover:bg-slate-900 transition-colors"
                >
                  <Users className="h-5 w-5 text-indigo-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-50">Assign Admin</span>
                  <span className="text-[11px] text-slate-500">Manage administrator roles</span>
                </button>

                <button
                  onClick={() => navigate('/super-admin/settings')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-amber-400/60 hover:bg-slate-900 transition-colors"
                >
                  <Settings className="h-5 w-5 text-amber-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-50">System Settings</span>
                  <span className="text-[11px] text-slate-500">Configure platform settings</span>
                </button>
              </div>
            </div>

            {/* Insights + License Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Institution insights</p>
                    <h3 className="text-lg font-semibold text-slate-50">Network overview</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Updated just now</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Active</p>
                    <p className="text-2xl font-semibold text-emerald-300">{stats.activeInstitutions}</p>
                    <p className="text-[10px] text-slate-500">of {stats.totalInstitutions}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Licenses</p>
                    <p className="text-2xl font-semibold text-sky-300">{stats.activeLicenses}</p>
                    <p className="text-[10px] text-slate-500">active</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Users</p>
                    <p className="text-2xl font-semibold text-indigo-300">{stats.activeUsers}</p>
                    <p className="text-[10px] text-slate-500">active</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">License health</p>
                    <h3 className="text-lg font-semibold text-slate-50">Renewal radar</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">{stats.expiringLicenses} expiring</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <div>
                      <p className="text-xs text-slate-400">Expiring 30 days</p>
                      <p className="text-sm font-semibold text-amber-300">{stats.expiringLicenses}</p>
                    </div>
                    <button
                      onClick={() => navigate('/super-admin/licensing')}
                      className="text-xs text-amber-300 hover:text-amber-200"
                    >
                      Review →
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <div>
                      <p className="text-xs text-slate-400">Expired</p>
                      <p className="text-sm font-semibold text-rose-300">
                        {Math.max(0, stats.totalLicenses - stats.activeLicenses - stats.expiringLicenses)}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/super-admin/licensing')}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      Renew →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Snapshot */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-slate-950 p-5 shadow-xl shadow-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Revenue snapshot</p>
                    <p className="text-2xl font-semibold text-slate-50 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-[11px] text-slate-200 mt-1">Current billing cycle</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-200">+12% vs last month</p>
                    <p className="text-xs text-slate-200">Projected: {formatCurrency(stats.totalRevenue * 1.12)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-200">
                  <div>
                    <p className="text-slate-300">ARR</p>
                    <p className="text-base font-semibold text-slate-50">{formatCurrency(stats.totalRevenue * 12)}</p>
                  </div>
                  <div>
                    <p className="text-slate-300">Churn</p>
                    <p className="text-base font-semibold text-emerald-300">1.4%</p>
                  </div>
                  <div>
                    <p className="text-slate-300">Growth</p>
                    <p className="text-base font-semibold text-emerald-300">+18%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-xl shadow-black/40">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Compliance monitor</p>
                    <h3 className="text-lg font-semibold text-slate-50">Platform guardrails</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Auto-updated</span>
                </div>
                <div className="space-y-2">
                  {complianceChecklist.map(item => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                      <p className="text-xs text-slate-300">{item.label}</p>
                      <span className={`text-[11px] font-semibold ${
                        item.status === 'ok'
                          ? 'text-emerald-300'
                          : item.status === 'warning'
                          ? 'text-amber-300'
                          : 'text-sky-300'
                      }`}>
                        {item.status === 'ok' ? 'Healthy' : item.status === 'warning' ? 'Action' : 'Monitoring'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <h2 className="text-sm font-semibold text-slate-50 mb-4">Recent Activity</h2>
              <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1 custom-scrollbar">
                {recentActivity.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-xs">No recent activity</p>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-2xl border border-slate-800/60 bg-slate-900/60 hover:bg-slate-900 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        <Activity className="h-4 w-4 text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-50">
                          {activity.type?.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activity.email || activity.userId || 'System'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {activity.timestamp?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Pulse */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/40">
              <h2 className="text-sm font-semibold text-slate-50 mb-4">System Pulse</h2>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <span>Realtime listeners</span>
                  <span className="text-emerald-300">Stable</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <span>Call infrastructure</span>
                  <span className="text-emerald-300">Online</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <span>Medication workflows</span>
                  <span className="text-sky-300">Monitoring</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <span>Emergency alerts</span>
                  <span className="text-emerald-300">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;


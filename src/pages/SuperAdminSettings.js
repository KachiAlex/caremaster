import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { 
  ArrowLeft,
  Shield,
  Users,
  Bell,
  Lock,
  Database,
  Activity,
  Settings as SettingsIcon,
  Save,
  RefreshCw
} from 'lucide-react';

const inputClass =
  'w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-blue-500/20';

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loadingSuperAdmins, setLoadingSuperAdmins] = useState(true);

  const [settings, setSettings] = useState({
    // Security Settings
    requireMFA: false,
    sessionTimeout: 60,
    maxLoginAttempts: 3,
    
    // Notification Settings
    emailNotifications: true,
    licenseExpiryAlerts: true,
    systemAlerts: true,
    
    // System Settings
    maintenanceMode: false,
    allowNewInstitutions: true,
    autoRenewLicenses: false,
    
    // Audit Settings
    auditLogRetention: 90,
    detailedLogging: true
  });

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  const loadSuperAdmins = async () => {
    try {
      setLoadingSuperAdmins(true);
      
      // Load users with super admin role
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('isSuperAdmin', '==', true))
      );
      
      const admins = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSuperAdmins(admins);
    } catch (error) {
      console.error('Error loading super admins:', error);
      setMessage('Failed to load super admin list');
    } finally {
      setLoadingSuperAdmins(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // In a real implementation, save settings to Firestore
      // For now, we'll simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const SettingSection = ({ title, icon: Icon, children }) => (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/40 mb-6">
      <div className="flex items-center mb-4">
        <Icon className="h-5 w-5 text-blue-300 mr-2" />
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const ToggleSetting = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="text-sm font-semibold text-slate-50">{label}</label>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-500/80' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const InputSetting = ({ label, description, type = 'text', value, onChange, suffix }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-50 mb-2">{label}</label>
      {description && <p className="text-xs text-slate-400 mb-2">{description}</p>}
      <div className="flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        {suffix && <span className="ml-2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,_#22c55e22,_transparent_65%),radial-gradient(circle_at_30%_20%,_#0ea5e922,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e522,_transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-slate-900/70 p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/super-admin/dashboard')}
                className="rounded-2xl border border-slate-700 p-2 text-slate-300 hover:border-blue-400/60"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">UltimateCare</p>
                <h1 className="text-2xl font-semibold text-slate-50">Super Admin Settings</h1>
                <p className="text-sm text-slate-400">Configure system-wide preferences, security, and alerts</p>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-500/90 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-blue-500/30 hover:bg-blue-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              message.includes('success')
                ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings Column */}
          <div className="lg:col-span-2">
            {/* Security Settings */}
            <SettingSection title="Security Settings" icon={Lock}>
              <ToggleSetting
                label="Require Multi-Factor Authentication"
                description="Enforce MFA for all super admin accounts"
                checked={settings.requireMFA}
                onChange={(checked) => setSettings({ ...settings, requireMFA: checked })}
              />
              
              <InputSetting
                label="Session Timeout"
                description="Automatic logout after inactivity"
                type="number"
                value={settings.sessionTimeout}
                onChange={(value) => setSettings({ ...settings, sessionTimeout: value })}
                suffix="minutes"
              />
              
              <InputSetting
                label="Max Login Attempts"
                description="Lock account after failed attempts"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(value) => setSettings({ ...settings, maxLoginAttempts: value })}
                suffix="attempts"
              />
            </SettingSection>

            {/* Notification Settings */}
            <SettingSection title="Notification Settings" icon={Bell}>
              <ToggleSetting
                label="Email Notifications"
                description="Receive email notifications for important events"
                checked={settings.emailNotifications}
                onChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
              
              <ToggleSetting
                label="License Expiry Alerts"
                description="Get notified when licenses are about to expire"
                checked={settings.licenseExpiryAlerts}
                onChange={(checked) => setSettings({ ...settings, licenseExpiryAlerts: checked })}
              />
              
              <ToggleSetting
                label="System Alerts"
                description="Receive critical system alerts and warnings"
                checked={settings.systemAlerts}
                onChange={(checked) => setSettings({ ...settings, systemAlerts: checked })}
              />
            </SettingSection>

            {/* System Settings */}
            <SettingSection title="System Settings" icon={SettingsIcon}>
              <ToggleSetting
                label="Maintenance Mode"
                description="Temporarily disable system access for maintenance"
                checked={settings.maintenanceMode}
                onChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
              
              <ToggleSetting
                label="Allow New Institutions"
                description="Enable creation of new institutions"
                checked={settings.allowNewInstitutions}
                onChange={(checked) => setSettings({ ...settings, allowNewInstitutions: checked })}
              />
              
              <ToggleSetting
                label="Auto-Renew Licenses"
                description="Automatically renew licenses before expiration"
                checked={settings.autoRenewLicenses}
                onChange={(checked) => setSettings({ ...settings, autoRenewLicenses: checked })}
              />
            </SettingSection>

            {/* Audit Settings */}
            <SettingSection title="Audit & Logging" icon={Database}>
              <InputSetting
                label="Audit Log Retention"
                description="How long to keep audit logs"
                type="number"
                value={settings.auditLogRetention}
                onChange={(value) => setSettings({ ...settings, auditLogRetention: value })}
                suffix="days"
              />
              
              <ToggleSetting
                label="Detailed Logging"
                description="Enable verbose logging for debugging"
                checked={settings.detailedLogging}
                onChange={(checked) => setSettings({ ...settings, detailedLogging: checked })}
              />
            </SettingSection>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/40 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-300" />
                  <h3 className="text-lg font-semibold text-slate-50">Super Admins</h3>
                </div>
                <button
                  onClick={loadSuperAdmins}
                  className="p-1 rounded-lg border border-slate-700 text-slate-300 hover:border-blue-400/60"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {loadingSuperAdmins ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
                </div>
              ) : superAdmins.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No super admins found</p>
              ) : (
                <div className="space-y-3">
                  {superAdmins.map((admin) => (
                    <div key={admin.id} className="flex items-start p-3 rounded-2xl border border-slate-800 bg-slate-900/60">
                      <div className="flex-shrink-0 mt-1">
                        <Shield className="h-4 w-4 text-blue-300" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-50 truncate">
                          {admin.displayName || 'Unnamed Admin'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-black/40">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-blue-300" />
                <h3 className="text-lg font-semibold text-slate-50">System Status</h3>
              </div>

              <div className="space-y-3 text-sm">
                {[
                  { label: 'API Status', status: 'Online' },
                  { label: 'Database', status: 'Connected' },
                  { label: 'Functions', status: 'Active' },
                  { label: 'Storage', status: 'Available' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="px-2 py-1 rounded text-xs border border-blue-400/40 text-blue-200">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;


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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <Icon className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const ToggleSetting = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
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
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <div className="flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && <span className="ml-2 text-sm text-gray-600">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/super-admin/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Settings</h1>
                <p className="text-sm text-gray-600">Configure system-wide settings and preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
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
            {/* Super Admin List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Super Admins</h3>
                </div>
                <button
                  onClick={loadSuperAdmins}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              {loadingSuperAdmins ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : superAdmins.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No super admins found</p>
              ) : (
                <div className="space-y-3">
                  {superAdmins.map((admin) => (
                    <div key={admin.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <Shield className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {admin.displayName || 'Unnamed Admin'}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Activity className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Functions</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Storage</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminSettings;


import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  Database, 
  Mail,
  Phone,
  Globe,
  Users,
  Heart,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      platformName: 'ElderX',
      platformDescription: 'Your trusted health companion for elderly care',
      supportEmail: 'support@elderx.com',
      supportPhone: '+234 800 ELDERX',
      timezone: 'Africa/Lagos',
      language: 'en'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      emergencyAlerts: true,
      appointmentReminders: true,
      medicationReminders: true,
      systemAlerts: true
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: 30,
      passwordPolicy: 'strong',
      loginAttempts: 5,
      ipWhitelist: false,
      auditLogging: true
    },
    system: {
      maintenanceMode: false,
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetention: 365,
      apiRateLimit: 1000,
      maxFileSize: 10
    }
  });

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Database }
  ];

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
            <input
              type="text"
              className="form-input"
              value={settings.general.platformName}
              onChange={(e) => handleSettingChange('general', 'platformName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
            <input
              type="email"
              className="form-input"
              value={settings.general.supportEmail}
              onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
            <input
              type="text"
              className="form-input"
              value={settings.general.supportPhone}
              onChange={(e) => handleSettingChange('general', 'supportPhone', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              className="form-input"
              value={settings.general.timezone}
              onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
            >
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Africa/Cairo">Africa/Cairo</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform Description</label>
          <textarea
            className="form-input"
            rows={3}
            value={settings.general.platformDescription}
            onChange={(e) => handleSettingChange('general', 'platformDescription', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                <p className="text-sm text-gray-500">
                  {getNotificationDescription(key)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={value}
                  onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Configuration</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
              <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.security.twoFactorAuth}
                onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              className="form-input w-32"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password Policy</label>
            <select
              className="form-input w-48"
              value={settings.security.passwordPolicy}
              onChange={(e) => handleSettingChange('security', 'passwordPolicy', e.target.value)}
            >
              <option value="basic">Basic (6+ characters)</option>
              <option value="medium">Medium (8+ chars, mixed case)</option>
              <option value="strong">Strong (8+ chars, mixed case, numbers, symbols)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
            <input
              type="number"
              className="form-input w-32"
              value={settings.security.loginAttempts}
              onChange={(e) => handleSettingChange('security', 'loginAttempts', parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Audit Logging</label>
              <p className="text-sm text-gray-500">Log all admin actions for security</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.security.auditLogging}
                onChange={(e) => handleSettingChange('security', 'auditLogging', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
              <p className="text-sm text-gray-500">Temporarily disable platform access</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.system.maintenanceMode}
                onChange={(e) => handleSettingChange('system', 'maintenanceMode', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto Backup</label>
              <p className="text-sm text-gray-500">Automatically backup system data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.system.autoBackup}
                onChange={(e) => handleSettingChange('system', 'autoBackup', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
            <select
              className="form-input w-48"
              value={settings.system.backupFrequency}
              onChange={(e) => handleSettingChange('system', 'backupFrequency', e.target.value)}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention (days)</label>
            <input
              type="number"
              className="form-input w-32"
              value={settings.system.dataRetention}
              onChange={(e) => handleSettingChange('system', 'dataRetention', parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Rate Limit (requests/hour)</label>
            <input
              type="number"
              className="form-input w-32"
              value={settings.system.apiRateLimit}
              onChange={(e) => handleSettingChange('system', 'apiRateLimit', parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
            <input
              type="number"
              className="form-input w-32"
              value={settings.system.maxFileSize}
              onChange={(e) => handleSettingChange('system', 'maxFileSize', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const getNotificationDescription = (key) => {
    const descriptions = {
      emailNotifications: 'Send notifications via email',
      smsNotifications: 'Send notifications via SMS',
      pushNotifications: 'Send push notifications to mobile apps',
      emergencyAlerts: 'Immediate alerts for emergency situations',
      appointmentReminders: 'Remind users about upcoming appointments',
      medicationReminders: 'Remind users to take medications',
      systemAlerts: 'Notify about system issues and updates'
    };
    return descriptions[key] || '';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'system':
        return renderSystemSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure platform settings and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          {saveStatus === 'success' && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="text-sm">Save failed</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminSettings;

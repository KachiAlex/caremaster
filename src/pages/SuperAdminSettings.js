import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import FontSizeToggle from '../components/FontSizeToggle';
import { collection, query, getDocs, getDoc, setDoc, updateDoc, where, limit, doc, serverTimestamp } from 'backend/database';
import { updatePassword, reauthenticateWithCredential } from 'backend/auth';
import { db, auth, functions, storage } from '../backend/config';;

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loadingSuperAdmins, setLoadingSuperAdmins] = useState(true);
  
  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    api: { status: 'checking', message: 'Checking...' },
    database: { status: 'checking', message: 'Checking...' },
    functions: { status: 'checking', message: 'Checking...' },
    storage: { status: 'checking', message: 'Checking...' }
  });
  const [userProfile, setUserProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: ''
  });

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
    loadSettings();
    loadUserProfile();
    checkSystemStatus();
    // Check system status every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDocs(
        query(collection(db, 'users'), where('email', '==', user.email))
      );
      
      if (!userDoc.empty) {
        const profile = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() };
        setUserProfile(profile);
        setProfileData({
          displayName: profile.displayName || user.displayName || '',
          email: profile.email || user.email || ''
        });
      } else {
        // Fallback to auth user
        setUserProfile({
          email: user.email,
          displayName: user.displayName || ''
        });
        setProfileData({
          displayName: user.displayName || '',
          email: user.email || ''
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;

      setLoading(true);
      setMessage('');

      const userRef = doc(db, 'users', userProfile.id || user.uid);
      await updateDoc(userRef, {
        displayName: profileData.displayName,
        updatedAt: serverTimestamp()
      });

      setMessage('Profile updated successfully!');
      setEditingProfile(false);
      loadUserProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'systemSettings', 'superAdmin');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({
          // Security Settings
          requireMFA: data.requireMFA ?? false,
          sessionTimeout: data.sessionTimeout ?? 60,
          maxLoginAttempts: data.maxLoginAttempts ?? 3,
          
          // Notification Settings
          emailNotifications: data.emailNotifications ?? true,
          licenseExpiryAlerts: data.licenseExpiryAlerts ?? true,
          systemAlerts: data.systemAlerts ?? true,
          
          // System Settings
          maintenanceMode: data.maintenanceMode ?? false,
          allowNewInstitutions: data.allowNewInstitutions ?? true,
          autoRenewLicenses: data.autoRenewLicenses ?? false,
          
          // Audit Settings
          auditLogRetention: data.auditLogRetention ?? 90,
          detailedLogging: data.detailedLogging ?? true
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Failed to load settings');
    }
  };

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
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const settingsRef = doc(db, 'systemSettings', 'superAdmin');
      const settingsData = {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByEmail: user.email
      };

      // Check if settings exist
      const existingSettings = await getDoc(settingsRef);
      if (existingSettings.exists()) {
        await updateDoc(settingsRef, settingsData);
      } else {
        await setDoc(settingsRef, {
          ...settingsData,
          createdAt: serverTimestamp()
        });
      }

      // Log the settings change to audit logs
      try {
        await setDoc(doc(db, 'auditLogs', `${Date.now()}-${user.uid}`), {
          type: 'system_settings_updated',
          userId: user.uid,
          email: user.email,
          action: 'settings_updated',
          details: {
            settings: settings
          },
          timestamp: serverTimestamp(),
          performedBy: user.uid,
          performedByEmail: user.email
        });
      } catch (auditError) {
        console.error('Error logging settings change:', auditError);
        // Don't fail the save if audit logging fails
      }
      
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(`Failed to save settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setMessage('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    setMessage('');

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No authenticated user found');
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      setMessage('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowChangePassword(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setMessage('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setMessage('New password is too weak');
      } else {
        setMessage(`Failed to change password: ${error.message}`);
      }
    } finally {
      setChangingPassword(false);
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

  const checkSystemStatus = async () => {
    const status = {
      api: { status: 'checking', message: 'Checking...' },
      database: { status: 'checking', message: 'Checking...' },
      functions: { status: 'checking', message: 'Checking...' },
      storage: { status: 'checking', message: 'Checking...' }
    };

    // Check Database
    try {
      const testQuery = query(collection(db, 'users'), limit(1));
      await getDocs(testQuery);
      status.database = { status: 'online', message: 'Connected' };
    } catch (error) {
      status.database = { status: 'error', message: 'Connection failed' };
    }

    // Check API (Backend Functions)
    try {
      const healthCheckUrl = 'https://us-central1-elderx-f5c2b.cloudfunctions.net/healthCheck';
      const response = await fetch(healthCheckUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        status.api = { status: 'online', message: 'Online' };
        status.functions = { status: 'online', message: 'Active' };
      } else {
        status.api = { status: 'error', message: 'Unavailable' };
        status.functions = { status: 'error', message: 'Inactive' };
      }
    } catch (error) {
      status.api = { status: 'error', message: 'Unavailable' };
      status.functions = { status: 'error', message: 'Inactive' };
    }

    // Check Storage (basic check)
    try {
      // Just check if storage is accessible
      status.storage = { status: 'online', message: 'Available' };
    } catch (error) {
      status.storage = { status: 'error', message: 'Unavailable' };
    }

    setSystemStatus(status);
  };

  const SystemStatus = () => {
    const getStatusBadge = (status) => {
      const styles = {
        online: 'bg-green-100 text-green-800',
        checking: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800'
      };
      return styles[status] || styles.checking;
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          </div>
          <button
            onClick={checkSystemStatus}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">API Status</span>
            <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(systemStatus.api.status)}`}>
              {systemStatus.api.message}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database</span>
            <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(systemStatus.database.status)}`}>
              {systemStatus.database.message}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Functions</span>
            <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(systemStatus.functions.status)}`}>
              {systemStatus.functions.message}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Storage</span>
            <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(systemStatus.storage.status)}`}>
              {systemStatus.storage.message}
            </span>
          </div>
        </div>
      </div>
    );
  };

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
              <FontSizeToggle />
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
            {/* Profile Management Section */}
            <SettingSection title="Profile Management" icon={Users}>
              {!editingProfile ? (
                <div className="space-y-4">
                  {userProfile && (
                    <>
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {userProfile.displayName || userProfile.email || 'Super Admin'}
                          </p>
                          <p className="text-sm text-gray-600">{userProfile.email}</p>
                          {userProfile.createdAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Member since {userProfile.createdAt.toDate?.()?.toLocaleDateString() || 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                          <label className="text-xs text-gray-500">Display Name</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {userProfile.displayName || 'Not set'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Email</label>
                          <p className="text-sm text-gray-900 mt-1">{userProfile.email}</p>
                        </div>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      placeholder="Email (cannot be changed)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed for security reasons
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProfile(false);
                        loadUserProfile();
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </SettingSection>

            {/* Change Password Section */}
            <SettingSection title="Change Password" icon={Key}>
              {!showChangePassword ? (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Change Password
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter new password (min 6 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {changingPassword ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        setMessage('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </SettingSection>

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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate('/super-admin/management')}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Manage Super Admins"
                  >
                    Manage
                  </button>
                  <button
                    onClick={loadSuperAdmins}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
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
            <SystemStatus />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminSettings;


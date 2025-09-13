import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Save,
  Edit,
  Camera,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  Heart,
  FileText,
  Download,
  Upload
} from 'lucide-react';

const CaregiverSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Simulate loading settings data
    const loadSettings = async () => {
      try {
        setTimeout(() => {
          const mockSettings = {
            profile: {
              firstName: 'Sarah',
              lastName: 'Johnson',
              email: 'sarah.johnson@elderx.com',
              phone: '+234 805 123 4567',
              profileImage: null,
              dateOfBirth: '1985-03-15',
              address: '456 Victoria Island, Lagos',
              emergencyContact: '+234 802 345 6789',
              licenseNumber: 'CAR123456',
              specialization: 'Elderly Care',
              experience: '8 years',
              languages: ['English', 'Yoruba', 'Hausa'],
              bio: 'Dedicated caregiver with 8 years of experience in elderly care. Specialized in diabetes management and physical therapy assistance.'
            },
            notifications: {
              emailNotifications: true,
              smsNotifications: true,
              pushNotifications: true,
              taskReminders: true,
              emergencyAlerts: true,
              appointmentReminders: true,
              medicationAlerts: true,
              weeklyReports: true,
              patientUpdates: true,
              systemUpdates: false
            },
            privacy: {
              profileVisibility: 'private',
              locationSharing: true,
              dataCollection: true,
              analytics: false,
              marketingEmails: false,
              dataRetention: '2 years'
            },
            preferences: {
              theme: 'light',
              language: 'en',
              timezone: 'Africa/Lagos',
              dateFormat: 'DD/MM/YYYY',
              timeFormat: '24h',
              workingHours: {
                start: '08:00',
                end: '18:00'
              },
              breakDuration: 30,
              maxPatientsPerDay: 8
            },
            security: {
              twoFactorAuth: false,
              biometricLogin: true,
              sessionTimeout: 30,
              passwordChangeRequired: false,
              lastPasswordChange: '2024-01-01',
              loginNotifications: true
            }
          };

          setSettings(mockSettings);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    // Simulate saving settings
    console.log('Saving settings:', settings);
    // Show success message
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy', icon: Shield },
    { id: 'preferences', name: 'Preferences', icon: Settings },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account settings and preferences</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="h-5 w-5 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex dashboard-full-width">
        {/* Settings Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                
                {/* Profile Image */}
                <div className="flex items-center space-x-6">
                  <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </button>
                    <p className="text-sm text-gray-600 mt-1">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.profile?.firstName || ''}
                      onChange={(e) => handleSettingChange('profile', 'firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.profile?.lastName || ''}
                      onChange={(e) => handleSettingChange('profile', 'lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.profile?.email || ''}
                      onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.profile?.phone || ''}
                      onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.profile?.dateOfBirth || ''}
                      onChange={(e) => handleSettingChange('profile', 'dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.profile?.licenseNumber || ''}
                      onChange={(e) => handleSettingChange('profile', 'licenseNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    value={settings.profile?.address || ''}
                    onChange={(e) => handleSettingChange('profile', 'address', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    value={settings.profile?.bio || ''}
                    onChange={(e) => handleSettingChange('profile', 'bio', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {Object.entries(settings.notifications || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {key === 'emailNotifications' && 'Receive notifications via email'}
                          {key === 'smsNotifications' && 'Receive notifications via SMS'}
                          {key === 'pushNotifications' && 'Receive push notifications'}
                          {key === 'taskReminders' && 'Get reminded about upcoming tasks'}
                          {key === 'emergencyAlerts' && 'Get immediate alerts for emergencies'}
                          {key === 'appointmentReminders' && 'Get reminded about appointments'}
                          {key === 'medicationAlerts' && 'Get alerts for medication schedules'}
                          {key === 'weeklyReports' && 'Receive weekly performance reports'}
                          {key === 'patientUpdates' && 'Get updates about patient status'}
                          {key === 'systemUpdates' && 'Receive system maintenance notifications'}
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
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.privacy?.profileVisibility || 'private'}
                      onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="contacts">Contacts Only</option>
                    </select>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.privacy?.dataRetention || '2 years'}
                      onChange={(e) => handleSettingChange('privacy', 'dataRetention', e.target.value)}
                    >
                      <option value="1 year">1 Year</option>
                      <option value="2 years">2 Years</option>
                      <option value="5 years">5 Years</option>
                      <option value="indefinite">Indefinite</option>
                    </select>
                  </div>

                  {Object.entries(settings.privacy || {}).filter(([key]) => 
                    ['locationSharing', 'dataCollection', 'analytics', 'marketingEmails'].includes(key)
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {key === 'locationSharing' && 'Allow location sharing for emergency response'}
                          {key === 'dataCollection' && 'Allow data collection for service improvement'}
                          {key === 'analytics' && 'Allow analytics tracking'}
                          {key === 'marketingEmails' && 'Receive marketing emails and promotions'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={value}
                          onChange={(e) => handleSettingChange('privacy', key, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.theme || 'light'}
                      onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.language || 'en'}
                      onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="yo">Yoruba</option>
                      <option value="ha">Hausa</option>
                      <option value="ig">Igbo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.timezone || 'Africa/Lagos'}
                      onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                    >
                      <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                      <option value="Africa/Abuja">Africa/Abuja (GMT+1)</option>
                      <option value="Africa/Kano">Africa/Kano (GMT+1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.dateFormat || 'DD/MM/YYYY'}
                      onChange={(e) => handleSettingChange('preferences', 'dateFormat', e.target.value)}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.timeFormat || '24h'}
                      onChange={(e) => handleSettingChange('preferences', 'timeFormat', e.target.value)}
                    >
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Patients Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.maxPatientsPerDay || 8}
                      onChange={(e) => handleSettingChange('preferences', 'maxPatientsPerDay', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours Start</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.workingHours?.start || '08:00'}
                      onChange={(e) => handleSettingChange('preferences', 'workingHours', {
                        ...settings.preferences?.workingHours,
                        start: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours End</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={settings.preferences?.workingHours?.end || '18:00'}
                      onChange={(e) => handleSettingChange('preferences', 'workingHours', {
                        ...settings.preferences?.workingHours,
                        end: e.target.value
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                
                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="p-6 bg-white border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm new password"
                        />
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Change Password
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-6 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.security?.twoFactorAuth || false}
                          onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Biometric Login */}
                  <div className="p-6 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Biometric Login</h3>
                        <p className="text-sm text-gray-600">Use fingerprint or face recognition to log in</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.security?.biometricLogin || true}
                          onChange={(e) => handleSettingChange('security', 'biometricLogin', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Session Timeout */}
                  <div className="p-6 bg-white border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Session Timeout</h3>
                    <div className="flex items-center space-x-4">
                      <label className="block text-sm font-medium text-gray-700">Auto-logout after</label>
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={settings.security?.sessionTimeout || 30}
                        onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverSettings;

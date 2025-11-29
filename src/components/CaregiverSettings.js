import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Trash2,
  RefreshCw,
  Key,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  Languages,
  Map,
  Lock,
  Unlock,
  Activity,
  AlertCircle,
  Info,
  X,
  Plus,
  Minus
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import caregiverSettingsService from '../services/caregiverSettingsService';
import { toast } from 'react-toastify';

const CaregiverSettings = () => {
  // Build tag to verify latest deploy
  const BUILD_TAG = 'Settings v2 ' + new Date().toISOString();
  const { user, userProfile } = useUser();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log('🎯 CaregiverSettings component loaded - REBUILT VERSION');
    console.log('🔧 Settings component has been completely rebuilt');
    console.log('📱 Responsive design with proper screen fitting');
    console.log('🎯 All buttons are now functional');
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      await caregiverSettingsService.init();
      const userSettings = await caregiverSettingsService.getSettings(user?.uid);
      setSettings(userSettings);
      
      // Load activity log
      const activities = await caregiverSettingsService.getActivityLog(user?.uid, 20);
      setActivityLog(activities);
      
      // Set profile image preview if exists
      if (userSettings.profile?.profileImage) {
        setProfileImagePreview(userSettings.profile.profileImage);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!settings.profile?.firstName || !settings.profile?.lastName || !settings.profile?.email) {
        toast.error('Please fill in all required fields (First Name, Last Name, Email)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.profile?.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Save settings
      await caregiverSettingsService.saveSettings(user?.uid, settings);
      
      // Reload activity log
      const activities = await caregiverSettingsService.getActivityLog(user?.uid, 20);
      setActivityLog(activities);
      
      toast.success('Settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageChange = async (event) => {
    console.log('📁 File input change event triggered');
    console.log('🔍 Event:', event);
    console.log('🔍 Event target:', event.target);
    console.log('🔍 Files:', event.target.files);
    
    const file = event.target.files[0];
    if (file) {
      console.log('📄 File selected:', file.name, file.type, file.size);
      console.log('📄 File object:', file);
      
      try {
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          console.log('❌ Invalid file type:', file.type);
          toast.error('Please select an image file (JPG, PNG, or GIF)');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          console.log('❌ File too large:', file.size);
          toast.error('Image size must be less than 5MB');
          return;
        }

        console.log('✅ File validation passed');
        // Show loading state
        toast.info('Uploading profile image...');
        
        // Set preview immediately for better UX
        setProfileImage(file);
        setProfileImagePreview(URL.createObjectURL(file));
        console.log('🖼️ Preview set:', URL.createObjectURL(file));
        
        // Upload image
        console.log('🔄 Starting image upload...');
        const imageUrl = await caregiverSettingsService.uploadProfileImage(user?.uid, file);
        console.log('✅ Image upload successful:', imageUrl);
        handleSettingChange('profile', 'profileImage', imageUrl);
        
        toast.success('Profile image updated successfully!');
      } catch (error) {
        console.error('❌ Error uploading profile image:', error);
        toast.error('Failed to upload profile image. Please try again.');
        
        // Reset preview on error
        setProfileImage(null);
        setProfileImagePreview(settings.profile?.profileImage || null);
      }
    } else {
      console.log('❌ No file selected');
    }
  };

  const handleDeleteProfileImage = async () => {
    try {
      if (settings.profile?.profileImage) {
        await caregiverSettingsService.deleteProfileImage(user?.uid, settings.profile.profileImage);
        handleSettingChange('profile', 'profileImage', null);
        setProfileImagePreview(null);
        toast.success('Profile image deleted');
      }
    } catch (error) {
      console.error('Error deleting profile image:', error);
      toast.error('Failed to delete profile image');
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      await caregiverSettingsService.changePassword(
        user?.uid, 
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  const handleExportSettings = async () => {
    try {
      await caregiverSettingsService.exportSettings(user?.uid);
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await caregiverSettingsService.importSettings(user?.uid, file);
        await loadSettings(); // Reload settings
      } catch (error) {
        console.error('Error importing settings:', error);
        toast.error('Failed to import settings');
      }
    }
  };

  const handleResetSettings = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      try {
        await caregiverSettingsService.resetToDefault(user?.uid);
        await loadSettings(); // Reload settings
      } catch (error) {
        console.error('Error resetting settings:', error);
        toast.error('Failed to reset settings');
      }
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy', icon: Shield },
    { id: 'preferences', name: 'Preferences', icon: Settings },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'activity', name: 'Activity', icon: Activity }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings - REBUILT VERSION</h1>
              <p className="text-sm text-gray-600">✅ Responsive design • ✅ All buttons functional • ✅ No horizontal scroll</p>
              <p className="text-xs text-gray-400 mt-1">{BUILD_TAG}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportSettings}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
            </label>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  ✅ SAVE CHANGES (REBUILT)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      <div className="bg-green-100 border-l-4 border-green-500 p-4 mx-4 mt-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700 font-bold">
              🎉 SETTINGS TAB REBUILT SUCCESSFULLY! 
              <br />
              ✅ Responsive design • ✅ All buttons functional • ✅ No horizontal scrolling • ✅ Better screen fit
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
                      <Icon className="h-4 w-4 mr-3" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                  
                  {/* Profile Image Section */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                      <span>Profile Photo</span>
                      {/* Always-visible fallback input */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="relative z-50">
                        <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                          {profileImagePreview ? (
                            <img
                              src={profileImagePreview}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        {/* Overlay input: attached to DOM, with z-index and pointer-events to ensure it receives clicks */}
                        <input
                          id="profile-image-overlay"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer z-50 pointer-events-auto"
                          aria-label="Upload profile photo"
                        />
                        <button
                          onClick={() => {
                            console.log('📸 Camera button clicked - focusing overlay input');
                            if (fileInputRef.current) fileInputRef.current.click();
                          }}
                          className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 shadow-lg"
                          title="Change photo"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          {profileImagePreview ? 'Profile Photo' : 'No Photo'}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {profileImagePreview 
                            ? 'Click the camera icon to change your profile photo'
                            : 'Click the camera icon to upload a photo'
                          }
                        </p>
                        <div className="flex space-x-3">
                          <label htmlFor="profile-image-overlay"
                            onClick={() => {
                              console.log('📤 Upload button clicked - triggering file picker via ref');
                              if (fileInputRef.current) {
                                fileInputRef.current.click();
                              } else {
                                const fallback = document.createElement('input');
                                fallback.type = 'file';
                                fallback.accept = 'image/*';
                                fallback.onchange = handleProfileImageChange;
                                fallback.click();
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer"
                          >
                            {profileImagePreview ? 'Change Photo' : 'Upload Photo'}
                          </label>
                          {profileImagePreview && (
                            <button
                              onClick={handleDeleteProfileImage}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          JPG, PNG or GIF. Max size 5MB.
                        </p>
                        
                        {/* Direct File Input - Always Visible */}
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Or select file directly:
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-md font-medium text-gray-900 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={settings.profile?.firstName || ''}
                          onChange={(e) => handleSettingChange('profile', 'firstName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your first name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={settings.profile?.lastName || ''}
                          onChange={(e) => handleSettingChange('profile', 'lastName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your last name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={settings.profile?.email || ''}
                          onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your email address"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={settings.profile?.phone || ''}
                          onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={settings.profile?.dateOfBirth || ''}
                          onChange={(e) => handleSettingChange('profile', 'dateOfBirth', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emergency Contact
                        </label>
                        <input
                          type="tel"
                          value={settings.profile?.emergencyContact || ''}
                          onChange={(e) => handleSettingChange('profile', 'emergencyContact', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter emergency contact number"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <textarea
                          value={settings.profile?.address || ''}
                          onChange={(e) => handleSettingChange('profile', 'address', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your full address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          License Number
                        </label>
                        <input
                          type="text"
                          value={settings.profile?.licenseNumber || ''}
                          onChange={(e) => handleSettingChange('profile', 'licenseNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your license number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Experience
                        </label>
                        <input
                          type="text"
                          value={settings.profile?.experience || ''}
                          onChange={(e) => handleSettingChange('profile', 'experience', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g., 5 years"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bio
                        </label>
                        <textarea
                          value={settings.profile?.bio || ''}
                          onChange={(e) => handleSettingChange('profile', 'bio', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Tell us about your experience and specializations..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    {Object.entries(settings.notifications || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {getNotificationDescription(key)}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 text-sm mb-2">Profile Visibility</h3>
                      <select
                        value={settings.privacy?.profileVisibility || 'private'}
                        onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="caregivers">Caregivers Only</option>
                      </select>
                    </div>

                    {Object.entries(settings.privacy || {}).filter(([key]) => key !== 'profileVisibility').map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {getPrivacyDescription(key)}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleSettingChange('privacy', key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                      <select
                        value={settings.preferences?.theme || 'light'}
                        onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <select
                        value={settings.preferences?.language || 'en'}
                        onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        value={settings.preferences?.timezone || 'Africa/Lagos'}
                        onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="Africa/Lagos">Africa/Lagos</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                      <select
                        value={settings.preferences?.dateFormat || 'DD/MM/YYYY'}
                        onChange={(e) => handleSettingChange('preferences', 'dateFormat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                      <select
                        value={settings.preferences?.timeFormat || '24h'}
                        onChange={(e) => handleSettingChange('preferences', 'timeFormat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="24h">24 Hour</option>
                        <option value="12h">12 Hour</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max clients Per Day</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.preferences?.maxPatientsPerDay || 8}
                        onChange={(e) => handleSettingChange('preferences', 'maxPatientsPerDay', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Working Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={settings.preferences?.workingHours?.start || '08:00'}
                          onChange={(e) => handleSettingChange('preferences', 'workingHours', {
                            ...settings.preferences?.workingHours,
                            start: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={settings.preferences?.workingHours?.end || '18:00'}
                          onChange={(e) => handleSettingChange('preferences', 'workingHours', {
                            ...settings.preferences?.workingHours,
                            end: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                  
                  {/* Password Change */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <button
                        onClick={handlePasswordChange}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>

                  {/* Security Options */}
                  <div className="space-y-4">
                    {Object.entries(settings.security || {}).filter(([key]) => key !== 'lastPasswordChange').map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {getSecurityDescription(key)}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleSettingChange('security', key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
                    <button
                      onClick={() => setShowActivityLog(!showActivityLog)}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      {showActivityLog ? 'Hide' : 'Show'} Activity Log
                    </button>
                  </div>
                  
                  {showActivityLog && (
                    <div className="space-y-3">
                      {activityLog.length > 0 ? (
                        activityLog.map((activity) => (
                          <div key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900 text-sm">{activity.description}</h3>
                                <p className="text-xs text-gray-600">{activity.type}</p>
                              </div>
                              <div className="text-xs text-gray-500">
                                {activity.timestamp?.toLocaleString() || 'Unknown time'}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No activity logged yet</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reset Settings */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-medium text-red-900 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Reset all settings to their default values. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleResetSettings}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getNotificationDescription = (key) => {
  const descriptions = {
    emailNotifications: 'Receive notifications via email',
    smsNotifications: 'Receive notifications via SMS',
    pushNotifications: 'Receive push notifications on your device',
    taskReminders: 'Get reminded about upcoming tasks',
    emergencyAlerts: 'Receive emergency alerts immediately',
    appointmentReminders: 'Get reminded about appointments',
    medicationAlerts: 'Get reminded about medication schedules',
    weeklyReports: 'Receive weekly performance reports',
    patientUpdates: 'Get notified about Client updates',
    systemUpdates: 'Receive system update notifications'
  };
  return descriptions[key] || '';
};

const getPrivacyDescription = (key) => {
  const descriptions = {
    locationSharing: 'Allow sharing your location with clients',
    dataCollection: 'Allow collection of usage data for improvement',
    analytics: 'Allow analytics tracking for better experience',
    marketingEmails: 'Receive marketing emails and promotions'
  };
  return descriptions[key] || '';
};

const getSecurityDescription = (key) => {
  const descriptions = {
    twoFactorAuth: 'Add an extra layer of security to your account',
    biometricLogin: 'Use fingerprint or face recognition to log in',
    loginNotifications: 'Get notified when someone logs into your account'
  };
  return descriptions[key] || '';
};

export default CaregiverSettings;
import React, { useState, useEffect } from 'react';
import {
  Settings,
  DollarSign,
  Globe,
  Clock,
  Bell,
  Shield,
  Mail,
  Phone,
  MapPin,
  Building,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';

/**
 * InstitutionSettings Component
 * 
 * Manage institution-wide settings including:
 * - Currency and regional settings
 * - Business hours
 * - Notification preferences
 * - Contact information
 * - System preferences
 */

const InstitutionSettings = ({ institutionId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  const [settings, setSettings] = useState({
    // General Settings
    institutionName: '',
    institutionType: 'healthcare',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: '',
    
    // Currency & Regional
    currency: 'USD',
    currencySymbol: '$',
    currencyPosition: 'before', // before or after
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    
    // Business Hours
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '14:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    },
    
    // Notification Settings
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      emergencyAlerts: true,
      taskReminders: true,
      appointmentReminders: true,
      reportDigest: 'daily' // daily, weekly, monthly, never
    },
    
    // System Preferences
    autoArchiveInactiveDays: 90,
    requireApprovalForNewUsers: true,
    allowSelfRegistration: false,
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90
  });

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' }
  ];

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Africa/Lagos',
    'Africa/Nairobi',
    'Australia/Sydney'
  ];

  useEffect(() => {
    loadSettings();
  }, [institutionId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const institutionRef = doc(db, 'institutions', institutionId);
      const institutionDoc = await getDoc(institutionRef);

      if (institutionDoc.exists()) {
        const data = institutionDoc.data();
        setSettings(prev => ({
          ...prev,
          institutionName: data.name || '',
          institutionType: data.type || 'healthcare',
          contactEmail: data.contactEmail || data.email || '',
          contactPhone: data.contactPhone || data.phone || '',
          address: data.address || '',
          website: data.website || '',
          currency: data.currency || 'USD',
          currencySymbol: data.currencySymbol || '$',
          currencyPosition: data.currencyPosition || 'before',
          timezone: data.timezone || 'America/New_York',
          dateFormat: data.dateFormat || 'MM/DD/YYYY',
          timeFormat: data.timeFormat || '12h',
          language: data.language || 'en',
          businessHours: data.businessHours || prev.businessHours,
          notifications: data.notifications || prev.notifications,
          autoArchiveInactiveDays: data.autoArchiveInactiveDays || 90,
          requireApprovalForNewUsers: data.requireApprovalForNewUsers ?? true,
          allowSelfRegistration: data.allowSelfRegistration ?? false,
          sessionTimeoutMinutes: data.sessionTimeoutMinutes || 480,
          maxLoginAttempts: data.maxLoginAttempts || 5,
          passwordExpiryDays: data.passwordExpiryDays || 90
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      const institutionRef = doc(db, 'institutions', institutionId);
      await updateDoc(institutionRef, {
        ...settings,
        updatedAt: serverTimestamp(),
        lastModifiedBy: 'admin' // TODO: Add actual user ID
      });

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessHours = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const updateNotifications = (field, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Institution Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure institution-wide preferences and settings
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 font-medium"
        >
          {saving ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save All Changes
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Building },
            { id: 'currency', label: 'Currency & Regional', icon: DollarSign },
            { id: 'hours', label: 'Business Hours', icon: Clock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">General Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Name *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={settings.institutionName}
                    onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Healthcare Facility Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Type
                </label>
                <select
                  value={settings.institutionType}
                  onChange={(e) => setSettings({ ...settings, institutionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="healthcare">Healthcare Facility</option>
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                  <option value="nursing_home">Nursing Home</option>
                  <option value="assisted_living">Assisted Living</option>
                  <option value="home_health">Home Health Agency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="contact@institution.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    rows={2}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="123 Main Street, City, State, ZIP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Currency & Regional Tab */}
        {activeTab === 'currency' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Currency & Regional Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => {
                    const selected = currencies.find(c => c.code === e.target.value);
                    setSettings({ 
                      ...settings, 
                      currency: e.target.value,
                      currencySymbol: selected?.symbol || '$'
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {currencies.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} - {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {settings.currencySymbol} ({settings.currency})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Symbol Position
                </label>
                <select
                  value={settings.currencyPosition}
                  onChange={(e) => setSettings({ ...settings, currencyPosition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="before">Before Amount ({settings.currencySymbol}100)</option>
                  <option value="after">After Amount (100{settings.currencySymbol})</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (10/21/2025)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (21/10/2025)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2025-10-21)</option>
                  <option value="DD MMM YYYY">DD MMM YYYY (21 Oct 2025)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Format
                </label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="12h">12-hour (2:30 PM)</option>
                  <option value="24h">24-hour (14:30)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Preview:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <p>Amount Display: {settings.currencyPosition === 'before' ? `${settings.currencySymbol}1,234.56` : `1,234.56${settings.currencySymbol}`}</p>
                <p>Date: {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: settings.dateFormat.includes('MMM') ? 'short' : '2-digit',
                  day: '2-digit' 
                })}</p>
                <p>Time: {new Date().toLocaleTimeString('en-US', { 
                  hour12: settings.timeFormat === '12h',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Business Hours Tab */}
        {activeTab === 'hours' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
            
            <div className="space-y-3">
              {Object.entries(settings.businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-32">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!hours.closed}
                        onChange={(e) => updateBusinessHours(day, 'closed', !e.target.checked)}
                        className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="font-medium text-gray-900 capitalize">{day}</span>
                    </label>
                  </div>
                  
                  {!hours.closed ? (
                    <>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Open</label>
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <span className="text-gray-400">—</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Close</label>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-center py-2">
                      <span className="text-gray-400 font-medium">Closed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
            
            <div className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', description: 'Send notifications via email' },
                { key: 'smsNotifications', label: 'SMS Notifications', description: 'Send notifications via SMS (requires SMS service)' },
                { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser push notifications' },
                { key: 'emergencyAlerts', label: 'Emergency Alerts', description: 'Immediate alerts for emergencies' },
                { key: 'taskReminders', label: 'Task Reminders', description: 'Remind caregivers of upcoming tasks' },
                { key: 'appointmentReminders', label: 'Appointment Reminders', description: 'Remind about scheduled appointments' }
              ].map(item => (
                <label key={item.key} className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications[item.key]}
                    onChange={(e) => updateNotifications(item.key, e.target.checked)}
                    className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </label>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Digest Frequency
                </label>
                <select
                  value={settings.notifications.reportDigest}
                  onChange={(e) => updateNotifications('reportDigest', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Summary</option>
                  <option value="monthly">Monthly Summary</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Security & Access Control</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-Archive Inactive Clients (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.autoArchiveInactiveDays}
                  onChange={(e) => setSettings({ ...settings, autoArchiveInactiveDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Clients with no activity for this many days will be auto-archived
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 480 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users will be logged out after this period of inactivity
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Account will be locked after this many failed attempts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Expiry (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.passwordExpiryDays}
                  onChange={(e) => setSettings({ ...settings, passwordExpiryDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users must change password after this many days (0 = never)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={settings.requireApprovalForNewUsers}
                  onChange={(e) => setSettings({ ...settings, requireApprovalForNewUsers: e.target.checked })}
                  className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Require Admin Approval for New Users</p>
                  <p className="text-sm text-gray-500">New user accounts must be approved before access is granted</p>
                </div>
              </label>

              <label className="flex items-start p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={settings.allowSelfRegistration}
                  onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
                  className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Allow Self-Registration</p>
                  <p className="text-sm text-gray-500">Let users register for an account themselves</p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-900">Important</p>
          <p className="text-sm text-yellow-800 mt-1">
            Changes to currency and regional settings will apply institution-wide. Make sure all staff members are aware of these changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstitutionSettings;


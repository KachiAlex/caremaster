/**
 * SMS/WhatsApp Management Component
 * 
 * Features:
 * - Configure SMS/WhatsApp settings
 * - View message logs
 * - View statistics
 * - Send broadcast messages
 * - Test messages
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Settings,
  Send,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  getSettings,
  updateSettings,
  getMessageLogs,
  getMessageStats,
  sendMessage,
  sendBroadcast,
  MESSAGE_CHANNELS,
  MESSAGE_TYPES
} from '../api/smsWhatsAppAPI';

const SMSWhatsAppManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageLogs, setMessageLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [testMessage, setTestMessage] = useState({ phone: '', message: '', channel: MESSAGE_CHANNELS.SMS });
  const [broadcastMessage, setBroadcastMessage] = useState({ message: '', channel: MESSAGE_CHANNELS.SMS, phoneNumbers: '' });

  useEffect(() => {
    if (institutionId) {
      loadSettings();
      loadStats();
    }
  }, [institutionId]);

  useEffect(() => {
    if (activeTab === 'logs' && institutionId) {
      loadMessageLogs();
    }
  }, [activeTab, institutionId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsData = await getSettings(institutionId);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load SMS/WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  const loadMessageLogs = async () => {
    try {
      const logs = await getMessageLogs(institutionId, { limitCount: 100 });
      setMessageLogs(logs);
    } catch (error) {
      console.error('Error loading message logs:', error);
      toast.error('Failed to load message logs');
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getMessageStats(institutionId, 30);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateSettings(institutionId, settings);
      toast.success('Settings saved successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testMessage.phone || !testMessage.message) {
      toast.error('Please enter phone number and message');
      return;
    }

    try {
      await sendMessage(testMessage.phone, testMessage.message, testMessage.channel, {
        type: MESSAGE_TYPES.BROADCAST,
        metadata: { test: true }
      });
      toast.success('Test message sent successfully!');
      setTestMessage({ phone: '', message: '', channel: MESSAGE_CHANNELS.SMS });
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Failed to send test message');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.message || !broadcastMessage.phoneNumbers) {
      toast.error('Please enter message and phone numbers');
      return;
    }

    const phoneNumbers = broadcastMessage.phoneNumbers
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (phoneNumbers.length === 0) {
      toast.error('Please enter at least one phone number');
      return;
    }

    try {
      const result = await sendBroadcast(phoneNumbers, broadcastMessage.message, broadcastMessage.channel);
      toast.success(`Broadcast sent! ${result.successful} successful, ${result.failed} failed`);
      setBroadcastMessage({ message: '', channel: MESSAGE_CHANNELS.SMS, phoneNumbers: '' });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast');
    }
  };

  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">SMS/WhatsApp Management</h2>
              <p className="text-sm text-gray-600">Configure and manage SMS/WhatsApp notifications</p>
            </div>
          </div>
          {stats && (
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.total}</div>
                <div className="text-gray-600">Total Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
                <div className="text-gray-600">Success Rate</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 px-6">
            {[
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'logs', label: 'Message Logs', icon: FileText },
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
              { id: 'test', label: 'Test Message', icon: Send },
              { id: 'broadcast', label: 'Broadcast', icon: MessageSquare }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 inline mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">Enable SMS/WhatsApp</h3>
                  <p className="text-sm text-gray-600">Enable or disable SMS/WhatsApp notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled || false}
                    onChange={(e) => updateSetting('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Default Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Channel
                </label>
                <select
                  value={settings.defaultChannel || MESSAGE_CHANNELS.SMS}
                  onChange={(e) => updateSetting('defaultChannel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={MESSAGE_CHANNELS.SMS}>SMS</option>
                  <option value={MESSAGE_CHANNELS.WHATSAPP}>WhatsApp</option>
                  <option value={MESSAGE_CHANNELS.BOTH}>Both</option>
                </select>
              </div>

              {/* Queue Notifications */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Queue Notifications</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.queueNotifications?.enabled || false}
                      onChange={(e) => updateSetting('queueNotifications.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.queueNotifications?.enabled && (
                  <select
                    value={settings.queueNotifications?.channel || MESSAGE_CHANNELS.SMS}
                    onChange={(e) => updateSetting('queueNotifications.channel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={MESSAGE_CHANNELS.SMS}>SMS</option>
                    <option value={MESSAGE_CHANNELS.WHATSAPP}>WhatsApp</option>
                    <option value={MESSAGE_CHANNELS.BOTH}>Both</option>
                  </select>
                )}
              </div>

              {/* Appointment Reminders */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Appointment Reminders</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.appointmentReminders?.enabled || false}
                      onChange={(e) => updateSetting('appointmentReminders.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.appointmentReminders?.enabled && (
                  <div className="space-y-3">
                    <select
                      value={settings.appointmentReminders?.channel || MESSAGE_CHANNELS.SMS}
                      onChange={(e) => updateSetting('appointmentReminders.channel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={MESSAGE_CHANNELS.SMS}>SMS</option>
                      <option value={MESSAGE_CHANNELS.WHATSAPP}>WhatsApp</option>
                      <option value={MESSAGE_CHANNELS.BOTH}>Both</option>
                    </select>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Remind Before (hours)</label>
                      <input
                        type="number"
                        value={settings.appointmentReminders?.advanceHours || 24}
                        onChange={(e) => updateSetting('appointmentReminders.advanceHours', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="168"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lab Results */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Lab Results Notifications</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.labResults?.enabled || false}
                      onChange={(e) => updateSetting('labResults.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.labResults?.enabled && (
                  <select
                    value={settings.labResults?.channel || MESSAGE_CHANNELS.SMS}
                    onChange={(e) => updateSetting('labResults.channel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={MESSAGE_CHANNELS.SMS}>SMS</option>
                    <option value={MESSAGE_CHANNELS.WHATSAPP}>WhatsApp</option>
                    <option value={MESSAGE_CHANNELS.BOTH}>Both</option>
                  </select>
                )}
              </div>

              {/* Provider Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Provider Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMS Provider API Key</label>
                    <input
                      type="password"
                      value={settings.provider?.sms?.apiKey || ''}
                      onChange={(e) => updateSetting('provider.sms.apiKey', e.target.value)}
                      placeholder="Enter SMS provider API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Provider API Key</label>
                    <input
                      type="password"
                      value={settings.provider?.whatsapp?.apiKey || ''}
                      onChange={(e) => updateSetting('provider.whatsapp.apiKey', e.target.value)}
                      placeholder="Enter WhatsApp provider API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}

          {/* Message Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Message Logs</h3>
                <button
                  onClick={loadMessageLogs}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  <RefreshCw className="h-4 w-4 inline mr-2" />
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Phone</th>
                      <th className="px-4 py-2 text-left">Channel</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messageLogs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="px-4 py-2">{log.phoneNumber}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.channel === MESSAGE_CHANNELS.SMS ? 'bg-blue-100 text-blue-800' :
                            log.channel === MESSAGE_CHANNELS.WHATSAPP ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.channel}
                          </span>
                        </td>
                        <td className="px-4 py-2">{log.type}</td>
                        <td className="px-4 py-2">
                          {log.status === 'sent' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {messageLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No message logs found</div>
                )}
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Messages</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{stats.byStatus.sent}</div>
                  <div className="text-sm text-gray-600">Sent</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">By Channel</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>SMS</span>
                    <span className="font-semibold">{stats.byChannel[MESSAGE_CHANNELS.SMS] || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WhatsApp</span>
                    <span className="font-semibold">{stats.byChannel[MESSAGE_CHANNELS.WHATSAPP] || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Message Tab */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Send Test Message</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={testMessage.phone}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+2348012345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                <select
                  value={testMessage.channel}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, channel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={MESSAGE_CHANNELS.SMS}>SMS</option>
                  <option value={MESSAGE_CHANNELS.WHATSAPP}>WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={testMessage.message}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  placeholder="Enter test message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleTestMessage}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Message
              </button>
            </div>
          )}

          {/* Broadcast Tab */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Send Broadcast Message</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                <select
                  value={broadcastMessage.channel}
                  onChange={(e) => setBroadcastMessage(prev => ({ ...prev, channel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={MESSAGE_CHANNELS.SMS}>SMS</option>
                  <option value={MESSAGE_CHANNELS.WHATSAPP}>WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Numbers (one per line)</label>
                <textarea
                  value={broadcastMessage.phoneNumbers}
                  onChange={(e) => setBroadcastMessage(prev => ({ ...prev, phoneNumbers: e.target.value }))}
                  rows={6}
                  placeholder="+2348012345678&#10;+2348023456789&#10;+2348034567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={broadcastMessage.message}
                  onChange={(e) => setBroadcastMessage(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  placeholder="Enter broadcast message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleBroadcast}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Broadcast
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SMSWhatsAppManagement;


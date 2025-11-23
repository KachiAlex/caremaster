/**
 * Security Management Component
 * 
 * Features:
 * - Two-factor authentication setup
 * - Session management
 * - Audit log viewing
 * - Failed login attempt tracking
 * - Security settings
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  Search,
  RefreshCw,
  LogOut,
  Smartphone
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  twoFactorAPI,
  sessionAPI,
  loginAttemptAPI,
  getAuditLogs,
  logSecurityEvent
} from '../api/securityAPI';

const SecurityManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, user, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;
  const userId = user?.uid;

  const [activeTab, setActiveTab] = useState('2fa');
  const [loading, setLoading] = useState(true);

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verificationStep, setVerificationStep] = useState('setup'); // setup, verify, enabled

  // Sessions State
  const [activeSessions, setActiveSessions] = useState([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    resourceType: '',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Login Attempts State
  const [failedAttempts, setFailedAttempts] = useState([]);

  useEffect(() => {
    if (userId) {
      loadSecurityData();
    }
  }, [userId, activeTab]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      switch (activeTab) {
        case '2fa':
          const enabled = await twoFactorAPI.is2FAEnabled(userId);
          setIs2FAEnabled(enabled);
          break;
        case 'sessions':
          const sessions = await sessionAPI.getActiveSessions(userId);
          setActiveSessions(sessions);
          break;
        case 'audit':
          await loadAuditLogs();
          break;
        case 'login-attempts':
          if (userProfile?.email) {
            const attempts = await loginAttemptAPI.getRecentFailedAttempts(userProfile.email, 60 * 24); // Last 24 hours
            setFailedAttempts(attempts);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const startDate = new Date(auditFilters.startDate);
      const endDate = new Date(auditFilters.endDate);
      endDate.setHours(23, 59, 59, 999);

      const logs = await getAuditLogs({
        userId,
        institutionId,
        action: auditFilters.action || null,
        resourceType: auditFilters.resourceType || null,
        startDate,
        endDate,
        limitCount: 100
      });

      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    }
  };

  const handleEnable2FA = async () => {
    try {
      if (!userProfile?.email) {
        toast.error('Email address required for 2FA');
        return;
      }

      setVerificationStep('setup');
      setShow2FASetup(true);

      // Generate and send code
      await twoFactorAPI.generateAndSendCode(userId, userProfile.email);
      toast.info('2FA code sent to your email. Please check your inbox.');
      setVerificationStep('verify');
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast.error('Failed to enable 2FA');
    }
  };

  const handleVerify2FACode = async () => {
    try {
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        toast.error('Please enter a valid 6-digit code');
        return;
      }

      const result = await twoFactorAPI.verifyCode(userProfile.email, twoFactorCode);

      if (result.success) {
        await twoFactorAPI.enable2FA(userId, userProfile.email);
        setIs2FAEnabled(true);
        setShow2FASetup(false);
        setTwoFactorCode('');
        setVerificationStep('setup');
        toast.success('2FA enabled successfully!');
      } else {
        toast.error(result.message || 'Invalid code');
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      toast.error('Failed to verify code');
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    try {
      await twoFactorAPI.disable2FA(userId);
      setIs2FAEnabled(false);
      toast.success('2FA disabled successfully');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable 2FA');
    }
  };

  const handleEndSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to end this session?')) {
      return;
    }

    try {
      await sessionAPI.endSession(sessionId, userId);
      toast.success('Session ended successfully');
      loadSecurityData();
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
  };

  const getActionColor = (action) => {
    if (action.includes('login') || action.includes('session_created')) return 'text-green-600';
    if (action.includes('logout') || action.includes('session_ended')) return 'text-blue-600';
    if (action.includes('failed') || action.includes('lockout')) return 'text-red-600';
    if (action.includes('2fa')) return 'text-purple-600';
    return 'text-gray-600';
  };

  if (loading && activeTab === '2fa') {
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Security Management</h2>
              <p className="text-sm text-gray-600">Manage your account security settings</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex space-x-1 border-b border-gray-200">
          {[
            { id: '2fa', label: 'Two-Factor Auth', icon: Smartphone },
            { id: 'sessions', label: 'Active Sessions', icon: Clock },
            { id: 'audit', label: 'Audit Logs', icon: Eye },
            { id: 'login-attempts', label: 'Login Attempts', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2FA Tab */}
      {activeTab === '2fa' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
            
            {is2FAEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">2FA is enabled</p>
                    <p className="text-sm text-green-700">Your account is protected with two-factor authentication</p>
                  </div>
                </div>
                <button
                  onClick={handleDisable2FA}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Disable 2FA
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Two-factor authentication adds an extra layer of security to your account. 
                    When enabled, you'll need to enter a verification code in addition to your password when signing in.
                  </p>
                </div>
                <button
                  onClick={handleEnable2FA}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Lock className="h-5 w-5" />
                  Enable 2FA
                </button>
              </div>
            )}

            {/* 2FA Setup Modal */}
            {show2FASetup && verificationStep === 'verify' && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Enter Verification Code</h4>
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a 6-digit code to {userProfile?.email}. Please enter it below.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                  />
                  <button
                    onClick={handleVerify2FACode}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => {
                      setShow2FASetup(false);
                      setTwoFactorCode('');
                      setVerificationStep('setup');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
            <button
              onClick={loadSecurityData}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {activeSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active sessions</p>
            ) : (
              activeSessions.map(session => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{session.userAgent || 'Unknown Device'}</p>
                      <p className="text-sm text-gray-600">
                        IP: {session.ipAddress || 'N/A'} • 
                        Created: {formatTimestamp(session.createdAt)} • 
                        Last Activity: {formatTimestamp(session.lastActivity)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEndSession(session.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      End Session
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            <div className="flex gap-2">
              <button
                onClick={loadAuditLogs}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Refresh
              </button>
              <button
                onClick={() => {
                  // Export audit logs
                  const csv = auditLogs.map(log => 
                    `${log.timestamp},${log.action},${log.resourceType},${log.userId}`
                  ).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4 inline mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="date"
              value={auditFilters.startDate}
              onChange={(e) => setAuditFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="date"
              value={auditFilters.endDate}
              onChange={(e) => setAuditFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={auditFilters.action}
              onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="2fa_enabled">2FA Enabled</option>
              <option value="session_created">Session Created</option>
              <option value="session_ended">Session Ended</option>
            </select>
            <button
              onClick={loadAuditLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Resource</th>
                  <th className="px-4 py-2 text-left">IP Address</th>
                  <th className="px-4 py-2 text-left">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b">
                    <td className="px-4 py-2">{formatTimestamp(log.timestamp)}</td>
                    <td className={`px-4 py-2 font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </td>
                    <td className="px-4 py-2">{log.resourceType} ({log.resourceId})</td>
                    <td className="px-4 py-2">{log.ipAddress || 'N/A'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600 truncate max-w-xs">
                      {log.userAgent || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Login Attempts Tab */}
      {activeTab === 'login-attempts' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Login Attempts</h3>
          <div className="space-y-2">
            {failedAttempts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No failed login attempts in the last 24 hours</p>
            ) : (
              failedAttempts.map((attempt, idx) => (
                <div key={idx} className="border border-red-200 bg-red-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900">Failed Login Attempt</p>
                      <p className="text-sm text-red-700">
                        IP: {attempt.ipAddress || 'N/A'} • 
                        Time: {formatTimestamp(attempt.timestamp)}
                      </p>
                    </div>
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityManagement;


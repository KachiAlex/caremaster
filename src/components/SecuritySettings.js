import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Fingerprint, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import authSecurityService from '../services/authSecurityService';
import secureConfigService from '../services/secureConfigService';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const SecuritySettings = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [securityFeatures, setSecurityFeatures] = useState({
    twoFactorAuth: false,
    biometricAuth: false,
    dataEncryption: true,
    auditLogging: true,
    rateLimiting: true
  });

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = () => {
    const features = secureConfigService.getFeatureFlags();
    setSecurityFeatures(features);
    setTwoFactorEnabled(features.twoFactorAuth);
    setBiometricEnabled(features.biometricAuth);
  };

  const handle2FASetup = async () => {
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const verificationId = await authSecurityService.setupTwoFactorAuth(phoneNumber);
      setShowVerification(true);
      toast.success('Verification code sent to your phone');
      logger.info('2FA setup initiated', { phoneNumber });
    } catch (error) {
      toast.error('Failed to setup 2FA: ' + error.message);
      logger.error('2FA setup failed', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerification = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      await authSecurityService.verifyTwoFactorAuth(verificationCode);
      setTwoFactorEnabled(true);
      setShowVerification(false);
      toast.success('Two-factor authentication enabled successfully!');
      logger.info('2FA verification successful');
    } catch (error) {
      toast.error('Verification failed: ' + error.message);
      logger.error('2FA verification failed', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async () => {
    if (!biometricEnabled) {
      // Check if biometric authentication is supported
      if (!navigator.credentials || !navigator.credentials.create) {
        toast.error('Biometric authentication not supported on this device');
        return;
      }

      try {
        // Request biometric authentication
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: { name: "ElderX" },
            user: {
              id: new Uint8Array(16),
              name: "user@elderx.com",
              displayName: "ElderX User"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            }
          }
        });

        setBiometricEnabled(true);
        toast.success('Biometric authentication enabled!');
        logger.info('Biometric authentication enabled');
      } catch (error) {
        toast.error('Failed to enable biometric authentication: ' + error.message);
        logger.error('Biometric setup failed', { error: error.message });
      }
    } else {
      setBiometricEnabled(false);
      toast.success('Biometric authentication disabled');
      logger.info('Biometric authentication disabled');
    }
  };

  const handlePasswordChange = async () => {
    const currentPassword = prompt('Enter current password:');
    const newPassword = prompt('Enter new password:');
    const confirmPassword = prompt('Confirm new password:');

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authSecurityService.securePasswordChange(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      logger.info('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password: ' + error.message);
      logger.error('Password change failed', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityEvent = (event, details) => {
    authSecurityService.logSecurityEvent(event, details);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Settings</h1>
        <p className="text-gray-600">Manage your account security and privacy settings</p>
      </div>

      {/* Security Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Security Status</h2>
              <p className="text-sm text-gray-600">Your account security overview</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {securityFeatures.dataEncryption && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {securityFeatures.auditLogging && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {twoFactorEnabled && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {biometricEnabled && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {twoFactorEnabled ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Disabled
              </span>
            )}
          </div>
        </div>

        {!twoFactorEnabled && !showVerification && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handle2FASetup}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {showVerification && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handle2FAVerification}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => setShowVerification(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Biometric Authentication */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Fingerprint className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Biometric Authentication</h3>
              <p className="text-sm text-gray-600">Use fingerprint or face recognition for quick access</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {biometricEnabled ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Available
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleBiometricToggle}
          disabled={loading}
          className="btn btn-outline"
        >
          {biometricEnabled ? 'Disable Biometric' : 'Enable Biometric'}
        </button>
      </div>

      {/* Password Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Eye className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Password Management</h3>
            <p className="text-sm text-gray-600">Change your password and manage security</p>
          </div>
        </div>

        <button
          onClick={handlePasswordChange}
          disabled={loading}
          className="btn btn-outline"
        >
          Change Password
        </button>
      </div>

      {/* Security Features Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Data Encryption</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Audit Logging</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Rate Limiting</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Session Timeout</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">Security Tips</h3>
        <ul className="space-y-2 text-sm text-yellow-700">
          <li>• Use a strong, unique password for your account</li>
          <li>• Enable two-factor authentication for extra security</li>
          <li>• Keep your phone number updated for 2FA</li>
          <li>• Log out from shared or public devices</li>
          <li>• Report any suspicious activity immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default SecuritySettings;

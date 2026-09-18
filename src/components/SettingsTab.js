/**
 * SettingsTab - Reusable settings tab for all dashboards.
 *
 * Renders a consistent settings layout with:
 *   - Account info card (name, email, role)
 *   - Change password card (ChangePasswordForm)
 *   - Optional children for institution-specific settings
 *
 * Usage:
 *   <SettingsTab
 *     user={user}
 *     userProfile={userProfile}
 *     institutionName="CareMaster Clinic"
 *   >
 *     <InstitutionSettings institutionId={institutionId} />
 *   </SettingsTab>
 */

import React from 'react';
import { Settings, Lock, User, Mail, Building, Shield } from 'lucide-react';
import ChangePasswordForm from './ChangePasswordForm';

const SettingsTab = ({
  user,
  userProfile,
  institutionName,
  children,
}) => {
  const displayName =
    userProfile?.name ||
    userProfile?.fullName ||
    userProfile?.firstName ||
    user?.displayName ||
    'User';
  const email = userProfile?.email || user?.email || '';
  const role =
    userProfile?.userType ||
    userProfile?.type ||
    userProfile?.role ||
    user?.userType ||
    'User';

  const roleLabel = role
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-600">
            Manage your account and preferences.
          </p>
        </div>
        <Settings className="h-8 w-8 text-gray-400" />
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Account Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Role</p>
              <p className="text-sm font-medium text-gray-900 truncate">{roleLabel}</p>
            </div>
          </div>
          {institutionName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Institution</p>
                <p className="text-sm font-medium text-gray-900 truncate">{institutionName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-600" />
          Change Password
        </h4>
        <p className="text-sm text-gray-600 mb-5">
          Update your password to keep your account secure. After changing, other
          devices will need to log in again.
        </p>
        <ChangePasswordForm />
      </div>

      {/* Optional institution-specific settings */}
      {children}
    </div>
  );
};

export default SettingsTab;

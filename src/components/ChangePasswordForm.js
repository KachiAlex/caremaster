/**
 * ChangePasswordForm - Reusable password change component.
 *
 * Calls POST /api/auth/change-password with the current and new passwords.
 * Enforces client-side validation mirroring the backend rules:
 *   - Min 8 characters, max 128
 *   - At least one letter and one number
 *   - New password must differ from the current password
 *
 * On success, shows a confirmation toast and resets the form. The backend
 * invalidates all other sessions automatically; the caller's session stays
 * active so they do not need to log in again.
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE = () =>
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

const ChangePasswordForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // --- Password strength meter ---
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E'];
    const idx = Math.min(score, 5) - 1;
    return { score: Math.max(score, 0), label: score > 0 ? labels[idx] : '', color: score > 0 ? colors[idx] : '' };
  };

  const strength = getPasswordStrength(form.newPassword);

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) {
      errs.currentPassword = 'Current password is required';
    }
    if (!form.newPassword) {
      errs.newPassword = 'New password is required';
    } else if (form.newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters';
    } else if (form.newPassword.length > 128) {
      errs.newPassword = 'Password must not exceed 128 characters';
    } else if (!/[A-Za-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
      errs.newPassword = 'Password must contain at least one letter and one number';
    } else if (form.newPassword === form.currentPassword) {
      errs.newPassword = 'New password must be different from the current password';
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password';
    } else if (form.confirmPassword !== form.newPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleShow = (field) => () => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const url = `${API_BASE()}/auth/change-password`;
      const headers = {
        'Content-Type': 'application/json',
      };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Map backend validation messages to field-level errors where possible
        const msg = data.message || 'Failed to change password';
        if (msg.toLowerCase().includes('current password is incorrect')) {
          setErrors({ currentPassword: msg });
        } else if (msg.toLowerCase().includes('different from the current')) {
          setErrors({ newPassword: msg });
        } else if (msg.toLowerCase().includes('at least') || msg.toLowerCase().includes('letter and one number')) {
          setErrors({ newPassword: msg });
        }
        toast.error(msg);
        return;
      }

      toast.success('Password changed successfully. Other devices will need to log in again.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (onSuccess) onSuccess(data);
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Current Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Current Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type={showPasswords.current ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={handleChange('currentPassword')}
            disabled={loading}
            autoComplete="current-password"
            className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.currentPassword ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Enter your current password"
          />
          <button
            type="button"
            onClick={toggleShow('current')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.currentPassword}
          </p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type={showPasswords.new ? 'text' : 'password'}
            value={form.newPassword}
            onChange={handleChange('newPassword')}
            disabled={loading}
            autoComplete="new-password"
            className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.newPassword ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Enter your new password"
          />
          <button
            type="button"
            onClick={toggleShow('new')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.newPassword}
          </p>
        )}
        {/* Strength meter */}
        {form.newPassword && !errors.newPassword && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: i <= strength.score ? strength.color : '#E5E7EB',
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs" style={{ color: strength.color }}>
              {strength.label}
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            disabled={loading}
            autoComplete="new-password"
            className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.confirmPassword ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Re-enter your new password"
          />
          <button
            type="button"
            onClick={toggleShow('confirm')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
          </p>
        )}
        {!errors.confirmPassword && form.confirmPassword && form.confirmPassword === form.newPassword && (
          <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Passwords match
          </p>
        )}
      </div>

      {/* Requirements hint */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-900 mb-1">Password requirements:</p>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li className={form.newPassword.length >= 8 ? 'text-green-600' : ''}>
            • At least 8 characters
          </li>
          <li className={/[A-Za-z]/.test(form.newPassword) && /[0-9]/.test(form.newPassword) ? 'text-green-600' : ''}>
            • At least one letter and one number
          </li>
          <li className={form.newPassword && form.newPassword !== form.currentPassword ? 'text-green-600' : ''}>
            • Different from your current password
          </li>
        </ul>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Changing Password...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Change Password
          </>
        )}
      </button>
    </form>
  );
};

export default ChangePasswordForm;

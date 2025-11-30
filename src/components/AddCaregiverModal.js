import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { createCompleteUserAccount } from '../utils/userCreationHelper';

const AddCaregiverModal = ({ isOpen, onClose, institutionId, createdBy, onCaregiverCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'caregiver' // caregiver, nurse, doctor
  });
  
  const [errors, setErrors] = useState({});

  const roles = [
    { value: 'caregiver', label: 'Caregiver' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'pharmacist', label: 'Pharmacist' }
  ];

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    try {
      // Split name into first and last name
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Map role to userType
      const userTypeMap = {
        'caregiver': 'caregiver',
        'nurse': 'nurse',
        'doctor': 'doctor',
        'pharmacist': 'pharmacist'
      };

      const userData = {
        firstName,
        lastName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        userType: userTypeMap[formData.role] || 'caregiver',
        password: formData.password
      };

      // Create user account with onboardingComplete: false
      const result = await createCompleteUserAccount(userData, {
        institutionId,
        createdBy,
        accountType: 'admin_created',
        onboardingComplete: false // Caregiver needs to complete onboarding
      });

      const roleLabel = roles.find(r => r.value === formData.role)?.label || 'Staff';
      toast.success(
        <>
          <div className="font-bold mb-2">{roleLabel} Account Created Successfully!</div>
          <div className="text-sm">
            <div>Email: <strong>{result.email}</strong></div>
            <div className="mt-2 text-xs opacity-80">
              The {roleLabel.toLowerCase()} will receive login credentials via email and be prompted to complete onboarding on first login.
            </div>
            <div className="mt-1 text-xs text-amber-600 font-medium">
              ⚠️ Please securely share the password with the {roleLabel.toLowerCase()} through a secure channel.
            </div>
          </div>
        </>,
        { autoClose: 8000, position: 'top-center' }
      );

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'caregiver'
      });
      setErrors({});

      // Notify parent
      if (onCaregiverCreated) {
        onCaregiverCreated(result);
      }

      onClose();
    } catch (error) {
      console.error('Error creating caregiver:', error);
      
      let errorMessage = 'Failed to create caregiver account';
      
      if (error.code === 'auth/email-already-in-use') {
        // Set error on the email field for better UX
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered. Please use a different email or check if the user already exists in your staff list.'
        }));
        toast.error(
          <>
            <div className="font-bold">Email Already In Use</div>
            <div className="text-sm mt-1">
              The email "{formData.email}" is already registered in the system. 
              If this person should have access, check your existing staff list.
            </div>
          </>,
          { autoClose: 6000 }
        );
        return;
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: 'Invalid email address format' }));
        errorMessage = 'Invalid email address format';
      } else if (error.code === 'auth/weak-password') {
        setErrors(prev => ({ ...prev, password: 'Password is too weak (minimum 6 characters required)' }));
        errorMessage = 'Password is too weak (minimum 6 characters required)';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[95vh] my-4 flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">Add New Staff Member</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">Create a {roles.find(r => r.value === formData.role)?.label.toLowerCase() || 'staff'} account</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors shrink-0 ml-2"
            disabled={loading}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John Doe"
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              E-Mail *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john.doe@example.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Mobile Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+1 (555) 123-4567"
              disabled={loading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role/Type *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline h-4 w-4 mr-1" />
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Min. 6 characters"
              disabled={loading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 shrink-0 mr-3 mt-0.5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{roles.find(r => r.value === formData.role)?.label || 'Staff'} account will be created</li>
                  <li>They will complete onboarding on first login</li>
                  <li>They cannot access dashboard until onboarding is complete</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6 sticky bottom-0 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Add {roles.find(r => r.value === formData.role)?.label || 'Staff'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCaregiverModal;


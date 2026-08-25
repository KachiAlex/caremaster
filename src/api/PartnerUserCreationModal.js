import React, { useState } from 'react';
import { X, User, Mail, Phone, Briefcase, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { collection, query, getDocs, setDoc, where, doc } from 'backend/database';
import { db } from '../backend/config';

const PartnerUserCreationModal = ({ isOpen, onClose, institutionId, createdBy, onUserCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    userType: 'caregiver',
    medicalQualification: '',
    specialization: '',
    licenseNumber: '',
    useTemporaryPassword: true,
    password: ''
  });
  
  const [errors, setErrors] = useState({});

  const userTypes = [
    { value: 'caregiver', label: 'Caregiver (Non-Medical)', medicalQualification: 'Caregiver (Non-Medical)', tier: null },
    { value: 'nurse', label: 'Nurse (RN/LPN)', medicalQualification: 'Registered Nurse', tier: null },
    { value: 'doctor', label: 'Doctor/Physician', medicalQualification: 'Doctor', tier: null },
    { value: 'pharmacist', label: 'Pharmacist', medicalQualification: 'Pharmacist', tier: null }
  ];

  const validate = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // For pharmacists, password is always required
    const isPharmacist = formData.userType === 'pharmacist';
    if (isPharmacist) {
      if (!formData.password) {
        newErrors.password = 'Password is required for pharmacists';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    } else {
      // For other user types, validate if not using temporary password
      if (!formData.useTemporaryPassword && !formData.password) {
        newErrors.password = 'Password is required';
      } else if (!formData.useTemporaryPassword && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form', { autoClose: 3000 });
      return;
    }

    setLoading(true);
    try {
      const selectedType = userTypes.find(t => t.value === formData.userType);
      const email = formData.email.trim().toLowerCase();
      const role = formData.userType;
      const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

      // Generate password if using temporary password
      const password = (role === 'pharmacist' || !formData.useTemporaryPassword)
        ? formData.password
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase();

      // Check for duplicate email in Database
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        setLoading(false);
        return;
      }

      // Create Backend Auth user via REST API (does NOT sign out current admin)
      const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
      const backendApiKey = process.env.REACT_APP_BACKEND_API_KEY || '';
      const authResponse = await fetch(`${AUTH_BASE_URL}:signUp?key=${backendApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const authData = await authResponse.json();

      if (!authResponse.ok || authData.error) {
        const msg = authData.error?.message || 'Backend auth creation failed';
        if (msg.includes('EMAIL_EXISTS')) {
          toast.error('Email already exists. Please use a different email.');
          setLoading(false);
          return;
        }
        throw new Error(msg);
      }

      const userId = authData.localId;
      if (!userId) {
        throw new Error('No user ID returned from Backend Auth');
      }

      // Create Database profile
      const userProfile = {
        uid: userId,
        email,
        name,
        displayName: name,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),

        userType: role,
        type: role,
        role,
        roles: [role],
        medicalQualification: formData.medicalQualification || selectedType?.medicalQualification || '',
        specialization: formData.specialization || '',
        licenseNumber: formData.licenseNumber || '',

        institutionId,
        status: 'pending',
        isActive: true,
        active: true,

        onboardingComplete: false,
        profileComplete: false,
        accountType: 'institution_created',

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: createdBy || 'admin'
      };

      await setDoc(doc(db, 'users', userId), userProfile);
      // Also write to role-specific collection
      const roleCollection = role === 'pharmacist' ? 'pharmacists' : 'caregivers';
      await setDoc(doc(db, roleCollection, userId), userProfile, { merge: true });

      const result = { uid: userId, email, temporaryPassword: formData.useTemporaryPassword ? password : undefined, userData: userProfile };

      // Show success message
      if (formData.useTemporaryPassword && role !== 'pharmacist') {
        sessionStorage.setItem(`tempPassword_${userId}`, password);
        toast.success(
          <>
            <div className="font-bold mb-2">User Created Successfully!</div>
            <div className="text-sm">
              <div>Email: <strong>{email}</strong></div>
              <div className="mt-2 text-xs opacity-80">
                Temporary password: <strong>{password}</strong> (shown once)
              </div>
            </div>
          </>,
          { autoClose: 10000, position: 'top-center' }
        );
      } else {
        toast.success(
          <>
            <div className="font-bold mb-2">{role.charAt(0).toUpperCase() + role.slice(1)} Account Created!</div>
            <div className="text-sm">
              <div>Email: <strong>{email}</strong></div>
            </div>
          </>,
          { autoClose: 8000, position: 'top-center' }
        );
      }

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        userType: 'caregiver',
        medicalQualification: '',
        specialization: '',
        licenseNumber: '',
        useTemporaryPassword: true,
        password: ''
      });

      if (onUserCreated) {
        onUserCreated(result);
      }

      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user account. Please try again.', { autoClose: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeChange = (userType) => {
    const selectedType = userTypes.find(t => t.value === userType);
    const isPharmacist = userType === 'pharmacist';
    setFormData({
      ...formData,
      userType,
      medicalQualification: selectedType?.medicalQualification || '',
      // For pharmacists, disable temporary password and require actual password
      useTemporaryPassword: isPharmacist ? false : formData.useTemporaryPassword,
      password: isPharmacist ? formData.password : (formData.useTemporaryPassword ? '' : formData.password)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Create New User</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">Add a new user to your institution</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors flex-shrink-0"
            disabled={loading}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* User Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type / Role *
            </label>
            <select
              value={formData.userType}
              onChange={(e) => handleUserTypeChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {userTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John"
                disabled={loading}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.firstName}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Doe"
                disabled={loading}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address *
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
            </div>
          </div>

          {/* Medical Qualification & Specialization */}
          {formData.userType !== 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="inline h-4 w-4 mr-1" />
                  Medical Qualification
                </label>
                <input
                  type="text"
                  value={formData.medicalQualification}
                  onChange={(e) => setFormData({...formData, medicalQualification: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., RN, MD, PharmD"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Geriatric Care"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* License Number */}
          {['doctor', 'nurse', 'pharmacist'].includes(formData.userType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional License Number
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter license number"
                disabled={loading}
              />
            </div>
          )}

          {/* Password Options */}
          <div className="space-y-3">
            {formData.userType === 'pharmacist' ? (
              // For pharmacists, password is always required (no temporary option)
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password * <span className="text-xs text-gray-500 font-normal">(Required - can be changed later)</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter password (minimum 6 characters)"
                  disabled={loading}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The pharmacist can change this password after logging in for the first time.
                </p>
              </div>
            ) : (
              // For other user types, show temporary password option
              <>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useTemporaryPassword}
                    onChange={(e) => setFormData({...formData, useTemporaryPassword: e.target.checked, password: ''})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">Generate temporary password (recommended)</span>
                </label>

                {!formData.useTemporaryPassword && (
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
                      placeholder="Minimum 6 characters"
                      disabled={loading}
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.password}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info Box */}
          <div className={`border rounded-lg p-4 ${
            formData.userType === 'primary-admin' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex">
              <AlertCircle className={`h-5 w-5 shrink-0 mr-3 mt-0.5 ${
                formData.userType === 'primary-admin' ? 'text-red-600' : 'text-blue-600'
              }`} />
              <div className={`text-sm ${
                formData.userType === 'primary-admin' ? 'text-red-800' : 'text-blue-800'
              }`}>
                <p className="font-medium mb-1">User will be created with:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Access to the institution dashboard</li>
                  <li>Role: {userTypes.find(t => t.value === formData.userType)?.label}</li>
                  <li>Status: Active</li>
                  {formData.userType === 'pharmacist' ? (
                    <li>Password set by admin (can be changed after first login)</li>
                  ) : formData.useTemporaryPassword ? (
                    <li>Temporary password (must be changed on first login)</li>
                  ) : null}
                  {formData.userType === 'primary-admin' && (
                    <li className="font-bold text-red-900">⚠️ Primary admin - Cannot be deleted by other admins</li>
                  )}
                  {formData.userType === 'secondary-admin' && (
                    <li>Secondary admin - Full access except deleting primary admin</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions - Sticky Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 mt-6 flex items-center justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartnerUserCreationModal;


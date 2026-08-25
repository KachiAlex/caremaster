import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import rateLimiter from '../utils/rateLimiter';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'backend/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from '../services/databaseCompat';
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  Loader,
  AlertCircle,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import authSecurityService from '../services/authSecurityService';
import emailService from '../services/emailService';
// LICENSE CHECK IMPORT
import { fetchLicenseStatus } from '../services/licenseService';
import { db, auth } from '../backend/config';
import { collection, query, getDocs, getDoc, setDoc, where, doc } from 'backend/database';

const PartnerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetSent, setResetSent] = useState(false);
  const [institution, setPartner] = useState(null);

  // Cooldown timer for password reset
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    role: 'caregiver', // caregiver, nurse, doctor, pharmacist
    rememberMe: false
  });

  // Get role and institution from URL params (fallback to localStorage for Capacitor WebView)
  const roleParam = searchParams.get('role') || localStorage.getItem('portalRole') || 'caregiver';
  const institutionId = searchParams.get('institution') || localStorage.getItem('institutionId') || 'demo-institution';
  
  // Determine effective institution ID
  const effectivePartnerId = institution?.id || institutionId;

  useEffect(() => {
    const loadPartner = async () => {
      if (!effectivePartnerId) {
        setError('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch institution from Database instead of dead REST API
        const instDoc = await getDoc(doc(db, 'institutions', effectivePartnerId));
        if (instDoc.exists()) {
          setPartner({ id: instDoc.id, ...instDoc.data() });
        } else {
          // If no Database doc, create a minimal placeholder so login can proceed
          setPartner({ id: effectivePartnerId, name: 'Institution' });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading institution:', error);
        // Don't block login if institution fetch fails
        setPartner({ id: effectivePartnerId, name: 'Institution' });
        setLoading(false);
      }
    };

    loadPartner();
  }, [effectivePartnerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const routeUserToDashboard = async (user, userData) => {
    // Called as routeUserToDashboard(result.user) with a single argument, so userData may be undefined
    const effectiveUserData = userData || user || {};
    const userRole = effectiveUserData.type || effectiveUserData.userType;
    const userPartnerId = effectiveUserData.institutionId || effectivePartnerId;

    console.log('📍 PartnerLogin - Routing user to dashboard:', {
      userRole,
      roleParam,
      institutionId: userPartnerId,
      onboardingComplete: effectiveUserData.onboardingComplete,
      currentUrl: window.location.href
    });

    // Route based on the portal they chose (roleParam), not just their user role
    // TOP-LEVEL ADMIN CHECK: Any user with admin role is exempt from onboarding
    const hasAdminRole = (
      userRole === 'admin' || 
      userRole === 'institutionAdmin' ||
      (Array.isArray(effectiveUserData?.roles) && (effectiveUserData.roles.includes('admin') || effectiveUserData.roles.includes('institutionAdmin'))) ||
      effectiveUserData?.userType === 'admin' ||
      effectiveUserData?.type === 'admin' ||
      effectiveUserData?.role === 'admin' ||
      effectiveUserData?.userType === 'institutionAdmin' ||
      effectiveUserData?.type === 'institutionAdmin' ||
      effectiveUserData?.role === 'institutionAdmin'
    );
    
    if (hasAdminRole) {
      // Admin portal - route to admin dashboard
      const adminUrl = `/institution-admin/dashboard${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
      console.log('🏢 Admin portal (admin role detected) - navigating to:', adminUrl);
      navigate(adminUrl);
    } else if (roleParam === 'pharmacist') {
      // Pharmacist portal - check onboarding status (same flow as caregivers)
      if (!effectiveUserData.onboardingComplete) {
        const onboardingUrl = `/institution-caregiver/onboarding${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('💊 Pharmacist portal (onboarding) - navigating to:', onboardingUrl);
        navigate(onboardingUrl);
      } else if (effectiveUserData.status === 'active') {
        // Onboarding complete and active - go to pharmacist dashboard
        const pharmacistUrl = `/institution-pharmacy/dashboard${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('💊 Pharmacist portal (active) - navigating to:', pharmacistUrl);
        navigate(pharmacistUrl);
      } else {
        // Other status
        toast.error(`Your account status is "${effectiveUserData.status}". Please contact your administrator.`);
        navigate('/login');
      }
    } else if (roleParam === 'caregiver') {
      // Caregiver portal - check onboarding and approval status
      if (!effectiveUserData.onboardingComplete) {
        const onboardingUrl = `/institution-caregiver/onboarding${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('👥 Caregiver portal (onboarding) - navigating to:', onboardingUrl);
        navigate(onboardingUrl);
      } else if (effectiveUserData.status === 'pending' || !effectiveUserData.status) {
        // Onboarding complete but awaiting admin approval
        const pendingUrl = `/institution-caregiver/pending-approval${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('👥 Caregiver portal (pending) - navigating to:', pendingUrl);
        navigate(pendingUrl);
      } else if (effectiveUserData.status === 'active') {
        // Approved - go to dashboard
        const dashboardUrl = `/institution-caregiver/dashboard${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('👥 Caregiver portal (active) - navigating to:', dashboardUrl);
        navigate(dashboardUrl);
      } else {
        // Rejected or other status
        toast.error(`Your account status is "${effectiveUserData.status}". Please contact your administrator.`);
        navigate('/login');
      }
    } else {
      // Fallback - route based on user role
      console.log('⚠️ Fallback routing based on user role:', userRole);
      if (userRole === 'admin' || userRole === 'institutionAdmin') {
        const fallbackAdminUrl = `/institution-admin/dashboard${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('🏢 Fallback admin - navigating to:', fallbackAdminUrl);
        navigate(fallbackAdminUrl);
      } else if (userRole === 'doctor' || userRole === 'nurse' || userRole === 'caregiver') {
        const fallbackCaregiverUrl = `/institution-caregiver/dashboard${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
        console.log('👥 Fallback caregiver - navigating to:', fallbackCaregiverUrl);
        navigate(fallbackCaregiverUrl);
      } else if (userRole === 'pharmacist') {
        // Check onboarding status for pharmacists
        if (!effectiveUserData.onboardingComplete) {
          const fallbackOnboardingUrl = `/institution-caregiver/onboarding${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
          console.log('💊 Fallback pharmacist (onboarding) - navigating to:', fallbackOnboardingUrl);
          navigate(fallbackOnboardingUrl);
        } else {
          const fallbackPharmacistUrl = `/institution-pharmacy/dashboard${userPartnerId ? `?institution=${userPartnerId}` : ''}`;
          console.log('💊 Fallback pharmacist (active) - navigating to:', fallbackPharmacistUrl);
          navigate(fallbackPharmacistUrl);
        }
      } else {
        console.log('❓ Unknown role - navigating to welcome');
        navigate('/institution/welcome');
      }
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      // Rate limit check
      const rateLimitKey = email;
      const rateLimitCheck = rateLimiter.checkLimit(rateLimitKey, {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        lockoutDuration: 30 * 60 * 1000
      });

      if (!rateLimitCheck.allowed) {
        if (rateLimitCheck.locked) {
          const minutes = Math.ceil(rateLimitCheck.lockoutDuration / 60);
          setError(`Account temporarily locked due to too many failed attempts. Please try again in ${minutes} minute(s).`);
          setSubmitting(false);
          return;
        } else {
          setError('Too many login attempts. Please try again later.');
          setSubmitting(false);
          return;
        }
      }

      // Backend Auth sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const backendUser = userCredential.user;

      // Fetch user profile from Database
      let userData = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', backendUser.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      } catch (databaseErr) {
        console.warn('Database profile fetch failed:', databaseErr.message);
      }

      // Cache profile in localStorage
      const profileToCache = userData || { uid: backendUser.uid, email: backendUser.email, displayName: backendUser.displayName };
      localStorage.setItem('user', JSON.stringify(profileToCache));

      rateLimiter.reset(rateLimitKey);

      // License check
      try {
        const licenseStatus = await fetchLicenseStatus(institutionId);
        if (!licenseStatus.active) {
          toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}.`);
          navigate(`/license-required?institution=${institutionId}`, { replace: true });
          setSubmitting(false);
          return;
        }
      } catch (licenseError) {
        console.warn('License check failed, allowing login:', licenseError.message);
      }

      toast.success('Login successful!');
      await routeUserToDashboard(profileToCache);
    } catch (error) {
      console.error('Login error:', error);
      let msg = 'Login failed';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        msg = 'This account has been disabled. Please contact support.';
      } else if (error.message) {
        msg = error.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setSubmitting(false);
      return;
    }

    if (!formData.displayName.trim()) {
      setError('Name is required');
      setSubmitting(false);
      return;
    }

    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;
      const name = formData.displayName.trim();
      const role = formData.role;
      const phone = formData.phone || '';

      // Check if email already exists in Database
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        setError('An account with this email already exists');
        toast.error('Email already registered. Please log in instead.');
        setSubmitting(false);
        return;
      }

      // Create Backend Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const backendUser = userCredential.user;

      // Update auth profile
      await updateProfile(backendUser, { displayName: name });

      // Create Database user document
      const userProfile = {
        uid: backendUser.uid,
        email,
        name,
        displayName: name,
        phone: phone || '',

        // Role fields
        userType: role,
        type: role,
        role,
        roles: [role],

        // Institution
        institutionId: effectivePartnerId,

        // Status
        status: 'pending',
        isActive: true,
        active: true,

        // Onboarding
        onboardingComplete: false,
        profileComplete: false,
        accountType: 'self_registered',

        // Payment defaults
        paymentType: 'hourly',
        hourlyRate: 0,
        monthlyRate: 0,
        rateType: 'per_hour',
        currency: 'USD',

        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', backendUser.uid), userProfile);
      await setDoc(doc(db, 'caregivers', backendUser.uid), userProfile, { merge: true });

      // Cache profile
      localStorage.setItem('user', JSON.stringify(userProfile));

      // License check
      try {
        const licenseStatus = await fetchLicenseStatus(institutionId);
        if (!licenseStatus.active) {
          toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}.`);
          navigate(`/license-required?institution=${institutionId}`, { replace: true });
          setSubmitting(false);
          return;
        }
      } catch (licenseError) {
        console.warn('License check failed, allowing signup:', licenseError.message);
      }

      toast.success('Account created successfully!');
      await routeUserToDashboard(userProfile);
    } catch (error) {
      console.error('Sign up error:', error);
      let msg = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email format';
      } else if (error.message) {
        msg = error.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !institution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/login?institution=${institutionId}`)}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to institution page
        </button>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {institution?.name}
            </h1>
            <p className="text-gray-600 mb-1">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
            <p className="text-sm font-medium text-blue-600">
              {roleParam === 'admin' && '🛡️ Admin Portal'}
              {roleParam === 'caregiver' && '👨‍⚕️ Caregiver Portal (Doctors, Nurses & Caregivers)'}
              {roleParam === 'pharmacist' && '💊 Pharmacist Portal'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="caregiver">Caregiver</option>
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Partner Admin</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Sign In/Sign Up */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setResetEmail(formData.email || '');
                  setShowResetModal(true);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Reset your password</h3>
                <p className="text-sm text-blue-100">Enter your email to receive a password reset link.</p>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close reset password modal"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!resetEmail) {
                  toast.error('Please enter your email address');
                  return;
                }
                if (resetCooldown > 0) {
                  toast.error(`Please wait ${resetCooldown} seconds before requesting another reset.`);
                  return;
                }

                // Rate limit check
                const resetRateLimitKey = `password_reset_${resetEmail.toLowerCase().trim()}`;
                if (!rateLimiter.check(resetRateLimitKey)) {
                  toast.error('Too many reset attempts. Please try again later.');
                  return;
                }

                setResettingPassword(true);
                try {
                  const result = await emailService.requestPasswordReset({ email: resetEmail.trim() });
                  rateLimiter.record(resetRateLimitKey);
                  toast.success(result.message || 'If an account exists with this email, a reset link has been sent.');
                  setResetSent(true);
                  setResetCooldown(60); // 60 second cooldown
                } catch (resetError) {
                  console.error('Password reset failed:', resetError);
                  const message = resetError?.message || 'Failed to send password reset email. Please try again.';
                  toast.error(message);
                } finally {
                  setResettingPassword(false);
                }
              }}
              className="px-6 py-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your account email"
                  />
                </div>
              </div>

              {resetSent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <p>A reset link has been sent. Please check your inbox and spam folder.</p>
                  <p className="mt-1 text-xs text-blue-600">
                    Note: If emails are not arriving, our sender domain may still be pending verification with our email provider.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSent(false);
                    setResetCooldown(0);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {resetSent ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || resetCooldown > 0}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {resettingPassword ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
                  ) : resetCooldown > 0 ? (
                    `Resend in ${resetCooldown}s`
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerLogin;


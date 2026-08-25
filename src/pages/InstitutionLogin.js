import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import rateLimiter from '../utils/rateLimiter';
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
// LICENSE CHECK IMPORT
import { fetchLicenseStatus } from '../services/licenseService';

const InstitutionLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: userLogin } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [institution, setInstitution] = useState(null);
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

  // Get role and institution from URL params
  const roleParam = searchParams.get('role') || 'caregiver';
  const institutionId = searchParams.get('institution') || localStorage.getItem('institutionId') || 'demo-institution';
  
  // Determine effective institution ID
  const effectiveInstitutionId = institution?.id || institutionId;

  useEffect(() => {
    const loadInstitution = async () => {
      if (!effectiveInstitutionId) {
        setError('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://getcaremaster.com/api'}/institutions/${effectiveInstitutionId}`);
        const data = await response.json();
        setInstitution(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading institution:', error);
        setError('Failed to load institution');
        setLoading(false);
      }
    };

    loadInstitution();
  }, [effectiveInstitutionId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const routeUserToDashboard = async (user, userData) => {
    const userRole = userData.type || userData.userType;
    const userInstitutionId = userData.institutionId || effectiveInstitutionId;
    
    console.log('📍 InstitutionLogin - Routing user to dashboard:', {
      userRole,
      roleParam,
      institutionId: userInstitutionId,
      onboardingComplete: userData.onboardingComplete,
      currentUrl: window.location.href
    });
    
    // Route based on the portal they chose (roleParam), not just their user role
    if (roleParam === 'admin') {
      // Admin portal - route to admin dashboard
      const adminUrl = `/institution-admin/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
      console.log('🏢 Admin portal - navigating to:', adminUrl);
      navigate(adminUrl);
    } else if (roleParam === 'pharmacist') {
      // Pharmacist portal - check onboarding status (same flow as caregivers)
      if (!userData.onboardingComplete) {
        const onboardingUrl = `/institution-caregiver/onboarding${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('💊 Pharmacist portal (onboarding) - navigating to:', onboardingUrl);
        navigate(onboardingUrl);
      } else if (userData.status === 'active') {
        // Onboarding complete and active - go to pharmacist dashboard
        const pharmacistUrl = `/institution-pharmacy/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('💊 Pharmacist portal (active) - navigating to:', pharmacistUrl);
        navigate(pharmacistUrl);
      } else {
        // Other status
        toast.error(`Your account status is "${userData.status}". Please contact your administrator.`);
        navigate('/institution/login');
      }
    } else if (roleParam === 'caregiver') {
      // Caregiver portal - check onboarding and approval status
      if (!userData.onboardingComplete) {
        const onboardingUrl = `/institution-caregiver/onboarding${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('👥 Caregiver portal (onboarding) - navigating to:', onboardingUrl);
        navigate(onboardingUrl);
      } else if (userData.status === 'pending' || !userData.status) {
        // Onboarding complete but awaiting admin approval
        const pendingUrl = `/institution-caregiver/pending-approval${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('👥 Caregiver portal (pending) - navigating to:', pendingUrl);
        navigate(pendingUrl);
      } else if (userData.status === 'active') {
        // Approved - go to dashboard
        const dashboardUrl = `/institution-caregiver/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('👥 Caregiver portal (active) - navigating to:', dashboardUrl);
        navigate(dashboardUrl);
      } else {
        // Rejected or other status
        toast.error(`Your account status is "${userData.status}". Please contact your administrator.`);
        navigate('/institution/login');
      }
    } else {
      // Fallback - route based on user role
      console.log('⚠️ Fallback routing based on user role:', userRole);
      if (userRole === 'admin' || userRole === 'institutionAdmin') {
        const fallbackAdminUrl = `/institution-admin/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('🏢 Fallback admin - navigating to:', fallbackAdminUrl);
        navigate(fallbackAdminUrl);
      } else if (userRole === 'doctor' || userRole === 'nurse' || userRole === 'caregiver') {
        const fallbackCaregiverUrl = `/institution-caregiver/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('👥 Fallback caregiver - navigating to:', fallbackCaregiverUrl);
        navigate(fallbackCaregiverUrl);
      } else if (userRole === 'pharmacist') {
        // Check onboarding status for pharmacists
        if (!userData.onboardingComplete) {
          const fallbackOnboardingUrl = `/institution-caregiver/onboarding${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
          console.log('💊 Fallback pharmacist (onboarding) - navigating to:', fallbackOnboardingUrl);
          navigate(fallbackOnboardingUrl);
        } else {
          const fallbackPharmacistUrl = `/institution-pharmacy/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
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
      // SECURITY FIX: Check rate limit before authentication
      const rateLimitKey = formData.email.toLowerCase().trim();
      const rateLimitCheck = rateLimiter.checkLimit(rateLimitKey, {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        lockoutDuration: 30 * 60 * 1000 // 30 minutes
      });
      
      if (!rateLimitCheck.allowed) {
        if (rateLimitCheck.locked) {
          const minutes = Math.ceil(rateLimitCheck.lockoutDuration / 60);
          setError(`Account temporarily locked due to too many failed attempts. Please try again in ${minutes} minute(s).`);
          setSubmitting(false);
          return;
        } else {
          setError(`Too many login attempts. Please try again later.`);
          setSubmitting(false);
          return;
        }
      }
      
      // Use UserContext login method
      const result = await userLogin({
        matric_number: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        // Reset rate limit on successful authentication
        rateLimiter.reset(rateLimitKey);
        
        // LICENSE CHECK - Verify institution has active license
        console.log('🔐 Checking license for institution:', institutionId);
        try {
          const licenseStatus = await fetchLicenseStatus(institutionId);
          console.log('📋 License status:', licenseStatus);
          
          if (!licenseStatus.active) {
            console.error('❌ Institution license is not active:', licenseStatus.reason);
            toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}.`);
            
            // Clear auth and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate(`/license-required?institution=${institutionId}`, { replace: true });
            setSubmitting(false);
            return;
          }
          
          console.log('✅ License verified - allowing access');
        } catch (licenseError) {
          console.error('❌ Error checking license:', licenseError);
          toast.error('Unable to verify institution license. Access denied.');
          
          // Clear auth and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate(`/license-required?institution=${institutionId}`, { replace: true });
          setSubmitting(false);
          return;
        }
        
        toast.success('Login successful!');
        await routeUserToDashboard(result.user);
      } else {
        setError(result.message || 'Login failed');
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
      toast.error('Login failed');
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
      // Create user account via API
      const response = await api.post('/api/auth/register', {
        matric_number: `CG/${Date.now()}`, // Generate caregiver matric number
        email: formData.email,
        password: formData.password,
        first_name: formData.displayName.split(' ')[0],
        last_name: formData.displayName.split(' ').slice(1).join(' '),
        department: 'Healthcare', // Default department
        level: '100', // Valid level for backend
        session: '2024/2025', // Valid session format
        user_type: 'student' // Backend only supports student
      });

      if (response.data.success) {
        // LICENSE CHECK - Verify institution has active license (for new sign-ups)
        console.log('🔐 Checking license for institution:', institutionId);
        try {
          const licenseStatus = await fetchLicenseStatus(institutionId);
          console.log('📋 License status:', licenseStatus);
          
          if (!licenseStatus.active) {
            console.error('❌ Institution license is not active:', licenseStatus.reason);
            toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}.`);
            
            // Clear auth and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate(`/license-required?institution=${institutionId}`, { replace: true });
            setSubmitting(false);
            return;
          }
          
          console.log('✅ License verified - allowing access');
        } catch (licenseError) {
          console.error('❌ Error checking license:', licenseError);
          toast.error('Unable to verify institution license. Access denied.');
          
          // Clear auth and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate(`/license-required?institution=${institutionId}`, { replace: true });
          setSubmitting(false);
          return;
        }

        toast.success('Account created successfully!');
        
        // Store token if provided
        if (response.data.data?.token) {
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        
        // Route to appropriate dashboard
        await routeUserToDashboard(null, response.data.data.user);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      
      if (error.response?.status === 409) {
        setError('An account with this email already exists');
      } else if (error.response?.status === 400) {
        setError('Password is too weak');
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to create account');
      }
      toast.error('Sign up failed');
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
          onClick={() => navigate(`/onboard?institution=${institutionId}`)}
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
                    <option value="admin">Institution Admin</option>
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

                setResettingPassword(true);
                try {
                  await authSecurityService.securePasswordReset(resetEmail.trim());
                  toast.success('Password reset email sent successfully. Please check your inbox.');
                  setShowResetModal(false);
                } catch (resetError) {
                  console.error('Password reset failed:', resetError);
                  const message = resetError?.code === 'auth/user-not-found'
                    ? 'No account found with that email address.'
                    : resetError?.message || 'Failed to send password reset email. Please try again.';
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

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {resettingPassword ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
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

export default InstitutionLogin;


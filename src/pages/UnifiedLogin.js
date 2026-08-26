import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'backend/auth';
import { auth } from '../backend/config';
import { toast } from 'react-toastify';
import rateLimiter from '../utils/rateLimiter';
import authSecurityService from '../services/authSecurityService';
import { fetchLicenseStatus } from '../services/licenseService';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Loader,
  XCircle
} from 'lucide-react';

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // SECURITY FIX: Check rate limit before authentication
      const rateLimitKey = email.toLowerCase().trim();
      const rateLimitCheck = rateLimiter.checkLimit(rateLimitKey, {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        lockoutDuration: 30 * 60 * 1000 // 30 minutes
      });
      
      if (!rateLimitCheck.allowed) {
        if (rateLimitCheck.locked) {
          const minutes = Math.ceil(rateLimitCheck.lockoutDuration / 60);
          setError(`Account temporarily locked due to too many failed attempts. Please try again in ${minutes} minute(s).`);
          setLoading(false);
          return;
        } else {
          setError(`Too many login attempts. Please try again later.`);
          setLoading(false);
          return;
        }
      }
      
      // Backend /auth/email-login is the single source of truth.
      // signInWithEmailAndPassword here is the backend compat wrapper (NOT Firebase).
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      rateLimiter.reset(rateLimitKey);
      const user = userCredential.user;
      const userData = user;

      // Now we have userData - detect institution and role
      const institutionId = userData?.institutionId;
      
      // CRITICAL: Check license status for institution users BEFORE allowing access
      if (institutionId) {
        console.log('🔍 Checking license status for institution:', institutionId);
        try {
          const licenseStatus = await fetchLicenseStatus(institutionId);
          console.log('📋 License status:', licenseStatus);
          
          if (!licenseStatus.active) {
            console.warn('⛔ License check failed:', licenseStatus.reason);
            toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}. Please contact your administrator to activate the license.`);
            
            // Sign out and redirect to license activation page
            await signOut(auth);
            setLoading(false);
            navigate(`/license-required?institution=${institutionId}`, { replace: true });
            return;
          }
          
          console.log('✅ License verified - proceeding with login');
        } catch (licenseError) {
          console.error('❌ Error checking license:', licenseError);
          toast.error('Unable to verify institution license. Access denied.');
          await signOut(auth);
          setLoading(false);
          navigate(`/license-required?institution=${institutionId}`, { replace: true });
          return;
        }
      }
      
      // Detect role - check roles array first, then individual fields
      let userRole;
      if (Array.isArray(userData?.roles) && userData.roles.length > 0) {
        userRole = userData.roles[0]; // Use first role as primary
      } else {
        userRole = userData?.userType || userData?.type || userData?.role;
      }
      
      // SAFEGUARD: If role fields suggest pharmacist but userRole doesn't match, fix it
      if (!userRole || userRole === 'Client' || userRole === 'elderly') {
        if (userData?.userType === 'pharmacist' || 
            userData?.type === 'pharmacist' || 
            userData?.role === 'pharmacist' ||
            (Array.isArray(userData?.roles) && userData.roles.includes('pharmacist'))) {
          console.warn('⚠️ Detected pharmacist but role was:', userRole);
          userRole = 'pharmacist';
        }
      }
      
      console.log('✅ Login successful:', {
        email,
        institutionId,
        userRole,
        userType: userData?.userType,
        type: userData?.type,
        role: userData?.role,
        roles: userData?.roles,
        userId: user?.uid || userData?.uid
      });

      // Check if account is suspended
      if (userData?.status === 'suspended') {
        await auth.signOut();
        toast.error('Your account has been suspended. Please contact support.');
        return;
      }

      toast.success('Login successful! Redirecting...');

      // Super-admin always goes to the super-admin dashboard, regardless of institution
      // Use window.location.href for a hard navigation so React Router state
      // (e.g. SignInRouteHandler re-rendering) can't override the redirect.
      if (userRole === 'super-admin' || userData?.userType === 'super-admin') {
        console.log('🚀 Super-admin detected, redirecting to /super-admin/dashboard');
        setLoading(false);
        clearTimeout(loginTimeout);
        window.location.href = '/super-admin/dashboard';
        return;
      }

      // Route based on role and institution
      if (institutionId) {
        // User belongs to an institution
        if (userRole === 'admin') {
          navigate(`/institution-admin/dashboard?institution=${institutionId}`);
        } else if (userRole === 'pharmacist') {
          navigate(`/institution-pharmacy/dashboard?institution=${institutionId}`);
        } else if (userRole === 'caregiver' || userRole === 'doctor' || userRole === 'nurse') {
          // Check if onboarding is complete
          if (!userData?.onboardingComplete) {
            navigate(`/institution-caregiver/onboarding?institution=${institutionId}`);
          } else {
            navigate(`/institution-caregiver/dashboard?institution=${institutionId}`);
          }
        } else if (userRole === 'client' || userRole === 'elderly' || userRole === 'patient') {
          navigate('/dashboard');
        } else {
          // Default institution user
          navigate(`/institution-caregiver/dashboard?institution=${institutionId}`);
        }
      } else {
        // Standalone user (no institution)
        if (userRole === 'admin') {
          navigate('/institution-admin/dashboard');
        } else if (userRole === 'pharmacist') {
          // Pharmacists should have an institution, but handle gracefully
          const urlParams = new URLSearchParams(window.location.search);
          const urlInstitutionId = urlParams.get('institution');

          if (urlInstitutionId) {
            navigate(`/institution-pharmacy/dashboard?institution=${urlInstitutionId}`);
          } else {
            toast.warning('Pharmacist account detected but no institution found. Please contact support to set your institution.');
            navigate('/dashboard');
          }
        } else if (userRole === 'caregiver' || userRole === 'doctor') {
          navigate('/service-provider');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // SECURITY FIX: Handle rate limiting errors and prevent user enumeration
      if (error.message && error.message.includes('locked')) {
        setError(error.message);
        toast.error(error.message);
      } else {
        // For other errors, show generic message to prevent user enumeration
        const genericError = 'Invalid email or password. Please try again.';
        setError(genericError);
        toast.error(genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cream flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md cm-animate-in">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sage to-ink shadow-lg shadow-ink/20 mb-4">
            <img
              src="/images/caremaster-logo.jpg"
              alt="Care Master Logo"
              className="w-10 h-10 object-contain rounded-lg"
            />
          </div>
          <h1 className="font-display text-3xl text-ink tracking-tight">Care Master</h1>
          <p className="mt-1 text-sm text-[var(--cm-text-soft)]">One Stop Health Care Solution</p>
        </div>

        <div className="cm-card p-6 sm:p-8">
          <div className="mb-6">
            <span className="cm-eyebrow">Account Access</span>
            <h2 className="cm-display text-2xl text-ink mt-3">Welcome back</h2>
            <p className="text-sm text-[var(--cm-text-soft)] mt-1">Sign in to manage care with confidence.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-[10px] bg-coral-soft/40 border border-coral/20 text-coral px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sage" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cm-input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sage" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cm-input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sage hover:text-ink transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email || '');
                  setShowResetModal(true);
                }}
                className="text-sm font-medium text-ink hover:text-gold transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cm-btn cm-btn-gold w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-xs text-[var(--cm-text-soft)]">
              We'll automatically detect your institution and role.
            </p>
          </form>

          <div className="mt-6 pt-6 border-t border-ink/5 text-center">
            <p className="text-xs text-[var(--cm-text-soft)]">
              Need help?{' '}
              <a href="/support" className="text-ink hover:text-gold font-medium transition-colors">
                Contact Support
              </a>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--cm-text-soft)]/70">
          Care Master — Compassionate care, connected.
        </p>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="cm-card w-full max-w-md overflow-hidden">
            <div className="bg-ink text-sand px-6 py-4 rounded-t-[var(--cm-radius)] flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg">Reset your password</h3>
                <p className="text-sm text-sand/70 mt-0.5">Enter your email to receive a reset link.</p>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-2 text-sand/80 hover:text-sand hover:bg-white/10 rounded-lg transition-colors"
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
                  setResetEmail('');
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
              className="px-6 py-6 space-y-5"
            >
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-ink mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sage" />
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="cm-input pl-10"
                    placeholder="Enter your account email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                  }}
                  className="cm-btn cm-btn-ghost-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="cm-btn cm-btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resettingPassword ? (
                    <>
                      <Loader className="animate-spin h-4 w-4" />
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

export default UnifiedLogin;

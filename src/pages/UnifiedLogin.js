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
  XCircle,
  ShieldCheck,
  HeartPulse,
  Stethoscope,
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

    // Set fresh-login flag BEFORE signInWithEmailAndPassword so that
    // SignInRouteHandler (which re-renders synchronously when onAuthStateChanged
    // fires inside signInWithEmailAndPassword) doesn't clear localStorage
    // before we can navigate to the dashboard.
    sessionStorage.setItem('__fresh_login', Date.now().toString());

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
      // Use window.location.href for ALL roles (not just super-admin) so that
      // SignInRouteHandler re-rendering can't override the redirect.
      if (institutionId) {
        // User belongs to an institution
        if (userRole === 'admin') {
          window.location.href = `/institution-admin/dashboard?institution=${institutionId}`;
          return;
        } else if (userRole === 'pharmacist') {
          window.location.href = `/institution-pharmacy/dashboard?institution=${institutionId}`;
          return;
        } else if (userRole === 'caregiver' || userRole === 'doctor' || userRole === 'nurse') {
          // Check if onboarding is complete
          if (!userData?.onboardingComplete) {
            window.location.href = `/institution-caregiver/onboarding?institution=${institutionId}`;
          } else {
            window.location.href = `/institution-caregiver/dashboard?institution=${institutionId}`;
          }
          return;
        } else if (userRole === 'client' || userRole === 'elderly' || userRole === 'patient') {
          window.location.href = '/dashboard';
          return;
        } else {
          // Default institution user
          window.location.href = `/institution-caregiver/dashboard?institution=${institutionId}`;
          return;
        }
      } else {
        // Standalone user (no institution)
        if (userRole === 'admin') {
          window.location.href = '/institution-admin/dashboard';
          return;
        } else if (userRole === 'pharmacist') {
          // Pharmacists should have an institution, but handle gracefully
          const urlParams = new URLSearchParams(window.location.search);
          const urlInstitutionId = urlParams.get('institution');

          if (urlInstitutionId) {
            window.location.href = `/institution-pharmacy/dashboard?institution=${urlInstitutionId}`;
          } else {
            toast.warning('Pharmacist account detected but no institution found. Please contact support to set your institution.');
            window.location.href = '/dashboard';
          }
          return;
        } else if (userRole === 'caregiver' || userRole === 'doctor') {
          window.location.href = '/service-provider';
          return;
        } else {
          window.location.href = '/dashboard';
          return;
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
    <div className="min-h-dvh w-full flex flex-col lg:flex-row bg-cream">
      {/* ===== Left brand panel (desktop only) ===== */}
      <div
        className="hidden lg:flex lg:w-[44%] xl:w-[48%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #12302C 0%, #0E2622 60%, #1D423C 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6B9080 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-80px] left-[-40px] w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #D9A441 0%, transparent 70%)' }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15">
              <img
                src="/images/caremaster-logo.jpg"
                alt="Care Master"
                className="w-8 h-8 object-contain rounded-lg"
              />
            </div>
            <div>
              <h1 className="font-display text-2xl text-sand tracking-tight">Care Master</h1>
              <p className="text-xs text-sand/60 font-mono tracking-wide">ONE STOP HEALTH CARE</p>
            </div>
          </div>
        </div>

        {/* Hero message */}
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-3xl xl:text-4xl text-sand leading-tight tracking-tight">
            Compassionate care,
            <br />
            <span className="text-gold">connected.</span>
          </h2>
          <p className="mt-4 text-sand/70 text-base leading-relaxed">
            Manage appointments, vital signs, medications, and consultations — all in one secure platform built for patients, caregivers, and institutions.
          </p>

          {/* Feature pills */}
          <div className="mt-8 space-y-3">
            {[
              { icon: HeartPulse, label: 'Real-time vital signs monitoring' },
              { icon: Stethoscope, label: 'Telemedicine & consultation tools' },
              { icon: ShieldCheck, label: 'HIPAA-compliant secure access' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-sage" style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-sm text-sand/80">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-sand/40 font-mono">
          © {new Date().getFullYear()} Care Master. All rights reserved.
        </div>
      </div>

      {/* ===== Right login form panel ===== */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-10">
        <div className="w-full max-w-[400px] cm-animate-in">
          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sage to-ink shadow-lg shadow-ink/20 mb-3">
              <img
                src="/images/caremaster-logo.jpg"
                alt="Care Master"
                className="w-9 h-9 object-contain rounded-lg"
              />
            </div>
            <h1 className="font-display text-2xl text-ink tracking-tight">Care Master</h1>
            <p className="mt-0.5 text-xs text-[var(--cm-text-soft)] font-mono tracking-wide">
              ONE STOP HEALTH CARE
            </p>
          </div>

          {/* Card */}
          <div className="cm-card p-6 sm:p-8">
            {/* Header */}
            <div className="mb-7">
              <span className="cm-eyebrow">Account Access</span>
              <h2 className="cm-display text-[26px] text-ink mt-3">Welcome back</h2>
              <p className="text-sm text-[var(--cm-text-soft)] mt-1.5 leading-relaxed">
                Sign in to manage care with confidence.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-coral-soft/50 border border-coral/25 px-4 py-3 text-sm text-coral">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-[13px] font-semibold text-ink mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 flex-shrink-0"
                    style={{ width: 18, height: 18, color: '#6B9080' }}
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="cm-input pl-11"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-[13px] font-semibold text-ink mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 flex-shrink-0"
                    style={{ width: 18, height: 18, color: '#6B9080' }}
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="cm-input pl-11 pr-11"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--cm-text-soft)] hover:text-ink transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email || '');
                    setShowResetModal(true);
                  }}
                  className="text-[13px] font-medium text-[var(--cm-text-soft)] hover:text-gold-deep transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="cm-btn cm-btn-gold w-full justify-center text-[15px] py-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Trust note */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sage" />
                <p className="text-xs text-[var(--cm-text-soft)]">
                  Secure login · We detect your role automatically
                </p>
              </div>
            </form>

            {/* Divider + help */}
            <div className="mt-7 pt-5 border-t border-ink/8 text-center">
              <p className="text-xs text-[var(--cm-text-soft)]">
                Need help?{' '}
                <a
                  href="/support"
                  className="text-ink hover:text-gold-deep font-semibold transition-colors"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

          {/* Mobile footer */}
          <p className="mt-6 text-center text-xs text-[var(--cm-text-soft)]/60 lg:hidden">
            © {new Date().getFullYear()} Care Master — Compassionate care, connected.
          </p>
        </div>
      </div>

      {/* ===== Password Reset Modal ===== */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(18, 48, 44, 0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="cm-card w-full max-w-[420px] overflow-hidden cm-animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: 'var(--cm-ink)', color: 'var(--cm-sand)' }}
            >
              <div>
                <h3 className="font-display text-lg text-sand">Reset your password</h3>
                <p className="text-sm text-sand/60 mt-0.5">Enter your email to receive a reset link.</p>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-2 text-sand/70 hover:text-sand hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close reset password modal"
              >
                <XCircle style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Modal body */}
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
                <label htmlFor="reset-email" className="block text-[13px] font-semibold text-ink mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 flex-shrink-0"
                    style={{ width: 18, height: 18, color: '#6B9080' }}
                  />
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="cm-input pl-11"
                    placeholder="Enter your account email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
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
                      <Loader className="w-4 h-4 animate-spin" />
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import { verifyPasswordSecure } from '../utils/securePasswordAuth';
import rateLimiter from '../utils/rateLimiter';
import authSecurityService from '../services/authSecurityService';
import { fetchLicenseStatus } from '../services/licenseService';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Loader,
  Building2,
  Shield,
  User,
  Pill,
  Heart,
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
      
      // First, try Firebase Auth login
      let userCredential;
      let user;
      let userData = null;

      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Reset rate limit on successful authentication
        rateLimiter.reset(rateLimitKey);
        user = userCredential.user;
        
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          userData = { id: userDoc.id, ...userDoc.data() };
        }
      } catch (authError) {
        // If Firebase Auth fails, try custom auth (for users created by admin)
        console.log('🔍 Firebase Auth failed, trying custom auth for:', email);
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Invalid email or password');
        }

        // SECURITY FIX: Use secure password verification instead of plain text comparison
        let customAuthUser = null;
        let passwordVerificationResult = null;
        
        for (const userDoc of querySnapshot.docs) {
          const data = userDoc.data();
          if (data.password) {
            // Verify password securely
            passwordVerificationResult = await verifyPasswordSecure(password, data.password);
            
            if (passwordVerificationResult === true || passwordVerificationResult?.verified === true) {
              customAuthUser = { uid: userDoc.id, ...data };
              
              // If password needs migration, update it in Firestore
              if (passwordVerificationResult?.needsMigration && passwordVerificationResult?.hashedPassword) {
                try {
                  await setDoc(doc(db, 'users', userDoc.id), {
                    password: passwordVerificationResult.hashedPassword,
                    passwordMigrated: true,
                    passwordMigratedAt: new Date().toISOString()
                  }, { merge: true });
                  console.log('✅ Password migrated to secure hash');
                } catch (migrationError) {
                  console.error('Failed to migrate password:', migrationError);
                  // Continue with login even if migration fails
                }
              }
              // Reset rate limit on successful custom auth
              rateLimiter.reset(rateLimitKey);
              break; // Found matching user, exit loop
            }
          }
        }

        if (!customAuthUser) {
          // Rate limit already checked, but don't increment on "user not found" to prevent enumeration
          throw new Error('Invalid email or password');
        }

        userData = customAuthUser;
        
        // Create Firebase Auth account if it doesn't exist
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } catch (createError) {
          // If account doesn't exist in Firebase Auth, create it
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
          
          // Update Firestore with Firebase Auth UID
          await import('firebase/firestore').then(({ setDoc }) => {
            setDoc(doc(db, 'users', user.uid), {
              ...userData,
              uid: user.uid,
              updatedAt: new Date()
            }, { merge: true });
          });
        }
      }

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
        } else {
          // Default institution user
          navigate(`/institution-caregiver/dashboard?institution=${institutionId}`);
        }
      } else {
        // Standalone user (no institution)
        if (userRole === 'admin') {
          navigate('/admin');
        } else if (userRole === 'pharmacist') {
          // Pharmacists should have an institution, but handle gracefully
          // Try to get institutionId from URL params if available
          const urlParams = new URLSearchParams(window.location.search);
          const urlInstitutionId = urlParams.get('institution');
          
          if (urlInstitutionId) {
            // Update Firestore with institutionId from URL
            try {
              const { doc, updateDoc } = await import('firebase/firestore');
              const { db } = await import('../firebase/config');
              const userRef = doc(db, 'users', user?.uid || userData?.uid);
              await updateDoc(userRef, { institutionId: urlInstitutionId });
              console.log('✅ Set institutionId from URL:', urlInstitutionId);
              navigate(`/institution-pharmacy/dashboard?institution=${urlInstitutionId}`);
            } catch (error) {
              console.error('Failed to set institutionId:', error);
              toast.warning('Pharmacist account detected but no institution found. Please contact support.');
              navigate('/dashboard');
            }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <a href="/" className="inline-flex justify-center mb-4 group cursor-pointer">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </a>
          <a href="/" className="inline-block group">
            <h2 className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              Care Master
            </h2>
          </a>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="inline h-4 w-4 mr-1" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setResetEmail(email || '');
                setShowResetModal(true);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* Info Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              We'll automatically detect your institution and role
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? <a href="/support" className="text-blue-600 hover:text-blue-500">Contact Support</a>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
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
              className="px-6 py-6 space-y-4"
            >
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your account email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                  }}
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

export default UnifiedLogin;


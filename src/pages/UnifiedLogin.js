import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
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
  Heart
} from 'lucide-react';

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // First, try Firebase Auth login
      let userCredential;
      let user;
      let userData = null;

      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
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

        // Check password match
        let customAuthUser = null;
        querySnapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.password === password) {
            customAuthUser = { uid: userDoc.id, ...data };
          }
        });

        if (!customAuthUser) {
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
      setError(error.message || 'Login failed. Please check your credentials.');
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Care Master
          </h2>
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
    </div>
  );
};

export default UnifiedLogin;


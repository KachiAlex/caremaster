import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import authManager from '../utils/authManager';
import sessionManager from '../utils/sessionManager';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Phone,
  Loader,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

const InstitutionLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const institutionId = searchParams.get('institution');
  const roleParam = searchParams.get('role') || 'caregiver';
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    role: roleParam
  });

  useEffect(() => {
    const loadInstitution = async () => {
      if (!institutionId) {
        setError('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        const institutionDoc = await getDoc(doc(db, 'institutions', institutionId));
        
        if (!institutionDoc.exists()) {
          setError('Institution not found');
          setLoading(false);
          return;
        }

        setInstitution({ id: institutionDoc.id, ...institutionDoc.data() });
        setLoading(false);
      } catch (error) {
        console.error('Error loading institution:', error);
        setError('Failed to load institution');
        setLoading(false);
      }
    };

    loadInstitution();
  }, [institutionId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const routeUserToDashboard = async (user, userData) => {
    const userRole = userData.type || userData.userType;
    const userInstitutionId = userData.institutionId || institutionId;
    
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
      // Pharmacist portal - route to pharmacist dashboard
      const pharmacistUrl = `/institution-pharmacy/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
      console.log('💊 Pharmacist portal - navigating to:', pharmacistUrl);
      navigate(pharmacistUrl);
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
        const fallbackPharmacistUrl = `/institution-pharmacy/dashboard${userInstitutionId ? `?institution=${userInstitutionId}` : ''}`;
        console.log('💊 Fallback pharmacist - navigating to:', fallbackPharmacistUrl);
        navigate(fallbackPharmacistUrl);
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
      // First, try custom authentication for caregivers created by admin
      console.log('🔍 Attempting custom auth for:', formData.email);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      
      console.log('📊 Found', querySnapshot.size, 'user(s) with this email');
      
      let customAuthUser = null;
      querySnapshot.forEach((userDoc) => {
        const data = userDoc.data();
        console.log('👤 Checking user:', userDoc.id, {
          hasPassword: !!data.password,
          institutionId: data.institutionId,
          targetInstitution: institutionId,
          userType: data.userType || data.type
        });
        
        // Check if password matches and belongs to this institution
        const passwordMatches = data.password === formData.password;
        const institutionMatches = data.institutionId === institutionId;
        
        console.log('🔐 Password check:', {
          passwordMatches,
          institutionMatches,
          storedPassword: data.password ? '***' : 'undefined',
          inputPassword: formData.password ? '***' : 'undefined',
          storedInstitutionId: data.institutionId,
          targetInstitutionId: institutionId,
          userType: data.userType || data.type,
          isAdmin: data.userType === 'admin' || data.type === 'admin'
        });
        
        if (passwordMatches && institutionMatches) {
          customAuthUser = { uid: userDoc.id, ...data };
          console.log('✅ Custom auth successful!');
        } else {
          if (!passwordMatches) console.log('❌ Password mismatch');
          if (!institutionMatches) console.log('❌ Institution mismatch');
        }
      });
      
      // If custom auth successful, validate role and redirect
      if (customAuthUser) {
        // Check multiple role fields for flexibility
        const userRole = customAuthUser.role || customAuthUser.type || customAuthUser.userType;
        const isAdmin = userRole === 'admin' || 
                       userRole === 'institutionAdmin' || 
                       customAuthUser.userType === 'admin' || 
                       customAuthUser.type === 'admin' ||
                       customAuthUser.isAdmin === true;
        
        console.log('🔍 User role check:', { 
          userRole, 
          isAdmin,
          roleField: customAuthUser.role,
          typeField: customAuthUser.type,
          userTypeField: customAuthUser.userType,
          roleParam 
        });
        
        // Validate user role matches the portal
        if (roleParam === 'admin' && !isAdmin) {
          // Check if this is a known admin email that should have admin access
          const adminEmails = ['admin@bulah.com', 'admin@elderx.com', 'admin2@elderx.com', 'newadmin@elderx.com'];
          const isKnownAdmin = adminEmails.includes(customAuthUser.email?.toLowerCase());
          
          if (!isKnownAdmin) {
            toast.error(`This is the Admin Portal. You are registered as ${userRole}. Please use the Caregiver Portal.`);
            setSubmitting(false);
            return;
          } else {
            console.log('🔓 Known admin email detected, allowing admin portal access:', customAuthUser.email);
          }
        }
        
        if (roleParam === 'caregiver' && !['caregiver', 'doctor', 'nurse'].includes(userRole) && !isAdmin) {
          toast.error(`This is the Caregiver Portal. You are registered as ${userRole}. Please use the Admin Portal.`);
          setSubmitting(false);
          return;
        }
        
        if (roleParam === 'pharmacist' && userRole !== 'pharmacist') {
          toast.error(`This is the Pharmacist Portal. You are registered as ${userRole}.`);
          setSubmitting(false);
          return;
        }
        
        console.log('✅ Role validation passed:', { roleParam, userRole, isAdmin });
        
        // Try to sign in first (most common case for returning users)
        try {
          console.log('Attempting sign in for:', formData.email);
          
          // Use authManager for role-specific sign-in
          const userCredential = await authManager.signInWithRole(
            formData.email,
            formData.password,
            userRole || roleParam
          );
          
          console.log('✅ Signed in successfully with UID:', userCredential.user.uid);
          
          // Sync custom auth data to Firebase Auth user document
          console.log('🔄 Syncing custom auth data to Firebase Auth user document...');
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            ...customAuthUser,
            uid: userCredential.user.uid,
            password: formData.password,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log('✅ User document synced');
          
          toast.success('Login successful!');
          await routeUserToDashboard(userCredential.user, customAuthUser);
          return;
        } catch (signInError) {
          console.log('Sign in error:', signInError.code);
          
          // If user not found in Firebase Auth, create the account (first-time login)
          if (signInError.code === 'auth/user-not-found') {
            console.log('User not found in Firebase Auth, creating account...');
            try {
              // Create account with role-specific persistence
              const authResult = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
              );
              
              // Store the role session
              authManager.storeRoleSession(userRole || roleParam, {
                uid: authResult.user.uid,
                email: authResult.user.email,
                displayName: authResult.user.displayName,
                lastSignIn: Date.now()
              });
              
              console.log('✅ Firebase Auth account created:', authResult.user.uid);
              
              // Update user document to new auth UID
              await setDoc(doc(db, 'users', authResult.user.uid), {
                ...customAuthUser,
                uid: authResult.user.uid,
                password: formData.password,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              
              toast.success('Login successful! Setting up your account...');
              await routeUserToDashboard(authResult.user, customAuthUser);
              return;
            } catch (createError) {
              console.error('Failed to create Firebase Auth account:', createError);
              toast.error('Failed to create account. Please try again.');
              setSubmitting(false);
              return;
            }
          } else if (signInError.code === 'auth/wrong-password') {
            toast.error('Incorrect password. Please try again.');
            setSubmitting(false);
            return;
          } else {
            console.error('Sign in failed:', signInError);
            // Continue to fallback
          }
        }
      }

      // Standard Firebase Auth login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Verify user belongs to this institution
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.type || userData.userType;
        
        // Check if user belongs to this institution
        if (userData.institutionId !== institutionId) {
          await auth.signOut();
          toast.error('You are not authorized to access this institution');
          setSubmitting(false);
          return;
        }

        // Validate user role matches the portal they're trying to access
        if (roleParam === 'admin' && userRole !== 'admin' && userRole !== 'institutionAdmin') {
          await auth.signOut();
          toast.error(`You are logged in as ${userRole}, not admin. Please use the correct portal.`);
          setSubmitting(false);
          return;
        }
        
        if (roleParam === 'caregiver' && !['caregiver', 'doctor', 'nurse'].includes(userRole)) {
          await auth.signOut();
          toast.error(`You are logged in as ${userRole}. Please use the Admin portal or Pharmacist portal.`);
          setSubmitting(false);
          return;
        }
        
        if (roleParam === 'pharmacist' && userRole !== 'pharmacist') {
          await auth.signOut();
          toast.error(`You are logged in as ${userRole}, not pharmacist. Please use the correct portal.`);
          setSubmitting(false);
          return;
        }

        toast.success('Login successful!');
        
        // Route to appropriate dashboard
        await routeUserToDashboard(userCredential.user, userData);
      } else {
        await auth.signOut();
        toast.error('User profile not found');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(error.message || 'Login failed');
      }
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
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Create Firestore user profile
      const userProfile = {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName,
        phone: formData.phone || '',
        institutionId: institutionId,
        institutionName: institution.name,
        type: formData.role,
        userType: formData.role,
        role: formData.role,
        active: true,
        onboardingComplete: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);

      toast.success('Account created successfully!');
      
      // Route to appropriate dashboard
      await routeUserToDashboard(userCredential.user, userProfile);
    } catch (error) {
      console.error('Sign up error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(error.message || 'Failed to create account');
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
                onClick={() => toast.info('Please contact your administrator for password reset')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitutionLogin;


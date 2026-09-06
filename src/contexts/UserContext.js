import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/config';
import { doc, getDoc } from 'backend/database';
import { onAuthStateChanged } from 'backend/auth';
import { db, auth } from '../backend/config';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [licenseActive, setLicenseActive] = useState(true);
  const [institutionId, setInstitutionId] = useState(null);
  const [institutionData, setInstitutionData] = useState(null);
  const logoutTimeoutRef = useRef(null);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // Clear any stale dev-token from previous deployments
    if (token === 'dev-token' || (storedUser && storedUser.includes('dev-admin'))) {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setLoading(false);
      return;
    }

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setUserProfile(userData);

        // Set role from user data
        const role = userData.userType || userData.type || userData.role || 'student';
        setUserRole(role);
        setUserRoles(userData.roles || [role]);

        // Set institution if available
        if (userData.institutionId) {
          setInstitutionId(userData.institutionId);
        }

        // Fetch fresh profile from database using firebase_uid or id.
        // Skip when on /login — SignInRouteHandler will clear the stale session
        // and a fresh profile fetch with a stale token only produces a 401.
        const userId = userData.uid || userData.id;
        if (userId && !window.location.pathname.startsWith('/login')) {
          getDoc(doc(db, 'users', userId))
            .then((userDoc) => {
              if (userDoc.exists()) {
                const dbProfile = userDoc.data();
                const mergedProfile = { ...userData, ...dbProfile };
                setUserProfile(mergedProfile);
                setUser(mergedProfile);
                localStorage.setItem('user', JSON.stringify(mergedProfile));
                const dbRole = dbProfile.userType || dbProfile.type || dbProfile.role || role;
                setUserRole(dbRole);
                setUserRoles(dbProfile.roles || [dbRole]);
                if (dbProfile.institutionId) {
                  setInstitutionId(dbProfile.institutionId);
                }
              }
            })
            .catch((err) => {
              console.error('Failed to fetch user profile from database:', err);
            });
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    // Loading state is finalized by the onAuthStateChanged listener below,
    // which validates the session (including httpOnly cookie sessions on web).
  }, []);

  // Sync with auth state (for logins like UnifiedLogin that use signInWithEmailAndPassword
  // from backend/auth.js directly and navigate without calling UserContext.login()).
  //
  // IMPORTANT: signInWithEmailAndPassword in backend/auth.js already sets the JWT token
  // and user profile in localStorage. This listener only syncs React state from localStorage.
  // It must NOT overwrite localStorage.token — that would replace the JWT with the UID
  // and break all subsequent API calls (403 "Invalid token").
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        // Use the user object returned by onAuthStateChanged, which is the
        // locally-stored profile for native apps and the fresh /auth/me response
        // for web sessions using an httpOnly cookie.
        const userData = authUser;
        setUser(userData);
        setUserProfile(userData);
        const role = userData.userType || userData.type || userData.role || 'student';
        setUserRole(role);
        setUserRoles(userData.roles || [role]);
        if (userData.institutionId) {
          setInstitutionId(userData.institutionId);
        }
      } else {
        // Session invalid or missing — clear React auth state
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
        setUserRoles([]);
        setInstitutionId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setUserProfile(userData);
        
        const role = userData.userType || userData.type || userData.role || 'student';
        setUserRole(role);
        setUserRoles(userData.roles || [role]);
        
        if (userData.institutionId) {
          setInstitutionId(userData.institutionId);
        }
        
        return { success: true, user: userData };
      }
      
      return { success: false, message: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to invalidate the session server-side
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const API_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || '';
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (e) {
          // Best-effort: even if the server call fails, clear local state
          console.warn('Server logout failed (clearing local state anyway):', e);
        }
      }

      // Clear local storage (must clear all token keys)
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Clear state
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setUserRoles([]);
      setInstitutionId(null);
      setInstitutionData(null);

      // Clear logout timeout
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUserProfile = (updates) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
    setUser(prev => ({ ...prev, ...updates }));

    // Update localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshUserProfile = async () => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const dbProfile = userDoc.data();
        const mergedProfile = { ...userProfile, ...dbProfile };
        setUserProfile(mergedProfile);
        setUser(mergedProfile);
        localStorage.setItem('user', JSON.stringify(mergedProfile));
        const dbRole = dbProfile.userType || dbProfile.type || dbProfile.role || userRole;
        setUserRole(dbRole);
        if (dbProfile.institutionId) {
          setInstitutionId(dbProfile.institutionId);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const isDoctor = () => userRole === 'doctor';
  const isCaregiver = () => userRole === 'caregiver';
  const isPharmacist = () => userRole === 'pharmacist';
  const isNurse = () => userRole === 'nurse';
  const isElderly = () => userRole === 'elderly';
  const isAdmin = () => userRole === 'admin';
  const isServiceProvider = () => ['caregiver', 'nurse', 'doctor', 'pharmacist'].includes(userRole);

  const getCaregiverOnboardingRoute = () => {
    // Institution caregivers use the institution onboarding flow
    if (institutionId || userProfile?.institutionId) {
      const instId = institutionId || userProfile?.institutionId;
      return `/institution-caregiver/onboarding?institution=${instId}`;
    }
    return '/caregiver/onboarding';
  };

  const isOnboardingIncomplete = () => {
    if (!userProfile) {
      console.log('No user profile found, onboarding required');
      return true;
    }

    console.log('Checking onboarding completion:', {
      userRole,
      userType: userProfile.userType,
      onboardingComplete: userProfile.onboardingComplete,
      status: userProfile.status
    });

    const caregiverTypes = ['caregiver', 'nurse', 'doctor', 'pharmacist'];
    if (caregiverTypes.includes(userProfile.userType)) {
      // If user is activated, allow access regardless of onboarding status
      if (userProfile.status === 'active' && userProfile.onboardingComplete === true) {
        console.log(`✅ ${userProfile.userType} onboarding complete`);
        return false;
      }
      const isComplete = userProfile.onboardingComplete === true;
      if (!isComplete) {
        console.log(`🚫 ${userProfile.userType?.toUpperCase()} ONBOARDING INCOMPLETE - blocking access`);
        return true;
      }
      console.log(`✅ ${userProfile.userType} onboarding complete`);
      return false;
    }

    if (userRole === 'admin' || userProfile.userType === 'admin') {
      console.log('✅ Admin access - no onboarding required');
      return false;
    }

    if (userProfile.userType === 'elderly' || userRole === 'Client' || userProfile.userType === 'client' || userProfile.userType === 'patient') {
      if (!userProfile.onboardingProfileComplete && !userProfile.onboardingComplete) {
        console.log('🚫 Client ONBOARDING INCOMPLETE - blocking access');
        return true;
      }
      console.log('✅ Client onboarding complete');
      return false;
    }

    console.log('⚠️ Unknown user type, requiring onboarding');
    return true;
  };

  const value = {
    user,
    userProfile,
    loading,
    userRole,
    userRoles,
    licenseActive,
    institutionId,
    institutionData,
    login,
    logout,
    updateUserProfile,
    setLicenseActive,
    setInstitutionData,
    logoutTimeoutRef,
    isOnboardingIncomplete,
    getCaregiverOnboardingRoute,
    isServiceProvider,
    isDoctor,
    isCaregiver,
    isPharmacist,
    isNurse,
    isElderly,
    isAdmin,
    refreshUserProfile
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

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

        // Fetch fresh profile from database using firebase_uid or id
        const userId = userData.uid || userData.id;
        if (userId) {
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
    } else {
      // No existing session — user will be redirected to login
      setLoading(false);
    }
    
    setLoading(false);
  }, []);

  // Sync with Firebase auth state (for Firebase-based logins like UnifiedLogin)
  // UnifiedLogin uses signInWithEmailAndPassword directly and navigates without
  // calling UserContext.login(), so we MUST listen to onAuthStateChanged to
  // populate user/userProfile when Firebase auth state changes.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Load cached profile from localStorage first for immediate UI
        let cachedUser = null;
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.uid === firebaseUser.uid) {
              cachedUser = parsed;
            }
          }
        } catch (e) { /* ignore parse errors */ }

        const baseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };

        const initialUser = cachedUser || baseUser;
        localStorage.setItem('token', firebaseUser.uid);
        localStorage.setItem('user', JSON.stringify(initialUser));

        setUser(initialUser);
        setUserProfile(initialUser);

        const role = initialUser.userType || initialUser.type || initialUser.role || 'student';
        setUserRole(role);
        setUserRoles(initialUser.roles || [role]);
        if (initialUser.institutionId) {
          setInstitutionId(initialUser.institutionId);
        }

        // Refresh from Firestore in background (non-blocking)
        (async () => {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDocPromise = getDoc(userRef);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Firestore query timeout')), 8000)
            );
            const userSnap = await Promise.race([userDocPromise, timeoutPromise]);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              const refreshedUser = { ...baseUser, ...userData };
              localStorage.setItem('user', JSON.stringify(refreshedUser));
              setUser(refreshedUser);
              setUserProfile(refreshedUser);

              const refreshedRole = userData.userType || userData.type || userData.role || role;
              setUserRole(refreshedRole);
              setUserRoles(userData.roles || [refreshedRole]);
              if (userData.institutionId) {
                setInstitutionId(userData.institutionId);
              }
            }
          } catch (err) {
            console.warn('Background Firestore refresh failed, using cached profile:', err.message);
          }
        })();
      } else {
        // Firebase user signed out — only clear if we had a Firebase-based token
        const token = localStorage.getItem('token');
        if (token && !token.startsWith('Bearer')) {
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setUser(null);
          setUserProfile(null);
          setUserRole(null);
          setUserRoles([]);
          setInstitutionId(null);
        }
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
    logoutTimeoutRef
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

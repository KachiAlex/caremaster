import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../backend/config';;
import { getDoc, doc } from 'backend/database';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'backend/auth';

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
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // Sync with Backend auth state (for Backend-based logins like UnifiedLogin)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (backendUser) => {
      if (backendUser) {
        // 1. Load cached profile from localStorage FIRST for immediate UI
        let cachedUser = null;
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.uid === backendUser.uid) {
              cachedUser = parsed;
            }
          }
        } catch (e) { /* ignore parse errors */ }

        const baseUser = {
          uid: backendUser.uid,
          email: backendUser.email,
          displayName: backendUser.displayName,
        };

        const initialUser = cachedUser || baseUser;
        localStorage.setItem('token', backendUser.uid);
        localStorage.setItem('user', JSON.stringify(initialUser));

        setUser(initialUser);
        setUserProfile(initialUser);

        let role;
        if (Array.isArray(initialUser.roles) && initialUser.roles.length > 0) {
          if (initialUser.roles.includes('admin') || initialUser.roles.includes('institutionAdmin')) {
            role = initialUser.roles.includes('admin') ? 'admin' : 'institutionAdmin';
          } else if (initialUser.roles.includes('pharmacist')) {
            role = 'pharmacist';
          } else {
            role = initialUser.roles[0];
          }
        } else {
          role = initialUser.userType || initialUser.type || initialUser.role || 'student';
        }
        setUserRole(role);
        setUserRoles(initialUser.roles || [role]);
        if (initialUser.institutionId) {
          setInstitutionId(initialUser.institutionId);
        }

        // 2. Refresh from Database in BACKGROUND (non-blocking)
        (async () => {
          try {
            const userRef = doc(db, 'users', backendUser.uid);
            const userDocPromise = getDoc(userRef);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Database query timeout')), 8000)
            );
            const userSnap = await Promise.race([userDocPromise, timeoutPromise]);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              const refreshedUser = {
                ...baseUser,
                ...userData,
              };
              localStorage.setItem('user', JSON.stringify(refreshedUser));
              setUser(refreshedUser);
              setUserProfile(refreshedUser);

              let refreshedRole;
              if (Array.isArray(refreshedUser.roles) && refreshedUser.roles.length > 0) {
                if (refreshedUser.roles.includes('admin') || refreshedUser.roles.includes('institutionAdmin')) {
                  refreshedRole = refreshedUser.roles.includes('admin') ? 'admin' : 'institutionAdmin';
                } else if (refreshedUser.roles.includes('pharmacist')) {
                  refreshedRole = 'pharmacist';
                } else {
                  refreshedRole = refreshedUser.roles[0];
                }
              } else {
                refreshedRole = refreshedUser.userType || refreshedUser.type || refreshedUser.role || role;
              }
              setUserRole(refreshedRole);
              setUserRoles(refreshedUser.roles || [refreshedRole]);
              if (refreshedUser.institutionId) {
                setInstitutionId(refreshedUser.institutionId);
              }
            }
          } catch (err) {
            console.warn('Background Database refresh failed, using cached profile:', err.message);
          }
        })();
      } else {
        // Backend user signed out – only clear if we previously had a Backend token
        const token = localStorage.getItem('token');
        if (token && !token.startsWith('Bearer')) {
          localStorage.removeItem('token');
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
      const email = credentials.email || credentials.matric_number || '';
      const password = credentials.password;

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

      const profileToCache = userData || { uid: backendUser.uid, email: backendUser.email, displayName: backendUser.displayName };
      localStorage.setItem('user', JSON.stringify(profileToCache));

      setUser(profileToCache);
      setUserProfile(profileToCache);

      // Role detection
      let role;
      if (Array.isArray(profileToCache.roles) && profileToCache.roles.length > 0) {
        if (profileToCache.roles.includes('admin') || profileToCache.roles.includes('institutionAdmin')) {
          role = profileToCache.roles.includes('admin') ? 'admin' : 'institutionAdmin';
        } else if (profileToCache.roles.includes('pharmacist')) {
          role = 'pharmacist';
        } else {
          role = profileToCache.roles[0];
        }
      } else {
        role = profileToCache.userType || profileToCache.type || profileToCache.role || 'client';
      }
      setUserRole(role);
      setUserRoles(profileToCache.roles || [role]);

      if (profileToCache.institutionId) {
        setInstitutionId(profileToCache.institutionId);
      }

      return { success: true, user: profileToCache };
    } catch (error) {
      console.error('Login error:', error);
      let msg = 'Login failed';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later.';
      } else if (error.message) {
        msg = error.message;
      }
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('token');
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

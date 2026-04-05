import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/config';

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

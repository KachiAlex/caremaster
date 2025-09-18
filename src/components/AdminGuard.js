import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const AdminGuard = ({ children }) => {
  const { userProfile, loading } = useUser();

  // Show loading while checking user profile
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is admin
  const isAdmin = userProfile?.userType === 'admin' || userProfile?.type === 'admin';
  
  // Check for admin session flag (from admin login)
  const hasAdminSession = sessionStorage.getItem('elderx_admin_session') === 'true';
  
  // Temporary: Allow caregivers to access admin for testing
  const isCaregiver = userProfile?.userType === 'caregiver' || userProfile?.type === 'caregiver';
  
  console.log('🔍 AdminGuard Debug:', {
    userProfile: userProfile?.userType || userProfile?.type,
    isAdmin,
    hasAdminSession,
    isCaregiver,
    allowAccess: isAdmin || hasAdminSession || isCaregiver
  });

  if (!isAdmin && !hasAdminSession && !isCaregiver) {
    // Redirect non-admin users to admin login
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminGuard;

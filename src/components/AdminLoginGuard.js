import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import AdminLogin from '../pages/AdminLogin';

const AdminLoginGuard = () => {
  const { userProfile, loading } = useUser();

  // Show loading while checking user profile
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is already admin, redirect to admin dashboard
  const isAdmin = userProfile?.userType === 'admin' || userProfile?.type === 'admin';
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If user is logged in but not admin, redirect to their appropriate dashboard
  if (userProfile) {
    const userType = userProfile.userType || userProfile.type;
    if (userType === 'caregiver' || userType === 'doctor') {
      return <Navigate to="/service-provider" replace />;
    }
    // For any other user type, redirect to home
    return <Navigate to="/" replace />;
  }

  // No user logged in, show admin login
  return <AdminLogin />;
};

export default AdminLoginGuard;

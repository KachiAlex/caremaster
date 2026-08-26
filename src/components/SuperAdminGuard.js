import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import authManager from '../utils/authManager';

const SuperAdminGuard = ({ children }) => {
  const { user, userProfile, userRole, loading } = useUser();
  const [verifying, setVerifying] = useState(true);
  const navigate = useNavigate();

  console.log('🛡️ SuperAdminGuard render:', {
    loading,
    hasUser: !!user,
    userRole,
    userType: userProfile?.userType,
    verifying
  });

  useEffect(() => {
    console.log('🛡️ SuperAdminGuard useEffect:', { loading, hasUser: !!user, userRole });
    
    if (loading) {
      console.log('🛡️ SuperAdminGuard: still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('🛡️ SuperAdminGuard: no user, redirecting to login');
      toast.error('Please log in to access the super admin panel');
      navigate('/super-admin/login', { replace: true });
      return;
    }

    const isSuperAdmin =
      userRole === 'super-admin' ||
      userProfile?.userType === 'super-admin' ||
      userProfile?.user_type === 'super-admin';

    console.log('🛡️ SuperAdminGuard: isSuperAdmin =', isSuperAdmin, {
      userRole,
      userType: userProfile?.userType,
      user_type: userProfile?.user_type
    });

    if (!isSuperAdmin) {
      console.log('⛔ Unauthorized access attempt to Super Admin portal. Role:', userRole);
      toast.error('Access denied. Super-admin privileges required.');
      authManager.signOutFromRole('super-admin').finally(() => {
        window.location.href = '/super-admin/login';
      });
      return;
    }

    console.log('✅ SuperAdminGuard: access granted, rendering children');
    setVerifying(false);
  }, [user, userProfile, userRole, loading, navigate]);

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying super-admin access... (loading: {String(loading)}, verifying: {String(verifying)})</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  const isSuperAdmin =
    userRole === 'super-admin' ||
    userProfile?.userType === 'super-admin' ||
    userProfile?.user_type === 'super-admin';

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access the super-admin panel.</p>
          <button
            onClick={() => navigate('/super-admin/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default SuperAdminGuard;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoc, doc } from 'backend/database';
import { onAuthStateChanged } from 'backend/auth';
import { db, auth } from '../backend/config';

const AdminGuard = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No user logged in
        toast.error('Please log in to access the admin panel');
        navigate('/new-admin-login');
        return;
      }

      try {
        // Check user's role in Database
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          toast.error('User profile not found');
          navigate('/new-admin-login');
          return;
        }

        const userData = userDoc.data();
        const userRole = userData.userType || userData.type;
        
        // Check if user is admin
        if (userRole === 'admin') {
          setIsAdmin(true);
          setLoading(false);
        } else {
          // User is not admin - redirect to appropriate dashboard
          toast.error('Access denied. Admin privileges required.');
          
          if (userRole === 'caregiver' || userRole === 'doctor' || userRole === 'admin') {
            navigate('/service-provider');
          } else if (userRole === 'elderly' || userRole === 'client' || userRole === 'Client') {
            navigate('/');
          } else {
            navigate('/login');
          }
          return;
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Error verifying admin access');
        navigate('/new-admin-login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
          <button
            onClick={() => navigate('/new-admin-login')}
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

export default AdminGuard;
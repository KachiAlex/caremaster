import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoc, doc } from 'backend/database';
import { onAuthStateChanged } from 'backend/auth';
import { db, auth } from '../backend/config';

const CaregiverGuard = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [licenseActive, setLicenseActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No user logged in
        toast.error('Please log in to access the caregiver panel');
        navigate('/login');
        return;
      }

      try {
        // Check user's role in Database
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          toast.error('User profile not found');
          navigate('/login');
          return;
        }

        const userData = userDoc.data();
        const userRole = userData.userType || userData.type;
        
        // Check if user is caregiver or doctor
        if (userRole === 'caregiver' || userRole === 'doctor') {
          setIsCaregiver(true);
          // License check via callable, if institutionId claim exists
          try {
            const token = await user.getIdTokenResult();
            const institutionId = token?.claims?.institutionId || userData?.institutionId;
            if (institutionId) {
              // Use licenseService which handles errors silently
              const { fetchLicenseStatus } = await import('../services/licenseService');
              const licenseStatus = await fetchLicenseStatus(institutionId).catch(() => {
                // Silently default to active if there's any error
                return { active: true, _suppressError: true };
              });
              setLicenseActive(Boolean(licenseStatus?.active));
            } else {
              setLicenseActive(true);
            }
          } catch (e) {
            // Suppress all errors - functions may not be deployed
            setLicenseActive(true);
          }
          setLoading(false);
        } else {
          // User is not caregiver/doctor - redirect to appropriate dashboard
          toast.error('Access denied. Caregiver/Doctor privileges required.');
          
          if (userRole === 'admin') {
            navigate('/new-admin-dashboard');
          } else if (userRole === 'elderly' || userRole === 'client') {
            navigate('/Client-dashboard');
          } else {
            navigate('/login');
          }
          return;
        }
      } catch (error) {
        console.error('Error checking caregiver status:', error);
        toast.error('Error verifying caregiver access');
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying caregiver access...</p>
        </div>
      </div>
    );
  }

  if (!isCaregiver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access the caregiver panel.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!licenseActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-yellow-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14c1.24 0 2.02-1.341 1.4-2.414L13.4 4.586c-.62-1.073-2.18-1.073-2.8 0L3.53 16.586C2.91 17.659 3.69 19 4.93 19z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">License Inactive</h3>
          <p className="text-gray-600 mb-4">Your institution's license is not active. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default CaregiverGuard;

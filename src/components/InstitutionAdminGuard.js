import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import { fetchLicenseStatus } from '../services/licenseService';

const InstitutionAdminGuard = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error('Please log in to access the institution admin panel');
        navigate('/login');
        return;
      }

      try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          toast.error('User profile not found');
          navigate('/login');
          return;
        }

        const userProfile = userDoc.data();
        setUserData(userProfile);

        // Check if user has institution admin role
        const isInstitutionAdmin = userProfile?.type === 'admin' || userProfile?.userType === 'admin' || userProfile?.institutionAdmin === true;
        const hasInstitutionId = userProfile?.institutionId;

        console.log('InstitutionAdminGuard check:', {
          isInstitutionAdmin,
          hasInstitutionId,
          userType: userProfile?.type,
          userTypeField: userProfile?.userType,
          institutionAdmin: userProfile?.institutionAdmin,
          institutionId: userProfile?.institutionId
        });

        if (!isInstitutionAdmin) {
          const userType = userProfile?.type || userProfile?.userType || 'unknown';
          toast.error(`Access denied. You are logged in as '${userType}', but institution admin privileges are required.`);
          console.error('User is not an institution admin. Current role:', userType);
          console.log('💡 To access institution admin panel: 1) Log out, 2) Have super-admin create an admin account for you, 3) Log in with that admin account');
          navigate('/');
          return;
        }

        if (!hasInstitutionId) {
          toast.error('No institution assigned to your account. Contact super admin.');
          console.error('User has no institutionId assigned');
          navigate('/');
          return;
        }

        // Check license status (temporarily disabled for debugging)
        console.log('🔍 Skipping license check temporarily for debugging');
        console.log('Institution ID:', userProfile.institutionId);
        
        // TODO: Re-enable license checking after debugging
        /*
        try {
          const licenseStatus = await fetchLicenseStatus(userProfile.institutionId);
          console.log('License status check:', licenseStatus);
          
          if (!licenseStatus.active) {
            toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}.`);
            navigate('/license-expired');
            return;
          }
        } catch (licenseError) {
          console.error('Error checking license status:', licenseError);
          console.warn('License check failed, allowing access for development');
        }
        */

        setIsAuthorized(true);
        setLoading(false);
      } catch (error) {
        console.error('Error checking institution admin status:', error);
        toast.error('Error verifying institution admin access');
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
          <p className="text-gray-600">Verifying institution admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access the institution admin panel.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pass user data to children via context or props
  return (
    <div className="institution-admin-layout">
      {React.cloneElement(children, { userData })}
    </div>
  );
};

export default InstitutionAdminGuard;

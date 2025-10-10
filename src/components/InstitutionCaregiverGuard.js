import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

const InstitutionCaregiverGuard = ({ children }) => {
  const { user, userProfile, loading, institutionId } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and user profile is available
    if (!loading && userProfile) {
      console.log('🔒 InstitutionCaregiverGuard: Checking access...', {
        userType: userProfile.userType,
        institutionId: userProfile.institutionId || institutionId,
        onboardingComplete: userProfile.onboardingComplete,
        status: userProfile.status
      });

      // Check if user is actually a caregiver
      const isCaregiver = userProfile.userType === 'caregiver' || user?.uid?.startsWith('caregiver_');
      
      if (!isCaregiver) {
        console.log('⛔ Unauthorized access attempt to Institution Caregiver portal');
        console.log(`User role "${userProfile.userType}" attempted to access Caregiver portal`);
        toast.error(`Access denied. You are not a caregiver. You will be logged out.`);
        
        // Log out and redirect
        signOut(auth).then(() => {
          const instId = userProfile.institutionId || institutionId;
          if (instId) {
            navigate(`/institution/login?institution=${instId}&role=caregiver`, { replace: true });
          } else {
            navigate('/onboard', { replace: true });
          }
          toast.info('Please log in with caregiver credentials');
        });
        return;
      }

      // Check if onboarding is required
      if (!userProfile.onboardingComplete) {
        console.log('⚠️ Onboarding incomplete - redirecting to onboarding');
        navigate('/institution-caregiver/onboarding');
        return;
      }

      // Check if caregiver is part of an institution
      if (!institutionId && !userProfile.institutionId) {
        console.log('❌ No institution assigned');
        toast.error('No institution assigned to your account');
        signOut(auth).then(() => {
          navigate('/onboard', { replace: true });
        });
        return;
      }

      // Check if caregiver is approved/active
      if (userProfile.status !== 'active' && userProfile.status !== 'pending') {
        console.log('❌ Caregiver status not active:', userProfile.status);
        toast.error(`Your account status is "${userProfile.status}". Contact your institution admin.`);
        signOut(auth).then(() => {
          const instId = userProfile.institutionId || institutionId;
          navigate(`/institution/login?institution=${instId}&role=caregiver`, { replace: true });
        });
        return;
      }
    }
  }, [user, userProfile, loading, navigate, institutionId]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // All checks passed in useEffect - render children if not loading
  if (!loading && userProfile) {
    return <>{children}</>;
  }
  
  // Redirect if not authenticated (fallback)
  if (!loading && !user) {
    console.log('❌ No user - redirecting to login');
    const instId = institutionId || userProfile?.institutionId;
    if (instId) {
      return <Navigate to={`/institution/login?institution=${instId}&role=caregiver`} replace />;
    }
    return <Navigate to="/onboard" replace />;
  }

  // Show loading during checks
  return null;
};

export default InstitutionCaregiverGuard;


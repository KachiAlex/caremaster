import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

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

      // Check if onboarding is required
      if (!userProfile.onboardingComplete) {
        console.log('⚠️ Onboarding incomplete - redirecting to onboarding');
        navigate('/institution-caregiver/onboarding');
        return;
      }

      // Check if caregiver is part of an institution
      if (!institutionId && !userProfile.institutionId) {
        console.log('❌ No institution assigned');
        navigate('/');
        return;
      }

      // Check if caregiver is approved/active
      if (userProfile.status !== 'active' && userProfile.status !== 'pending') {
        console.log('❌ Caregiver status not active:', userProfile.status);
        navigate('/');
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

  // Redirect if not authenticated
  if (!user) {
    console.log('❌ No user - redirecting to login');
    return <Navigate to={`/institution/login?institution=${institutionId || userProfile?.institutionId}`} replace />;
  }

  // Redirect if not a caregiver (check both userType and user ID pattern)
  if (userProfile && userProfile.userType !== 'caregiver') {
    // SAFEGUARD: Allow if user ID starts with 'caregiver_' (institution caregiver)
    if (!user?.uid?.startsWith('caregiver_')) {
      console.log('❌ Not a caregiver - access denied', {
        userType: userProfile.userType,
        userId: user?.uid
      });
      return <Navigate to="/" replace />;
    } else {
      console.log('⚠️ User ID indicates caregiver but userType mismatch - allowing access');
    }
  }

  // Redirect if onboarding not complete
  if (userProfile && !userProfile.onboardingComplete) {
    console.log('⚠️ Onboarding incomplete - redirecting');
    return <Navigate to="/institution-caregiver/onboarding" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
};

export default InstitutionCaregiverGuard;


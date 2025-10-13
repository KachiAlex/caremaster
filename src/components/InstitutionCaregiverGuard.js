import React, { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

const InstitutionCaregiverGuard = ({ children }) => {
  const [searchParams] = useSearchParams();
  const { user, userProfile, loading, institutionId } = useUser();
  const navigate = useNavigate();
  
  // Get institution ID from URL params as well
  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId || userProfile?.institutionId;

  useEffect(() => {
    // If not loading and user profile is available
    if (!loading && userProfile) {
      console.log('🔒 InstitutionCaregiverGuard: Checking access...', {
        userId: user?.uid,
        userType: userProfile.userType,
        institutionIdFromURL: urlInstitutionId,
        institutionIdFromContext: institutionId,
        institutionIdFromProfile: userProfile.institutionId,
        effectiveInstitutionId,
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
          const instId = effectiveInstitutionId;
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
        navigate(`/institution-caregiver/onboarding?institution=${effectiveInstitutionId}`);
        return;
      }

      // Check if caregiver is part of an institution
      if (!effectiveInstitutionId) {
        console.log('❌ No institution assigned - Context:', institutionId, 'Profile:', userProfile.institutionId);
        console.log('⚠️ Full user profile:', userProfile);
        toast.error('No institution assigned to your account. Please contact support.');
        signOut(auth).then(() => {
          navigate('/onboard', { replace: true });
        });
        return;
      }

      // Check if caregiver needs approval (onboarding complete but not yet approved)
      if (userProfile.status === 'pending' || !userProfile.status) {
        console.log('⏳ Caregiver pending approval - redirecting to pending approval page');
        navigate(`/institution-caregiver/pending-approval?institution=${effectiveInstitutionId}`);
        return;
      }

      // Check if caregiver is approved/active
      if (userProfile.status !== 'active') {
        console.log('❌ Caregiver status not allowed:', userProfile.status);
        const statusMessage = userProfile.status === 'suspended' 
          ? 'Your account has been suspended. Please contact your institution administrator.'
          : userProfile.status === 'rejected'
          ? 'Your account application was not approved. Please contact your institution administrator.'
          : `Your account status is "${userProfile.status}". Please contact your institution administrator for assistance.`;
        
        toast.error(statusMessage, { autoClose: 8000 });
        signOut(auth).then(() => {
          navigate(`/institution/login?institution=${effectiveInstitutionId}&role=caregiver`, { replace: true });
        });
        return;
      }
    }
  }, [user, userProfile, loading, navigate, institutionId, urlInstitutionId, effectiveInstitutionId]);

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
  if (!loading && !user) {
    console.log('❌ No user - redirecting to login');
    const instId = institutionId || userProfile?.institutionId;
    if (instId) {
      return <Navigate to={`/institution/login?institution=${instId}&role=caregiver`} replace />;
    }
    return <Navigate to="/onboard" replace />;
  }

  // Block rendering if profile loaded but checks fail
  if (!loading && userProfile) {
    // Check if user is actually a caregiver
    const isCaregiver = userProfile.userType === 'caregiver' || user?.uid?.startsWith('caregiver_');
    
    if (!isCaregiver) {
      // Will be handled by useEffect
      return null;
    }

    // CRITICAL: Redirect to onboarding if incomplete
    if (!userProfile.onboardingComplete) {
      console.log('🚫 Blocking render - onboarding incomplete');
      return <Navigate to={`/institution-caregiver/onboarding?institution=${effectiveInstitutionId}`} replace />;
    }

    // Check if caregiver is part of an institution
    if (!effectiveInstitutionId) {
      // Will be handled by useEffect
      return null;
    }

    // CRITICAL: Redirect to pending approval if not yet approved
    if (userProfile.status === 'pending' || !userProfile.status) {
      console.log('🚫 Blocking render - pending approval');
      return <Navigate to={`/institution-caregiver/pending-approval?institution=${effectiveInstitutionId}`} replace />;
    }

    // Check if caregiver is approved/active
    if (userProfile.status !== 'active') {
      // Will be handled by useEffect
      return null;
    }

    // All checks passed - render children
    return <>{children}</>;
  }

  // Show loading during checks
  return null;
};

export default InstitutionCaregiverGuard;


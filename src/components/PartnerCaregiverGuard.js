import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';
import { fetchLicenseStatus } from '../services/licenseService';
import { doc, getDoc } from '../services/databaseCompat';
import { db, auth } from '../backend/config';
import { getDoc, doc } from 'backend/database';
import { signOut } from 'backend/auth';

const PartnerCaregiverGuard = ({ children }) => {
  const [searchParams] = useSearchParams();
  const { user, userProfile, loading, institutionId } = useUser();
  const navigate = useNavigate();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(null);
  
  // Get institution ID from URL params as well
  const urlPartnerId = searchParams.get('institution');
  const effectivePartnerId = urlPartnerId || institutionId || userProfile?.institutionId;

  useEffect(() => {
    const checkAccess = async () => {
      // If not loading and user profile is available
      if (!loading && userProfile) {
      console.log('🔒 PartnerCaregiverGuard: Checking access...', {
        userId: user?.uid,
        userType: userProfile.userType,
        institutionIdFromURL: urlPartnerId,
        institutionIdFromContext: institutionId,
        institutionIdFromProfile: userProfile.institutionId,
        effectivePartnerId,
        onboardingComplete: userProfile.onboardingComplete,
        status: userProfile.status
      });

      const userRoles = Array.isArray(userProfile.roles) ? userProfile.roles : [userProfile.userType];
      const allowedRoles = ['caregiver', 'doctor', 'nurse', 'pharmacist'];
      const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role)) || user?.uid?.startsWith('caregiver_');
      const isAdmin = userRoles.some(role => ['admin', 'institutionAdmin'].includes(role));

      // If user is admin but ALSO has a caregiver-related role, allow them through
      // (multi-role users can intentionally switch dashboards)
      if (isAdmin && !hasAllowedRole) {
        console.log('🔀 Admin without caregiver role detected in caregiver portal - redirecting to admin dashboard');
        const instId = effectivePartnerId;
        if (instId) {
          navigate(`/institution-admin/dashboard?institution=${instId}`, { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
        return;
      }

      if (!hasAllowedRole) {
        console.log('⛔ Unauthorized access attempt to Partner Caregiver portal');
        console.log(`User roles "${userRoles.join(', ')}" attempted to access Caregiver portal`);
        toast.error(`Access denied. You need caregiver, doctor, or nurse privileges. You will be logged out.`);

        // Log out and redirect
        signOut(auth).then(() => {
          const instId = effectivePartnerId;
          if (instId) {
            navigate(`/login?institution=${instId}&role=caregiver`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
          toast.info('Please log in with caregiver credentials');
        });
        return;
      }

      // Check if onboarding is required
      // ALL caregivers/doctors/nurses must complete onboarding before accessing the dashboard
      let onboardingComplete = userProfile.onboardingComplete;
      
      // If onboardingComplete is not explicitly set in userProfile, check caregivers collection
      if (onboardingComplete !== true && user?.uid) {
        try {
          const caregiverRef = doc(db, 'caregivers', user.uid);
          const caregiverSnap = await getDoc(caregiverRef);
          if (caregiverSnap.exists()) {
            const caregiverData = caregiverSnap.data();
            // Parse notes JSON for onboarding data
            let notesData = {};
            try {
              if (caregiverData.notes && typeof caregiverData.notes === 'string' && caregiverData.notes.trim().startsWith('{')) {
                notesData = JSON.parse(caregiverData.notes);
              }
            } catch (e) {}
            onboardingComplete = caregiverData.onboardingComplete === true || notesData.onboardingComplete === true || caregiverData.status === 'active' || caregiverData.active === true;
            console.log('📋 Checked caregivers collection for onboarding:', { onboardingComplete, caregiverStatus: caregiverData.status, caregiverActive: caregiverData.active });
          }
        } catch (err) {
          console.warn('Failed to check caregivers collection for onboarding status:', err.message);
        }
      }
      
      setIsOnboarded(onboardingComplete === true);
      setOnboardingChecked(true);
      
      if (!onboardingComplete) {
        console.log('⚠️ Onboarding incomplete - redirecting to onboarding');
        navigate(`/institution-caregiver/onboarding?institution=${effectivePartnerId}`);
        return;
      }

      // Check if caregiver is part of an institution
      if (!effectivePartnerId) {
        console.log('❌ No institution assigned - Context:', institutionId, 'Profile:', userProfile.institutionId);
        console.log('⚠️ Full user profile:', userProfile);
        toast.error('No institution assigned to your account. Please contact support.');
        signOut(auth).then(() => {
          navigate('/', { replace: true });
        });
        return;
      }

      // CRITICAL: Check institution license status before allowing access
      try {
        console.log('🔍 Checking institution license for caregiver access...');
        const licenseStatus = await fetchLicenseStatus(effectivePartnerId);
        
        if (!licenseStatus.active) {
          console.warn('⛔ Partner license inactive:', licenseStatus.reason);
          toast.error(`Access denied. Your institution's license is ${licenseStatus.reason || 'inactive'}. Please contact your administrator.`);
          signOut(auth).then(() => {
            navigate(`/license-required?institution=${effectivePartnerId}`, { replace: true });
          });
          return;
        }
        console.log('✅ Partner license verified for caregiver');
      } catch (licenseError) {
        console.error('❌ License check error:', licenseError);
        toast.error('Unable to verify institution license. Access denied.');
        signOut(auth).then(() => {
          navigate(`/license-required?institution=${effectivePartnerId}`, { replace: true });
        });
        return;
      }

      // Check if caregiver needs approval (onboarding complete but not yet approved)
      if (userProfile.status === 'pending' || !userProfile.status) {
        console.log('⏳ Caregiver pending approval - redirecting to pending approval page');
        navigate(`/institution-caregiver/pending-approval?institution=${effectivePartnerId}`);
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
          navigate(`/login?institution=${effectivePartnerId}&role=caregiver`, { replace: true });
        });
        return;
      }

      // All checks passed - show children
      console.log('✅ All caregiver guard checks passed');
      }
    };

    checkAccess();
  }, [user, userProfile, loading, navigate, institutionId, urlPartnerId, effectivePartnerId]);

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
      return <Navigate to={`/login?institution=${instId}&role=caregiver`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Block rendering if profile loaded but checks fail
  if (!loading && userProfile) {
    const userRoles = Array.isArray(userProfile.roles) ? userProfile.roles : [userProfile.userType];
    const allowedRoles = ['caregiver', 'doctor', 'nurse', 'pharmacist'];
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role)) || user?.uid?.startsWith('caregiver_');
    const isAdmin = userRoles.some(role => ['admin', 'institutionAdmin'].includes(role));

    // Only redirect admins who do NOT also have a caregiver-related role
    if (isAdmin && !hasAllowedRole) {
      const instId = effectivePartnerId;
      return <Navigate to={instId ? `/institution-admin/dashboard?institution=${instId}` : '/admin'} replace />;
    }

    if (!hasAllowedRole) {
      // Will be handled by useEffect
      return null;
    }

    // CRITICAL: Redirect to onboarding if incomplete
    // ALL caregivers/doctors/nurses must complete onboarding before accessing the dashboard
    if (!onboardingChecked) {
      // Still checking caregivers collection for onboarding status
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    if (isOnboarded === false) {
      console.log('🚫 Blocking render - onboarding incomplete');
      return <Navigate to={`/institution-caregiver/onboarding?institution=${effectivePartnerId}`} replace />;
    }

    // Check if caregiver is part of an institution
    if (!effectivePartnerId) {
      // Will be handled by useEffect
      return null;
    }

    // CRITICAL: Redirect to pending approval if not yet approved
    if (userProfile.status === 'pending' || !userProfile.status) {
      console.log('🚫 Blocking render - pending approval');
      return <Navigate to={`/institution-caregiver/pending-approval?institution=${effectivePartnerId}`} replace />;
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

export default PartnerCaregiverGuard;


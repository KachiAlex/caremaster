import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import { fetchLicenseStatus } from '../services/licenseService';

const InstitutionAdminGuard = ({ children }) => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error('Please log in to access the institution admin panel');
        navigate('/institution/login', { replace: true });
        setLoading(false);
        return;
      }

      try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          toast.error('User profile not found');
          await signOut(auth);
          navigate('/institution/login', { replace: true });
          setLoading(false);
          return;
        }

        const userProfile = userDoc.data();
        setUserData(userProfile);

        // Get institution ID from URL params or user profile
        const urlInstitutionId = searchParams.get('institution');
        const effectiveInstitutionId = urlInstitutionId || userProfile?.institutionId;

        // Check if user has institution admin role (support multi-role)
        // Check multiple fields for admin role
        const userType = userProfile?.type || userProfile?.userType || userProfile?.role;
        const userRoles = Array.isArray(userProfile?.roles) 
          ? userProfile.roles 
          : (userProfile?.roles ? [userProfile.roles] : [userType].filter(Boolean));
        
        const isInstitutionAdmin = 
          userRoles.includes('admin') || 
          userRoles.includes('institutionAdmin') ||
          userType === 'admin' ||
          userType === 'institutionAdmin' ||
          userProfile?.institutionAdmin === true ||
          userProfile?.adminRoleAssigned === true ||
          userProfile?.isAdmin === true ||
          userProfile?.role === 'admin';
        
        const hasInstitutionId = !!effectiveInstitutionId;

        console.log('🔒 InstitutionAdminGuard check:', {
          userId: user.uid,
          email: user.email,
          isInstitutionAdmin,
          hasInstitutionId,
          userType: userType,
          userTypeField: userProfile?.type,
          userTypeField2: userProfile?.userType,
          roleField: userProfile?.role,
          userRoles: userRoles,
          institutionAdmin: userProfile?.institutionAdmin,
          adminRoleAssigned: userProfile?.adminRoleAssigned,
          isAdmin: userProfile?.isAdmin,
          institutionIdFromProfile: userProfile?.institutionId,
          institutionIdFromURL: urlInstitutionId,
          effectiveInstitutionId: effectiveInstitutionId,
          fullProfile: userProfile
        });

        if (!isInstitutionAdmin) {
          // SAFEGUARD: If user email contains "admin" or they were just created, give them a chance
          const isLikelyAdmin = user.email?.toLowerCase().includes('admin') || 
                               userProfile?.email?.toLowerCase().includes('admin') ||
                               // Known admin emails
                               ['admin@bulah.com', 'admin@ultimatecare.health', 'admin2@ultimatecare.health', 'newadmin@ultimatecare.health'].includes(user.email?.toLowerCase());
          
          if (isLikelyAdmin) {
            console.warn('⚠️ User appears to be admin but role not set correctly. Allowing access temporarily.');
            console.warn('User data:', { email: user.email, userType, profile: userProfile });
            
            // Allow access but show warning
            toast.warning('Admin role not properly set. Contact super-admin to fix your account.');
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
          
          // Redirect users to their appropriate dashboard based on role
          console.log('⛔ Unauthorized access attempt to Institution Admin portal');
          console.log(`User role "${userType}" attempted to access Institution Admin portal`);
          
          // Redirect pharmacists to pharmacy dashboard
          if (userType === 'pharmacist' || userProfile?.medicalQualification === 'Pharmacist') {
            toast.info('Redirecting to pharmacy dashboard...');
            if (hasInstitutionId) {
              navigate(`/institution-pharmacy/dashboard?institution=${userProfile.institutionId}`, { replace: true });
            } else {
              navigate('/institution-pharmacy/dashboard', { replace: true });
            }
            setLoading(false);
            return;
          }
          
          // Redirect caregivers/doctors/nurses to caregiver dashboard
          if (['caregiver', 'doctor', 'nurse'].includes(userType)) {
            toast.info('Redirecting to caregiver dashboard...');
            if (hasInstitutionId) {
              navigate(`/institution-caregiver/dashboard?institution=${userProfile.institutionId}`, { replace: true });
            } else {
              navigate('/institution-caregiver/dashboard', { replace: true });
            }
            setLoading(false);
            return;
          }
          
          toast.error(`Access denied. You are logged in as '${userType || 'unknown'}'. Please contact your administrator to grant you admin access.`);
          
          // Redirect to institution login with the institutionId if available
          if (hasInstitutionId) {
            navigate(`/institution/login?institution=${userProfile.institutionId}&role=admin`, { replace: true });
          } else {
            navigate('/onboard', { replace: true });
          }
          
          setLoading(false);
          return;
        }

        // CRITICAL: License check FIRST - check if we have institution ID to verify license
        // This ensures we show the correct license error message
        if (effectiveInstitutionId) {
          console.log('🔐 ENFORCING LICENSE CHECK for institution:', effectiveInstitutionId);
          
          try {
            const licenseStatus = await fetchLicenseStatus(effectiveInstitutionId);
            console.log('📋 License status result:', {
              active: licenseStatus.active,
              reason: licenseStatus.reason,
              hasLicense: !!licenseStatus.license,
              institutionId: effectiveInstitutionId
            });
            
            if (!licenseStatus.active) {
              console.error('❌ ACCESS DENIED - License inactive:', licenseStatus.reason || 'no_license');
              
              // Customize error message based on reason
              let errorMessage = 'Access denied. ';
              if (licenseStatus.reason === 'license_expired') {
                errorMessage += 'Your institution license has expired.';
              } else if (licenseStatus.reason === 'license_suspended') {
                errorMessage += 'Your institution has been suspended.';
              } else if (licenseStatus.reason === 'no_license') {
                errorMessage += 'Your institution does not have an active license.';
              } else {
                errorMessage += `Your institution license is ${licenseStatus.reason || 'inactive'}.`;
              }
              errorMessage += ' Please activate your license to continue.';
              
              toast.warning(errorMessage, { autoClose: 5000 });
              
              // Redirect to license activation page WITHOUT signing out
              // This allows the user to activate license and continue their session
              navigate(`/license-required?institution=${effectiveInstitutionId}&reason=${licenseStatus.reason}`, { replace: true });
              setLoading(false);
              return;
            }
            
            console.log('✅ LICENSE VERIFIED - Access granted to admin dashboard');
          } catch (licenseError) {
            console.error('❌ LICENSE CHECK ERROR:', licenseError);
            toast.error('Unable to verify license. Please contact support.');
            
            // Redirect to license page WITHOUT signing out
            navigate(`/license-required?institution=${effectiveInstitutionId}&reason=check_error`, { replace: true });
            setLoading(false);
            return;
          }
        }

        // After license check, verify institutionId exists
        if (!hasInstitutionId) {
          toast.error('No institution assigned to your account. Contact super admin.');
          console.error('User has no institutionId assigned');
          console.error('User profile:', userProfile);
          // Redirect to onboarding without signing out
          navigate('/onboard', { replace: true });
          setLoading(false);
          return;
        }

        setIsAuthorized(true);
        setLoading(false);
      } catch (error) {
        console.error('Error checking institution admin status:', error);
        console.error('Error details:', error.message, error.stack);
        toast.error('Error verifying institution admin access. Please try again.');
        // Redirect to login instead of home page
        navigate('/institution/login', { replace: true });
        setLoading(false);
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

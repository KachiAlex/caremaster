import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserById } from '../api/usersAPI';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [licenseActive, setLicenseActive] = useState(true);
  const [institutionId, setInstitutionId] = useState(null);
  const [institutionData, setInstitutionData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          setUser(firebaseUser);
          
          // Get user profile from Firestore
          const profile = await getUserById(firebaseUser.uid);
          console.log('🔍 UserContext Debug - Profile loaded:', {
            userId: firebaseUser.uid,
            profile: profile,
            userType: profile?.userType,
            type: profile?.type,
            role: profile?.role
          });
          
          if (profile) {
            // Handle both 'patient' and 'elderly' as the same role, also check userType field and role field
            // Support multiple roles
            let roleFromProfile;
            let userRoles = [];
            
            if (Array.isArray(profile.roles) && profile.roles.length > 0) {
              // User has multiple roles
              userRoles = profile.roles;
              roleFromProfile = profile.roles[0]; // Primary role
            } else {
              // Single role (backward compatibility)
              roleFromProfile = profile.role || profile.userType || profile.type || 'patient';
              userRoles = [roleFromProfile];
            }
            
            let updatedProfile = {
              ...profile,
              roles: userRoles,
              userType: roleFromProfile // Keep for backward compatibility
            };
            
            // SAFEGUARD: If user ID starts with 'caregiver_' but role is not caregiver, fix it
            if (firebaseUser.uid.startsWith('caregiver_') && roleFromProfile !== 'caregiver') {
              console.warn('⚠️ User ID indicates caregiver but role is:', roleFromProfile);
              console.warn('🔧 Auto-correcting to caregiver role');
              roleFromProfile = 'caregiver';
              
              // Update local profile state immediately
              updatedProfile = {
                ...profile,
                userType: 'caregiver',
                type: 'caregiver'
              };
              
              // Update Firestore to fix the issue permanently
              try {
                const { doc, updateDoc } = await import('firebase/firestore');
                const userRef = doc(db, 'users', firebaseUser.uid);
                await updateDoc(userRef, { 
                  userType: 'caregiver',
                  type: 'caregiver'
                });
                console.log('✅ Fixed userType in Firestore');
              } catch (updateError) {
                console.error('❌ Failed to update userType:', updateError);
              }
            }
            
            setUserProfile(updatedProfile);
            setUserRole(roleFromProfile);
            setUserRoles(userRoles);
            console.log('✅ User role set to:', roleFromProfile);
            console.log('✅ User roles:', userRoles);

            // Institution and License check
            try {
              const token = await firebaseUser.getIdTokenResult();
              // Use updatedProfile instead of profile to ensure we get the correct institutionId
              const tokenInstitutionId = token?.claims?.institutionId || updatedProfile?.institutionId;
              
              console.log('🏢 Institution ID check:', {
                fromToken: token?.claims?.institutionId,
                fromProfile: updatedProfile?.institutionId,
                final: tokenInstitutionId
              });
              
              if (tokenInstitutionId) {
                setInstitutionId(tokenInstitutionId);
                console.log('✅ Institution ID set to:', tokenInstitutionId);
                
                // Fetch license status
                const { fetchLicenseStatus } = await import('../services/licenseService');
                const licenseStatus = await fetchLicenseStatus(tokenInstitutionId);
                setLicenseActive(Boolean(licenseStatus?.active));
                
                // TODO: Fetch institution data if needed
                // const { getInstitution } = await import('../services/institutionService');
                // const institution = await getInstitution(tokenInstitutionId);
                // setInstitutionData(institution);
              } else {
                console.warn('⚠️ No institution ID found in token or profile');
                setLicenseActive(true);
                setInstitutionId(null);
              }
            } catch (e) {
              console.error('Error checking institution/license:', e);
              setLicenseActive(true);
              setInstitutionId(null);
            }
          } else {
            // User profile doesn't exist in Firestore - create it automatically
            console.log('User profile not found in Firestore, creating profile...');
            try {
              // Import createUser function
              const { createUser } = await import('../api/usersAPI');
              
              // Create basic user profile - admin will assign specializations later
              const newUserData = {
                id: firebaseUser.uid,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: firebaseUser.email,
                userType: 'client', // Default to client, admin can change to caregiver after verification
                photoUrl: firebaseUser.photoURL,
                specializations: [], // Empty - to be filled by admin after verification
                certifications: [], // Empty - to be verified by admin
                experience: '', // To be filled during caregiver onboarding
                qualificationLevel: 'pending', // Pending admin verification
                profileComplete: false, // Requires admin verification for caregivers
                createdAt: new Date()
              };
              
              await createUser(newUserData);
              console.log('✅ User profile created successfully');
              
              // Fetch the newly created profile
              const newProfile = await getUserById(firebaseUser.uid);
              if (newProfile) {
                setUserProfile(newProfile);
                const roleFromProfile = newProfile.userType || newProfile.type || 'client';
                setUserRole(roleFromProfile);
                console.log('✅ New profile loaded:', roleFromProfile);
              }
            } catch (createError) {
              console.error('Error creating user profile:', createError);
              // Fallback: set default role without profile
              setUserProfile(null);
              setUserRole('client'); // Default to client instead of caregiver
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setUserRole(null); // Don't set a default role, let the login flow handle it
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
        setUserRoles([]);
        setLicenseActive(true);
        setInstitutionId(null);
        setInstitutionData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isServiceProvider = () => {
    return userRole === 'doctor' || userRole === 'caregiver';
  };

  const refreshUserProfile = async () => {
    if (user) {
      try {
        const profile = await getUserById(user.uid);
        setUserProfile(profile);
        console.log('✅ User profile refreshed');
        return profile;
      } catch (error) {
        console.error('Error refreshing user profile:', error);
        throw error;
      }
    }
  };

  const isDoctor = () => {
    return userRole === 'doctor';
  };

  const isCaregiver = () => {
    return userRole === 'caregiver';
  };

  const isElderly = () => {
    return userRole === 'elderly';
  };

  const isAdmin = () => {
    return userRole === 'admin';
  };

  const getCaregiverOnboardingRoute = () => {
    // Always redirect to the new comprehensive onboarding page
    return '/caregiver/onboarding';
  };

  const isOnboardingIncomplete = () => {
    if (!userProfile) {
      console.log('No user profile found, onboarding required');
      return true;
    }
    
    console.log('Checking onboarding completion:', {
      userRole,
      userType: userProfile.userType,
      onboardingComplete: userProfile.onboardingComplete,
      onboardingProfileComplete: userProfile.onboardingProfileComplete
    });

    // For caregivers, STRICTLY enforce onboarding completion
    if (userProfile.userType === 'caregiver') {
      // Check if onboarding is explicitly complete
      const isComplete = userProfile.onboardingComplete === true;
      if (!isComplete) {
        console.log('🚫 CAREGIVER ONBOARDING INCOMPLETE - blocking access', {
          onboardingComplete: userProfile.onboardingComplete,
          userType: userProfile.userType
        });
        return true;
      }
      console.log('✅ Caregiver onboarding complete');
      return false;
    }

    // For admins, always allow access (no onboarding required)
    if (userRole === 'admin' || userProfile.userType === 'admin') {
      console.log('✅ Admin access - no onboarding required');
      return false;
    }

    // For elderly/patients, check if they've completed patient onboarding  
    if (userProfile.userType === 'elderly' || userRole === 'patient') {
      if (!userProfile.onboardingProfileComplete) {
        console.log('🚫 PATIENT ONBOARDING INCOMPLETE - blocking access');
        return true;
      }
      console.log('✅ Patient onboarding complete');
      return false;
    }

    // Default to requiring onboarding for unknown user types
    console.log('⚠️ Unknown user type, requiring onboarding');
    return true;
    
    /* Original logic - commented out for testing
    if (!userProfile) {
      console.log('No user profile found, onboarding required');
      return true;
    }
    
    console.log('Checking onboarding completion:', {
      userRole,
      userProfile,
      onboardingProfileComplete: userProfile?.onboardingProfileComplete,
      onboardingMedicalComplete: userProfile?.onboardingMedicalComplete
    });
    
    // For patient/elderly users, check profile and medical completion
    if (userRole === 'elderly' || userRole === 'patient') {
      const hasCompletionFlags = userProfile?.onboardingProfileComplete && userProfile?.onboardingMedicalComplete;
      
      // If user has basic profile data but no completion flags, consider them complete
      const hasBasicProfile = userProfile?.name || userProfile?.displayName || userProfile?.dateOfBirth;
      
      const isIncomplete = !hasCompletionFlags && !hasBasicProfile;
      console.log('Patient onboarding incomplete:', isIncomplete, {
        hasCompletionFlags,
        hasBasicProfile,
        profileData: {
          name: userProfile?.name,
          displayName: userProfile?.displayName,
          dateOfBirth: userProfile?.dateOfBirth
        }
      });
      return isIncomplete;
    }
    
    // For caregivers, check all onboarding steps
    if (userRole === 'caregiver') {
      const isIncomplete = !(userProfile?.onboardingCareerComplete && 
               userProfile?.onboardingQualificationsComplete && 
               userProfile?.onboardingReferencesComplete && 
               userProfile?.onboardingDocumentsComplete && 
               userProfile?.onboardingStatementComplete);
      console.log('Caregiver onboarding incomplete:', isIncomplete);
      return isIncomplete;
    }
    
    // For other user types, consider onboarding complete
    console.log('Other user type, onboarding complete');
    return false;
    */
  };

  const value = {
    user,
    userProfile,
    userRole,
    userRoles,
    loading,
    isOnboardingIncomplete,
    getCaregiverOnboardingRoute,
    isServiceProvider,
    isDoctor,
    isCaregiver,
    isElderly,
    isAdmin,
    updateUserProfile: setUserProfile,
    updateUserRoles: setUserRoles,
    refreshUserProfile,
    licenseActive,
    institutionId,
    institutionData,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

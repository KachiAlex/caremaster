import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
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
            // Handle both 'Client' and 'elderly' as the same role, also check userType field and role field
            // Support multiple roles
            let roleFromProfile;
            let userRoles = [];
            
            if (Array.isArray(profile.roles) && profile.roles.length > 0) {
              // User has multiple roles
              userRoles = profile.roles;
              roleFromProfile = profile.roles[0]; // Primary role
            } else {
              // Single role (backward compatibility)
              // Check all possible role fields, prioritizing admin
              const possibleRole = profile.role || profile.userType || profile.type;
              
              // SAFEGUARD: If email contains "admin" or userType/type is admin, ensure role is admin
              const isLikelyAdmin = firebaseUser.email?.toLowerCase().includes('admin') ||
                                   profile.userType === 'admin' ||
                                   profile.type === 'admin' ||
                                   profile.role === 'admin' ||
                                   profile.isAdmin === true ||
                                   profile.institutionAdmin === true;
              
              if (isLikelyAdmin && possibleRole !== 'admin') {
                console.warn('⚠️ User appears to be admin but role field shows:', possibleRole);
                console.warn('🔧 Auto-correcting to admin role');
                roleFromProfile = 'admin';
                userRoles = ['admin'];
                
                // Update Firestore to fix the issue
                try {
                  const { doc, updateDoc } = await import('firebase/firestore');
                  const userRef = doc(db, 'users', firebaseUser.uid);
                  await updateDoc(userRef, { 
                    userType: 'admin',
                    type: 'admin',
                    role: 'admin'
                  });
                  console.log('✅ Fixed admin role in Firestore');
                } catch (updateError) {
                  console.error('❌ Failed to update admin role:', updateError);
                }
              } else {
                roleFromProfile = possibleRole || 'Client';
                userRoles = [roleFromProfile];
              }
            }
            
            let updatedProfile = {
              ...profile,
              roles: userRoles,
              userType: roleFromProfile // Keep for backward compatibility
            };
            
            // SAFEGUARD: Check if user should be admin but role is wrong
            const isLikelyAdmin = firebaseUser.email?.toLowerCase().includes('admin') ||
                                 profile.userType === 'admin' ||
                                 profile.type === 'admin' ||
                                 profile.role === 'admin' ||
                                 profile.isAdmin === true ||
                                 profile.institutionAdmin === true;
            
            if (isLikelyAdmin && roleFromProfile !== 'admin') {
              console.warn('⚠️ User appears to be admin but role is:', roleFromProfile);
              console.warn('🔧 Auto-correcting to admin role');
              roleFromProfile = 'admin';
              userRoles = ['admin'];
              
              // Update local profile state immediately
              updatedProfile = {
                ...profile,
                userType: 'admin',
                type: 'admin',
                role: 'admin',
                roles: ['admin']
              };
              
              // Update Firestore to fix the issue permanently
              try {
                const { doc, updateDoc } = await import('firebase/firestore');
                const userRef = doc(db, 'users', firebaseUser.uid);
                await updateDoc(userRef, { 
                  userType: 'admin',
                  type: 'admin',
                  role: 'admin',
                  roles: ['admin']
                });
                console.log('✅ Fixed admin role in Firestore');
              } catch (updateError) {
                console.error('❌ Failed to update admin role:', updateError);
              }
            }
            
            // SAFEGUARD: If user ID starts with 'caregiver_' but role is not caregiver, fix it
            if (firebaseUser.uid.startsWith('caregiver_') && roleFromProfile !== 'caregiver' && !isLikelyAdmin) {
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
                
                // Fetch license status (suppresses errors if functions not deployed)
                const { fetchLicenseStatus } = await import('../services/licenseService');
                const licenseStatus = await fetchLicenseStatus(tokenInstitutionId).catch(() => {
                  // Silently default to active if there's any error
                  return { active: true, _suppressError: true };
                });
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
              // Suppress all error logging - functions may not be deployed
              // License status defaults to active to allow app to function
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
    return userRole === 'doctor' || userRole === 'caregiver' || userRole === 'nurse' || userRole === 'pharmacist';
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

  const isPharmacist = () => {
    return userRole === 'pharmacist';
  };

  const isNurse = () => {
    return userRole === 'nurse';
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

    // For caregivers and pharmacists, enforce onboarding completion
    // IMPORTANT: If user is activated (status: 'active'), allow access even if onboarding is incomplete
    // Only require onboarding completion for users who are not yet activated
    const caregiverTypes = ['caregiver', 'nurse', 'doctor', 'pharmacist'];
    if (caregiverTypes.includes(userProfile.userType)) {
      // If user is activated, allow access regardless of onboarding status
      if (userProfile.status === 'active') {
        console.log(`✅ Activated ${userProfile.userType} - allowing access even if onboarding incomplete`);
        return false;
      }
      
      // Check if onboarding is explicitly complete
      const isComplete = userProfile.onboardingComplete === true;
      if (!isComplete) {
        console.log(`🚫 ${userProfile.userType.toUpperCase()} ONBOARDING INCOMPLETE - blocking access`, {
          onboardingComplete: userProfile.onboardingComplete,
          userType: userProfile.userType,
          status: userProfile.status
        });
        return true;
      }
      console.log(`✅ ${userProfile.userType} onboarding complete`);
      return false;
    }

    // For admins, always allow access (no onboarding required)
    if (userRole === 'admin' || userProfile.userType === 'admin') {
      console.log('✅ Admin access - no onboarding required');
      return false;
    }

    // For elderly/clients, check if they've completed Client onboarding  
    if (userProfile.userType === 'elderly' || userRole === 'Client') {
      if (!userProfile.onboardingProfileComplete) {
        console.log('🚫 Client ONBOARDING INCOMPLETE - blocking access');
        return true;
      }
      console.log('✅ Client onboarding complete');
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
    
    // For Client/elderly users, check profile and medical completion
    if (userRole === 'elderly' || userRole === 'Client') {
      const hasCompletionFlags = userProfile?.onboardingProfileComplete && userProfile?.onboardingMedicalComplete;
      
      // If user has basic profile data but no completion flags, consider them complete
      const hasBasicProfile = userProfile?.name || userProfile?.displayName || userProfile?.dateOfBirth;
      
      const isIncomplete = !hasCompletionFlags && !hasBasicProfile;
      console.log('Client onboarding incomplete:', isIncomplete, {
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
    isPharmacist,
    isNurse,
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

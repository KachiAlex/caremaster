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
            type: profile?.type
          });
          
          if (profile) {
            setUserProfile(profile);
            // Handle both 'patient' and 'elderly' as the same role, also check userType field
            const roleFromProfile = profile.userType || profile.type || 'patient';
            setUserRole(roleFromProfile);
            console.log('✅ User role set to:', roleFromProfile);
          } else {
            // User profile doesn't exist in Firestore yet - wait a bit for it to be created
            console.log('User profile not found in Firestore, waiting for profile creation...');
            setTimeout(async () => {
              try {
                const retryProfile = await getUserById(firebaseUser.uid);
                if (retryProfile) {
                  setUserProfile(retryProfile);
                  const roleFromProfile = retryProfile.userType || retryProfile.type || 'patient';
                  setUserRole(roleFromProfile);
                  console.log('Profile found on retry:', roleFromProfile);
                } else {
                  setUserProfile(null);
                  setUserRole('patient'); // Default role
                }
              } catch (retryError) {
                console.error('Error on profile retry:', retryError);
                setUserProfile(null);
                setUserRole('patient');
              }
            }, 2000); // Wait 2 seconds for profile creation
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setUserRole('patient'); // Default role for better UX
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isServiceProvider = () => {
    return userRole === 'doctor' || userRole === 'caregiver';
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
    loading,
    isOnboardingIncomplete,
    getCaregiverOnboardingRoute,
    isServiceProvider,
    isDoctor,
    isCaregiver,
    isElderly,
    isAdmin,
    updateUserProfile: setUserProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

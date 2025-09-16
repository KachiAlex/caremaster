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
          if (profile) {
            setUserProfile(profile);
            // Handle both 'patient' and 'elderly' as the same role, also check userType field
            const roleFromProfile = profile.userType || profile.type || 'patient';
            setUserRole(roleFromProfile);
          } else {
            // User profile doesn't exist in Firestore yet
            console.log('User profile not found in Firestore, user may be new');
            setUserProfile(null);
            setUserRole('patient'); // Default role
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

  const isOnboardingIncomplete = () => {
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
  };

  const value = {
    user,
    userProfile,
    userRole,
    loading,
    isOnboardingIncomplete,
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

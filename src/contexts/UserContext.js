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
            setUserRole(profile.type || 'elderly');
          } else {
            // User profile doesn't exist in Firestore yet
            console.log('User profile not found in Firestore, user may be new');
            setUserProfile(null);
            setUserRole('elderly'); // Default role
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setUserRole('elderly'); // Default role for better UX
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

  const value = {
    user,
    userProfile,
    userRole,
    loading,
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

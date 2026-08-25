// Utility script to create admin user
// This would typically be run once during setup

import { createUserWithEmailAndPassword, updateProfile } from 'backend/auth';
import { doc, setDoc } from 'backend/database';
import { auth, db } from '../backend/config';

export const createAdminUser = async (email, password, name) => {
  try {
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name
    });

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name: name,
      email: email,
      userType: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Admin user created successfully:', user.uid);
    return { success: true, userId: user.uid };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: error.message };
  }
};

// For development - create default admin
export const createDefaultAdmin = () => {
  return createAdminUser('admin@Care Master.com', 'admin123456', 'Care Master Administrator');
};

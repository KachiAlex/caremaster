import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import dataConnectService from '../services/dataConnectService';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

const USERS_COLLECTION = 'users';

// Get all users
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData,
        // Convert Firestore timestamps to JavaScript dates
        joinDate: userData.joinDate?.toDate?.() || userData.joinDate,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get user by ID (using Data Connect)
export const getUserById = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    logger.debug('Fetching user by ID', { userId });
    
    // Try Data Connect first
    try {
      const result = await dataConnectService.getUserProfile(userId);
      if (result.data && result.data.length > 0) {
        return result.data[0];
      }
    } catch (dataConnectError) {
      logger.warn('Data Connect failed, falling back to Firestore', { error: dataConnectError });
    }
    
    // Fallback to Firestore
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        id: userSnap.id,
        ...userData,
        joinDate: userData.joinDate?.toDate?.() || userData.joinDate,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
      };
    } else {
      // Return null instead of throwing error for better UX
      return null;
    }
  } catch (error) {
    errorHandler.handleError(error, { context: 'get_user_by_id', userId });
    throw error;
  }
};

// Create new user
export const createUser = async (userData) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const newUser = {
      ...userData,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      joinDate: serverTimestamp(),
      lastActive: serverTimestamp(),
    };
    
    const docRef = await addDoc(usersRef, newUser);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (userId, updateData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Update user status (suspend/activate)
export const updateUserStatus = async (userId, status) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Get users by type
export const getUsersByType = async (userType) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('type', '==', userType), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData,
        joinDate: userData.joinDate?.toDate?.() || userData.joinDate,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users by type:', error);
    throw error;
  }
};

// Get users by status
export const getUsersByStatus = async (status) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData,
        joinDate: userData.joinDate?.toDate?.() || userData.joinDate,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users by status:', error);
    throw error;
  }
};

// Search users
export const searchUsers = async (searchTerm) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const user = {
        id: doc.id,
        ...userData,
        joinDate: userData.joinDate?.toDate?.() || userData.joinDate,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
      };
      
      // Search in name, email, and phone
      const searchLower = searchTerm.toLowerCase();
      if (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.includes(searchTerm)
      ) {
        users.push(user);
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Real-time listener for users
export const subscribeToUsers = (callback) => {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData,
        joinDate: userData.joinDate?.toDate?.() || userData.joinDate,
        lastActive: userData.lastActive?.toDate?.() || userData.lastActive,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
      });
    });
    callback(users);
  });
};

// Get user statistics
export const getUserStats = async () => {
  try {
    const users = await getAllUsers();
    
    const stats = {
      total: users.length,
      elderly: users.filter(user => user.type === 'elderly').length,
      caregivers: users.filter(user => user.type === 'caregiver').length,
      doctors: users.filter(user => user.type === 'doctor').length,
      active: users.filter(user => user.status === 'active').length,
      inactive: users.filter(user => user.status === 'inactive').length,
      suspended: users.filter(user => user.status === 'suspended').length,
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

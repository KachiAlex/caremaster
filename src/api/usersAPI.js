import api from './config';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

const USERS_ENDPOINT = '/users';

// Get all users
export const getAllUsers = async () => {
  try {
    const response = await api.get(USERS_ENDPOINT);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    logger.debug('Fetching user by ID', { userId });
    
    // First try REST API
    try {
      const response = await api.get(`${USERS_ENDPOINT}/${userId}`);
      return response.data;
    } catch (apiError) {
      // If API fails, fallback to mock for Firebase users
      console.log('API user not found, likely Firebase user - returning null');
      return null;
    }
  } catch (error) {
    errorHandler.handleError(error, { context: 'get_user_by_id', userId });
    throw error;
  }
};

// Get user by email
export const getUserByEmail = async (email) => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}/by-email`, { params: { email } });
    return response.data;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

// Create new user
export const createUser = async (userData) => {
  try {
    logger.info('Creating new user', { userType: userData.userType, userId: userData.id });
    
    const userDocData = {
      ...userData,
      status: 'active',
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await api.post(USERS_ENDPOINT, userDocData);
    logger.info('User created successfully', { userId: response.data.id });
    return response.data.id;
  } catch (error) {
    logger.error('Failed to create user', { error, userData });
    errorHandler.handleError(error, { context: 'create_user', userData });
    throw error;
  }
};

// Update user
export const updateUser = async (userId, updateData) => {
  try {
    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    const response = await api.put(`${USERS_ENDPOINT}/${userId}`, updatedData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    await api.delete(`${USERS_ENDPOINT}/${userId}`);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Update user status (suspend/activate)
export const updateUserStatus = async (userId, status) => {
  try {
    await api.patch(`${USERS_ENDPOINT}/${userId}/status`, { status });
    return true;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Get users by type
export const getUsersByType = async (userType) => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}/by-type`, { params: { type: userType } });
    return response.data;
  } catch (error) {
    console.error('Error fetching users by type:', error);
    throw error;
  }
};

// Get users by status
export const getUsersByStatus = async (status) => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}/by-status`, { params: { status } });
    return response.data;
  } catch (error) {
    console.error('Error fetching users by status:', error);
    throw error;
  }
};

// Search users
export const searchUsers = async (searchTerm) => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}/search`, { params: { q: searchTerm } });
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Real-time listener for users (not supported with REST API - fallback to polling)
export const subscribeToUsers = (callback) => {
  console.warn('Real-time subscriptions not supported with REST API. Use polling instead.');
  // Return an unsubscribe function for compatibility
  return () => {};
};

// Get user statistics
export const getUserStats = async () => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

import api from './config';

export const authAPI = {
  // Register new student
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Setup 2FA for bursar/admin
  setup2FA: async () => {
    const response = await api.post('/auth/setup-2fa');
    return response.data;
  },

  // Verify and enable 2FA
  verify2FA: async (token) => {
    const response = await api.post('/auth/verify-2fa', { token });
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  }
};

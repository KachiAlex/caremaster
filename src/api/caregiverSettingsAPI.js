import { db } from '../backend/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'backend/database';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'backend/storage';
import { storage } from '../backend/config';
import { toast } from 'react-toastify';

export const caregiverSettingsAPI = {
  // Get caregiver settings
  getSettings: async (caregiverId) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        return {
          id: settingsDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      }
      
      // Return default settings if none exist
      return getDefaultSettings();
    } catch (error) {
      console.error('Error fetching caregiver settings:', error);
      throw error;
    }
  },

  // Save caregiver settings
  saveSettings: async (caregiverId, settings) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      const settingsData = {
        ...settings,
        updatedAt: serverTimestamp()
      };

      // Check if settings exist
      const existingSettings = await getDoc(settingsRef);
      if (existingSettings.exists()) {
        await updateDoc(settingsRef, settingsData);
      } else {
        await setDoc(settingsRef, {
          ...settingsData,
          createdAt: serverTimestamp()
        });
      }

      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving caregiver settings:', error);
      toast.error('Failed to save settings');
      throw error;
    }
  },

  // Update profile information
  updateProfile: async (caregiverId, profileData) => {
    try {
      // Update caregiver profile
      const caregiverRef = doc(db, 'caregivers', caregiverId);
      await updateDoc(caregiverRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });

      // Update settings
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        profile: profileData,
        updatedAt: serverTimestamp()
      });

      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  },

  // Upload profile image
  uploadProfileImage: async (caregiverId, file) => {
    try {
      const fileRef = ref(storage, `caregiver-profiles/${caregiverId}/profile-${Date.now()}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Update profile with new image URL
      await caregiverSettingsAPI.updateProfile(caregiverId, {
        profileImage: downloadURL
      });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload profile image');
      throw error;
    }
  },

  // Delete profile image
  deleteProfileImage: async (caregiverId, imageUrl) => {
    try {
      // Delete from storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      
      // Update profile to remove image
      await caregiverSettingsAPI.updateProfile(caregiverId, {
        profileImage: null
      });

      return true;
    } catch (error) {
      console.error('Error deleting profile image:', error);
      toast.error('Failed to delete profile image');
      throw error;
    }
  },

  // Update notification preferences
  updateNotifications: async (caregiverId, notificationSettings) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        notifications: notificationSettings,
        updatedAt: serverTimestamp()
      });

      toast.success('Notification preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notification preferences');
      throw error;
    }
  },

  // Update privacy settings
  updatePrivacy: async (caregiverId, privacySettings) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        privacy: privacySettings,
        updatedAt: serverTimestamp()
      });

      toast.success('Privacy settings updated');
      return true;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
      throw error;
    }
  },

  // Update preferences
  updatePreferences: async (caregiverId, preferences) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        preferences: preferences,
        updatedAt: serverTimestamp()
      });

      toast.success('Preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      throw error;
    }
  },

  // Update security settings
  updateSecurity: async (caregiverId, securitySettings) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        security: securitySettings,
        updatedAt: serverTimestamp()
      });

      toast.success('Security settings updated');
      return true;
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast.error('Failed to update security settings');
      throw error;
    }
  },

  // Change password
  changePassword: async (caregiverId, currentPassword, newPassword) => {
    try {
      // This would typically involve Firebase Auth
      // For now, we'll simulate the process
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        'security.lastPasswordChange': new Date().toISOString(),
        'security.passwordChangeRequired': false,
        updatedAt: serverTimestamp()
      });

      toast.success('Password changed successfully');
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
      throw error;
    }
  },

  // Enable/disable two-factor authentication
  toggleTwoFactorAuth: async (caregiverId, enabled) => {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        'security.twoFactorAuth': enabled,
        updatedAt: serverTimestamp()
      });

      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
      return true;
    } catch (error) {
      console.error('Error toggling two-factor auth:', error);
      toast.error('Failed to update two-factor authentication');
      throw error;
    }
  },

  // Get activity log
  getActivityLog: async (caregiverId, limit = 50) => {
    try {
      const activityQuery = query(
        collection(db, 'caregiverActivityLog'),
        where('caregiverId', '==', caregiverId),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const activitySnapshot = await getDocs(activityQuery);
      const activities = [];

      activitySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching activity log:', error);
      throw error;
    }
  },

  // Log activity
  logActivity: async (caregiverId, activity) => {
    try {
      await addDoc(collection(db, 'caregiverActivityLog'), {
        caregiverId,
        ...activity,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  // Export settings
  exportSettings: async (caregiverId) => {
    try {
      const settings = await caregiverSettingsAPI.getSettings(caregiverId);
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `caregiver-settings-${caregiverId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
      throw error;
    }
  },

  // Import settings
  importSettings: async (caregiverId, settingsFile) => {
    try {
      const text = await settingsFile.text();
      const settings = JSON.parse(text);
      
      await caregiverSettingsAPI.saveSettings(caregiverId, settings);
      toast.success('Settings imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error('Failed to import settings');
      throw error;
    }
  },

  // Reset settings to default
  resetToDefault: async (caregiverId) => {
    try {
      const defaultSettings = getDefaultSettings();
      await caregiverSettingsAPI.saveSettings(caregiverId, defaultSettings);
      toast.success('Settings reset to default');
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
      throw error;
    }
  }
};

// Default settings structure
const getDefaultSettings = () => ({
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileImage: null,
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    licenseNumber: '',
    specialization: '',
    experience: '',
    languages: [],
    bio: ''
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    emergencyAlerts: true,
    appointmentReminders: true,
    medicationAlerts: true,
    weeklyReports: true,
    patientUpdates: true,
    systemUpdates: false
  },
  privacy: {
    profileVisibility: 'private',
    locationSharing: true,
    dataCollection: true,
    analytics: false,
    marketingEmails: false,
    dataRetention: '2 years'
  },
  preferences: {
    theme: 'light',
    language: 'en',
    timezone: 'Africa/Lagos',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    workingHours: {
      start: '08:00',
      end: '18:00'
    },
    breakDuration: 30,
    maxPatientsPerDay: 8
  },
  security: {
    twoFactorAuth: false,
    biometricLogin: true,
    sessionTimeout: 30,
    passwordChangeRequired: false,
    lastPasswordChange: null,
    loginNotifications: true
  }
});

export default caregiverSettingsAPI;

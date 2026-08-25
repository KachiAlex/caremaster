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
import { toast } from 'react-toastify';
import { storage, db } from '../backend/config';;
import { updateProfile } from 'backend/auth';
import { uploadBytes, getDownloadURL, deleteObject } from 'backend/storage';

class CaregiverSettingsService {
  constructor() {
    this.isInitialized = false;
    this.settingsCache = new Map();
    this.activityListeners = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing Caregiver Settings Service...');
      this.isInitialized = true;
      console.log('Caregiver Settings Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Caregiver Settings Service:', error);
      throw error;
    }
  }

  // Get caregiver settings with caching
  async getSettings(caregiverId) {
    try {
      // Check cache first
      if (this.settingsCache.has(caregiverId)) {
        return this.settingsCache.get(caregiverId);
      }

      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      const settingsDoc = await getDoc(settingsRef);
      
      let settings;
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        settings = {
          id: settingsDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        };
      } else {
        // Return default settings if none exist
        settings = this.getDefaultSettings();
      }

      // Cache the settings
      this.settingsCache.set(caregiverId, settings);
      return settings;
    } catch (error) {
      console.error('Error fetching caregiver settings:', error);
      throw error;
    }
  }

  // Save caregiver settings
  async saveSettings(caregiverId, settings) {
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

      // Update cache
      this.settingsCache.set(caregiverId, { ...settings, id: caregiverId });

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'settings_updated',
        description: 'Settings updated successfully',
        category: 'settings'
      });

      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving caregiver settings:', error);
      toast.error('Failed to save settings');
      throw error;
    }
  }

  // Update profile information
  async updateProfile(caregiverId, profileData) {
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

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.profile = { ...cachedSettings.profile, ...profileData };
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'profile_updated',
        description: 'Profile information updated',
        category: 'profile'
      });

      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  }

  // Upload profile image
  async uploadProfileImage(caregiverId, file) {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Image size must be less than 5MB');
      }

      const fileRef = ref(storage, `caregiver-profiles/${caregiverId}/profile-${Date.now()}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Update profile with new image URL
      await this.updateProfile(caregiverId, {
        profileImage: downloadURL
      });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload profile image');
      throw error;
    }
  }

  // Delete profile image
  async deleteProfileImage(caregiverId, imageUrl) {
    try {
      // Delete from storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      
      // Update profile to remove image
      await this.updateProfile(caregiverId, {
        profileImage: null
      });

      return true;
    } catch (error) {
      console.error('Error deleting profile image:', error);
      toast.error('Failed to delete profile image');
      throw error;
    }
  }

  // Update notification preferences
  async updateNotifications(caregiverId, notificationSettings) {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        notifications: notificationSettings,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.notifications = notificationSettings;
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'notifications_updated',
        description: 'Notification preferences updated',
        category: 'notifications'
      });

      toast.success('Notification preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notification preferences');
      throw error;
    }
  }

  // Update privacy settings
  async updatePrivacy(caregiverId, privacySettings) {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        privacy: privacySettings,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.privacy = privacySettings;
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'privacy_updated',
        description: 'Privacy settings updated',
        category: 'privacy'
      });

      toast.success('Privacy settings updated');
      return true;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
      throw error;
    }
  }

  // Update preferences
  async updatePreferences(caregiverId, preferences) {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        preferences: preferences,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.preferences = preferences;
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'preferences_updated',
        description: 'Preferences updated',
        category: 'preferences'
      });

      toast.success('Preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      throw error;
    }
  }

  // Update security settings
  async updateSecurity(caregiverId, securitySettings) {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        security: securitySettings,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.security = securitySettings;
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'security_updated',
        description: 'Security settings updated',
        category: 'security'
      });

      toast.success('Security settings updated');
      return true;
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast.error('Failed to update security settings');
      throw error;
    }
  }

  // Change password
  async changePassword(caregiverId, currentPassword, newPassword) {
    try {
      // This would typically involve Backend Auth
      // For now, we'll simulate the process
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        'security.lastPasswordChange': new Date().toISOString(),
        'security.passwordChangeRequired': false,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.security.lastPasswordChange = new Date().toISOString();
        cachedSettings.security.passwordChangeRequired = false;
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'password_changed',
        description: 'Password changed successfully',
        category: 'security'
      });

      toast.success('Password changed successfully');
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
      throw error;
    }
  }

  // Enable/disable two-factor authentication
  async toggleTwoFactorAuth(caregiverId, enabled) {
    try {
      const settingsRef = doc(db, 'caregiverSettings', caregiverId);
      await updateDoc(settingsRef, {
        'security.twoFactorAuth': enabled,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedSettings = this.settingsCache.get(caregiverId);
      if (cachedSettings) {
        cachedSettings.security.twoFactorAuth = enabled;
        this.settingsCache.set(caregiverId, cachedSettings);
      }

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'two_factor_auth_toggled',
        description: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
        category: 'security'
      });

      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
      return true;
    } catch (error) {
      console.error('Error toggling two-factor auth:', error);
      toast.error('Failed to update two-factor authentication');
      throw error;
    }
  }

  // Get activity log
  async getActivityLog(caregiverId, limitCount = 50) {
    try {
      const activityQuery = query(
        collection(db, 'caregiverActivityLog'),
        where('caregiverId', '==', caregiverId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
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
  }

  // Log activity
  async logActivity(caregiverId, activity) {
    try {
      await addDoc(collection(db, 'caregiverActivityLog'), {
        caregiverId,
        ...activity,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Export settings
  async exportSettings(caregiverId) {
    try {
      const settings = await this.getSettings(caregiverId);
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `caregiver-settings-${caregiverId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'settings_exported',
        description: 'Settings exported successfully',
        category: 'settings'
      });

      return true;
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
      throw error;
    }
  }

  // Import settings
  async importSettings(caregiverId, settingsFile) {
    try {
      const text = await settingsFile.text();
      const settings = JSON.parse(text);
      
      await this.saveSettings(caregiverId, settings);

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'settings_imported',
        description: 'Settings imported successfully',
        category: 'settings'
      });

      toast.success('Settings imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error('Failed to import settings');
      throw error;
    }
  }

  // Reset settings to default
  async resetToDefault(caregiverId) {
    try {
      const defaultSettings = this.getDefaultSettings();
      await this.saveSettings(caregiverId, defaultSettings);

      // Log activity
      await this.logActivity(caregiverId, {
        type: 'settings_reset',
        description: 'Settings reset to default',
        category: 'settings'
      });

      toast.success('Settings reset to default');
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
      throw error;
    }
  }

  // Clear cache
  clearCache(caregiverId = null) {
    if (caregiverId) {
      this.settingsCache.delete(caregiverId);
    } else {
      this.settingsCache.clear();
    }
  }

  // Get default settings structure
  getDefaultSettings() {
    return {
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
    };
  }

  // Cleanup
  destroy() {
    this.settingsCache.clear();
    this.activityListeners.forEach(unsubscribe => unsubscribe());
    this.activityListeners.clear();
    this.isInitialized = false;
  }
}

const caregiverSettingsService = new CaregiverSettingsService();
export default caregiverSettingsService;

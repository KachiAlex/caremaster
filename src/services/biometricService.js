import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

class BiometricService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async isAvailable() {
    if (!this.isNative) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (err) {
      console.warn('Biometric not available:', err);
      return false;
    }
  }

  async setCredentials(email, password) {
    if (!this.isNative) return;
    try {
      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: 'com.caremaster1.app',
      });
      await Preferences.set({ key: 'biometric_enabled', value: 'true' });
    } catch (err) {
      console.error('Failed to set biometric credentials:', err);
    }
  }

  async getCredentials() {
    if (!this.isNative) return null;
    try {
      const isEnabled = await Preferences.get({ key: 'biometric_enabled' });
      if (isEnabled.value !== 'true') return null;

      const credentials = await NativeBiometric.getCredentials({
        server: 'com.caremaster1.app',
      });
      return credentials;
    } catch (err) {
      console.warn('Failed to get biometric credentials:', err);
      return null;
    }
  }

  async clearCredentials() {
    if (!this.isNative) return;
    try {
      await NativeBiometric.deleteCredentials({
        server: 'com.caremaster1.app',
      });
      await Preferences.remove({ key: 'biometric_enabled' });
    } catch (err) {
      console.error('Failed to clear biometric credentials:', err);
    }
  }
}

export const biometricService = new BiometricService();
export default biometricService;

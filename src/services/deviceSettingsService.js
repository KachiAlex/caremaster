/**
 * deviceSettingsService.js
 *
 * Persists the user's preferred audio input (microphone), audio output
 * (speaker), and video input (camera) devices in localStorage so they
 * survive page reloads. The WebRTCService and CallInterface use these
 * preferences when requesting media and attaching remote audio.
 */

const STORAGE_KEY = 'caremaster_call_devices';

/**
 * Load saved device preferences from localStorage.
 * Returns { audioInput, audioOutput, videoInput } — any field may be null.
 */
export function getSavedDevices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { audioInput: null, audioOutput: null, videoInput: null };
    const parsed = JSON.parse(raw);
    return {
      audioInput: parsed.audioInput || null,
      audioOutput: parsed.audioOutput || null,
      videoInput: parsed.videoInput || null,
    };
  } catch (e) {
    return { audioInput: null, audioOutput: null, videoInput: null };
  }
}

/**
 * Save device preferences to localStorage.
 */
export function saveDevices(devices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      audioInput: devices.audioInput || null,
      audioOutput: devices.audioOutput || null,
      videoInput: devices.videoInput || null,
    }));
  } catch (e) {
    console.error('Failed to save device preferences:', e);
  }
}

/**
 * Enumerate available media devices, grouped by kind.
 * Returns { audioInput, audioOutput, videoInput } arrays.
 * Note: labels are only available after the user has granted permission
 * at least once. Until then, labels will be empty strings.
 */
export async function enumerateDevices() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { audioInput: [], audioOutput: [], videoInput: [] };
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInput: devices.filter(d => d.kind === 'audioinput'),
      audioOutput: devices.filter(d => d.kind === 'audiooutput'),
      videoInput: devices.filter(d => d.kind === 'videoinput'),
    };
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return { audioInput: [], audioOutput: [], videoInput: [] };
  }
}

/**
 * Request a minimal permission grant so device labels become available.
 * This calls getUserMedia with audio+video and immediately stops the
 * tracks, which causes the browser to populate device labels.
 *
 * On native Android, the WebView will request CAMERA and RECORD_AUDIO at
 * runtime when getUserMedia is called, provided those permissions are
 * declared in AndroidManifest.xml.
 */
export async function requestDevicePermissions() {
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (error) {
    // If video fails, try audio only (voice-call scenario)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (audioError) {
      // eslint-disable-next-line no-console
      console.error('Device permission request failed:', audioError);

      if (isNative) {
        throw new Error(
          'Microphone and camera access are required for calls. Please enable them in Settings > Apps > CareMaster > Permissions.'
        );
      }

      if (audioError.name === 'NotAllowedError' || audioError.name === 'PermissionDeniedError') {
        throw new Error('Permission denied. Please allow microphone and camera access in your browser settings.');
      }
      if (audioError.name === 'NotFoundError' || audioError.name === 'DevicesNotFoundError') {
        throw new Error('No microphone or camera found. Please connect a device and try again.');
      }
      throw new Error(audioError.message || 'Could not access microphone or camera.');
    }
  }
}

/**
 * Build media constraints from saved device preferences.
 * @param {string} callType - 'voice' or 'video'
 * @returns {object} constraints for getUserMedia
 */
export function buildConstraints(callType = 'video') {
  const saved = getSavedDevices();
  const constraints = {};

  if (callType === 'video') {
    constraints.video = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
    if (saved.videoInput) {
      constraints.video.deviceId = { exact: saved.videoInput };
    }
  } else {
    constraints.video = false;
  }

  constraints.audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (saved.audioInput) {
    constraints.audio.deviceId = { exact: saved.audioInput };
  }

  return constraints;
}

/**
 * Attach a sink ID to an audio/video element for output device selection.
 * Not all browsers support setSinkId (Firefox doesn't).
 * @param {HTMLMediaElement} element
 * @param {string} deviceId
 */
export async function setAudioOutput(element, deviceId) {
  if (!element || !deviceId) return false;
  if (typeof element.setSinkId !== 'function') {
    console.warn('setSinkId is not supported in this browser');
    return false;
  }
  try {
    await element.setSinkId(deviceId);
    return true;
  } catch (error) {
    console.error('Error setting audio output device:', error);
    return false;
  }
}

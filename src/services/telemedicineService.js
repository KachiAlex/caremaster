import AgoraRTC from 'agora-rtc-sdk-ng';
import agoraTokenService from './agoraTokenService';

class TelemedicineService {
  constructor() {
    this.client = null;
    this.localVideoTrack = null;
    this.localAudioTrack = null;
    this.remoteUsers = new Map();
    this.isJoined = false;
    this.isPublished = false;
    this.isInitialized = false;
    this.eventListeners = new Map();
    
    // Agora configuration - removed expired token
    this.config = {
      appId: agoraTokenService.getAppId(),
      channel: process.env.REACT_APP_AGORA_CHANNEL || 'elderx_dev',
      token: null, // Will be generated dynamically
      uid: null, // Will be set when joining
      mode: 'rtc',
      codec: 'vp8'
    };
  }

  // Initialize Agora client
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Validate configuration
      if (!this.config.appId) {
        throw new Error('Agora App ID is required');
      }

      this.client = AgoraRTC.createClient({ 
        mode: this.config.mode, 
        codec: this.config.codec 
      });

      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.triggerEvent('initialized', {});
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Agora client:', error);
      this.triggerEvent('error', { 
        type: 'initialization', 
        error: error.message 
      });
      throw error;
    }
  }

  // Set up event listeners
  setupEventListeners() {
    if (!this.client) return;

    // User joined
    this.client.on("user-published", async (user, mediaType) => {
      console.log("User published:", user, mediaType);
      
      try {
        await this.client.subscribe(user, mediaType);
        
        if (mediaType === "video") {
          this.remoteUsers.set(user.uid, {
            ...user,
            videoTrack: user.videoTrack
          });
        }
        
        if (mediaType === "audio") {
          this.remoteUsers.set(user.uid, {
            ...user,
            audioTrack: user.audioTrack
          });
        }
        
        // Play remote tracks
        if (mediaType === "video") {
          const remoteVideoContainer = document.getElementById(`remote-video-${user.uid}`);
          if (remoteVideoContainer) {
            user.videoTrack.play(remoteVideoContainer);
          }
        }
        
        if (mediaType === "audio") {
          user.audioTrack.play();
        }
        
        // Trigger custom event for UI updates
        this.triggerEvent('user-published', { user, mediaType });
      } catch (error) {
        console.error("Failed to subscribe user:", error);
      }
    });

    // User left
    this.client.on("user-unpublished", (user, mediaType) => {
      console.log("User unpublished:", user, mediaType);
      
      if (mediaType === "video") {
        this.remoteUsers.delete(user.uid);
      }
      
      this.triggerEvent('user-unpublished', { user, mediaType });
    });

    // User left channel
    this.client.on("user-left", (user) => {
      console.log("User left:", user);
      this.remoteUsers.delete(user.uid);
      this.triggerEvent('user-left', { user });
    });

    // Connection state changed
    this.client.on("connection-state-change", (curState, revState) => {
      console.log("Connection state changed:", curState, revState);
      this.triggerEvent('connection-state-change', { curState, revState });
    });
  }

  // Join channel
  async joinChannel(uid = null, channelName = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isJoined) {
        console.warn('Already joined a channel');
        return this.config.uid;
      }

      // Use provided channel name or default
      const channel = channelName || this.config.channel;
      
      // Generate UID if not provided
      const finalUid = uid || Math.floor(Math.random() * 100000);
      this.config.uid = finalUid;

      // Validate channel name
      if (!channel || channel.trim() === '') {
        throw new Error('Channel name is required');
      }

      // Generate fresh token for this session
      console.log('🔑 Generating Agora token for channel:', channel);
      const token = await agoraTokenService.generateToken(channel, finalUid, 'publisher');
      
      // Join the channel with fresh token
      await this.client.join(
        this.config.appId,
        channel,
        token,
        finalUid
      );

      this.isJoined = true;
      console.log("Successfully joined channel:", channel);

      // Create and publish local tracks
      await this.createLocalTracks();
      await this.publishLocalTracks();

      this.triggerEvent('joined', { uid: finalUid, channel });
      return finalUid;
    } catch (error) {
      console.error("Failed to join channel:", error);
      
      // Check if this is a token-related error and try to recover
      if (agoraTokenService.isTokenExpired(error)) {
        console.log('🔄 Token expired, attempting to refresh and retry...');
        try {
          // Try once more with a fresh token
          const channel = channelName || this.config.channel;
          const finalUid = uid || Math.floor(Math.random() * 100000);
          const newToken = await agoraTokenService.refreshToken(channel, finalUid, 'publisher');
          
          await this.client.join(
            this.config.appId,
            channel,
            newToken,
            finalUid
          );
          
          this.isJoined = true;
          this.config.uid = finalUid;
          console.log("✅ Successfully joined channel after token refresh:", channel);
          
          // Create and publish local tracks
          await this.createLocalTracks();
          await this.publishLocalTracks();
          
          this.triggerEvent('joined', { uid: finalUid, channel });
          return finalUid;
        } catch (retryError) {
          console.error("Failed to join even after token refresh:", retryError);
        }
      }
      
      this.triggerEvent('error', { 
        type: 'join', 
        error: error.message,
        isTokenError: agoraTokenService.isTokenExpired(error)
      });
      throw error;
    }
  }

  // Create local video and audio tracks
  async createLocalTracks() {
    try {
      // Check for media permissions first
      const hasCamera = await this.checkCameraPermission();
      const hasMicrophone = await this.checkMicrophonePermission();

      if (!hasCamera && !hasMicrophone) {
        throw new Error('Camera and microphone access are required for video calls');
      }

      // Create video track if camera is available
      if (hasCamera) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "720p_1"
        });
      }

      // Create audio track if microphone is available
      if (hasMicrophone) {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }

      // Play local video if available
      if (this.localVideoTrack) {
        const localVideoContainer = document.getElementById('local-video');
        if (localVideoContainer) {
          this.localVideoTrack.play(localVideoContainer);
        }
      }

      console.log("Local tracks created successfully");
      this.triggerEvent('tracks-created', {
        hasVideo: !!this.localVideoTrack,
        hasAudio: !!this.localAudioTrack
      });
    } catch (error) {
      console.error("Failed to create local tracks:", error);
      this.triggerEvent('error', { 
        type: 'track-creation', 
        error: error.message 
      });
      throw error;
    }
  }

  // Check camera permission
  async checkCameraPermission() {
    try {
      const devices = await AgoraRTC.getCameras();
      return devices.length > 0;
    } catch (error) {
      console.warn('Camera permission check failed:', error);
      return false;
    }
  }

  // Check microphone permission
  async checkMicrophonePermission() {
    try {
      const devices = await AgoraRTC.getMicrophones();
      return devices.length > 0;
    } catch (error) {
      console.warn('Microphone permission check failed:', error);
      return false;
    }
  }

  // Publish local tracks
  async publishLocalTracks() {
    try {
      if (!this.client) {
        throw new Error("Client not initialized");
      }

      const tracksToPublish = [];
      
      if (this.localVideoTrack) {
        tracksToPublish.push(this.localVideoTrack);
      }
      
      if (this.localAudioTrack) {
        tracksToPublish.push(this.localAudioTrack);
      }

      if (tracksToPublish.length === 0) {
        throw new Error("No tracks available to publish");
      }

      await this.client.publish(tracksToPublish);
      this.isPublished = true;
      console.log("Local tracks published successfully");
      
      this.triggerEvent('published', {
        videoPublished: !!this.localVideoTrack,
        audioPublished: !!this.localAudioTrack
      });
    } catch (error) {
      console.error("Failed to publish local tracks:", error);
      this.triggerEvent('error', { 
        type: 'publish', 
        error: error.message 
      });
      throw error;
    }
  }

  // Leave channel
  async leaveChannel() {
    try {
      if (this.client && this.isJoined) {
        // Unpublish tracks
        if (this.isPublished) {
          await this.client.unpublish([this.localVideoTrack, this.localAudioTrack]);
        }

        // Leave channel
        await this.client.leave();
        this.isJoined = false;
        this.isPublished = false;
      }

      // Stop and destroy local tracks
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      // Clear remote users
      this.remoteUsers.clear();

      console.log("Successfully left channel");
      this.triggerEvent('left', {});
    } catch (error) {
      console.error("Failed to leave channel:", error);
      throw error;
    }
  }

  // Toggle local video
  async toggleVideo() {
    try {
      if (this.localVideoTrack) {
        await this.localVideoTrack.setEnabled(!this.localVideoTrack.enabled);
        this.triggerEvent('video-toggled', { enabled: this.localVideoTrack.enabled });
        return this.localVideoTrack.enabled;
      }
    } catch (error) {
      console.error("Failed to toggle video:", error);
      throw error;
    }
  }

  // Toggle local audio
  async toggleAudio() {
    try {
      if (this.localAudioTrack) {
        await this.localAudioTrack.setEnabled(!this.localAudioTrack.enabled);
        this.triggerEvent('audio-toggled', { enabled: this.localAudioTrack.enabled });
        return this.localAudioTrack.enabled;
      }
    } catch (error) {
      console.error("Failed to toggle audio:", error);
      throw error;
    }
  }

  // Get connection state
  getConnectionState() {
    return this.client ? this.client.connectionState : 'DISCONNECTED';
  }

  // Get remote users
  getRemoteUsers() {
    return Array.from(this.remoteUsers.values());
  }

  // Check if video is enabled
  isVideoEnabled() {
    return this.localVideoTrack ? this.localVideoTrack.enabled : false;
  }

  // Check if audio is enabled
  isAudioEnabled() {
    return this.localAudioTrack ? this.localAudioTrack.enabled : false;
  }

  // Get available devices
  async getAvailableDevices() {
    try {
      const [cameras, microphones] = await Promise.all([
        AgoraRTC.getCameras(),
        AgoraRTC.getMicrophones()
      ]);

      return {
        cameras: cameras.map(camera => ({
          deviceId: camera.deviceId,
          label: camera.label || 'Camera'
        })),
        microphones: microphones.map(mic => ({
          deviceId: mic.deviceId,
          label: mic.label || 'Microphone'
        }))
      };
    } catch (error) {
      console.error('Failed to get devices:', error);
      return { cameras: [], microphones: [] };
    }
  }

  // Switch camera device
  async switchCamera(deviceId) {
    try {
      if (!this.localVideoTrack) {
        throw new Error('No video track available');
      }

      await this.localVideoTrack.setDevice(deviceId);
      this.triggerEvent('camera-switched', { deviceId });
    } catch (error) {
      console.error('Failed to switch camera:', error);
      this.triggerEvent('error', { 
        type: 'camera-switch', 
        error: error.message 
      });
      throw error;
    }
  }

  // Switch microphone device
  async switchMicrophone(deviceId) {
    try {
      if (!this.localAudioTrack) {
        throw new Error('No audio track available');
      }

      await this.localAudioTrack.setDevice(deviceId);
      this.triggerEvent('microphone-switched', { deviceId });
    } catch (error) {
      console.error('Failed to switch microphone:', error);
      this.triggerEvent('error', { 
        type: 'microphone-switch', 
        error: error.message 
      });
      throw error;
    }
  }

  // Start recording
  async startRecording() {
    try {
      if (!this.client || !this.isJoined) {
        throw new Error('Must be in a call to start recording');
      }

      // Note: Recording functionality requires Agora Cloud Recording
      // This is a placeholder for the recording implementation
      // In a real implementation, you would:
      // 1. Call your backend to start cloud recording
      // 2. Pass the channel name and UID
      // 3. Handle recording status updates
      
      this.triggerEvent('recording-started', {});
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.triggerEvent('error', { 
        type: 'recording-start', 
        error: error.message 
      });
      throw error;
    }
  }

  // Stop recording
  async stopRecording() {
    try {
      // Note: This would call your backend to stop cloud recording
      this.triggerEvent('recording-stopped', {});
      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.triggerEvent('error', { 
        type: 'recording-stop', 
        error: error.message 
      });
      throw error;
    }
  }

  // Get recording status
  getRecordingStatus() {
    // This would typically come from your backend
    return {
      isRecording: false,
      recordingId: null,
      startTime: null
    };
  }

  // Custom event system
  triggerEvent(eventName, data) {
    const event = new CustomEvent(`agora-${eventName}`, { detail: data });
    window.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    this.leaveChannel();
    this.client = null;
  }
}

// Create singleton instance
const telemedicineService = new TelemedicineService();

export default telemedicineService;

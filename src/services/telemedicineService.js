import AgoraRTC from 'agora-rtc-sdk-ng';

class TelemedicineService {
  constructor() {
    this.client = null;
    this.localVideoTrack = null;
    this.localAudioTrack = null;
    this.remoteUsers = new Map();
    this.isJoined = false;
    this.isPublished = false;
    
    // Agora configuration
    this.config = {
      appId: process.env.REACT_APP_AGORA_APP_ID || '43c43dc3e6a44a99b2b75a4997e3b1a4',
      channel: process.env.REACT_APP_AGORA_CHANNEL || 'elderx_dev',
      token: process.env.REACT_APP_AGORA_TOKEN || '007eJxTYAj736zimGlilN56YtmltxEzVy/6tjyKYx73BPWFcnNFEswVGEyMk02MU5KNU80STUwSLS2TjJLMTRNNLC3NU42TDBNNeP4ezmgIZGRIe8LJwAiFID4XQ2pOSmpRRXxKahkDAwDgxiEn',
      uid: null // Will be set when joining
    };
  }

  // Initialize Agora client
  async initialize() {
    try {
      this.client = AgoraRTC.createClient({ 
        mode: "rtc", 
        codec: "vp8" 
      });

      // Set up event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Agora client:', error);
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
  async joinChannel(uid = null) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      // Generate UID if not provided
      const finalUid = uid || Math.floor(Math.random() * 100000);
      this.config.uid = finalUid;

      // Join the channel
      await this.client.join(
        this.config.appId,
        this.config.channel,
        this.config.token,
        finalUid
      );

      this.isJoined = true;
      console.log("Successfully joined channel:", this.config.channel);

      // Create and publish local tracks
      await this.createLocalTracks();
      await this.publishLocalTracks();

      this.triggerEvent('joined', { uid: finalUid });
      return finalUid;
    } catch (error) {
      console.error("Failed to join channel:", error);
      throw error;
    }
  }

  // Create local video and audio tracks
  async createLocalTracks() {
    try {
      // Create video track
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: "720p_1"
      });

      // Create audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();

      // Play local video
      const localVideoContainer = document.getElementById('local-video');
      if (localVideoContainer) {
        this.localVideoTrack.play(localVideoContainer);
      }

      console.log("Local tracks created successfully");
    } catch (error) {
      console.error("Failed to create local tracks:", error);
      throw error;
    }
  }

  // Publish local tracks
  async publishLocalTracks() {
    try {
      if (!this.client || !this.localVideoTrack || !this.localAudioTrack) {
        throw new Error("Client or tracks not initialized");
      }

      await this.client.publish([this.localVideoTrack, this.localAudioTrack]);
      this.isPublished = true;
      console.log("Local tracks published successfully");
      
      this.triggerEvent('published', {});
    } catch (error) {
      console.error("Failed to publish local tracks:", error);
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

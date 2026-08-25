import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'backend/database';
import { db, auth } from '../backend/config';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.peerConnection = null;
    this.callId = null;
    this.isInitiator = false;
    this.isScreenSharing = false;
    this.statsInterval = null;
    this.networkStats = {
      bandwidth: 0,
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      quality: 'good'
    };
    this.callbacks = {
      onLocalStream: null,
      onRemoteStream: null,
      onCallEnded: null,
      onCallStateChange: null,
      onStatsUpdate: null,
      onScreenShare: null
    };
    
    this.configuration = {
      iceServers: [
        // STUN servers for NAT discovery
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Public TURN servers (for production, use your own TURN servers)
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
  }

  // Initialize the WebRTC service
  async initialize() {
    try {
      await this.setupPeerConnection();
      return true;
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      return false;
    }
  }

  // Setup peer connection
  async setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage('ice-candidate', {
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream');
      this.remoteStream = event.streams[0];
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(event.streams[0]);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.callbacks.onCallStateChange) {
        this.callbacks.onCallStateChange(this.peerConnection.connectionState);
      }
      
      // Start monitoring stats when connected
      if (this.peerConnection.connectionState === 'connected') {
        this.startStatsMonitoring();
      } else if (this.peerConnection.connectionState === 'disconnected' || 
                 this.peerConnection.connectionState === 'failed') {
        this.stopStatsMonitoring();
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
      if (this.peerConnection.iceConnectionState === 'failed' ||
          this.peerConnection.iceConnectionState === 'disconnected' ||
          this.peerConnection.iceConnectionState === 'closed') {
        this.endCall();
      }
    };
  }

  // Get user media (camera and microphone)
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Start a call
  async startCall(callId, recipientId, callType = 'video') {
    try {
      this.callId = callId;
      this.isInitiator = true;

      // Create call document in Firebase
      const callDoc = await addDoc(collection(db, 'calls'), {
        callId,
        callerId: this.getCurrentUserId(),
        recipientId,
        callType,
        status: 'initiating',
        createdAt: serverTimestamp(),
        endedAt: null
      });

      // Get user media
      const mediaConstraints = callType === 'video' 
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      await this.getUserMedia(mediaConstraints);

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to recipient
      await this.sendSignalingMessage('offer', {
        offer: offer,
        callType: callType
      });

      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  // Answer a call
  async answerCall(callId, callType = 'video') {
    try {
      this.callId = callId;
      this.isInitiator = false;

      // Get user media
      const mediaConstraints = callType === 'video' 
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      await this.getUserMedia(mediaConstraints);

      return true;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  // Handle incoming offer
  async handleOffer(offer, callType) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer back
      await this.sendSignalingMessage('answer', {
        answer: answer
      });

      return true;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  // Handle incoming answer
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
      return true;
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      // Skip null candidates or end-of-candidates signals
      if (!candidate || !candidate.candidate) {
        console.log('⏭️ Skipping null/end-of-candidates signal');
        return true;
      }
      
      // If candidate is already an RTCIceCandidate object, use it directly
      // If it's a plain object from Firestore, create RTCIceCandidate from it
      let iceCandidate = candidate;
      
      if (candidate && !(candidate instanceof RTCIceCandidate)) {
        // Reconstruct RTCIceCandidateInit from serialized data
        iceCandidate = new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
          usernameFragment: candidate.usernameFragment
        });
      }
      
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log('✅ ICE candidate added successfully');
      return true;
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      // Don't throw - some ICE candidates may fail, but connection can still work
      return false;
    }
  }

  // Send signaling message
  async sendSignalingMessage(type, data) {
    if (!this.callId) {
      throw new Error('No active call');
    }

    try {
      // Serialize RTCIceCandidate if present
      let serializedData = data;
      if (type === 'ice-candidate' && data.candidate) {
        serializedData = {
          candidate: data.candidate.candidate,
          sdpMLineIndex: data.candidate.sdpMLineIndex,
          sdpMid: data.candidate.sdpMid,
          usernameFragment: data.candidate.usernameFragment
        };
      }
      
      await addDoc(collection(db, 'signaling'), {
        callId: this.callId,
        type: type,
        data: serializedData,
        from: this.getCurrentUserId(),
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending signaling message:', error);
      throw error;
    }
  }

  // Listen for signaling messages
  listenForSignaling(callId, onMessage) {
    const signalingQuery = query(
      collection(db, 'signaling'),
      where('callId', '==', callId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(signalingQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = change.doc.data();
          if (message.from !== this.getCurrentUserId()) {
            onMessage(message);
          }
        }
      });
    });
  }

  // Mute/unmute audio
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Enable/disable video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Switch camera (front/back)
  async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        const facingMode = settings.facingMode === 'user' ? 'environment' : 'user';
        
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: true
          });
          
          const newVideoTrack = newStream.getVideoTracks()[0];
          const sender = this.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
          
          // Replace the video track in local stream
          this.localStream.removeTrack(videoTrack);
          this.localStream.addTrack(newVideoTrack);
          
          videoTrack.stop();
          
          if (this.callbacks.onLocalStream) {
            this.callbacks.onLocalStream(this.localStream);
          }
          
          return true;
        } catch (error) {
          console.error('Error switching camera:', error);
          return false;
        }
      }
    }
    return false;
  }

  // End the call
  async endCall() {
    try {
      // Stop stats monitoring
      this.stopStatsMonitoring();

      // Stop all tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Update call status in Firebase
      if (this.callId) {
        const callsQuery = query(
          collection(db, 'calls'),
          where('callId', '==', this.callId)
        );
        
        // This would need to be handled differently in a real implementation
        // For now, we'll just log it
        console.log('Call ended:', this.callId);
      }

      // Reset state
      this.callId = null;
      this.isInitiator = false;
      this.remoteStream = null;

      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded();
      }

      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  // Get call history
  async getCallHistory(userId, limit = 50) {
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
          const calls = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          resolve(calls);
        }, reject);
        
        // Return unsubscribe function
        setTimeout(() => unsubscribe(), 5000);
      });
    } catch (error) {
      console.error('Error getting call history:', error);
      throw error;
    }
  }

  // Set event callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Start monitoring call statistics
  startStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.peerConnection.getStats();
        this.processStats(stats);
      } catch (error) {
        console.error('Error getting stats:', error);
      }
    }, 1000); // Update every second
  }

  // Stop monitoring call statistics
  stopStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // Process WebRTC statistics
  processStats(stats) {
    let inboundRtp = null;
    let outboundRtp = null;
    let candidatePair = null;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        inboundRtp = report;
      } else if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
        outboundRtp = report;
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        candidatePair = report;
      }
    });

    // Calculate network statistics
    if (inboundRtp) {
      const packetsLost = inboundRtp.packetsLost || 0;
      const packetsReceived = inboundRtp.packetsReceived || 0;
      this.networkStats.packetLoss = packetsReceived > 0 ? (packetsLost / packetsReceived) * 100 : 0;
      this.networkStats.jitter = inboundRtp.jitter || 0;
    }

    if (candidatePair) {
      this.networkStats.rtt = candidatePair.currentRoundTripTime * 1000 || 0; // Convert to ms
      this.networkStats.bandwidth = candidatePair.availableIncomingBitrate || 0;
    }

    // Determine call quality
    this.networkStats.quality = this.calculateCallQuality();

    // Notify callback
    if (this.callbacks.onStatsUpdate) {
      this.callbacks.onStatsUpdate(this.networkStats);
    }
  }

  // Calculate overall call quality
  calculateCallQuality() {
    const { packetLoss, rtt, jitter } = this.networkStats;
    
    // Poor quality conditions
    if (packetLoss > 5 || rtt > 300 || jitter > 50) {
      return 'poor';
    }
    
    // Fair quality conditions
    if (packetLoss > 2 || rtt > 150 || jitter > 30) {
      return 'fair';
    }
    
    // Good quality (default)
    return 'good';
  }

  // Get current network statistics
  getNetworkStats() {
    return this.networkStats;
  }

  // Start screen sharing
  async startScreenShare() {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported');
      }

      // Get screen share stream
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Replace video track with screen share
      const videoTrack = this.screenStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(videoTrack);
      } else {
        this.peerConnection.addTrack(videoTrack, this.screenStream);
      }

      // Handle screen share ended
      videoTrack.addEventListener('ended', () => {
        this.stopScreenShare();
      });

      this.isScreenSharing = true;

      // Notify callback
      if (this.callbacks.onScreenShare) {
        this.callbacks.onScreenShare(true, this.screenStream);
      }

      return true;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  // Stop screen sharing and return to camera
  async stopScreenShare() {
    try {
      if (!this.isScreenSharing) return false;

      // Stop screen share tracks
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }

      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Replace screen share with camera
      const videoTrack = cameraStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      // Update local stream
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
        }
        this.localStream.addTrack(videoTrack);
      }

      this.isScreenSharing = false;

      // Notify callback
      if (this.callbacks.onScreenShare) {
        this.callbacks.onScreenShare(false, this.localStream);
      }

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      return true;
    } catch (error) {
      console.error('Error stopping screen share:', error);
      this.isScreenSharing = false;
      throw error;
    }
  }

  // Check if screen sharing is active
  isScreenSharingActive() {
    return this.isScreenSharing;
  }

  // Get current user ID from Firebase Auth
  getCurrentUserId() {
    return auth.currentUser?.uid || null;
  }

  // Check if browser supports WebRTC
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }

  // Get available media devices
  static async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInput: devices.filter(device => device.kind === 'audioinput'),
        audioOutput: devices.filter(device => device.kind === 'audiooutput'),
        videoInput: devices.filter(device => device.kind === 'videoinput')
      };
    } catch (error) {
      console.error('Error getting media devices:', error);
      return { audioInput: [], audioOutput: [], videoInput: [] };
    }
  }

  // Get user media with device selection
  async getUserMediaWithDevices(constraints = null, selectedDevices = null) {
    try {
      let finalConstraints = constraints || { 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: { echoCancellation: true, noiseSuppression: true } 
      };

      // Apply device selection if provided
      if (selectedDevices) {
        if (selectedDevices.audioInput && finalConstraints.audio) {
          if (typeof finalConstraints.audio === 'boolean') {
            finalConstraints.audio = {};
          }
          finalConstraints.audio.deviceId = { exact: selectedDevices.audioInput };
        }
        if (selectedDevices.videoInput && finalConstraints.video) {
          if (typeof finalConstraints.video === 'boolean') {
            finalConstraints.video = {};
          }
          finalConstraints.video.deviceId = { exact: selectedDevices.videoInput };
        }
      }

      console.log('📹 Getting user media with constraints:', finalConstraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      
      // Try fallback with basic constraints
      try {
        console.log('🔄 Trying fallback with basic constraints...');
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });

        if (this.callbacks.onLocalStream) {
          this.callbacks.onLocalStream(this.localStream);
        }

        return this.localStream;
      } catch (fallbackError) {
        console.error('❌ Fallback failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Switch audio input device during call
  async switchAudioInputDevice(deviceId) {
    try {
      if (!this.localStream) {
        throw new Error('No active stream to switch');
      }

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('No audio track found');
      }

      // Get new stream with selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'audio');

      if (sender) {
        await sender.replaceTrack(newAudioTrack);
      }

      // Stop old track and replace in local stream
      audioTrack.stop();
      this.localStream.removeTrack(audioTrack);
      this.localStream.addTrack(newAudioTrack);

      console.log('✅ Audio input device switched to:', deviceId);
      
      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      return true;
    } catch (error) {
      console.error('❌ Error switching audio device:', error);
      throw error;
    }
  }

  // Switch video input device (camera) during call
  async switchVideoInputDevice(deviceId) {
    try {
      if (!this.localStream) {
        throw new Error('No active stream to switch');
      }

      const videoTrack = this.localStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track found');
      }

      // Get new stream with selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Stop old track and replace in local stream
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);

      console.log('✅ Video input device switched to:', deviceId);
      
      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      return true;
    } catch (error) {
      console.error('❌ Error switching video device:', error);
      throw error;
    }
  }

  // Set audio output device (speaker/headphones)
  async setAudioOutputDevice(audioElement, deviceId) {
    try {
      if (audioElement && audioElement.setSinkId) {
        await audioElement.setSinkId(deviceId);
        console.log('✅ Audio output device set to:', deviceId);
        return true;
      } else {
        console.warn('⚠️ Audio output device selection not supported in browser');
        return false;
      }
    } catch (error) {
      console.error('❌ Error setting audio output device:', error);
      throw error;
    }
  }

  // Get connection stats with better error handling
  async getConnectionStats() {
    try {
      if (!this.peerConnection) {
        return null;
      }

      const stats = await this.peerConnection.getStats();
      const statsResult = {
        video: {
          bytesReceived: 0,
          bytesSent: 0,
          packetsLost: 0,
          frameRate: 0,
          resolution: null
        },
        audio: {
          bytesReceived: 0,
          bytesSent: 0,
          packetsLost: 0,
          audioLevel: 0
        },
        connection: {
          rtt: 0,
          availableBitrate: 0,
          totalBitrate: 0,
          state: this.peerConnection.connectionState
        }
      };

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          statsResult.video.bytesReceived = report.bytesReceived;
          statsResult.video.packetsLost = report.packetsLost;
          statsResult.video.frameRate = report.framesPerSecond;
          statsResult.video.resolution = `${report.frameWidth}x${report.frameHeight}`;
        } else if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
          statsResult.video.bytesSent = report.bytesSent;
          statsResult.video.frameRate = report.framesPerSecond;
        } else if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          statsResult.audio.bytesReceived = report.bytesReceived;
          statsResult.audio.packetsLost = report.packetsLost;
          statsResult.audio.audioLevel = report.audioLevel;
        } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          statsResult.audio.bytesSent = report.bytesSent;
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          statsResult.connection.rtt = Math.round(report.currentRoundTripTime * 1000);
          statsResult.connection.availableBitrate = Math.round(report.availableIncomingBitrate);
          statsResult.connection.totalBitrate = Math.round((report.availableOutgoingBitrate || 0) + (report.availableIncomingBitrate || 0));
        }
      });

      return statsResult;
    } catch (error) {
      console.error('❌ Error getting connection stats:', error);
      return null;
    }
  }
}

export default WebRTCService;

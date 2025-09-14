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
} from 'firebase/firestore';
import { db } from '../firebase/config';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.callId = null;
    this.isInitiator = false;
    this.callbacks = {
      onLocalStream: null,
      onRemoteStream: null,
      onCallEnded: null,
      onCallStateChange: null
    };
    
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
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
      await this.peerConnection.addIceCandidate(candidate);
      return true;
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      throw error;
    }
  }

  // Send signaling message
  async sendSignalingMessage(type, data) {
    if (!this.callId) {
      throw new Error('No active call');
    }

    try {
      await addDoc(collection(db, 'signaling'), {
        callId: this.callId,
        type: type,
        data: data,
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

  // Get current user ID (this should be implemented based on your auth system)
  getCurrentUserId() {
    // This should return the current user's ID from your auth context
    // For now, returning a placeholder
    return 'current-user-id';
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
}

export default WebRTCService;

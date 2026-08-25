/**
 * Call Flow Manager
 * Orchestrates the complete call flow between caller and recipient
 * Handles WebRTC signaling, state management, and call lifecycle
 */

import CallService from './callService';
import WebRTCService from './webrtcService';
import { doc, updateDoc, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';

class CallFlowManager {
  constructor() {
    this.callService = new CallService();
    this.webrtcService = null;
    this.callState = 'idle'; // idle, initiating, ringing, connecting, connected, disconnected, ended
    this.activeCallId = null;
    this.callerId = null;
    this.recipientId = null;
    this.isInitiator = false;
    this.signalingUnsubscribe = null;
    this.callUnsubscribe = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000; // Start with 1 second
    this.localStream = null;
    this.remoteStream = null;
    
    this.callbacks = {
      onStateChange: null,
      onLocalStream: null,
      onRemoteStream: null,
      onError: null,
      onCallEnded: null,
      onConnectionQuality: null
    };
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Change call state and notify
   */
  async changeState(newState, reason = '') {
    console.log(`📞 Call state changed: ${this.callState} → ${newState}${reason ? ' (' + reason + ')' : ''}`);
    this.callState = newState;
    
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState);
    }

    // Update call status in database
    if (this.activeCallId) {
      try {
        await this.callService.updateCallStatus(this.activeCallId, newState);
      } catch (error) {
        console.warn('Could not update call status in DB:', error);
      }
    }
  }

  /**
   * Initiate a call
   */
  async initiateCall(callerId, recipientId, callType = 'video', options = {}) {
    try {
      console.log('🚀 Initiating call:', { callerId, recipientId, callType });
      
      this.callerId = callerId;
      this.recipientId = recipientId;
      this.isInitiator = true;

      await this.changeState('initiating', 'Starting call setup');

      // Create call in CallService
      const callResult = await this.callService.initiateCall(
        callerId,
        recipientId,
        callType
      );

      if (!callResult.success) {
        throw new Error('Failed to create call');
      }

      this.activeCallId = callResult.callId;

      // Initialize WebRTC
      this.webrtcService = new WebRTCService();
      this.webrtcService.callId = this.activeCallId;
      this.webrtcService.isInitiator = true;

      // Set up WebRTC callbacks
      this.setupWebRTCCallbacks();

      // Initialize peer connection
      await this.webrtcService.initialize();

      // Get user media with selected devices
      const constraints = options.selectedDevices 
        ? undefined 
        : (callType === 'video' 
          ? { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }
          : { video: false, audio: { echoCancellation: true, noiseSuppression: true } }
        );

      await this.webrtcService.getUserMediaWithDevices(constraints, options.selectedDevices);
      
      this.localStream = this.webrtcService.localStream;
      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      // Create and send offer
      const offer = await this.webrtcService.peerConnection.createOffer();
      await this.webrtcService.peerConnection.setLocalDescription(offer);

      // Send offer to recipient via signaling
      await this.callService.sendSdpMessage(this.activeCallId, 'offer', offer, callerId);

      // Listen for signaling messages
      this.setupSignalingListener();

      await this.changeState('connecting', 'Waiting for recipient');

      return {
        success: true,
        callId: this.activeCallId,
        localStream: this.localStream
      };
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      await this.changeState('ended', error.message);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(callId, callerId, recipientId, callType = 'video', options = {}) {
    try {
      console.log('📞 Answering call:', { callId, callerId, recipientId, callType });
      
      this.activeCallId = callId;
      this.callerId = callerId;
      this.recipientId = recipientId;
      this.isInitiator = false;

      await this.changeState('connecting', 'Accepting call');

      // Update call status
      await this.callService.answerCall(callId, recipientId);

      // Initialize WebRTC
      this.webrtcService = new WebRTCService();
      this.webrtcService.callId = callId;
      this.webrtcService.isInitiator = false;

      // Set up WebRTC callbacks
      this.setupWebRTCCallbacks();

      // Initialize peer connection
      await this.webrtcService.initialize();

      // Get user media
      const constraints = options.selectedDevices 
        ? undefined 
        : (callType === 'video' 
          ? { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }
          : { video: false, audio: { echoCancellation: true, noiseSuppression: true } }
        );

      await this.webrtcService.getUserMediaWithDevices(constraints, options.selectedDevices);
      
      this.localStream = this.webrtcService.localStream;
      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      // Listen for signaling messages
      this.setupSignalingListener();

      return {
        success: true,
        callId,
        localStream: this.localStream
      };
    } catch (error) {
      console.error('❌ Error answering call:', error);
      await this.changeState('ended', error.message);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Set up WebRTC event callbacks
   */
  setupWebRTCCallbacks() {
    if (!this.webrtcService) return;

    this.webrtcService.setCallbacks({
      onLocalStream: (stream) => {
        console.log('✅ Local stream obtained');
        this.localStream = stream;
        if (this.callbacks.onLocalStream) {
          this.callbacks.onLocalStream(stream);
        }
      },
      onRemoteStream: (stream) => {
        console.log('✅ Remote stream obtained');
        this.remoteStream = stream;
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(stream);
        }
      },
      onCallStateChange: (state) => {
        console.log('📊 WebRTC connection state:', state);
        
        if (state === 'connected') {
          this.reconnectAttempts = 0; // Reset attempts on successful connection
          this.changeState('connected', 'WebRTC connected');
        } else if (state === 'failed' || state === 'disconnected') {
          this.handleConnectionFailure();
        } else if (state === 'closed') {
          this.changeState('ended', 'Connection closed');
        }
      },
      onError: (error) => {
        console.error('❌ WebRTC error:', error);
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
        this.handleConnectionFailure();
      },
      onStatsUpdate: (stats) => {
        if (this.callbacks.onConnectionQuality) {
          this.callbacks.onConnectionQuality(stats);
        }
      }
    });
  }

  /**
   * Set up signaling message listener
   */
  setupSignalingListener() {
    if (!this.activeCallId) return;

    console.log('📡 Setting up signaling listener for call:', this.activeCallId);

    this.signalingUnsubscribe = this.callService.listenForSignaling(
      this.activeCallId,
      async (message) => {
        try {
          if (message.from === this.callerId || message.from === this.recipientId) {
            console.log('📨 Processing signaling message:', message.type);

            switch (message.type) {
              case 'offer':
                await this.handleOffer(message);
                break;
              case 'answer':
                await this.handleAnswer(message);
                break;
              case 'ice-candidate':
                await this.handleIceCandidate(message);
                break;
              default:
                console.warn('Unknown signaling message type:', message.type);
            }
          }
        } catch (error) {
          console.error('❌ Error processing signaling message:', error);
          if (this.callbacks.onError) {
            this.callbacks.onError(error);
          }
        }
      }
    );
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(message) {
    try {
      console.log('📥 Handling offer');
      
      if (!this.webrtcService.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      // Set remote description
      await this.webrtcService.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.sdp)
      );

      // Create answer
      const answer = await this.webrtcService.peerConnection.createAnswer();
      await this.webrtcService.peerConnection.setLocalDescription(answer);

      // Send answer
      await this.callService.sendSdpMessage(
        this.activeCallId,
        'answer',
        answer,
        this.recipientId
      );

      console.log('✅ Offer handled and answer sent');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(message) {
    try {
      console.log('📥 Handling answer');
      
      if (!this.webrtcService.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      // Set remote description
      await this.webrtcService.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.sdp)
      );

      console.log('✅ Answer handled');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(message) {
    try {
      if (!this.webrtcService.peerConnection) {
        return;
      }

      const candidate = new RTCIceCandidate(message.candidate);
      await this.webrtcService.peerConnection.addIceCandidate(candidate);
      
      console.log('✅ ICE candidate added');
    } catch (error) {
      // Some ICE candidates may fail, but connection can still work
      console.warn('⚠️ Error adding ICE candidate:', error.message);
    }
  }

  /**
   * Handle connection failures with reconnection attempts
   */
  async handleConnectionFailure() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);
      
      console.log(`⚠️ Connection failed, attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      await this.changeState('disconnected', `Reconnecting (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.attemptReconnection();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      await this.endCall('Connection failed after multiple attempts');
    }
  }

  /**
   * Attempt to reconnect
   */
  async attemptReconnection() {
    try {
      console.log('🔄 Attempting reconnection...');
      
      // Create new peer connection
      if (this.webrtcService) {
        this.webrtcService.peerConnection.close();
      }

      this.webrtcService = new WebRTCService();
      this.webrtcService.callId = this.activeCallId;
      this.webrtcService.isInitiator = this.isInitiator;
      
      this.setupWebRTCCallbacks();
      await this.webrtcService.initialize();
      
      // Re-add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.webrtcService.peerConnection.addTrack(track, this.localStream);
        });
      }

      if (this.isInitiator) {
        // Create new offer
        const offer = await this.webrtcService.peerConnection.createOffer();
        await this.webrtcService.peerConnection.setLocalDescription(offer);
        await this.callService.sendSdpMessage(this.activeCallId, 'offer', offer, this.callerId);
      }

      await this.changeState('connecting', 'Reconnecting...');
      
      console.log('✅ Reconnection initiated');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.handleConnectionFailure();
    }
  }

  /**
   * End the call
   */
  async endCall(reason = 'Call ended') {
    try {
      console.log('📞 Ending call:', reason);
      
      // Update call in database
      if (this.activeCallId) {
        await this.callService.endCall(this.activeCallId);
      }

      // Clean up WebRTC
      if (this.webrtcService) {
        await this.webrtcService.endCall();
      }

      // Clean up signaling listener
      if (this.signalingUnsubscribe) {
        this.signalingUnsubscribe();
        this.signalingUnsubscribe = null;
      }

      // Clean up signaling messages
      if (this.activeCallId) {
        await this.callService.cleanupSignalingMessages(this.activeCallId);
      }

      // Clean up streams
      this.localStream = null;
      this.remoteStream = null;
      this.webrtcService = null;

      await this.changeState('ended', reason);

      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded(reason);
      }

      // Reset
      this.activeCallId = null;
      this.callerId = null;
      this.recipientId = null;
      this.reconnectAttempts = 0;

      console.log('✅ Call ended');
    } catch (error) {
      console.error('❌ Error ending call:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId, recipientId, reason = 'Call rejected') {
    try {
      console.log('📞 Rejecting call:', callId);
      
      await this.callService.rejectCall(callId, recipientId);
      await this.changeState('ended', reason);

      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded(reason);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current call state
   */
  getCallState() {
    return this.callState;
  }

  /**
   * Get call ID
   */
  getCallId() {
    return this.activeCallId;
  }

  /**
   * Get local stream
   */
  getLocalStream() {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream() {
    return this.remoteStream;
  }

  /**
   * Switch audio input device
   */
  async switchAudioInputDevice(deviceId) {
    if (!this.webrtcService) {
      throw new Error('WebRTC service not initialized');
    }
    return await this.webrtcService.switchAudioInputDevice(deviceId);
  }

  /**
   * Switch video input device
   */
  async switchVideoInputDevice(deviceId) {
    if (!this.webrtcService) {
      throw new Error('WebRTC service not initialized');
    }
    return await this.webrtcService.switchVideoInputDevice(deviceId);
  }

  /**
   * Toggle audio
   */
  toggleAudio() {
    if (!this.webrtcService) {
      return false;
    }
    return this.webrtcService.toggleAudio();
  }

  /**
   * Toggle video
   */
  toggleVideo() {
    if (!this.webrtcService) {
      return false;
    }
    return this.webrtcService.toggleVideo();
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    if (!this.webrtcService) {
      throw new Error('WebRTC service not initialized');
    }
    return await this.webrtcService.startScreenShare();
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare() {
    if (!this.webrtcService) {
      throw new Error('WebRTC service not initialized');
    }
    return await this.webrtcService.stopScreenShare();
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats() {
    if (!this.webrtcService) {
      return null;
    }
    return await this.webrtcService.getConnectionStats();
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('🧹 Destroying CallFlowManager');
    
    if (this.signalingUnsubscribe) {
      this.signalingUnsubscribe();
      this.signalingUnsubscribe = null;
    }

    if (this.webrtcService) {
      this.webrtcService.endCall();
      this.webrtcService = null;
    }

    this.localStream = null;
    this.remoteStream = null;
    this.activeCallId = null;
    this.callState = 'idle';
  }
}

export default CallFlowManager;

import { collection, doc, addDoc, getDocs, onSnapshot, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, limit } from 'backend/database';;
import { auth, db } from '../backend/config';;
import { buildConstraints } from './deviceSettingsService';;

// Session-level ICE configuration cache. TURN credentials are static for
// the session (env-driven on the backend), and a fresh WebRTCService is
// created per call — without a shared cache every call paid a
// /turn-credentials round-trip before setup could even start.
let sharedIceConfigPromise = null;

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
    // ICE candidates that arrived before the remote description was set.
    // With polling-based signaling, candidates routinely beat the offer/
    // answer — they'd be dropped by addIceCandidate without this queue.
    this.pendingIceCandidates = [];
    // Outbound ICE candidates are batched into a single signaling row
    // (debounced) — one POST instead of ~15 on constrained links.
    this.outboundIceQueue = [];
    this.iceFlushTimer = null;
    this.networkStats = {
      bandwidth: 0,
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      quality: 'good'
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectTimer = null;
    this.callbacks = {
      onLocalStream: null,
      onRemoteStream: null,
      onCallEnded: null,
      onCallStateChange: null,
      onStatsUpdate: null,
      onScreenShare: null
    };

    // ICE config is fetched from the backend so TURN credentials are not
    // exposed in the frontend bundle. Until it is loaded, we start with STUN only.
    this.configuration = null;
  }

  // Fetch ICE configuration from the backend (cached once per session —
  // shared across all WebRTCService instances).
  async getIceConfiguration() {
    if (this.configuration) return this.configuration;
    if (!sharedIceConfigPromise) {
      sharedIceConfigPromise = (async () => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
          const baseUrl = process.env.REACT_APP_API_URL || '';
          const res = await fetch(`${baseUrl}/turn-credentials`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            return data;
          }
        } catch (error) {
          console.error('Failed to fetch TURN credentials, falling back to STUN only:', error);
        }
        return {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        };
      })();
    }

    this.configuration = await sharedIceConfigPromise;
    return this.configuration;
  }

  // Warm the shared ICE config (e.g. on app mount) so the first call doesn't
  // pay the credentials round-trip on the call critical path.
  static preloadIceConfiguration() {
    const svc = new WebRTCService();
    return svc.getIceConfiguration();
  }

  // Initialize the WebRTC service
  async initialize() {
    try {
      // Close any existing peer connection from a previous call
      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch (e) { /* ignore */ }
        this.peerConnection = null;
      }
      // Reset state from any previous call
      this.callId = null;
      this.isInitiator = false;
      this.remoteStream = null;
      this.localStream = null;
      this.pendingIceCandidates = [];
      this.outboundIceQueue = [];
      if (this.iceFlushTimer) {
        clearTimeout(this.iceFlushTimer);
        this.iceFlushTimer = null;
      }

      await this.setupPeerConnection();
      return true;
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      return false;
    }
  }

  // Setup peer connection
  async setupPeerConnection() {
    const config = await this.getIceConfiguration();
    this.peerConnection = new RTCPeerConnection(config);

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
      // Only end call on 'failed' — 'disconnected' can fire temporarily
      // during ICE restarts or brief network changes and shouldn't
      // immediately terminate the call.
      if (this.peerConnection.iceConnectionState === 'failed') {
        this.endCall();
      } else if (this.peerConnection.iceConnectionState === 'disconnected') {
        // Attempt ICE restart for temporary network drops
        this.attemptIceRestart();
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
      this.applyBandwidthCaps();

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

      // Create call document — but only if it doesn't exist yet. Most callers
      // already created the row via callService.initiateCall; a second insert
      // leaves a stale 'initiating' row behind. The check runs while media is
      // being acquired (off the serialized path) but is still awaited before
      // the offer POST: the backend requires the calls row to exist before
      // it accepts signaling writes.
      const ensureRecord = (async () => {
        try {
          const existing = await getDocs(query(collection(db, 'calls'), where('callId', '==', callId), limit(1)));
          if (existing.empty) {
            await addDoc(collection(db, 'calls'), {
              callId,
              callerId: this.getCurrentUserId(),
              recipientId,
              callType,
              status: 'initiating',
              createdAt: serverTimestamp(),
              endedAt: null
            });
          }
        } catch (e) {
          console.warn('Call-record existence check failed, continuing:', e.message);
        }
      })();

      // Get user media
      const mediaConstraints = callType === 'video'
        ? { video: true, audio: true }
        : { video: false, audio: true };

      await this.getUserMedia(mediaConstraints);
      await ensureRecord;

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

      // Get user media — use saved device preferences if available
      const mediaConstraints = buildConstraints(callType);

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
      await this.flushPendingIceCandidates();

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
      await this.flushPendingIceCandidates();
      return true;
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Drain candidates queued before the remote description was set
  async flushPendingIceCandidates() {
    if (!this.pendingIceCandidates.length) return;
    const queued = this.pendingIceCandidates;
    this.pendingIceCandidates = [];
    for (const candidate of queued) {
      await this.handleIceCandidate(candidate);
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

      // Queue candidates that arrive before the remote description —
      // with polled signaling this race is common, and addIceCandidate
      // would otherwise throw and lose the candidate.
      if (!this.peerConnection || !this.peerConnection.remoteDescription) {
        this.pendingIceCandidates.push(candidate);
        return true;
      }

      // If candidate is already an RTCIceCandidate object, use it directly
      // If it's a plain object from Database, create RTCIceCandidate from it
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
      // Control-plane messages go out immediately — flush queued ICE
      // candidates first so they aren't stranded behind an answer/reject.
      if (type !== 'ice-candidate') {
        await this.flushOutboundIce();
      }

      const from = this.getCurrentUserId();
      const baseDoc = {
        callId: this.callId,
        type: type,
        from: from,
        timestamp: serverTimestamp()
      };

      if (type === 'ice-candidate' && data.candidate) {
        // Batch ICE candidates into a single signaling row (debounced
        // flush) — one POST instead of ~15 sequential ones on slow links.
        this.outboundIceQueue.push({
          candidate: data.candidate.candidate,
          sdpMLineIndex: data.candidate.sdpMLineIndex,
          sdpMid: data.candidate.sdpMid,
          usernameFragment: data.candidate.usernameFragment
        });
        if (!this.iceFlushTimer) {
          this.iceFlushTimer = setTimeout(() => {
            this.iceFlushTimer = null;
            this.flushOutboundIce();
          }, 250);
        }
        return;
      } else if (type === 'offer' || type === 'answer') {
        // Store SDP in the `sdp` text column (serialize RTCSessionDescription)
        const sdp = data.offer?.sdp || data.answer?.sdp || (typeof data === 'string' ? data : JSON.stringify(data));
        await addDoc(collection(db, 'signaling'), {
          ...baseDoc,
          sdp: sdp,
          // Also store the full type info so the receiver knows if it's an offer or answer
          // The `type` column already stores this
        });
      } else if (type === 'reject') {
        await addDoc(collection(db, 'signaling'), {
          ...baseDoc
        });
      } else {
        // Generic fallback — store as sdp text
        await addDoc(collection(db, 'signaling'), {
          ...baseDoc,
          sdp: JSON.stringify(data)
        });
      }
    } catch (error) {
      console.error('Error sending signaling message:', error);
      throw error;
    }
  }

  // Flush queued outbound ICE candidates as a single signaling row.
  // The `candidate` column carries { candidates: [...] }; receivers fan
  // the batch back out, so old single-candidate senders still interop.
  async flushOutboundIce() {
    if (this.iceFlushTimer) {
      clearTimeout(this.iceFlushTimer);
      this.iceFlushTimer = null;
    }
    const batch = this.outboundIceQueue;
    if (!batch.length || !this.callId) return;
    this.outboundIceQueue = [];
    try {
      await addDoc(collection(db, 'signaling'), {
        callId: this.callId,
        type: 'ice-candidate',
        from: this.getCurrentUserId(),
        timestamp: serverTimestamp(),
        candidate: { candidates: batch }
      });
    } catch (error) {
      console.error('Error sending batched ICE candidates:', error);
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
          const raw = change.doc.data();
          // Skip our own messages
          if (raw.from === this.getCurrentUserId()) return;

          // Reconstruct the signaling message from the DB columns.
          // The DB stores SDP in `sdp` (text) and ICE in `candidate` (jsonb).
          // We normalize back to the format the handlers expect.
          const message = {
            id: change.doc.id,
            callId: raw.callId,
            type: raw.type,
            from: raw.from,
            timestamp: raw.timestamp,
          };

          // A batched ICE row fans back out into one message per candidate —
          // downstream handlers keep the single-candidate shape.
          if (raw.type === 'ice-candidate' && Array.isArray(raw.candidate?.candidates)) {
            raw.candidate.candidates.forEach((candidate) => {
              onMessage({ ...message, data: { candidate } });
            });
            return;
          }

          if (raw.type === 'offer' || raw.type === 'answer') {
            // Reconstruct RTCSessionDescriptionInit
            message.data = {
              [raw.type]: {
                type: raw.type,
                sdp: raw.sdp
              }
            };
          } else if (raw.type === 'ice-candidate') {
            message.data = {
              candidate: raw.candidate
            };
          } else {
            message.data = raw.sdp ? JSON.parse(raw.sdp) : {};
          }

          onMessage(message);
        }
      });
    });
  }

  // Cap the video send bitrate for low-bandwidth links. The camera may
  // still open at 720p, but the encoder stays under ~800 kbps and sheds
  // resolution before framerate or audio when the network can't keep up.
  applyBandwidthCaps() {
    if (!this.peerConnection) return;
    this.peerConnection.getSenders().forEach((sender) => {
      if (!sender.track || sender.track.kind !== 'video') return;
      try {
        const params = sender.getParameters() || {};
        params.degradationPreference = 'maintain-framerate';
        params.encodings = [{ ...(params.encodings?.[0] || {}), maxBitrate: 800000 }];
        sender.setParameters(params).catch(() => {});
      } catch (e) { /* older browsers — caps simply don't apply */ }
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
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.reconnectAttempts = 0;

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

      // Update call status in Backend
      if (this.callId) {
        const callsQuery = query(
          collection(db, 'calls'),
          where('callId', '==', this.callId)
        );

        // This would need to be handled differently in a real implementation
        // For now, we'll just log it
        console.log('Call ended:', this.callId);
      }

      // Drop unsent outbound ICE candidates for the ended call
      if (this.iceFlushTimer) {
        clearTimeout(this.iceFlushTimer);
        this.iceFlushTimer = null;
      }
      this.outboundIceQueue = [];
      this.pendingIceCandidates = [];

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

  // Attempt ICE restart for temporary network drops
  async attemptIceRestart() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached, ending call');
      this.endCall();
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting ICE restart (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // Wait before attempting restart (backoff)
    const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 5000);

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (!this.peerConnection) return;

        // Create a new offer to trigger ICE restart
        if (this.isInitiator) {
          const offer = await this.peerConnection.createOffer({ iceRestart: true });
          await this.peerConnection.setLocalDescription(offer);
          await this.sendSignalingMessage('offer', { offer });
        }

        console.log('ICE restart offer sent');
      } catch (error) {
        console.error('ICE restart failed:', error);
        // If restart fails, end the call
        this.endCall();
      }
    }, backoffDelay);
  }

  // Best-effort 'end' signal for page unload — a regular fetch is cancelled
  // when the tab closes, keepalive keeps the request alive past unload.
  sendEndBeacon() {
    try {
      if (!this.callId) return;
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      fetch(`${baseUrl}/data/signaling`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          callId: this.callId,
          type: 'end',
          timestamp: new Date().toISOString()
        }),
      }).catch(() => {});
    } catch { /* best effort — never block unload */ }
  }

  // Get call history
  async getCallHistory(userId, resultLimit = 50) {
    try {
      // Outgoing + incoming calls, merged client-side (the query layer
      // supports single-field equality only)
      const [outgoing, incoming] = await Promise.all([
        getDocs(query(
          collection(db, 'calls'),
          where('callerId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(resultLimit)
        )),
        getDocs(query(
          collection(db, 'calls'),
          where('recipientId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(resultLimit)
        )),
      ]);

      const byId = new Map();
      [...outgoing.docs, ...incoming.docs].forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));
      return [...byId.values()]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, resultLimit);
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
        this.applyBandwidthCaps();
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

  // Get current user ID from Backend Auth
  getCurrentUserId() {
    // The auth stub builds currentUser from the backend user object which uses
    // `id` (not `uid`). Check both, plus fall back to localStorage.
    if (auth.currentUser?.id) return auth.currentUser.id;
    if (auth.currentUser?.uid) return auth.currentUser.uid;
    // Fallback: read from localStorage (set by the auth shim on login)
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return parsed.id;
        if (parsed?.uid) return parsed.uid;
      }
    } catch (e) { /* ignore */ }
    return null;
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
      this.applyBandwidthCaps();

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
        this.applyBandwidthCaps();

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

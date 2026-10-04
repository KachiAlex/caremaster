import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, Camera, User
} from 'lucide-react';
import { toast } from 'react-toastify';
import WebRTCService from '../services/webrtcService';
import { buildConstraints } from '../services/deviceSettingsService';
import { useUser } from '../contexts/UserContext';
import telemedicineAPI from '../api/telemedicineAPI';

/**
 * WebRTC video call for scheduled telemedicine consultations.
 *
 * Both parties join the signaling channel `consult_<appointmentId>` and post a
 * `presence` message. The DOCTOR is the deterministic initiator: when the
 * doctor sees the client's presence, the doctor sends the offer. This avoids
 * offer glare regardless of join order.
 */
const ConsultationCall = ({ appointment, role, onEnd }) => {
  const { userProfile, user } = useUser();
  const myId = userProfile?.id || user?.uid;
  const isDoctor = role === 'doctor';

  const [phase, setPhase] = useState('connecting'); // connecting | waiting | connected | ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [peerName] = useState(isDoctor
    ? (appointment.clientName || 'Client')
    : (appointment.doctorName || 'Doctor'));

  const webrtcRef = useRef(null);
  const unsubRef = useRef(null);
  const timerRef = useRef(null);
  const waitTimeoutRef = useRef(null);
  const offerSentRef = useRef(false);
  const remoteAttachedRef = useRef(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const channelName = `consult_${appointment.id}`;

  const cleanup = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null; }
    if (webrtcRef.current) {
      // Signal 'end' so the peer isn't left hanging on teardown paths that
      // skip hangUp (unmount, navigation, peer-end, init failure)
      webrtcRef.current.sendEndBeacon();
      webrtcRef.current.endCall().catch(() => {});
      webrtcRef.current = null;
    }
  }, []);

  // Tell the other party we're leaving, then tear down
  const hangUp = useCallback(async () => {
    try {
      if (webrtcRef.current) {
        await webrtcRef.current.sendSignalingMessage('end', {});
      }
    } catch { /* best effort */ }
    cleanup();
    onEnd?.(duration);
  }, [cleanup, duration, onEnd]);

  useEffect(() => {
    let mounted = true;
    const svc = new WebRTCService();
    webrtcRef.current = svc;

    // If the tab closes or reloads mid-call, still tell the peer we left
    const onUnload = () => { webrtcRef.current?.sendEndBeacon(); };
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);

    const run = async () => {
      await svc.initialize();
      if (!mounted) return;
      svc.callId = channelName;

      svc.setCallbacks({
        onLocalStream: (stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
          }
        },
        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.play().catch(() => {});
          }
          if (!remoteAttachedRef.current) {
            remoteAttachedRef.current = true;
            setPhase('connected');
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
            toast.success(`${peerName} connected`);
          }
        },
        onCallStateChange: (state) => {
          if (state === 'connected' && !remoteAttachedRef.current) {
            remoteAttachedRef.current = true;
            setPhase('connected');
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
          }
          if (state === 'failed' || state === 'closed') {
            setPhase('ended');
          }
        },
      });

      // Media first so the offer/answer carries tracks
      await svc.getUserMedia(buildConstraints('video'));

      // Announce presence — the peer sees this via the signaling poll
      await svc.sendSignalingMessage('presence', { role });

      setPhase('waiting');

      // Bail out if the other party never joins — otherwise we'd wait forever
      waitTimeoutRef.current = setTimeout(() => {
        if (!remoteAttachedRef.current) {
          toast.info(`${peerName} did not join the consultation`);
          cleanup();
          onEnd?.(0);
        }
      }, 120000);

      unsubRef.current = svc.listenForSignaling(channelName, async (msg) => {
        try {
          if (msg.type === 'presence') {
            // Only the doctor initiates — send offer once peer is present
            if (isDoctor && !offerSentRef.current) {
              offerSentRef.current = true;
              const offer = await svc.peerConnection.createOffer();
              await svc.peerConnection.setLocalDescription(offer);
              await svc.sendSignalingMessage('offer', { offer });
            }
          } else if (msg.type === 'offer') {
            await svc.handleOffer(msg.data.offer, 'video');
          } else if (msg.type === 'answer') {
            await svc.handleAnswer(msg.data.answer);
          } else if (msg.type === 'ice-candidate') {
            await svc.handleIceCandidate(msg.data.candidate);
          } else if (msg.type === 'end') {
            toast.info(`${peerName} ended the call`);
            cleanup();
            onEnd?.(duration);
          }
        } catch (err) {
          console.error('Consult signaling error:', err);
        }
      });

      // Doctor-side presence check: if the client already announced before we
      // subscribed, their row arrives on the first poll — handled above.
    };

    run().catch((err) => {
      console.error('Consultation join failed:', err);
      toast.error(`Could not start the consultation: ${err.message}`);
      cleanup();
      onEnd?.(0);
    });

    return () => {
      mounted = false;
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
      cleanup();
    };
  }, [appointment.id]);

  const toggleAudio = () => {
    const enabled = webrtcRef.current?.toggleAudio();
    setIsMuted(!enabled);
  };

  const toggleVideo = () => {
    const enabled = webrtcRef.current?.toggleVideo();
    setIsVideoOn(!!enabled);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{peerName}</h3>
            <p className="text-gray-400 text-sm capitalize">
              {phase === 'connected' ? `Connected · ${fmt(duration)}` : phase === 'waiting' ? 'Waiting for the other party…' : 'Connecting…'}
            </p>
          </div>
        </div>
        <button
          onClick={hangUp}
          className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
          title="End consultation"
        >
          <PhoneOff className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        {/* Remote audio for safety on devices that won't autoplay via video */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        {phase !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-lg">{phase === 'waiting' ? `Waiting for ${peerName} to join…` : 'Connecting…'}</p>
            </div>
          </div>
        )}

        {/* Local PiP */}
        <div className="absolute bottom-6 right-6 w-40 h-28 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <Camera className="h-6 w-6 text-gray-500" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 py-5 bg-gray-800">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${!isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          title={isVideoOn ? 'Turn off video' : 'Turn on video'}
        >
          {isVideoOn ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
        </button>
        <button
          onClick={hangUp}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          title="End consultation"
        >
          <PhoneOff className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default ConsultationCall;

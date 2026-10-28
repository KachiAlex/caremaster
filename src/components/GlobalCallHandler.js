import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import CallService from '../services/callService';
import CallInterface from './CallInterface';
import WebRTCService from '../services/webrtcService';
import DeviceSettingsModal from './DeviceSettingsModal';

/**
 * App-wide incoming-call handler. Mounted once inside UserProvider so any
 * authenticated user — client, caregiver, doctor, admin, pharmacist — gets
 * the ring/answer overlay no matter which page they're on.
 *
 * Page-level components must NOT register their own listenForIncomingCalls
 * listener: every subscriber receives the same notification, which would
 * render duplicate call UIs.
 */
const GlobalCallHandler = () => {
  const { user, userProfile } = useUser();
  const [callService] = useState(() => new CallService());
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [webrtc, setWebrtc] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callConnectionState, setCallConnectionState] = useState(null);
  const [showDevices, setShowDevices] = useState(false);
  const signalingUnsubRef = useRef(null);
  // Refs mirror the state above so cleanup paths (signaling callbacks,
  // unmount, pagehide) never operate on stale null closures.
  const webrtcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const myId = userProfile?.id || user?.uid || user?.id || userProfile?.uid;

  const cleanupCall = () => {
    if (signalingUnsubRef.current) { signalingUnsubRef.current(); signalingUnsubRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach(t => t.stop()); remoteStreamRef.current = null; }
    if (webrtcRef.current) { webrtcRef.current.endCall().catch(() => {}); webrtcRef.current = null; }
    setLocalStream(null);
    setRemoteStream(null);
    setWebrtc(null);
    setCallConnectionState(null);
  };

  const endActiveCall = () => {
    cleanupCall();
    setActiveCall(null);
  };

  const setupWebrtcCallbacks = (svc) => {
    svc.setCallbacks({
      onLocalStream: (stream) => { localStreamRef.current = stream; setLocalStream(stream); },
      onRemoteStream: (stream) => {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        setCallConnectionState('connected');
      },
      onCallEnded: endActiveCall,
      onCallStateChange: (state) => {
        if (state === 'connected') {
          setCallConnectionState('connected');
        } else if (state === 'failed' || state === 'closed') {
          setCallConnectionState('ended');
          setTimeout(() => { if (webrtcRef.current === svc) endActiveCall(); }, 2000);
        } else if (state === 'disconnected') {
          setCallConnectionState('ended');
        }
      },
    });
  };

  // If the tab closes or reloads mid-call, still tell the peer we left
  useEffect(() => {
    if (!webrtc) return;
    const onUnload = () => webrtc.sendEndBeacon();
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [webrtc]);

  // Warm the session-cached TURN/STUN config once we're authenticated so a
  // first call doesn't pay the credentials round-trip on the call path.
  useEffect(() => {
    if (myId) WebRTCService.preloadIceConfiguration().catch(() => {});
  }, [myId]);

  // Incoming call listener — the service only reports fresh 'incoming'
  // notifications, so every event here is a call addressed to me.
  useEffect(() => {
    if (!myId) return;

    const unsubscribe = callService.listenForIncomingCalls(myId, (callNotification) => {
      if (callNotification.status !== 'incoming') return;

      // Same call re-delivered (this effect resubscribes when call state
      // changes) — already ringing or already answered.
      if (callNotification.callId === incomingCall?.callId ||
          callNotification.callId === activeCall?.callId) return;

      // Busy: a *different* call while ringing/in a call — reject so the
      // caller isn't left hanging and the current overlay isn't replaced.
      if (activeCall || incomingCall) {
        callService.rejectCall(callNotification.callId, myId).catch(() => {});
        return;
      }

      setIncomingCall({
        callId: callNotification.callId,
        callerId: callNotification.callerId,
        callerName: callNotification.callerName || 'Caller',
        callType: callNotification.callType || 'video',
      });
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [myId, activeCall, incomingCall, callService]);

  // Accept — notification-level answer and WebRTC/media setup run in
  // parallel: the caller gets the 'answered' flip without waiting for this
  // side's camera/mic permission prompt.
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    if (incomingCall.callId.startsWith('consult_')) {
      const appointmentId = incomingCall.callId.slice('consult_'.length).split('__')[0];
      await callService.answerCall(incomingCall.callId, myId);
      setIncomingCall(null);
      window.location.href = `/telemedicine?consult=${appointmentId}`;
      return;
    }
    try {
      const svc = new WebRTCService();
      await Promise.all([
        callService.answerCall(incomingCall.callId, myId),
        (async () => {
          await svc.initialize();
          setupWebrtcCallbacks(svc);
          await svc.answerCall(incomingCall.callId, incomingCall.callType);
        })(),
      ]);

      signalingUnsubRef.current = svc.listenForSignaling(incomingCall.callId, async (msg) => {
        try {
          if (msg.type === 'offer') await svc.handleOffer(msg.data.offer, incomingCall.callType);
          else if (msg.type === 'ice-candidate') await svc.handleIceCandidate(msg.data.candidate);
          else if (msg.type === 'end') { toast.info('Call ended'); cleanupCall(); setActiveCall(null); }
        } catch (e) { console.error('Signaling handler error:', e); }
      });

      webrtcRef.current = svc;
      setWebrtc(svc);
      setActiveCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: incomingCall.callerName || 'Caller',
        callType: incomingCall.callType,
      });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      cleanupCall();
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    try {
      await callService.rejectCall(incomingCall.callId, myId);
      setIncomingCall(null);
      toast.info('Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      setIncomingCall(null);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try { await webrtc?.sendSignalingMessage('end', {}); } catch { /* best effort */ }
    try {
      await callService.endCall(activeCall.callId, 0);
    } catch (error) {
      console.error('Error ending call:', error);
    }
    callService.cleanupSignalingRecords(activeCall.callId).catch(() => {});
    callService.cleanupCallNotifications(activeCall.callId).catch(() => {});
    cleanupCall();
    setActiveCall(null);
    toast.info('Call ended');
  };

  if (!user) return null;

  return (
    <>
      {incomingCall && (
        <CallInterface
          isOpen={!!incomingCall}
          onClose={handleRejectCall}
          callId={incomingCall.callId}
          callType={incomingCall.callType}
          participantInfo={{
            id: incomingCall.callerId,
            name: incomingCall.callerName || 'Caller',
          }}
          isIncoming={true}
          onCallAccepted={handleAcceptCall}
          onCallRejected={handleRejectCall}
          onOpenDeviceSettings={() => setShowDevices(true)}
        />
      )}

      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleEndCall}
          callId={activeCall.callId}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
          }}
          isIncoming={false}
          externalWebrtcService={webrtc}
          externalCallState={callConnectionState}
          localStream={localStream}
          remoteStream={remoteStream}
          onOpenDeviceSettings={() => setShowDevices(true)}
        />
      )}

      <DeviceSettingsModal isOpen={showDevices} onClose={() => setShowDevices(false)} />
    </>
  );
};

export default GlobalCallHandler;

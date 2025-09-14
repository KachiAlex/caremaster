import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  Camera, 
  CameraOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  MoreVertical,
  Users,
  MessageSquare,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import WebRTCService from '../services/webrtcService';

const CallInterface = ({ 
  isOpen, 
  onClose, 
  callType = 'video', 
  participantInfo = null,
  isIncoming = false,
  onCallAccepted,
  onCallRejected 
}) => {
  const [callState, setCallState] = useState('connecting'); // connecting, ringing, connected, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [webrtcService, setWebrtcService] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioRef = useRef(null);
  const callDurationInterval = useRef(null);

  // Initialize WebRTC service
  useEffect(() => {
    const initializeWebRTC = async () => {
      if (!WebRTCService.isSupported()) {
        toast.error('WebRTC is not supported in this browser');
        onClose();
        return;
      }

      const service = new WebRTCService();
      await service.initialize();
      
      // Set up callbacks
      service.setCallbacks({
        onLocalStream: (stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
          }
          setCallState('connected');
          startCallTimer();
        },
        onCallEnded: () => {
          setCallState('ended');
          stopCallTimer();
          setTimeout(() => {
            onClose();
          }, 2000);
        },
        onCallStateChange: (state) => {
          setConnectionQuality(state === 'connected' ? 'good' : 'poor');
        }
      });

      setWebrtcService(service);
    };

    if (isOpen) {
      initializeWebRTC();
    }

    return () => {
      if (webrtcService) {
        webrtcService.endCall();
      }
    };
  }, [isOpen]);

  // Start call timer
  const startCallTimer = () => {
    callDurationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callDurationInterval.current) {
      clearInterval(callDurationInterval.current);
      callDurationInterval.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle call actions
  const handleMuteToggle = () => {
    if (webrtcService) {
      const isAudioEnabled = webrtcService.toggleAudio();
      setIsMuted(!isAudioEnabled);
    }
  };

  const handleVideoToggle = () => {
    if (webrtcService) {
      const isVideoOn = webrtcService.toggleVideo();
      setIsVideoEnabled(isVideoOn);
    }
  };

  const handleSpeakerToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsSpeakerEnabled(!audioRef.current.muted);
    }
  };

  const handleCameraSwitch = async () => {
    if (webrtcService) {
      const success = await webrtcService.switchCamera();
      if (!success) {
        toast.error('Failed to switch camera');
      }
    }
  };

  const handleEndCall = async () => {
    if (webrtcService) {
      await webrtcService.endCall();
    }
    setCallState('ended');
    stopCallTimer();
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleAcceptCall = async () => {
    if (webrtcService && isIncoming) {
      setCallState('connecting');
      await webrtcService.answerCall('call-id', callType);
      if (onCallAccepted) {
        onCallAccepted();
      }
    }
  };

  const handleRejectCall = () => {
    setCallState('ended');
    if (onCallRejected) {
      onCallRejected();
    }
    onClose();
  };

  // Handle incoming call
  const handleIncomingCall = async () => {
    if (isIncoming) {
      setCallState('ringing');
      toast.info(`Incoming ${callType} call from ${participantInfo?.name}`);
    }
  };

  useEffect(() => {
    if (isOpen && isIncoming) {
      handleIncomingCall();
    }
  }, [isOpen, isIncoming]);

  if (!isOpen) return null;

  return (
    <>
      {/* Audio element for remote audio */}
      <audio 
        ref={audioRef} 
        autoPlay 
        playsInline 
        muted={!isSpeakerEnabled}
        style={{ display: 'none' }}
      />

      {/* Main call interface */}
      <div className={`fixed inset-0 z-50 ${isMinimized ? 'pointer-events-none' : ''}`}>
        {/* Background overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-75" />
        
        {/* Call container */}
        <div className={`relative w-full h-full flex items-center justify-center ${
          isMinimized ? 'scale-50 translate-x-1/2 translate-y-1/2' : ''
        } transition-all duration-300`}>
          
          {/* Video containers */}
          <div className="relative w-full h-full">
            {/* Remote video */}
            <div className="absolute inset-0">
              {callType === 'video' ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ 
                    transform: remoteStream ? 'scaleX(1)' : 'scaleX(-1)',
                    filter: remoteStream ? 'none' : 'blur(10px)'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl font-bold">
                        {participantInfo?.name?.[0] || 'U'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">
                      {participantInfo?.name || 'Unknown User'}
                    </h2>
                    <p className="text-blue-200">
                      {participantInfo?.role || 'User'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Connection quality indicator */}
              <div className="absolute top-4 left-4 flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionQuality === 'good' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-white text-sm">
                  {connectionQuality === 'good' ? 'Good connection' : 'Poor connection'}
                </span>
              </div>

              {/* Call duration */}
              {callState === 'connected' && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-mono">
                    {formatDuration(callDuration)}
                  </span>
                </div>
              )}

              {/* Local video (picture-in-picture) */}
              {callType === 'video' && localStream && (
                <div className="absolute bottom-20 md:bottom-24 right-2 md:right-4 w-24 h-18 md:w-32 md:h-24 bg-gray-900 rounded-lg overflow-hidden border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="text-white" size={16} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Call status overlay */}
            {callState !== 'connected' && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center text-white">
                  {callState === 'connecting' && (
                    <>
                      <Loader2 className="animate-spin mx-auto mb-4" size={48} />
                      <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
                      <p>Establishing connection with {participantInfo?.name}</p>
                    </>
                  )}
                  
                  {callState === 'ringing' && (
                    <>
                      <div className="w-24 h-24 md:w-24 md:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Phone className="text-white" size={32} />
                      </div>
                      <h2 className="text-xl md:text-2xl font-semibold mb-2">Incoming Call</h2>
                      <p className="text-lg md:text-xl mb-6">{participantInfo?.name}</p>
                      <div className="flex space-x-6 md:space-x-4 justify-center">
                        <button
                          onClick={handleRejectCall}
                          className="w-20 h-20 md:w-16 md:h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
                        >
                          <X className="text-white" size={28} />
                        </button>
                        <button
                          onClick={handleAcceptCall}
                          className="w-20 h-20 md:w-16 md:h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 active:bg-green-700 transition-colors touch-manipulation"
                        >
                          <Check className="text-white" size={28} />
                        </button>
                      </div>
                    </>
                  )}
                  
                  {callState === 'ended' && (
                    <>
                      <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PhoneOff className="text-white" size={32} />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Call Ended</h2>
                      <p>Duration: {formatDuration(callDuration)}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Call controls */}
            {callState === 'connected' && (
              <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
                <div className="flex items-center justify-center space-x-2 md:space-x-4 bg-black bg-opacity-50 rounded-full px-4 md:px-6 py-3">
                  {/* Mute toggle */}
                  <button
                    onClick={handleMuteToggle}
                    className={`w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                      isMuted ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                    }`}
                  >
                    {isMuted ? <MicOff className="text-white" size={24} /> : <Mic className="text-white" size={24} />}
                  </button>

                  {/* Video toggle */}
                  {callType === 'video' && (
                    <button
                      onClick={handleVideoToggle}
                      className={`w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                        !isVideoEnabled ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                      }`}
                    >
                      {!isVideoEnabled ? <VideoOff className="text-white" size={24} /> : <Video className="text-white" size={24} />}
                    </button>
                  )}

                  {/* Camera switch */}
                  {callType === 'video' && isVideoEnabled && (
                    <button
                      onClick={handleCameraSwitch}
                      className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 flex items-center justify-center transition-colors touch-manipulation"
                    >
                      <Camera className="text-white" size={24} />
                    </button>
                  )}

                  {/* Speaker toggle */}
                  <button
                    onClick={handleSpeakerToggle}
                    className={`w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                      isSpeakerEnabled ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                    }`}
                  >
                    {isSpeakerEnabled ? <Volume2 className="text-white" size={24} /> : <VolumeX className="text-white" size={24} />}
                  </button>

                  {/* Minimize - hidden on mobile */}
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="hidden md:flex w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 items-center justify-center transition-colors touch-manipulation"
                  >
                    {isMinimized ? <Maximize className="text-white" size={20} /> : <Minimize className="text-white" size={20} />}
                  </button>

                  {/* End call */}
                  <button
                    onClick={handleEndCall}
                    className="w-16 h-16 md:w-12 md:h-12 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-colors touch-manipulation"
                  >
                    <PhoneOff className="text-white" size={28} />
                  </button>
                </div>
              </div>
            )}

            {/* Additional info */}
            {callState === 'connected' && (
              <div className="absolute bottom-6 left-6 text-white">
                <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium">{participantInfo?.name}</p>
                  <p className="text-xs text-gray-300">{participantInfo?.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Minimized call bar */}
        {isMinimized && callState === 'connected' && (
          <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 rounded-lg p-3 pointer-events-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {participantInfo?.name?.[0] || 'U'}
                </span>
              </div>
              <div className="text-white">
                <p className="text-sm font-medium">{participantInfo?.name}</p>
                <p className="text-xs text-gray-300">{formatDuration(callDuration)}</p>
              </div>
              <button
                onClick={handleEndCall}
                className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="text-white" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CallInterface;

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
  Loader2,
  Monitor,
  MonitorOff,
  Wifi,
  WifiOff,
  Signal
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
  onCallRejected,
  externalWebrtcService = null, // Optional: use parent's WebRTC service
  externalCallState = null, // Optional: use parent's call state
  localStream: externalLocalStream = null, // Optional: use parent's local stream
  remoteStream: externalRemoteStream = null // Optional: use parent's remote stream
}) => {
  const [callState, setCallState] = useState(externalCallState || (isIncoming ? 'ringing' : 'connecting')); // connecting, ringing, connected, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true); // Enable speaker by default for audio
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [networkStats, setNetworkStats] = useState({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [webrtcService, setWebrtcService] = useState(null);
  const [localStream, setLocalStream] = useState(externalLocalStream);
  const [remoteStream, setRemoteStream] = useState(externalRemoteStream);
  const [availableDevices, setAvailableDevices] = useState({ audioInput: [], videoInput: [] });
  const [selectedDevices, setSelectedDevices] = useState({ audio: null, video: null });
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioRef = useRef(null);
  const callDurationInterval = useRef(null);

  // Update call state when external state changes
  useEffect(() => {
    if (externalCallState && externalCallState !== callState) {
      console.log('📡 Updating call state from external:', externalCallState);
      setCallState(externalCallState);
    }
  }, [externalCallState]);

  // Update streams when external streams change
  useEffect(() => {
    if (externalLocalStream) {
      setLocalStream(externalLocalStream);
    }
  }, [externalLocalStream]);

  useEffect(() => {
    if (externalRemoteStream) {
      setRemoteStream(externalRemoteStream);
    }
  }, [externalRemoteStream]);

  // Connect remote stream to audio/video elements
  useEffect(() => {
    if (remoteStream) {
      console.log('🔊 Connecting remote stream to audio/video elements');
      
      // For voice calls, connect to audio element
      if (audioRef.current && callType === 'voice') {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.play().catch(err => console.error('Audio playback error:', err));
        console.log('✅ Remote audio connected');
      }
      
      // For video calls, connect to video element
      if (remoteVideoRef.current && callType === 'video') {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(err => console.error('Video playback error:', err));
        console.log('✅ Remote video connected');
      }
    }
  }, [remoteStream, callType]);

  // Connect local stream to video elements
  useEffect(() => {
    if (localStream && localVideoRef.current && callType === 'video') {
      localVideoRef.current.srcObject = localStream;
      console.log('✅ Local video connected');
    }
  }, [localStream, callType]);

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
      
      // Load available devices
      try {
        const devices = await WebRTCService.getMediaDevices();
        setAvailableDevices({
          audioInput: devices.audioInput,
          videoInput: devices.videoInput
        });
      } catch (error) {
        console.warn('Could not load devices:', error);
      }
      
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
          console.log('📡 WebRTC connection state changed:', state);
          setConnectionQuality(state === 'connected' ? 'good' : 'poor');
          
          // Update call state based on WebRTC connection state
          if (state === 'connected') {
            setCallState('connected');
            startCallTimer();
            toast.success('Call connected!');
          } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            setCallState('ended');
            toast.error('Call disconnected');
          }
        },
        onStatsUpdate: (stats) => {
          setNetworkStats(stats);
          setConnectionQuality(stats.quality);
        },
        onScreenShare: (isSharing, stream) => {
          setIsScreenSharing(isSharing);
          if (isSharing) {
            // Update local video to show screen share
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          } else {
            // Return to camera view
            if (localVideoRef.current && localStream) {
              localVideoRef.current.srcObject = localStream;
            }
          }
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

  const handleDeviceChange = async (deviceType, deviceId) => {
    if (webrtcService) {
      const success = await webrtcService.switchDevice(deviceType, deviceId);
      if (success) {
        setSelectedDevices(prev => ({ ...prev, [deviceType]: deviceId }));
        toast.success(`${deviceType === 'audio' ? 'Microphone' : 'Camera'} changed`);
      } else {
        toast.error(`Failed to switch ${deviceType === 'audio' ? 'microphone' : 'camera'}`);
      }
    }
  };

  const handleScreenShare = async () => {
    if (!webrtcService) return;

    try {
      if (isScreenSharing) {
        await webrtcService.stopScreenShare();
        toast.success('Screen sharing stopped');
      } else {
        await webrtcService.startScreenShare();
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast.error(isScreenSharing ? 'Failed to stop screen sharing' : 'Failed to start screen sharing');
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
                <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-900 flex items-center justify-center">
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
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                    connectionQuality === 'good' ? 'bg-blue-500' : 
                    connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                  <span className="text-white text-sm font-medium">
                    {connectionQuality === 'good' ? 'Good' : 
                     connectionQuality === 'fair' ? 'Fair' : 'Poor'}
                  </span>
                  {networkStats.rtt && (
                    <span className="text-white text-xs">
                      {Math.round(networkStats.rtt)}ms
                </span>
                  )}
                </div>
                {networkStats.packetLoss > 0 && (
                  <div className="text-white text-xs mt-1">
                    Loss: {networkStats.packetLoss.toFixed(1)}%
                  </div>
                )}
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
                      <p className="mb-6">Establishing connection with {participantInfo?.name}</p>
                      <div className="flex justify-center">
                        <button
                          onClick={handleEndCall}
                          className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-colors touch-manipulation"
                        >
                          <PhoneOff className="text-white" size={28} />
                        </button>
                      </div>
                    </>
                  )}
                  
                  {callState === 'ringing' && (
                    <>
                      <div className="w-24 h-24 md:w-24 md:h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
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
                          className="w-20 h-20 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                        >
                          <Check className="text-white" size={28} />
                        </button>
                        {/* End call while ringing (decline) */}
                        <button
                          onClick={handleEndCall}
                          className="hidden md:flex w-16 h-16 bg-red-600 rounded-full items-center justify-center hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
                        >
                          <PhoneOff className="text-white" size={24} />
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
            {(callState === 'connected') && (
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

                  {/* Screen sharing toggle */}
                  {callType === 'video' && (
                    <button
                      onClick={handleScreenShare}
                      className={`w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                        isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                      }`}
                    >
                      {isScreenSharing ? <MonitorOff className="text-white" size={24} /> : <Monitor className="text-white" size={24} />}
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

                  {/* Device Settings */}
                  <button
                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                    className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 flex items-center justify-center transition-colors touch-manipulation"
                    title="Device Settings"
                  >
                    <Settings className="text-white" size={24} />
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
            {/* Always show a minimal End button on mobile while connecting to allow cancellation */}
            {callState === 'connecting' && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={handleEndCall}
                  className="md:hidden w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-colors touch-manipulation"
                >
                  <PhoneOff className="text-white" size={22} />
                </button>
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

            {/* Device Settings Panel */}
            {showDeviceSettings && callState === 'connected' && (
              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 rounded-lg p-4 min-w-[280px] z-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Device Settings</h3>
                  <button
                    onClick={() => setShowDeviceSettings(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Microphone Selection */}
                {availableDevices.audioInput.length > 0 && (
                  <div className="mb-3">
                    <label className="text-white text-sm mb-1 block">Microphone</label>
                    <select
                      value={selectedDevices.audio || ''}
                      onChange={(e) => handleDeviceChange('audio', e.target.value)}
                      className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm"
                    >
                      {availableDevices.audioInput.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Camera Selection */}
                {callType === 'video' && availableDevices.videoInput.length > 0 && (
                  <div>
                    <label className="text-white text-sm mb-1 block">Camera</label>
                    <select
                      value={selectedDevices.video || ''}
                      onChange={(e) => handleDeviceChange('video', e.target.value)}
                      className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm"
                    >
                      {availableDevices.videoInput.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  MessageCircle, 
  Send, 
  Users, 
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Camera,
  Download,
  Share,
  Settings
} from 'lucide-react';
import { toast } from 'react-toastify';
import telemedicineAPI from '../api/telemedicineAPI';

const TelemedicineInterface = ({ 
  appointmentId, 
  patientId, 
  nurseId, 
  doctorId, 
  userType, // 'nurse' or 'doctor'
  onCallEnd 
}) => {
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, active, ended
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [callHistory, setCallHistory] = useState([]);

  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);

  useEffect(() => {
    if (appointmentId) {
      initializeCall();
      loadPatientData();
      loadCallHistory();
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [appointmentId]);

  const initializeCall = async () => {
    try {
      setCallStatus('connecting');
      
      // Start the call session
      const callData = {
        patientId,
        nurseId,
        doctorId,
        userType,
        appointmentId
      };

      const call = await telemedicineAPI.startCall(appointmentId, callData);
      
      // Initialize WebRTC (simplified - in real implementation, you'd use a proper WebRTC library)
      await initializeWebRTC();
      
      setCallStatus('active');
      startCallTimer();
      
      toast.success('Call connected successfully!');
      
    } catch (error) {
      console.error('Error initializing call:', error);
      toast.error('Failed to connect call');
      setCallStatus('ended');
    }
  };

  const initializeWebRTC = async () => {
    try {
      // In a real implementation, you would:
      // 1. Create peer connection
      // 2. Get user media (camera/microphone)
      // 3. Set up signaling
      // 4. Handle ICE candidates
      
      // For demo purposes, we'll simulate this
      if (localVideoRef.current) {
        // localVideoRef.current.srcObject = localStream;
      }
      
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast.error('Failed to initialize video/audio');
    }
  };

  const loadPatientData = async () => {
    try {
      // Load patient data for context during the call
      // This would typically come from your patient API
      setPatientData({
        name: 'John Doe',
        age: 75,
        conditions: ['Hypertension', 'Diabetes'],
        lastVisit: '2024-01-15'
      });
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const loadCallHistory = async () => {
    try {
      const history = await telemedicineAPI.getCallHistory(
        userType === 'nurse' ? nurseId : doctorId, 
        userType
      );
      setCallHistory(history);
    } catch (error) {
      console.error('Error loading call history:', error);
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // In real implementation, toggle video stream
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    // In real implementation, toggle audio stream
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // In real implementation, toggle screen sharing
  };

  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        // Start recording
        setIsRecording(true);
        toast.info('Recording started');
      } else {
        // Stop recording
        setIsRecording(false);
        toast.info('Recording stopped');
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast.error('Failed to toggle recording');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const message = {
        id: Date.now().toString(),
        senderId: userType === 'nurse' ? nurseId : doctorId,
        senderType: userType,
        message: newMessage,
        timestamp: new Date(),
        appointmentId
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // In real implementation, send via WebSocket or similar
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const endCall = async () => {
    try {
      setCallStatus('ended');
      
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }

      // End the call session
      await telemedicineAPI.endCall(appointmentId, {
        duration: callDuration,
        notes: callNotes,
        messages: messages,
        recordingUrl: isRecording ? 'recording-url' : null
      });

      toast.success('Call ended successfully');
      
      if (onCallEnd) {
        onCallEnd({
          duration: callDuration,
          notes: callNotes,
          messages: messages
        });
      }
      
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call properly');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sendEmergencyAlert = async () => {
    try {
      // This would trigger an emergency alert to admin and other doctors
      toast.warning('Emergency alert sent to admin and backup doctors');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert');
    }
  };

  if (callStatus === 'ended') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <PhoneOff className="mx-auto text-red-500" size={48} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Call Ended</h3>
        <p className="text-gray-600 mb-4">
          Duration: {formatDuration(callDuration)}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Start New Call
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="text-blue-400" size={20} />
            <span className="font-medium">Telemedicine Session</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="text-blue-400" size={16} />
            <span>{formatDuration(callDuration)}</span>
          </div>
          {isRecording && (
            <div className="flex items-center space-x-1 bg-red-600 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs">REC</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={sendEmergencyAlert}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg"
            title="Emergency Alert"
          >
            <AlertTriangle size={16} />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            title="Toggle Chat"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Main Video Area */}
        <div className={`${showChat ? 'flex-1' : 'w-full'} relative`}>
          <div className="relative bg-gray-900 aspect-video">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoOn && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="text-white" size={32} />
                </div>
              )}
            </div>

            {/* Patient Info Overlay */}
            {patientData && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
                <h4 className="font-bold">{patientData.name}</h4>
                <p className="text-sm">Age: {patientData.age}</p>
                <p className="text-sm">Conditions: {patientData.conditions.join(', ')}</p>
                <p className="text-sm">Last Visit: {patientData.lastVisit}</p>
              </div>
            )}

            {/* Call Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${
                  isAudioOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
                } hover:opacity-80`}
              >
                {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${
                  isVideoOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
                } hover:opacity-80`}
              >
                {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full ${
                  isScreenSharing ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                } hover:opacity-80`}
              >
                <Share size={20} />
              </button>
              
              <button
                onClick={toggleRecording}
                className={`p-3 rounded-full ${
                  isRecording ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'
                } hover:opacity-80`}
              >
                <Camera size={20} />
              </button>
              
              <button
                onClick={endCall}
                className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                <PhoneOff size={20} />
              </button>
            </div>

            {/* Connection Status */}
            {callStatus === 'connecting' && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Connecting...</p>
                </div>
              </div>
            )}
          </div>

          {/* Call Notes */}
          <div className="p-4 border-t">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <FileText className="mr-2" size={16} />
              Call Notes
            </h4>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Add notes during the call..."
            />
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 border-l flex flex-col">
            <div className="p-4 border-b">
              <h4 className="font-medium text-gray-800">Chat</h4>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto max-h-96">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-3 ${
                    message.senderType === userType ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg max-w-xs ${
                      message.senderType === userType
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelemedicineInterface;

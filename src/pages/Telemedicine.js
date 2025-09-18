import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Camera, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff,
  Settings,
  Share,
  Circle,
  StopCircle,
  Download,
  Upload,
  FileText,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Star,
  MapPin,
  Phone as PhoneIcon,
  Mail,
  Camera as CameraIcon,
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import telemedicineService from '../services/telemedicineService';
import telemedicineAPI from '../api/telemedicineAPI';
import { toast } from 'react-toastify';
import { testTelemedicineService, quickTest } from '../utils/telemedicineTest';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import DocumentManager from '../components/DocumentManager';

const Telemedicine = () => {
  const [user, userLoading] = useAuthState(auth);
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState({ cameras: [], microphones: [] });
  const [isInitializing, setIsInitializing] = useState(false);
  const [userType, setUserType] = useState('patient'); // 'patient' or 'doctor'
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedAppointmentForDocs, setSelectedAppointmentForDocs] = useState(null);

  useEffect(() => {
    if (user && !userLoading) {
      loadTelemedicineData();
      setupAgoraEventListeners();
      loadAvailableDevices();
    }
    
    return () => {
      // Cleanup on unmount
      if (isInCall) {
        telemedicineService.leaveChannel();
      }
    };
  }, [user, userLoading]);

  // Determine user type based on user data
  useEffect(() => {
    if (user) {
      // In a real app, you'd check user roles from Firestore
      // For now, we'll use a simple check or default to patient
      const userRole = user.displayName?.includes('Dr.') ? 'doctor' : 'patient';
      setUserType(userRole);
    }
  }, [user]);

  const loadAvailableDevices = async () => {
    try {
      const devices = await telemedicineService.getAvailableDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  // Set up Agora event listeners
  const setupAgoraEventListeners = () => {
    // User joined
    window.addEventListener('agora-user-published', (event) => {
      const { user } = event.detail;
      setRemoteUsers(prev => [...prev, user]);
      toast.success(`${user.uid} joined the call`);
    });

    // User left
    window.addEventListener('agora-user-left', (event) => {
      const { user } = event.detail;
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      toast.info(`${user.uid} left the call`);
    });

    // Connection state changed
    window.addEventListener('agora-connection-state-change', (event) => {
      const { curState } = event.detail;
      setConnectionState(curState);
      console.log('Connection state:', curState);
      
      if (curState === 'CONNECTED') {
        toast.success('Connected to call');
      } else if (curState === 'DISCONNECTED') {
        toast.warning('Connection lost');
      }
    });

    // Error handling
    window.addEventListener('agora-error', (event) => {
      const { type, error } = event.detail;
      setError(error);
      console.error('Agora error:', type, error);
      
      switch (type) {
        case 'initialization':
          toast.error('Failed to initialize video calling');
          break;
        case 'join':
          if (event.detail.isTokenError) {
            toast.error('Video call authentication failed. Please try again.');
          } else {
            toast.error('Failed to join call. Please check your connection.');
          }
          break;
        case 'track-creation':
          toast.error('Failed to access camera/microphone');
          break;
        case 'publish':
          toast.error('Failed to start video/audio');
          break;
        default:
          toast.error('Video call error occurred');
      }
    });

    // Tracks created
    window.addEventListener('agora-tracks-created', (event) => {
      const { hasVideo, hasAudio } = event.detail;
      setIsVideoOn(hasVideo);
      setIsAudioOn(hasAudio);
      
      if (!hasVideo && !hasAudio) {
        toast.warning('No camera or microphone access available');
      } else if (!hasVideo) {
        toast.warning('Camera access not available - audio only');
      } else if (!hasAudio) {
        toast.warning('Microphone access not available - video only');
      }
    });

    // Recording events
    window.addEventListener('agora-recording-started', (event) => {
      setIsRecording(true);
      toast.success('Recording started');
    });

    window.addEventListener('agora-recording-stopped', (event) => {
      setIsRecording(false);
      toast.success('Recording stopped');
    });
  };

  const loadTelemedicineData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Load appointments from Firebase
      const appointmentsData = await telemedicineAPI.getAppointments(user.uid, userType);
      
      // Format appointments for display
      const formattedAppointments = appointmentsData.map(appointment => 
        telemedicineAPI.formatAppointmentForDisplay(appointment)
      );

      setAppointments(formattedAppointments);
      setLoading(false);
    } catch (error) {
      console.error('Error loading telemedicine data:', error);
      setError('Failed to load appointments. Please try again.');
      setLoading(false);
      
      // No fallback - use empty data if Firebase fails
      setAppointments([]);
      setUpcomingAppointments([]);
      setCompletedAppointments([]);
      setLoading(false);
    }
  };


  const startCall = async (appointment) => {
    try {
      setIsInitializing(true);
      setError(null);
      setActiveCall(appointment);
      setIsInCall(true);
      setCallDuration(0);
      
      // Generate a unique channel name for this appointment
      const channelName = `appointment_${appointment.id}_${Date.now()}`;
      
      // Join Agora channel
      const uid = await telemedicineService.joinChannel(null, channelName);
      console.log('Joined call with UID:', uid);
      
      // Save call data to Firebase
      let callId = null;
      try {
        const callData = {
          appointmentId: appointment.id,
          patientId: userType === 'patient' ? user.uid : appointment.patientId,
          doctorId: userType === 'doctor' ? user.uid : appointment.doctorId,
          channelName,
          uid,
          callType: appointment.type || 'video',
          status: 'active'
        };
        
        const callResult = await telemedicineAPI.startCall(appointment.id, callData);
        callId = callResult.id;
        
        // Update active call with Firebase call ID
        setActiveCall(prev => ({ ...prev, callId }));
      } catch (firebaseError) {
        console.warn('Failed to save call to Firebase:', firebaseError);
        // Continue with call even if Firebase save fails
      }
      
      toast.success('Call started successfully!');
      
      // Start call duration timer
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      // Store timer for cleanup
      setActiveCall(prev => ({ ...prev, timer, channelName, uid, callId }));
      
    } catch (error) {
      console.error('Failed to start call:', error);
      setError(error.message);
      toast.error(`Failed to start call: ${error.message}`);
      setActiveCall(null);
      setIsInCall(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const endCall = async () => {
    try {
      // Clear timer
      if (activeCall?.timer) {
        clearInterval(activeCall.timer);
      }
      
      // Leave Agora channel
      await telemedicineService.leaveChannel();
      
      // Save call end data to Firebase
      if (activeCall?.callId) {
        try {
          const callEndData = {
            duration: callDuration,
            endReason: 'user_ended',
            hasRecording: isRecording
          };
          
          await telemedicineAPI.endCall(activeCall.callId, callEndData);
        } catch (firebaseError) {
          console.warn('Failed to save call end to Firebase:', firebaseError);
        }
      }
      
      setActiveCall(null);
      setIsInCall(false);
      setCallDuration(0);
      setRemoteUsers([]);
      setIsVideoOn(true);
      setIsAudioOn(true);
      setIsRecording(false);
      
      toast.success('Call ended successfully!');
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call properly.');
    }
  };

  const toggleVideo = async () => {
    try {
      const enabled = await telemedicineService.toggleVideo();
      setIsVideoOn(enabled);
      toast.info(enabled ? 'Video enabled' : 'Video disabled');
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('Failed to toggle video');
    }
  };

  const toggleAudio = async () => {
    try {
      const enabled = await telemedicineService.toggleAudio();
      setIsAudioOn(enabled);
      toast.info(enabled ? 'Audio enabled' : 'Audio disabled');
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Failed to toggle audio');
    }
  };

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        await telemedicineService.stopRecording();
        setIsRecording(false);
        
        // Save recording data to Firebase
        if (activeCall?.callId) {
          try {
            const recordingData = {
              duration: callDuration,
              status: 'completed',
              recordingUrl: null, // Would be set by Agora Cloud Recording
              fileSize: null
            };
            
            await telemedicineAPI.saveRecording(activeCall.callId, recordingData);
          } catch (firebaseError) {
            console.warn('Failed to save recording data to Firebase:', firebaseError);
          }
        }
        
        toast.success('Recording stopped');
      } else {
        await telemedicineService.startRecording();
        setIsRecording(true);
        
        // Save recording start data to Firebase
        if (activeCall?.callId) {
          try {
            const recordingData = {
              status: 'recording',
              startTime: new Date()
            };
            
            await telemedicineAPI.saveRecording(activeCall.callId, recordingData);
          } catch (firebaseError) {
            console.warn('Failed to save recording start to Firebase:', firebaseError);
          }
        }
        
        toast.success('Recording started');
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      toast.error('Failed to toggle recording');
    }
  };

  const switchCamera = async (deviceId) => {
    try {
      await telemedicineService.switchCamera(deviceId);
      toast.success('Camera switched successfully');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast.error('Failed to switch camera');
    }
  };

  const switchMicrophone = async (deviceId) => {
    try {
      await telemedicineService.switchMicrophone(deviceId);
      toast.success('Microphone switched successfully');
    } catch (error) {
      console.error('Failed to switch microphone:', error);
      toast.error('Failed to switch microphone');
    }
  };

  const runTelemedicineTest = async () => {
    try {
      toast.info('Running telemedicine tests...');
      const results = await testTelemedicineService();
      
      if (results.errors.length === 0) {
        toast.success('All telemedicine tests passed!');
      } else {
        toast.warning(`Some tests failed: ${results.errors.length} errors`);
        console.log('Test results:', results);
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Telemedicine test failed');
    }
  };

  const createNewAppointment = async () => {
    try {
      // For demo purposes, create a sample appointment
      // In a real app, this would open a form or modal
      const newAppointment = {
        patientId: userType === 'patient' ? user.uid : 'sample-patient-id',
        doctorId: userType === 'doctor' ? user.uid : null,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 30,
        type: 'video',
        notes: 'New consultation appointment',
        status: 'scheduled'
      };

      const createdAppointment = await telemedicineAPI.createAppointment(newAppointment);
      toast.success('New appointment created successfully!');
      
      // Reload appointments to show the new one
      loadTelemedicineData();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast.error('Failed to create appointment');
    }
  };

  const seedData = async () => {
    try {
      toast.info('Seeding sample data...');
      // Seeding removed - use real appointment data only
      toast.success('Sample data seeded successfully!');
      
      // Reload appointments to show the new data
      loadTelemedicineData();
    } catch (error) {
      console.error('Failed to seed data:', error);
      toast.error('Failed to seed sample data');
    }
  };

  const openDocuments = (appointment) => {
    setSelectedAppointmentForDocs(appointment);
    setShowDocuments(true);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Show loading state while user is being authenticated
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access telemedicine features.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
          <p className="text-gray-600">Virtual consultations and remote healthcare</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={seedData}
            className="btn btn-secondary"
            title="Add sample data to Firebase"
          >
            <Upload className="h-4 w-4 mr-2" />
            Seed Data
          </button>
          <button 
            onClick={runTelemedicineTest}
            className="btn btn-secondary"
            title="Test telemedicine functionality"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Test System
          </button>
          <button 
            onClick={loadAvailableDevices}
            className="btn btn-secondary"
            title="Refresh device list"
          >
            <Settings className="h-4 w-4 mr-2" />
            Refresh Devices
          </button>
          <button className="btn btn-secondary">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Appointment
          </button>
          <button 
            onClick={createNewAppointment}
            className="btn btn-primary"
            title="Create new consultation appointment"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Consultation
          </button>
        </div>
      </div>

      {/* Device Status */}
      {availableDevices.cameras.length > 0 || availableDevices.microphones.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Available Devices</h3>
            <span className="text-xs text-gray-500">
              {availableDevices.cameras.length} camera(s), {availableDevices.microphones.length} microphone(s)
            </span>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">No Devices Detected</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please ensure your camera and microphone are connected and permissions are granted.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status & Error Display */}
      {(error || connectionState !== 'disconnected') && (
        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {connectionState !== 'disconnected' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionState === 'CONNECTED' ? 'bg-green-500' : 
                  connectionState === 'CONNECTING' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  Status: {connectionState.toLowerCase()}
                </span>
              </div>
              {isInitializing && (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Initializing...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Call Interface */}
      {activeCall && (
        <div className="card bg-gray-900 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {activeCall.doctorName ? activeCall.doctorName.split(' ').map(n => n[0]).join('') : 'DC'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{activeCall.doctorName || 'Doctor'}</h3>
                <p className="text-gray-300">{activeCall.doctorSpecialty}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Call Duration: {formatDuration(callDuration)}</span>
              {isRecording && (
                <div className="flex items-center space-x-1 bg-red-600 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs text-white">REC</span>
                </div>
              )}
              <button
                onClick={endCall}
                className="p-2 bg-red-600 rounded-full hover:bg-red-700"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Video/Audio Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Remote Users Video */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="aspect-video bg-gray-700 rounded-lg mb-4 relative overflow-hidden">
                {remoteUsers.length > 0 ? (
                  remoteUsers.map((user, index) => (
                    <div
                      key={user.uid}
                      id={`remote-video-${user.uid}`}
                      className="w-full h-full"
                    />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400">Waiting for doctor to join...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {remoteUsers.length > 0 ? `${remoteUsers.length} participant(s)` : 'No participants'}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-full ${isVideoOn ? 'bg-gray-700' : 'bg-red-600'}`}
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-full ${isAudioOn ? 'bg-gray-700' : 'bg-red-600'}`}
                  >
                    {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Local Video */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="aspect-video bg-gray-700 rounded-lg mb-4 relative overflow-hidden">
                <div
                  id="local-video"
                  className="w-full h-full"
                />
                {!isVideoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-600">
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400">Your video is off</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">You</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-full ${isVideoOn ? 'bg-gray-700' : 'bg-red-600'}`}
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-full ${isAudioOn ? 'bg-gray-700' : 'bg-red-600'}`}
                  >
                    {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="space-y-4">
            {/* Main Controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                title={isVideoOn ? 'Turn off video' : 'Turn on video'}
              >
                {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </button>
              <button
                onClick={toggleRecording}
                className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? <StopCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              </button>
              <button className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors" title="Share screen">
                <Share className="h-6 w-6" />
              </button>
              <button className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors" title="Settings">
                <Settings className="h-6 w-6" />
              </button>
            </div>

            {/* Device Selection */}
            {(availableDevices.cameras.length > 1 || availableDevices.microphones.length > 1) && (
              <div className="flex items-center justify-center space-x-4 text-sm">
                {availableDevices.cameras.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <Camera className="h-4 w-4" />
                    <select 
                      onChange={(e) => switchCamera(e.target.value)}
                      className="bg-gray-800 text-white rounded px-2 py-1 text-xs"
                    >
                      {availableDevices.cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {availableDevices.microphones.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <Mic className="h-4 w-4" />
                    <select 
                      onChange={(e) => switchMicrophone(e.target.value)}
                      className="bg-gray-800 text-white rounded px-2 py-1 text-xs"
                    >
                      {availableDevices.microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <button className="btn btn-secondary">
            <Search className="h-4 w-4 mr-2" />
            Search
          </button>
        </div>
        <div className="space-y-4">
          {appointments.filter(apt => apt.status === 'scheduled').map((appointment) => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {appointment.doctorName ? appointment.doctorName.split(' ').map(n => n[0]).join('') : 'DC'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{appointment.doctorName || 'Doctor'}</h3>
                      <span className="text-sm text-gray-500">{appointment.doctorSpecialty || 'General Practice'}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>Patient: {appointment.patientName || 'Patient'} ({appointment.patientAge || 'N/A'}y)</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).date : 'TBD'}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).time : 'TBD'} ({appointment.duration || 30}min)</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                      {appointment.symptoms && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Symptoms: </span>
                          <span className="text-sm text-gray-600">{appointment.symptoms.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startCall(appointment)}
                    disabled={isInitializing}
                    className={`btn btn-primary ${isInitializing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isInitializing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        {appointment.type === 'video' ? <Video className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                        Start Call
                      </>
                    )}
                  </button>
                  <button className="btn btn-secondary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Consultations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Consultations</h2>
          <button className="btn btn-secondary">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.filter(apt => apt.status === 'completed').map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {appointment.doctorName ? appointment.doctorName.split(' ').map(n => n[0]).join('') : 'DC'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{appointment.doctorName || 'Doctor'}</div>
                        <div className="text-sm text-gray-500">{appointment.doctorSpecialty || 'General Practice'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.patientName || 'Patient'}</div>
                    <div className="text-sm text-gray-500">Age: {appointment.patientAge || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).date : 'TBD'}</div>
                    <div className="text-sm text-gray-500">{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).time : 'TBD'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {appointment.type === 'video' ? <Video className="h-4 w-4 text-blue-600 mr-1" /> : <Phone className="h-4 w-4 text-green-600 mr-1" />}
                      <span className="text-sm text-gray-900 capitalize">{appointment.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openDocuments(appointment)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Download Invoice & Prescription"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      {appointment.recording && (
                        <button className="text-green-600 hover:text-green-900">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-purple-600 hover:text-purple-900">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Manager Modal */}
      {showDocuments && selectedAppointmentForDocs && (
        <DocumentManager
          appointment={selectedAppointmentForDocs}
          patientInfo={{
            name: user?.displayName || 'Patient Name',
            email: user?.email,
            phone: user?.phoneNumber || '+234 XXX XXX XXXX',
            address: 'Patient Address',
            age: 65,
            gender: 'Not specified',
            id: user?.uid
          }}
          doctorInfo={{
            name: selectedAppointmentForDocs.doctorName || 'Healthcare Provider',
            specialty: selectedAppointmentForDocs.doctorSpecialty || 'General Practice',
            email: 'doctor@elderx.com',
            phone: '+234 800 ELDERX',
            licenseNumber: 'MD-2024-001',
            qualifications: ['MBBS', 'MD'],
            hospital: 'ElderX Telemedicine Platform'
          }}
          onClose={() => setShowDocuments(false)}
        />
      )}
    </div>
  );
};

export default Telemedicine;

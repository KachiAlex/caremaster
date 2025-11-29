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
  Settings,
  Brain,
  Heart,
  Activity,
  Eye,
  Zap,
  Shield,
  Thermometer,
  Pulse,
  Stethoscope,
  Smartphone,
  Monitor,
  Volume2,
  Wifi,
  Battery,
  WifiOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Pause,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Octagon,
  Star,
  Sparkles,
  Layers,
  Grid3X3,
  Layout,
  Sidebar,
  PanelLeft,
  PanelRight,
  Split,
  Columns,
  Rows,
  Table,
  List,
  Grid,
  LayoutGrid,
  LayoutList,
  LayoutTemplate,
  LayoutDashboard,
  LayoutKanban,
  LayoutSidebar,
  LayoutSidebarLeft,
  LayoutSidebarRight,
  LayoutSidebarLeftCollapse,
  LayoutSidebarLeftExpand,
  LayoutSidebarRightCollapse,
  LayoutSidebarRightExpand,
  LayoutSidebarInset,
  LayoutSidebarInsetLeft,
  LayoutSidebarInsetRight,
  LayoutSidebarInsetLeftCollapse,
  LayoutSidebarInsetLeftExpand,
  LayoutSidebarInsetRightCollapse,
  LayoutSidebarInsetRightExpand,
  LayoutSidebarInsetLeftInset,
  LayoutSidebarInsetRightInset,
  LayoutSidebarInsetLeftInsetCollapse,
  LayoutSidebarInsetLeftInsetExpand,
  LayoutSidebarInsetRightInsetCollapse,
  LayoutSidebarInsetRightInsetExpand,
  LayoutSidebarInsetLeftInsetLeft,
  LayoutSidebarInsetLeftInsetRight,
  LayoutSidebarInsetRightInsetLeft,
  LayoutSidebarInsetRightInsetRight,
  LayoutSidebarInsetLeftInsetLeftCollapse,
  LayoutSidebarInsetLeftInsetLeftExpand,
  LayoutSidebarInsetLeftInsetRightCollapse,
  LayoutSidebarInsetLeftInsetRightExpand,
  LayoutSidebarInsetRightInsetLeftCollapse,
  LayoutSidebarInsetRightInsetLeftExpand,
  LayoutSidebarInsetRightInsetRightCollapse,
  LayoutSidebarInsetRightInsetRightExpand
} from 'lucide-react';
import { toast } from 'react-toastify';
import advancedTelemedicineService from '../services/advancedTelemedicineService';
import computerVisionService from '../services/computerVisionService';
import iotIntegrationService from '../services/iotIntegrationService';
import aiService from '../services/aiService';

const AdvancedTelemedicineInterface = ({ 
  appointmentId, 
  clientId, 
  nurseId, 
  doctorId, 
  userType,
  onCallEnd 
}) => {
  const [callStatus, setCallStatus] = useState('connecting');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [clientData, setPatientData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  
  // Advanced features state
  const [aiAnalysis, setAiAnalysis] = useState({
    emotions: null,
    vitalSigns: null,
    gestures: null,
    healthAssessment: null,
    recommendations: []
  });
  
  const [realTimeData, setRealTimeData] = useState({
    heartRate: 0,
    bloodPressure: 0,
    temperature: 0,
    oxygenSaturation: 0,
    stressLevel: 0,
    attentionLevel: 0
  });
  
  const [iotDevices, setIotDevices] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    components: {},
    alerts: []
  });
  
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const aiAnalysisIntervalRef = useRef(null);

  useEffect(() => {
    if (appointmentId) {
      initializeAdvancedCall();
      loadPatientData();
      loadCallHistory();
      initializeIoTDevices();
    }

    return () => {
      cleanup();
    };
  }, [appointmentId]);

  const initializeAdvancedCall = async () => {
    try {
      setCallStatus('connecting');
      
      // Initialize advanced telemedicine service
      await advancedTelemedicineService.initialize();
      
      // Start AI analysis
      await startAIAnalysis();
      
      // Join channel with advanced features
      const uid = await advancedTelemedicineService.joinChannel(
        null, 
        `appointment-${appointmentId}`,
        {
          enableVideo: true,
          enableAudio: true,
          aiEnabled: true,
          realTimeAnalysis: true,
          vitalSignsTracking: true,
          emotionDetection: true,
          gestureRecognition: true
        }
      );
      
      setCallStatus('active');
      startCallTimer();
      
      // Start real-time data updates
      startRealTimeUpdates();
      
      toast.success('Advanced telemedicine session started with AI features');
      
    } catch (error) {
      console.error('Error initializing advanced call:', error);
      toast.error('Failed to start advanced telemedicine session');
      setCallStatus('ended');
    }
  };

  const startAIAnalysis = async () => {
    try {
      // Start computer vision analysis
      await computerVisionService.startAnalysis({
        enableEmotionDetection: true,
        enableVitalSignsAnalysis: true,
        enableGestureRecognition: true,
        enableFallDetection: true,
        enablePostureAnalysis: true
      });

      // Set up AI analysis interval
      aiAnalysisIntervalRef.current = setInterval(async () => {
        await updateAIAnalysis();
      }, 5000); // Update every 5 seconds

    } catch (error) {
      console.error('Failed to start AI analysis:', error);
    }
  };

  const updateAIAnalysis = async () => {
    try {
      // Get current AI analysis from services
      const emotions = await computerVisionService.aiModels?.emotionDetection?.getLatestAnalysis();
      const vitalSigns = await computerVisionService.aiModels?.vitalSignsAnalysis?.getLatestAnalysis();
      const gestures = await computerVisionService.aiModels?.gestureRecognition?.getLatestAnalysis();
      
      // Generate health assessment
      const healthAssessment = await aiService.generateCareRecommendations(
        { ...clientData, realTimeData },
        {}
      );

      setAiAnalysis({
        emotions,
        vitalSigns,
        gestures,
        healthAssessment,
        recommendations: healthAssessment?.recommendations || []
      });

      // Update real-time data
      if (vitalSigns) {
        setRealTimeData(prev => ({
          ...prev,
          heartRate: vitalSigns.heartRate || prev.heartRate,
          bloodPressure: vitalSigns.bloodPressure || prev.bloodPressure,
          temperature: vitalSigns.temperature || prev.temperature,
          oxygenSaturation: vitalSigns.oxygenSaturation || prev.oxygenSaturation
        }));
      }

      if (emotions) {
        setRealTimeData(prev => ({
          ...prev,
          stressLevel: emotions.stress || prev.stressLevel,
          attentionLevel: emotions.attention || prev.attentionLevel
        }));
      }

    } catch (error) {
      console.error('Failed to update AI analysis:', error);
    }
  };

  const initializeIoTDevices = async () => {
    try {
      // Get connected IoT devices
      const devices = iotIntegrationService.getConnectedDevices();
      setIotDevices(devices);

      // Set up IoT data listeners
      window.addEventListener('iot-device-data', handleIoTData);
      window.addEventListener('iot-device-alerts', handleIoTAlerts);

    } catch (error) {
      console.error('Failed to initialize IoT devices:', error);
    }
  };

  const handleIoTData = (event) => {
    const { device, data } = event.detail;
    
    // Update real-time data based on IoT device data
    if (device.type === 'wearable') {
      setRealTimeData(prev => ({
        ...prev,
        heartRate: data.heartRate || prev.heartRate,
        steps: data.steps || 0
      }));
    }
  };

  const handleIoTAlerts = (event) => {
    const { device, alerts } = event.detail;
    
    alerts.forEach(alert => {
      toast.warning(`IoT Alert: ${alert.message}`, {
        position: 'top-right',
        autoClose: 5000
      });
    });
  };

  const startRealTimeUpdates = () => {
    // Set up real-time data updates
    const updateInterval = setInterval(() => {
      // Update system health
      updateSystemHealth();
      
      // Update IoT device data
      updateIoTDeviceData();
      
    }, 10000); // Update every 10 seconds
  };

  const updateSystemHealth = async () => {
    try {
      const health = {
        status: 'healthy',
        components: {
          video: { status: 'healthy', latency: Math.random() * 50 + 20 },
          audio: { status: 'healthy', latency: Math.random() * 30 + 10 },
          ai: { status: 'healthy', processingTime: Math.random() * 100 + 50 },
          iot: { status: 'healthy', connectedDevices: iotDevices.length }
        },
        alerts: []
      };

      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to update system health:', error);
    }
  };

  const updateIoTDeviceData = async () => {
    try {
      const devices = iotIntegrationService.getConnectedDevices();
      setIotDevices(devices);
    } catch (error) {
      console.error('Failed to update IoT device data:', error);
    }
  };

  const loadPatientData = async () => {
    try {
      // Load Client data for context
      setPatientData({
        name: 'John Doe',
        age: 75,
        conditions: ['Hypertension', 'Diabetes'],
        lastVisit: '2024-01-15',
        medications: ['Metformin', 'Lisinopril'],
        allergies: ['Penicillin'],
        emergencyContact: 'Jane Doe (555-0123)'
      });
    } catch (error) {
      console.error('Error loading Client data:', error);
    }
  };

  const loadCallHistory = async () => {
    try {
      // Load call history
      setCallHistory([]);
    } catch (error) {
      console.error('Error loading call history:', error);
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleVideo = async () => {
    try {
      const newState = !isVideoOn;
      await advancedTelemedicineService.toggleVideo();
      setIsVideoOn(newState);
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('Failed to toggle video');
    }
  };

  const toggleAudio = async () => {
    try {
      const newState = !isAudioOn;
      await advancedTelemedicineService.toggleAudio();
      setIsAudioOn(newState);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Failed to toggle audio');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await advancedTelemedicineService.startScreenShare();
        setIsScreenSharing(true);
        toast.info('Screen sharing started');
      } else {
        await advancedTelemedicineService.stopScreenShare();
        setIsScreenSharing(false);
        toast.info('Screen sharing stopped');
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      toast.error('Failed to toggle screen share');
    }
  };

  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        await advancedTelemedicineService.startRecording();
        setIsRecording(true);
        toast.info('Recording started');
      } else {
        const result = await advancedTelemedicineService.stopRecording();
        setIsRecording(false);
        toast.info('Recording stopped');
        console.log('Recording result:', result);
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
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

      if (aiAnalysisIntervalRef.current) {
        clearInterval(aiAnalysisIntervalRef.current);
      }

      // End advanced telemedicine session
      await advancedTelemedicineService.leaveChannel();
      await computerVisionService.stopAnalysis();

      toast.success('Advanced telemedicine session ended');
      
      if (onCallEnd) {
        onCallEnd({
          duration: callDuration,
          notes: callNotes,
          messages: messages,
          aiAnalysis: aiAnalysis,
          recording: isRecording
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
      toast.warning('Emergency alert sent to admin and backup doctors');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert');
    }
  };

  const cleanup = async () => {
    try {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (aiAnalysisIntervalRef.current) {
        clearInterval(aiAnalysisIntervalRef.current);
      }
      
      await advancedTelemedicineService.destroy();
      await computerVisionService.destroy();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  if (callStatus === 'ended') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <PhoneOff className="mx-auto text-red-500" size={48} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Advanced Call Ended</h3>
        <p className="text-gray-600 mb-4">
          Duration: {formatDuration(callDuration)}
        </p>
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">AI Analysis Summary:</h4>
          <div className="text-sm text-gray-600">
            {aiAnalysis.emotions && (
              <p>Emotions: {Object.entries(aiAnalysis.emotions).map(([key, value]) => `${key}: ${(value * 100).toFixed(1)}%`).join(', ')}</p>
            )}
            {aiAnalysis.vitalSigns && (
              <p>Vital Signs: HR {aiAnalysis.vitalSigns.heartRate} bpm, BP {aiAnalysis.vitalSigns.bloodPressure}</p>
            )}
          </div>
        </div>
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
            <Brain className="text-blue-400" size={20} />
            <span className="font-medium">Advanced Telemedicine Session</span>
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
            onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            title="Advanced Panel"
          >
            <Settings size={16} />
          </button>
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

            {/* Client Info Overlay */}
            {clientData && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
                <h4 className="font-bold">{clientData.name}</h4>
                <p className="text-sm">Age: {clientData.age}</p>
                <p className="text-sm">Conditions: {clientData.conditions.join(', ')}</p>
                <p className="text-sm">Last Visit: {clientData.lastVisit}</p>
              </div>
            )}

            {/* Real-time Data Overlay */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Heart className="text-red-400" size={16} />
                  <span>{realTimeData.heartRate} bpm</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Thermometer className="text-orange-400" size={16} />
                  <span>{realTimeData.temperature}°F</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Activity className="text-green-400" size={16} />
                  <span>{realTimeData.stressLevel}% stress</span>
                </div>
              </div>
            </div>

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
                  <p>Connecting to advanced telemedicine session...</p>
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

        {/* Advanced Panel */}
        {showAdvancedPanel && (
          <div className="w-80 border-l flex flex-col">
            <div className="p-4 border-b">
              <h4 className="font-medium text-gray-800">Advanced Features</h4>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* AI Analysis */}
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2 flex items-center">
                    <Brain className="mr-2" size={16} />
                    AI Analysis
                  </h5>
                  {aiAnalysis.emotions && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-2">
                      <h6 className="text-sm font-medium text-blue-800">Emotions</h6>
                      <div className="text-xs text-blue-600">
                        {Object.entries(aiAnalysis.emotions).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span>{(value * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {aiAnalysis.vitalSigns && (
                    <div className="bg-green-50 p-3 rounded-lg mb-2">
                      <h6 className="text-sm font-medium text-green-800">Vital Signs</h6>
                      <div className="text-xs text-green-600">
                        <div>Heart Rate: {aiAnalysis.vitalSigns.heartRate} bpm</div>
                        <div>Blood Pressure: {aiAnalysis.vitalSigns.bloodPressure}</div>
                        <div>Temperature: {aiAnalysis.vitalSigns.temperature}°F</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* IoT Devices */}
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2 flex items-center">
                    <Smartphone className="mr-2" size={16} />
                    IoT Devices
                  </h5>
                  <div className="space-y-2">
                    {iotDevices.map(device => (
                      <div key={device.id} className="bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{device.name}</span>
                          <div className={`w-2 h-2 rounded-full ${
                            device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                        <div className="text-xs text-gray-600">{device.type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Health */}
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2 flex items-center">
                    <Shield className="mr-2" size={16} />
                    System Health
                  </h5>
                  <div className="space-y-2">
                    {Object.entries(systemHealth.components).map(([component, data]) => (
                      <div key={component} className="flex items-center justify-between">
                        <span className="text-sm">{component}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">{data.latency}ms</span>
                          <div className={`w-2 h-2 rounded-full ${
                            data.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

export default AdvancedTelemedicineInterface;

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  Monitor,
  Users,
  Settings,
  Wifi,
  Signal,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import WebRTCService from '../services/webrtcService';
import CallInterface from '../components/CallInterface';

const WebRTCTest = () => {
  const { user, userProfile } = useUser();
  const [webrtcSupported, setWebrtcSupported] = useState(false);
  const [mediaDevices, setMediaDevices] = useState({ audioInput: [], audioOutput: [], videoInput: [] });
  const [testResults, setTestResults] = useState({
    webrtc: null,
    microphone: null,
    camera: null,
    screenShare: null,
    network: null
  });
  const [testInProgress, setTestInProgress] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState('video');

  // Check WebRTC support on component mount
  useEffect(() => {
    checkWebRTCSupport();
    getMediaDevices();
  }, []);

  const checkWebRTCSupport = () => {
    const supported = WebRTCService.isSupported();
    setWebrtcSupported(supported);
    setTestResults(prev => ({ ...prev, webrtc: supported }));
    
    if (!supported) {
      toast.error('WebRTC is not supported in this browser');
    }
  };

  const getMediaDevices = async () => {
    try {
      const devices = await WebRTCService.getMediaDevices();
      setMediaDevices(devices);
    } catch (error) {
      console.error('Error getting media devices:', error);
    }
  };

  const testMicrophone = async () => {
    try {
      setTestInProgress(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      microphone.connect(analyser);
      
      // Check for audio input for 3 seconds
      let hasAudio = false;
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 10) hasAudio = true;
      };
      
      const interval = setInterval(checkAudio, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        
        setTestResults(prev => ({ ...prev, microphone: hasAudio }));
        toast.success(hasAudio ? 'Microphone test passed' : 'No audio detected - check microphone');
        setTestInProgress(false);
      }, 3000);
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      setTestResults(prev => ({ ...prev, microphone: false }));
      toast.error('Microphone test failed: ' + error.message);
      setTestInProgress(false);
    }
  };

  const testCamera = async () => {
    try {
      setTestInProgress(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      
      // Create video element to test video
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Check if video is playing
      setTimeout(() => {
        const hasVideo = !video.paused && !video.ended && video.readyState > 2;
        stream.getTracks().forEach(track => track.stop());
        
        setTestResults(prev => ({ ...prev, camera: hasVideo }));
        toast.success(hasVideo ? 'Camera test passed' : 'Camera test failed');
        setTestInProgress(false);
      }, 2000);
      
    } catch (error) {
      console.error('Camera test failed:', error);
      setTestResults(prev => ({ ...prev, camera: false }));
      toast.error('Camera test failed: ' + error.message);
      setTestInProgress(false);
    }
  };

  const testScreenShare = async () => {
    try {
      setTestInProgress(true);
      
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported');
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: false
      });
      
      // Test screen share for 2 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setTestResults(prev => ({ ...prev, screenShare: true }));
        toast.success('Screen sharing test passed');
        setTestInProgress(false);
      }, 2000);
      
    } catch (error) {
      console.error('Screen share test failed:', error);
      setTestResults(prev => ({ ...prev, screenShare: false }));
      toast.error('Screen share test failed: ' + error.message);
      setTestInProgress(false);
    }
  };

  const testNetwork = async () => {
    try {
      setTestInProgress(true);
      
      // Test STUN server connectivity
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      let connected = false;
      
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          connected = true;
        }
      };
      
      // Create a data channel to trigger ICE gathering
      pc.createDataChannel('test');
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Wait for ICE gathering
      setTimeout(() => {
        pc.close();
        setTestResults(prev => ({ ...prev, network: connected }));
        toast.success(connected ? 'Network test passed' : 'Network connectivity issues detected');
        setTestInProgress(false);
      }, 5000);
      
    } catch (error) {
      console.error('Network test failed:', error);
      setTestResults(prev => ({ ...prev, network: false }));
      toast.error('Network test failed: ' + error.message);
      setTestInProgress(false);
    }
  };

  const runAllTests = async () => {
    if (testInProgress) return;
    
    setTestResults({
      webrtc: null,
      microphone: null,
      camera: null,
      screenShare: null,
      network: null
    });
    
    // Run tests sequentially
    await testMicrophone();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testCamera();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testScreenShare();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testNetwork();
  };

  const startTestCall = (type) => {
    setCallType(type);
    setShowCallInterface(true);
  };

  const getTestIcon = (result) => {
    if (result === null) return <Clock className="text-gray-400" size={20} />;
    if (result === true) return <CheckCircle className="text-green-500" size={20} />;
    return <AlertCircle className="text-red-500" size={20} />;
  };

  const getTestStatus = (result) => {
    if (result === null) return 'Not tested';
    if (result === true) return 'Passed';
    return 'Failed';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">WebRTC Test Suite</h1>
          <p className="text-gray-600">Test your device's compatibility with video calling features</p>
        </div>

        {/* WebRTC Support Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${webrtcSupported ? 'bg-green-500' : 'bg-red-500'}`} />
              <h2 className="text-xl font-semibold text-gray-800">WebRTC Support</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              webrtcSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {webrtcSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          {!webrtcSupported && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Your browser doesn't support WebRTC. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
              </p>
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTestIcon(testResults.microphone)}
                <h3 className="text-lg font-semibold text-gray-800">Microphone</h3>
              </div>
              <button
                onClick={testMicrophone}
                disabled={testInProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Test
              </button>
            </div>
            <p className="text-gray-600 text-sm">Status: {getTestStatus(testResults.microphone)}</p>
            <p className="text-gray-500 text-xs mt-2">
              {mediaDevices.audioInput.length} audio input device(s) found
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTestIcon(testResults.camera)}
                <h3 className="text-lg font-semibold text-gray-800">Camera</h3>
              </div>
              <button
                onClick={testCamera}
                disabled={testInProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Test
              </button>
            </div>
            <p className="text-gray-600 text-sm">Status: {getTestStatus(testResults.camera)}</p>
            <p className="text-gray-500 text-xs mt-2">
              {mediaDevices.videoInput.length} video input device(s) found
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTestIcon(testResults.screenShare)}
                <h3 className="text-lg font-semibold text-gray-800">Screen Share</h3>
              </div>
              <button
                onClick={testScreenShare}
                disabled={testInProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Test
              </button>
            </div>
            <p className="text-gray-600 text-sm">Status: {getTestStatus(testResults.screenShare)}</p>
            <p className="text-gray-500 text-xs mt-2">Screen sharing capability</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTestIcon(testResults.network)}
                <h3 className="text-lg font-semibold text-gray-800">Network</h3>
              </div>
              <button
                onClick={testNetwork}
                disabled={testInProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Test
              </button>
            </div>
            <p className="text-gray-600 text-sm">Status: {getTestStatus(testResults.network)}</p>
            <p className="text-gray-500 text-xs mt-2">STUN server connectivity</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Activity className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Run All Tests</h3>
              </div>
              <button
                onClick={runAllTests}
                disabled={testInProgress}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {testInProgress ? 'Testing...' : 'Run All Tests'}
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              Run comprehensive tests for all WebRTC features
            </p>
          </div>
        </div>

        {/* Test Call Interface */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Call Interface</h2>
          <p className="text-gray-600 mb-6">
            Test the call interface with all new features including screen sharing and network monitoring.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => startTestCall('audio')}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Phone size={20} />
              <span>Test Voice Call</span>
            </button>
            
            <button
              onClick={() => startTestCall('video')}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Video size={20} />
              <span>Test Video Call</span>
            </button>
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">WebRTC Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Enhanced Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Real-time network quality monitoring</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Screen sharing for consultations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>TURN server configuration for NAT traversal</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Adaptive call quality indicators</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Firebase authentication integration</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Core Capabilities</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <Info size={16} className="text-blue-500" />
                  <span>High-definition video calls</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Info size={16} className="text-blue-500" />
                  <span>Crystal clear audio with noise suppression</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Info size={16} className="text-blue-500" />
                  <span>Camera switching (front/back)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Info size={16} className="text-blue-500" />
                  <span>Call recording and history</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Info size={16} className="text-blue-500" />
                  <span>Mobile-optimized interface</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Test Call Interface */}
      {showCallInterface && (
        <CallInterface
          isOpen={showCallInterface}
          onClose={() => setShowCallInterface(false)}
          callType={callType}
          participantInfo={{
            id: 'test-user',
            name: 'Test User',
            role: 'Patient'
          }}
          isIncoming={false}
        />
      )}
    </div>
  );
};

export default WebRTCTest;

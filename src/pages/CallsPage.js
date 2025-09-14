import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  Plus, 
  Search, 
  Filter,
  PhoneCall,
  Clock,
  Check,
  X,
  RefreshCw,
  Users,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';
import CallHistory from '../components/CallHistory';

const CallsPage = () => {
  const { userProfile } = useUser();
  const [activeCall, setActiveCall] = useState(null);
  const [callService] = useState(new CallService());
  const [loading, setLoading] = useState(false);

  // Handle starting a new call
  const handleStartCall = async (callType = 'video') => {
    if (!userProfile) {
      toast.error('Please log in to make calls');
      return;
    }

    // For demo purposes, we'll show a prompt to enter a user ID
    const recipientId = prompt('Enter recipient user ID:');
    if (!recipientId) return;

    const recipientName = prompt('Enter recipient name:') || 'Unknown User';

    try {
      setLoading(true);
      const result = await callService.initiateCall(
        userProfile.id,
        recipientId,
        callType
      );

      if (result.success) {
        setActiveCall({
          callId: result.callId,
          participantId: recipientId,
          participantName: recipientName,
          callType: callType
        });
        toast.success(`${callType === 'video' ? 'Video' : 'Voice'} call initiated`);
      } else {
        toast.error('Failed to start call');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    } finally {
      setLoading(false);
    }
  };

  // Handle call back from history
  const handleCallBack = (participantId, participantName, callType) => {
    setActiveCall({
      callId: `callback_${Date.now()}`,
      participantId,
      participantName,
      callType
    });
  };

  // Handle call end
  const handleCallEnd = async () => {
    if (activeCall) {
      try {
        await callService.endCall(activeCall.callId);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    setActiveCall(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Calls</h1>
              <p className="text-gray-600 mt-2">Make voice and video calls with your care team</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleStartCall('audio')}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Phone size={20} />
                <span>Voice Call</span>
              </button>
              
              <button
                onClick={() => handleStartCall('video')}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Video size={20} />
                <span>Video Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <PhoneCall className="text-green-600" size={24} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-800">Voice Calls</h3>
                <p className="text-gray-600">Make audio-only calls</p>
              </div>
            </div>
            <button
              onClick={() => handleStartCall('audio')}
              disabled={loading}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Start Voice Call
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Video className="text-blue-600" size={24} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-800">Video Calls</h3>
                <p className="text-gray-600">Make video calls with camera</p>
              </div>
            </div>
            <button
              onClick={() => handleStartCall('video')}
              disabled={loading}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Start Video Call
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="text-purple-600" size={24} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-800">Group Calls</h3>
                <p className="text-gray-600">Coming soon</p>
              </div>
            </div>
            <button
              disabled
              className="mt-4 w-full px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Call History */}
        <div className="bg-white rounded-lg shadow">
          <CallHistory onCallBack={handleCallBack} showStats={true} />
        </div>

        {/* Call Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Call Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Good Internet Connection</h4>
                <p className="text-blue-700 text-sm">Ensure you have a stable internet connection for the best call quality.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Quiet Environment</h4>
                <p className="text-blue-700 text-sm">Choose a quiet place for important calls to avoid background noise.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Camera Positioning</h4>
                <p className="text-blue-700 text-sm">Position your camera at eye level and ensure good lighting for video calls.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Emergency Calls</h4>
                <p className="text-blue-700 text-sm">For medical emergencies, always call emergency services directly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleCallEnd}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
            role: 'User'
          }}
          isIncoming={false}
        />
      )}
    </div>
  );
};

export default CallsPage;

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  Clock, 
  Check, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  PhoneCall,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import CallService from '../services/callService';

const CallHistory = ({ onCallBack, showStats = true }) => {
  const { userProfile } = useUser();
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    videoCalls: 0,
    voiceCalls: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, answered, missed, video, voice
  const [filterDirection, setFilterDirection] = useState('all'); // all, incoming, outgoing
  const [selectedPeriod, setSelectedPeriod] = useState('7'); // 7, 30, 90 days

  const callService = new CallService();

  // Load call history and stats
  useEffect(() => {
    const loadCallData = async () => {
      if (!userProfile) return;

      try {
        setLoading(true);
        const [recentCalls, callStats] = await Promise.all([
          callService.getRecentCalls(userProfile.id, 50),
          callService.getCallStats(userProfile.id, parseInt(selectedPeriod))
        ]);

        setCalls(recentCalls);
        setStats(callStats);
      } catch (error) {
        console.error('Error loading call data:', error);
        toast.error('Failed to load call history');
      } finally {
        setLoading(false);
      }
    };

    loadCallData();
  }, [userProfile, selectedPeriod]);

  // Filter calls based on search and filters
  const filteredCalls = calls.filter(call => {
    const matchesSearch = searchQuery === '' || 
      (call.participantName && call.participantName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || 
      (filterType === 'answered' && call.status === 'answered') ||
      (filterType === 'missed' && (call.status === 'rejected' || call.status === 'initiating')) ||
      (filterType === 'video' && call.callType === 'video') ||
      (filterType === 'voice' && call.callType === 'audio');
    
    const matchesDirection = filterDirection === 'all' || call.direction === filterDirection;

    return matchesSearch && matchesType && matchesDirection;
  });

  // Format call duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format call date
  const formatCallDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get call status icon
  const getCallStatusIcon = (status, direction) => {
    if (status === 'answered') {
      return <Check className="text-green-500" size={16} />;
    } else if (status === 'rejected' || status === 'initiating') {
      return <X className="text-red-500" size={16} />;
    } else {
      return <Clock className="text-yellow-500" size={16} />;
    }
  };

  // Get call direction icon
  const getCallDirectionIcon = (direction) => {
    return direction === 'outgoing' 
      ? <ArrowUpRight className="text-blue-500" size={16} />
      : <ArrowDownLeft className="text-green-500" size={16} />;
  };

  // Get call type icon
  const getCallTypeIcon = (callType) => {
    return callType === 'video' 
      ? <Video className="text-purple-500" size={16} />
      : <Phone className="text-blue-500" size={16} />;
  };

  // Handle call back
  const handleCallBack = (call) => {
    if (onCallBack) {
      const participantId = call.direction === 'outgoing' ? call.recipientId : call.callerId;
      const participantName = call.participantName || 'Unknown User';
      onCallBack(participantId, participantName, call.callType);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const [recentCalls, callStats] = await Promise.all([
        callService.getRecentCalls(userProfile.id, 50),
        callService.getCallStats(userProfile.id, parseInt(selectedPeriod))
      ]);

      setCalls(recentCalls);
      setStats(callStats);
      toast.success('Call history refreshed');
    } catch (error) {
      console.error('Error refreshing call data:', error);
      toast.error('Failed to refresh call history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Call History</h2>
            <p className="text-gray-600 text-sm">Recent calls and statistics</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <PhoneCall className="text-blue-600" size={20} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Calls</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.totalCalls}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Check className="text-green-600" size={20} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Answered</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.answeredCalls}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <X className="text-red-600" size={20} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Missed</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.missedCalls}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="text-purple-600" size={20} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDuration(stats.averageDuration)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="answered">Answered</option>
              <option value="missed">Missed</option>
              <option value="video">Video Calls</option>
              <option value="voice">Voice Calls</option>
            </select>

            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Directions</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Call List */}
      <div className="divide-y divide-gray-200">
        {filteredCalls.length === 0 ? (
          <div className="p-8 text-center">
            <Phone className="mx-auto mb-4 text-gray-300" size={48} />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No calls found</h3>
            <p className="text-gray-600">No calls match your current filters</p>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <div key={call.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getCallDirectionIcon(call.direction)}
                    {getCallTypeIcon(call.callType)}
                    {getCallStatusIcon(call.status, call.direction)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {call.participantName || 'Unknown User'}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatCallDate(call.createdAt)}
                      {call.status === 'answered' && call.duration && (
                        <span className="ml-2">• {formatDuration(call.duration)}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {call.status === 'answered' && (
                    <button
                      onClick={() => handleCallBack(call)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Call back"
                    >
                      <Phone size={16} />
                    </button>
                  )}
                  
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredCalls.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Load more calls
          </button>
        </div>
      )}
    </div>
  );
};

export default CallHistory;

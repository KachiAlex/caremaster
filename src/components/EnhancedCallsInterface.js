import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  Search, 
  Users, 
  User, 
  PhoneCall,
  Clock,
  Check,
  CheckCheck,
  Online,
  Offline,
  Filter,
  Plus,
  Heart,
  Stethoscope,
  Shield,
  Menu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { getAllUsers } from '../api/usersAPI';
import CallService from '../services/callService';
import CallInterface from './CallInterface';

const EnhancedCallsInterface = () => {
  const { userProfile, userRole } = useUser();
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [callService] = useState(new CallService());
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  // Load all users
  useEffect(() => {
    const loadUsers = async () => {
      if (!userProfile || (!userProfile.id && !userProfile.uid)) {
        console.log('No user profile or ID available');
        return;
      }
      
      try {
        setLoading(true);
        const userId = userProfile.id || userProfile.uid;
        console.log('Loading users for calls:', userId);
        
        // Load all users
        try {
          const users = await getAllUsers();
          // Filter out current user and inactive users
          const filteredUsers = users.filter(user => 
            user.id !== userId && 
            user.status === 'active' &&
            user.email !== userProfile.email
          );
          setAllUsers(filteredUsers);
          console.log('Loaded users for calls:', filteredUsers.length);
        } catch (usersError) {
          console.log('Could not load all users for calls');
          setAllUsers([]);
          toast.warning('Unable to load user list for calls');
        }
      } catch (error) {
        console.error('Error loading users for calls:', error);
        toast.error('Failed to load users for calls');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [userProfile]);

  // Filter users based on search and type
  const getFilteredUsers = () => {
    let filtered = allUsers;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.role === filterType);
    }

    return filtered;
  };

  // Handle starting a call
  const handleStartCall = async (user, callType = 'video') => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      toast.error('User profile not available');
      return;
    }

    try {
      setLoading(true);
      const userId = userProfile.id || userProfile.uid;
      
      const result = await callService.initiateCall(
        userId,
        user.id,
        callType
      );

      if (result.success) {
        setActiveCall({
          callId: result.callId,
          participantId: user.id,
          participantName: user.name || user.email,
          callType: callType
        });
        toast.success(`${callType === 'video' ? 'Video' : 'Voice'} call initiated with ${user.name || user.email}`);
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

  // Get user role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="h-4 w-4 text-blue-600" />;
      case 'caregiver':
        return <Heart className="h-4 w-4 text-green-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get user status
  const getUserStatus = (user) => {
    // This would be enhanced with real-time status tracking
    return 'online'; // Placeholder
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white rounded-lg shadow-sm border border-gray-200 relative">
      {/* Sidebar Toggle Button - Always Visible */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-4 left-4 z-10 p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md border border-gray-200 transition-all duration-300"
        title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-1/3' : 'w-0'} border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <PhoneCall className="h-6 w-6 text-gray-700 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Calls</h1>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="doctor">Doctors</option>
              <option value="caregiver">Caregivers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {getFilteredUsers().map((user) => (
              <div
                key={user.id}
                className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                      getUserStatus(user) === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || user.email}
                      </p>
                      {getRoleIcon(user.role)}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role} • {getUserStatus(user)}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleStartCall(user, 'audio')}
                      disabled={loading}
                      className="p-1 hover:bg-green-100 rounded text-green-600 hover:text-green-700"
                      title="Voice Call"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleStartCall(user, 'video')}
                      disabled={loading}
                      className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700"
                      title="Video Call"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedUser.name || selectedUser.email}
              </h3>
              <p className="text-gray-600 mb-6 capitalize">{selectedUser.role}</p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => handleStartCall(selectedUser, 'audio')}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Phone className="h-5 w-5" />
                  <span>Voice Call</span>
                </button>
                <button
                  onClick={() => handleStartCall(selectedUser, 'video')}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Video className="h-5 w-5" />
                  <span>Video Call</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <PhoneCall className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a User to Call</h3>
              <p className="text-gray-600">Choose a user from the sidebar to start a call</p>
            </div>
          </div>
        )}
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

export default EnhancedCallsInterface;

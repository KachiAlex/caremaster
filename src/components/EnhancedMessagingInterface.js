import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Users, 
  User, 
  Phone, 
  Video, 
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Online,
  Offline,
  Filter,
  Plus,
  Paperclip,
  Smile,
  Image,
  File,
  AlertCircle,
  Heart,
  Stethoscope,
  Shield,
  PhoneCall,
  Menu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { 
  getConversationsByUser,
  sendMessage,
  getMessagesByConversation,
  markConversationAsRead,
  getOrCreateConversation
} from '../api/messagesAPI';
import { getAllUsers } from '../api/usersAPI';
import { subscribeToConversationMessages, subscribeToUserConversations } from '../api/messagesAPI';
import CallService from '../services/callService';
import CallInterface from './CallInterface';
import OnlineStatusService from '../services/onlineStatusService';

const EnhancedMessagingInterface = () => {
  const { userProfile, userRole } = useUser();
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'conversations'
  const [activeCall, setActiveCall] = useState(null);
  const [callService] = useState(new CallService());
  const [onlineStatusService] = useState(new OnlineStatusService());
  const [userStatuses, setUserStatuses] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all users and conversations
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile || (!userProfile.id && !userProfile.uid)) {
        console.log('No user profile or ID available');
        return;
      }
      
      try {
        setLoading(true);
        const userId = userProfile.id || userProfile.uid;
        console.log('Loading messaging data for user:', userId);
        
        // Initialize online status
        await onlineStatusService.initialize(userId);
        
        // Load all users first
        let filteredUsers = [];
        try {
          const users = await getAllUsers();
          // Filter out current user and inactive users
          filteredUsers = users.filter(user => 
            user.id !== userId && 
            user.status === 'active' &&
            user.email !== userProfile.email
          );
          setAllUsers(filteredUsers);
          console.log('Loaded users:', filteredUsers.length);
        } catch (usersError) {
          console.log('Could not load all users, using fallback approach');
          // Fallback: create a minimal user list or show empty state
          setAllUsers([]);
          toast.warning('Unable to load user list. You can still start conversations by email.');
        }
        
        // Load conversations
        const userConversations = await getConversationsByUser(userId);
        
        // Populate otherUser for each conversation
        const conversationsWithUsers = await Promise.all(
          userConversations.map(async (conversation) => {
            // Find the other participant
            const otherParticipantId = conversation.participants.find(id => id !== userId);
            if (otherParticipantId) {
              // Find the user in our filteredUsers list
              const otherUser = filteredUsers.find(user => user.id === otherParticipantId);
              if (otherUser) {
                return { ...conversation, otherUser };
              } else {
                // If user not found in filteredUsers, create a basic user object
                return { 
                  ...conversation, 
                  otherUser: { 
                    id: otherParticipantId, 
                    name: 'Unknown User', 
                    email: 'unknown@example.com',
                    role: 'user' 
                  } 
                };
              }
            }
            return conversation;
          })
        );
        
        setConversations(conversationsWithUsers);
        console.log('Loaded conversations:', conversationsWithUsers.length);
        
        // Listen to online status for all users
        const userIds = filteredUsers.map(user => user.id);
        if (userIds.length > 0) {
          onlineStatusService.listenToMultipleUsers(userIds, (statuses) => {
            setUserStatuses(statuses);
          });
        }
        
        if (userConversations.length > 0 && !selectedConversation) {
          setSelectedConversation(userConversations[0]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load messaging data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Cleanup on unmount
    return () => {
      onlineStatusService.cleanup();
    };
  }, [userProfile]);

  // Real-time conversation updates
  useEffect(() => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) return;

    const userId = userProfile.id || userProfile.uid;
    const unsubscribe = subscribeToUserConversations(userId, (updatedConversations) => {
      // Populate otherUser for each conversation
      const conversationsWithUsers = updatedConversations.map((conversation) => {
        // Find the other participant
        const otherParticipantId = conversation.participants.find(id => id !== userId);
        if (otherParticipantId) {
          // Find the user in our allUsers list
          const otherUser = allUsers.find(user => user.id === otherParticipantId);
          if (otherUser) {
            return { ...conversation, otherUser };
          } else {
            // If user not found in allUsers, create a basic user object
            return { 
              ...conversation, 
              otherUser: { 
                id: otherParticipantId, 
                name: 'Unknown User', 
                email: 'unknown@example.com',
                role: 'user' 
              } 
            };
          }
        }
        return conversation;
      });
      
      setConversations(conversationsWithUsers);
    });

    return () => unsubscribe();
  }, [userProfile, allUsers]);

  // Real-time message updates
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = subscribeToConversationMessages(selectedConversation.id, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

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

  // Start conversation with a user
  const startConversation = async (user) => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      toast.error('User profile not available');
      return;
    }

    try {
      setSending(true);
      setSelectedUser(user);
      
      const userId = userProfile.id || userProfile.uid;
      console.log('Starting conversation between:', userId, 'and', user.id);
      
      // Get or create conversation
      const conversation = await getOrCreateConversation(userId, user.id);
      console.log('Got conversation:', conversation);
      
      // Find the conversation in our list or add it
      let existingConversation = conversations.find(conv => conv.id === conversation.id);
      if (!existingConversation) {
        existingConversation = {
          id: conversation.id,
          participants: conversation.participants || [userId, user.id],
          conversationType: conversation.conversationType || 'general',
          lastMessage: conversation.lastMessage,
          lastMessageTime: conversation.lastMessageTime,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          otherUser: user
        };
        setConversations(prev => [existingConversation, ...prev]);
      }
      
      setSelectedConversation(existingConversation);
      setActiveTab('conversations');
      
      // Load messages for this conversation
      if (conversation.id) {
        const conversationMessages = await getMessagesByConversation(conversation.id);
        setMessages(conversationMessages);
      } else {
        console.error('No conversation ID available');
        setMessages([]);
      }
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setSending(false);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !userProfile) return;

    if (!userProfile.id && !userProfile.uid) {
      toast.error('User profile not available');
      return;
    }

    try {
      setSending(true);
      const userId = userProfile.id || userProfile.uid;
      
      const messageData = {
        text: newMessage,
        messageType: 'text',
        senderId: userId,
        recipientId: selectedConversation.participants.find(id => id !== userId)
      };

      await sendMessage(selectedConversation.id, userId, messageData);
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Select conversation
  const selectConversation = async (conversation) => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      toast.error('User profile not available');
      return;
    }

    if (!conversation || !conversation.id) {
      toast.error('Invalid conversation');
      return;
    }

    setSelectedConversation(conversation);
    
    try {
      // Load messages for this conversation
      const conversationMessages = await getMessagesByConversation(conversation.id);
      setMessages(conversationMessages);
      
      // Mark as read
      const userId = userProfile.id || userProfile.uid;
      await markConversationAsRead(conversation.id, userId);
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    }
  };

  // Get user role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="h-4 w-4 text-blue-600" />;
      case 'caregiver':
        return <Heart className="h-4 w-4 text-blue-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get user status
  const getUserStatus = (user) => {
    const status = userStatuses[user.id];
    if (status) {
      return status.isOnline ? 'online' : 'offline';
    }
    return 'offline';
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Handle starting a call
  const handleStartCall = async (user, callType = 'video') => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      toast.error('User profile not available');
      return;
    }

    try {
      setSending(true);
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
      setSending(false);
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
              <MessageSquare className="h-6 w-6 text-gray-700 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'users' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="h-4 w-4 mr-2 inline" />
              All Users
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'conversations' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2 inline" />
              Conversations
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'users' ? 'Search users...' : 'Search conversations...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Manual User Search (fallback when users can't be loaded) */}
          {activeTab === 'users' && allUsers.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                User list unavailable. You can start conversations by email:
              </p>
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="Enter email address..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      const email = e.target.value;
                      // Create a temporary user object for the email
                      const tempUser = {
                        id: email,
                        email: email,
                        name: email.split('@')[0],
                        role: 'user',
                        status: 'active'
                      };
                      startConversation(tempUser);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const emailInput = document.querySelector('input[type="email"]');
                    if (emailInput && emailInput.value) {
                      const email = emailInput.value;
                      const tempUser = {
                        id: email,
                        email: email,
                        name: email.split('@')[0],
                        role: 'user',
                        status: 'active'
                      };
                      startConversation(tempUser);
                      emailInput.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Start Chat
                </button>
              </div>
            </div>
          )}

          {/* Filter */}
          {activeTab === 'users' && (
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
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'users' ? (
            // Users List
            <div className="p-2">
              {getFilteredUsers().map((user) => (
                <div
                  key={user.id}
                  onClick={() => startConversation(user)}
                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                        getUserStatus(user) === 'online' ? 'bg-blue-500' : 'bg-gray-400'
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
                        disabled={sending}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700"
                        title="Voice Call"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStartCall(user, 'video')}
                        disabled={sending}
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
          ) : (
            // Conversations List
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                    selectedConversation?.id === conversation.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.otherUser?.name || 'Unknown User'}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedConversation.otherUser?.name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.otherUser?.role || 'User'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleStartCall(selectedConversation.otherUser, 'audio')}
                    disabled={sending}
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 hover:text-blue-700"
                    title="Voice Call"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleStartCall(selectedConversation.otherUser, 'video')}
                    disabled={sending}
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 hover:text-blue-700"
                    title="Video Call"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const userId = userProfile?.id || userProfile?.uid;
                const isOwnMessage = message.senderId === userId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <span className="text-xs opacity-70">
                          {formatTime(message.createdAt)}
                        </span>
                        {isOwnMessage && (
                          <div>
                            {message.read ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Paperclip className="h-5 w-5 text-gray-600" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'users' ? 'Select a user to start chatting' : 'No conversations yet'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'users' 
                  ? 'Choose someone from the list to begin a conversation'
                  : 'Start a conversation with someone from the users list'
                }
              </p>
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

export default EnhancedMessagingInterface;

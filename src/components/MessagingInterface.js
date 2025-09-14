import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Filter,
  Plus,
  Paperclip,
  Smile,
  Image,
  File,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Users,
  Heart,
  Stethoscope,
  Shield,
  PhoneCall
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
import { subscribeToConversationMessages, subscribeToUserConversations } from '../api/messagesAPI';
import CallService from '../services/callService';
import CallInterface from './CallInterface';

const MessagingInterface = () => {
  const { userProfile, userRole } = useUser();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [callService] = useState(new CallService());
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        const userConversations = await getConversationsByUser(userProfile.id);
        setConversations(userConversations);
        
        if (userConversations.length > 0 && !selectedConversation) {
          setSelectedConversation(userConversations[0]);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [userProfile]);

  // Real-time conversation updates
  useEffect(() => {
    if (!userProfile) return;

    const unsubscribe = subscribeToUserConversations(userProfile.id, (updatedConversations) => {
      setConversations(updatedConversations);
    });

    return unsubscribe;
  }, [userProfile]);

  // Real-time message updates
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = subscribeToConversationMessages(
      selectedConversation.id,
      (updatedMessages) => {
        setMessages(updatedMessages);
      }
    );

    return unsubscribe;
  }, [selectedConversation]);

  // Listen for incoming calls
  useEffect(() => {
    if (!userProfile) return;

    const unsubscribe = callService.listenForIncomingCalls(userProfile.id, (callData) => {
      setIncomingCall(callData);
    });

    return unsubscribe;
  }, [userProfile, callService]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation) return;
      
      try {
        const conversationMessages = await getMessagesByConversation(selectedConversation.id);
        setMessages(conversationMessages);
        
        // Mark conversation as read
        await markConversationAsRead(selectedConversation.id, userProfile.id);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      }
    };

    loadMessages();
  }, [selectedConversation, userProfile]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await sendMessage(selectedConversation.id, userProfile.id, {
        text: newMessage.trim(),
        messageType: selectedConversation.conversationType || 'general'
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle voice call
  const handleVoiceCall = async () => {
    if (!selectedConversation || !userProfile) return;

    const participant = selectedConversation.participants.find(p => p.id !== userProfile.id);
    if (!participant) return;

    try {
      const result = await callService.initiateCall(
        userProfile.id,
        participant.id,
        'audio'
      );

      if (result.success) {
        setActiveCall({
          callId: result.callId,
          participantId: participant.id,
          participantName: participant.name || participant.displayName,
          callType: 'audio'
        });
      } else {
        toast.error('Failed to start voice call');
      }
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast.error('Failed to start voice call');
    }
  };

  // Handle video call
  const handleVideoCall = async () => {
    if (!selectedConversation || !userProfile) return;

    const participant = selectedConversation.participants.find(p => p.id !== userProfile.id);
    if (!participant) return;

    try {
      const result = await callService.initiateCall(
        userProfile.id,
        participant.id,
        'video'
      );

      if (result.success) {
        setActiveCall({
          callId: result.callId,
          participantId: participant.id,
          participantName: participant.name || participant.displayName,
          callType: 'video'
        });
      } else {
        toast.error('Failed to start video call');
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('Failed to start video call');
    }
  };

  // Handle incoming call acceptance
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      await callService.answerCall(incomingCall.callId, userProfile.id);
      setActiveCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: 'Incoming Call',
        callType: incomingCall.callType
      });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
    }
  };

  // Handle incoming call rejection
  const handleRejectIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      await callService.rejectCall(incomingCall.callId, userProfile.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Failed to reject call');
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
    setIncomingCall(null);
  };

  const getConversationTypeIcon = (type) => {
    switch (type) {
      case 'medical':
        return <Stethoscope size={16} className="text-blue-600" />;
      case 'care':
        return <Heart size={16} className="text-green-600" />;
      case 'emergency':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'general':
        return <MessageSquare size={16} className="text-gray-600" />;
      default:
        return <MessageSquare size={16} className="text-gray-600" />;
    }
  };

  const getConversationTypeColor = (type) => {
    switch (type) {
      case 'medical':
        return 'bg-blue-50 border-blue-200';
      case 'care':
        return 'bg-green-50 border-green-200';
      case 'emergency':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conversation.participants.some(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || conversation.conversationType === filterType;
    return matchesSearch && matchesFilter;
  });

  const getParticipantName = (conversation) => {
    if (!conversation.participants) return 'Unknown';
    const otherParticipant = conversation.participants.find(p => p.id !== userProfile.id);
    return otherParticipant?.name || otherParticipant?.displayName || 'Unknown User';
  };

  const getParticipantRole = (conversation) => {
    if (!conversation.participants) return '';
    const otherParticipant = conversation.participants.find(p => p.id !== userProfile.id);
    return otherParticipant?.role || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Plus size={20} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex space-x-2">
            {['all', 'general', 'medical', 'care', 'emergency'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-xs rounded-full ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getConversationTypeColor(conversation.conversationType)}`}>
                    {getConversationTypeIcon(conversation.conversationType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getParticipantName(conversation)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        conversation.conversationType === 'medical' ? 'bg-blue-100 text-blue-800' :
                        conversation.conversationType === 'care' ? 'bg-green-100 text-green-800' :
                        conversation.conversationType === 'emergency' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getParticipantRole(conversation)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getConversationTypeColor(selectedConversation.conversationType)}`}>
                    {getConversationTypeIcon(selectedConversation.conversationType)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {getParticipantName(selectedConversation)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getParticipantRole(selectedConversation)} • {selectedConversation.conversationType}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleVoiceCall}
                    className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                    title="Voice Call"
                  >
                    <Phone size={20} />
                  </button>
                  <button 
                    onClick={handleVideoCall}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Video Call"
                  >
                    <Video size={20} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === userProfile.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === userProfile.id
                          ? 'bg-blue-600 text-white'
                          : message.senderId === 'system'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.senderId === 'system' && (
                        <div className="flex items-center space-x-1 mb-1">
                          <Shield size={12} />
                          <span className="text-xs font-medium">System</span>
                        </div>
                      )}
                      
                      <p className="text-sm">{message.text}</p>
                      
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        message.senderId === userProfile.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.senderId === userProfile.id && (
                          <div className="flex items-center">
                            {message.read ? (
                              <CheckCheck size={12} className="text-blue-100" />
                            ) : (
                              <Check size={12} className="text-blue-100" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <Paperclip size={20} />
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                    <Smile size={20} />
                  </button>
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
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

      {/* Incoming Call Interface */}
      {incomingCall && (
        <CallInterface
          isOpen={!!incomingCall}
          onClose={handleRejectIncomingCall}
          callType={incomingCall.callType}
          participantInfo={{
            id: incomingCall.callerId,
            name: 'Incoming Call',
            role: 'User'
          }}
          isIncoming={true}
          onCallAccepted={handleAcceptIncomingCall}
          onCallRejected={handleRejectIncomingCall}
        />
      )}
    </div>
  );
};

export default MessagingInterface;

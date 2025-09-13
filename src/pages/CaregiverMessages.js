import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Filter, 
  Phone, 
  Video, 
  Paperclip, 
  MoreVertical,
  User,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Heart,
  Calendar,
  MapPin,
  FileText,
  Camera,
  Smile
} from 'lucide-react';

const CaregiverMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulate loading conversation data
    const loadConversations = async () => {
      try {
        setTimeout(() => {
          const mockConversations = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              lastMessage: 'Thank you for the medication reminder',
              lastMessageTime: '2024-01-21T10:30:00Z',
              unreadCount: 2,
              avatar: null,
              status: 'online',
              lastSeen: '2024-01-21T10:35:00Z'
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              lastMessage: 'See you tomorrow for therapy session',
              lastMessageTime: '2024-01-21T09:15:00Z',
              unreadCount: 0,
              avatar: null,
              status: 'offline',
              lastSeen: '2024-01-21T09:20:00Z'
            },
            {
              id: 3,
              patientName: 'Michael Adebayo',
              patientId: 'ELD003',
              lastMessage: 'Emergency alert received - all clear now',
              lastMessageTime: '2024-01-21T08:45:00Z',
              unreadCount: 1,
              avatar: null,
              status: 'online',
              lastSeen: '2024-01-21T08:50:00Z'
            },
            {
              id: 4,
              patientName: 'Sarah Williams',
              patientId: 'ELD004',
              lastMessage: 'Lunch was delicious, thank you!',
              lastMessageTime: '2024-01-21T08:00:00Z',
              unreadCount: 0,
              avatar: null,
              status: 'offline',
              lastSeen: '2024-01-21T08:05:00Z'
            }
          ];

          setConversations(mockConversations);
          setSelectedConversation(mockConversations[0]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading conversations:', error);
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadMessages = async (conversationId) => {
    try {
      setTimeout(() => {
        const mockMessages = [
          {
            id: 1,
            senderId: 'caregiver',
            senderName: 'You',
            message: 'Good morning! Time for your morning medication.',
            timestamp: '2024-01-21T09:00:00Z',
            type: 'text',
            status: 'delivered'
          },
          {
            id: 2,
            senderId: 'ELD001',
            senderName: 'Adunni Okafor',
            message: 'Good morning! I\'m ready for my medication.',
            timestamp: '2024-01-21T09:05:00Z',
            type: 'text',
            status: 'read'
          },
          {
            id: 3,
            senderId: 'caregiver',
            senderName: 'You',
            message: 'Perfect! I\'ll be there in 10 minutes.',
            timestamp: '2024-01-21T09:06:00Z',
            type: 'text',
            status: 'delivered'
          },
          {
            id: 4,
            senderId: 'ELD001',
            senderName: 'Adunni Okafor',
            message: 'Thank you for the medication reminder',
            timestamp: '2024-01-21T10:30:00Z',
            type: 'text',
            status: 'read'
          }
        ];

        setMessages(mockMessages);
      }, 500);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      const message = {
        id: Date.now(),
        senderId: 'caregiver',
        senderName: 'You',
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sending'
      };

      setMessages([...messages, message]);
      setNewMessage('');

      // Update last message in conversation
      setConversations(conversations.map(conv =>
        conv.id === selectedConversation.id
          ? { ...conv, lastMessage: message.message, lastMessageTime: message.timestamp }
          : conv
      ));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
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
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-600">Communicate with your patients and family members</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Video className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex dashboard-full-width">
        {/* Conversations List */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.patientName}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          ID: {conversation.patientId}
                        </span>
                        <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(selectedConversation.status)}`}></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedConversation.patientName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ID: {selectedConversation.patientId} • {selectedConversation.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === 'caregiver' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === 'caregiver'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                      <div className={`flex items-center justify-between mt-1 text-xs ${
                        message.senderId === 'caregiver' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {message.senderId === 'caregiver' && (
                          <div className="flex items-center ml-2">
                            {message.status === 'read' ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Camera className="h-5 w-5" />
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaregiverMessages;

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Phone, 
  Video, 
  MoreVertical,
  Clock,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  User,
  Heart,
  AlertTriangle,
  Calendar,
  MapPin
} from 'lucide-react';

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for conversations
  const [conversations, setConversations] = useState([
    {
      id: 1,
      name: 'Dr. Kemi Adebayo',
      role: 'Cardiologist',
      avatar: null,
      lastMessage: 'Your blood pressure readings look good. Keep monitoring daily.',
      timestamp: '2 hours ago',
      unreadCount: 2,
      status: 'online',
      messages: [
        {
          id: 1,
          text: 'Hello Mrs. Okafor, how are you feeling today?',
          sender: 'doctor',
          timestamp: '10:30 AM',
          read: true
        },
        {
          id: 2,
          text: 'I\'m feeling much better, thank you doctor.',
          sender: 'patient',
          timestamp: '10:32 AM',
          read: true
        },
        {
          id: 3,
          text: 'Your blood pressure readings look good. Keep monitoring daily.',
          sender: 'doctor',
          timestamp: '2 hours ago',
          read: false
        }
      ]
    },
    {
      id: 2,
      name: 'Nurse Fatima Abdullahi',
      role: 'Caregiver',
      avatar: null,
      lastMessage: 'I\'ll be there for your appointment at 2 PM.',
      timestamp: '1 day ago',
      unreadCount: 0,
      status: 'offline',
      messages: [
        {
          id: 1,
          text: 'Good morning! I\'m on my way for your home visit.',
          sender: 'caregiver',
          timestamp: 'Yesterday 8:00 AM',
          read: true
        },
        {
          id: 2,
          text: 'I\'ll be there for your appointment at 2 PM.',
          sender: 'caregiver',
          timestamp: '1 day ago',
          read: true
        }
      ]
    },
    {
      id: 3,
      name: 'ElderX Support',
      role: 'Support Team',
      avatar: null,
      lastMessage: 'Your subscription will renew on January 15th.',
      timestamp: '3 days ago',
      unreadCount: 1,
      status: 'online',
      messages: [
        {
          id: 1,
          text: 'Welcome to ElderX! We\'re here to help with any questions.',
          sender: 'support',
          timestamp: '3 days ago',
          read: true
        },
        {
          id: 2,
          text: 'Your subscription will renew on January 15th.',
          sender: 'support',
          timestamp: '3 days ago',
          read: false
        }
      ]
    }
  ]);

  const [filteredConversations, setFilteredConversations] = useState(conversations);

  useEffect(() => {
    if (searchTerm) {
      const filtered = conversations.filter(conv => 
        conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: 'patient',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setConversations(prev => prev.map(conv => 
      conv.id === selectedChat.id 
        ? {
            ...conv,
            messages: [...conv.messages, message],
            lastMessage: newMessage,
            timestamp: 'Just now'
          }
        : conv
    ));

    setNewMessage('');
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

  const getReadStatus = (message) => {
    if (message.sender === 'patient') {
      return message.read ? <CheckCheck className="h-4 w-4 text-blue-500" /> : <Check className="h-4 w-4 text-gray-400" />;
    }
    return null;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <MessageCircle className="h-6 w-6 text-gray-700 mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedChat(conversation)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedChat?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{conversation.name}</h3>
                    <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{conversation.role}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(selectedChat.status)}`}></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedChat.name}</h3>
                    <p className="text-sm text-gray-500">{selectedChat.role}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'patient' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <div className={`flex items-center justify-between mt-1 ${
                      message.sender === 'patient' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{message.timestamp}</span>
                      {getReadStatus(message)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button type="button" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

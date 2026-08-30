import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Search,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  User
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getConversationsByUser, getMessagesByConversation, sendMessage } from '../api/messagesAPI';
import { toast } from 'react-toastify';

const Messages = () => {
  const { user, userProfile } = useUser();
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Real conversations data
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);

  const [filteredConversations, setFilteredConversations] = useState(conversations);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getConversationsByUser(user.uid)
      .then(data => {
        setConversations(data || []);
        setFilteredConversations(data || []);
      })
      .catch(err => {
        console.error('Error loading conversations:', err);
        toast.error('Could not load conversations');
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = conversations.filter(conv => {
        const term = searchTerm.toLowerCase();
        return (conv.lastMessage || '').toLowerCase().includes(term) ||
               (conv.conversationType || '').toLowerCase().includes(term) ||
               (conv.title || '').toLowerCase().includes(term) ||
               (Array.isArray(conv.participants) && conv.participants.some(p =>
                 (typeof p === 'object' ? (p?.name || p?.displayName || '') : (p || '')).toLowerCase().includes(term)
               ));
      });
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  const handleSelectChat = async (conversation) => {
    setSelectedChat(conversation);
    if (conversation?.id) {
      try {
        const msgs = await getMessagesByConversation(conversation.id);
        setMessages(msgs || []);
      } catch (err) {
        console.error('Error loading messages:', err);
        toast.error('Could not load messages');
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!user?.uid || !newMessage.trim() || !selectedChat) return;
    try {
      await sendMessage(selectedChat.id, user.uid, { text: newMessage });
      const message = {
        id: Date.now(),
        text: newMessage,
        senderId: user.uid,
        senderName: userProfile?.name || 'Client',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      // Reload conversations to update lastMessage
      try {
        const updatedConvs = await getConversationsByUser(user.uid);
        setConversations(updatedConvs || []);
        setFilteredConversations(updatedConvs || []);
      } catch (refreshErr) {
        console.error('Error refreshing conversations:', refreshErr);
      }
    } catch (err) {
      toast.error('Failed to send message');
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

  const getReadStatus = (message) => {
    if (message.senderId === user?.uid) {
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
          {loading ? <div className="p-4 text-center text-gray-500">Loading conversations...</div> :
           filteredConversations.length === 0 ? <div className="p-4 text-center text-gray-500">No conversations found</div> : (
            filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleSelectChat(conversation)}
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
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{conversation.conversationType || 'Conversation'}</h3>
                    <span className="text-xs text-gray-500">{conversation.lastMessageTime || ''}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{conversation.conversationType || ''}</p>
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
          ))
        )}
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
                    <h3 className="text-lg font-semibold text-gray-900">{selectedChat.conversationType || 'Conversation'}</h3>
                    <p className="text-sm text-gray-500">{selectedChat.conversationType || ''}</p>
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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === user?.uid
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <div className={`flex items-center justify-between mt-1 ${
                      message.senderId === user?.uid ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{(() => {
                        const ts = message.createdAt || message.timestamp;
                        return ts instanceof Date ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (ts || '');
                      })()}</span>
                      {getReadStatus(message)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
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

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
  User,
  Plus,
  X
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { sendMessage, getOrCreateConversation, subscribeToUserConversations, subscribeToConversationMessages, markConversationAsRead } from '../api/messagesAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { toast } from 'react-toastify';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';
import WebRTCService from '../services/webrtcService';
import { buildConstraints } from '../services/deviceSettingsService';
import { collection, query, where, onSnapshot } from 'backend/database';
import { db } from '../backend/config';

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

  // Call-related state
  const [callService] = useState(() => new CallService());
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [webrtc, setWebrtc] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callConnectionState, setCallConnectionState] = useState(null);
  const signalingUnsubRef = useRef(null);
  const callStatusUnsubRef = useRef(null);
  const callTimeoutRef = useRef(null);

  // New chat dialog
  const [showNewChat, setShowNewChat] = useState(false);
  const [assignedCaregivers, setAssignedCaregivers] = useState([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);

  const messagesEndRef = useRef(null);

  // Canonical account id — conversations.participants stores users.id
  const myId = userProfile?.id || user?.uid;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime conversation list (poll-based shim)
  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToUserConversations(myId, (data) => {
      setConversations(data || []);
      setFilteredConversations(data || []);
      setLoading(false);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [myId]);

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

  const handleSelectChat = (conversation) => {
    setSelectedChat(conversation);
    if (conversation?.id && myId) {
      markConversationAsRead(conversation.id, myId).catch(() => {});
    }
  };

  // Live message feed for the open conversation
  useEffect(() => {
    if (!selectedChat?.id) {
      setMessages([]);
      return;
    }
    setMessages([]);
    const unsubscribe = subscribeToConversationMessages(selectedChat.id, (msgs) => {
      setMessages(msgs || []);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [selectedChat?.id]);

  // ─── Call functionality ───

  // Other participant's details — participant_details is denormalized on the
  // row by the backend ([{id, name, role}]); raw participants are id strings.
  const getOtherParticipant = (conv = selectedChat) => {
    if (!conv || !myId) return null;
    const details = Array.isArray(conv.participantDetails) ? conv.participantDetails : [];
    const other = details.find(p => String(p.id) !== String(myId));
    if (other) return other;
    const rawId = (conv.participants || []).find(p => String(p) !== String(myId));
    return rawId ? { id: rawId, name: conv.title || 'Participant', role: '' } : null;
  };

  const getOtherParticipantId = () => getOtherParticipant()?.id || null;
  const getOtherParticipantName = () => getOtherParticipant()?.name || 'Participant';
  const getOtherParticipantRole = () => getOtherParticipant()?.role || '';

  // Listen for incoming calls
  useEffect(() => {
    const userId = userProfile?.id || userProfile?.uid || user?.uid;
    if (!userId) return;

    const unsubscribe = callService.listenForIncomingCalls(userId, (callNotification) => {
      if (callNotification.status === 'incoming') {
        setIncomingCall({
          callId: callNotification.callId,
          callerId: callNotification.callerId,
          callerName: callNotification.callerName || 'Caller',
          callType: callNotification.callType || 'video',
        });
      } else if (
        // Reject/end notifications are new rows addressed to the caller — the
        // polling shim never reports row *updates*, so this is how the caller
        // learns the other side rejected or hung up.
        (callNotification.status === 'rejected' || callNotification.status === 'ended') &&
        activeCall && callNotification.callId === activeCall.callId
      ) {
        toast.info(callNotification.status === 'rejected' ? 'Call was rejected' : 'Call ended');
        cleanupCall();
        setActiveCall(null);
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [userProfile, user, callService, activeCall]);

  // Shared WebRTC callback wiring for both call directions
  const setupWebrtcCallbacks = (svc) => {
    svc.setCallbacks({
      onLocalStream: (stream) => setLocalStream(stream),
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setCallConnectionState('connected');
      },
      onCallEnded: () => cleanupCall(),
      onCallStateChange: (state) => {
        if (state === 'connected') {
          setCallConnectionState('connected');
        } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
          setCallConnectionState('ended');
        }
      },
    });
  };

  const cleanupCall = () => {
    if (signalingUnsubRef.current) { signalingUnsubRef.current(); signalingUnsubRef.current = null; }
    if (callStatusUnsubRef.current) { callStatusUnsubRef.current(); callStatusUnsubRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); setLocalStream(null); }
    if (remoteStream) { remoteStream.getTracks().forEach(t => t.stop()); setRemoteStream(null); }
    if (webrtc) { webrtc.endCall().catch(() => {}); setWebrtc(null); }
    setCallConnectionState(null);
  };

  // Initiate an outgoing call — call record + notification + WebRTC offer
  const handleStartCall = async (callType = 'video') => {
    const recipientId = getOtherParticipantId();
    if (!recipientId) {
      toast.error('No recipient available to call');
      return;
    }

    const callerId = myId;
    const callerName = userProfile?.name || userProfile?.displayName || 'Client';
    const recipientName = getOtherParticipantName();

    try {
      // 1. Call record + notification to the recipient
      const result = await callService.initiateCall({
        callerId,
        recipientId,
        callType,
        callerName,
        recipientName,
      });

      // 2. WebRTC peer + media + offer over the signaling channel
      const svc = new WebRTCService();
      await svc.initialize();
      setupWebrtcCallbacks(svc);
      svc.callId = result.callId;
      svc.isInitiator = true;
      await svc.getUserMedia(buildConstraints(callType));
      const offer = await svc.peerConnection.createOffer();
      await svc.peerConnection.setLocalDescription(offer);
      await svc.sendSignalingMessage('offer', { offer, callType });

      // 3. Listen for the answer + ICE candidates
      signalingUnsubRef.current = svc.listenForSignaling(result.callId, async (msg) => {
        try {
          if (msg.type === 'answer') {
            // Clear the ring timeout — the callee picked up
            if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
            await svc.handleAnswer(msg.data.answer);
          }
          else if (msg.type === 'ice-candidate') await svc.handleIceCandidate(msg.data.candidate);
          else if (msg.type === 'reject') { toast.info(`${recipientName} rejected the call`); cleanupCall(); setActiveCall(null); }
        } catch (e) { console.error('Signaling handler error:', e); }
      });

      // (The calls-row status watcher was removed — the polling shim only
      // reports new docs via docChanges(), so row updates never fire.
      // Reject/end reach the caller through callNotifications instead.)

      // 5. Ring timeout
      callTimeoutRef.current = setTimeout(() => {
        toast.info(`${recipientName} did not answer`);
        cleanupCall();
        setActiveCall(null);
      }, 45000);

      setWebrtc(svc);
      setActiveCall({
        callId: result.callId,
        participantId: recipientId,
        participantName: recipientName,
        callType,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please try again.');
      cleanupCall();
    }
  };

  // Accept an incoming call — answer + signaling listener
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      const userId = myId;
      await callService.answerCall(incomingCall.callId, userId);

      const svc = new WebRTCService();
      await svc.initialize();
      setupWebrtcCallbacks(svc);
      await svc.answerCall(incomingCall.callId, incomingCall.callType);

      signalingUnsubRef.current = svc.listenForSignaling(incomingCall.callId, async (msg) => {
        try {
          if (msg.type === 'offer') await svc.handleOffer(msg.data.offer, incomingCall.callType);
          else if (msg.type === 'ice-candidate') await svc.handleIceCandidate(msg.data.candidate);
        } catch (e) { console.error('Signaling handler error:', e); }
      });

      setWebrtc(svc);
      setActiveCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: incomingCall.callerName || 'Caller',
        callType: incomingCall.callType,
      });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      cleanupCall();
    }
  };

  // Reject an incoming call
  const handleRejectCall = async () => {
    if (!incomingCall) return;
    try {
      const userId = myId;
      await callService.rejectCall(incomingCall.callId, userId);
      setIncomingCall(null);
      toast.info('Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      setIncomingCall(null);
    }
  };

  // End the active call
  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await callService.endCall(activeCall.callId, 0);
    } catch (error) {
      console.error('Error ending call:', error);
    }
    callService.cleanupSignalingRecords(activeCall.callId).catch(() => {});
    callService.cleanupCallNotifications(activeCall.callId).catch(() => {});
    cleanupCall();
    setActiveCall(null);
    toast.info('Call ended');
  };

  // ─── New chat functionality ───

  // Load assigned caregivers for the "New Chat" dialog
  const handleOpenNewChat = async () => {
    setShowNewChat(true);
    if (assignedCaregivers.length > 0) return; // already loaded

    const patientId = userProfile?.id || userProfile?.uid || user?.uid;
    if (!patientId) return;

    setLoadingCaregivers(true);
    try {
      // Backend scopes results to the authenticated patient/client.
      // Assignments link any staff role (caregiver/nurse/doctor) via caregiver_id.
      const assignments = await assignmentAPI.getAssignmentsByClient();
      const seen = new Set();
      const caregivers = (assignments || [])
        .map(a => ({
          id: a.caregiverId || a.caregiver_id,
          name: a.caregiverName || a.caregiver_name || 'Staff Member',
          role: a.assignedToRole || a.assigned_to_role || a.caregiverRole || a.role || 'caregiver',
        }))
        .filter(c => {
          if (!c.id || c.id === patientId || seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
      setAssignedCaregivers(caregivers);
    } catch (err) {
      console.error('Error loading caregivers:', err);
      toast.error('Could not load your assigned caregivers');
    } finally {
      setLoadingCaregivers(false);
    }
  };

  // Start a new conversation with a caregiver
  const handleStartNewChat = async (caregiver) => {
    const clientId = userProfile?.id || userProfile?.uid || user?.uid;
    if (!clientId || !caregiver?.id) return;

    try {
      const conversation = await getOrCreateConversation(clientId, caregiver.id, 'general');
      // Add to conversations list and select it
      const newConv = {
        id: conversation.id,
        participants: [clientId, caregiver.id],
        participantDetails: [
          { id: clientId, name: userProfile?.name || 'Me', role: 'client' },
          { id: caregiver.id, name: caregiver.name, role: caregiver.role },
        ],
        conversationType: 'general',
        lastMessage: '',
        lastMessageTime: new Date(),
      };
      setConversations(prev => [newConv, ...prev]);
      setFilteredConversations(prev => [newConv, ...prev]);
      handleSelectChat(newConv);
      setShowNewChat(false);
      toast.success(`Chat started with ${caregiver.name}`);
    } catch (err) {
      console.error('Error starting new chat:', err);
      toast.error('Failed to start conversation');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!myId || !newMessage.trim() || !selectedChat) return;
    try {
      await sendMessage(selectedChat.id, myId, { text: newMessage });
      const message = {
        id: `local-${Date.now()}`,
        text: newMessage,
        senderId: myId,
        senderName: userProfile?.name || 'Me',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
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
    if (message.senderId === myId) {
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-gray-700 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            </div>
            <button
              onClick={handleOpenNewChat}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Start a new conversation"
            >
              <Plus className="h-5 w-5" />
            </button>
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
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{getOtherParticipant(conversation)?.name || conversation.title || 'Conversation'}</h3>
                    <span className="text-xs text-gray-500">{conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1 capitalize">{getOtherParticipant(conversation)?.role || ''}</p>
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
                    <h3 className="text-lg font-semibold text-gray-900">{getOtherParticipantName()}</h3>
                    <p className="text-sm text-gray-500 capitalize">{getOtherParticipantRole()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStartCall('audio')}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Voice Call"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleStartCall('video')}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Video Call"
                  >
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
                  className={`flex ${message.senderId === myId ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === myId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.senderId !== myId && (
                      <p className="text-xs font-medium text-gray-500 mb-0.5">{getOtherParticipantName()}</p>
                    )}
                    <p className="text-sm">{message.text || message.content}</p>
                    <div className={`flex items-center justify-between mt-1 ${
                      message.senderId === myId ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{(() => {
                        const ts = message.createdAt || message.timestamp;
                        const d = ts instanceof Date ? ts : new Date(ts);
                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

      {/* Incoming Call Interface */}
      {incomingCall && (
        <CallInterface
          isOpen={!!incomingCall}
          onClose={handleRejectCall}
          callId={incomingCall.callId}
          callType={incomingCall.callType}
          participantInfo={{
            id: incomingCall.callerId,
            name: incomingCall.callerName || 'Caller',
          }}
          isIncoming={true}
          onCallAccepted={handleAcceptCall}
          onCallRejected={handleRejectCall}
        />
      )}

      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleEndCall}
          callId={activeCall.callId}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
          }}
          isIncoming={false}
          externalWebrtcService={webrtc}
          externalCallState={callConnectionState}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Start New Chat</h2>
              <button
                onClick={() => setShowNewChat(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {loadingCaregivers ? (
                <div className="text-center py-8 text-gray-500">Loading your caregivers...</div>
              ) : assignedCaregivers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No assigned caregivers found.</p>
                  <p className="text-sm text-gray-400 mt-1">Ask your institution to assign a caregiver to start chatting.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedCaregivers.map((caregiver) => (
                    <button
                      key={caregiver.id}
                      onClick={() => handleStartNewChat(caregiver)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{caregiver.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{String(caregiver.role).replace(/_/g, ' ')}</p>
                      </div>
                      <MessageCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;

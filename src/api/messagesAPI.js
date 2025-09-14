import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const MESSAGES_COLLECTION = 'messages';
const CONVERSATIONS_COLLECTION = 'conversations';

// Create a conversation between users
export const createConversation = async (participants, conversationType = 'general') => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const newConversation = {
      participants,
      conversationType, // 'general', 'medical', 'care', 'emergency'
      lastMessage: null,
      lastMessageTime: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(conversationsRef, newConversation);
    return docRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// Get conversations for a user
export const getConversationsByUser = async (userId) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef, 
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const conversations = [];
    querySnapshot.forEach((doc) => {
      const conversationData = doc.data();
      conversations.push({
        id: doc.id,
        ...conversationData,
        lastMessageTime: conversationData.lastMessageTime?.toDate?.() || conversationData.lastMessageTime,
        createdAt: conversationData.createdAt?.toDate?.() || conversationData.createdAt,
        updatedAt: conversationData.updatedAt?.toDate?.() || conversationData.updatedAt,
      });
    });
    
    return conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (user1Id, user2Id, conversationType = 'general') => {
  try {
    // First, try to find existing conversation
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user1Id)
    );
    
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
      const conversationData = doc.data();
      if (conversationData.participants.includes(user2Id)) {
        return { id: doc.id, ...conversationData };
      }
    }
    
    // If no existing conversation, create new one
    return await createConversation([user1Id, user2Id], conversationType);
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (conversationId, senderId, messageData) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const newMessage = {
      ...messageData,
      conversationId,
      senderId,
      read: false,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(messagesRef, newMessage);
    
    // Update conversation's last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, {
      lastMessage: messageData.text || messageData.content,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages for a conversation
export const getMessagesByConversation = async (conversationId, limitCount = 50) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const messages = [];
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      messages.push({
        id: doc.id,
        ...messageData,
        createdAt: messageData.createdAt?.toDate?.() || messageData.createdAt,
      });
    });
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId) => {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      read: true,
      readAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Mark all messages in conversation as read
export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const updatePromises = [];
    
    querySnapshot.forEach((doc) => {
      updatePromises.push(
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        })
      );
    });
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
};

// Get unread message count for a user
export const getUnreadMessageCount = async (userId) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    let unreadCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      // Get conversation to check if user is a participant
      // This is a simplified version - in production, you might want to optimize this
      const conversationRef = doc(db, CONVERSATIONS_COLLECTION, messageData.conversationId);
      // For now, we'll count all unread messages
      if (messageData.senderId !== userId) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    throw error;
  }
};

// Send notification message (system message)
export const sendNotificationMessage = async (conversationId, notificationData) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const newMessage = {
      ...notificationData,
      conversationId,
      senderId: 'system',
      messageType: 'notification',
      read: false,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(messagesRef, newMessage);
    
    // Update conversation's last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, {
      lastMessage: notificationData.text || notificationData.content,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending notification message:', error);
    throw error;
  }
};

// Get messages by type (medical, care, emergency)
export const getMessagesByType = async (userId, messageType) => {
  try {
    // First get conversations where user is participant
    const conversations = await getConversationsByUser(userId);
    const filteredConversations = conversations.filter(conv => conv.conversationType === messageType);
    
    const allMessages = [];
    
    for (const conversation of filteredConversations) {
      const messages = await getMessagesByConversation(conversation.id);
      allMessages.push(...messages);
    }
    
    return allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error fetching messages by type:', error);
    throw error;
  }
};

// Delete message
export const deleteMessage = async (messageId) => {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await deleteDoc(messageRef);
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Real-time listener for messages in a conversation
export const subscribeToConversationMessages = (conversationId, callback) => {
  const messagesRef = collection(db, MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      messages.push({
        id: doc.id,
        ...messageData,
        createdAt: messageData.createdAt?.toDate?.() || messageData.createdAt,
      });
    });
    callback(messages.reverse()); // Return in chronological order
  });
};

// Real-time listener for conversations
export const subscribeToUserConversations = (userId, callback) => {
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(
    conversationsRef, 
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const conversations = [];
    querySnapshot.forEach((doc) => {
      const conversationData = doc.data();
      conversations.push({
        id: doc.id,
        ...conversationData,
        lastMessageTime: conversationData.lastMessageTime?.toDate?.() || conversationData.lastMessageTime,
        createdAt: conversationData.createdAt?.toDate?.() || conversationData.createdAt,
        updatedAt: conversationData.updatedAt?.toDate?.() || conversationData.updatedAt,
      });
    });
    callback(conversations);
  });
};

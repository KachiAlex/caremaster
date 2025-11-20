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

/**
 * Create a conversation between users
 * @param {Array<string>} participants - Array of user IDs participating in the conversation
 * @param {string} conversationType - Type of conversation ('general', 'medical', 'care', 'emergency')
 * @returns {Promise<string>} The ID of the created conversation
 * @throws {Error} If participants array is invalid or creation fails
 */
export const createConversation = async (participants, conversationType = 'general') => {
  try {
    // Validate input parameters
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      throw new Error('Participants must be an array with at least 2 users');
    }
    
    // Check for undefined values in participants
    if (participants.some(id => !id)) {
      throw new Error('All participant IDs must be defined');
    }
    
    console.log('Creating conversation with participants:', participants);
    
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
    console.log('Created conversation with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 * @param {string} userId - The user ID to fetch conversations for
 * @returns {Promise<Array>} Array of conversation objects
 * @throws {Error} If there's an error fetching conversations
 */
export const getConversationsByUser = async (userId) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    
    // Try the optimized query first
    try {
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
    } catch (indexError) {
      console.log('Index not ready, using fallback query');
      
      // Fallback: get all conversations and filter client-side
      const q = query(conversationsRef);
      const querySnapshot = await getDocs(q);
      
      const conversations = [];
      querySnapshot.forEach((doc) => {
        const conversationData = doc.data();
        if (conversationData.participants && conversationData.participants.includes(userId)) {
          conversations.push({
            id: doc.id,
            ...conversationData,
            lastMessageTime: conversationData.lastMessageTime?.toDate?.() || conversationData.lastMessageTime,
            createdAt: conversationData.createdAt?.toDate?.() || conversationData.createdAt,
            updatedAt: conversationData.updatedAt?.toDate?.() || conversationData.updatedAt,
          });
        }
      });
      
      // Sort by lastMessageTime descending
      conversations.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
        return timeB - timeA;
      });
      
      return conversations;
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (user1IdOrArray, user2Id, conversationType = 'general') => {
  try {
    // Handle both array and separate parameters
    let user1Id, finalUser2Id, finalConversationType;
    
    if (Array.isArray(user1IdOrArray)) {
      // Called with array of participants
      [user1Id, finalUser2Id] = user1IdOrArray;
      finalConversationType = user2Id || 'general'; // user2Id is actually conversationType in this case
    } else {
      // Called with separate parameters
      user1Id = user1IdOrArray;
      finalUser2Id = user2Id;
      finalConversationType = conversationType;
    }
    
    // Validate input parameters
    if (!user1Id || !finalUser2Id) {
      throw new Error('Both user1Id and user2Id are required');
    }
    
    console.log('Getting or creating conversation between:', [user1Id, finalUser2Id], 'and', finalConversationType);
    
    // First, try to find existing conversation
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user1Id)
    );
    
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
      const conversationData = doc.data();
      if (conversationData.participants && conversationData.participants.includes(finalUser2Id)) {
        console.log('Found existing conversation:', doc.id);
        return { id: doc.id, ...conversationData };
      }
    }
    
    // If no existing conversation, create new one
    console.log('Creating new conversation between:', [user1Id, finalUser2Id], 'and', finalConversationType);
    const conversationId = await createConversation([user1Id, finalUser2Id], finalConversationType);
    
    // Return the conversation object with the ID
    return {
      id: conversationId,
      participants: [user1Id, finalUser2Id],
      conversationType: finalConversationType,
      lastMessage: null,
      lastMessageTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 * @param {string} conversationId - The conversation ID
 * @param {string} senderId - The ID of the user sending the message
 * @param {Object} messageData - Message data object containing text/content and optional metadata
 * @returns {Promise<string>} The ID of the created message
 * @throws {Error} If conversation ID, sender ID, or message content is missing
 */
export const sendMessage = async (conversationId, senderId, messageData) => {
  try {
    // Validate input parameters
    if (!conversationId || !senderId) {
      throw new Error('Conversation ID and sender ID are required');
    }
    
    if (!messageData || (!messageData.text && !messageData.content)) {
      throw new Error('Message content is required');
    }
    
    console.log('Sending message to conversation:', conversationId, 'from:', senderId);
    
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
    
    console.log('Message sent with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - The conversation ID
 * @param {number} limitCount - Maximum number of messages to retrieve (default: 50)
 * @returns {Promise<Array>} Array of message objects in chronological order
 * @throws {Error} If conversation ID is missing
 */
export const getMessagesByConversation = async (conversationId, limitCount = 50) => {
  try {
    // Validate input parameters
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }
    
    console.log('Fetching messages for conversation:', conversationId);
    
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
    
    console.log('Found', messages.length, 'messages for conversation:', conversationId);
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
    // Query for messages where user is recipient and message is unread
    const q = query(
      messagesRef,
      where('recipientId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    let unreadCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      // Count unread messages where user is the recipient
      if (messageData.recipientId === userId && !messageData.read) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    throw error;
  }
};

/**
 * Get unread message count for a specific conversation
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID to check unread messages for
 * @returns {Promise<number>} Number of unread messages (returns 0 on error)
 */
export const getUnreadCountForConversation = async (conversationId, userId) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    let unreadCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      // Count unread messages where user is not the sender
      if (messageData.senderId !== userId && !messageData.read) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count for conversation:', error);
    return 0; // Return 0 on error to avoid breaking the UI
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
  
  // Try the optimized query first
  try {
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
  } catch (indexError) {
    console.log('Index not ready for real-time listener, using fallback');
    
    // Fallback: listen to all conversations and filter client-side
    const q = query(conversationsRef);
    
    return onSnapshot(q, (querySnapshot) => {
      const conversations = [];
      querySnapshot.forEach((doc) => {
        const conversationData = doc.data();
        if (conversationData.participants && conversationData.participants.includes(userId)) {
          conversations.push({
            id: doc.id,
            ...conversationData,
            lastMessageTime: conversationData.lastMessageTime?.toDate?.() || conversationData.lastMessageTime,
            createdAt: conversationData.createdAt?.toDate?.() || conversationData.createdAt,
            updatedAt: conversationData.updatedAt?.toDate?.() || conversationData.updatedAt,
          });
        }
      });
      
      // Sort by lastMessageTime descending
      conversations.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
        return timeB - timeA;
      });
      
      callback(conversations);
    });
  }
};

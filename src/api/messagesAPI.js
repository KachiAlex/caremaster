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
} from 'backend/database';
import { db } from '../backend/config';

const MESSAGES_COLLECTION = 'messages';
const CONVERSATIONS_COLLECTION = 'conversations';

// Create a conversation between users
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

// Get conversations for a user
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

// Send a message
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

// Get messages for a conversation with pagination support
export const getMessagesByConversation = async (conversationId, limitCount = 50, startAfter = null) => {
  try {
    // Validate input parameters
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }
    
    console.log('Fetching messages for conversation:', conversationId, 'limit:', limitCount);
    
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    let constraints = [
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc'),  // Fetch in ascending order, no need to reverse
      limit(limitCount)
    ];
    
    // Add pagination support if startAfter is provided
    if (startAfter) {
      constraints.push(startAfter);
    }
    
    const q = query(messagesRef, ...constraints);
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
    return messages; // Already in chronological order
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

// Get unread message count for a user across all conversations
export const getUnreadMessageCount = async (userId) => {
  try {
    // Get all conversations where user is participant
    const conversations = await getConversationsByUser(userId);
    let totalUnreadCount = 0;
    
    // Batch query unread counts for all conversations in parallel
    const unreadPromises = conversations.map(conv => 
      getUnreadCountForConversation(conv.id, userId)
    );
    
    const unreadCounts = await Promise.all(unreadPromises);
    totalUnreadCount = unreadCounts.reduce((sum, count) => sum + count, 0);
    
    return totalUnreadCount;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0; // Return 0 on error instead of throwing
  }
};

// Get unread message count for a specific conversation
export const getUnreadCountForConversation = async (conversationId, userId) => {
  try {
    if (!conversationId || !userId) return 0;
    
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    // Query for unread messages in conversation where current user is not sender
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size; // Return document count
  } catch (error) {
    console.warn('Error getting unread count for conversation:', conversationId, error);
    return 0; // Return 0 on error
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

// Get messages by type (medical, care, emergency) with batch loading
export const getMessagesByType = async (userId, messageType, limitPerConversation = 50) => {
  try {
    // First get conversations where user is participant
    const conversations = await getConversationsByUser(userId);
    const filteredConversations = conversations.filter(
      conv => conv.conversationType === messageType && conv.id
    );
    
    if (filteredConversations.length === 0) {
      console.log('No conversations found for type:', messageType);
      return [];
    }
    
    // Batch load messages from all conversations in parallel
    const messagePromises = filteredConversations.map(conversation => 
      getMessagesByConversation(conversation.id, limitPerConversation)
        .catch(err => {
          console.warn(`Failed to fetch messages for conversation ${conversation.id}:`, err);
          return []; // Return empty array for failed conversations
        })
    );
    
    const allMessageArrays = await Promise.all(messagePromises);
    const allMessages = allMessageArrays.flat();
    
    // Sort by createdAt in descending order (most recent first)
    return allMessages.sort((a, b) => {
      const timeA = new Date(b.createdAt).getTime();
      const timeB = new Date(a.createdAt).getTime();
      return timeA - timeB;
    });
  } catch (error) {
    console.error('Error fetching messages by type:', error);
    return []; // Return empty array instead of throwing
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
export const subscribeToConversationMessages = (conversationId, callback, messageLimit = 50) => {
  if (!conversationId) {
    console.error('Conversation ID is required for real-time listener');
    return () => {}; // Return empty unsubscribe function
  }
  
  const messagesRef = collection(db, MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc'),  // Ascending so no need to reverse
    limit(messageLimit)
  );
  
  return onSnapshot(
    q, 
    (querySnapshot) => {
      const messages = [];
      querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        messages.push({
          id: doc.id,
          ...messageData,
          createdAt: messageData.createdAt?.toDate?.() || messageData.createdAt,
        });
      });
      callback(messages); // Already in chronological order
    },
    (error) => {
      console.error('Real-time listener error for conversation:', conversationId, error);
      // Call callback with empty array on error
      callback([]);
    }
  );
};

// Real-time listener for conversations with optimized query and fallback
export const subscribeToUserConversations = (userId, callback) => {
  if (!userId) {
    console.error('User ID is required for real-time conversation listener');
    return () => {}; // Return empty unsubscribe function
  }
  
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  
  // Helper to process conversations data
  const processConversations = (querySnapshot, isFallback = false) => {
    const conversations = [];
    
    querySnapshot.forEach((doc) => {
      const conversationData = doc.data();
      
      // Filter for current user's conversations
      if (!conversationData.participants?.includes(userId)) {
        return; // Skip conversations user is not in
      }
      
      conversations.push({
        id: doc.id,
        ...conversationData,
        lastMessageTime: conversationData.lastMessageTime?.toDate?.() || conversationData.lastMessageTime,
        createdAt: conversationData.createdAt?.toDate?.() || conversationData.createdAt,
        updatedAt: conversationData.updatedAt?.toDate?.() || conversationData.updatedAt,
      });
    });
    
    // Sort by lastMessageTime descending (most recent first)
    if (isFallback) {
      conversations.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
    }
    
    callback(conversations);
  };
  
  // Try optimized query with proper index
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );
  
  let unsubscribe = null;
  
  return onSnapshot(
    q,
    (querySnapshot) => {
      console.log('Conversations updated via optimized query');
      processConversations(querySnapshot, false);
    },
    (error) => {
      // Check if error is due to missing index
      if (error.message?.includes('index') || error.code === 'permission-denied') {
        console.log('Using fallback listener (missing index or permissions):', error.message);
        
        // Fallback: listen to all conversations and filter client-side
        const fallbackQ = query(conversationsRef);
        
        unsubscribe = onSnapshot(
          fallbackQ,
          (querySnapshot) => {
            console.log('Conversations updated via fallback query');
            processConversations(querySnapshot, true);
          },
          (fallbackError) => {
            console.error('Fallback real-time listener also failed:', fallbackError);
            callback([]); // Return empty list on error
          }
        );
      } else {
        console.error('Real-time listener error:', error);
        callback([]); // Return empty list on error
      }
    }
  );
};

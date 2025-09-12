import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc,
  Timestamp
} from 'firebase/firestore';

export const communicationAPI = {
  // Get all messages with filtering
  getMessages: async (filters = {}) => {
    try {
      let messagesQuery = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.type) {
        messagesQuery = query(messagesQuery, where('type', '==', filters.type));
      }
      
      if (filters.status) {
        messagesQuery = query(messagesQuery, where('status', '==', filters.status));
      }
      
      if (filters.category) {
        messagesQuery = query(messagesQuery, where('category', '==', filters.category));
      }
      
      if (filters.priority) {
        messagesQuery = query(messagesQuery, where('priority', '==', filters.priority));
      }
      
      if (filters.limit) {
        messagesQuery = query(messagesQuery, limit(filters.limit));
      }

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = [];

      messagesSnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Get message by ID
  getMessageById: async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        return {
          id: messageDoc.id,
          ...messageDoc.data(),
          timestamp: messageDoc.data().timestamp?.toDate(),
          createdAt: messageDoc.data().createdAt?.toDate(),
          updatedAt: messageDoc.data().updatedAt?.toDate()
        };
      }
      
      throw new Error('Message not found');
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  },

  // Create new message
  createMessage: async (messageData) => {
    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        ...messageData,
        status: messageData.status || 'draft',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: messageRef.id, success: true };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },

  // Update message
  updateMessage: async (messageId, updates) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  },

  // Delete message
  deleteMessage: async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await deleteDoc(messageRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  // Send message
  sendMessage: async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Mark message as read
  markAsRead: async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'read',
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  },

  // Archive message
  archiveMessage: async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        isArchived: true,
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error archiving message:', error);
      throw error;
    }
  },

  // Star/unstar message
  toggleStar: async (messageId, isStarred) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        isStarred: isStarred,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error toggling star:', error);
      throw error;
    }
  },

  // Get notifications
  getNotifications: async (filters = {}) => {
    try {
      let notificationsQuery = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.type) {
        notificationsQuery = query(notificationsQuery, where('type', '==', filters.type));
      }
      
      if (filters.status) {
        notificationsQuery = query(notificationsQuery, where('status', '==', filters.status));
      }
      
      if (filters.category) {
        notificationsQuery = query(notificationsQuery, where('category', '==', filters.category));
      }
      
      if (filters.isRead !== undefined) {
        notificationsQuery = query(notificationsQuery, where('isRead', '==', filters.isRead));
      }
      
      if (filters.limit) {
        notificationsQuery = query(notificationsQuery, limit(filters.limit));
      }

      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notifications = [];

      notificationsSnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Create notification
  createNotification: async (notificationData) => {
    try {
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: notificationRef.id, success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async () => {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('isRead', '==', false)
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const updatePromises = [];
      
      notificationsSnapshot.forEach((doc) => {
        updatePromises.push(
          updateDoc(doc.ref, {
            isRead: true,
            readAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(updatePromises);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Get message templates
  getTemplates: async (filters = {}) => {
    try {
      let templatesQuery = query(
        collection(db, 'messageTemplates'),
        orderBy('name', 'asc')
      );
      
      if (filters.category) {
        templatesQuery = query(templatesQuery, where('category', '==', filters.category));
      }
      
      if (filters.isActive !== undefined) {
        templatesQuery = query(templatesQuery, where('isActive', '==', filters.isActive));
      }

      const templatesSnapshot = await getDocs(templatesQuery);
      const templates = [];

      templatesSnapshot.forEach((doc) => {
        templates.push({
          id: doc.id,
          ...doc.data(),
          lastUsed: doc.data().lastUsed?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return templates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  // Create template
  createTemplate: async (templateData) => {
    try {
      const templateRef = await addDoc(collection(db, 'messageTemplates'), {
        ...templateData,
        usageCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: templateRef.id, success: true };
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  // Update template
  updateTemplate: async (templateId, updates) => {
    try {
      const templateRef = doc(db, 'messageTemplates', templateId);
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  // Delete template
  deleteTemplate: async (templateId) => {
    try {
      const templateRef = doc(db, 'messageTemplates', templateId);
      await deleteDoc(templateRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  // Use template (increment usage count)
  useTemplate: async (templateId) => {
    try {
      const templateRef = doc(db, 'messageTemplates', templateId);
      const templateDoc = await getDoc(templateRef);
      
      if (templateDoc.exists()) {
        const currentUsage = templateDoc.data().usageCount || 0;
        await updateDoc(templateRef, {
          usageCount: currentUsage + 1,
          lastUsed: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { success: true };
      }
      
      throw new Error('Template not found');
    } catch (error) {
      console.error('Error using template:', error);
      throw error;
    }
  },

  // Get campaigns
  getCampaigns: async (filters = {}) => {
    try {
      let campaignsQuery = query(
        collection(db, 'campaigns'),
        orderBy('createdAt', 'desc')
      );
      
      if (filters.status) {
        campaignsQuery = query(campaignsQuery, where('status', '==', filters.status));
      }
      
      if (filters.category) {
        campaignsQuery = query(campaignsQuery, where('category', '==', filters.category));
      }
      
      if (filters.targetAudience) {
        campaignsQuery = query(campaignsQuery, where('targetAudience', '==', filters.targetAudience));
      }

      const campaignsSnapshot = await getDocs(campaignsQuery);
      const campaigns = [];

      campaignsSnapshot.forEach((doc) => {
        campaigns.push({
          id: doc.id,
          ...doc.data(),
          scheduledDate: doc.data().scheduledDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return campaigns;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  // Create campaign
  createCampaign: async (campaignData) => {
    try {
      const campaignRef = await addDoc(collection(db, 'campaigns'), {
        ...campaignData,
        status: 'draft',
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: campaignRef.id, success: true };
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  },

  // Update campaign
  updateCampaign: async (campaignId, updates) => {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  },

  // Delete campaign
  deleteCampaign: async (campaignId) => {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      await deleteDoc(campaignRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  },

  // Schedule campaign
  scheduleCampaign: async (campaignId, scheduledDate) => {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        status: 'scheduled',
        scheduledDate: Timestamp.fromDate(new Date(scheduledDate)),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      throw error;
    }
  },

  // Send campaign
  sendCampaign: async (campaignId) => {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);
      
      if (campaignDoc.exists()) {
        const campaignData = campaignDoc.data();
        
        // Update campaign status
        await updateDoc(campaignRef, {
          status: 'sent',
          sentAt: serverTimestamp(),
          sentCount: campaignData.recipientCount,
          updatedAt: serverTimestamp()
        });
        
        // Create individual messages for each recipient
        // This would typically involve getting the recipient list and creating messages
        // For now, we'll just update the campaign status
        
        return { success: true };
      }
      
      throw new Error('Campaign not found');
    } catch (error) {
      console.error('Error sending campaign:', error);
      throw error;
    }
  },

  // Get campaign analytics
  getCampaignAnalytics: async (campaignId) => {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);
      
      if (campaignDoc.exists()) {
        const campaignData = campaignDoc.data();
        
        // Calculate engagement metrics
        const openRate = campaignData.sentCount > 0 ? (campaignData.openedCount / campaignData.sentCount) * 100 : 0;
        const clickRate = campaignData.sentCount > 0 ? (campaignData.clickedCount / campaignData.sentCount) * 100 : 0;
        
        return {
          id: campaignDoc.id,
          ...campaignData,
          openRate: Math.round(openRate * 10) / 10,
          clickRate: Math.round(clickRate * 10) / 10,
          scheduledDate: campaignData.scheduledDate?.toDate(),
          sentAt: campaignData.sentAt?.toDate(),
          createdAt: campaignData.createdAt?.toDate(),
          updatedAt: campaignData.updatedAt?.toDate()
        };
      }
      
      throw new Error('Campaign not found');
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  },

  // Send bulk notification
  sendBulkNotification: async (notificationData, recipientIds) => {
    try {
      const notificationPromises = recipientIds.map(recipientId => 
        addDoc(collection(db, 'notifications'), {
          ...notificationData,
          recipientId,
          isRead: false,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
      
      await Promise.all(notificationPromises);
      return { success: true, sentCount: recipientIds.length };
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  },

  // Get communication statistics
  getCommunicationStats: async (dateRange = {}) => {
    try {
      const stats = {
        totalMessages: 0,
        unreadMessages: 0,
        totalNotifications: 0,
        unreadNotifications: 0,
        activeCampaigns: 0,
        totalTemplates: 0
      };

      // Get message stats
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      stats.totalMessages = messagesSnapshot.size;
      
      const unreadMessagesQuery = query(
        collection(db, 'messages'),
        where('status', '==', 'unread')
      );
      const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
      stats.unreadMessages = unreadMessagesSnapshot.size;

      // Get notification stats
      const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
      stats.totalNotifications = notificationsSnapshot.size;
      
      const unreadNotificationsQuery = query(
        collection(db, 'notifications'),
        where('isRead', '==', false)
      );
      const unreadNotificationsSnapshot = await getDocs(unreadNotificationsQuery);
      stats.unreadNotifications = unreadNotificationsSnapshot.size;

      // Get campaign stats
      const activeCampaignsQuery = query(
        collection(db, 'campaigns'),
        where('status', 'in', ['scheduled', 'sent'])
      );
      const activeCampaignsSnapshot = await getDocs(activeCampaignsQuery);
      stats.activeCampaigns = activeCampaignsSnapshot.size;

      // Get template stats
      const templatesSnapshot = await getDocs(collection(db, 'messageTemplates'));
      stats.totalTemplates = templatesSnapshot.size;

      return stats;
    } catch (error) {
      console.error('Error fetching communication stats:', error);
      throw error;
    }
  },

  // Subscribe to messages
  subscribeToMessages: (callback, filters = {}) => {
    let messagesQuery = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc')
    );
    
    if (filters.type) {
      messagesQuery = query(messagesQuery, where('type', '==', filters.type));
    }
    
    if (filters.status) {
      messagesQuery = query(messagesQuery, where('status', '==', filters.status));
    }
    
    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(messages);
    });
  },

  // Subscribe to notifications
  subscribeToNotifications: (callback, filters = {}) => {
    let notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc')
    );
    
    if (filters.isRead !== undefined) {
      notificationsQuery = query(notificationsQuery, where('isRead', '==', filters.isRead));
    }
    
    return onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(notifications);
    });
  }
};

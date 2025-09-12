import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bell, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  RefreshCw,
  Star,
  Archive,
  Reply,
  Forward,
  Attachment,
  Image,
  FileText,
  Video,
  Mic,
  Smile,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  User,
  UserCheck,
  Heart,
  Shield,
  Activity
} from 'lucide-react';

const AdminCommunication = () => {
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    inbox: true,
    sent: false,
    drafts: false,
    archived: false
  });

  useEffect(() => {
    loadCommunicationData();
  }, []);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockMessages = [
          {
            id: 1,
            type: 'inbox',
            from: 'Adunni Okafor',
            fromEmail: 'adunni@example.com',
            to: 'Admin',
            subject: 'Medication Reminder Issue',
            content: 'Hello, I\'m having trouble receiving my medication reminders. Can you please check my settings?',
            timestamp: '2024-01-20T14:30:00Z',
            status: 'unread',
            priority: 'medium',
            category: 'support',
            attachments: [],
            tags: ['medication', 'reminder', 'technical'],
            replyCount: 0,
            isStarred: false,
            isArchived: false
          },
          {
            id: 2,
            type: 'sent',
            from: 'Admin',
            fromEmail: 'admin@elderx.com',
            to: 'Tunde Adebayo',
            toEmail: 'tunde@example.com',
            subject: 'Caregiver Performance Review',
            content: 'Hi Tunde, your performance this month has been excellent. Keep up the great work!',
            timestamp: '2024-01-20T10:15:00Z',
            status: 'sent',
            priority: 'low',
            category: 'feedback',
            attachments: [],
            tags: ['performance', 'caregiver', 'review'],
            replyCount: 0,
            isStarred: true,
            isArchived: false
          },
          {
            id: 3,
            type: 'inbox',
            from: 'Grace Johnson',
            fromEmail: 'grace@example.com',
            to: 'Admin',
            subject: 'Emergency Contact Update',
            content: 'I need to update my emergency contact information. My daughter\'s phone number has changed.',
            timestamp: '2024-01-19T16:45:00Z',
            status: 'read',
            priority: 'high',
            category: 'emergency',
            attachments: [],
            tags: ['emergency', 'contact', 'update'],
            replyCount: 1,
            isStarred: false,
            isArchived: false
          },
          {
            id: 4,
            type: 'draft',
            from: 'Admin',
            fromEmail: 'admin@elderx.com',
            to: 'All Caregivers',
            toEmail: 'caregivers@elderx.com',
            subject: 'Monthly Training Session',
            content: 'We will be conducting a monthly training session on...',
            timestamp: '2024-01-19T09:00:00Z',
            status: 'draft',
            priority: 'medium',
            category: 'announcement',
            attachments: [],
            tags: ['training', 'caregivers', 'announcement'],
            replyCount: 0,
            isStarred: false,
            isArchived: false
          }
        ];

        const mockNotifications = [
          {
            id: 1,
            type: 'system',
            title: 'System Maintenance Scheduled',
            message: 'Scheduled maintenance will occur on January 25th from 2:00 AM to 4:00 AM',
            timestamp: '2024-01-20T12:00:00Z',
            status: 'unread',
            priority: 'medium',
            category: 'system',
            actionRequired: false,
            isRead: false
          },
          {
            id: 2,
            type: 'emergency',
            title: 'Emergency Alert - Adunni Okafor',
            message: 'Emergency alert triggered by Adunni Okafor. Response time: 3 minutes',
            timestamp: '2024-01-20T11:30:00Z',
            status: 'active',
            priority: 'high',
            category: 'emergency',
            actionRequired: true,
            isRead: false
          },
          {
            id: 3,
            type: 'medication',
            title: 'Medication Compliance Alert',
            message: '12 patients have missed their medication doses today',
            timestamp: '2024-01-20T10:00:00Z',
            status: 'read',
            priority: 'medium',
            category: 'medication',
            actionRequired: true,
            isRead: true
          },
          {
            id: 4,
            type: 'caregiver',
            title: 'New Caregiver Registration',
            message: 'Sarah Williams has completed her registration and is ready for approval',
            timestamp: '2024-01-19T15:20:00Z',
            status: 'read',
            priority: 'low',
            category: 'caregiver',
            actionRequired: true,
            isRead: true
          }
        ];

        const mockTemplates = [
          {
            id: 1,
            name: 'Welcome Message',
            subject: 'Welcome to ElderX - Your Health Companion',
            content: 'Dear {{name}}, welcome to ElderX! We\'re excited to be part of your health journey...',
            category: 'welcome',
            variables: ['name', 'email'],
            usageCount: 45,
            lastUsed: '2024-01-15T10:00:00Z',
            isActive: true
          },
          {
            id: 2,
            name: 'Medication Reminder',
            subject: 'Medication Reminder - {{medicationName}}',
            content: 'Hello {{name}}, this is a reminder to take your {{medicationName}} at {{time}}...',
            category: 'medication',
            variables: ['name', 'medicationName', 'time'],
            usageCount: 234,
            lastUsed: '2024-01-20T08:00:00Z',
            isActive: true
          },
          {
            id: 3,
            name: 'Emergency Contact',
            subject: 'Emergency Alert - {{patientName}}',
            content: 'EMERGENCY ALERT: {{patientName}} has triggered an emergency alert at {{time}}...',
            category: 'emergency',
            variables: ['patientName', 'time', 'location'],
            usageCount: 12,
            lastUsed: '2024-01-20T11:30:00Z',
            isActive: true
          },
          {
            id: 4,
            name: 'Caregiver Feedback',
            subject: 'Monthly Performance Review - {{caregiverName}}',
            content: 'Hi {{caregiverName}}, here is your monthly performance review...',
            category: 'caregiver',
            variables: ['caregiverName', 'rating', 'feedback'],
            usageCount: 67,
            lastUsed: '2024-01-18T14:00:00Z',
            isActive: true
          }
        ];

        const mockCampaigns = [
          {
            id: 1,
            name: 'Monthly Health Check Reminder',
            subject: 'Monthly Health Check Reminder',
            content: 'Dear {{name}}, it\'s time for your monthly health check...',
            status: 'scheduled',
            scheduledDate: '2024-01-25T09:00:00Z',
            recipientCount: 1247,
            sentCount: 0,
            openedCount: 0,
            clickedCount: 0,
            category: 'health',
            targetAudience: 'all_users',
            createdAt: '2024-01-20T10:00:00Z'
          },
          {
            id: 2,
            name: 'Caregiver Training Announcement',
            subject: 'Upcoming Caregiver Training Session',
            content: 'Dear caregivers, we have an upcoming training session...',
            status: 'sent',
            scheduledDate: '2024-01-18T14:00:00Z',
            recipientCount: 89,
            sentCount: 89,
            openedCount: 67,
            clickedCount: 23,
            category: 'training',
            targetAudience: 'caregivers',
            createdAt: '2024-01-17T16:00:00Z'
          },
          {
            id: 3,
            name: 'System Update Notification',
            subject: 'ElderX Platform Update',
            content: 'We\'ve released new features to improve your experience...',
            status: 'draft',
            scheduledDate: null,
            recipientCount: 0,
            sentCount: 0,
            openedCount: 0,
            clickedCount: 0,
            category: 'announcement',
            targetAudience: 'all_users',
            createdAt: '2024-01-19T11:00:00Z'
          }
        ];

        setMessages(mockMessages);
        setNotifications(mockNotifications);
        setTemplates(mockTemplates);
        setCampaigns(mockCampaigns);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading communication data:', error);
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-purple-100 text-purple-800';
      case 'active':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'support':
        return <MessageSquare className="h-4 w-4" />;
      case 'emergency':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medication':
        return <Heart className="h-4 w-4" />;
      case 'caregiver':
        return <UserCheck className="h-4 w-4" />;
      case 'system':
        return <Shield className="h-4 w-4" />;
      case 'announcement':
        return <Bell className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleMessageAction = (action, message) => {
    setSelectedMessage(message);
    switch (action) {
      case 'view':
        setShowMessageModal(true);
        break;
      case 'reply':
        // Handle reply
        break;
      case 'forward':
        // Handle forward
        break;
      case 'archive':
        // Handle archive
        break;
      case 'delete':
        // Handle delete
        break;
      default:
        break;
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || message.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-gray-600">Manage messages, notifications, and communication campaigns</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowComposeModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </button>
          <button className="btn btn-secondary">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.filter(n => !n.isRead).length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{campaigns.filter(c => c.status === 'sent' || c.status === 'scheduled').length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'messages', name: 'Messages', icon: MessageSquare },
            { id: 'notifications', name: 'Notifications', icon: Bell },
            { id: 'templates', name: 'Templates', icon: FileText },
            { id: 'campaigns', name: 'Campaigns', icon: Send }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          {/* Message Filters */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    className="form-input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  className="form-input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="sent">Sent</option>
                  <option value="draft">Draft</option>
                </select>
                <button className="btn btn-secondary">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </button>
              </div>
            </div>
          </div>

          {/* Message Sections */}
          <div className="space-y-4">
            {/* Inbox */}
            <div className="card">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('inbox')}
              >
                <h2 className="text-lg font-semibold text-gray-900">Inbox ({messages.filter(m => m.type === 'inbox').length})</h2>
                {expandedSections.inbox ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              {expandedSections.inbox && (
                <div className="mt-4 space-y-3">
                  {filteredMessages.filter(m => m.type === 'inbox').map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(message.category)}
                              <span className="font-medium text-gray-900">{message.from}</span>
                              <span className="text-sm text-gray-500">{message.fromEmail}</span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                            <span className={`text-xs ${getPriorityColor(message.priority)}`}>
                              {message.priority} priority
                            </span>
                          </div>
                          <h3 className="text-md font-medium text-gray-900 mb-1">{message.subject}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatDateTime(message.timestamp).date} at {formatDateTime(message.timestamp).time}</span>
                            {message.tags.map((tag, index) => (
                              <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {message.isStarred && <Star className="h-4 w-4 text-yellow-400" />}
                          <button
                            onClick={() => handleMessageAction('view', message)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Message"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMessageAction('reply', message)}
                            className="text-green-600 hover:text-green-800"
                            title="Reply"
                          >
                            <Reply className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMessageAction('archive', message)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Messages */}
            <div className="card">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('sent')}
              >
                <h2 className="text-lg font-semibold text-gray-900">Sent ({messages.filter(m => m.type === 'sent').length})</h2>
                {expandedSections.sent ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              {expandedSections.sent && (
                <div className="mt-4 space-y-3">
                  {filteredMessages.filter(m => m.type === 'sent').map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              <Send className="h-4 w-4" />
                              <span className="font-medium text-gray-900">To: {message.to}</span>
                              <span className="text-sm text-gray-500">{message.toEmail}</span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                          </div>
                          <h3 className="text-md font-medium text-gray-900 mb-1">{message.subject}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatDateTime(message.timestamp).date} at {formatDateTime(message.timestamp).time}</span>
                            {message.tags.map((tag, index) => (
                              <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {message.isStarred && <Star className="h-4 w-4 text-yellow-400" />}
                          <button
                            onClick={() => handleMessageAction('view', message)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Message"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMessageAction('forward', message)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Forward"
                          >
                            <Forward className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drafts */}
            <div className="card">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('drafts')}
              >
                <h2 className="text-lg font-semibold text-gray-900">Drafts ({messages.filter(m => m.type === 'draft').length})</h2>
                {expandedSections.drafts ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              {expandedSections.drafts && (
                <div className="mt-4 space-y-3">
                  {filteredMessages.filter(m => m.type === 'draft').map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              <Edit className="h-4 w-4" />
                              <span className="font-medium text-gray-900">Draft</span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                          </div>
                          <h3 className="text-md font-medium text-gray-900 mb-1">{message.subject}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Last saved: {formatDateTime(message.timestamp).date} at {formatDateTime(message.timestamp).time}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleMessageAction('view', message)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Draft"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMessageAction('delete', message)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Notifications</h2>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className={`border rounded-lg p-4 ${notification.isRead ? 'bg-gray-50' : 'bg-white border-blue-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${notification.category === 'emergency' ? 'bg-red-100' : notification.category === 'system' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {getCategoryIcon(notification.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-md font-medium text-gray-900">{notification.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </span>
                          <span className={`text-xs ${getPriorityColor(notification.priority)}`}>
                            {notification.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatDateTime(notification.timestamp).date} at {formatDateTime(notification.timestamp).time}</span>
                          {notification.actionRequired && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Action Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="h-4 w-4" />
                      </button>
                      {notification.actionRequired && (
                        <button className="btn btn-primary text-sm">
                          Take Action
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Message Templates</h2>
            <button className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-md font-medium text-gray-900">{template.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                <p className="text-sm text-gray-500 mb-3 line-clamp-3">{template.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Used {template.usageCount} times</span>
                  <span>Last used: {formatDateTime(template.lastUsed).date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="btn btn-primary text-sm flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                  <button className="btn btn-secondary text-sm">
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Communication Campaigns</h2>
            <button className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </button>
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-sm text-gray-500">{campaign.subject}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.recipientCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          <div>Opened: {campaign.openedCount}</div>
                          <div>Clicked: {campaign.clickedCount}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.scheduledDate ? formatDateTime(campaign.scheduledDate).date : 'Not scheduled'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedMessage.subject}</h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span><strong>From:</strong> {selectedMessage.from} ({selectedMessage.fromEmail})</span>
                  <span><strong>To:</strong> {selectedMessage.to}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span><strong>Date:</strong> {formatDateTime(selectedMessage.timestamp).date} at {formatDateTime(selectedMessage.timestamp).time}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
                {selectedMessage.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Tags:</span>
                    {selectedMessage.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </button>
                <button className="btn btn-secondary">
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommunication;

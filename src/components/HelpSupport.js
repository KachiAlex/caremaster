import React, { useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  Book,
  Video,
  Mail,
  Phone,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Lightbulb,
  Clock,
  Shield,
  AlertCircle,
  Zap
} from 'lucide-react';
import { db } from '../backend/config';
import { collection, addDoc, serverTimestamp } from 'backend/database';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';

/**
 * HelpSupport Component
 * 
 * Comprehensive help and support system for all users
 * Features:
 * - FAQ section
 * - Contact support form
 * - Video tutorials
 * - Documentation links
 * - Quick tips
 */

const HelpSupport = ({ userRole }) => {
  const { user, userProfile } = useUser();
  const [activeSection, setActiveSection] = useState('faq');
  const [expandedFaq, setExpandedFaq] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [supportForm, setSupportForm] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const faqs = [
    {
      id: 1,
      question: 'How do I log activities for a client?',
      answer: 'Go to your dashboard, click on the "Activities" tab, select a client, and use the toggle switches to mark activities as Complete, Skip, or Issue. Each activity is automatically timestamped and logged.',
      category: 'activities',
      roles: ['caregiver', 'doctor', 'nurse']
    },
    {
      id: 2,
      question: 'How do I view my work hours and earnings?',
      answer: 'Your admin can view your hours and earnings in the Wage Management section. All logged activities are automatically tracked with duration estimates for accurate wage calculation.',
      category: 'wages',
      roles: ['caregiver', 'doctor', 'nurse']
    },
    {
      id: 3,
      question: 'How do I update my profile picture and information?',
      answer: 'Click the purple "Profile" button in the top-right corner of your dashboard. You can upload a profile picture, update your name, phone number, address, and other personal details.',
      category: 'profile',
      roles: ['all']
    },
    {
      id: 4,
      question: 'How do I assign a caregiver to a client?',
      answer: 'Go to the Clients tab, select a client, and click "Assign Task". Choose the caregiver, fill in the assignment details including schedule information and comments (required), then click "Create Assignment".',
      category: 'assignments',
      roles: ['admin']
    },
    {
      id: 5,
      question: 'How do I archive or restore a client?',
      answer: 'To archive: Open the client details and click "Archive Client". To restore: Go to the "Archived Clients" tab in the admin dashboard, find the client, and click "Restore".',
      category: 'clients',
      roles: ['admin']
    },
    {
      id: 6,
      question: 'How do I set or change wage rates for caregivers?',
      answer: 'Go to the Wage Management tab, select a caregiver from the list, click "Edit Rate", choose hourly or monthly payment type, enter the rate, and click "Save".',
      category: 'wages',
      roles: ['admin']
    },
    {
      id: 7,
      question: 'How do I view all activities for a client?',
      answer: 'Open the client details from the Clients tab, then navigate to the "Activity Timeline" tab to see a complete history of all activities, care logs, medical reports, and assignments.',
      category: 'activities',
      roles: ['admin', 'doctor', 'nurse']
    },
    {
      id: 8,
      question: 'How do I change my password?',
      answer: 'Click the "Profile" button, go to the "Security" tab, enter your current password, your new password twice, and click "Change Password".',
      category: 'profile',
      roles: ['all']
    },
    {
      id: 9,
      question: 'How do I create a medical report?',
      answer: 'Open the client details, go to the "Medical Reports" tab, click "Add Doctor Report" or "Add Nurse Report", fill in the details, and submit.',
      category: 'medical',
      roles: ['doctor', 'nurse', 'admin']
    },
    {
      id: 10,
      question: 'How does the scheduling system work?',
      answer: 'The scheduling system allows you to assign caregivers to clients with specific dates, start times, end times, and required comments. You can view schedules in the Scheduling tab with day, week, or month views.',
      category: 'scheduling',
      roles: ['admin']
    }
  ];

  const videoTutorials = [
    {
      title: 'Getting Started with Care Master',
      description: 'Learn the basics of navigating the platform',
      duration: '5 min',
      url: '#',
      thumbnail: '🎬'
    },
    {
      title: 'Logging ADL Activities',
      description: 'How to use the ADL Logger for daily activities',
      duration: '3 min',
      url: '#',
      thumbnail: '📝'
    },
    {
      title: 'Managing Client Care Plans',
      description: 'Creating and updating comprehensive care plans',
      duration: '7 min',
      url: '#',
      thumbnail: '🏥'
    },
    {
      title: 'Wage Management System',
      description: 'Understanding how wages are calculated',
      duration: '4 min',
      url: '#',
      thumbnail: '💰'
    }
  ];

  const quickTips = [
    {
      icon: Lightbulb,
      tip: 'Use keyboard shortcuts: Press "?" to see all available shortcuts',
      color: 'yellow'
    },
    {
      icon: Clock,
      tip: 'All activities are automatically timestamped for accurate wage calculations',
      color: 'blue'
    },
    {
      icon: FileText,
      tip: 'Export any report to CSV for use in spreadsheets or payroll systems',
      color: 'green'
    },
    {
      icon: Search,
      tip: 'Use the search function in activity timelines to quickly find specific events',
      color: 'purple'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = faq.roles.includes('all') || 
      faq.roles.includes(userRole);
    
    return matchesSearch && matchesRole;
  });

  const toggleFaq = (faqId) => {
    const newExpanded = new Set(expandedFaq);
    if (newExpanded.has(faqId)) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
    }
    setExpandedFaq(newExpanded);
  };

  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);

      const supportTicket = {
        userId: user?.uid,
        userName: userProfile?.name || userProfile?.fullName || user?.email,
        userEmail: userProfile?.email || user?.email,
        userRole: userRole,
        subject: supportForm.subject,
        category: supportForm.category,
        priority: supportForm.priority,
        message: supportForm.message,
        status: 'open',
        createdAt: serverTimestamp(),
        institutionId: userProfile?.institutionId || null
      };

      await addDoc(collection(db, 'supportTickets'), supportTicket);

      toast.success('Support ticket submitted! We\'ll get back to you soon.');
      setSupportForm({
        subject: '',
        category: 'general',
        priority: 'normal',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error('Failed to submit support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <HelpCircle className="h-8 w-8 mr-3 text-purple-600" />
          Help & Support
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Find answers, watch tutorials, and get help when you need it
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'faq', label: 'FAQ', icon: HelpCircle },
            { id: 'tutorials', label: 'Tutorials', icon: Video },
            { id: 'contact', label: 'Contact Support', icon: MessageCircle },
            { id: 'docs', label: 'Documentation', icon: Book }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeSection === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* FAQ Section */}
      {activeSection === 'faq' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search frequently asked questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Quick Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div key={index} className={`bg-${tip.color}-50 border border-${tip.color}-200 rounded-lg p-4 flex items-start`}>
                  <Icon className={`h-5 w-5 text-${tip.color}-600 mr-3 flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm text-${tip.color}-800`}>{tip.tip}</p>
                </div>
              );
            })}
          </div>

          {/* FAQs */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No FAQs found matching your search</p>
              </div>
            ) : (
              filteredFaqs.map(faq => {
                const isExpanded = expandedFaq.has(faq.id);
                return (
                  <div key={faq.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                        <p className="text-gray-700">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tutorials Section */}
      {activeSection === 'tutorials' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Video Tutorials</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videoTutorials.map((video, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-6xl">
                  {video.thumbnail}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{video.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{video.duration}</span>
                    <button className="flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Watch Tutorial
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support Section */}
      {activeSection === 'contact' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit a Support Ticket</h3>
              
              <form onSubmit={handleSubmitSupport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={supportForm.category}
                      onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="general">General Question</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="account">Account & Access</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={supportForm.priority}
                      onChange={(e) => setSupportForm({ ...supportForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Please describe your issue or question in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 font-medium"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Ticket
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Email Support</p>
                      <a href="mailto:support@Care Master.com" className="text-sm text-purple-600 hover:text-purple-700">
                        support@Care Master.com
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Response within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Phone Support</p>
                      <a href="tel:+1-800-Care Master" className="text-sm text-purple-600 hover:text-purple-700">
                        +1 (800) Care Master
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Mon-Fri, 9AM-5PM EST</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MessageCircle className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Live Chat</p>
                      <button className="text-sm text-purple-600 hover:text-purple-700">
                        Start Chat
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Available 24/7</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 mb-2">Need urgent help?</h4>
                <p className="text-sm text-green-800 mb-3">
                  For emergencies or urgent technical issues, call our emergency support line:
                </p>
                <a 
                  href="tel:+1-800-URGENT"
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  +1 (800) URGENT
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documentation Section */}
      {activeSection === 'docs' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Documentation & Guides</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'User Guide', description: 'Complete user manual', icon: Book, color: 'blue' },
              { title: 'Admin Guide', description: 'Admin dashboard handbook', icon: Shield, color: 'purple' },
              { title: 'API Documentation', description: 'Developer resources', icon: FileText, color: 'green' },
              { title: 'Security Guide', description: 'Best practices for security', icon: Shield, color: 'red' },
              { title: 'Troubleshooting', description: 'Common issues and solutions', icon: AlertCircle, color: 'yellow' },
              { title: 'Release Notes', description: 'Latest updates and features', icon: Zap, color: 'indigo' }
            ].map((doc, index) => {
              const Icon = doc.icon;
              return (
                <button
                  key={index}
                  className={`bg-${doc.color}-50 border border-${doc.color}-200 rounded-lg p-6 hover:shadow-md transition-shadow text-left`}
                >
                  <Icon className={`h-8 w-8 text-${doc.color}-600 mb-3`} />
                  <h4 className="font-semibold text-gray-900 mb-1">{doc.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                  <span className={`text-sm text-${doc.color}-600 hover:text-${doc.color}-700 flex items-center font-medium`}>
                    Read More
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;


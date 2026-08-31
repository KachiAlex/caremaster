import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  LayoutDashboard,
  Users,
  Calendar,
  Heart,
  Video,
  Pill,
  FileText,
  MessageCircle,
  Phone,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';

const SUPPORT_EMAIL = 'support@getcaremaster.com';

/**
 * ClientPortalHelp — Help & Support page for the client portal.
 *
 * Shows only:
 *   1. FAQ — step-by-step directions for using every feature of the client portal
 *   2. Support email — for contacting the Care Master team
 */
const ClientPortalHelp = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(new Set());

  const faqs = [
    // ─── Dashboard ───
    {
      id: 'dashboard-overview',
      icon: LayoutDashboard,
      category: 'Dashboard',
      question: 'What can I do on the My Dashboard page?',
      answer:
        'The My Dashboard page is your home base. It shows a summary of your health at a glance — upcoming appointments, recent vital signs, active medications, and any emergency alerts. You can quickly jump to any section from here using the sidebar tabs.',
    },
    {
      id: 'dashboard-emergency',
      icon: AlertCircle,
      category: 'Dashboard',
      question: 'How do I send an emergency alert?',
      answer:
        'On the My Dashboard page, look for the Emergency section. Click the "Send Emergency Alert" button, add an optional note describing the situation, and confirm. Your care team will be notified immediately. Use this only for genuine emergencies.',
    },

    // ─── My Care Team ───
    {
      id: 'care-team-view',
      icon: Users,
      category: 'My Care Team',
      question: 'How do I see who is on my care team?',
      answer:
        'Click the "My Care Team" tab in the sidebar. You will see a list of all caregivers, doctors, and nurses assigned to you by your institution, along with their roles and contact information.',
    },
    {
      id: 'care-team-contact',
      icon: MessageCircle,
      category: 'My Care Team',
      question: 'How do I contact someone from my care team?',
      answer:
        'Go to "My Care Team" to see your assigned caregivers. To message them, switch to the "Messages" tab, click the "+" button, and select the caregiver you want to chat with. You can also start a voice or video call from within a conversation.',
    },

    // ─── Care Appointments ───
    {
      id: 'appointments-view',
      icon: Calendar,
      category: 'Care Appointments',
      question: 'How do I view my upcoming appointments?',
      answer:
        'Click the "Care Appointments" tab. You will see a list of all your scheduled appointments, including the date, time, doctor or caregiver, and status. Completed appointments are also shown for your records.',
    },
    {
      id: 'appointments-request',
      icon: Calendar,
      category: 'Care Appointments',
      question: 'Can I request a new appointment?',
      answer:
        'Appointment scheduling is managed by your care team. If you need a new appointment, send a message to your caregiver through the Messages tab, or contact your institution directly. They will schedule it and it will appear in your Care Appointments list.',
    },

    // ─── Health Monitoring ───
    {
      id: 'vitals-view',
      icon: Heart,
      category: 'Health Monitoring',
      question: 'How do I view my vital signs?',
      answer:
        'Click the "Health Monitoring" tab. You will see your recorded vital signs — blood pressure, heart rate, temperature, weight, blood sugar, and oxygen saturation — displayed in easy-to-read cards and charts. Records entered by you are marked with a "Self-reported" badge.',
    },
    {
      id: 'vitals-add',
      icon: Heart,
      category: 'Health Monitoring',
      question: 'How do I record my own vital signs at home?',
      answer:
        'In the "Health Monitoring" tab, click the "Add Vital Signs" button. Fill in the measurements you have (blood pressure, heart rate, temperature, etc.), add an optional note, and click "Save". Your entry will be tagged as "Self-reported" so your care team knows it came from you.',
    },

    // ─── Video Consultations ───
    {
      id: 'telemedicine-join',
      icon: Video,
      category: 'Video Consultations',
      question: 'How do I join a video consultation?',
      answer:
        'Go to the "Video Consultations" tab. Find your scheduled appointment and click "Join Call" when it is time. Make sure you allow camera and microphone access in your browser. You can test your camera and microphone before joining.',
    },
    {
      id: 'telemedicine-schedule',
      icon: Video,
      category: 'Video Consultations',
      question: 'How do I schedule a video consultation?',
      answer:
        'In the "Video Consultations" tab, click "Book Consultation" and select a doctor and a time slot. If no slots are available, message your doctor through the Messages tab to request a time. Once confirmed, the appointment will appear in your list.',
    },

    // ─── Medications ───
    {
      id: 'medications-view',
      icon: Pill,
      category: 'Medications',
      question: 'How do I view my medications?',
      answer:
        'Click the "Medications" tab to see all your current prescriptions — including the medication name, dosage, frequency, start and end dates, and any special instructions from your doctor.',
    },
    {
      id: 'medications-add',
      icon: Pill,
      category: 'Medications',
      question: 'Can I add my own medications?',
      answer:
        'Yes. In the "Medications" tab, click "Add Medication" and fill in the details — medication name, dosage, frequency, and any instructions. Your entry will be tagged as "Self-reported" so your care team can review it. Always inform your doctor about all medications you are taking.',
    },

    // ─── Medical Documents ───
    {
      id: 'documents-view',
      icon: FileText,
      category: 'Medical Documents',
      question: 'What documents can I see in Medical Documents?',
      answer:
        'The "Medical Documents" tab shows three types of records: Prescriptions written by your doctors, Invoices for medical services, and Lab Test results. Each document shows the date, doctor or department, status, and relevant details.',
    },
    {
      id: 'documents-filter',
      icon: FileText,
      category: 'Medical Documents',
      question: 'How do I find a specific document?',
      answer:
        'Use the search bar to search by medication name, doctor name, or description. You can also use the filter dropdown to show only Prescriptions, only Invoices, only Lab Tests, or documents from the last 30 days.',
    },

    // ─── Messages ───
    {
      id: 'messages-start',
      icon: MessageCircle,
      category: 'Messages',
      question: 'How do I start a new conversation?',
      answer:
        'Go to the "Messages" tab and click the "+" button in the top-right of the sidebar. A list of your assigned caregivers will appear — click on one to start a conversation. If no caregivers are listed, ask your institution to assign one.',
    },
    {
      id: 'messages-call',
      icon: Phone,
      category: 'Messages',
      question: 'How do I make a voice or video call from Messages?',
      answer:
        'Open a conversation in the "Messages" tab. In the chat header you will see a phone icon (for voice calls) and a video icon (for video calls). Click either to start a call with the other participant. The call will open in a call interface where you can mute, turn your camera on/off, and end the call.',
    },

    // ─── General ───
    {
      id: 'general-login',
      icon: HelpCircle,
      category: 'General',
      question: 'I forgot my password. How do I reset it?',
      answer:
        'On the login page, click the "Forgot Password?" link. Enter your email address and we will send you a password reset link. If you do not receive the email within a few minutes, check your spam folder, or contact us at ' + SUPPORT_EMAIL + '.',
    },
    {
      id: 'general-profile',
      icon: HelpCircle,
      category: 'General',
      question: 'How do I update my profile information?',
      answer:
        'Click your profile picture or name in the top-right corner of the portal to open your Profile. From there you can update your name, phone number, address, date of birth, and other personal details. Click "Save" when you are done.',
    },
    {
      id: 'general-support',
      icon: Mail,
      category: 'General',
      question: 'How do I contact support?',
      answer:
        'If you need help with anything not covered in this FAQ, email us at ' + SUPPORT_EMAIL + ' and our team will get back to you as soon as possible. Please include your name, a description of the issue, and any error messages you are seeing.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      faq.question.toLowerCase().includes(term) ||
      faq.answer.toLowerCase().includes(term) ||
      faq.category.toLowerCase().includes(term)
    );
  });

  const toggleFaq = (faqId) => {
    const next = new Set(expandedFaq);
    if (next.has(faqId)) next.delete(faqId);
    else next.add(faqId);
    setExpandedFaq(next);
  };

  // Group FAQs by category for display
  const categories = [...new Set(filteredFaqs.map((f) => f.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <HelpCircle className="h-8 w-8 mr-3 text-purple-600" />
          Help &amp; Support
        </h1>
        <p className="text-gray-600 mt-1">
          Learn how to use the Care Master client portal and get help when you need it
        </p>
      </div>

      {/* Support Email Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
            <Mail className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <h3 className="font-semibold text-gray-900">Need help? Email us</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              For any questions or issues, our support team is here to help.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center mt-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Mail className="h-4 w-4 mr-1.5" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search FAQs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* FAQ List grouped by category */}
      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No FAQs found matching your search</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryFaqs = filteredFaqs.filter((f) => f.category === category);
            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  {category}
                </h2>
                <div className="space-y-3">
                  {categoryFaqs.map((faq) => {
                    const Icon = faq.icon || HelpCircle;
                    const isExpanded = expandedFaq.has(faq.id);
                    return (
                      <div
                        key={faq.id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center font-medium text-gray-900 pr-4">
                            <Icon className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" />
                            {faq.question}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                            <p className="text-gray-700 pl-8">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientPortalHelp;

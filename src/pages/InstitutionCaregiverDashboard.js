import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import { useResponsive } from '../hooks';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle,
  Heart,
  User,
  Star,
  Navigation,
  Camera,
  FileText,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  Award,
  Activity,
  Shield,
  Plus,
  Eye,
  Edit,
  Stethoscope,
  Pill,
  Brain,
  FlaskConical,
  Dumbbell,
  UserCheck,
  Home,
  Users,
  CheckSquare,
  ClipboardList,
  BarChart3,
  RefreshCw,
  AlertCircle,
  X,
  Mail,
  Download,
  Receipt,
  HelpCircle,
  Menu
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import UserNameWithAvatar from '../components/UserNameWithAvatar';
import { caregiverAPI } from '../api/caregiverAPI';
import { getCareTasksByCaregiver, getTodayTasks, getUpcomingTasks } from '../api/careTasksAPI';
import { getActiveTasks } from '../api/taskTimeTrackingAPI';
import { getTodaysAppointments, getUpcomingAppointments } from '../api/appointmentsAPI';
import { getClientsByDoctor, getClientById } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { createMedicalReport, getMedicalReportsByClient, updateMedicalReport, deleteMedicalReport, subscribeToMedicalReportsByClient } from '../api/medicalReportsAPI';
import { createCarePlan, getCarePlansByClient, updateCarePlan, deleteCarePlan, subscribeToCarePlansByClient } from '../api/carePlansAPI';
import { createCareLog, getCareLogsByClient, subscribeToCareLogsByClient } from '../api/careLogsAPI';
import InstitutionCaregiverGuard from '../components/InstitutionCaregiverGuard';
import CaregiverSettings from '../components/CaregiverSettings';
import NurseVitalsInput from '../components/NurseVitalsInput';
import NurseCareLogs from '../components/NurseCareLogs';
import NurseReportGenerator from '../components/NurseReportGenerator';
import NurseMedicationManager from '../components/NurseMedicationManager';
import CareLogFormModal from '../components/CareLogFormModal';
import DashboardSwitcher from '../components/DashboardSwitcher';
import { autoFixCurrentUser } from '../utils/fixCaregiverProfile';
import { careLogsAPI } from '../api/careLogsAPI';
import { exportMedicalReportToPDF, exportCarePlanToPDF } from '../utils/pdfExport';
import { getConversationsByUser, getMessagesByConversation, sendMessage as sendMessageAPI, getOrCreateConversation } from '../api/messagesAPI';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { notificationsAPI, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../api/notificationsAPI';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import activitiesAPI, { ACTIVITY_CATEGORIES, COMMON_ACTIVITIES } from '../api/activitiesAPI';
import prescriptionsAPI from '../api/prescriptionsAPI';
import pharmacyAPI from '../api/pharmacyAPI';
import PrescriptionModal from '../components/PrescriptionModal';
import PrescriptionsTabContent from '../components/PrescriptionsTabContent';
import consultationsAPI, { CONSULTATION_TYPES } from '../api/consultationsAPI';
import ConsultationModal from '../components/ConsultationModal';
import ConsultationsTabContent from '../components/ConsultationsTabContent';
import DiagnosticsTab from '../components/DiagnosticsTab';
import { getClientDiagnostics } from '../api/diagnosticsAPI';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';
import PortalSwitcher from '../components/PortalSwitcher';
import WebRTCService from '../services/webrtcService';
import AdlLogger from '../components/AdlLogger';
import UserProfileSettings from '../components/UserProfileSettings';
import HelpSupport from '../components/HelpSupport';

const InstitutionCaregiverDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userProfile, institutionId, institutionData, userRoles } = useUser();
  const { isMobile, isTablet } = useResponsive();
  
  // Get institution ID from URL params or user context
  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId || userProfile?.institutionId;
  
  console.log('🏥 Institution ID resolution:', {
    fromURL: urlInstitutionId,
    fromContext: institutionId,
    fromProfile: userProfile?.institutionId,
    effective: effectiveInstitutionId
  });
  const [caregiver, setCaregiver] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [assignedClients, setAssignedClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showCareLogsModal, setShowCareLogsModal] = useState(false);
  const [showNurseReportModal, setShowNurseReportModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showCareLogForm, setShowCareLogForm] = useState(false);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [clientModalTab, setClientModalTab] = useState('info'); // 'info', 'medical', 'carelog'

  // Debug effect to monitor showCareLogForm state changes
  useEffect(() => {
    console.log('🔍 showCareLogForm state changed:', showCareLogForm);
    if (showCareLogForm && selectedClient) {
      console.log('✅ Modal should be visible for client:', selectedClient.name || selectedClient.fullName);
    }
  }, [showCareLogForm, selectedClient]);

  // Set default tab for pharmacists
  useEffect(() => {
    if (userProfile && (userProfile.userType === 'pharmacist' || userProfile.type === 'pharmacist')) {
      setActiveTab('prescriptions');
    }
  }, [userProfile]);
  
  // Role-specific modals
  const [showMedicalReportModal, setShowMedicalReportModal] = useState(false);
  const [showCarePlanModal, setShowCarePlanModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  
  // Form data states
  const [medicalReportData, setMedicalReportData] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    symptoms: '',
    treatment: '',
    prescriptions: '',
    notes: ''
  });
  
  const [carePlanData, setCarePlanData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    reviewDate: '',
    objectives: '',
    activities: '',
    medicationSchedule: '',
    dietary: '',
    mobility: '',
    specialInstructions: ''
  });
  
  // Data lists for display
  const [medicalReports, setMedicalReports] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [clientPrescriptions, setClientPrescriptions] = useState([]);
  const [clientConsultations, setClientConsultations] = useState([]);
  const [clientDiagnostics, setClientDiagnostics] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Messaging states
  const [conversations, setConversations] = useState([]);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date());
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [platformUsers, setPlatformUsers] = useState([]); // All users on the platform
  
  // Call-related states
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callConnectionState, setCallConnectionState] = useState('connecting'); // Track WebRTC connection state
  const [callService] = useState(() => new CallService());
  const [webrtc] = useState(() => new WebRTCService());
  const [callStartAt, setCallStartAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = React.useRef(null);
  
  // Active tasks (tasks currently in progress with time tracking)
  const [activeTasks, setActiveTasks] = useState([]);
  const [loadingActiveTasks, setLoadingActiveTasks] = useState(false);
  
  // Load active tasks
  const loadActiveTasks = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingActiveTasks(true);
      const tasks = await getActiveTasks(user.uid);
      setActiveTasks(tasks);
    } catch (error) {
      console.error('Error loading active tasks:', error);
    } finally {
      setLoadingActiveTasks(false);
    }
  }, [user?.uid]);
  
  // Load active tasks on mount and when user changes
  useEffect(() => {
    loadActiveTasks();
    // Refresh active tasks every 30 seconds to update timers
    const interval = setInterval(loadActiveTasks, 30000);
    return () => clearInterval(interval);
  }, [loadActiveTasks]);
  
  // Update elapsed time for active tasks every second
  useEffect(() => {
    if (activeTasks.length === 0) return;
    
    const interval = setInterval(() => {
      setActiveTasks(prev => prev.map(task => {
        if (task.taskStartTime) {
          const startTime = task.taskStartTime?.toDate?.() || new Date(task.taskStartTime);
          const now = new Date();
          const elapsedMs = now - startTime;
          const elapsedHours = elapsedMs / (1000 * 60 * 60);
          return {
            ...task,
            elapsedHours: Math.round(elapsedHours * 100) / 100,
            elapsedMinutes: Math.round(elapsedMs / (1000 * 60))
          };
        }
        return task;
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTasks.length]);

  useEffect(() => {
    webrtc.setCallbacks({
      onLocalStream: (stream) => setLocalStream(stream),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onCallStateChange: (state) => {
        console.log('📡 WebRTC connection state:', state);
        setCallConnectionState(state);
        
        if (state === 'connected') {
          console.log('✅ Call connected successfully!');
          if (!callStartAt) {
            const start = new Date();
            setCallStartAt(start);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              setElapsedSeconds(Math.floor((Date.now() - start.getTime()) / 1000));
            }, 1000);
          }
        } else if (state === 'failed' || state === 'disconnected') {
          console.log('❌ Call connection failed or disconnected');
        }
      }
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [webrtc, callStartAt]);
  
  // Activities states
  const [activities, setActivities] = useState([]);
  const [todayActivities, setTodayActivities] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivityCategory, setSelectedActivityCategory] = useState(null);
  const [activityFormData, setActivityFormData] = useState({
    category: '',
    activityType: '',
    description: '',
    notes: '',
    duration: 15,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    clientId: '',
    qualityRating: 5
  });
  
  // Prescription states
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState(null);
  const [prescriptionFormData, setPrescriptionFormData] = useState({
    diagnosis: '',
    notes: '',
    medications: [
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        instructions: '',
        route: 'oral'
      }
    ]
  });
  
  // Consultation states
  const [consultations, setConsultations] = useState([]);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationFormData, setConsultationFormData] = useState({
    consultationType: CONSULTATION_TYPES.REVIEW,
    consultationDate: new Date().toISOString().slice(0, 16),
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    vitalSigns: {},
    followUpRequired: false,
    followUpDate: '',
    followUpNotes: '',
    notes: '',
    privateNotes: '',
    relatedMedicalReports: [],
    relatedCareLogs: []
  });

  // Get qualification-specific dashboard configuration
  const getDashboardConfig = () => {
    // Check userType first for pharmacists, then fall back to medicalQualification
    const userType = userProfile?.userType || userProfile?.type;
    const qualification = userProfile?.medicalQualification || 'Caregiver (Non-Medical)';
    
    // For pharmacists, use userType to get the correct config
    if (userType === 'pharmacist') {
      return {
        title: 'Pharmacist Dashboard',
        icon: Pill,
        color: 'indigo',
        features: ['prescriptions', 'drug-interactions', 'medication-reviews'],
        quickActions: [
          { name: 'Prescription Review', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Drug Interactions', icon: AlertTriangle, href: '/service-provider/diagnostics' },
          { name: 'Medication Consult', icon: MessageSquare, href: '/service-provider/consultations' },
          { name: 'Client Education', icon: FileText, href: '/service-provider/clients' }
        ]
      };
    }
    
    const configs = {
      'Doctor (MD)': {
        title: 'Doctor Dashboard',
        icon: Stethoscope,
        color: 'blue',
        features: ['consultations', 'prescriptions', 'diagnostics', 'referrals', 'telemedicine'],
        quickActions: [
          { name: 'New Consultation', icon: Stethoscope, href: '/service-provider/consultations' },
          { name: 'Write Prescription', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Review Lab Results', icon: FlaskConical, href: '/service-provider/diagnostics' },
          { name: 'Video Consultation', icon: Camera, href: '/service-provider/messages' }
        ]
      },
      'Nurse (RN)': {
        title: 'Nurse Dashboard',
        icon: Heart,
        color: 'red',
        features: ['client-care', 'medications', 'vital-signs', 'care-plans'],
        quickActions: [
          { name: 'Client Rounds', icon: User, href: '/service-provider/clients' },
          { name: 'Medication Admin', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Vital Signs', icon: Activity, href: '/service-provider/diagnostics' },
          { name: 'Care Plans', icon: FileText, href: '/service-provider/care-logs' }
        ]
      },
      'Physiotherapist': {
        title: 'Physiotherapy Dashboard',
        icon: Dumbbell,
        color: 'green',
        features: ['therapy-sessions', 'exercise-plans', 'progress-tracking'],
        quickActions: [
          { name: 'Therapy Sessions', icon: Dumbbell, href: '/service-provider/activities' },
          { name: 'Exercise Plans', icon: FileText, href: '/service-provider/care-logs' },
          { name: 'Progress Notes', icon: TrendingUp, href: '/service-provider/clients' },
          { name: 'Schedule Session', icon: Calendar, href: '/service-provider/schedule' }
        ]
      },
      'Psychologist': {
        title: 'Psychology Dashboard',
        icon: Brain,
        color: 'purple',
        features: ['therapy-sessions', 'assessments', 'treatment-plans'],
        quickActions: [
          { name: 'Therapy Sessions', icon: Brain, href: '/service-provider/consultations' },
          { name: 'Assessments', icon: FileText, href: '/service-provider/diagnostics' },
          { name: 'Treatment Plans', icon: Heart, href: '/service-provider/care-logs' },
          { name: 'Video Therapy', icon: Camera, href: '/service-provider/messages' }
        ]
      },
      'Pharmacist': {
        title: 'Pharmacist Dashboard',
        icon: Pill,
        color: 'indigo',
        features: ['prescriptions', 'drug-interactions', 'medication-reviews'],
        quickActions: [
          { name: 'Prescription Review', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Drug Interactions', icon: AlertTriangle, href: '/service-provider/diagnostics' },
          { name: 'Medication Consult', icon: MessageSquare, href: '/service-provider/consultations' },
          { name: 'Client Education', icon: FileText, href: '/service-provider/clients' }
        ]
      },
      'Lab Technician': {
        title: 'Lab Technician Dashboard',
        icon: FlaskConical,
        color: 'teal',
        features: ['lab-results', 'specimen-collection', 'quality-control'],
        quickActions: [
          { name: 'Lab Results', icon: FlaskConical, href: '/service-provider/diagnostics' },
          { name: 'Collection Schedule', icon: Calendar, href: '/service-provider/schedule' },
          { name: 'Quality Control', icon: Shield, href: '/service-provider/activities' },
          { name: 'Client Reports', icon: FileText, href: '/service-provider/clients' }
        ]
      }
    };

    return configs[qualification] || {
      title: 'Caregiver Dashboard',
      icon: UserCheck,
      color: 'gray',
      features: ['client-care', 'basic-assistance', 'companionship'],
      quickActions: [
        { name: 'Client Care', icon: User, href: '/service-provider/clients' },
        { name: 'Daily Tasks', icon: CheckCircle, href: '/service-provider/tasks' },
        { name: 'Messages', icon: MessageSquare, href: '/service-provider/messages' },
        { name: 'Schedule', icon: Calendar, href: '/service-provider/schedule' }
      ]
    };
  };

  const dashboardConfig = getDashboardConfig();

  // Define role flags at component level for use throughout
  const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor') || 
                    userProfile?.role === 'doctor' || 
                    userProfile?.userType === 'doctor' || 
                    userProfile?.type === 'doctor';
  const isNurse = (userProfile?.medicalQualification || '').includes('Nurse') || 
                  userProfile?.role === 'nurse' || 
                  userProfile?.userType === 'nurse' || 
                  userProfile?.type === 'nurse';
  const isPharmacist = userProfile?.userType === 'pharmacist' || 
                       userProfile?.type === 'pharmacist' || 
                       userProfile?.role === 'pharmacist';
  const isCaregiver = userProfile?.userType === 'caregiver' || userProfile?.type === 'caregiver';
  const isNonMedicalCaregiver = isCaregiver && !isDoctor && !isNurse && !isPharmacist;

  useEffect(() => {
    const loadCaregiverData = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        
        // Validate tab session for role conflicts
        const userRole = userProfile.userType || userProfile.type || userProfile.role;
        const validation = sessionManager.validateTabSession(user, userRole);
        
        if (validation.needsInit) {
          // First load - set tab session
          sessionManager.setTabSession(userRole, user.uid, effectiveInstitutionId);
        } else if (validation.needsUpdate) {
          // Role equivalents detected - update session
          sessionManager.setTabSession(validation.newRole, user.uid, effectiveInstitutionId);
        } else if (!validation.valid) {
          // Session conflict detected
          sessionManager.handleSessionConflict(validation, navigate, toast);
          setLoading(false);
          return;
        }
        
        // Auto-fix profile if institutionId or status is missing
        if (effectiveInstitutionId && (!userProfile.institutionId || !userProfile.status)) {
          console.log('🔄 Auto-fixing caregiver profile with missing fields...');
          await autoFixCurrentUser(user, userProfile, effectiveInstitutionId);
          // Reload page to get updated profile
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
        
        // Load caregiver profile data only if user is a caregiver
        if (userProfile?.userType === 'caregiver') {
          try {
        const caregiverData = await caregiverAPI.getCaregiverById(user?.uid);
        setCaregiver(caregiverData);
          } catch (error) {
            console.log('Creating caregiver profile from user data - this is normal for new users');
            // Create a basic caregiver profile from user profile
            setCaregiver({
              id: user?.uid,
              name: userProfile?.name || userProfile?.displayName || 'Caregiver',
              email: userProfile?.email,
              status: 'active',
              rating: 0,
              totalClients: 0,
              currentClients: 0,
              specializations: userProfile?.specializations || [],
              location: userProfile?.location || 'Lagos, Nigeria',
              experience: userProfile?.experience || '0 years',
              thisMonthEarnings: 0,
              lastMonthEarnings: 0,
              totalEarnings: 0,
              ...userProfile
            });
          }
        } else {
          // For non-caregivers (doctors, admins), create a mock caregiver profile from user profile
          setCaregiver({
            id: user?.uid,
            name: userProfile?.name || userProfile?.displayName || 'User',
            email: userProfile?.email,
            status: 'active',
            rating: 0,
            totalClients: 0,
            currentClients: 0,
            specializations: userProfile?.specializations || [],
            location: userProfile?.location || 'Lagos, Nigeria',
            experience: userProfile?.experience || '0 years',
            thisMonthEarnings: 0,
            lastMonthEarnings: 0,
            totalEarnings: 0,
            ...userProfile
          });
        }

        // Load assigned clients from admin-created assignments (for ALL caregivers, doctors, and pharmacists)
        const isDoctor = (userProfile.medicalQualification || '').includes('Doctor') || 
                          userProfile.role === 'doctor' || 
                          userProfile.userType === 'doctor' || 
                          userProfile.type === 'doctor';
        const isCaregiver = userProfile.userType === 'caregiver' || userProfile.type === 'caregiver';
        const isPharmacist = userProfile.userType === 'pharmacist' || userProfile.type === 'pharmacist' || userProfile.role === 'pharmacist';
        
        if (isDoctor || isCaregiver || isPharmacist) {
          let clients = [];
          try {
            // Load assignments for this caregiver/doctor
            const assignments = await assignmentAPI.getAssignmentsByCaregiver(user?.uid);
            console.log(`📋 Found ${assignments.length} assignments for caregiver ${user?.uid}`);
            
            const uniqueClientIds = Array.from(new Set(assignments.map(a => a.clientId).filter(Boolean)));
            console.log(`👥 Fetching ${uniqueClientIds.length} unique clients...`);
            
            const fetched = await Promise.all(uniqueClientIds.map(pid => getClientById(pid).catch(() => null)));
            clients = fetched.filter(Boolean);
            
            console.log(`✅ Loaded ${clients.length} client details`);
          } catch (error) {
            console.log('No client assignments found - this is normal for new users');
          }
          
          // For doctors only: Fallback to clients.assignedDoctor field if no assignment docs found
          if (isDoctor && (!clients || clients.length === 0) && user?.uid) {
            try {
              const alt = await getClientsByDoctor(user.uid, institutionId);
              clients = alt || [];
              console.log(`📋 Fallback: Loaded ${clients.length} clients from assignedDoctor field`);
            } catch (error) {
              console.log('No clients assigned via assignedDoctor field');
            }
          }
          
          // Exclude archived clients from visible list
          const visibleClients = (clients || []).filter(c => (c?.status || '').toLowerCase() !== 'archived');
          setAssignedClients(visibleClients);
          // Auto-select first client if not set
          if (visibleClients.length > 0 && !selectedClientId) {
            setSelectedClientId(visibleClients[0].id);
            setSelectedClient(visibleClients[0]);
          }
        }
        
        // Load schedule for the entire week (appointments + tasks + assignments)
        const [allAppointments, allTasks, allAssignments] = await Promise.all([
          getTodaysAppointments(user?.uid, 'caregiver').catch(() => []),
          getTodayTasks(user?.uid).catch(() => []),
          assignmentAPI.getAssignmentsByCaregiver(user?.uid).catch(() => [])
        ]);
        
        console.log('📊 Schedule data loaded:', {
          appointments: allAppointments,
          tasks: allTasks,
          assignments: allAssignments
        });
        
        // Don't filter by today - keep all assignments for the week view
        // Assignments already have dueDate and dueTime set by admin
        const allAdminAssignments = allAssignments;
        
        console.log('📅 All assignments (unfiltered):', allAdminAssignments);
        
        // Combine appointments, tasks, and admin-created assignments for the full schedule
        // Helper function to convert date to string
        const dateToString = (dateValue) => {
          if (!dateValue) return '';
          if (dateValue instanceof Date) return dateValue.toISOString();
          if (dateValue?.toDate) return dateValue.toDate().toISOString();
          if (typeof dateValue === 'string') return dateValue;
          return String(dateValue);
        };

        const combinedSchedule = [
          ...allAppointments.map(apt => ({
            id: apt.id,
            type: 'appointment',
            title: apt.title || 'Appointment',
            time: dateToString(apt.scheduledTime),
            client: apt.clientName || 'Client',
            status: apt.status || 'scheduled',
            description: apt.description
          })),
          ...allTasks.map(task => ({
            id: task.id,
            type: 'task',
            title: task.title,
            time: dateToString(task.scheduledTime),
            client: task.clientName || 'Client',
            status: task.status || 'pending',
            description: task.description
          })),
          ...allAdminAssignments.map(assignment => {
            const dueDateStr = dateToString(assignment.dueDate);
            return {
            id: assignment.id,
            type: 'assignment',
            title: assignment.title || 'Assigned Task',
              time: assignment.dueTime ? `${dueDateStr} ${assignment.dueTime}` : dueDateStr,
            client: assignment.clientName || 'Client',
            status: assignment.status || 'pending',
            priority: assignment.priority,
            description: assignment.description,
            instructions: assignment.instructions
            };
          })
        ];
        
        // Sort by time
        combinedSchedule.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        console.log('📅 Combined schedule (full week):', combinedSchedule);
        
        setTodaySchedule(combinedSchedule);
        console.log(`📅 Full schedule loaded: ${combinedSchedule.length} items (${allAppointments.length} appointments, ${allTasks.length} tasks, ${allAdminAssignments.length} assignments)`);
        
        // Load recent tasks from both careTasks AND clientAssignments collections
        let loadedRecentTasks = [];
        if (user?.uid) {
          try {
            // Load from careTasks collection (old way)
            const careTasksData = await getCareTasksByCaregiver(user.uid).catch(() => []);
            console.log(`📋 Loaded ${careTasksData.length} tasks from careTasks collection`);
            
            // Load from clientAssignments collection (admin-created assignments)
            const assignments = await assignmentAPI.getAssignmentsByCaregiver(user.uid).catch(() => []);
            console.log(`📋 Loaded ${assignments.length} assignments from clientAssignments collection`);
            
            // Convert assignments to task format for display
            const assignmentTasks = assignments.map(assignment => ({
              id: assignment.id,
              task: assignment.title || 'Assigned Task',
              title: assignment.title || 'Assigned Task',
              description: assignment.description,
              clientId: assignment.clientId,
              clientName: assignment.clientName || 'Client',
              caregiverId: assignment.caregiverId,
              status: assignment.status || 'pending',
              priority: assignment.priority || 'normal',
              dueDate: assignment.dueDate,
              dueTime: assignment.dueTime,
              instructions: assignment.instructions,
              createdAt: assignment.createdAt instanceof Date ? assignment.createdAt.toISOString() : (assignment.createdAt?.toDate?.()?.toISOString() || assignment.createdAt),
              assignmentType: 'clientAssignment' // Mark as admin-created assignment
            }));
            
            // Merge both sources
            loadedRecentTasks = [...careTasksData, ...assignmentTasks];
            console.log(`✅ Total tasks (merged): ${loadedRecentTasks.length}`);
            
            // Sort by created date (most recent first)
            loadedRecentTasks.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            
            setRecentTasks(loadedRecentTasks); // Show all tasks
          } catch (error) {
            console.log('No recent tasks found - this is normal for new users');
            setRecentTasks([]);
          }
        } else {
          setRecentTasks([]);
        }
        
        // Load performance data
        setPerformance({
          completedTasks: loadedRecentTasks.filter(task => task.status === 'completed').length,
          totalTasks: loadedRecentTasks.length,
          rating: caregiver?.rating || 4.8,
          hoursWorked: 40
        });

        // Load profile image from settings
        loadProfileImage();
        
      } catch (error) {
        console.error('Error loading caregiver data:', error);
        // Set a fallback caregiver profile to prevent crashes
        setCaregiver({
          id: user?.uid,
          name: userProfile?.name || userProfile?.displayName || 'User',
          email: userProfile?.email,
          status: 'active',
          rating: 0,
          totalClients: 0,
          currentClients: 0,
          specializations: userProfile?.specializations || [],
          location: userProfile?.location || 'Lagos, Nigeria',
          experience: userProfile?.experience || '0 years',
          thisMonthEarnings: 0,
          lastMonthEarnings: 0,
          totalEarnings: 0,
          ...userProfile
        });
      } finally {
        setLoading(false);
      }
    };

    loadCaregiverData();
    
    // Set up real-time subscription for assignments (for caregivers, doctors, and pharmacists)
    const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor') || 
                      userProfile?.role === 'doctor' || 
                      userProfile?.userType === 'doctor' || 
                      userProfile?.type === 'doctor';
    const isNurse = (userProfile?.medicalQualification || '').includes('Nurse') || 
                    userProfile?.role === 'nurse' || 
                    userProfile?.userType === 'nurse' || 
                    userProfile?.type === 'nurse';
    const isCaregiver = userProfile?.userType === 'caregiver' || userProfile?.type === 'caregiver';
    const isPharmacist = userProfile?.userType === 'pharmacist' || userProfile?.type === 'pharmacist' || userProfile?.role === 'pharmacist';
    const isNonMedicalCaregiver = isCaregiver && !isDoctor && !isNurse && !isPharmacist;
    
    if ((isDoctor || isCaregiver || isPharmacist) && user?.uid) {
      const unsubscribe = assignmentAPI.subscribeToAssignments((assignments) => {
        console.log(`🔄 Real-time update: Found ${assignments.length} total assignments`);
        
        // Filter assignments for this specific caregiver/doctor
        const caregiverAssignments = assignments.filter(a => a.caregiverId === user.uid);
        console.log(`📋 ${caregiverAssignments.length} assignments for this caregiver`);
        
        const uniqueClientIds = Array.from(new Set(caregiverAssignments.map(a => a.clientId).filter(Boolean)));
        
        if (uniqueClientIds.length > 0) {
        Promise.all(uniqueClientIds.map(pid => getClientById(pid).catch(() => null)))
          .then(fetched => {
            const clients = fetched.filter(Boolean);
            console.log(`✅ Real-time: Loaded ${clients.length} clients`);
            // Exclude archived clients from visible list in real-time updates
            const visibleClients = clients.filter(c => (c?.status || '').toLowerCase() !== 'archived');
            setAssignedClients(visibleClients);
            
            // Auto-select first client if not set
            if (visibleClients.length > 0 && !selectedClientId) {
              setSelectedClientId(visibleClients[0].id);
              setSelectedClient(visibleClients[0]);
            }
          })
          .catch(error => {
            console.log('Error fetching client details from assignments:', error);
          });
        }
      }, user.uid);
      
      return () => unsubscribe();
    }
  }, [userProfile, user?.uid, selectedClientId, effectiveInstitutionId]);

  useEffect(() => {
    // when selectedClientId changes, refresh selectedClient from cache/list
    if (!selectedClientId) {
      setSelectedClient(null);
      return;
    }
    const found = assignedClients.find(p => p.id === selectedClientId);
    if (found) setSelectedClient(found);
  }, [selectedClientId, assignedClients]);

  // Real-time subscription to medical reports, care plans, and care logs
  useEffect(() => {
    if (!selectedClient) return;
    
    // Load medical data immediately when a client is selected
    if (selectedClient && selectedClient.id) {
      setLoadingReports(true);
      
      // Set up real-time listeners
      const unsubscribeReports = subscribeToMedicalReportsByClient(
        selectedClient.id,
        (reports) => {
          setMedicalReports(reports);
        }
      );
      
      const unsubscribePlans = subscribeToCarePlansByClient(
        selectedClient.id,
        (plans) => {
          setCarePlans(plans);
        }
      );
      
      const unsubscribeLogs = subscribeToCareLogsByClient(
        selectedClient.id,
        50,
        (logs) => {
          setCareLogs(logs);
        }
      );
      
      // Load prescriptions, consultations, diagnostics, and invoices for Medical Reports section
      const loadMedicalData = async () => {
        try {
          const [prescriptions, consultations, diagnostics, invoices] = await Promise.all([
            prescriptionsAPI.getPrescriptionsByClient(selectedClient.id).catch(() => []),
            consultationsAPI.getConsultationsByClient(selectedClient.id).catch(() => []),
            getClientDiagnostics(selectedClient.id).catch(() => []),
            pharmacyAPI.getInvoicesByClient(selectedClient.id).catch(() => [])
          ]);
          
          setClientPrescriptions(prescriptions);
          setClientConsultations(consultations);
          setClientDiagnostics(diagnostics);
          setClientInvoices(invoices);
          setLoadingReports(false);
          
          console.log('📊 Loaded medical data:', {
            prescriptions: prescriptions.length,
            consultations: consultations.length,
            diagnostics: diagnostics.length,
            invoices: invoices.length
          });
          
          console.log('📋 Prescriptions data:', prescriptions);
          console.log('💬 Consultations data:', consultations);
          console.log('🔬 Diagnostics data:', diagnostics);
          console.log('🧾 Invoices data:', invoices);
        } catch (error) {
          console.error('Error loading medical data:', error);
          setLoadingReports(false);
        }
      };
      
      loadMedicalData();
      
      // Cleanup subscriptions on unmount or when client changes
      return () => {
        unsubscribeReports();
        unsubscribePlans();
        unsubscribeLogs();
        console.log('🔄 Unsubscribed from real-time updates');
      };
    }
  }, [selectedClient]);

  // Set up incoming call listener
  useEffect(() => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      return;
    }
    
    const userId = userProfile.id || userProfile.uid || user?.uid;
    console.log('🎧 Setting up call listener for user:', userId, 'role:', userProfile.userType);
    
    const unsubscribe = callService.listenForIncomingCalls(userId, (callNotification) => {
      console.log('📞 Incoming call notification:', callNotification);
      
      if (callNotification.status === 'incoming') {
        setIncomingCall({
          callId: callNotification.callId,
          callerId: callNotification.callerId,
          callType: callNotification.callType,
          timestamp: callNotification.timestamp
        });
        toast.info(`Incoming ${callNotification.callType} call...`);
      }
    });
    
    return () => {
      console.log('🔌 Cleaning up call listener');
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile, user, callService]);

  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid || user?.uid;
      await callService.answerCall(incomingCall.callId, userId);
      // Initialize WebRTC and answer
      await webrtc.initialize();
      await webrtc.answerCall(incomingCall.callId, incomingCall.callType);
      // Listen for signaling for this call
      const unsubscribeSignaling = webrtc.listenForSignaling(incomingCall.callId, async (msg) => {
        if (msg.type === 'offer') {
          await webrtc.handleOffer(msg.data.offer, incomingCall.callType);
        } else if (msg.type === 'ice-candidate') {
          await webrtc.handleIceCandidate(msg.data.candidate);
        }
      });
      // Store unsubscribe if needed later (omitted for brevity)

      setActiveCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: 'Admin',
        callType: incomingCall.callType
      });
      setIncomingCall(null);
      console.log('✅ Call accepted');
      toast.success('Call accepted');
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
    }
  };

  // Handle incoming call rejection
  const handleRejectCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid || user?.uid;
      await callService.rejectCall(incomingCall.callId, userId);
      setIncomingCall(null);
      console.log('❌ Call rejected');
      toast.info('Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Failed to reject call');
    }
  };

  // Handle active call end
  const handleEndCall = async () => {
    if (!activeCall) return;
    
    try {
      const duration = elapsedSeconds || 0;
      await callService.endCall(activeCall.callId, duration);
      setActiveCall(null);
      console.log('✅ Call ended');
      toast.info('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedSeconds(0);
    setCallStartAt(null);
  };

  // Inline call logs for caregiver/doctor view
  const renderCallLogs = () => {
    const uid = user?.uid || userProfile?.uid || userProfile?.id;
    if (!uid) return null;
    const CallLogsPanel = require('../components/CallLogsPanel').default;
    return (
      <div className="mt-6">
        <CallLogsPanel userId={uid} />
      </div>
    );
  };

  // Doctor action guards and navigation helpers
  const requireClient = () => {
    if (!selectedClientId) {
      alert('Please select a client first.');
      return false;
    }
    return true;
  };

  const handleNewConsultation = () => {
    if (!selectedClient) {
      toast.warning('Please select a client first');
      return;
    }
    setShowConsultationModal(true);
  };

  const handleWritePrescription = () => {
    if (!selectedClient) {
      toast.warning('Please select a client first');
      return;
    }
    setShowPrescriptionModal(true);
  };

  const handleCreateCarePlan = () => {
    if (!selectedClient) {
      toast.warning('Please select a client first');
      return;
    }
    setShowCarePlanModal(true);
  };

  const initiateCall = async (callData) => {
    try {
      const callService = new CallService();
      const result = await callService.initiateCall(callData);
      
      if (result?.callId) {
        // Initialize WebRTC
        const webrtcService = new WebRTCService(
          callData.callerId,
          callData.recipientId,
          result.callId,
          result.signalingRef
        );
        
        await webrtcService.init();
        setWebrtc(webrtcService);
        setIsInCall(true);
        setCurrentCallId(result.callId);
        
        // Set up WebRTC callbacks
        webrtcService.setCallbacks({
          onCallStateChange: (state) => {
            console.log('📡 Call state changed:', state);
            setCallConnectionState(state);
            if (state === 'connected') {
              console.log('✅ Call connected!');
            }
          },
          onLocalStream: (stream) => {
            console.log('📹 Local stream received');
            setLocalStream(stream);
          },
          onRemoteStream: (stream) => {
            console.log('📺 Remote stream received');
            setRemoteStream(stream);
          }
        });
        
        return result;
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
      throw error;
    }
  };

  const handleVideoConsultation = async () => {
    // Clients don't have accounts - cannot initiate calls to clients
    toast.warning('Clients do not have accounts. Calls can only be made to caregivers, doctors, nurses, and administrators.');
  };

  const handleCareLogSave = async (careLogData) => {
    try {
      const careLogWithMetadata = {
        ...careLogData,
        caregiverId: user?.uid,
        caregiverName: userProfile?.name || userProfile?.displayName,
        institutionId: effectiveInstitutionId,
        timestamp: new Date().toISOString()
      };

      await careLogsAPI.createCareLog(careLogWithMetadata);
      toast.success('Care log saved successfully');
      
      // Refresh care logs if the modal is open
      if (showCareLogsModal) {
        // Trigger a refresh of care logs data
        setShowCareLogsModal(false);
        setTimeout(() => setShowCareLogsModal(true), 100);
      }
    } catch (error) {
      console.error('Error saving care log:', error);
      throw error;
    }
  };

  const handleClockIn = (scheduleId) => {
    // Handle clock in
    console.log('Clock in for schedule:', scheduleId);
  };

  // --- Role-specific UI helpers ---
  // Note: Role flags are already defined at component level (line 457)
  const isMedicalProfessional = isDoctor || isNurse;

  // Toggle expand/collapse for medical records
  const toggleRecordDetails = (recordId) => {
    setExpandedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Helper function to send notifications
  const sendNotificationToUsers = async (userIds, notificationData) => {
    try {
      const promises = userIds.map(userId => 
        notificationsAPI.createNotification({
          userId,
          ...notificationData,
          institutionId: effectiveInstitutionId
        })
      );
      await Promise.all(promises);
      console.log(`✅ Sent ${userIds.length} notifications`);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  // Helper function to notify admin of activities
  const notifyAdmin = async (notificationData) => {
    try {
      // Find all admins in the institution
      const usersRef = collection(db, 'users');
      const adminQuery = query(
        usersRef,
        where('userType', '==', 'admin'),
        where('institutionId', '==', effectiveInstitutionId)
      );
      const adminSnapshot = await getDocs(adminQuery);
      const adminIds = adminSnapshot.docs.map(doc => doc.id);
      
      if (adminIds.length > 0) {
        await sendNotificationToUsers(adminIds, notificationData);
      }
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  };

  const renderDoctorClientSelector = () => {
    if (!isDoctor) return null;
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">Assigned Clients</div>
            <select
              className="mt-1 w-72 max-w-full px-3 py-2 border rounded-md"
              value={selectedClientId}
              onChange={(e) => {
                const clientId = e.target.value;
                setSelectedClientId(clientId);
                const client = assignedClients.find(c => c.id === clientId);
                setSelectedClient(client || null);
              }}
            >
              <option value="">Select client...</option>
              {assignedClients.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.fullName || p.email || p.id}</option>
              ))}
            </select>
          </div>
          {assignedClients.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">No clients assigned yet</h4>
                  <p className="text-sm text-blue-600 mt-1">
                    Contact your administrator to get clients assigned to your care. Once assigned, you'll be able to create care plans, write prescriptions, and conduct consultations.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleNewConsultation} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>New Consultation</button>
            <button onClick={handleWritePrescription} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>Write Prescription</button>
            <button onClick={handleCreateCarePlan} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>Create Care Plan</button>
            {/* Video consultation removed - clients don't have accounts */}
          </div>
        </div>
        {selectedClient && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Client</div>
              <div className="text-gray-900 font-medium">{selectedClient.name || selectedClient.fullName || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Age</div>
              <div className="text-gray-900">{selectedClient.age || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Last Visit</div>
              <div className="text-gray-900">{selectedClient.lastVisit ? new Date(selectedClient.lastVisit).toLocaleDateString() : '—'}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleClockOut = (scheduleId) => {
    // Handle clock out
    console.log('Clock out for schedule:', scheduleId);
  };

  const handleTaskComplete = (taskId) => {
    // Handle task completion
    console.log('Complete task:', taskId);
  };

  const handleEmergency = (clientId) => {
    // Handle emergency
    console.log('Emergency for client:', clientId);
  };

  const loadProfileImage = () => {
    // Load profile image from localStorage or settings
    const savedSettings = localStorage.getItem('caregiverSettings');
    console.log('Loading profile image from localStorage:', savedSettings);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        console.log('Parsed settings:', settings);
        if (settings.profile?.profileImage) {
          console.log('Setting profile image:', settings.profile.profileImage);
          setProfileImage(settings.profile.profileImage);
        } else {
          console.log('No profile image found in settings');
        }
      } catch (error) {
        console.log('Error parsing saved settings:', error);
      }
    } else {
      console.log('No saved settings found in localStorage');
    }
  };

  const updateProfileImage = (imageUrl) => {
    setProfileImage(imageUrl);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // If it's a Date object, convert to string
    if (timeString instanceof Date) {
      return timeString.toLocaleString();
    }
    // If it's a Firestore Timestamp, convert to string
    if (timeString?.toDate) {
      return timeString.toDate().toLocaleString();
    }
    // If it's already a string, try to format it nicely
    if (typeof timeString === 'string') {
      // If it's an ISO string, format it
      if (timeString.includes('T')) {
        try {
          return new Date(timeString).toLocaleString();
        } catch (e) {
    return timeString;
        }
      }
      return timeString;
    }
    return String(timeString);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderClientsTab = () => {
    if (!assignedClients || assignedClients.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assigned Clients</h3>
          <p className="text-gray-600 mb-4">
            You don't have any clients assigned to you at the moment.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Clients List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age / Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medical Conditions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserNameWithAvatar
                          userId={client.id}
                          userName={client.name || client.fullName || 'Unknown Client'}
                          userType="client"
                          profilePictureUrl={client.profilePictureUrl}
                          size="medium"
                          className="mr-4"
                        />
                        <div className="text-sm text-gray-500">ID: {client.id.substring(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.age || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{client.gender || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.phone || client.phoneNumber || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{client.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {Array.isArray(client.medicalConditions) 
                          ? client.medicalConditions.slice(0, 2).join(', ') + (client.medicalConditions.length > 2 ? '...' : '')
                          : client.medicalConditions || client.conditions || 'None'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        client.status === 'Active' || client.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : client.status === 'Critical' || client.status === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {client.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                        onClick={() => setSelectedClient(client)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Clients</p>
                <p className="text-2xl font-bold text-blue-900">{assignedClients.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 rounded-xl border border-green-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Clients</p>
                <p className="text-2xl font-bold text-green-900">
                  {assignedClients.filter(c => c.status === 'Active' || c.status === 'active' || !c.status).length}
                </p>
              </div>
              <Activity className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Clients</p>
                <p className="text-2xl font-bold text-red-900">
                  {assignedClients.filter(c => c.status === 'Critical' || c.status === 'critical').length}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              </div>
            </div>
          </div>
    );
  };

  // Load all platform users (caregivers and admins)
  const loadPlatformUsers = useCallback(async () => {
    if (!effectiveInstitutionId || !user?.uid) return;
    
    try {
      // Load all users from the institution
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('institutionId', '==', effectiveInstitutionId)
      );
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Include all users for message lookup (caregivers, admins, doctors, nurses, pharmacists)
        // We'll filter for display purposes but need all for message sender lookup
        const userType = userData.userType || userData.type || userData.role;
        if (userType === 'caregiver' || 
            userType === 'admin' || 
            userType === 'doctor' ||
            userType === 'nurse' ||
            userType === 'pharmacist' ||
            userType === 'institutionAdmin' ||
            userData.roles?.includes('admin') ||
            userData.roles?.includes('institutionAdmin')) {
          users.push({
            id: doc.id,
            ...userData,
            name: userData.name || userData.displayName || userData.fullName || userData.email || 'Unknown User',
            role: userType || 'User',
            photoURL: userData.photoURL || userData.profilePicture || userData.profilePictureUrl || null,
            avatar: userData.photoURL || userData.profilePicture || userData.profilePictureUrl || null
          });
        }
      });
      
      console.log(`👥 Loaded ${users.length} platform users:`, users.map(u => ({ id: u.id, name: u.name, email: u.email })));
      setPlatformUsers(users);
      return users;
    } catch (error) {
      console.error('Error loading platform users:', error);
      return [];
    }
  }, [effectiveInstitutionId, user?.uid]);

  // Load real conversations and merge with platform users
  const loadConversations = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      // Load existing conversations
      const existingConversations = await getConversationsByUser(user.uid);
      console.log(`💬 Loaded ${existingConversations.length} conversations`);
      
      // Load all platform users to map user IDs to names
      const users = await loadPlatformUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      // Enrich existing conversations with participant names
      const enrichedConversations = existingConversations.map(conv => {
        // Get the other participant(s) in the conversation
        const otherParticipants = (conv.participants || []).filter(id => id !== user.uid);
        const otherUser = otherParticipants.length > 0 ? userMap.get(otherParticipants[0]) : null;
        
        return {
          ...conv,
          conversationId: conv.id,
          name: otherUser ? (otherUser.name || otherUser.displayName || otherUser.email || 'Unknown User') : 'Unknown User',
          avatar: otherUser ? (otherUser.avatar || otherUser.photoURL || otherUser.profilePicture || otherUser.profilePictureUrl || null) : null,
          photoURL: otherUser ? (otherUser.photoURL || otherUser.profilePicture || otherUser.profilePictureUrl || null) : null,
          type: otherUser ? (otherUser.role || otherUser.userType || 'user') : 'user',
          timestamp: conv.lastMessageTime || conv.updatedAt || new Date().toISOString(),
          lastMessage: conv.lastMessage || 'Start a conversation',
          unread: 0, // TODO: Calculate actual unread count
          userData: otherUser // Store full user data for reference
        };
      });
      
      // Create conversation entries for users who don't have existing conversations
      const existingUserIds = new Set(
        existingConversations.flatMap(conv => conv.participants || [])
      );
      
      // Add platform users as potential conversation partners
      const newUserConversations = users
        .filter(u => !existingUserIds.has(u.id))
        .map(u => {
          console.log('👤 Creating conversation entry for user:', u.id, { name: u.name, displayName: u.displayName, email: u.email });
          return {
            id: `new-${u.id}`,
            name: u.name || u.displayName || u.email || 'Unknown User',
            avatar: u.avatar || u.photoURL || u.profilePicture || u.profilePictureUrl || null,
            photoURL: u.photoURL || u.profilePicture || u.profilePictureUrl || null,
            lastMessage: 'Start a conversation',
            timestamp: new Date().toISOString(),
            unread: 0,
            type: u.role || u.userType || 'user',
            participants: [user.uid, u.id],
            isNew: true,
            userData: u
          };
        });
      
      // Merge existing conversations with new user entries
      const allConversations = [
        ...enrichedConversations,
        ...newUserConversations
      ];
      
      // Don't add clients to conversations - clients don't have accounts
      setConversations(allConversations);
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
  }, [user?.uid, assignedClients, loadPlatformUsers]);

  // Load conversations when user changes (placed after loadConversations definition)
  useEffect(() => {
    if (user?.uid) {
      loadConversations();
    }
  }, [user?.uid, loadConversations]);

  // Load activities function
  const loadActivities = async () => {
    if (!user?.uid) return;
    
    try {
      const [allActivities, todayActs, stats] = await Promise.all([
        activitiesAPI.getActivitiesByCaregiver(user.uid, 100),
        activitiesAPI.getTodayActivities(user.uid),
        activitiesAPI.getWeeklySummary(user.uid)
      ]);
      
      setActivities(allActivities);
      setTodayActivities(todayActs);
      setActivityStats(stats);
      
      console.log('📊 Activities loaded:', {
        total: allActivities.length,
        today: todayActs.length,
        stats
      });
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  // Load activities when component mounts or tab changes (MOVED AFTER loadActivities definition)
  useEffect(() => {
    if (user?.uid && activeTab === 'activities') {
      loadActivities();
    }
  }, [user?.uid, activeTab, loadActivities]);
  
  // Load prescriptions for selected client
  const loadPrescriptions = async (clientId) => {
    if (!clientId) return;
    
    try {
      console.log('💊 Loading prescriptions for client:', clientId);
      const data = await prescriptionsAPI.getPrescriptionsByClient(clientId);
      setPrescriptions(data);
      console.log('✅ Prescriptions loaded:', data.length);
      console.log('🔍 Prescription details:', data.map(p => ({
        id: p.id,
        prescriptionNumber: p.prescriptionNumber,
        diagnosis: p.diagnosis,
        medicationsCount: p.medications?.length || 0,
        medications: p.medications
      })));
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    }
  };
  
  // Load prescriptions when client selected
  useEffect(() => {
    if (selectedClientId && activeTab === 'prescriptions') {
      loadPrescriptions(selectedClientId);
    }
  }, [selectedClientId, activeTab]);
  
  // Add medication to prescription form
  const handleAddMedication = () => {
    setPrescriptionFormData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          quantity: '',
          instructions: '',
          route: 'oral'
        }
      ]
    }));
  };
  
  // Remove medication from prescription form
  const handleRemoveMedication = (index) => {
    setPrescriptionFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };
  
  // Submit prescription
  const handleSubmitPrescription = async () => {
    if (!selectedClient || !user?.uid) {
      toast.error('Please select a client');
      return;
    }
    
    // Validate medications
    const validMedications = prescriptionFormData.medications.filter(
      med => med.name && med.dosage && med.frequency
    );
    
    if (validMedications.length === 0) {
      toast.error('Please add at least one medication with name, dosage, and frequency');
      return;
    }
    
    try {
      const prescriptionData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name || selectedClient.fullName,
        doctorId: user.uid,
        doctorName: userProfile?.name || userProfile?.displayName || user.email,
        institutionId: effectiveInstitutionId || institutionId,
        diagnosis: prescriptionFormData.diagnosis,
        notes: prescriptionFormData.notes,
        medications: validMedications,
        prescriptionDate: new Date().toISOString()
      };
      
      if (editingPrescriptionId) {
        // Update existing prescription
        console.log('✏️ Updating prescription:', editingPrescriptionId, prescriptionData);
        await prescriptionsAPI.updatePrescription(editingPrescriptionId, prescriptionData);
        toast.success('Prescription updated successfully!');
      } else {
        // Create new prescription
        console.log('💊 Creating prescription:', prescriptionData);
        await prescriptionsAPI.createPrescription(prescriptionData);
        toast.success('Prescription created successfully!');
      }
      
      setShowPrescriptionModal(false);
      setEditingPrescriptionId(null);
      
      // Reload prescriptions to show the changes
      await loadPrescriptions(selectedClient.id);
      
      // Reset form
      setPrescriptionFormData({
        diagnosis: '',
        notes: '',
        medications: [
          {
            name: '',
            dosage: '',
            frequency: '',
            duration: '',
            quantity: '',
            instructions: '',
            route: 'oral'
          }
        ]
      });
    } catch (error) {
      console.error('Error saving prescription:', error);
      toast.error(`Failed to ${editingPrescriptionId ? 'update' : 'create'} prescription`);
    }
  };
  
  // Edit prescription handler
  const handleEditPrescription = (prescription) => {
    setEditingPrescriptionId(prescription.id);
    setPrescriptionFormData({
      diagnosis: prescription.diagnosis || '',
      notes: prescription.notes || '',
      medications: prescription.medications && prescription.medications.length > 0
        ? prescription.medications.map(med => ({
            name: med.medicationName || '',
            dosage: med.dosage || '',
            frequency: med.frequency || '',
            duration: med.duration || '',
            quantity: med.quantity || '',
            instructions: med.instructions || '',
            route: med.route || 'oral'
          }))
        : [{
            name: '',
            dosage: '',
            frequency: '',
            duration: '',
            quantity: '',
            instructions: '',
            route: 'oral'
          }]
    });
    setShowPrescriptionModal(true);
  };
  
  // Handle prescription deletion
  const handleDeletePrescription = async (prescriptionId) => {
    try {
      // Reload prescriptions after deletion
      if (selectedClient) {
        await loadPrescriptions(selectedClient.id);
      }
    } catch (error) {
      console.error('Error reloading prescriptions after deletion:', error);
    }
  };
  
  // Update prescription item (pharmacist)
  const handleUpdatePrescriptionItem = async (itemId, updates) => {
    try {
      await prescriptionsAPI.updatePrescriptionItem(itemId, {
        ...updates,
        availabilityCheckedBy: user.uid,
        availabilityCheckedAt: new Date().toISOString()
      });
      
      toast.success('Medication updated successfully');
      
      // Reload prescriptions
      if (selectedClient) {
        await loadPrescriptions(selectedClient.id);
      }
    } catch (error) {
      console.error('Error updating prescription item:', error);
      toast.error('Failed to update medication');
    }
  };
  
  // Load consultations for selected client
  const loadConsultations = async (clientId) => {
    if (!clientId) return;
    
    try {
      console.log('🩺 Loading consultations for client:', clientId);
      const data = await consultationsAPI.getConsultationsByClient(clientId);
      setConsultations(data);
      console.log('✅ Consultations loaded:', data.length);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Failed to load consultations');
    }
  };
  
  // Load consultations when client selected
  useEffect(() => {
    if (selectedClientId && activeTab === 'consultations') {
      loadConsultations(selectedClientId);
    }
  }, [selectedClientId, activeTab]);
  
  // Submit consultation
  const handleSubmitConsultation = async () => {
    if (!selectedClient || !user?.uid) {
      toast.error('Please select a client');
      return;
    }
    
    // Validate required fields
    if (!consultationFormData.chiefComplaint || !consultationFormData.subjective || 
        !consultationFormData.objective || !consultationFormData.assessment || 
        !consultationFormData.plan) {
      toast.error('Please fill in all SOAP note fields');
      return;
    }
    
    try {
      const consultationData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name || selectedClient.fullName,
        doctorId: user.uid,
        doctorName: userProfile?.name || userProfile?.displayName || user.email,
        institutionId: effectiveInstitutionId || institutionId,
        ...consultationFormData
      };
      
      console.log('🩺 Creating consultation:', consultationData);
      await consultationsAPI.createConsultation(consultationData);
      
      toast.success('Consultation note saved successfully!');
      setShowConsultationModal(false);
      
      // Reload consultations to show the new one
      await loadConsultations(selectedClient.id);
      
      // Reset form
      setConsultationFormData({
        consultationType: CONSULTATION_TYPES.REVIEW,
        consultationDate: new Date().toISOString().slice(0, 16),
        chiefComplaint: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        vitalSigns: {},
        followUpRequired: false,
        followUpDate: '',
        followUpNotes: '',
        notes: '',
        privateNotes: '',
        relatedMedicalReports: [],
        relatedCareLogs: []
      });
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Failed to save consultation');
    }
  };

  // Load messages for selected conversation
  const loadMessagesForConversation = async (conversationId) => {
    try {
      const conversationMessages = await getMessagesByConversation(conversationId);
      console.log(`💬 Loaded ${conversationMessages.length} messages`);
      
      // Enrich messages with sender names from platform users
      const users = await loadPlatformUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      // Also include current user in the map
      if (user?.uid && userProfile) {
        userMap.set(user.uid, {
          id: user.uid,
          name: userProfile.name || userProfile.displayName || userProfile.email || 'You',
          photoURL: userProfile.photoURL || userProfile.profilePicture || userProfile.profilePictureUrl || null,
          ...userProfile
        });
      }
      
      // Enrich messages with sender names and profile pictures
      const enrichedMessages = conversationMessages.map(message => {
        const senderId = message.senderId || message.sender;
        const sender = senderId ? userMap.get(senderId) : null;
        
        return {
          ...message,
          senderName: message.senderName || (sender ? (sender.name || sender.displayName || sender.email || 'Unknown User') : 'Unknown User'),
          senderPhotoURL: sender ? (sender.photoURL || sender.profilePicture || sender.profilePictureUrl || null) : null
        };
      });
      
      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // Messaging Tab Renderer
  const renderMessagesTab = () => {
    const handleSendMessage = async () => {
      if (!newMessage.trim() || !selectedConversation) return;
      
      try {
        // Get or create conversation
        let conversationId = selectedConversation.conversationId || selectedConversation.id;
        
        // If conversation doesn't exist in Firestore yet, create it
        if (!selectedConversation.conversationId && selectedConversation.participants) {
          const conversationResult = await getOrCreateConversation(selectedConversation.participants, 'care');
          // getOrCreateConversation returns an object with id property
          conversationId = conversationResult.id || conversationResult;
          console.log(`✅ Created new conversation: ${conversationId}`);
        }
        
        // Ensure conversationId is a string, not an object
        if (typeof conversationId === 'object' && conversationId.id) {
          conversationId = conversationId.id;
        }
        
        console.log('📤 Sending message to conversation:', conversationId);
        
        // Send message to Firestore
        await sendMessageAPI(conversationId, user.uid, {
          text: newMessage,
          type: 'text',
          senderName: userProfile?.name || 'Caregiver'
        });
        
        // Add message to local state for immediate display
      const message = {
        id: Date.now(),
        text: newMessage,
          senderId: user?.uid,
        senderName: userProfile?.name || 'You',
          createdAt: new Date().toISOString(),
        read: false
      };
      
      setMessages([...messages, message]);
      setNewMessage('');
      
        toast.success('Message sent successfully');
        
        // Reload conversations to update last message
        loadConversations();
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    };

    const startVoiceCall = async () => {
      if (!selectedConversation) {
        toast.error('Please select a conversation first');
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
        setCallType('voice');
        setIsInCall(true);
        toast.success('Voice call started');
        
        // TODO: Initialize WebRTC connection
      } catch (error) {
        console.error('Error starting voice call:', error);
        toast.error('Failed to start voice call. Please check microphone permissions.');
      }
    };

    const startVideoCall = async () => {
      if (!selectedConversation) {
        toast.error('Please select a conversation first');
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setLocalStream(stream);
        setCallType('video');
        setIsInCall(true);
        toast.success('Video call started');
        
        // TODO: Initialize WebRTC connection
      } catch (error) {
        console.error('Error starting video call:', error);
        toast.error('Failed to start video call. Please check camera and microphone permissions.');
      }
    };

    const endCall = () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }
      setIsInCall(false);
      setCallType(null);
      toast.info('Call ended');
    };

    // Use real conversations only - clients don't have accounts
    const displayConversations = conversations.length > 0 ? conversations : [
      {
        id: 'admin-1',
        name: institutionData?.name || 'Institution Admin',
        avatar: null,
        lastMessage: 'Welcome to the team!',
        timestamp: new Date().toISOString(),
          unread: 0,
          type: 'admin',
          participants: [user.uid, 'admin']
      }
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-250px)]">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-500 mt-1">{displayConversations.length} conversations</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {displayConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    // Load real messages for this conversation
                    const convId = conversation.conversationId || conversation.id;
                    loadMessagesForConversation(convId);
                  }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                      {conversation.photoURL || conversation.avatar ? (
                        <img
                          src={conversation.photoURL || conversation.avatar}
                          alt={conversation.name || 'User'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={conversation.photoURL || conversation.avatar ? 'hidden' : 'flex'}>
                      {(conversation.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{conversation.name || 'Unknown User'}</h3>
                        {conversation.unread > 0 && (
                          <span className="ml-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">{conversation.lastMessage}</p>
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header with Call Buttons */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {selectedConversation.photoURL || selectedConversation.avatar ? (
                      <img
                        src={selectedConversation.photoURL || selectedConversation.avatar}
                        alt={selectedConversation.name || 'User'}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span className={selectedConversation.photoURL || selectedConversation.avatar ? 'hidden' : 'flex'}>
                    {(selectedConversation.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedConversation.name || 'Unknown User'}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.type || 'User'}
                    </p>
                  </div>
                </div>
                
                {/* Call Buttons - Only show for non-client conversations */}
                <div className="flex items-center gap-2">
                  {!isInCall && selectedConversation.type !== 'client' && (
                    <>
                      <button
                        onClick={startVoiceCall}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Start Voice Call"
                      >
                        <Phone className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        onClick={startVideoCall}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Start Video Call"
                      >
                        <Camera className="h-5 w-5 text-gray-600" />
                      </button>
                    </>
                  )}
                  {isInCall && (
                    <button
                      onClick={endCall}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      End Call
                    </button>
                  )}
                </div>
              </div>

              {/* Call Interface (when in call) */}
              {isInCall && (
                <div className="p-6 bg-gray-900 flex items-center justify-center" style={{ height: '400px' }}>
                  <div className="text-center">
                    {callType === 'video' ? (
                      <div className="space-y-4">
                        <Camera className="h-16 w-16 text-white mx-auto" />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-white font-medium">You</p>
                              <p className="text-gray-400 text-sm">Camera Active</p>
                            </div>
                          </div>
                          <div className="bg-gray-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-white font-medium">{selectedConversation.name}</p>
                              <p className="text-gray-400 text-sm">Connecting...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Phone className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
                        <p className="text-white text-lg font-medium">Voice Call Active</p>
                        <p className="text-gray-400">Connected with {selectedConversation.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages Area */}
              {!isInCall && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-400">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isSentByMe = (message.senderId || message.sender) === user?.uid;
                        const messageTime = message.createdAt || message.timestamp;
                        
                        return (
                        <div
                          key={message.id}
                            className={`flex items-start gap-2 ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isSentByMe && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 overflow-hidden">
                              {message.senderPhotoURL ? (
                                <img
                                  src={message.senderPhotoURL}
                                  alt={message.senderName || 'User'}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span className={message.senderPhotoURL ? 'hidden' : 'flex'}>
                                {(message.senderName || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isSentByMe
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                              {!isSentByMe && (
                                <p className="text-xs font-semibold mb-1">{message.senderName || 'Unknown User'}</p>
                              )}
                              <p className="text-sm">{message.text || message.content}</p>
                            <p className={`text-xs mt-1 ${
                                isSentByMe ? 'text-blue-100' : 'text-gray-400'
                            }`}>
                                {new Date(messageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {isSentByMe && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 overflow-hidden">
                              {userProfile?.photoURL || userProfile?.profilePicture || userProfile?.profilePictureUrl ? (
                                <img
                                  src={userProfile.photoURL || userProfile.profilePicture || userProfile.profilePictureUrl}
                                  alt={userProfile.name || 'You'}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span className={userProfile?.photoURL || userProfile?.profilePicture || userProfile?.profilePictureUrl ? 'hidden' : 'flex'}>
                                {(userProfile?.name || userProfile?.displayName || 'Y').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-400">
                <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Select a conversation to start messaging</p>
                <p className="text-sm mt-2">Or start a voice/video call</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Schedule Tab Renderer
  const renderScheduleTab = () => {
    const currentShift = {
      type: 'Day Shift',
      start: '07:00',
      end: '19:00',
      breakTime: '12:00 - 12:30',
      ratio: `1:${assignedClients.length}`
    };

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    
    // Get tasks for the selected date
    const getTasksForDate = (date) => {
      if (!todaySchedule || !Array.isArray(todaySchedule)) {
        return [];
      }
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      return todaySchedule.filter(item => {
        if (!item || !item.time) return false;
        const itemDate = new Date(item.time);
        return itemDate >= dayStart && itemDate <= dayEnd;
      });
    };
    
    const selectedDayTasks = getTasksForDate(selectedScheduleDate);
    
    return (
      <div className="space-y-6">
        {/* Shift Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Current Shift Overview
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Shift Type</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.type}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hours</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.start} - {currentShift.end}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Client-Nurse Ratio</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.ratio}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Break Time</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.breakTime}</p>
            </div>
          </div>
        </div>

        {/* Weekly Schedule Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Weekly Schedule</h2>
            <div className="text-sm text-gray-500">Week of {new Date().toLocaleDateString()}</div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day, index) => {
              const dayDate = new Date(Date.now() + (index - today + 1) * 86400000);
              const dayStart = new Date(dayDate);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayDate);
              dayEnd.setHours(23, 59, 59, 999);
              
              // Filter schedule items for this day
              const dayItems = getTasksForDate(dayDate);
              
              // Check if this day is selected
              const isSelected = selectedScheduleDate.toDateString() === dayDate.toDateString();
              const isToday = index + 1 === today;
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedScheduleDate(dayDate)}
                  className={`text-center p-4 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    isSelected ? 'bg-indigo-100 border-2 border-indigo-600 ring-2 ring-indigo-300' :
                    isToday ? 'bg-blue-100 border-2 border-blue-600' : 
                    'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">{day}</p>
                  <p className="text-xs text-gray-600 mt-1">{dayDate.getDate()}</p>
                  {dayItems.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {dayItems.slice(0, 3).map((item, idx) => {
                        const itemTime = new Date(item.time);
                        return (
                          <div 
                            key={idx}
                            className={`text-xs text-white rounded px-2 py-1 truncate ${
                              item.type === 'appointment' ? 'bg-blue-500' :
                              item.type === 'task' ? 'bg-green-500' :
                              'bg-purple-500'
                            }`}
                            title={item.title}
                          >
                            {itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.title.substring(0, 10)}
                          </div>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-gray-600">+{dayItems.length - 3} more</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">No tasks</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day's Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedScheduleDate.toDateString() === new Date().toDateString() ? "Today's Timeline" : "Schedule Timeline"}
            </h2>
            <div className="text-sm text-gray-500">
              {selectedScheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          
          <div className="space-y-4">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map((item, index) => {
                const itemTime = item.time ? new Date(item.time) : null;
                const isValidTime = itemTime && !isNaN(itemTime.getTime());
                
                return (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-24 text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {isValidTime ? itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                      </p>
                      {isValidTime && (
                        <p className="text-xs text-gray-500">
                          {itemTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        item.status === 'completed' ? 'bg-green-500 border-green-600' : 
                        item.status === 'in_progress' ? 'bg-blue-500 border-blue-600' :
                        'bg-white border-gray-400'
                      }`}></div>
                      {index < todaySchedule.length - 1 && <div className="w-0.5 flex-1 min-h-[60px] bg-gray-300"></div>}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <User className="h-3 w-3 inline mr-1" />
                              {item.client || 'Client'}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status || 'pending'}
                          </span>
                        </div>
                        
                        {/* Task Type Badge */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            item.type === 'appointment' ? 'bg-blue-50 text-blue-700' :
                            item.type === 'task' ? 'bg-purple-50 text-purple-700' :
                            'bg-indigo-50 text-indigo-700'
                          }`}>
                            {item.type === 'appointment' && <Calendar className="h-3 w-3 mr-1" />}
                            {item.type === 'task' && <Activity className="h-3 w-3 mr-1" />}
                            {item.type === 'assignment' && <FileText className="h-3 w-3 mr-1" />}
                            {item.type || 'Task'}
                          </span>
                          
                          {item.priority && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              item.priority === 'urgent' ? 'bg-red-50 text-red-700' :
                              item.priority === 'high' ? 'bg-orange-50 text-orange-700' :
                              item.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-gray-50 text-gray-700'
                            }`}>
                              {item.priority === 'urgent' && '🚨 '}
                              {item.priority}
                            </span>
                          )}
                        </div>
                        
                        {/* Additional Details */}
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 py-12">
                <Calendar className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">
                  {selectedScheduleDate.toDateString() === new Date().toDateString() 
                    ? "No scheduled activities for today" 
                    : `No scheduled activities for ${selectedScheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
                  }
                </p>
                <p className="text-sm mt-1">Tasks and appointments will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Reports Tab Renderer
  const renderReportsTab = () => {
    const [reportType, setReportType] = useState('shift');
    const [shiftType, setShiftType] = useState('day');
    
    return (
      <div className="space-y-6">
        {/* Report Type Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Nursing Reports</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setReportType('shift')}
                className={`px-4 py-2 rounded-lg ${
                  reportType === 'shift' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Shift Report
              </button>
              <button
                onClick={() => setReportType('handoff')}
                className={`px-4 py-2 rounded-lg ${
                  reportType === 'handoff' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Handoff Notes
              </button>
              <button
                onClick={() => setReportType('incident')}
                className={`px-4 py-2 rounded-lg ${
                  reportType === 'incident' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Incident Reports
              </button>
            </div>
          </div>
        </div>

        {/* Shift Report Generator */}
        {reportType === 'shift' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Shift Report</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                <select 
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Day Shift (07:00 - 19:00)</option>
                  <option value="night">Night Shift (19:00 - 07:00)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Shift Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Shift Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Client Census</p>
                  <p className="text-2xl font-bold text-gray-900">{assignedClients.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admissions</p>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discharges</p>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Incidents</p>
                  <p className="text-2xl font-bold text-red-600">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Medications Given</p>
                  <p className="text-2xl font-bold text-purple-600">{todaySchedule.filter(t => t.type === 'task').length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vitals Recorded</p>
                  <p className="text-2xl font-bold text-orange-600">{assignedClients.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Care Activities</p>
                  <p className="text-2xl font-bold text-teal-600">{recentTasks.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assessments</p>
                  <p className="text-2xl font-bold text-indigo-600">{assignedClients.length}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => toast.info('Generating shift report...')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="h-5 w-5" />
                Generate Full Report
              </button>
              <button
                onClick={() => toast.info('Exporting as PDF...')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Export PDF
              </button>
              <button
                onClick={() => toast.info('Sending email...')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Email Report
              </button>
            </div>
          </div>
        )}

        {/* Handoff Notes */}
        {reportType === 'handoff' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Handoff Notes</h3>
            
            <div className="space-y-4 mb-6">
              {assignedClients.map((client) => (
                <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{client.name}</h4>
                    <span className="text-xs text-gray-500">Room {client.room || 'N/A'}</span>
                  </div>
                  <textarea
                    placeholder="Enter handoff notes for this client..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="3"
                    defaultValue={`Stable condition. Continue current care plan. No significant changes during shift.`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => toast.success('Handoff notes saved')}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Save All Handoff Notes
            </button>
          </div>
        )}

        {/* Incident Reports */}
        {reportType === 'incident' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Reports</h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">No incidents reported today</p>
                  <p className="text-xs text-yellow-700 mt-1">All clients are safe. Continue monitoring.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => toast.info('Opening incident report form...')}
              className="w-full px-6 py-3 border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Report New Incident
            </button>
          </div>
        )}
      </div>
    );
  };

  // Pharmacist medication data state
  const [pharmacistMedData, setPharmacistMedData] = useState({});
  const [savingPharmacistData, setSavingPharmacistData] = useState(false);

  // Load pharmacist medication data when client changes
  useEffect(() => {
    const loadPharmacistMedicationData = async () => {
      if (!isPharmacist || !selectedClient || !user?.uid) return;

      try {
        const medDataRef = doc(db, 'pharmacistMedicationData', `${user.uid}_${selectedClient.id}`);
        const medDataSnap = await getDocs(query(collection(db, 'pharmacistMedicationData'), where('pharmacistId', '==', user.uid), where('clientId', '==', selectedClient.id)));
        
        if (!medDataSnap.empty) {
          const data = medDataSnap.docs[0].data();
          setPharmacistMedData(data.medications || {});
        } else {
          setPharmacistMedData({});
        }
      } catch (error) {
        console.error('Error loading pharmacist medication data:', error);
      }
    };

    loadPharmacistMedicationData();
  }, [selectedClient, user, isPharmacist]);

  // Save pharmacist medication data
  const savePharmacistMedicationData = async () => {
    if (!selectedClient || !user?.uid) {
      toast.error('Please select a client first');
      return;
    }

    try {
      setSavingPharmacistData(true);
      
      const medDataQuery = query(
        collection(db, 'pharmacistMedicationData'), 
        where('pharmacistId', '==', user.uid), 
        where('clientId', '==', selectedClient.id)
      );
      const medDataSnap = await getDocs(medDataQuery);
      
      const dataToSave = {
        pharmacistId: user.uid,
        pharmacistName: userProfile?.name || userProfile?.displayName,
        clientId: selectedClient.id,
        clientName: selectedClient.name || selectedClient.fullName,
        institutionId: effectiveInstitutionId,
        medications: pharmacistMedData,
        updatedAt: new Date().toISOString()
      };

      if (!medDataSnap.empty) {
        // Update existing
        await updateDoc(medDataSnap.docs[0].ref, dataToSave);
      } else {
        // Create new
        await setDoc(doc(collection(db, 'pharmacistMedicationData')), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
      }

      toast.success('✅ Medication data saved successfully!');
    } catch (error) {
      console.error('Error saving pharmacist medication data:', error);
      toast.error('Failed to save medication data');
    } finally {
      setSavingPharmacistData(false);
    }
  };

  // Update medication availability and price
  const updateMedicationData = (medName, field, value) => {
    setPharmacistMedData(prev => ({
      ...prev,
      [medName]: {
        ...(prev[medName] || {}),
        [field]: value
      }
    }));
  };

  // View-only tab renderers for non-medical caregivers
  const renderPrescriptionsTab = () => {
    return (
      <PrescriptionsTabContent
        isDoctor={isDoctor}
        isPharmacist={isPharmacist}
        selectedClient={selectedClient}
        prescriptions={prescriptions}
        onOpenPrescriptionModal={() => setShowPrescriptionModal(true)}
        onEditPrescription={handleEditPrescription}
        onDeletePrescription={handleDeletePrescription}
        onUpdatePrescriptionItem={handleUpdatePrescriptionItem}
        userProfile={userProfile}
      />
    );
  };
  
  // OLD PRESCRIPTION TAB (BACKUP - TO BE REMOVED)
  const renderPrescriptionsTabOLD = () => {
    // Pharmacist-specific view
    if (isPharmacist) {
    return (
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Pill className="h-8 w-8 text-indigo-600 mr-3" />
                Prescription Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review prescriptions, mark availability, and set pricing
              </p>
            </div>
            {selectedClient && pharmacistMedData && Object.keys(pharmacistMedData).length > 0 && (
                  <button
                onClick={savePharmacistMedicationData}
                disabled={savingPharmacistData}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50"
                  >
                <CheckCircle className="h-4 w-4 mr-2" />
                {savingPharmacistData ? 'Saving...' : 'Save Changes'}
                  </button>
            )}
                </div>

          {/* Client Selector for Pharmacists */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                const client = assignedClients.find(c => c.id === e.target.value);
                setSelectedClient(client || null);
              }}
              className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select a client --</option>
              {assignedClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name || client.fullName}
                </option>
              ))}
            </select>
            {assignedClients.length === 0 && (
              <p className="text-sm text-gray-600 mt-2">
                No clients assigned yet. Contact your institution admin.
              </p>
            )}
          </div>

          {/* Prescriptions Display */}
          {!selectedClient ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Pill className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Client Selected</h3>
              <p className="text-gray-600">
                Please select a client to view their prescriptions and manage medication availability.
              </p>
              </div>
            ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <User className="h-5 w-5 text-indigo-600 mr-2" />
                  Prescriptions for {selectedClient.name || selectedClient.fullName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Mark medications as available in your store and set pricing
                </p>
              </div>

              <div className="p-6">
                {selectedClient.medications && selectedClient.medications.length > 0 ? (
                  <div className="space-y-4">
                    {(Array.isArray(selectedClient.medications) 
                      ? selectedClient.medications 
                      : [selectedClient.medications]
                    ).map((med, index) => {
                      const medName = typeof med === 'string' ? med : med.name || `Medication ${index + 1}`;
                      const medData = pharmacistMedData[medName] || {};
                      
                      return (
                        <div key={index} className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-5 border border-indigo-200">
                          {/* Medication Info */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900 flex items-center">
                                <Pill className="h-5 w-5 text-indigo-600 mr-2" />
                                {medName}
                              </h4>
                              {typeof med === 'object' && (
                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                  {med.dosage && (
                                    <p><span className="font-semibold">Dosage:</span> {med.dosage}</p>
                                  )}
                                  {med.frequency && (
                                    <p><span className="font-semibold">Frequency:</span> {med.frequency}</p>
                                  )}
                                  {med.instructions && (
                                    <p><span className="font-semibold">Instructions:</span> {med.instructions}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pharmacist Controls */}
                          <div className="bg-white rounded-lg p-4 border border-indigo-300 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Availability Checkbox */}
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`available-${index}`}
                                  checked={medData.available || false}
                                  onChange={(e) => updateMedicationData(medName, 'available', e.target.checked)}
                                  className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor={`available-${index}`} className="ml-3 text-sm font-medium text-gray-900">
                                  Available in Store
                                </label>
                              </div>

                              {/* Price Input */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price (₦)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={medData.price || ''}
                                  onChange={(e) => updateMedicationData(medName, 'price', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>

                              {/* Quantity Input */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Stock Quantity
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={medData.quantity || ''}
                                  onChange={(e) => updateMedicationData(medName, 'quantity', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>

                              {/* Notes */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Notes
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., Generic available"
                                  value={medData.notes || ''}
                                  onChange={(e) => updateMedicationData(medName, 'notes', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>
                            </div>

                            {/* Status Badge */}
                            {medData.available && (
                              <div className="mt-3 flex items-center text-sm">
                                <span className="px-3 py-1 bg-green-100 text-green-800 font-semibold rounded-full flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Available - ₦{medData.price || '0.00'}
                                </span>
                                {medData.quantity && (
                                  <span className="ml-2 text-gray-600">
                                    ({medData.quantity} in stock)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : selectedClient.currentMedications ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-900 mb-2">Legacy Medication Data</h4>
                    <p className="text-gray-900">{selectedClient.currentMedications}</p>
                    <p className="text-sm text-yellow-700 mt-2">
                      This client has medication data in text format. Ask the doctor to update prescriptions.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prescriptions</h3>
                <p className="text-gray-600">
                      This client doesn't have any active prescriptions yet.
                </p>
              </div>
            )}
          </div>
        </div>
          )}
      </div>
    );
    }

    // Original doctor/nurse/caregiver view
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prescriptions & Medications</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isDoctor ? 'Prescribe and manage medications' : 'View prescribed medications'}
            </p>
          </div>
          {isDoctor && selectedClient && (
            <button
              onClick={() => setShowMedicationModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Prescribe Medication
            </button>
          )}
        </div>

        {/* Current Medications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6">
            {!selectedClient ? (
              <div className="text-center py-12">
                <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Client</h3>
                <p className="text-gray-600">
                  Please select a client from the Clients tab to view their medications.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Client Medications Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900">
                      Current Medications for {selectedClient.name || selectedClient.fullName}
                </h3>
                    {isNurse && (
                  <button
                    onClick={() => setShowMedicationModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                        Manage
                  </button>
                    )}
                </div>
                  
                  {selectedClient.medications && selectedClient.medications.length > 0 ? (
                    <div className="space-y-3">
                      {(Array.isArray(selectedClient.medications) 
                        ? selectedClient.medications 
                        : [selectedClient.medications]
                      ).map((med, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-blue-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {typeof med === 'string' ? med : med.name || 'Medication'}
                              </h4>
                              {typeof med === 'object' && (
                                <>
                                  {med.dosage && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium">Dosage:</span> {med.dosage}
                                    </p>
                                  )}
                                  {med.frequency && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Frequency:</span> {med.frequency}
                                    </p>
                                  )}
                                  {med.instructions && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Instructions:</span> {med.instructions}
                                    </p>
                                  )}
                                </>
                              )}
                  </div>
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              Active
                            </span>
                  </div>
                </div>
                      ))}
                    </div>
                  ) : selectedClient.currentMedications ? (
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <p className="text-gray-900">{selectedClient.currentMedications}</p>
              </div>
            ) : (
                    <div className="text-center py-6">
                      <Pill className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">No medications currently prescribed</p>
                      {isDoctor && (
                        <button
                          onClick={() => setShowMedicationModal(true)}
                          className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Prescribe First Medication
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Medication History Placeholder */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <FileText className="h-5 w-5 text-gray-600 mr-2" />
                    Medication History
                  </h3>
                  <p className="text-sm text-gray-600">
                    View complete medication history, dosage changes, and administration logs.
                  </p>
                  <button
                    onClick={() => {
                      if (isNurse || isDoctor) {
                        setShowMedicationModal(true);
                      } else {
                        toast.info('Contact your supervising nurse or doctor to manage medications');
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConsultationsTab = () => {
    return (
      <ConsultationsTabContent
        isDoctor={isDoctor}
        selectedClient={selectedClient}
        consultations={consultations}
        onOpenConsultationModal={() => setShowConsultationModal(true)}
        userProfile={userProfile}
      />
    );
  };

  const renderDiagnosticsTab = () => {
    if (!selectedClient) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <FlaskConical className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Client</h3>
            <p className="text-gray-600">
              Please select a client from the dropdown above to view their diagnostic tests and results.
            </p>
          </div>
        </div>
      );
    }

    return (
      <DiagnosticsTab
        clientId={selectedClient.id}
        clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
        userProfile={userProfile}
        institutionId={institutionId}
        onClose={() => {}}
      />
    );
  };

  // Tasks Tab Renderer
  const renderTasksTab = () => {
    const todayTasks = recentTasks.filter(task => {
      if (!task.scheduledTime && !task.dueDate) return false;
      const taskDate = new Date(task.scheduledTime || task.dueDate);
      const today = new Date();
      return taskDate.toDateString() === today.toDateString();
    });

    const upcomingTasks = recentTasks.filter(task => {
      if (!task.scheduledTime && !task.dueDate) return false;
      const taskDate = new Date(task.scheduledTime || task.dueDate);
      const today = new Date();
      return taskDate > today && taskDate.toDateString() !== today.toDateString();
    });

    const pendingTasks = recentTasks.filter(task => 
      task.status === 'pending' || task.status === 'assigned'
    );

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Today's Tasks</p>
                <p className="text-2xl font-bold text-blue-900">{todayTasks.length}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingTasks.length}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-xl border border-green-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Upcoming Tasks</p>
                <p className="text-2xl font-bold text-green-900">{upcomingTasks.length}</p>
              </div>
              <Calendar className="h-10 w-10 text-green-600" />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Tasks</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your care tasks and assignments</p>
          </div>
          
          <div className="p-6">
            {recentTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Assigned</h3>
                <p className="text-gray-600">
                  You don't have any tasks assigned at the moment. Check back later for new assignments.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {task.title || task.taskTitle || task.description || 'Care Task'}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' || task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'pending' || task.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status || 'Pending'}
                          </span>
                        </div>
                        
                        {task.description && task.description !== task.title && (
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {task.clientName && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                <span className="font-medium">Client:</span> {task.clientName}
                              </span>
          </div>
                          )}
                          
                          {(task.scheduledTime || task.dueDate) && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                <span className="font-medium">Due:</span> {new Date(task.scheduledTime || task.dueDate).toLocaleString()}
                              </span>
                            </div>
                          )}
                          
                          {task.priority && (
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className={`h-4 w-4 ${
                                task.priority === 'high' ? 'text-red-500' :
                                task.priority === 'medium' ? 'text-yellow-500' :
                                'text-green-500'
                              }`} />
                              <span className="text-gray-700">
                                <span className="font-medium">Priority:</span> {task.priority || 'Normal'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {task.status !== 'completed' && (
                          <button
                            onClick={async () => {
                              try {
                                // Mark task as completed
                                toast.success('Task marked as completed!');
                              } catch (error) {
                                console.error('Error completing task:', error);
                                toast.error('Failed to complete task');
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowTaskDetailsModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
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
    );
  };

  // Care Logs Tab Renderer
  const renderCareLogsTab = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Care Logs</h2>
          <p className="text-sm text-gray-600 mt-1">Document care activities and observations</p>
        </div>

        {/* Client Selection and Action */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Client Selector */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client
              </label>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = assignedClients.find(c => c.id === e.target.value);
                  setSelectedClient(client || null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Choose a client...</option>
                {assignedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || client.fullName || 'Unknown Client'} - {client.age || 'N/A'} yrs
                  </option>
                ))}
              </select>
            </div>

            {/* Write Care Log Button */}
            <button
              onClick={() => {
                if (!selectedClient) {
                  toast.error('Please select a client first');
                  return;
                }
                setShowCareLogForm(true);
              }}
              disabled={!selectedClient}
              className={`px-6 py-3 rounded-lg transition-colors flex items-center font-medium ${
                selectedClient
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="h-5 w-5 mr-2" />
              Write Care Log
            </button>
          </div>

          {selectedClient && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Recording care log for: {selectedClient.name || selectedClient.fullName}
                  </p>
                  <p className="text-xs text-blue-700">
                    All logs will be saved with current date and time
                </p>
              </div>
              </div>
            </div>
          )}
        </div>

        {/* Care Logs List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6">
            {!selectedClient ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Client Selected</h3>
                <p className="text-gray-600">
                  Please select a client from the dropdown above to view and create care logs.
                </p>
              </div>
            ) : careLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Care Logs Yet</h3>
                <p className="text-gray-600">
                  Start documenting care activities for {selectedClient.name || selectedClient.fullName}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {careLogs.map((log) => (
                  <div key={log.id} className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          log.roleType === 'doctor' ? 'bg-blue-100 text-blue-800' :
                          log.roleType === 'nurse' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {log.roleType?.toUpperCase() || 'CARE'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {log.caregiverName || 'Staff Member'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {log.logDate instanceof Date 
                          ? log.logDate.toLocaleDateString() 
                          : new Date(log.logDate).toLocaleDateString()}
                        {' at '}{log.logTime}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-600 uppercase">Activity:</span>
                        <p className="text-sm text-gray-900 mt-1">{log.activity}</p>
                      </div>
                      
                      {log.observations && (
                        <div>
                          <span className="text-xs font-medium text-gray-600 uppercase">Observations:</span>
                          <p className="text-sm text-gray-700 mt-1">{log.observations}</p>
              </div>
            )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {log.vitalSigns && (
                          <div className="bg-red-50 rounded p-3">
                            <span className="text-xs font-medium text-red-800 uppercase">Vital Signs:</span>
                            <p className="text-sm text-red-900 mt-1">{log.vitalSigns}</p>
          </div>
                        )}
                        
                        {log.medications && (
                          <div className="bg-green-50 rounded p-3">
                            <span className="text-xs font-medium text-green-800 uppercase">Medications:</span>
                            <p className="text-sm text-green-900 mt-1">{log.medications}</p>
                          </div>
                        )}
                        
                        {log.foodIntake && (
                          <div className="bg-blue-50 rounded p-3">
                            <span className="text-xs font-medium text-blue-800 uppercase">Food Intake:</span>
                            <p className="text-sm text-blue-900 mt-1">{log.foodIntake}</p>
                          </div>
                        )}
                        
                        {log.moodBehavior && (
                          <div className="bg-purple-50 rounded p-3">
                            <span className="text-xs font-medium text-purple-800 uppercase">Mood & Behavior:</span>
                            <p className="text-sm text-purple-900 mt-1">{log.moodBehavior}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Quick Log Activity
  const handleQuickLogActivity = async (category, activityType) => {
    if (!selectedClientId) {
      toast.error('Please select a client first');
      return;
    }

    try {
      const client = assignedClients.find(c => c.id === selectedClientId);
      const activityData = {
        caregiverId: user.uid,
        caregiverName: userProfile?.name || userProfile?.displayName || 'Caregiver',
        clientId: selectedClientId,
        clientName: client?.name || client?.displayName || 'Client',
        institutionId: effectiveInstitutionId,
        category,
        activityType,
        description: `${activityType} performed`,
        notes: '',
        duration: 15,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        qualityRating: 5
      };

      await activitiesAPI.logActivity(activityData);
      toast.success(`${activityType} logged successfully!`);
      loadActivities(); // Reload activities
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    }
  };

  // Log custom activity
  const handleLogCustomActivity = async () => {
    if (!activityFormData.clientId) {
      toast.error('Please select a client');
      return;
    }

    try {
      const client = assignedClients.find(c => c.id === activityFormData.clientId);
      const activityData = {
        ...activityFormData,
        caregiverId: user.uid,
        caregiverName: userProfile?.name || userProfile?.displayName || 'Caregiver',
        clientName: client?.name || client?.displayName || 'Client',
        institutionId: effectiveInstitutionId
      };

      await activitiesAPI.logActivity(activityData);
      toast.success('Activity logged successfully!');
      setShowActivityModal(false);
      setActivityFormData({
        category: '',
        activityType: '',
        description: '',
        notes: '',
        duration: 15,
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date().toISOString().slice(0, 16),
        clientId: '',
        qualityRating: 5
      });
      loadActivities();
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    }
  };

  // Activities Tab Renderer
  const renderActivitiesTab = () => {
    console.log('🎯 ADL Logger - Activities tab rendering', { 
      selectedClientId, 
      selectedClient: selectedClient?.name || selectedClient?.fullName,
      activeTab 
    });
    
    // Check if a client is selected
    if (!selectedClientId || !selectedClient) {
    return (
      <div className="space-y-6">
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client First</h3>
            <p className="text-gray-600 mb-4">Please go to the Clients tab and select a client to log activities for them.</p>
              <button
              onClick={() => setActiveTab('clients')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
              Go to Clients Tab
              </button>
            </div>
                      </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* ADL Logger Component */}
        <AdlLogger 
          clientId={selectedClientId}
          clientName={selectedClient.name || selectedClient.fullName}
          onActivityLogged={(log) => {
            console.log('Activity logged:', log);
            toast.success(`Activity logged for ${log.clientName}`);
            
            // Optional: Refresh any related data or update stats
            // loadActivities(); // if you want to refresh the old activities
          }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <InstitutionCaregiverGuard>
    <div className="w-full h-full bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header/Top Bar */}
      {isMobile && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm safe-area-top">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Heart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="brand-title-alt text-gray-900">Care Master</h1>
                  <p className="text-xs text-gray-500">{dashboardConfig.title}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600" />
              <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      {(isDoctor || isNurse || isNonMedicalCaregiver) && (
        <div className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-full max-w-xs transform transition-transform duration-300 ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`
            : `${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`
          }
          bg-white shadow-lg border-r border-gray-200 flex flex-col safe-area-inset
        `}>
          {/* Sidebar Header */}
          <div className="p-4 md:p-6 border-b border-gray-100 shrink-0">
            {!sidebarCollapsed || isMobile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                    <Heart className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="brand-title-alt text-gray-900 truncate">Care Master</h1>
                    <p className="text-xs text-gray-500 truncate">Care Portal</p>
                  </div>
                </div>
                {isMobile && (
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation shrink-0"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6 text-gray-600" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto smooth-scroll">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                if (isMobile) setSidebarCollapsed(true);
              }}
              className={`w-full flex items-center px-3 md:px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-feedback ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Home className={`h-5 w-5 shrink-0 ${sidebarCollapsed && !isMobile ? 'mx-auto' : 'mr-3'}`} />
              {(!sidebarCollapsed || isMobile) && <span className="truncate">Dashboard</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('schedule')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Calendar className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Schedule'}
            </button>
            
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Messages'}
            </button>
            
            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CheckSquare className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Tasks'}
            </button>
            
            <button
              onClick={() => setActiveTab('carelogs')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'carelogs'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Camera className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Care Logs'}
            </button>
            
            <button
              onClick={() => {
                console.log('🎯 Activities tab button clicked!');
                setActiveTab('activities');
                if (isMobile) setSidebarCollapsed(true);
              }}
              className={`w-full flex items-center px-3 md:px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-feedback ${
                activeTab === 'activities'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Activity className={`h-5 w-5 shrink-0 ${sidebarCollapsed && !isMobile ? 'mx-auto' : 'mr-3'}`} />
              {(!sidebarCollapsed || isMobile) && <span className="truncate">Activities</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'clients'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Clients'}
            </button>
            
            {/* Medical tabs - only show for doctors, nurses, and pharmacists */}
            {(isDoctor || isNurse || isPharmacist) && (
              <>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'prescriptions'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Pill className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Prescriptions'}
            </button>
            
            <button
              onClick={() => setActiveTab('consultations')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'consultations'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Stethoscope className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Consultations'}
            </button>
            
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileText className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Diagnostics'}
            </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('help')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'help'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <HelpCircle className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Help & Support'}
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-2 ${
                showSettings 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Settings className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Settings'}
            </button>
            
            <button
              onClick={() => {
                // Clear tab session
                sessionManager.clearTabSession();
                // Import signOut from firebase/auth
                import('firebase/auth').then(({ signOut, getAuth }) => {
                  signOut(getAuth()).then(() => {
                    // Clear user context and redirect to institution landing
                    window.location.href = '/institution';
                  }).catch((error) => {
                    console.error('Error signing out:', error);
                  });
                });
              }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Logout'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Hidden on mobile (we have mobile header at top) */}
        <div className="hidden md:block bg-white shadow-sm border-b border-gray-100 px-4 sm:px-6 md:px-8 py-4 md:py-6">
          <div className="flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                {activeTab === 'dashboard' && 'General Care Dashboard'}
                {activeTab === 'clients' && 'Client Management'}
                {activeTab === 'messages' && 'Messages'}
                {activeTab === 'schedule' && 'Schedule'}
                {activeTab === 'tasks' && 'Tasks'}
                {activeTab === 'carelogs' && 'Care Logs'}
                {activeTab === 'activities' && 'Activities'}
                {activeTab === 'prescriptions' && 'Prescriptions'}
                {activeTab === 'consultations' && 'Consultations'}
                {activeTab === 'diagnostics' && 'Diagnostics'}
                {activeTab === 'help' && 'Help & Support'}
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1 truncate">
                {activeTab === 'dashboard' && `Welcome back, ${caregiver?.name || userProfile?.name || 'User'}`}
                {activeTab === 'clients' && 'Manage your assigned clients'}
                {activeTab === 'messages' && 'Communicate with team members'}
                {activeTab === 'schedule' && 'View your upcoming schedule'}
                {activeTab === 'tasks' && 'Manage your care tasks'}
                {activeTab === 'carelogs' && 'View and manage care logs'}
                {activeTab === 'activities' && 'Track your activities'}
                {activeTab === 'prescriptions' && 'View prescribed medications'}
                {activeTab === 'consultations' && 'View consultation notes'}
                {activeTab === 'diagnostics' && 'View diagnostic results'}
              </p>
              {activeTab === 'dashboard' && (
                <div className="flex items-center mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userProfile?.medicalQualification || 'General Medicine'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {userRoles && userRoles.length > 1 && (
                <div className="hidden lg:block">
                  <DashboardSwitcher 
                    userRoles={userRoles} 
                    currentDashboard={userProfile?.medicalQualification?.toLowerCase() || userProfile?.userType || 'caregiver'} 
                    institutionId={effectiveInstitutionId}
                  />
                </div>
              )}
              <button 
                onClick={() => setShowProfileSettings(true)}
                className="flex items-center px-3 md:px-4 py-2 text-xs md:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors touch-manipulation"
                title="Profile Settings"
              >
                <User className="h-4 w-4 mr-2" />
                <span className="hidden lg:inline">Profile</span>
              </button>
              <button className="hidden md:flex items-center px-3 md:px-4 py-2 text-xs md:text-sm text-gray-600 hover:text-gray-900 transition-colors touch-manipulation">
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden lg:inline">Refresh</span>
              </button>
              <div className="flex items-center gap-2 md:gap-3">
                <Bell className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onLoad={() => console.log('Profile image loaded successfully')}
                        onError={() => console.log('Profile image failed to load')}
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {caregiver?.name ? caregiver.name.toString().split(' ').map(n => n[0]).join('') : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block text-right min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {caregiver?.name || userProfile?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">Caregiver</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Client Selector (if doctor) */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 pt-3 sm:pt-4 md:pt-6">
          {renderDoctorClientSelector()}
        </div>

        {/* Summary Cards - Only show on dashboard */}
        {activeTab === 'dashboard' && (
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-4 md:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
              <div 
                onClick={() => {
                  setActiveTab('clients');
                  if (isMobile) setSidebarCollapsed(true);
                }}
                className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all active:scale-95 touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Assigned Clients</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{assignedClients.length}</p>
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="truncate">Click to view</span>
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-blue-50 rounded-lg shrink-0 ml-2">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => {
                  setActiveTab('tasks');
                  if (isMobile) setSidebarCollapsed(true);
                }}
                className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 cursor-pointer hover:shadow-md hover:border-green-200 transition-all active:scale-95 touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Today's Tasks</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{recentTasks.length}</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="truncate">Click to view</span>
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-green-50 rounded-lg shrink-0 ml-2">
                    <CheckSquare className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => {
                  setActiveTab('tasks');
                  if (isMobile) setSidebarCollapsed(true);
                }}
                className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all active:scale-95 touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Pending Tasks</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{recentTasks.filter(task => task.status !== 'completed').length}</p>
                    <p className="text-xs text-orange-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="truncate">Click to view</span>
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-orange-50 rounded-lg shrink-0 ml-2">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => {
                  setActiveTab('messages');
                  if (isMobile) setSidebarCollapsed(true);
                }}
                className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 cursor-pointer hover:shadow-md hover:border-purple-200 transition-all active:scale-95 touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Unread Messages</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{conversations.filter(c => c.unread > 0).length}</p>
                    <p className="text-xs text-purple-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="truncate">Click to view</span>
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-purple-50 rounded-lg shrink-0 ml-2">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-4 md:mt-6">
              <button className="flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base touch-manipulation">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Weekly Overview</span>
                <span className="sm:hidden">Overview</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 pb-4 md:pb-8 w-full safe-area-bottom">
          {/* Top right portal switcher */}
          <div className="w-full flex justify-end pt-2 md:pt-4 pb-2">
            <div className="scale-90 md:scale-100">
              <PortalSwitcher />
            </div>
          </div>
        {showSettings ? (
          <CaregiverSettings onProfileImageUpdate={updateProfileImage} />
        ) : activeTab === 'messages' ? (
          renderMessagesTab()
        ) : activeTab === 'schedule' ? (
          renderScheduleTab()
        ) : activeTab === 'tasks' ? (
          renderTasksTab()
        ) : activeTab === 'carelogs' ? (
          renderCareLogsTab()
        ) : activeTab === 'activities' ? (
          renderActivitiesTab()
        ) : activeTab === 'clients' ? (
          renderClientsTab()
        ) : activeTab === 'prescriptions' && (isDoctor || isNurse || isPharmacist) ? (
          renderPrescriptionsTab()
        ) : activeTab === 'consultations' && (isDoctor || isNurse || isPharmacist) ? (
          renderConsultationsTab()
        ) : activeTab === 'diagnostics' && (isDoctor || isNurse || isPharmacist) ? (
          renderDiagnosticsTab()
        ) : activeTab === 'help' ? (
          <HelpSupport userRole={userProfile?.userType || userProfile?.type || 'caregiver'} />
        ) : (
          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {/* Active Tasks Section */}
            {activeTasks.length > 0 && (
              <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-green-200 p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                      <Clock className="h-5 w-5 md:h-6 md:w-6 text-green-600 mr-2" />
                      Active Tasks ({activeTasks.length})
                    </h2>
                    <p className="text-sm md:text-base text-gray-600 mt-1">
                      Tasks currently in progress with time tracking
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {activeTasks.map((task) => {
                    const hours = Math.floor(task.elapsedHours || 0);
                    const minutes = task.elapsedMinutes || 0;
                    const displayTime = hours > 0 
                      ? `${hours}:${minutes.toString().padStart(2, '0')}`
                      : `${minutes} min`;
                    
                    return (
                      <div key={task.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {task.title || task.taskName || task.type || 'Care Task'}
                            </h3>
                            {task.clientName && (
                              <p className="text-sm text-gray-600 mb-2">
                                Client: {task.clientName}
                              </p>
                            )}
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">
                                  {displayTime}
                                </span>
                              </div>
                              {task.hourlyRate > 0 && (
                                <div className="text-xs text-gray-500">
                                  Rate: ${task.hourlyRate}/hr
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setShowTaskCompletionModal(true);
                            }}
                            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* General Care Provider Dashboard Section */}
            <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 md:mb-6 gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">General Care Provider Dashboard</h2>
                  <p className="text-sm md:text-base text-gray-600">Essential caregiving tools and client management</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 md:p-4 shrink-0 w-full sm:w-auto">
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Qualification Level</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">
                    {userProfile?.medicalQualification?.includes('Doctor') ? 'Advanced' : 
                     userProfile?.medicalQualification?.includes('Nurse') ? 'Intermediate' : 'Basic'}
                  </p>
                </div>
              </div>
              
              {/* Specializations and Certifications Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-gray-50 rounded-lg md:rounded-xl border border-gray-100 p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Your Specializations</h3>
                  <div className="space-y-3">
                    {userProfile?.specializations?.length > 0 ? (
                      userProfile.specializations.map((spec, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{spec}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">No specializations added yet</p>
                        <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Add Specializations
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg md:rounded-xl border border-gray-100 p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Certifications</h3>
                  <div className="space-y-3">
                    {userProfile?.certifications?.length > 0 ? (
                      userProfile.certifications.map((cert, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{cert}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">No certifications added yet</p>
                        <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Add Certifications
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Morning Briefing for Nurses */}
            {(userProfile?.medicalQualification?.includes('Nurse') || userProfile?.medicalQualification?.includes('RN')) && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg md:rounded-xl shadow-sm border border-red-100 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Heart className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                    Morning Briefing
                  </h2>
                  <span className="text-xs md:text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <p className="text-sm font-medium text-gray-600">Client Census</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{assignedClients.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Assigned clients</p>
                  </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium text-gray-600">Priority Alerts</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">0</p>
                  <p className="text-xs text-gray-500 mt-1">Critical attention needed</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-gray-600">Medications Due</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{todaySchedule.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Scheduled today</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-medium text-gray-600">Assessments</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{assignedClients.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Due today</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Qualification-Specific Quick Actions */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 truncate">Quick Actions for {userProfile?.medicalQualification || 'Healthcare Professional'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {dashboardConfig.quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-${dashboardConfig.color}-300 hover:bg-${dashboardConfig.color}-50 transition-colors group`}
                >
                  <action.icon className={`h-8 w-8 text-${dashboardConfig.color}-600 mb-2 group-hover:text-${dashboardConfig.color}-700`} />
                  <span className="text-sm font-medium text-gray-700 text-center">{action.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Today's Visits</p>
                  <p className="text-3xl font-bold text-gray-900">{todaySchedule.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{recentTasks.filter(t => t.status === 'completed').length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Rating</p>
                  <p className="text-3xl font-bold text-gray-900">{caregiver?.rating}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">₦{(caregiver?.thisMonthEarnings || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Priority Alerts Section for Nurses */}
          {(userProfile?.medicalQualification?.includes('Nurse') || userProfile?.medicalQualification?.includes('RN')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Alerts */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Priority Alerts
                </h2>
                
                <div className="space-y-3">
                  {assignedClients.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Shield className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No priority alerts</p>
                      <p className="text-xs mt-1">All clients stable</p>
                    </div>
                  ) : (
                    assignedClients.slice(0, 5).map((client, index) => (
                      <div key={client.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`flex-shrink-0 h-2 w-2 rounded-full mt-2 ${
                          index === 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">All vitals within normal range</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activities
                </h2>
                
                <div className="space-y-3">
                  {recentTasks.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Clock className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No recent activities</p>
                      <p className="text-xs mt-1">Start documenting care</p>
                    </div>
                  ) : (
                    recentTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{task.task || task.title}</p>
                          <p className="text-xs text-gray-500">
                            {task.clientName} • {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
            </div>
            <div className="p-8">
              <div className="space-y-6">
                {(todaySchedule && Array.isArray(todaySchedule) ? todaySchedule : []).map((schedule) => (
                  <div key={schedule.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <h3 className="text-xl font-semibold text-gray-900">{schedule.clientName}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="font-medium">{formatTime(schedule.time)} ({schedule.duration})</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="font-medium">{schedule.address}</span>
                          </div>
                        </div>
                        {schedule.tasks && Array.isArray(schedule.tasks) && schedule.tasks.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Tasks:</h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {schedule.tasks.map((task, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-600">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                  {task}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {schedule.notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{schedule.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-3 ml-8">
                        <button
                          onClick={() => handleClockIn(schedule.id)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Clock In
                        </button>
                        <button
                          onClick={() => handleClockOut(schedule.id)}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                          Clock Out
                        </button>
                        <button
                          onClick={() => handleEmergency(schedule.clientId)}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Emergency
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Recent Tasks</h2>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">{task.task}</h4>
                        <p className="text-sm text-gray-600">{task.clientName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(task.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
              </div>
              <div className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Punctuality</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-gray-200 rounded-full h-3 mr-4">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: `${performance.punctuality}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{performance.punctuality}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Task Completion</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-gray-200 rounded-full h-3 mr-4">
                        <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${performance.taskCompletion}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{performance.taskCompletion}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Client Satisfaction</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 mr-2" />
                      <span className="text-lg font-bold text-gray-900">{performance.clientSatisfaction}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Communication</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 mr-2" />
                      <span className="text-lg font-bold text-gray-900">{performance.communication}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Safety Record</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-gray-200 rounded-full h-3 mr-4">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: `${performance.safety}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{performance.safety}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-500 mt-1">Common actions for your role</p>
              </div>
              <div className="p-8">
                {isDoctor ? (
                  // Doctor Quick Actions
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleNewConsultation}
                      disabled={!selectedClient}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Stethoscope className="h-8 w-8 text-blue-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">New Consultation</span>
                      <span className="text-xs text-gray-500 mt-1">Record Client visit</span>
                    </button>
                    <button 
                      onClick={handleWritePrescription}
                      disabled={!selectedClient}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pill className="h-8 w-8 text-indigo-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">Write Prescription</span>
                      <span className="text-xs text-gray-500 mt-1">Prescribe medication</span>
                    </button>
                    <button 
                      onClick={handleCreateCarePlan}
                      disabled={!selectedClient}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ClipboardList className="h-8 w-8 text-emerald-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">Create Care Plan</span>
                      <span className="text-xs text-gray-500 mt-1">Plan treatment</span>
                    </button>
                    {/* Video consultation removed - clients don't have accounts */}
                  </div>
                ) : (
                  // Nurse/Caregiver Quick Actions
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setActiveTab('messages')}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <MessageSquare className="h-8 w-8 text-blue-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">Messages</span>
                      <span className="text-xs text-gray-500 mt-1">Chat with team</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (!selectedClient) {
                          toast.warning('Please select a client first');
                          return;
                        }
                        setShowNurseReportModal(true);
                      }}
                      disabled={!selectedClient}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="h-8 w-8 text-green-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">Nurse Report</span>
                      <span className="text-xs text-gray-500 mt-1">Record vitals</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (!selectedClient) {
                          toast.warning('Please select a client first');
                          return;
                        }
                        setShowCareLogsModal(true);
                      }}
                      disabled={!selectedClient}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Heart className="h-8 w-8 text-purple-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">Care Log</span>
                      <span className="text-xs text-gray-500 mt-1">Log care activity</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('schedule')}
                      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 hover:shadow-md transition-all"
                    >
                      <Calendar className="h-8 w-8 text-orange-600 mb-3" />
                      <span className="text-sm font-semibold text-gray-900">Schedule</span>
                      <span className="text-xs text-gray-500 mt-1">View tasks</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Modals */}
      {showVitalsModal && selectedClient && (
        <NurseVitalsInput
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowVitalsModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowVitalsModal(false)}
        />
      )}

      {showCareLogsModal && selectedClient && (
        <NurseCareLogs
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowCareLogsModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowCareLogsModal(false)}
        />
      )}

      {showCareLogForm && selectedClient && (
        <div style={{ zIndex: 9999 }}>
        <CareLogFormModal
          client={selectedClient}
          caregiver={{ uid: user?.uid, name: userProfile?.name || userProfile?.displayName }}
          institutionId={effectiveInstitutionId}
          roleType={isDoctor ? 'doctor' : isNurse ? 'nurse' : 'caregiver'}
          onSave={async (careLogData) => {
            try {
                console.log('💾 Saving care log:', careLogData);
              await createCareLog(careLogData);
              toast.success('Care log saved successfully');
              
              // Real-time listener will auto-update the list
              
              setShowCareLogForm(false);
            } catch (error) {
              console.error('Error saving care log:', error);
              toast.error('Failed to save care log: ' + error.message);
            }
          }}
            onCancel={() => {
              console.log('❌ Care log modal cancelled');
              setShowCareLogForm(false);
            }}
          />
        </div>
      )}

      {/* Activity Logging Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Log Care Activity</h3>
                  <p className="text-blue-100 text-sm mt-1">Record your care activity details</p>
                </div>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client * 
                </label>
                <select
                  value={activityFormData.clientId}
                  onChange={(e) => setActivityFormData({ ...activityFormData, clientId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a client</option>
                  {assignedClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Category *
                </label>
                <select
                  value={activityFormData.category}
                  onChange={(e) => {
                    const category = e.target.value;
                    setActivityFormData({ 
                      ...activityFormData, 
                      category,
                      activityType: '' // Reset activity type when category changes
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {Object.values(ACTIVITY_CATEGORIES).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Activity Type Selection */}
              {activityFormData.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Type *
                  </label>
                  <select
                    value={activityFormData.activityType}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activityType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select activity type</option>
                    {(COMMON_ACTIVITIES[activityFormData.category] || []).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the activity performed..."
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={activityFormData.duration}
                  onChange={(e) => setActivityFormData({ ...activityFormData, duration: parseInt(e.target.value) || 15 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Quality Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Rating (1-5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setActivityFormData({ ...activityFormData, qualityRating: rating })}
                      className={`p-2 rounded-lg transition-colors ${
                        activityFormData.qualityRating >= rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className={`h-6 w-6 ${activityFormData.qualityRating >= rating ? 'fill-yellow-400' : ''}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">{activityFormData.qualityRating}/5</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={activityFormData.notes}
                  onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional observations or notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogCustomActivity}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Log Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNurseReportModal && selectedClient && (
        <NurseReportGenerator
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowNurseReportModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowNurseReportModal(false)}
        />
      )}

      {showMedicationModal && selectedClient && (
        <NurseMedicationManager
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowMedicationModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowMedicationModal(false)}
        />
      )}

      {/* Doctor: Care Plan Modal */}
      {showCarePlanModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ClipboardList className="h-8 w-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingPlanId ? 'Edit Care Plan' : 'Create Care Plan'}
                  </h2>
                  <p className="text-indigo-100">For: {selectedClient.name || selectedClient.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCarePlanModal(false);
                  setEditingPlanId(null);
                }}
                className="text-white hover:bg-indigo-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={carePlanData.startDate}
                      onChange={(e) => setCarePlanData({...carePlanData, startDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Date</label>
                    <input
                      type="date"
                      value={carePlanData.reviewDate}
                      onChange={(e) => setCarePlanData({...carePlanData, reviewDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Care Objectives</label>
                  <textarea
                    placeholder="List primary care objectives and goals..."
                    rows={3}
                    value={carePlanData.objectives}
                    onChange={(e) => setCarePlanData({...carePlanData, objectives: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Care Activities</label>
                  <textarea
                    placeholder="Specify daily care routines and activities..."
                    rows={4}
                    value={carePlanData.activities}
                    onChange={(e) => setCarePlanData({...carePlanData, activities: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medication Schedule</label>
                  <textarea
                    placeholder="Detail medication times and administration instructions..."
                    rows={3}
                    value={carePlanData.medicationSchedule}
                    onChange={(e) => setCarePlanData({...carePlanData, medicationSchedule: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Requirements</label>
                  <textarea
                    placeholder="Specify dietary needs, restrictions, and meal plans..."
                    rows={3}
                    value={carePlanData.dietary}
                    onChange={(e) => setCarePlanData({...carePlanData, dietary: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobility & Exercise Plan</label>
                  <textarea
                    placeholder="Describe mobility assistance needs and exercise recommendations..."
                    rows={3}
                    value={carePlanData.mobility}
                    onChange={(e) => setCarePlanData({...carePlanData, mobility: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                  <textarea
                    placeholder="Any special care instructions or precautions..."
                    rows={3}
                    value={carePlanData.specialInstructions}
                    onChange={(e) => setCarePlanData({...carePlanData, specialInstructions: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => setShowCarePlanModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (editingPlanId) {
                      // Update existing plan
                      const updatePayload = {
                        startDate: new Date(carePlanData.startDate),
                        reviewDate: carePlanData.reviewDate ? new Date(carePlanData.reviewDate) : null,
                        careObjectives: carePlanData.objectives,
                        dailyCareActivities: carePlanData.activities,
                        medicationSchedule: carePlanData.medicationSchedule,
                        dietaryRequirements: carePlanData.dietary,
                        mobilityPlan: carePlanData.mobility,
                        specialInstructions: carePlanData.specialInstructions
                      };
                      
                      await updateCarePlan(editingPlanId, updatePayload);
                      alert('Care plan updated successfully!');
                      setEditingPlanId(null);
                    } else {
                      // Create new plan
                      const planPayload = {
                        clientId: selectedClient.id,
                        clientName: selectedClient.name || selectedClient.fullName,
                        doctorId: user.uid,
                        doctorName: userProfile?.name || userProfile?.displayName,
                        institutionId: effectiveInstitutionId,
                        startDate: new Date(carePlanData.startDate),
                        reviewDate: carePlanData.reviewDate ? new Date(carePlanData.reviewDate) : null,
                        careObjectives: carePlanData.objectives,
                        dailyCareActivities: carePlanData.activities,
                        medicationSchedule: carePlanData.medicationSchedule,
                        dietaryRequirements: carePlanData.dietary,
                        mobilityPlan: carePlanData.mobility,
                        specialInstructions: carePlanData.specialInstructions
                      };
                      
                      await createCarePlan(planPayload);
                      
                      // Notify admin
                      await notifyAdmin({
                        type: NOTIFICATION_TYPES.SYSTEM,
                        priority: NOTIFICATION_PRIORITIES.MEDIUM,
                        title: editingPlanId ? 'Care Plan Updated' : 'New Care Plan Created',
                        message: `${userProfile?.name || 'A doctor'} ${editingPlanId ? 'updated' : 'created'} a care plan for ${selectedClient.name || selectedClient.fullName}`,
                        data: {
                          planId: editingPlanId || 'new',
                          clientId: selectedClient.id,
                          doctorId: user.uid,
                          action: editingPlanId ? 'care_plan_updated' : 'care_plan_created'
                        }
                      });
                      
                      alert('Care plan created successfully!');
                    }
                    
                    // Real-time listener will auto-update the list
                    
                    // Reset form
                    setCarePlanData({
                      startDate: new Date().toISOString().split('T')[0],
                      reviewDate: '',
                      objectives: '',
                      activities: '',
                      medicationSchedule: '',
                      dietary: '',
                      mobility: '',
                      specialInstructions: ''
                    });
                    setShowCarePlanModal(false);
                  } catch (error) {
                    console.error('Error saving care plan:', error);
                    alert('Failed to save care plan: ' + error.message);
                  }
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {editingPlanId ? 'Update Care Plan' : 'Create Care Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetailsModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-8 w-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Task Details</h2>
                  <p className="text-blue-100">{selectedTask.clientName || 'Client'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTaskDetailsModal(false);
                  setSelectedTask(null);
                }}
                className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-6">
                {/* Task Title and Status */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedTask.title || selectedTask.taskTitle || 'Care Task'}
                  </h3>
                  <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                    selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedTask.status === 'in-progress' || selectedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    selectedTask.status === 'pending' || selectedTask.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.status || 'Pending'}
                  </span>
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{selectedTask.description}</p>
                  </div>
                )}

                {/* Task Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                    <p className="text-gray-900 flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedTask.clientName || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <p className={`flex items-center font-medium ${
                      selectedTask.priority === 'urgent' ? 'text-red-600' :
                      selectedTask.priority === 'high' ? 'text-orange-600' :
                      selectedTask.priority === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {selectedTask.priority || 'Normal'}
                    </p>
                  </div>
                  
                  {selectedTask.scheduledTime && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time</label>
                      <p className="text-gray-900 flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(selectedTask.scheduledTime).toLocaleString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}
                  
                  {selectedTask.dueDate && !selectedTask.scheduledTime && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                      <p className="text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(selectedTask.dueDate).toLocaleString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric'
                        })}
                        {selectedTask.dueTime && ` at ${selectedTask.dueTime}`}
                      </p>
                    </div>
                  )}
                  
                  {selectedTask.assignedBy && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assigned By</label>
                      <p className="text-gray-900">{selectedTask.assignedBy}</p>
                    </div>
                  )}
                  
                  {selectedTask.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Created</label>
                      <p className="text-gray-900">
                        {new Date(selectedTask.createdAt).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {selectedTask.instructions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                    <p className="text-gray-900 bg-blue-50 p-4 rounded-lg border border-blue-200">{selectedTask.instructions}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedTask.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{selectedTask.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTaskDetailsModal(false);
                  setSelectedTask(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              {selectedTask.status !== 'completed' && (
                <button
                  onClick={async () => {
                    try {
                      // Mark task as completed
                      // TODO: Add actual API call to update task status
                      
                      // Notify admin
                      await notifyAdmin({
                        type: NOTIFICATION_TYPES.TASK,
                        priority: NOTIFICATION_PRIORITIES.MEDIUM,
                        title: 'Task Completed',
                        message: `${userProfile?.name || 'A caregiver'} completed task: ${selectedTask.title || 'Care Task'} for ${selectedTask.clientName}`,
                        data: {
                          taskId: selectedTask.id,
                          clientId: selectedTask.clientId,
                          caregiverId: user?.uid,
                          action: 'task_completed'
                        }
                      });
                      
                      toast.success('Task marked as completed!');
                      setShowTaskDetailsModal(false);
                      setSelectedTask(null);
                    } catch (error) {
                      console.error('Error completing task:', error);
                      toast.error('Failed to complete task');
                    }
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Client Details Modal */}
      {selectedClient && activeTab === 'clients' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {(selectedClient.name || selectedClient.fullName || 'C').toString().split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                  </h2>
                  <p className="text-blue-100">Client ID: {selectedClient.id.substring(0, 12)}...</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setClientModalTab('info');
                }}
                className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setClientModalTab('info')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    clientModalTab === 'info'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Client Info</span>
                  </div>
                </button>
                <button
                  onClick={() => setClientModalTab('medical')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    clientModalTab === 'medical'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4" />
                    <span>Medical Report</span>
                  </div>
                </button>
                <button
                  onClick={() => setClientModalTab('carelog')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    clientModalTab === 'carelog'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Care Log</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-160px)] p-6">
              {/* Client Info Tab */}
              {clientModalTab === 'info' && (
                <div className="space-y-6">
                {/* Basic & Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <User className="h-5 w-5 text-blue-600 mr-2" />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Full Name:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedClient.name || selectedClient.fullName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Age:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.age || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Gender:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.gender || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Date of Birth:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.dateOfBirth || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedClient.status === 'Active' || selectedClient.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : selectedClient.status === 'Critical' || selectedClient.status === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedClient.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-green-50 rounded-xl border border-green-100 p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <Phone className="h-5 w-5 text-green-600 mr-2" />
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Phone:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedClient.phone || selectedClient.phoneNumber || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Address:</span>
                        <span className="text-sm font-medium text-gray-900 text-right">
                          {selectedClient.address || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-orange-50 rounded-xl border border-orange-100 p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Contact Name:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedClient.emergencyContact?.name || selectedClient.emergencyContactName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Contact Phone:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedClient.emergencyContact?.phone || selectedClient.emergencyContactPhone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Relationship:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedClient.emergencyContact?.relationship || selectedClient.emergencyContactRelationship || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Medical Report Tab */}
              {clientModalTab === 'medical' && (
                <div className="space-y-6">
                  {loadingReports ? (
                    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                      <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading medical records...</p>
                    </div>
                  ) : (
                    <>
                      {/* Base Medical Information */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Medical Conditions */}
                        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                          <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center">
                            <Heart className="h-4 w-4 text-red-600 mr-2" />
                            Medical Conditions
                          </h4>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(selectedClient.medicalConditions) 
                              ? selectedClient.medicalConditions.join(', ') 
                              : selectedClient.medicalConditions || selectedClient.conditions || 'None recorded'}
                          </p>
                        </div>

                        {/* Allergies */}
                        <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
                          <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                            Allergies
                          </h4>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(selectedClient.allergies)
                              ? selectedClient.allergies.join(', ')
                              : selectedClient.allergies || selectedClient.allergyInfo || 'None recorded'}
                          </p>
                        </div>

                        {/* Current Medications */}
                        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                          <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                            <Pill className="h-4 w-4 text-green-600 mr-2" />
                            Current Medications
                          </h4>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(selectedClient.medications)
                              ? selectedClient.medications.join(', ')
                              : selectedClient.medications || selectedClient.currentMedications || 'None recorded'}
                          </p>
                        </div>
                      </div>

                      {/* Medical Records (Prescriptions, Consultations, Diagnostics) */}
                      <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Stethoscope className="h-5 w-5 text-blue-600 mr-2" />
                            Medical Records
                          </h3>
                        </div>
                        
                        {loadingReports ? (
                          <div className="text-center py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-gray-500 text-sm mt-2">Loading medical records...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Prescriptions */}
                            {clientPrescriptions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center border-b pb-2">
                                  <Pill className="h-4 w-4 text-purple-600 mr-2" />
                                  Prescriptions ({clientPrescriptions.length})
                                </h4>
                                <div className="space-y-2">
                                  {clientPrescriptions.map((prescription) => (
                                    <div key={prescription.id} className="border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                                      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleRecordDetails(prescription.id)}>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                            <p className="text-sm font-medium text-gray-900">
                                              {prescription.diagnosis || 'Prescription'}
                                            </p>
                                          </div>
                                          <p className="text-xs text-gray-500 ml-4 mt-1">
                                            {prescription.createdAt instanceof Date 
                                              ? prescription.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                              : new Date(prescription.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {prescription.doctorName && ` • By: ${prescription.doctorName}`}
                                          </p>
                                        </div>
                                        <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors">
                                          {expandedRecords[prescription.id] ? 'Hide' : 'View Details'}
                                        </button>
                                      </div>
                                      {expandedRecords[prescription.id] && (
                                        <div className="px-4 pb-3 border-t border-gray-200 pt-3 bg-purple-50">
                                          <div className="space-y-2 text-sm">
                                            {prescription.medications && prescription.medications.length > 0 && (
                                              <div>
                                                <p className="font-medium text-gray-700">Medications:</p>
                                                <ul className="ml-4 mt-1 space-y-1">
                                                  {prescription.medications.map((med, idx) => (
                                                    <li key={idx} className="text-gray-600">
                                                      • {med.medicationName} - {med.dosage} ({med.frequency})
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {prescription.instructions && (
                                              <div>
                                                <p className="font-medium text-gray-700">Instructions:</p>
                                                <p className="text-gray-600 ml-4">{prescription.instructions}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Consultations */}
                            {clientConsultations.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center border-b pb-2">
                                  <MessageSquare className="h-4 w-4 text-blue-600 mr-2" />
                                  Consultations ({clientConsultations.length})
                                </h4>
                                <div className="space-y-2">
                                  {clientConsultations.map((consultation) => (
                                    <div key={consultation.id} className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                                      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleRecordDetails(consultation.id)}>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <p className="text-sm font-medium text-gray-900">
                                              {consultation.consultationType || 'Consultation'}
                                            </p>
                                          </div>
                                          <p className="text-xs text-gray-500 ml-4 mt-1">
                                            {consultation.consultationDate instanceof Date 
                                              ? consultation.consultationDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                              : new Date(consultation.consultationDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {consultation.doctorName && ` • By: ${consultation.doctorName}`}
                                          </p>
                                        </div>
                                        <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                                          {expandedRecords[consultation.id] ? 'Hide' : 'View Details'}
                                        </button>
                                      </div>
                                      {expandedRecords[consultation.id] && (
                                        <div className="px-4 pb-3 border-t border-gray-200 pt-3 bg-blue-50">
                                          <div className="space-y-2 text-sm">
                                            {consultation.chiefComplaint && (
                                              <div>
                                                <p className="font-medium text-gray-700">Chief Complaint:</p>
                                                <p className="text-gray-600 ml-4">{consultation.chiefComplaint}</p>
                                              </div>
                                            )}
                                            {consultation.diagnosis && (
                                              <div>
                                                <p className="font-medium text-gray-700">Diagnosis:</p>
                                                <p className="text-gray-600 ml-4">{consultation.diagnosis}</p>
                                              </div>
                                            )}
                                            {consultation.treatmentPlan && (
                                              <div>
                                                <p className="font-medium text-gray-700">Treatment Plan:</p>
                                                <p className="text-gray-600 ml-4">{consultation.treatmentPlan}</p>
                                              </div>
                                            )}
                                            {consultation.notes && (
                                              <div>
                                                <p className="font-medium text-gray-700">Notes:</p>
                                                <p className="text-gray-600 ml-4">{consultation.notes}</p>
                                              </div>
                                            )}
                                            {consultation.followUpDate && (
                                              <div>
                                                <p className="font-medium text-gray-700">Follow-up Date:</p>
                                                <p className="text-gray-600 ml-4">
                                                  {consultation.followUpDate instanceof Date 
                                                    ? consultation.followUpDate.toLocaleDateString() 
                                                    : new Date(consultation.followUpDate).toLocaleDateString()}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Diagnostics */}
                            {clientDiagnostics.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center border-b pb-2">
                                  <Activity className="h-4 w-4 text-green-600 mr-2" />
                                  Diagnostic Tests ({clientDiagnostics.length})
                                </h4>
                                <div className="space-y-2">
                                  {clientDiagnostics.map((diagnostic) => (
                                    <div key={diagnostic.id} className="border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                                      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleRecordDetails(diagnostic.id)}>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            <p className="text-sm font-medium text-gray-900">
                                              {diagnostic.testName || diagnostic.testType || 'Diagnostic Test'}
                                            </p>
                                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                              diagnostic.status === 'completed' ? 'bg-green-100 text-green-700' :
                                              diagnostic.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {diagnostic.status || 'Pending'}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-500 ml-4 mt-1">
                                            {diagnostic.orderDate instanceof Date 
                                              ? diagnostic.orderDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                              : new Date(diagnostic.orderDate || diagnostic.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {diagnostic.doctorName && ` • Ordered by: ${diagnostic.doctorName}`}
                                          </p>
                                        </div>
                                        <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                                          {expandedRecords[diagnostic.id] ? 'Hide' : 'View Details'}
                                        </button>
                                      </div>
                                      {expandedRecords[diagnostic.id] && (
                                        <div className="px-4 pb-3 border-t border-gray-200 pt-3 bg-green-50">
                                          <div className="space-y-2 text-sm">
                                            {diagnostic.testReason && (
                                              <div>
                                                <p className="font-medium text-gray-700">Reason:</p>
                                                <p className="text-gray-600 ml-4">{diagnostic.testReason}</p>
                                              </div>
                                            )}
                                            {diagnostic.results && (
                                              <div>
                                                <p className="font-medium text-gray-700">Results:</p>
                                                <p className="text-gray-600 ml-4">{diagnostic.results}</p>
                                              </div>
                                            )}
                                            {diagnostic.notes && (
                                              <div>
                                                <p className="font-medium text-gray-700">Notes:</p>
                                                <p className="text-gray-600 ml-4">{diagnostic.notes}</p>
                                              </div>
                                            )}
                                            {diagnostic.labName && (
                                              <div>
                                                <p className="font-medium text-gray-700">Laboratory:</p>
                                                <p className="text-gray-600 ml-4">{diagnostic.labName}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Pharmacy Invoices */}
                            {clientInvoices.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center border-b pb-2">
                                  <Receipt className="h-4 w-4 text-amber-600 mr-2" />
                                  Pharmacy Invoices ({clientInvoices.length})
                                </h4>
                                <div className="space-y-2">
                                  {clientInvoices.map((invoice) => (
                                    <div key={invoice.id} className="border border-gray-200 rounded-lg hover:border-amber-300 transition-colors">
                                      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleRecordDetails(invoice.id)}>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                            <p className="text-sm font-medium text-gray-900">
                                              Invoice #{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}
                                            </p>
                                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                              invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {invoice.status || 'Pending'}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-500 ml-4 mt-1">
                                            {invoice.createdAt instanceof Date 
                                              ? invoice.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                              : new Date(invoice.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {invoice.pharmacistName && ` • By: ${invoice.pharmacistName}`}
                                            {invoice.total && ` • Total: ₦${invoice.total.toLocaleString()}`}
                                          </p>
                                        </div>
                                        <button className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors">
                                          {expandedRecords[invoice.id] ? 'Hide' : 'View Details'}
                                        </button>
                                      </div>
                                      {expandedRecords[invoice.id] && (
                                        <div className="px-4 pb-3 border-t border-gray-200 pt-3 bg-amber-50">
                                          <div className="space-y-3 text-sm">
                                            {/* Invoice Items */}
                                            {invoice.items && invoice.items.length > 0 && (
                                              <div>
                                                <p className="font-medium text-gray-700 mb-2">Items:</p>
                                                <div className="space-y-2">
                                                  {invoice.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                                                      <div className="flex-1">
                                                        <p className="text-gray-900 font-medium">{item.name || item.medicationName}</p>
                                                        <p className="text-gray-600 text-xs">
                                                          {item.dosage} - Qty: {item.quantity}
                                                        </p>
                                                      </div>
                                                      <p className="text-gray-900 font-semibold">₦{item.price?.toLocaleString() || '0'}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Totals */}
                                            <div className="border-t pt-3 space-y-1">
                                              <div className="flex justify-between text-gray-700">
                                                <span>Subtotal:</span>
                                                <span>₦{invoice.subtotal?.toLocaleString() || '0'}</span>
                                              </div>
                                              {invoice.tax > 0 && (
                                                <div className="flex justify-between text-gray-700">
                                                  <span>Tax:</span>
                                                  <span>₦{invoice.tax?.toLocaleString() || '0'}</span>
                                                </div>
                                              )}
                                              {invoice.discount > 0 && (
                                                <div className="flex justify-between text-green-700">
                                                  <span>Discount:</span>
                                                  <span>-₦{invoice.discount?.toLocaleString() || '0'}</span>
                                                </div>
                                              )}
                                              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t">
                                                <span>Total:</span>
                                                <span>₦{invoice.total?.toLocaleString() || '0'}</span>
                                              </div>
                                            </div>
                                            
                                            {/* Notes */}
                                            {invoice.notes && (
                                              <div>
                                                <p className="font-medium text-gray-700">Notes:</p>
                                                <p className="text-gray-600 ml-4">{invoice.notes}</p>
                                              </div>
                                            )}
                                            
                                            {/* Payment Info */}
                                            {invoice.paymentMethod && (
                                              <div>
                                                <p className="font-medium text-gray-700">Payment Method:</p>
                                                <p className="text-gray-600 ml-4">{invoice.paymentMethod}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* No records message */}
                            {clientPrescriptions.length === 0 && clientConsultations.length === 0 && clientDiagnostics.length === 0 && clientInvoices.length === 0 && (
                              <div className="text-center py-8">
                                <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">No medical records yet</p>
                                <p className="text-gray-400 text-xs mt-1">Prescriptions, consultations, diagnostic tests, and invoices will appear here</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Care Plans List */}
                      <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <ClipboardList className="h-5 w-5 text-indigo-600 mr-2" />
                            Care Plans ({carePlans.length})
                          </h3>
                          {isDoctor && (
                            <button
                              onClick={() => setShowCarePlanModal(true)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              New Plan
                            </button>
                          )}
                        </div>
                        
                        {carePlans.length === 0 ? (
                          <div className="text-center py-8">
                            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No care plans yet</p>
                            {isDoctor && (
                              <button
                                onClick={() => setShowCarePlanModal(true)}
                                className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                              >
                                Create First Plan
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {carePlans.map((plan) => (
                              <div key={plan.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        plan.status === 'active' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {plan.status || 'Active'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {plan.startDate instanceof Date 
                                          ? plan.startDate.toLocaleDateString() 
                                          : new Date(plan.startDate).toLocaleDateString()}
                                        {plan.reviewDate && ` - ${plan.reviewDate instanceof Date ? plan.reviewDate.toLocaleDateString() : new Date(plan.reviewDate).toLocaleDateString()}`}
                                      </span>
                                    </div>
                                    {plan.careObjectives && (
                                      <p className="text-sm text-gray-900 mb-2">
                                        <span className="font-medium">Objectives:</span> {plan.careObjectives.substring(0, 100)}
                                        {plan.careObjectives.length > 100 && '...'}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      By: {plan.doctorName || 'Doctor'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        // View full plan details
                                        alert(`Care Plan Details:\n\nObjectives: ${plan.careObjectives}\n\nDaily Activities: ${plan.dailyCareActivities}\n\nMedication Schedule: ${plan.medicationSchedule}\n\nDietary: ${plan.dietaryRequirements}\n\nMobility: ${plan.mobilityPlan}\n\nSpecial Instructions: ${plan.specialInstructions || 'None'}`);
                                      }}
                                      className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </button>
                                    <button
                                      onClick={() => {
                                        try {
                                          exportCarePlanToPDF(plan, selectedClient, institutionData);
                                          toast.success('Care plan PDF downloaded!');
                                        } catch (error) {
                                          console.error('Error exporting care plan PDF:', error);
                                          toast.error('Failed to export PDF');
                                        }
                                      }}
                                      className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center"
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      PDF
                                    </button>
                                    {isDoctor && (
                                      <>
                                        <button
                                          onClick={() => {
                                            // Load plan data for editing
                                            setEditingPlanId(plan.id);
                                            setCarePlanData({
                                              startDate: plan.startDate instanceof Date 
                                                ? plan.startDate.toISOString().split('T')[0]
                                                : new Date(plan.startDate).toISOString().split('T')[0],
                                              reviewDate: plan.reviewDate ? (plan.reviewDate instanceof Date 
                                                ? plan.reviewDate.toISOString().split('T')[0]
                                                : new Date(plan.reviewDate).toISOString().split('T')[0]) : '',
                                              objectives: plan.careObjectives || '',
                                              activities: plan.dailyCareActivities || '',
                                              medicationSchedule: plan.medicationSchedule || '',
                                              dietary: plan.dietaryRequirements || '',
                                              mobility: plan.mobilityPlan || '',
                                              specialInstructions: plan.specialInstructions || ''
                                            });
                                            setShowCarePlanModal(true);
                                          }}
                                          className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center"
                                        >
                                          <Edit className="h-4 w-4 mr-1" />
                                          Edit
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this care plan?')) {
                                              try {
                                                await deleteCarePlan(plan.id);
                                                // Real-time listener will auto-update the list
                                                alert('Care plan deleted successfully!');
                                              } catch (error) {
                                                console.error('Error deleting plan:', error);
                                                alert('Failed to delete plan: ' + error.message);
                                              }
                                            }
                                          }}
                                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
                                        >
                                          <X className="h-4 w-4 mr-1" />
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Additional Medical Notes */}
                      {selectedClient.notes && (
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FileText className="h-5 w-5 text-gray-600 mr-2" />
                            Additional Medical Notes
                          </h3>
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-gray-700">{selectedClient.notes}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Role-Specific Medical Actions */}
                  {(isDoctor || isNurse || !isNonMedicalCaregiver) && (
                    <div className="bg-purple-50 rounded-xl border border-purple-100 p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                        <Activity className="h-5 w-5 text-purple-600 mr-2" />
                        {isDoctor ? 'Doctor Actions' : isNurse ? 'Nurse Actions' : 'Medical Actions'}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Doctor-specific actions */}
                        {isDoctor && (
                          <>
                            <button
                              onClick={() => {
                                setShowMedicalReportModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                            >
                              <Stethoscope className="h-6 w-6 text-blue-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Write Medical Report</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowCarePlanModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                            >
                              <ClipboardList className="h-6 w-6 text-indigo-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Create Care Plan</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowMedicationModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                            >
                              <Pill className="h-6 w-6 text-green-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Prescribe Medications</span>
                            </button>
                          </>
                        )}

                        {/* Nurse-specific actions */}
                        {isNurse && (
                          <>
                            <button
                              onClick={() => {
                                setShowVitalsModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-red-200 rounded-lg hover:border-red-300 hover:shadow-md transition-all"
                            >
                              <Activity className="h-6 w-6 text-red-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Record Vitals</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowNurseReportModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all"
                            >
                              <FileText className="h-6 w-6 text-orange-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Write Nurse Report</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowMedicationModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                            >
                              <Pill className="h-6 w-6 text-green-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Manage Medications</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Care Log Tab */}
              {clientModalTab === 'carelog' && (
                <div className="space-y-6">
                  {/* Care Log Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Care Logs & Reports</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {isDoctor && 'Full access to all care logs and medical reports'}
                        {isNurse && 'Record care logs, vital signs, and nurse reports'}
                        {isNonMedicalCaregiver && 'Record daily care activities and observations'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        console.log('🔘 Add Care Log clicked', { selectedClient, showCareLogForm });
                        if (!selectedClient) {
                          toast.error('Please select a client first');
                          return;
                        }
                        console.log('✅ Setting showCareLogForm to true');
                        setShowCareLogForm(true);
                        console.log('✅ showCareLogForm state updated');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Care Log
                    </button>
                  </div>

                  {/* Role-Specific Care Actions */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-8">
                    <div className="text-center mb-6">
                      <FileText className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {isDoctor && 'Doctor Care Management'}
                        {isNurse && 'Nurse Care Documentation'}
                        {isNonMedicalCaregiver && 'Caregiver Activities Log'}
                      </h4>
                      <p className="text-gray-600">
                        {isDoctor && `Comprehensive care management for ${selectedClient.name || selectedClient.fullName}`}
                        {isNurse && `Document care activities, vital signs, and observations for ${selectedClient.name || selectedClient.fullName}`}
                        {isNonMedicalCaregiver && `Record daily care activities for ${selectedClient.name || selectedClient.fullName}`}
                      </p>
                    </div>

                    {/* Doctor Actions */}
                    {isDoctor && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <button
                          onClick={() => setShowMedicalReportModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <Stethoscope className="h-8 w-8 text-blue-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Medical Report</span>
                        </button>

                        <button
                          onClick={() => setShowCarePlanModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                        >
                          <ClipboardList className="h-8 w-8 text-indigo-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Care Plan</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            console.log('🔘 View Care Logs clicked (Doctor)', { selectedClient });
                            if (!selectedClient) {
                              toast.error('Please select a client first');
                              return;
                            }
                            setShowCareLogForm(true);
                          }}
                          className="flex flex-col items-center p-6 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-green-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">View Care Logs</span>
                        </button>

                        <button
                          onClick={() => setShowCareLogsModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
                        >
                          <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">All Records</span>
                        </button>
                      </div>
                    )}

                    {/* Nurse Actions */}
                    {isNurse && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <button
                          onClick={() => {
                            console.log('🔘 Write Care Log clicked (Nurse)', { selectedClient });
                            if (!selectedClient) {
                              toast.error('Please select a client first');
                              return;
                            }
                            setShowCareLogForm(true);
                          }}
                          className="flex flex-col items-center p-6 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-blue-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Write Care Log</span>
                        </button>
                        
                        <button
                          onClick={() => setShowVitalsModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-red-200 rounded-lg hover:border-red-300 hover:shadow-md transition-all"
                        >
                          <Activity className="h-8 w-8 text-red-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Record Vital Signs</span>
                        </button>
                        
                        <button
                          onClick={() => setShowNurseReportModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-orange-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Nurse Report</span>
                        </button>
                      </div>
                    )}

                    {/* Caregiver Actions */}
                    {isNonMedicalCaregiver && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto">
                        <button
                          onClick={() => setShowCareLogForm(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-blue-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Write Care Log</span>
                          <span className="text-xs text-gray-500 mt-1">Record daily activities</span>
                        </button>
                        
                        <button
                          onClick={() => setShowCareLogsModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                        >
                          <ClipboardList className="h-8 w-8 text-green-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">View My Logs</span>
                          <span className="text-xs text-gray-500 mt-1">See your entries</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Care Logs List */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Care Log History ({careLogs.length})
                    </h4>
                    {careLogs.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-sm">No care logs recorded yet</p>
                        <button
                          onClick={() => setShowCareLogForm(true)}
                          className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Add First Care Log
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {careLogs.map((log) => (
                          <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{log.activityType || 'Care Activity'}</h5>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs font-medium text-blue-600">
                                    By: {log.caregiverName || log.createdBy || 'Staff Member'}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <p className="text-xs text-gray-500">
                                    {new Date(log.timestamp || log.createdAt).toLocaleDateString()} at{' '}
                                    {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {log.roleType || 'Caregiver'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{log.notes || log.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => {
          setShowPrescriptionModal(false);
          setEditingPrescriptionId(null);
          setPrescriptionFormData({
            diagnosis: '',
            notes: '',
            medications: [
              {
                name: '',
                dosage: '',
                frequency: '',
                duration: '',
                quantity: '',
                instructions: '',
                route: 'oral'
              }
            ]
          });
        }}
        prescriptionFormData={prescriptionFormData}
        setPrescriptionFormData={setPrescriptionFormData}
        onAddMedication={handleAddMedication}
        onRemoveMedication={handleRemoveMedication}
        onSubmit={handleSubmitPrescription}
        selectedClient={selectedClient}
        isEditing={!!editingPrescriptionId}
      />

      {/* Consultation Modal */}
      <ConsultationModal
        isOpen={showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        consultationFormData={consultationFormData}
        setConsultationFormData={setConsultationFormData}
        onSubmit={handleSubmitConsultation}
        selectedClient={selectedClient}
        relatedMedicalReports={medicalReports || []}
        relatedCareLogs={careLogs || []}
      />
      
      {/* Incoming Call Interface */}
      {incomingCall && (
        <CallInterface
          isOpen={!!incomingCall}
          onClose={handleRejectCall}
          callType={incomingCall.callType}
          participantInfo={{
            id: incomingCall.callerId,
            name: 'Admin',
            role: 'admin'
          }}
          isIncoming={true}
          onCallAccepted={handleAcceptCall}
          onCallRejected={handleRejectCall}
          externalWebrtcService={webrtc}
          externalCallState={callConnectionState}
        />
      )}
      
      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleEndCall}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
            role: 'admin'
          }}
          isIncoming={false}
          externalWebrtcService={webrtc}
          externalCallState={callConnectionState}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <UserProfileSettings
          userId={user?.uid}
          onClose={() => setShowProfileSettings(false)}
        />
      )}
        </div>
      </div>
    </InstitutionCaregiverGuard>
  );
};

export default InstitutionCaregiverDashboard;

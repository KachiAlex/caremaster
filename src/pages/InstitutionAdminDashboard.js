import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useUser } from '../contexts/UserContext';
import authManager from '../utils/authManager';
import sessionManager from '../utils/sessionManager';
import { 
  Users, 
  User,
  Heart, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  UserCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  Stethoscope,
  ClipboardList,
  Briefcase,
  CheckCircle2,
  Circle,
  Dot,
  FileText,
  MessageSquare,
  Eye,
  Download,
  RefreshCw,
  Zap,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Plus,
  Settings,
  LogOut,
  X,
  CheckCircle,
  Trash2,
  Award,
  Building,
  Building2,
  Pill,
  Edit,
  Package,
  Camera,
  Bell,
  ClipboardCheck,
  HelpCircle,
  RotateCcw,
  Loader,
  TestTube,
  XCircle,
  ShieldCheck,
  Bed,
  UserCog,
  UserPlus,
  Database
} from 'lucide-react';
import { getAllUsers, createUser } from '../api/usersAPI';
import { analyticsAPI } from '../api/analyticsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { getAllClients, createClient, updateClient } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { getClientReports, createClientReport, getClientCareLogs, createClientCareLog } from '../api/patientReportsAPI';
import { getCareLogsByCaregiver } from '../api/careLogsAPI';
import * as billingPlansAPI from '../api/billingPlansAPI';
import * as paymentGatewayAPI from '../api/paymentGatewayAPI';
import * as subscriptionInvoiceAPI from '../api/subscriptionInvoiceAPI';
import { getAllAppointments } from '../api/appointmentsAPI';
import { getAllTaskAssignments } from '../api/taskAssignmentAPI';
import { getAllCareTasks } from '../api/careTasksAPI';
import UserNameWithAvatar from '../components/UserNameWithAvatar';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES, notificationsAPI } from '../api/notificationsAPI';
import { institutionAPI } from '../api/institutionAPI';
import InstitutionLinkCustomizer from '../components/InstitutionLinkCustomizer';
import InventoryBillingTab from '../components/InventoryBillingTab';
import CallInterface from '../components/CallInterface';
import UserManagement from '../components/UserManagement';
import DashboardSwitcher from '../components/DashboardSwitcher';
import AdminRoleAssignment from '../components/AdminRoleAssignment';
import ArchivedClients from '../components/ArchivedClients';
import CleanupOrphanedUsers from '../components/CleanupOrphanedUsers';
import InactiveCaregiversReport from '../components/InactiveCaregiversReport';
import SchedulingModule from '../components/SchedulingModule';
import ClientActivityTimeline from '../components/ClientActivityTimeline';
import CaregiverWageManagement from '../components/CaregiverWageManagement';
import CaregiverWageEditModal from '../components/CaregiverWageEditModal';
import UserProfileSettings from '../components/UserProfileSettings';
import InstitutionSettings from '../components/InstitutionSettings';
import HelpSupport from '../components/HelpSupport';
import { toast } from 'react-toastify';
import { getConversationsByUser, getMessagesByConversation, sendMessage as sendMessageAPI, getOrCreateConversation, subscribeToUserConversations, subscribeToConversationMessages } from '../api/messagesAPI';
import CallService from '../services/callService';
import WebRTCService from '../services/webrtcService';
import PortalSwitcher from '../components/PortalSwitcher';
import { getAllDiagnostics, updateDiagnosticTest } from '../api/diagnosticsAPI';
import { trackAdminEvent } from '../services/analyticsService';
import fileStorageService from '../services/fileStorageService';
import CreatePatientModal from '../components/CreatePatientModal';
import QueueManagementDashboard from '../components/QueueManagementDashboard';
import AttendanceTracking from '../components/AttendanceTracking';
import HMOClaimsManagement from '../components/HMOClaimsManagement';
import RadiologyManagement from '../components/RadiologyManagement';
import DischargeManagement from '../components/DischargeManagement';
import EnhancedLISManagement from '../components/EnhancedLISManagement';
import ComplianceManagement from '../components/ComplianceManagement';
import EnhancedTriageManagement from '../components/EnhancedTriageManagement';
import SMSWhatsAppManagement from '../components/SMSWhatsAppManagement';
import EnhancedInventoryManagement from '../components/EnhancedInventoryManagement';
import SecurityManagement from '../components/SecurityManagement';
import AdvancedReporting from '../components/AdvancedReporting';
import DataMigrationTool from '../components/DataMigrationTool';
import TestingQADashboard from '../components/TestingQADashboard';

const formatTimeForDisplay = (time) => {
  if (!time) return '';
  const [hourStr, minuteStr = '00'] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  // Return 24-hour format (HH:MM)
  return `${hour.toString().padStart(2, '0')}:${minuteStr.padStart(2, '0')}`;
};

const buildWorkingHoursSummary = (startTime, endTime) => {
  if (!startTime || !endTime) return [];
  return [`${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`];
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-50">{value}</p>
      </div>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${accent}`}
      >
        <Icon className="h-4 w-4 text-slate-950" />
      </div>
    </div>
  </div>
);

const InstitutionAdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const { user, institutionData, userProfile, institutionId } = useUser();
  const navigate = useNavigate();
  
  // Get institution ID from URL params or user context
  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId || userProfile?.institutionId;
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);

  const displayName =
    userProfile?.name || userProfile?.displayName || userProfile?.email || 'Institution admin';

  const [recentActivity, setRecentActivity] = useState([]);
  const [topCaregivers, setTopCaregivers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    clients: 0,
    caregivers: 0,
    doctors: 0,
    nurses: 0,
    pharmacists: 0,
    activeAppointments: 0,
    activeAssignments: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
    emergencyAlerts: 0,
    medicationReminders: 0,
    systemHealth: 'Good',
    satisfaction: 0,
    responseTime: 0,
    uptime: 99
  });
  
  // Local institution data state (can override context if needed)
  const [localInstitutionData, setLocalInstitutionData] = useState(null);

  // Client and Caregiver Management States
  const [clients, setClients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [pharmacists, setPharmacists] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pendingDiagnostics, setPendingDiagnostics] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showAddPharmacist, setShowAddPharmacist] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState('client-to-caregiver');
  const [selectedClientForAssignment, setSelectedClientForAssignment] = useState('');
  const [selectedCaregiverForAssignment, setSelectedCaregiverForAssignment] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCaregiverPasswordModal, setShowCaregiverPasswordModal] = useState(false);
  const [caregiverPasswordForm, setCaregiverPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resettingCaregiverPassword, setResettingCaregiverPassword] = useState(false);
  const [pendingAssignmentFromCaregiver, setPendingAssignmentFromCaregiver] = useState(null);
  const [caregiverForPasswordReset, setCaregiverForPasswordReset] = useState(null);
  
  // View Details Modal States
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showCaregiverDetails, setShowCaregiverDetails] = useState(false);
  const [showPharmacistDetails, setShowPharmacistDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPharmacist, setSelectedPharmacist] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showWageModal, setShowWageModal] = useState(false);
  const [selectedCaregiverForWage, setSelectedCaregiverForWage] = useState(null);
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [selectedAssignmentForEdit, setSelectedAssignmentForEdit] = useState(null);
  
  // Billing Plans States
  const [billingPlans, setBillingPlans] = useState([]);
  const [showEditBillingPlanModal, setShowEditBillingPlanModal] = useState(false);
  const [selectedBillingPlan, setSelectedBillingPlan] = useState(null);
  
  // Payment Gateway States
  const [paymentGatewayConfig, setPaymentGatewayConfig] = useState(null);
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);

  // Dashboard Card Modal States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [appointmentView, setAppointmentView] = useState('daily'); // daily, weekly, monthly
  
  // Institution Link Customization
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false);
  // Note: institutionData comes from useUser() hook at line 134

  // Messaging states
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callStartAt, setCallStartAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = React.useRef(null);
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [callConnectionState, setCallConnectionState] = useState('connecting'); // Track WebRTC connection state
  
  // Initialize call service
  const callService = new CallService();
  const [webrtc] = useState(() => new WebRTCService());

  // Wire WebRTC callbacks
  useEffect(() => {
    webrtc.setCallbacks({
      onLocalStream: (stream) => setLocalStream(stream),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onCallStateChange: (state) => {
        console.log('📡 Admin WebRTC connection state:', state);
        setCallConnectionState(state);
        
        if (state === 'connected') {
          console.log('✅ Admin call connected successfully!');
          if (!callStartAt) {
            const start = new Date();
            setCallStartAt(start);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              setElapsedSeconds(Math.floor((Date.now() - start.getTime()) / 1000));
            }, 1000);
          }
        } else if (state === 'failed' || state === 'disconnected') {
          console.log('❌ Admin call connection failed or disconnected');
        }
      }
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [webrtc, callStartAt]);

  useEffect(() => {
    const instIdForSession = effectiveInstitutionId || institutionId || userProfile?.institutionId;
    if (userProfile && instIdForSession) {
      // Validate tab session for role conflicts
      const userRole = userProfile.userType || userProfile.type || userProfile.role;
      const validation = sessionManager.validateTabSession(user, userRole);
      
      if (validation.needsInit) {
        // First load - set tab session
        sessionManager.setTabSession(userRole, user.uid, instIdForSession);
      } else if (!validation.valid) {
        // Session conflict detected
        sessionManager.handleSessionConflict(validation, navigate, toast);
        return;
      }
      
      loadDashboardData();
      loadInstitutionData();
      
      // Safety timeout: Force loading to false after 10 seconds if stuck
      const timeout = setTimeout(() => {
        setLoading(false);
        console.warn('Loading timeout reached - forcing UI to show');
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [userProfile, institutionId, effectiveInstitutionId, user, navigate]);

  useEffect(() => {
    if (activeTab === 'assignments' && pendingAssignmentFromCaregiver) {
      // Small delay to ensure the assignments tab is fully rendered
      const timer = setTimeout(() => {
        setSelectedAssignmentForEdit(pendingAssignmentFromCaregiver);
        setShowEditAssignmentModal(true);
        setPendingAssignmentFromCaregiver(null);
      }, 150); // Increased delay to ensure tab is rendered
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, pendingAssignmentFromCaregiver]);

  // Load billing plans when tab is active
  useEffect(() => {
    if (activeTab === 'billing-plans') {
      loadBillingPlans();
    }
  }, [activeTab, effectiveInstitutionId]);

  // Load payment gateway config when tab is active
  useEffect(() => {
    if (activeTab === 'payment-gateway') {
      loadPaymentGatewayConfig();
    }
  }, [activeTab, effectiveInstitutionId]);
  
  // Load institution data
  const loadInstitutionData = async () => {
    try {
      // Use effectiveInstitutionId which includes URL parameter
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      if (instId) {
        const data = await institutionAPI.getInstitution(instId);
        setLocalInstitutionData(data);
      }
    } catch (error) {
      console.error('Error loading institution data:', error);
    }
  };
  
  // Handle institution link update
  const handleInstitutionLinkUpdate = async (updates) => {
    try {
      // Use effectiveInstitutionId which includes URL parameter
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      await institutionAPI.updateInstitutionLinks(instId, updates);
      await loadInstitutionData(); // Reload institution data
      toast.success('Institution links updated successfully!');
    } catch (error) {
      console.error('Error updating institution links:', error);
      toast.error('Failed to update institution links');
      throw error;
    }
  };

  const loadDashboardData = async () => {
    try {
      // Use effectiveInstitutionId which includes URL parameter
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      
      console.log('📊 Loading institution dashboard for:', instId);
      
      // Show loading state
      setLoading(true);
      
      // Load all data in parallel but optimized for speed
      const [caregiversData, clientsData, assignmentsData, users, diagnosticsData] = await Promise.all([
        caregiverAPI.getCaregivers({ institutionId: instId, limit: 50 }).catch(() => []),
        getAllClients(instId).catch(() => []),
        assignmentAPI.getAssignmentsByInstitution(instId).catch(() => []),
        getAllUsers().catch(() => []),
        getAllDiagnostics(instId).catch(() => [])
      ]);

      // Load non-critical data in background (don't block UI)
      const loadBackgroundData = async () => {
        try {
          const [analytics, emergencies] = await Promise.all([
            analyticsAPI.getOverviewAnalytics().catch(() => ({})),
            emergencyAPI.getEmergencyHistory({ status: 'active', limit: 10 }).catch(() => [])
          ]);
          
          setSystemAlerts(emergencies.slice(0, 5).map(e => ({
            id: e.id,
            type: 'emergency',
            message: `${e.emergencyType}: ${e.patientName || 'Unknown'}`,
            time: new Date(e.triggeredAt).toLocaleTimeString(),
            severity: e.severity
          })));
        } catch (err) {
          console.warn('Background data load failed:', err);
        }
      };
      loadBackgroundData(); // Fire and forget

      // Filter by institution (most data is already filtered server-side)
      const institutionUsers = instId ? users.filter(u => u.institutionId === instId) : users;
      const institutionCaregivers = (instId ? caregiversData.filter(c => c.institutionId === instId) : caregiversData).map(caregiver => ({
        ...caregiver,
        workingHoursStart: caregiver.workingHoursStart || caregiver.startTime || null,
        workingHoursEnd: caregiver.workingHoursEnd || caregiver.endTime || null,
        paymentType: caregiver.paymentType || (caregiver.rateType === 'per_month' ? 'monthly' : caregiver.rateType === 'per_hour' ? 'hourly' : caregiver.paymentType),
        currency: caregiver.currency || 'USD'
      }));
      // Filter out archived clients from main clients list (they appear in Archived Clients tab)
      const institutionClients = (instId ? clientsData.filter(p => p.institutionId === instId) : clientsData)
        .filter(p => p.status !== 'archived');

      // Merge caregivers from users collection (for those created via Add Caregiver button, exclude deleted)
      const caregiversFromUsers = institutionUsers.filter(u => 
        (u.userType === 'caregiver' || u.userType === 'nurse' || u.userType === 'doctor' ||
        u.type === 'caregiver' || u.type === 'nurse' || u.type === 'doctor') &&
        u.status !== 'deleted' &&
        u.active !== false
      );
      
      // Filter pharmacists from users collection (exclude deleted)
      const pharmacistsFromUsers = institutionUsers.filter(u => 
        (u.userType === 'pharmacist' || u.type === 'pharmacist') &&
        u.status !== 'deleted' &&
        u.active !== false
      );
      
      // Deduplicate caregivers
      const allInstitutionCaregivers = [...institutionCaregivers];
      caregiversFromUsers.forEach(userCaregiver => {
        if (!allInstitutionCaregivers.find(c => c.id === userCaregiver.id || c.id === userCaregiver.uid)) {
          allInstitutionCaregivers.push({
            id: userCaregiver.id || userCaregiver.uid,
            uid: userCaregiver.uid,
            name: userCaregiver.name || userCaregiver.displayName,
            email: userCaregiver.email,
            userType: userCaregiver.userType || userCaregiver.type,
            type: userCaregiver.type || userCaregiver.userType,
            status: userCaregiver.status || 'pending',
            rating: userCaregiver.rating || 0,
            institutionId: userCaregiver.institutionId,
            phone: userCaregiver.phone,
            onboardingComplete: userCaregiver.onboardingComplete,
            createdAt: userCaregiver.createdAt,
            updatedAt: userCaregiver.updatedAt,
            workingHours: userCaregiver.workingHours || [],
            workingHoursStart: userCaregiver.startTime || userCaregiver.workingHoursStart || null,
            workingHoursEnd: userCaregiver.endTime || userCaregiver.workingHoursEnd || null,
            currency: userCaregiver.currency || 'USD',
            hourlyRate: userCaregiver.hourlyRate,
            monthlyRate: userCaregiver.monthlyRate,
            rateType: userCaregiver.rateType,
            paymentType: userCaregiver.paymentType || (userCaregiver.rateType === 'per_month' ? 'monthly' : 'hourly'),
            profilePictureUrl: userCaregiver.profilePictureUrl,
            qualificationDocumentUrl: userCaregiver.qualificationDocumentUrl
          });
        }
      });
      
      // Build pharmacists list
      const allInstitutionPharmacists = pharmacistsFromUsers.map(p => ({
        id: p.id || p.uid,
        uid: p.uid,
        name: p.name || p.displayName,
        email: p.email,
        userType: p.userType || p.type,
        type: p.type || p.userType,
        status: p.status || 'pending',
        institutionId: p.institutionId,
        phone: p.phone,
        licenseNumber: p.licenseNumber,
        specialization: p.specialization,
        experience: p.experience,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      
      // Update state with pharmacists
      setPharmacists(allInstitutionPharmacists);
      
      // Filter pending diagnostics
      const pending = diagnosticsData.filter(d => d.status === 'pending' || d.status === 'ordered');
      setPendingDiagnostics(pending);
      console.log('🔬 Pending diagnostics:', pending.length);

      // Calculate assignment statistics (optimized)
      const activeAssignmentCount = assignmentsData.filter(a => 
        a.status !== 'completed' && a.status !== 'cancelled'
      ).length;
      const pendingAssignmentCount = assignmentsData.filter(a => a.status === 'pending').length;
      const completedAssignmentCount = assignmentsData.filter(a => a.status === 'completed').length;

      // Build stats object
      const realStats = {
        totalUsers: institutionUsers.length,
        clients: institutionClients.length,
        caregivers: allInstitutionCaregivers.filter(c => c.userType === 'caregiver' || c.type === 'caregiver').length,
        doctors: allInstitutionCaregivers.filter(c => c.userType === 'doctor' || c.type === 'doctor').length,
        nurses: allInstitutionCaregivers.filter(c => c.userType === 'nurse' || c.type === 'nurse').length,
        pharmacists: allInstitutionPharmacists.length,
        activeAppointments: 0,
        activeAssignments: activeAssignmentCount,
        pendingAssignments: pendingAssignmentCount,
        completedAssignments: completedAssignmentCount,
        emergencyAlerts: 0,
        medicationReminders: 0,
        systemHealth: 'Good',
        satisfaction: 0,
        responseTime: 0,
        uptime: 99
      };

      // Update state (batch updates for better performance)
      setStats(realStats);
      setClients(institutionClients);
      setCaregivers(allInstitutionCaregivers);
      setAssignments(assignmentsData);
      setTopCaregivers(allInstitutionCaregivers.slice(0, 3).map(caregiver => ({
        id: caregiver.id,
        name: caregiver.displayName || caregiver.name || 'Unknown Caregiver',
        rating: caregiver.rating || 0,
        clientsServed: caregiver.clientsServed || 0,
        tasksCompleted: caregiver.tasksCompleted || 0,
        responseTime: caregiver.responseTime || 0,
        avatar: caregiver.photoURL || null
      })));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      // Ensure loading state is removed even if there's an error
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await loadDashboardData();
      toast.success('Dashboard data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Load billing plans
  const loadBillingPlans = async () => {
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      if (!instId) return;
      
      const plans = await billingPlansAPI.getBillingPlans(instId);
      setBillingPlans(plans);
    } catch (error) {
      console.error('Error loading billing plans:', error);
      toast.error('Failed to load billing plans');
    }
  };

  // Save billing plan
  const handleSaveBillingPlan = async (planData) => {
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      if (!instId) {
        toast.error('Institution ID not found');
        return;
      }

      await billingPlansAPI.saveBillingPlan({
        ...planData,
        institutionId: instId
      });

      toast.success('Billing plan saved successfully');
      setShowEditBillingPlanModal(false);
      setSelectedBillingPlan(null);
      await loadBillingPlans();
    } catch (error) {
      console.error('Error saving billing plan:', error);
      toast.error('Failed to save billing plan');
    }
  };

  // Load payment gateway configuration
  const loadPaymentGatewayConfig = async () => {
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      if (!instId) return;
      
      const config = await paymentGatewayAPI.getPaymentGatewayConfig(instId);
      setPaymentGatewayConfig(config);
    } catch (error) {
      console.error('Error loading payment gateway config:', error);
      toast.error('Failed to load payment gateway configuration');
    }
  };

  // Save payment gateway configuration
  const handleSavePaymentGatewayConfig = async (configData) => {
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      if (!instId) {
        toast.error('Institution ID not found');
        return;
      }

      await paymentGatewayAPI.savePaymentGatewayConfig(instId, configData);
      toast.success('Payment gateway configured successfully');
      setShowPaymentGatewayModal(false);
      setSelectedGateway(null);
      await loadPaymentGatewayConfig();
    } catch (error) {
      console.error('Error saving payment gateway config:', error);
      toast.error('Failed to save payment gateway configuration');
    }
  };

  const handleLogout = async () => {
    try {
      sessionManager.clearTabSession();
      await authManager.signOutFromRole('admin');
      navigate('/institution/login?institution=' + institutionId);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Client Management Functions
  const handleAddClient = async (clientData) => {
    try {
      // Use effectiveInstitutionId which includes URL parameter
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      const newClient = {
        ...clientData,
        institutionId: instId,
        status: 'active'
      };

      const clientId = await createClient(newClient);
      console.log('✅ Client created with ID:', clientId);
      
      setShowAddClient(false);
      toast.success('Patient added successfully');
      
      // Reload dashboard data to get the newly created client
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error(error.message || 'Failed to add patient');
    }
  };

  // Caregiver Management Functions
  const handleAddCaregiver = async (caregiverData, files = {}) => {
    try {
      // Always use the admin's institutionId from their profile - this is the most reliable source
      // Priority: userProfile.institutionId > effectiveInstitutionId > institutionId from context
      const instId = userProfile?.institutionId || effectiveInstitutionId || institutionId;
      const { profilePictureFile, qualificationDocumentFile, governmentIdFile, guarantor1LetterFile, guarantor2LetterFile, guarantor1PictureFile, guarantor2PictureFile } = files;
      
      // Enhanced debugging
      console.log('🔍 Institution ID Debug (handleAddCaregiver):', {
        effectiveInstitutionId,
        institutionId,
        userProfileInstitutionId: userProfile?.institutionId,
        urlInstitutionId,
        userProfile: userProfile ? { id: userProfile.id, email: userProfile.email, userType: userProfile.userType, institutionId: userProfile.institutionId } : null,
        user: user ? { uid: user.uid, email: user.email } : null,
        finalInstId: instId,
        userLoading
      });
      
      if (!instId) {
        // If user profile is still loading, wait a bit and retry
        if (userLoading) {
          toast.info('Loading your profile... Please wait a moment and try again.');
          console.warn('⚠️ User profile still loading, institutionId not available yet');
          return;
        }
        
        toast.error('Institution ID is required. Please ensure you are logged in and have an institution assigned. Check the browser console for details.');
        console.error('❌ Missing institution ID. Available data:', {
          effectiveInstitutionId,
          institutionId,
          userProfileInstitutionId: userProfile?.institutionId,
          urlInstitutionId,
          userProfile,
          user,
          userLoading,
          searchParams: Object.fromEntries(searchParams.entries())
        });
        return;
      }
      
      console.log('✅ Creating caregiver for institution:', instId);
      
      const paymentType = caregiverData.rateType === 'per_hour' ? 'hourly' : 'monthly';
      const hourlyRateValue = caregiverData.rateType === 'per_hour'
        ? Number(caregiverData.rate || caregiverData.hourlyRate || 0)
        : Number(caregiverData.hourlyRate || caregiverData.rate || 0);
      const monthlyRateValue = caregiverData.rateType === 'per_month'
        ? Number(caregiverData.monthlyRate || caregiverData.rate || 0)
        : Number(caregiverData.monthlyRate || 0);
      const workingHoursArray = Array.isArray(caregiverData.workingHours)
        ? caregiverData.workingHours
        : buildWorkingHoursSummary(caregiverData.startTime, caregiverData.endTime);
      
      // Validate required fields
      if (!caregiverData.email || !caregiverData.password || !caregiverData.name) {
        toast.error('Email, password, and name are required fields.');
        return;
      }

      if (caregiverData.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      
      // Check for duplicate email
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', caregiverData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        return;
      }
      
      console.log('✅ Email is unique, creating caregiver via Cloud Function...');
      
      // Use Cloud Function to create caregiver (doesn't affect admin session)
      let caregiverId;
      try {
        const createCaregiverFunction = httpsCallable(functions, 'createCaregiverWithAuthFunction');
        const result = await createCaregiverFunction({
          email: caregiverData.email,
          password: caregiverData.password,
          name: caregiverData.name,
          phone: caregiverData.phone || '',
          institutionId: instId,
          userType: caregiverData.userType || 'caregiver',
          specialization: caregiverData.specialization || caregiverData.medicalQualification || '',
          qualifications: caregiverData.qualifications || '',
          experience: caregiverData.experience || '0',
          availableDays: caregiverData.availableDays || [],
          workingHours: workingHoursArray.length > 0 ? workingHoursArray : ['09:00 AM - 05:00 PM'],
          workingHoursStart: caregiverData.startTime || null,
          workingHoursEnd: caregiverData.endTime || null,
          hourlyRate: hourlyRateValue.toString(),
          monthlyRate: monthlyRateValue.toString(),
          paymentType,
          address: caregiverData.address || '',
          emergencyContact: caregiverData.emergencyContact || '',
          notes: caregiverData.notes || ''
        });
        
        caregiverId = result.data.caregiverId || result.data.userId;
        console.log('✅ Caregiver created via Cloud Function:', caregiverId, 'Full result:', result.data);
        
        if (!caregiverId) {
          console.error('❌ Cloud Function did not return caregiverId');
          toast.error('Failed to create caregiver: No user ID returned from server.');
          return;
        }
      } catch (cloudFunctionError) {
        console.error('❌ Cloud Function error:', cloudFunctionError);
        
        // Cloud Function is required - no fallback to avoid signing out admin
        if (cloudFunctionError.code === 'functions/not-found' || cloudFunctionError.code === 'functions/unavailable') {
          console.error('❌ Cloud Function not available:', cloudFunctionError);
          toast.error('Cloud Function not deployed. Please deploy Firebase Functions or contact your administrator.');
          console.error('To deploy functions, run: firebase deploy --only functions');
          return;
        } else {
          // Other Cloud Function errors
          if (cloudFunctionError.message?.includes('email-already-exists') || cloudFunctionError.code === 'already-exists') {
            toast.error('A user with this email already exists.');
          } else {
            toast.error(`Failed to create caregiver: ${cloudFunctionError.message || 'Unknown error'}`);
          }
          return;
        }
      }
      
      // Update user document in Firestore with additional fields (Cloud Function already created basic document)
      try {
        // Use updateDoc with merge since the document already exists
        const additionalFields = {
          email: caregiverData.email,
          name: caregiverData.name,
          displayName: caregiverData.name,
          phone: caregiverData.phone || '',
          dateOfBirth: caregiverData.dateOfBirth || '',
          gender: caregiverData.gender || '',
          linkedInId: caregiverData.linkedInId || '',
          residentialAddress: caregiverData.residentialAddress || '',
          startTime: caregiverData.startTime || '',
          endTime: caregiverData.endTime || '',
          userType: caregiverData.userType || 'caregiver',
          type: caregiverData.userType || 'caregiver',
          role: caregiverData.userType || 'caregiver',
          institutionId: instId,
          specialization: caregiverData.specialization || caregiverData.medicalQualification || '',
          qualifications: caregiverData.qualifications || '',
          experience: caregiverData.experience || '0',
          licenseNumber: caregiverData.licenseNumber || '',
          availableDays: caregiverData.availableDays || [],
          workingHours: workingHoursArray.length > 0 ? workingHoursArray : ['09:00 AM - 05:00 PM'],
          workingHoursStart: caregiverData.startTime || null,
          workingHoursEnd: caregiverData.endTime || null,
          rateType: caregiverData.rateType || 'per_hour',
          rate: caregiverData.rateType === 'per_hour' ? hourlyRateValue : monthlyRateValue,
          currency: caregiverData.currency || 'USD',
          hourlyRate: hourlyRateValue,
          monthlyRate: monthlyRateValue,
          paymentType,
          paymentModuleLinked: true,
          address: caregiverData.address || '',
          
          // Background & Availability
          currentlyEmployed: caregiverData.currentlyEmployed || '',
          caregivingExperience: caregiverData.caregivingExperience || '',
          yearsOfCaregiverExperience: caregiverData.yearsOfCaregiverExperience || '',
          certifications: caregiverData.certifications || '',
          availability: caregiverData.availability || '',
          preferredLocation: caregiverData.preferredLocation || '',
          
          // Emergency Contact
          emergencyContactName: caregiverData.emergencyContactName || '',
          emergencyContactRelationship: caregiverData.emergencyContactRelationship || '',
          emergencyContactPhone: caregiverData.emergencyContactPhone || '',
          emergencyContact: caregiverData.emergencyContact || '',
          
          // Health & Availability
          hasMedicalCondition: caregiverData.hasMedicalCondition || '',
          medicalConditionDetails: caregiverData.medicalConditionDetails || '',
          availableToStartDate: caregiverData.availableToStartDate || '',
          
          // Guarantor 1
          guarantor1Name: caregiverData.guarantor1Name || '',
          guarantor1Relationship: caregiverData.guarantor1Relationship || '',
          guarantor1Phone: caregiverData.guarantor1Phone || '',
          guarantor1Address: caregiverData.guarantor1Address || '',
          
          // Guarantor 2
          guarantor2Name: caregiverData.guarantor2Name || '',
          guarantor2Relationship: caregiverData.guarantor2Relationship || '',
          guarantor2Phone: caregiverData.guarantor2Phone || '',
          guarantor2Address: caregiverData.guarantor2Address || '',
          
          notes: caregiverData.notes || '',
          engagementDates: caregiverData.engagementDates || [],
          status: 'active',
          onboardingComplete: true,
          profileComplete: true,
          assignedClients: [],
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || 'admin'
        };

        if (profilePictureFile) {
          try {
            if (!fileStorageService.validateFileType(profilePictureFile, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
              throw new Error('Unsupported profile picture format. Please upload a JPG, PNG, WEBP, or GIF file.');
            }
            if (!fileStorageService.validateFileSize(profilePictureFile, 5 * 1024 * 1024)) {
              throw new Error('Profile picture is too large. Maximum size is 5MB.');
            }
            const profilePath = fileStorageService.generateFilePath(caregiverId, 'profile-picture', profilePictureFile.name);
            const uploadResult = await fileStorageService.uploadFile(profilePictureFile, profilePath);
            additionalFields.profilePictureUrl = uploadResult.downloadURL;
            additionalFields.profilePicturePath = uploadResult.path;
          } catch (profileError) {
            console.error('Profile picture upload failed:', profileError);
            toast.warning(profileError.message || 'Profile picture upload failed. You can update it later from caregiver settings.');
          }
        }

        if (qualificationDocumentFile) {
          try {
            if (!fileStorageService.validateFileType(qualificationDocumentFile)) {
              throw new Error('Unsupported document format. Please upload PDF, Word, Excel, or image files.');
            }
            if (!fileStorageService.validateFileSize(qualificationDocumentFile, 50 * 1024 * 1024)) {
              throw new Error('Qualification document is too large. Maximum size is 50MB.');
            }
            const documentPath = fileStorageService.generateFilePath(caregiverId, 'qualifications', qualificationDocumentFile.name);
            const uploadResult = await fileStorageService.uploadFile(qualificationDocumentFile, documentPath);
            additionalFields.qualificationDocumentUrl = uploadResult.downloadURL;
            additionalFields.qualificationDocumentPath = uploadResult.path;
          } catch (documentError) {
            console.error('Qualification document upload failed:', documentError);
            toast.warning(documentError.message || 'Qualification document upload failed. You can upload it later from caregiver settings.');
          }
        }

        if (governmentIdFile) {
          try {
            if (!fileStorageService.validateFileType(governmentIdFile)) {
              throw new Error('Unsupported document format. Please upload PDF, Word, Excel, or image files.');
            }
            if (!fileStorageService.validateFileSize(governmentIdFile, 50 * 1024 * 1024)) {
              throw new Error('Government ID document is too large. Maximum size is 50MB.');
            }
            const idPath = fileStorageService.generateFilePath(caregiverId, 'government-id', governmentIdFile.name);
            const uploadResult = await fileStorageService.uploadFile(governmentIdFile, idPath);
            additionalFields.governmentIdUrl = uploadResult.downloadURL;
            additionalFields.governmentIdPath = uploadResult.path;
          } catch (idError) {
            console.error('Government ID upload failed:', idError);
            toast.warning(idError.message || 'Government ID upload failed. You can upload it later from caregiver settings.');
          }
        }

        if (guarantor1LetterFile) {
          try {
            if (!fileStorageService.validateFileType(guarantor1LetterFile)) {
              throw new Error('Unsupported document format. Please upload PDF, Word, Excel, or image files.');
            }
            if (!fileStorageService.validateFileSize(guarantor1LetterFile, 50 * 1024 * 1024)) {
              throw new Error('Guarantor 1 letter is too large. Maximum size is 50MB.');
            }
            const letter1Path = fileStorageService.generateFilePath(caregiverId, 'guarantor-1-letter', guarantor1LetterFile.name);
            const uploadResult = await fileStorageService.uploadFile(guarantor1LetterFile, letter1Path);
            additionalFields.guarantor1LetterUrl = uploadResult.downloadURL;
            additionalFields.guarantor1LetterPath = uploadResult.path;
          } catch (letter1Error) {
            console.error('Guarantor 1 letter upload failed:', letter1Error);
            toast.warning(letter1Error.message || 'Guarantor 1 letter upload failed. You can upload it later from caregiver settings.');
          }
        }

        if (guarantor2LetterFile) {
          try {
            if (!fileStorageService.validateFileType(guarantor2LetterFile)) {
              throw new Error('Unsupported document format. Please upload PDF, Word, Excel, or image files.');
            }
            if (!fileStorageService.validateFileSize(guarantor2LetterFile, 50 * 1024 * 1024)) {
              throw new Error('Guarantor 2 letter is too large. Maximum size is 50MB.');
            }
            const letter2Path = fileStorageService.generateFilePath(caregiverId, 'guarantor-2-letter', guarantor2LetterFile.name);
            const uploadResult = await fileStorageService.uploadFile(guarantor2LetterFile, letter2Path);
            additionalFields.guarantor2LetterUrl = uploadResult.downloadURL;
            additionalFields.guarantor2LetterPath = uploadResult.path;
          } catch (letter2Error) {
            console.error('Guarantor 2 letter upload failed:', letter2Error);
            toast.warning(letter2Error.message || 'Guarantor 2 letter upload failed. You can upload it later from caregiver settings.');
          }
        }

        if (guarantor1PictureFile) {
          try {
            if (!fileStorageService.validateFileType(guarantor1PictureFile, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
              throw new Error('Unsupported profile picture format. Please upload a JPG, PNG, WEBP, or GIF file.');
            }
            if (!fileStorageService.validateFileSize(guarantor1PictureFile, 5 * 1024 * 1024)) {
              throw new Error('Guarantor 1 picture is too large. Maximum size is 5MB.');
            }
            const guarantor1PicPath = fileStorageService.generateFilePath(caregiverId, 'guarantor-1-picture', guarantor1PictureFile.name);
            const uploadResult = await fileStorageService.uploadFile(guarantor1PictureFile, guarantor1PicPath);
            additionalFields.guarantor1PictureUrl = uploadResult.downloadURL;
            additionalFields.guarantor1PicturePath = uploadResult.path;
          } catch (guarantor1PicError) {
            console.error('Guarantor 1 picture upload failed:', guarantor1PicError);
            toast.warning(guarantor1PicError.message || 'Guarantor 1 picture upload failed. You can upload it later from caregiver settings.');
          }
        }

        if (guarantor2PictureFile) {
          try {
            if (!fileStorageService.validateFileType(guarantor2PictureFile, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
              throw new Error('Unsupported profile picture format. Please upload a JPG, PNG, WEBP, or GIF file.');
            }
            if (!fileStorageService.validateFileSize(guarantor2PictureFile, 5 * 1024 * 1024)) {
              throw new Error('Guarantor 2 picture is too large. Maximum size is 5MB.');
            }
            const guarantor2PicPath = fileStorageService.generateFilePath(caregiverId, 'guarantor-2-picture', guarantor2PictureFile.name);
            const uploadResult = await fileStorageService.uploadFile(guarantor2PictureFile, guarantor2PicPath);
            additionalFields.guarantor2PictureUrl = uploadResult.downloadURL;
            additionalFields.guarantor2PicturePath = uploadResult.path;
          } catch (guarantor2PicError) {
            console.error('Guarantor 2 picture upload failed:', guarantor2PicError);
            toast.warning(guarantor2PicError.message || 'Guarantor 2 picture upload failed. You can upload it later from caregiver settings.');
          }
        }

        await updateDoc(doc(db, 'users', caregiverId), additionalFields);
        await setDoc(doc(db, 'caregivers', caregiverId), additionalFields, { merge: true });
        
        console.log('✅ Caregiver document updated with additional fields in Firestore');
      } catch (firestoreError) {
        console.error('❌ Error updating Firestore document:', firestoreError);
        // Don't throw - the Cloud Function already created the basic document
        toast.warning('Caregiver created but some additional fields may not have been saved.');
      }
      
      setShowAddCaregiver(false);
      
      // Clear saved form data on successful creation
      try {
        localStorage.removeItem('caregiverFormDraft');
        console.log('🗑️ Cleared saved form data after successful creation');
      } catch (clearError) {
        console.error('Error clearing saved form data:', clearError);
      }
      
      toast.success(`✅ Caregiver ${caregiverData.name} added successfully! They can now login with their credentials.`);
      
      await trackAdminEvent('caregiver_created', {
        caregiverId,
        institutionId: instId,
        createdBy: user?.uid || null,
        caregiverEmail: caregiverData.email,
        caregiverName: caregiverData.name,
        rateType: caregiverData.rateType || 'per_hour',
        paymentType,
        hourlyRate: hourlyRateValue,
        monthlyRate: monthlyRateValue,
        currency: caregiverData.currency || 'USD'
      });
      
      // Reload dashboard data (no need to reload page - admin session is preserved)
      await loadDashboardData();
      
    } catch (error) {
      console.error('❌ Error adding caregiver:', error);
      toast.error(error.message || 'Failed to add caregiver. Please try again.');
      // Don't clear saved data on error - user can retry with the same data
    }
  };

  // Pharmacist Management Functions
  const handleAssignPharmacistToClient = async (clientId, pharmacistId) => {
    try {
      // Use effectiveInstitutionId which includes URL parameter
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      
      // Get pharmacist details
      const pharmacist = pharmacists.find(p => p.id === pharmacistId);
      if (!pharmacist) {
        toast.error('Pharmacist not found');
        return;
      }
      
      // Update client document with assigned pharmacist
      const clientRef = doc(db, 'clients', clientId);
      const updateData = {
        assignedPharmacistId: pharmacistId,
        assignedPharmacistName: pharmacist.name,
        assignedPharmacistEmail: pharmacist.email,
        updatedAt: new Date().toISOString()
      };
      
      // Only add license number if it exists
      if (pharmacist.licenseNumber) {
        updateData.assignedPharmacistLicense = pharmacist.licenseNumber;
      }
      
      await updateDoc(clientRef, updateData);
      
      // Update pharmacist document with assigned client
      const pharmacistRef = doc(db, 'users', pharmacistId);
      const pharmacistDoc = await getDoc(pharmacistRef);
      const currentAssignedClients = pharmacistDoc.data()?.assignedClients || [];
      
      if (!currentAssignedClients.includes(clientId)) {
        await updateDoc(pharmacistRef, {
          assignedClients: [...currentAssignedClients, clientId],
          updatedAt: new Date().toISOString()
        });
      }
      
      // Create assignment record in clientAssignments collection
      const assignmentData = {
        clientId: clientId,
        caregiverId: pharmacistId, // Using caregiverId field for consistency with existing API
        assignedBy: user?.uid,
        assignedAt: new Date(),
        status: 'active',
        type: 'pharmacist',
        institutionId: instId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('🔍 Admin - Creating assignment record:', assignmentData);
      console.log('🔍 Admin - Client ID:', clientId);
      console.log('🔍 Admin - Pharmacist ID (caregiverId):', pharmacistId);
      console.log('🔍 Admin - Institution ID:', instId);
      
      const assignmentRef = await addDoc(collection(db, 'clientAssignments'), assignmentData);
      console.log('✅ Admin - Assignment created with ID:', assignmentRef.id);
      
      toast.success('Pharmacist assigned successfully!');
      await trackAdminEvent('pharmacist_assigned_to_client', {
        clientId,
        pharmacistId,
        institutionId: instId,
        assignedBy: user?.uid || userProfile?.id || 'admin'
      });
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error assigning pharmacist:', error);
      toast.error(error.message || 'Failed to assign pharmacist');
    }
  };

  // User Role Management
  const handleEditUserRole = async (userData) => {
    console.log('🔧 Updating user role:', userData);
    
    try {
      if (!selectedUserForEdit) {
        toast.error('No user selected');
        return;
      }

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', selectedUserForEdit.id), {
        userType: userData.userType,
        type: userData.userType,
        role: userData.role || userData.userType,
        medicalQualification: userData.medicalQualification || '',
        specialization: userData.specialization || '',
        status: userData.status,
        active: userData.active,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || userProfile?.id
      });

      console.log('✅ User role updated successfully');
      toast.success(`User role updated to ${userData.userType} successfully!`);
      
      setShowEditUserModal(false);
      setSelectedUserForEdit(null);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const handleAddPharmacist = async (pharmacistData) => {
    console.log('🔧 handleAddPharmacist called with data:', pharmacistData);
    
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      
      if (!instId) {
        console.error('❌ No institution ID available');
        toast.error('Institution ID is required. Please ensure you are logged in as an admin.');
        return;
      }
      
      console.log('🏥 Using institution ID:', instId);
      
      // Validate required fields
      if (!pharmacistData.email || !pharmacistData.password || !pharmacistData.name) {
        toast.error('Email, password, and name are required fields.');
        return;
      }

      if (pharmacistData.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      
      // Check for duplicate email in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', pharmacistData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        return;
      }
      
      console.log('✅ Email is unique, creating Firebase Auth account...');
      
      // Create Firebase Auth account directly (no cloud function needed)
      let authUser;
      try {
        authUser = await createUserWithEmailAndPassword(
          auth,
          pharmacistData.email,
          pharmacistData.password
        );
        console.log('✅ Firebase Auth account created:', authUser.user.uid);
      } catch (authError) {
        console.error('❌ Firebase Auth error:', authError);
        if (authError.code === 'auth/email-already-in-use') {
          toast.error('A user with this email already exists in Firebase Auth.');
        } else if (authError.code === 'auth/weak-password') {
          toast.error('Password is too weak. Please use a stronger password.');
        } else {
          toast.error(`Authentication error: ${authError.message}`);
        }
        return;
      }
      
      const pharmacistId = authUser.user.uid;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', pharmacistId), {
        email: pharmacistData.email,
        name: pharmacistData.name,
        displayName: pharmacistData.name,
        phone: pharmacistData.phone || '',
        userType: 'pharmacist',
        type: 'pharmacist',
        role: 'pharmacist',
        institutionId: instId,
        licenseNumber: pharmacistData.licenseNumber || '',
        specialization: pharmacistData.specialization || 'General Pharmacy',
        qualifications: pharmacistData.qualifications || '',
        experience: pharmacistData.experience || 0,
        address: pharmacistData.address || '',
        emergencyContact: pharmacistData.emergencyContact || '',
        notes: pharmacistData.notes || '',
        status: 'active',
        onboardingComplete: true,
        profileComplete: true,
        assignedClients: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'admin'
      });
      
      console.log('✅ Pharmacist document created in Firestore');
      
      // Sign out the newly created user (since we created them with createUserWithEmailAndPassword)
      // This prevents the admin from being logged out
      await signOut(auth);
      
      // Sign the admin back in if they have auth
      // (This is a workaround - ideally we'd use Admin SDK but that requires cloud function)
      console.log('✅ Cleaned up auth state');
      
      setShowAddPharmacist(false);
      toast.success(`✅ Pharmacist ${pharmacistData.name} added successfully! They can now login with their credentials.`);
      
      // Reload dashboard data
      await loadDashboardData();
      
      // Reload the page to restore admin session
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error adding pharmacist:', error);
      toast.error(error.message || 'Failed to add pharmacist. Please try again.');
    }
  };

  // Delete pharmacist
  const handleDeletePharmacist = async (pharmacist) => {
    if (!window.confirm(`Are you sure you want to delete pharmacist ${pharmacist.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting pharmacist:', pharmacist.id);
      
      // Delete from Firestore
      const userRef = doc(db, 'users', pharmacist.id);
      await updateDoc(userRef, {
        status: 'deleted',
        active: false,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.uid
      });
      
      toast.success(`Pharmacist ${pharmacist.name} has been deleted successfully`);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting pharmacist:', error);
      toast.error('Failed to delete pharmacist');
    }
  };

  // Assignment Functions
  const handleCreateAssignment = async (formData) => {
    try {
      // Get client and caregiver details first
      const client = clients.find(p => p.id === selectedClientForAssignment);
      const caregiver = caregivers.find(c => c.id === selectedCaregiverForAssignment);
      
      // Use Firebase Auth UID (userId/uid) if available, otherwise fall back to id
      // This ensures tasks are queryable by the caregiver using their user.uid
      const caregiverUserId = caregiver?.uid || caregiver?.userId || caregiver?.id || selectedCaregiverForAssignment;
      
      console.log('🔍 Creating assignment:', {
        caregiverId: selectedCaregiverForAssignment,
        caregiverUserId,
        caregiverUid: caregiver?.uid,
        caregiverUserIdField: caregiver?.userId,
        caregiverIdField: caregiver?.id
      });
      
      const assignmentData = {
        clientId: selectedClientForAssignment,
        caregiverId: caregiverUserId, // Use Firebase Auth UID for querying
        clientName: client?.name || client?.displayName || 'Unknown Client',
        caregiverName: caregiver?.name || caregiver?.displayName || 'Unknown Caregiver',
        clientEmail: client?.email || '',
        caregiverEmail: caregiver?.email || '',
        institutionId: institutionId || userProfile?.institutionId,
        assignedBy: userProfile?.id || user?.uid,
        assignedByName: userProfile?.name || 'Admin',
        assignmentType: assignmentType,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const createdAssignment = await assignmentAPI.createAssignment(assignmentData);
      
      // Also create a task in the careTasks collection for better visibility
      // This ensures tasks show up in both assignment queries and task queries
      try {
        const { createCareTask } = await import('../api/careTasksAPI');
        const { Timestamp } = await import('firebase/firestore');
        
        // Parse dueDate and dueTime to create scheduledTime
        let scheduledTime = new Date();
        if (formData.dueDate) {
          scheduledTime = new Date(formData.dueDate);
          if (formData.dueTime) {
            const [hours, minutes] = formData.dueTime.split(':');
            scheduledTime.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
          } else {
            scheduledTime.setHours(9, 0, 0, 0); // Default to 9 AM
          }
        }
        
        await createCareTask({
          caregiverId: caregiverUserId, // Use Firebase Auth UID
          patientId: selectedClientForAssignment,
          clientId: selectedClientForAssignment,
          title: formData.title,
          description: formData.description || formData.instructions,
          type: 'care',
          priority: formData.priority || 'normal',
          status: 'pending',
          scheduledTime: Timestamp.fromDate(scheduledTime),
          instructions: formData.instructions,
          assignmentId: createdAssignment.id, // Link to the assignment
          institutionId: institutionId || userProfile?.institutionId
        });
        console.log('✅ Created corresponding task in careTasks collection');
      } catch (taskError) {
        console.warn('⚠️ Failed to create task in careTasks collection (assignment still created):', taskError);
        // Don't fail the whole operation if task creation fails
      }
      
      // Send notification to caregiver
      if (caregiver) {
        try {
          await createNotification({
            userId: caregiverUserId, // Use Firebase Auth UID for notifications
            type: NOTIFICATION_TYPES.TASK,
            priority: formData.priority === 'urgent' ? NOTIFICATION_PRIORITIES.URGENT : 
                     formData.priority === 'high' ? NOTIFICATION_PRIORITIES.HIGH : 
                     NOTIFICATION_PRIORITIES.MEDIUM,
            title: 'New Task Assigned',
            message: `You have been assigned a new task: "${formData.title}" for client ${client?.name || 'Unknown Client'}`,
            data: {
              assignmentId: createdAssignment.id,
              clientId: selectedClientForAssignment,
              clientName: client?.name,
              dueDate: formData.dueDate,
              dueTime: formData.dueTime
            },
            actionUrl: '/institution-caregiver/dashboard',
            read: false
          });
          console.log('✅ Notification sent to caregiver:', selectedCaregiverForAssignment);
        } catch (notifError) {
          console.error('Failed to send notification to caregiver:', notifError);
        }
      }
      
      // Send notification to client
      if (client && client.userId) {
        try {
          await createNotification({
            userId: client.userId,
            type: NOTIFICATION_TYPES.TASK,
            priority: formData.priority === 'urgent' ? NOTIFICATION_PRIORITIES.URGENT : 
                     formData.priority === 'high' ? NOTIFICATION_PRIORITIES.HIGH : 
                     NOTIFICATION_PRIORITIES.MEDIUM,
            title: 'Caregiver Task Created',
            message: `A care task has been created for you: "${formData.title}". Your caregiver ${caregiver?.name || 'Unknown Caregiver'} will be assisting you.`,
            data: {
              assignmentId: createdAssignment.id,
              caregiverId: selectedCaregiverForAssignment,
              caregiverName: caregiver?.name,
              dueDate: formData.dueDate,
              dueTime: formData.dueTime
            },
            actionUrl: '/elderly-dashboard',
            read: false
          });
          console.log('✅ Notification sent to client:', client.userId);
        } catch (notifError) {
          console.error('Failed to send notification to client:', notifError);
        }
      }
      
      setShowAssignmentModal(false);
      setSelectedClientForAssignment('');
      setSelectedCaregiverForAssignment('');
      toast.success('Assignment created and notifications sent successfully');
      
      await trackAdminEvent('assignment_created', {
        assignmentId: createdAssignment.id,
        caregiverId: caregiverUserId,
        clientId: selectedClientForAssignment,
        institutionId: effectiveInstitutionId || institutionId || userProfile?.institutionId,
        priority: formData.priority || 'normal',
        dueDate: formData.dueDate || null,
        dueTime: formData.dueTime || null
      });
      
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  // Assignment Edit/Delete Handlers
  const handleEditAssignment = (assignment) => {
    setSelectedAssignmentForEdit(assignment);
    setShowEditAssignmentModal(true);
  };

  const handleOpenAssignmentsTabFromCaregiver = (assignment) => {
    setShowCaregiverDetails(false);
    setSelectedCaregiver(null);
    
    if (assignment) {
      // Store assignment to open edit modal after tab switches
      setPendingAssignmentFromCaregiver(assignment);
    }
    
    // Switch to assignments tab
    setActiveTab('assignments');
  };

  const handleUpdateAssignment = async (formData) => {
    if (!selectedAssignmentForEdit) return;

    try {
      await assignmentAPI.updateAssignment(selectedAssignmentForEdit.id, {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        status: formData.status || selectedAssignmentForEdit.status
      });

      toast.success('Assignment updated successfully');
      setShowEditAssignmentModal(false);
      setSelectedAssignmentForEdit(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  // Caregiver Action Handlers
  const handleResetPassword = (caregiverId) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    if (!caregiver) {
      toast.error('Caregiver not found');
      return;
    }

    setCaregiverForPasswordReset(caregiver);
    setCaregiverPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowCaregiverPasswordModal(true);
  };

  const handleSubmitCaregiverPasswordReset = async (event) => {
    event.preventDefault();
    if (!caregiverForPasswordReset) {
      toast.error('No caregiver selected');
      return;
    }

    const { newPassword, confirmPassword } = caregiverPasswordForm;

    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm the new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setResettingCaregiverPassword(true);
      const resetPasswordFn = httpsCallable(functions, 'resetCaregiverPasswordFunction');
      await resetPasswordFn({
        caregiverId: caregiverForPasswordReset.id,
        newPassword: newPassword
      });

      toast.success(`Password updated for ${caregiverForPasswordReset.name || 'caregiver'}`);
      setShowCaregiverPasswordModal(false);
      setCaregiverForPasswordReset(null);
      setCaregiverPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to reset caregiver password:', error);
      const message = error?.message || 'Failed to reset caregiver password';
      toast.error(message);
    } finally {
      setResettingCaregiverPassword(false);
    }
  };

  const handleToggleCaregiverStatus = async (caregiver) => {
    try {
      const newStatus = caregiver.status === 'active' ? 'suspended' : 'active';
      await caregiverAPI.updateCaregiver(caregiver.id, { status: newStatus });
      toast.success(`Caregiver ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      await loadDashboardData();
      setShowCaregiverDetails(false);
    } catch (error) {
      console.error('Error updating caregiver status:', error);
      toast.error('Failed to update caregiver status');
    }
  };

  const handleDeleteCaregiver = async (caregiverId) => {
    if (!window.confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) {
      return;
    }
    try {
      console.log('🗑️ Starting deletion for caregiver:', caregiverId);
      
      // Close the modal first
      setShowCaregiverDetails(false);
      setSelectedCaregiver(null);
      
      // Delete the caregiver
      await caregiverAPI.deleteCaregiver(caregiverId);
      console.log('✅ Caregiver deleted from database');
      
      // Immediately remove from local state
      setCaregivers(prevCaregivers => prevCaregivers.filter(c => c.id !== caregiverId));
      console.log('✅ Removed from local state');
      
      toast.success('Caregiver deleted successfully');
      
      // Reload dashboard data in background to ensure consistency
      setTimeout(() => {
        loadDashboardData();
      }, 500);
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      toast.error('Failed to delete caregiver');
    }
  };

  const handleApproveCaregiver = async (caregiver) => {
    if (!window.confirm(`Approve ${caregiver.name} as a caregiver? They will gain access to the dashboard.`)) {
      return;
    }
    try {
      // Update both users and caregivers collections
      await updateDoc(doc(db, 'users', caregiver.id), { 
        status: 'active',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || userProfile?.id
      });
      
      await updateDoc(doc(db, 'caregivers', caregiver.id), { 
        status: 'active',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || userProfile?.id
      });
      
      // Send notification to the caregiver
      await createNotification({
        userId: caregiver.id,
        type: NOTIFICATION_TYPES.SYSTEM,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        title: 'Account Approved!',
        message: `Your account has been approved by the administrator. You can now access the caregiver dashboard.`,
        data: {
          action: 'account_approved',
          institutionId: institutionId
        }
      });
      
      toast.success(`${caregiver.name} has been approved successfully`);
      await loadDashboardData(); // Reload to update the status
    } catch (error) {
      console.error('Error approving caregiver:', error);
      toast.error('Failed to approve caregiver');
    }
  };

  const handleRejectCaregiver = async (caregiver) => {
    const reason = window.prompt(`Please provide a reason for rejecting ${caregiver.name}'s application:`);
    if (!reason) {
      toast.info('Rejection cancelled');
      return;
    }
    
    try {
      // Update both users and caregivers collections
      await updateDoc(doc(db, 'users', caregiver.id), { 
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || userProfile?.id,
        rejectionReason: reason
      });
      
      await updateDoc(doc(db, 'caregivers', caregiver.id), { 
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || userProfile?.id,
        rejectionReason: reason
      });
      
      // Send notification to the caregiver
      await createNotification({
        userId: caregiver.id,
        type: NOTIFICATION_TYPES.SYSTEM,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        title: 'Application Not Approved',
        message: `Your caregiver application was not approved. Reason: ${reason}. Please contact the administrator for more information.`,
        data: {
          action: 'account_rejected',
          reason: reason,
          institutionId: institutionId
        }
      });
      
      toast.success(`${caregiver.name}'s application has been rejected`);
      await loadDashboardData(); // Reload to update the status
    } catch (error) {
      console.error('Error rejecting caregiver:', error);
      toast.error('Failed to reject caregiver');
    }
  };

  const handleApproveDiagnostic = async (diagnostic) => {
    if (!window.confirm(`Approve diagnostic test: ${diagnostic.testName || diagnostic.testType}?`)) {
      return;
    }
    try {
      const instId = diagnostic.institutionId || effectiveInstitutionId || institutionId || userProfile?.institutionId;
      await updateDiagnosticTest(diagnostic.id, { 
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || userProfile?.id
      });
      
      // Send notification to the doctor who ordered it
      if (diagnostic.doctorId) {
        await createNotification({
          userId: diagnostic.doctorId,
          type: NOTIFICATION_TYPES.SYSTEM,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          title: 'Diagnostic Test Approved',
          message: `Your diagnostic test request for ${diagnostic.clientName} has been approved.`,
          data: {
            action: 'diagnostic_approved',
            diagnosticId: diagnostic.id,
            clientId: diagnostic.clientId
          }
        });
      }
      
      toast.success('Diagnostic test approved successfully');
      await trackAdminEvent('diagnostic_approved', {
        diagnosticId: diagnostic.id,
        clientId: diagnostic.clientId || null,
        institutionId: instId,
        approvedBy: user?.uid || userProfile?.id || 'admin'
      });
      await loadDashboardData(); // Reload to update the status
    } catch (error) {
      console.error('Error approving diagnostic:', error);
      toast.error('Failed to approve diagnostic test');
    }
  };

  const handleRejectDiagnostic = async (diagnostic) => {
    const reason = window.prompt(`Please provide a reason for rejecting this diagnostic test request:`);
    if (!reason) return;
    
    try {
      const instId = diagnostic.institutionId || effectiveInstitutionId || institutionId || userProfile?.institutionId;
      await updateDiagnosticTest(diagnostic.id, { 
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || userProfile?.id,
        rejectionReason: reason
      });
      
      // Send notification to the doctor who ordered it
      if (diagnostic.doctorId) {
        await createNotification({
          userId: diagnostic.doctorId,
          type: NOTIFICATION_TYPES.SYSTEM,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          title: 'Diagnostic Test Not Approved',
          message: `Your diagnostic test request was not approved. Reason: ${reason}`,
          data: {
            action: 'diagnostic_rejected',
            diagnosticId: diagnostic.id,
            reason: reason
          }
        });
      }
      
      toast.success('Diagnostic test request has been rejected');
      await trackAdminEvent('diagnostic_rejected', {
        diagnosticId: diagnostic.id,
        clientId: diagnostic.clientId || null,
        institutionId: instId,
        rejectedBy: user?.uid || userProfile?.id || 'admin'
      });
      await loadDashboardData(); // Reload to update the status
    } catch (error) {
      console.error('Error rejecting diagnostic:', error);
      toast.error('Failed to reject diagnostic test');
    }
  };

  const handleAssignTaskToCaregiver = (caregiver) => {
    setSelectedCaregiverForAssignment(caregiver.id);
    setShowCaregiverDetails(false);
    setShowAssignmentModal(true);
  };

  // Client Action Handlers
  const handleArchiveClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to archive this patient? You can restore them later from the Archived Patients section.')) {
      return;
    }
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      const archivedBy = user?.uid || userProfile?.id || 'admin';
      await updateClient(clientId, { 
        status: 'archived',
        archivedAt: new Date().toISOString(),
        archivedBy
      });
      toast.success('Patient archived successfully');
      await trackAdminEvent('client_archived', {
        clientId,
        institutionId: instId,
        archivedBy
      });
      await loadDashboardData();
      setShowClientDetails(false);
    } catch (error) {
      console.error('Error archiving client:', error);
      toast.error('Failed to archive patient');
    }
  };

  const handleUnarchiveClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to restore this patient? They will be moved back to the active patients list.')) {
      return;
    }
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      await updateClient(clientId, { 
        status: 'active',
        archivedAt: null,
        archivedBy: null
      });
      toast.success('Patient restored successfully');
      await trackAdminEvent('client_restored', {
        clientId,
        institutionId: instId,
        restoredBy: user?.uid || userProfile?.id || 'admin'
      });
      await loadDashboardData();
      setShowClientDetails(false);
    } catch (error) {
      console.error('Error restoring client:', error);
      toast.error('Failed to restore patient');
    }
  };

  const handleAssignTaskToClient = (client) => {
    setSelectedClientForAssignment(client.id);
    setShowClientDetails(false);
    setShowAssignmentModal(true);
  };

  // Assignment Action Handlers
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      await assignmentAPI.deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully');
      await trackAdminEvent('assignment_deleted', {
        assignmentId,
        institutionId: instId,
        deletedBy: user?.uid || userProfile?.id || 'admin'
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  // Messaging Functions
  const loadConversations = async () => {
    if (!user?.uid) return;
    
    try {
      const userConversations = await getConversationsByUser(user.uid);
      console.log(`💬 Loaded ${userConversations.length} conversations`);
      
      // Enrich conversations with participant details and unread counts
      const enrichedConversations = await Promise.all(
        userConversations.map(async (conv) => {
          // Find the other participant (not the current user)
          const otherParticipantId = conv.participants?.find(p => p !== user.uid);
          
          if (!otherParticipantId) {
            return {
              ...conv,
              name: 'Unknown User',
              unread: 0,
              missedCalls: 0
            };
          }
          
          // Try to find participant in caregivers, clients, or pharmacists
          let participantName = 'Unknown User';
          let participantType = 'user';
          
          const caregiver = caregivers.find(c => c.id === otherParticipantId || c.userId === otherParticipantId);
          if (caregiver) {
            participantName = caregiver.name || caregiver.fullName;
            participantType = caregiver.role || caregiver.type || caregiver.userType || 'caregiver';
          }
          
          if (!caregiver) {
            const pharmacist = pharmacists.find(p => p.id === otherParticipantId || p.userId === otherParticipantId);
            if (pharmacist) {
              participantName = pharmacist.name || pharmacist.fullName;
              participantType = 'pharmacist';
            }
          }
          
          // Get unread message count for this conversation
          let unreadCount = 0;
          try {
            const convMessages = await getMessagesByConversation(conv.id);
            unreadCount = convMessages.filter(m => !m.read && m.senderId !== user.uid).length;
          } catch (error) {
            console.error('Error getting unread count:', error);
          }
          
          // Get missed calls count (for future implementation)
          const missedCalls = 0; // TODO: Implement call tracking
          
          return {
            ...conv,
            name: participantName,
            type: participantType,
            unread: unreadCount,
            missedCalls: missedCalls,
            conversationId: conv.id,
            lastMessage: conv.lastMessage || 'No messages yet',
            timestamp: conv.lastMessageTime || conv.createdAt
          };
        })
      );
      
      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  };

  const loadMessagesForConversation = async (conversationId) => {
    try {
      const conversationMessages = await getMessagesByConversation(conversationId);
      console.log(`💬 Loaded ${conversationMessages.length} messages`);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // Load conversations when messages tab is active
  useEffect(() => {
    if (activeTab === 'messages' && user?.uid && caregivers.length > 0) {
      loadConversations();
      
      // Set up real-time listener for conversations
      const unsubscribe = subscribeToUserConversations(user.uid, (updatedConversations) => {
        console.log(`🔄 Real-time update: ${updatedConversations.length} conversations`);
        
        // Enrich conversations with participant details
        const enrichedConversations = updatedConversations.map((conv) => {
          const otherParticipantId = conv.participants?.find(p => p !== user.uid);
          
          let participantName = 'Unknown User';
          let participantType = 'user';
          
          const caregiver = caregivers.find(c => c.id === otherParticipantId || c.userId === otherParticipantId);
          if (caregiver) {
            participantName = caregiver.name || caregiver.fullName;
            participantType = 'caregiver';
          }
          
          if (!caregiver) {
            const pharmacist = pharmacists.find(p => p.id === otherParticipantId || p.userId === otherParticipantId);
            if (pharmacist) {
              participantName = pharmacist.name || pharmacist.fullName;
              participantType = 'pharmacist';
            }
          }
          
          return {
            ...conv,
            name: participantName,
            type: participantType,
            unread: 0,
            conversationId: conv.id,
            lastMessage: conv.lastMessage || 'No messages yet',
            timestamp: conv.lastMessageTime || conv.createdAt
          };
        });
        
        setConversations(enrichedConversations);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [activeTab, user?.uid, caregivers, pharmacists]);

  // Set up real-time listener for messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation?.conversationId || selectedConversation?.id) {
      const conversationId = selectedConversation.conversationId || selectedConversation.id;
      
      const unsubscribe = subscribeToConversationMessages(conversationId, (updatedMessages) => {
        console.log(`🔄 Real-time update: ${updatedMessages.length} messages`);
        setMessages(updatedMessages);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [selectedConversation]);

  // Load and subscribe to notifications
  useEffect(() => {
    if (user?.uid) {
      // Subscribe to real-time notifications
      const unsubscribe = notificationsAPI.subscribeToNotifications(user.uid, (updatedNotifications) => {
        console.log(`🔔 Notifications updated: ${updatedNotifications.length} total`);
        setNotifications(updatedNotifications);
        const unread = updatedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      });

      // Initial load of unread count
      notificationsAPI.getUnreadCount(user.uid).then(count => {
        setUnreadCount(count);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user?.uid]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await notificationsAPI.markAsRead(notification.id);
    }
    // Navigate to relevant section if actionUrl exists
    if (notification.data?.actionUrl) {
      navigate(notification.data.actionUrl);
    }
    setShowNotifications(false);
  };

  const handleMarkAllRead = async () => {
    if (user?.uid) {
      await notificationsAPI.markAllAsRead(user.uid);
      toast.success('All notifications marked as read');
    }
  };

  // Call functions - moved to component level to be accessible by CallInterface
  const startVoiceCall = async () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      toast.error('User profile not available');
      return;
    }
    
    try {
      // Get the recipient ID from the conversation
      const userId = user?.uid || userProfile?.userId;
      
      // Debug: Log full conversation details
      console.log('🔍 Selected conversation:', {
        conversation: selectedConversation,
        participants: selectedConversation.participants,
        userId: selectedConversation.userId,
        id: selectedConversation.id,
        currentUserId: userId
      });
      
      // Find recipient from participants array
      let recipientId = null;
      if (selectedConversation.participants && Array.isArray(selectedConversation.participants)) {
        recipientId = selectedConversation.participants.find(p => p !== userId);
        console.log('✅ Found recipient in participants:', recipientId);
      }
      
      // Fallback to userId field
      if (!recipientId && selectedConversation.userId && selectedConversation.userId !== userId) {
        recipientId = selectedConversation.userId;
        console.log('✅ Found recipient in userId field:', recipientId);
      }
      
      // Fallback to id field (only if it's not a conversation ID format)
      if (!recipientId && selectedConversation.id && !selectedConversation.id.includes('_conv_') && selectedConversation.id !== userId) {
        recipientId = selectedConversation.id;
        console.log('✅ Found recipient in id field:', recipientId);
      }
      
      if (!recipientId) {
        toast.error('Could not identify recipient. Please check conversation data.');
        console.error('❌ Conversation data:', selectedConversation);
        return;
      }
      
      console.log('🎤 Initiating voice call:', {
        callerId: userId,
        recipientId,
        recipientName: selectedConversation.name
      });
      
      // Initiate call through service
      const result = await callService.initiateCall({
        callerId: userId,
        recipientId,
        callType: 'voice',
        callerName: userProfile?.name || 'Admin',
        recipientName: selectedConversation.name || 'User'
      });
      
      console.log('🔧 Initializing WebRTC for admin...');
      
      // Initialize WebRTC if not already initialized
      if (!webrtc && result?.callId) {
        const service = new WebRTCService(
          userId,
          recipientId,
          result.callId,
          result.signalingRef
        );
        
        await service.init();
        setWebrtc(service);
        
        const offer = await service.createOffer();
        console.log('📤 Created offer and sent to recipient...');
      }
      
      if (result && result.callId) {
        setActiveCall({
          callId: result.callId,
          participantId: recipientId,
          participantName: selectedConversation.name || 'User',
          callType: 'voice'
        });
        toast.success(`Voice call initiated with ${selectedConversation.name || 'User'}`);
      } else {
        toast.error('Failed to initiate voice call');
      }
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
      const userId = user?.uid || userProfile?.userId;
      
      // Find recipient ID
      let recipientId = null;
      if (selectedConversation.participants && Array.isArray(selectedConversation.participants)) {
        recipientId = selectedConversation.participants.find(p => p !== userId);
      }
      
      if (!recipientId && selectedConversation.userId && selectedConversation.userId !== userId) {
        recipientId = selectedConversation.userId;
      }
      
      if (!recipientId && selectedConversation.id && !selectedConversation.id.includes('_conv_')) {
        recipientId = selectedConversation.id;
      }
      
      if (!recipientId) {
        toast.error('Could not identify recipient');
        return;
      }
      
      // Initiate video call
      const result = await callService.initiateCall({
        callerId: userId,
        recipientId,
        callType: 'video',
        callerName: userProfile?.name || 'Admin',
        recipientName: selectedConversation.name || 'User'
      });
      
      // Initialize WebRTC
      if (!webrtc && result?.callId) {
        const service = new WebRTCService(
          userId,
          recipientId,
          result.callId,
          result.signalingRef
        );
        
        await service.init();
        setWebrtc(service);
        
        const offer = await service.createOffer();
      }
      
      if (result && result.callId) {
        setActiveCall({
          callId: result.callId,
          participantId: recipientId,
          participantName: selectedConversation.name || 'User',
          callType: 'video'
        });
        toast.success(`Video call initiated with ${selectedConversation.name || 'User'}`);
      } else {
        toast.error('Failed to initiate video call');
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('Failed to start video call. Please check camera and microphone permissions.');
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      try {
        const duration = elapsedSeconds || 0;
        await callService.endCall(activeCall.callId, duration);
        
        // Clean up WebRTC
        if (webrtc) {
          webrtc.endCall();
        }
        
        // Clean up streams
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        
        // Clean up signaling listener
        if (activeCall.unsubscribeSignaling) {
          activeCall.unsubscribeSignaling();
        }
        
        setActiveCall(null);
        setLocalStream(null);
        setRemoteStream(null);
        setIsInCall(false);
        console.log('✅ Call ended through service');
        toast.info('Call ended');
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
  };

  const renderMessagesTab = () => {
    const handleSendMessage = async () => {
      if (!newMessage.trim() || !selectedConversation) return;
      
      try {
        let conversationId = selectedConversation.conversationId || selectedConversation.id;
        
        if (!selectedConversation.conversationId && selectedConversation.participants) {
          const conversationResult = await getOrCreateConversation(selectedConversation.participants, 'admin');
          conversationId = conversationResult.id || conversationResult;
          console.log(`✅ Created new conversation: ${conversationId}`);
        }
        
        if (typeof conversationId === 'object' && conversationId.id) {
          conversationId = conversationId.id;
        }
        
        console.log('📤 Sending message to conversation:', conversationId);
        
        await sendMessageAPI(conversationId, user.uid, {
          text: newMessage,
          type: 'text',
          senderName: userProfile?.name || 'Admin'
        });
        
        const message = {
          id: Date.now(),
          text: newMessage,
          senderId: user?.uid,
          senderName: userProfile?.name || 'You',
          createdAt: new Date(),
          read: false
        };
        
        setMessages([...messages, message]);
        setNewMessage('');
        
        toast.success('Message sent successfully');
        loadConversations();
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    };

    const renderCallLogs = () => {
      const uid = user?.uid || userProfile?.uid || userProfile?.id;
      if (!uid) return null;
      const CallLogsPanel = require('../components/CallLogsPanel').default;
      return (
        <div className="mt-4">
          <CallLogsPanel userId={uid} />
        </div>
      );
    };

    // Combine caregivers and pharmacists for display (excluding clients)
    const allPlatformUsers = [
      ...caregivers.map(c => ({ ...c, userType: 'caregiver' })),
      ...pharmacists.map(p => ({ ...p, userType: 'pharmacist' }))
    ];

    // Create conversation list combining existing conversations with all platform users
    const displayConversations = allPlatformUsers.map(person => {
      // Check if there's an existing conversation with this user
      const existingConv = conversations.find(conv => 
        conv.participants?.includes(person.id) || conv.participants?.includes(person.userId)
      );

      if (existingConv) {
        return existingConv;
      }

      // Create a potential conversation entry
      return {
        id: person.id,
        name: person.name || person.fullName || person.email || 'Unknown User',
        avatar: person.avatar || null,
        lastMessage: 'Start a conversation',
        timestamp: new Date().toISOString(),
        unread: 0,
        type: person.userType,
        participants: [user.uid, person.id],
        isNew: true
      };
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-250px)]">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-500 mt-1">{displayConversations.length} users available</p>
              
              {/* Summary Stats */}
              {(() => {
                const totalUnread = displayConversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
                const totalMissedCalls = displayConversations.reduce((sum, conv) => sum + (conv.missedCalls || 0), 0);
                
                return (totalUnread > 0 || totalMissedCalls > 0) && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {totalUnread > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                        💬 {totalUnread} unread
                      </span>
                    )}
                    {totalMissedCalls > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
                        📞 {totalMissedCalls} missed
                      </span>
                    )}
                  </div>
                );
              })()}
              
              {/* Search Input */}
              <input
                type="text"
                placeholder="Search users..."
                value={messageSearchTerm || ''}
                onChange={(e) => setMessageSearchTerm(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {displayConversations
                .filter(conv => 
                  !messageSearchTerm || 
                  (conv.name || '').toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
                  (conv.type || '').toLowerCase().includes(messageSearchTerm.toLowerCase())
                )
                .map((conversation) => {
                  const roleBadgeConfig = {
                    caregiver: { bg: 'bg-green-100', text: 'text-green-800', label: 'Caregiver' },
                    doctor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Doctor' },
                    nurse: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Nurse' },
                    pharmacist: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Pharmacist' },
                    client: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Client' },
                    admin: { bg: 'bg-red-100', text: 'text-red-800', label: 'Admin' }
                  };
                  const badge = roleBadgeConfig[conversation.type] || roleBadgeConfig.client;

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        const convId = conversation.conversationId || conversation.id;
                        if (!conversation.isNew) {
                          loadMessagesForConversation(convId);
                        } else {
                          setMessages([]);
                        }
                      }}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {(conversation.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{conversation.name || 'Unknown User'}</h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {conversation.unread > 0 && (
                                <span className="bg-blue-600 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center font-semibold">
                                  {conversation.unread}
                                </span>
                              )}
                              {conversation.missedCalls > 0 && (
                                <span className="bg-red-600 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center font-semibold" title="Missed calls">
                                  📞 {conversation.missedCalls}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                            {conversation.isNew && (
                              <span className="text-xs text-gray-400 italic">New chat</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">{conversation.lastMessage}</p>
                          <div className="flex items-center justify-between mt-1">
                            {!conversation.isNew && (
                              <span className="text-xs text-gray-400">
                                {new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {(conversation.unread > 0 || conversation.missedCalls > 0) && (
                              <span className="text-xs font-semibold text-blue-600">
                                {conversation.unread > 0 && `${conversation.unread} new`}
                                {conversation.unread > 0 && conversation.missedCalls > 0 && ' • '}
                                {conversation.missedCalls > 0 && `${conversation.missedCalls} missed call${conversation.missedCalls > 1 ? 's' : ''}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {displayConversations.filter(conv => 
                !messageSearchTerm || 
                (conv.name || '').toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
                (conv.type || '').toLowerCase().includes(messageSearchTerm.toLowerCase())
              ).length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header with Call Buttons */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {(selectedConversation.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedConversation.name || 'Unknown User'}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.type === 'caregiver' ? 'Caregiver' : selectedConversation.type === 'pharmacist' ? 'Pharmacist' : selectedConversation.type || 'User'}
                    </p>
                  </div>
                </div>
                
                {/* Call Buttons */}
                <div className="flex items-center gap-2">
                  {!isInCall && (
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
                      onClick={handleEndCall}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      End Call
                    </button>
                  )}
                </div>
              </div>

              {/* Call Interface */}
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
                        <Phone className="h-16 w-16 text-blue-500 mx-auto animate-pulse" />
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
                            className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isSentByMe
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                            >
                              {!isSentByMe && message.senderName && (
                                <p className="text-xs font-semibold mb-1">{message.senderName}</p>
                              )}
                              <p className="text-sm">{message.text || message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isSentByMe ? 'text-blue-100' : 'text-gray-400'
                              }`}>
                                {new Date(messageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
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

  // Quick action functions
  const quickActions = [
    {
      name: 'Register Patient',
      icon: Heart,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setShowCreatePatientModal(true)
    },
    {
      name: 'Add Caregiver',
      icon: UserCheck,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setShowAddCaregiver(true)
    },
    {
      name: 'Assign Care',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => setShowAssignmentModal(true)
    },
    {
      name: 'Schedule',
      icon: Calendar,
      color: 'bg-teal-600 hover:bg-teal-700',
      action: () => setShowAppointmentsModal(true)
    },
    {
      name: 'Inventory & Billing',
      icon: Package,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setActiveTab('inventory')
    },
    {
      name: 'View Analytics',
      icon: BarChart3,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => setActiveTab('analytics')
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'appointment':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'medication':
        return <Heart className="h-4 w-4 text-green-500" />;
      case 'user':
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-blue-400" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                Institution admin
              </p>
            </div>
            <h2 className="text-sm font-semibold text-slate-50">
              {(localInstitutionData?.name || institutionData?.name || 'UltimateCare institution workspace')}
            </h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {[
            { id: 'dashboard', name: 'Dashboard', icon: BarChart3, color: 'blue' },
            { id: 'clients', name: 'Patients', icon: Heart, color: 'green' },
            { id: 'archived-clients', name: 'Archived Patients', icon: Package, color: 'yellow' },
            { id: 'caregivers', name: 'Caregivers', icon: UserCheck, color: 'purple' },
            { id: 'inactive-caregivers', name: 'Inactive Caregivers', icon: UserCheck, color: 'red' },
            { id: 'pharmacists', name: 'Pharmacists', icon: Pill, color: 'indigo' },
            { id: 'assignments', name: 'Assignments', icon: Users, color: 'orange' },
            { id: 'scheduling', name: 'Scheduling', icon: Calendar, color: 'blue' },
            { id: 'queue', name: 'Queue Management', icon: Clock, color: 'cyan' },
            { id: 'triage', name: 'Enhanced Triage', icon: Stethoscope, color: 'red' },
            { id: 'attendance', name: 'Attendance Tracking', icon: Clock, color: 'teal' },
            { id: 'radiology', name: 'Radiology', icon: Activity, color: 'pink' },
            { id: 'discharge', name: 'Discharge Management', icon: CheckCircle, color: 'green' },
            { id: 'enhanced-lis', name: 'Enhanced LIS', icon: TestTube, color: 'cyan' },
            { id: 'wages', name: 'Wage Management', icon: DollarSign, color: 'green' },
            { id: 'billing-plans', name: 'Billing Plans', icon: DollarSign, color: 'purple' },
            { id: 'payment-gateway', name: 'Payment Gateway', icon: DollarSign, color: 'indigo' },
            { id: 'hmo-claims', name: 'HMO Claims', icon: FileText, color: 'teal' },
            { id: 'users', name: 'User Management', icon: Shield, color: 'red' },
            { id: 'admin-roles', name: 'Admin Roles', icon: Shield, color: 'red' },
            { id: 'approvals', name: 'Pending Approvals', icon: ClipboardCheck, color: 'yellow' },
            { id: 'cleanup', name: 'Cleanup Orphaned Users', icon: Trash2, color: 'orange' },
            { id: 'messages', name: 'Messages', icon: MessageSquare, color: 'cyan' },
            { id: 'sms-whatsapp', name: 'SMS/WhatsApp', icon: MessageSquare, color: 'green' },
            { id: 'enhanced-inventory', name: 'Enhanced Inventory', icon: Package, color: 'orange' },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp, color: 'pink' },
            { id: 'advanced-reporting', name: 'Advanced Reporting', icon: FileText, color: 'indigo' },
            { id: 'data-migration', name: 'Data Migration', icon: Database, color: 'teal' },
            { id: 'testing-qa', name: 'Testing & QA', icon: TestTube, color: 'green' },
            { id: 'compliance', name: 'Compliance', icon: Shield, color: 'purple' },
            { id: 'security', name: 'Security', icon: ShieldCheck, color: 'red' },
            { id: 'settings', name: 'Settings', icon: Settings, color: 'gray' },
            { id: 'help', name: 'Help & Support', icon: HelpCircle, color: 'blue' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? `bg-blue-600 text-white border-l-4 border-blue-400`
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 mr-3 shrink-0" />
                <span className="truncate">{tab.name}</span>
              </button>
            );
          })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative z-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            {/* Header */}
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Manage your institution operations
                </p>
              </div>
              {/* Register Patient Button - Always Visible in Header */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowCreatePatientModal(true)}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-bold text-base"
                >
                  <Heart className="h-6 w-6 mr-2" />
                  Register Patient
                </button>
              </div>
            </section>

            {/* Quick Actions - Register Patient and More */}
            {activeTab === 'dashboard' && (
              <section 
                className="rounded-3xl border-2 border-blue-500/50 bg-slate-950/90 p-6 shadow-2xl shadow-blue-500/20 mt-6"
              >
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-slate-50 sm:text-lg">Quick Actions</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    onClick={() => setShowCreatePatientModal(true)}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-blue-500/40 bg-blue-600/20 px-6 py-6 text-center hover:border-blue-500/60 hover:bg-blue-600/30 transition-all group shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-bold text-slate-50">Register Patient</span>
                    <span className="text-xs text-slate-300">Create new patient record</span>
                  </button>
                  <button
                    onClick={() => navigate('/institution-admin/users')}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-blue-400/50 hover:bg-slate-900 transition-colors group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg">
                      <UserPlus className="h-5 w-5 text-slate-950" />
                    </div>
                    <span className="text-xs font-semibold text-slate-50">Manage Users</span>
                    <span className="text-[10px] text-slate-400">View all users</span>
                  </button>
                  <button
                    onClick={() => navigate('/institution-admin/hospital-operations')}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-blue-400/50 hover:bg-slate-900 transition-colors group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg">
                      <Bed className="h-5 w-5 text-slate-950" />
                    </div>
                    <span className="text-xs font-semibold text-slate-50">Hospital Ops</span>
                    <span className="text-[10px] text-slate-400">Bed management</span>
                  </button>
                  <button
                    onClick={() => navigate('/institution-admin/staff-management')}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-amber-400/50 hover:bg-slate-900 transition-colors group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                      <UserCog className="h-5 w-5 text-slate-950" />
                    </div>
                    <span className="text-xs font-semibold text-slate-50">Staff Management</span>
                    <span className="text-[10px] text-slate-400">Team & shifts</span>
                  </button>
                </div>
              </section>
            )}

      {/* OLD LAYOUT - DISABLED */}
      {false && (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'clients' && 'Patient Management'}
                {activeTab === 'archived-clients' && 'Archived Patients'}
                {activeTab === 'caregivers' && 'Caregiver Management'}
                {activeTab === 'inactive-caregivers' && 'Inactive Caregivers Report'}
                {activeTab === 'pharmacists' && 'Pharmacist Management'}
                {activeTab === 'assignments' && 'Assignment Management'}
                {activeTab === 'scheduling' && 'Scheduling Management'}
                {activeTab === 'attendance' && 'Attendance Tracking'}
                {activeTab === 'hmo-claims' && 'HMO Claims Management'}
                {activeTab === 'radiology' && 'Radiology Management'}
                {activeTab === 'discharge' && 'Discharge Management'}
                {activeTab === 'enhanced-lis' && 'Enhanced LIS Management'}
                {activeTab === 'wages' && 'Wage Management & Payroll'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'admin-roles' && 'Admin Role Assignment'}
                {activeTab === 'approvals' && 'Pending Approvals'}
                {activeTab === 'cleanup' && 'Cleanup Orphaned Users'}
                {activeTab === 'messages' && 'Messages'}
                {activeTab === 'sms-whatsapp' && 'SMS/WhatsApp Management'}
                {activeTab === 'analytics' && 'Analytics & Reports'}
                {activeTab === 'compliance' && 'Compliance Management'}
                {activeTab === 'settings' && 'Institution Settings'}
                {activeTab === 'help' && 'Help & Support'}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Orchestrate providers, patients, and operations from a single control surface.
              </p>
            </div>
            {/* Register Patient Button - Always Visible in Content Header - PROMINENT */}
            <div className="ml-4 flex-shrink-0" style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                onClick={() => setShowCreatePatientModal(true)}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-bold text-base"
                style={{ 
                  display: 'flex !important',
                  alignItems: 'center',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  border: 'none',
                  minWidth: '180px',
                  zIndex: 100
                }}
              >
                <Heart className="h-6 w-6 mr-2" style={{ display: 'inline-block', width: '24px', height: '24px' }} />
                <span style={{ display: 'inline-block' }}>Register Patient</span>
              </button>
          </div>
          </div>
          {/* User Profile Row with Register Patient Button */}
          <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-200">
              <span className="text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
                      </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-100">{displayName}</p>
              <p className="text-[11px] text-slate-400">Administrator</p>
            </div>
          </div>
            {/* Register Patient Button - RIGHT SIDE OF USER PROFILE ROW */}
            <div className="flex-shrink-0 ml-4">
              <button
                onClick={() => setShowCreatePatientModal(true)}
                className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-bold text-sm"
                style={{ 
                  display: 'flex !important',
                  alignItems: 'center',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Heart className="h-5 w-5 mr-2" />
                Register Patient
                  </button>
            </div>
          </div>
                </div>

        {/* Stats row */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Active patients"
            value={(localInstitutionData?.metrics?.activePatients || institutionData?.metrics?.activePatients) ?? '—'}
            accent="from-emerald-400 to-emerald-300"
          />
          <StatCard
            icon={Stethoscope}
            label="Care team members"
            value={(localInstitutionData?.metrics?.careTeam || institutionData?.metrics?.careTeam) ?? '—'}
            accent="from-sky-400 to-sky-300"
          />
          <StatCard
            icon={Calendar}
            label="Today's visits"
            value={(localInstitutionData?.metrics?.todaysVisits || institutionData?.metrics?.todaysVisits) ?? '—'}
            accent="from-indigo-400 to-indigo-300"
          />
          <StatCard
            icon={Activity}
            label="Open escalations"
            value={(localInstitutionData?.metrics?.openEscalations || institutionData?.metrics?.openEscalations) ?? '—'}
            accent="from-rose-400 to-orange-300"
          />
        </section>

        {/* Quick Actions - Register Patient and More - MOVED TO TOP FOR VISIBILITY */}
        <section 
          className="rounded-3xl border-2 border-blue-500/50 bg-slate-950/90 p-6 shadow-2xl shadow-blue-500/20 mt-6"
          style={{
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            zIndex: 10,
            position: 'relative'
          }}
        >
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-50 sm:text-lg">Quick Actions</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setShowCreatePatientModal(true)}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-blue-500/40 bg-blue-600/20 px-6 py-6 text-center hover:border-blue-500/60 hover:bg-blue-600/30 transition-all group shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
              style={{ 
                border: '2px solid rgba(59, 130, 246, 0.4)',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                cursor: 'pointer'
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-50">Register Patient</span>
              <span className="text-xs text-slate-300">Create new patient record</span>
            </button>
            <button
              onClick={() => navigate('/institution-admin/users')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-blue-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg">
                <UserPlus className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Manage Users</span>
              <span className="text-[10px] text-slate-400">View all users</span>
            </button>
            <button
              onClick={() => navigate('/institution-admin/hospital-operations')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-blue-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg">
                <Bed className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Hospital Ops</span>
              <span className="text-[10px] text-slate-400">Bed management</span>
            </button>
            <button
              onClick={() => navigate('/institution-admin/staff-management')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-amber-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <UserCog className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Staff Management</span>
              <span className="text-[10px] text-slate-400">Team & shifts</span>
            </button>
          </div>
        </section>

        {/* Main grid */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
          {/* Left: key workflows */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Today
                  </p>
                  <h2 className="mt-2 text-sm font-semibold text-slate-50 sm:text-base">
                    Operational overview
                  </h2>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => navigate('/institution-admin/hospital-operations')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-blue-400/60 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-blue-400" />
                    <span className="text-[11px] font-medium text-slate-400">Hospital Operations</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-50">Bed & Incident Management</span>
                  <span className="text-[11px] text-slate-500">
                    Monitor bed occupancy, incidents, and hospital KPIs.
                  </span>
                </button>
                <button 
                  onClick={() => navigate('/institution-admin/staff-management')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-blue-400/60 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-blue-400" />
                    <span className="text-[11px] font-medium text-slate-400">Staff Management</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-50">Team & Shift Coordination</span>
                  <span className="text-[11px] text-slate-500">
                    Manage staff roster, shifts, and assignments.
                  </span>
                </button>
                <button className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-blue-400/60 hover:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-400">Quality & safety</span>
                  <span className="text-xs font-semibold text-slate-50">Alerts & incidents</span>
                  <span className="text-[11px] text-slate-500">
                    Track critical events and follow-up actions.
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
                  Live operations feed
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Streaming
                </span>
              </div>
              <div className="mt-4 space-y-2 text-[11px] text-slate-300">
                <p>• New caregiver onboarding events and license checks will appear here.</p>
                <p>• Patient risk scores and escalations surface in real time as data arrives.</p>
                <p>• You can plug in your own analytics once backend wiring is completed.</p>
              </div>
            </div>
          </div>

          {/* Right: compliance & configuration */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Safety & compliance
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    Configure access policies and audit visibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-50 sm:text-base">Quick Actions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
              onClick={() => setShowCreatePatientModal(true)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-600/10 px-4 py-4 text-center hover:border-blue-500/50 hover:bg-blue-600/20 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg group-hover:shadow-emerald-500/50 transition-shadow">
                <Heart className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Register Patient</span>
              <span className="text-[10px] text-slate-400">Create new patient record</span>
                </button>
            <button
              onClick={() => navigate('/institution-admin/users')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-blue-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg">
                <UserPlus className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Manage Users</span>
              <span className="text-[10px] text-slate-400">View all users</span>
                </button>
                <button
              onClick={() => navigate('/institution-admin/hospital-operations')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-blue-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg">
                <Bed className="h-5 w-5 text-slate-950" />
            </div>
              <span className="text-xs font-semibold text-slate-50">Hospital Ops</span>
              <span className="text-[10px] text-slate-400">Bed management</span>
                </button>
                <button
              onClick={() => navigate('/institution-admin/staff-management')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-amber-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <UserCog className="h-5 w-5 text-slate-950" />
          </div>
              <span className="text-xs font-semibold text-slate-50">Staff Management</span>
              <span className="text-[10px] text-slate-400">Team & shifts</span>
                </button>
        </div>
        </section>
      </div>
      )}

            {/* Dashboard Tab Content */}
            {activeTab === 'dashboard' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Staff Card */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
              onClick={() => setShowStaffModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12% from last month</span>
              </div>
            </div>

            {/* Total Patients Card */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-green-300 transition-all duration-200"
              onClick={() => setShowClientsModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.clients.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8% from last month</span>
              </div>
            </div>

            {/* Active Appointments Card */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all duration-200"
              onClick={() => setShowAppointmentsModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAppointments}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Clock className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">Today's schedule</span>
              </div>
            </div>
          </div>

      {/* Emergency Alerts */}
      {stats.emergencyAlerts > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Emergency Alerts</h3>
                <p className="text-red-600">
                  {stats.emergencyAlerts} active emergency alert{stats.emergencyAlerts > 1 ? 's' : ''} requiring immediate attention
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/emergency')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              View Emergencies
            </button>
          </div>
        </div>
      )}

      {/* System Status, Recent Activity, and Top Caregivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Notifications</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Response Time</span>
              <span className="text-sm font-medium text-gray-900">{stats.responseTime || 45}ms</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">{activity.time}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Top Caregivers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Caregivers</h2>
            <UserCheck className="h-5 w-5 text-purple-600" />
          </div>
          
          <div className="space-y-4">
            {topCaregivers.length > 0 ? topCaregivers.map((caregiver, index) => (
              <div key={caregiver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{caregiver.name}</h4>
                    <p className="text-xs text-gray-600">{caregiver.clientsServed} clients</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{caregiver.rating}</span>
                    <span className="text-xs text-gray-500 ml-1">★</span>
                  </div>
                  <p className="text-xs text-gray-600">{caregiver.tasksCompleted} tasks</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No caregivers yet</p>
            )}
          </div>
        </div>
        <PortalSwitcher />
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/admin/users')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium">Manage Users</span>
          </button>
          <button 
            onClick={() => navigate('/admin/caregivers')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="h-5 w-5 text-indigo-600 mr-2" />
            <span className="text-sm font-medium">Caregivers</span>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => navigate('/admin/communication')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-teal-600 mr-2" />
            <span className="text-sm font-medium">Messages</span>
          </button>
          <button 
            onClick={() => navigate('/admin/audit-logs')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium">Audit Logs</span>
          </button>
          <button 
            onClick={() => navigate('/admin/emergency')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm font-medium">Emergency Center</span>
          </button>
          <button 
            onClick={() => navigate('/admin/reports')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button 
            onClick={() => setShowLinkCustomizer(true)}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium">Customize Links</span>
          </button>
        </div>
      </div>
        </>
      )}

            {/* Patients Tab Content */}
            {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacist</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-green-700">
                                {client.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{client.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{client.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.age || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.gender || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.assignedPharmacistId ? (
                          <div className="flex items-center text-sm">
                            <Pill className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-gray-900">
                              {client.assignedPharmacistName || pharmacists.find(p => p.id === client.assignedPharmacistId)?.name || 'Assigned'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.subscriptionPlan ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.subscriptionPlan === 'premium'
                              ? 'bg-purple-100 text-purple-800'
                              : client.subscriptionPlan === 'standard'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {client.subscriptionPlan}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setShowClientDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            title="View full details"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                            Details
                        </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => navigate(`/service-provider/diagnostics?patientId=${client.id}&patientName=${encodeURIComponent(client.name || '')}`)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Record Patient Vitals"
                            >
                              <Activity className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/service-provider/consultations?patientId=${client.id}&patientName=${encodeURIComponent(client.name || '')}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Schedule Patient Consultation"
                            >
                              <Stethoscope className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/service-provider/prescriptions?patientId=${client.id}&patientName=${encodeURIComponent(client.name || '')}`)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="View Patient Prescriptions"
                            >
                              <Pill className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/service-provider/diagnostics?patientId=${client.id}&patientName=${encodeURIComponent(client.name || '')}&action=order`)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Order Patient Lab Test"
                            >
                              <TestTube className="h-4 w-4" />
                            </button>
                          </div>
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

            {/* Archived Clients Tab Content */}
            {activeTab === 'archived-clients' && (
        <div className="space-y-6">
          <ArchivedClients institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Caregivers Tab Content */}
            {activeTab === 'caregivers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Caregivers</h2>
            <button
              onClick={() => setShowAddCaregiver(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Caregiver
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onboarding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {caregivers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          <p className="text-sm font-medium">No caregivers found</p>
                          <p className="text-xs mt-1">Click "Add Caregiver" to create your first caregiver</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    caregivers.map((caregiver) => (
                      <tr key={caregiver.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserNameWithAvatar
                              userId={caregiver.id}
                              userName={caregiver.name || 'Unknown'}
                              userType={caregiver.userType || 'caregiver'}
                              profilePictureUrl={caregiver.profilePictureUrl}
                              size="medium"
                              className="mr-4"
                            />
                            <div className="text-sm text-gray-500">{caregiver.email || 'No email'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{caregiver.userType || caregiver.type || 'Caregiver'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {caregiver.onboardingComplete ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            caregiver.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : caregiver.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {caregiver.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="text-yellow-400">★</span>
                            <span className="ml-1">{caregiver.rating || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setSelectedCaregiver(caregiver);
                                setShowCaregiverDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            
                            <button 
                              onClick={() => {
                                setSelectedUserForEdit(caregiver);
                                setShowEditUserModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>

                            {/* Wage Management Button */}
                            <button 
                              onClick={() => {
                                setSelectedCaregiverForWage(caregiver);
                                setShowWageModal(true);
                              }}
                              className="text-green-600 hover:text-green-900 inline-flex items-center"
                              title="Manage wages"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Wages
                            </button>
                            
                            {caregiver.status === 'pending' && caregiver.onboardingComplete && (
                              <>
                                <button 
                                  onClick={() => handleApproveCaregiver(caregiver)}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center px-2 py-1 border border-green-600 rounded hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectCaregiver(caregiver)}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

            {/* Inactive Caregivers Report Tab Content */}
            {activeTab === 'inactive-caregivers' && (
        <div className="space-y-6">
          <InactiveCaregiversReport institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Pharmacists Tab Content */}
            {activeTab === 'pharmacists' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Pharmacists</h2>
            <button
              onClick={() => setShowAddPharmacist(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pharmacist
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pharmacists.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm font-medium">No pharmacists found</p>
                          <p className="text-xs mt-1">Click "Add Pharmacist" to onboard your first pharmacist</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pharmacists.map((pharmacist) => (
                      <tr key={pharmacist.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-green-700">
                                  {pharmacist.name?.charAt(0) || 'P'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{pharmacist.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{pharmacist.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pharmacist.licenseNumber || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pharmacist.specialization || 'General'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pharmacist.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : pharmacist.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {pharmacist.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pharmacist.experience || 0} years</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setSelectedPharmacist(pharmacist);
                                setShowPharmacistDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            
                            {pharmacist.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleApprovePharmacist(pharmacist)}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center px-2 py-1 border border-green-600 rounded hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectPharmacist(pharmacist)}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                            
                            <button 
                              onClick={() => handleDeletePharmacist(pharmacist)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

            {/* Assignments Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Tasks & Assignments</h2>
            <button
              onClick={() => setShowAssignmentModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </button>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {assignments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {assignments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {assignments.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* Queue Management Tab Content */}
            {activeTab === 'queue' && (
        <div className="space-y-6">
          <QueueManagementDashboard institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Enhanced Triage Tab Content */}
            {activeTab === 'triage' && (
        <div className="space-y-6">
          <EnhancedTriageManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {activeTab === 'attendance' && (
        <div className="space-y-6">
          <AttendanceTracking viewMode="admin" />
        </div>
      )}

            {activeTab === 'hmo-claims' && (
        <div className="space-y-6">
          <HMOClaimsManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {activeTab === 'radiology' && (
        <div className="space-y-6">
          <RadiologyManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {activeTab === 'discharge' && (
        <div className="space-y-6">
          <DischargeManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {activeTab === 'enhanced-lis' && (
        <div className="space-y-6">
          <EnhancedLISManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {activeTab === 'compliance' && (
        <div className="space-y-6">
          <ComplianceManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* SMS/WhatsApp Management Tab Content */}
            {activeTab === 'sms-whatsapp' && (
        <div className="space-y-6">
          <SMSWhatsAppManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Enhanced Inventory Management Tab Content */}
            {activeTab === 'enhanced-inventory' && (
        <div className="space-y-6">
          <EnhancedInventoryManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Security Management Tab Content */}
            {activeTab === 'security' && (
        <div className="space-y-6">
          <SecurityManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Advanced Reporting Tab Content */}
            {activeTab === 'advanced-reporting' && (
        <div className="space-y-6">
          <AdvancedReporting institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Data Migration Tab Content */}
            {activeTab === 'data-migration' && (
        <div className="space-y-6">
          <DataMigrationTool institutionId={effectiveInstitutionId} />
        </div>
      )}

            {/* Testing & QA Tab Content */}
            {activeTab === 'testing-qa' && (
        <div className="space-y-6">
          <TestingQADashboard />
        </div>
      )}
          </div>
        </main>
      </div>

      {/* Create Patient Modal */}
      <CreatePatientModal
        open={showCreatePatientModal}
        onClose={() => setShowCreatePatientModal(false)}
        onSuccess={(result) => {
          // Optionally refresh data or show success message
          console.log('Patient created:', result);
          toast.success(`Patient ${result.patientId} created successfully!`);
        }}
      />

      {/* Pending Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
              <p className="text-gray-600 mt-1">Review and approve pending diagnostic test requests</p>
            </div>
          </div>

          {/* Pending Diagnostics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 text-green-600 mr-2" />
                Diagnostic Test Requests ({pendingDiagnostics.length})
              </h3>
            </div>
            
            {pendingDiagnostics.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending diagnostic approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingDiagnostics.map((diagnostic) => (
                  <div key={diagnostic.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {diagnostic.testName || diagnostic.testType || 'Diagnostic Test'}
                          </h4>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            Pending Approval
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-500">Client</p>
                            <p className="font-medium text-gray-900">{diagnostic.clientName || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ordered By</p>
                            <p className="font-medium text-gray-900">{diagnostic.doctorName || 'Unknown Doctor'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Order Date</p>
                            <p className="font-medium text-gray-900">
                              {diagnostic.orderDate instanceof Date 
                                ? diagnostic.orderDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : new Date(diagnostic.orderDate || diagnostic.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Test Type</p>
                            <p className="font-medium text-gray-900">{diagnostic.testType || 'General'}</p>
                          </div>
                        </div>
                        
                        {diagnostic.testReason && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Reason:</span> {diagnostic.testReason}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleApproveDiagnostic(diagnostic)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectDiagnostic(diagnostic)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <UserManagement institutionId={effectiveInstitutionId} />
        </div>
      )}

      {/* Cleanup Orphaned Users Tab */}
      {activeTab === 'cleanup' && (
        <div className="space-y-6">
          <CleanupOrphanedUsers institutionId={effectiveInstitutionId} />
        </div>
      )}

      {/* Admin Role Assignment Tab */}
      {activeTab === 'admin-roles' && (
        <div className="space-y-6">
          <AdminRoleAssignment institutionId={effectiveInstitutionId} />
        </div>
      )}

      {/* Messages Tab Content */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          {renderMessagesTab()}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Institution Analytics</h2>
              <p className="text-gray-600 mt-1">Comprehensive insights for {institutionData?.name || 'your institution'}</p>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
          </div>

          {/* Overview Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
                  <div className="mt-2 flex items-center text-blue-100 text-sm">
                    <Users className="h-4 w-4 mr-1" />
                    <span>Active members</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Caregivers</p>
                  <p className="text-3xl font-bold mt-2">{stats.caregivers + stats.doctors + stats.nurses}</p>
                  <div className="mt-2 flex items-center text-green-100 text-sm">
                    <UserCheck className="h-4 w-4 mr-1" />
                    <span>{stats.caregivers} active</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <UserCheck className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Clients</p>
                  <p className="text-3xl font-bold mt-2">{stats.clients}</p>
                  <div className="mt-2 flex items-center text-purple-100 text-sm">
                    <Heart className="h-4 w-4 mr-1" />
                    <span>Under care</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Heart className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Active Tasks</p>
                  <p className="text-3xl font-bold mt-2">{stats.activeAssignments}</p>
                  <div className="mt-2 flex items-center text-orange-100 text-sm">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>{stats.pendingAssignments} pending</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Activity className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                Staff Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {stats.caregivers}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Caregivers</p>
                      <p className="text-xs text-gray-500">Primary care providers</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.totalUsers > 0 ? Math.round((stats.caregivers / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {stats.doctors}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Doctors</p>
                      <p className="text-xs text-gray-500">Medical professionals</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.totalUsers > 0 ? Math.round((stats.doctors / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {stats.nurses}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Nurses</p>
                      <p className="text-xs text-gray-500">Nursing staff</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">
                    {stats.totalUsers > 0 ? Math.round((stats.nurses / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Assignment Statistics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Assignment Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pending Tasks</p>
                    <p className="text-xs text-gray-500">Awaiting action</p>
                  </div>
                  <span className="text-3xl font-bold text-yellow-600">{stats.pendingAssignments}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Active Tasks</p>
                    <p className="text-xs text-gray-500">In progress</p>
                  </div>
                  <span className="text-3xl font-bold text-blue-600">{stats.activeAssignments}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Completed Tasks</p>
                    <p className="text-xs text-gray-500">Successfully finished</p>
                  </div>
                  <span className="text-3xl font-bold text-green-600">{stats.completedAssignments}</span>
                </div>

                {/* Completion Rate */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                    <span className="text-sm font-bold text-gray-900">
                      {(stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments) > 0 
                        ? Math.round((stats.completedAssignments / (stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments)) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments) > 0 
                          ? Math.round((stats.completedAssignments / (stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments)) * 100) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Care Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-pink-600" />
              Client Care Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500 rounded-full mb-4">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Clients</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
                  <UserCheck className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{caregivers.length}</p>
                <p className="text-sm text-gray-600 mt-1">Available Caregivers</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {caregivers.length > 0 ? (clients.length / caregivers.length).toFixed(1) : 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Clients per Caregiver</p>
              </div>
            </div>
          </div>

          {/* Recent Activity & Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Caregivers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                Top Performing Caregivers
              </h3>
              <div className="space-y-3">
                {caregivers
                  .filter(c => c.status === 'active')
                  .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                  .slice(0, 5)
                  .map((caregiver, index) => {
                    const caregiverAssignments = assignments.filter(a => a.caregiverId === caregiver.id && a.status === 'completed');
                    return (
                      <div key={caregiver.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{caregiver.name}</p>
                            <p className="text-xs text-gray-500">{caregiver.userType || caregiver.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end mb-1">
                            <span className="text-yellow-500 mr-1">★</span>
                            <span className="text-sm font-semibold text-gray-900">{(caregiver.rating || 0).toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-gray-500">{caregiverAssignments.length} completed</p>
                        </div>
                      </div>
                    );
                  })}
                {caregivers.filter(c => c.status === 'active').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No active caregivers yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                Client Status Distribution
              </h3>
              <div className="space-y-4">
                {[
                  { 
                    status: 'active', 
                    label: 'Active Clients', 
                    count: clients.filter(c => c.status === 'active').length,
                    color: 'green',
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-600'
                  },
                  { 
                    status: 'pending', 
                    label: 'Pending Setup', 
                    count: clients.filter(c => c.status === 'pending').length,
                    color: 'yellow',
                    bgColor: 'bg-yellow-50',
                    textColor: 'text-yellow-600'
                  },
                  { 
                    status: 'inactive', 
                    label: 'Inactive', 
                    count: clients.filter(c => c.status === 'inactive').length,
                    color: 'gray',
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-600'
                  }
                ].map((item) => (
                  <div key={item.status} className={`flex items-center justify-between p-4 ${item.bgColor} rounded-lg`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
                      <p className="text-xs text-gray-500">
                        {clients.length > 0 ? Math.round((item.count / clients.length) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Assignment Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Total Assignments</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments}
                </p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg bg-yellow-50">
                <p className="text-sm text-gray-600 mb-2">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingAssignments}</p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg bg-blue-50">
                <p className="text-sm text-gray-600 mb-2">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.activeAssignments}</p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg bg-green-50">
                <p className="text-sm text-gray-600 mb-2">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedAssignments}</p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {stats.completedAssignments} of {stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div className="flex h-full">
                  {/* Completed */}
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ 
                      width: `${(stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments) > 0 
                        ? (stats.completedAssignments / (stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                  {/* Active */}
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ 
                      width: `${(stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments) > 0 
                        ? (stats.activeAssignments / (stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                  {/* Pending */}
                  <div 
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-500"
                    style={{ 
                      width: `${(stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments) > 0 
                        ? (stats.pendingAssignments / (stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                  Completed
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                  Active
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                  Pending
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Staff Utilization</h4>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Assigned Caregivers</span>
                    <span className="font-semibold text-gray-900">
                      {caregivers.filter(c => assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${caregivers.length > 0 
                          ? (caregivers.filter(c => assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length / caregivers.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Available Caregivers</span>
                    <span className="font-semibold text-gray-900">
                      {caregivers.filter(c => !assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${caregivers.length > 0 
                          ? (caregivers.filter(c => !assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length / caregivers.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Client Coverage</h4>
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Clients with Caregivers</span>
                    <span className="font-semibold text-gray-900">
                      {clients.filter(c => assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${clients.length > 0 
                          ? (clients.filter(c => assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length / clients.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Unassigned Clients</span>
                    <span className="font-semibold text-gray-900">
                      {clients.filter(c => !assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ 
                        width: `${clients.length > 0 
                          ? (clients.filter(c => !assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length / clients.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">System Health</h4>
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                    stats.systemHealth === 'Good' ? 'bg-green-100' :
                    stats.systemHealth === 'Warning' ? 'bg-yellow-100' :
                    'bg-red-100'
                  } mb-2`}>
                    <span className={`text-2xl font-bold ${
                      stats.systemHealth === 'Good' ? 'text-green-600' :
                      stats.systemHealth === 'Warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {stats.uptime || 99}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{stats.systemHealth || 'Good'}</p>
                  <p className="text-xs text-gray-500 mt-1">System Status</p>
                </div>
              </div>
            </div>
          </div>

          {/* Institution Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center mb-4">
              <Building className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Institution Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Institution Name</p>
                <p className="text-lg font-bold text-gray-900">{institutionData?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Staff</p>
                <p className="text-lg font-bold text-gray-900">{stats.caregivers + stats.doctors + stats.nurses}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                <p className="text-lg font-bold text-gray-900">{stats.clients}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Tasks</p>
                <p className="text-lg font-bold text-gray-900">{stats.activeAssignments + stats.pendingAssignments}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory & Billing Tab Content */}
      {activeTab === 'inventory' && (
        <InventoryBillingTab 
          institutionId={effectiveInstitutionId}
          clients={clients}
        />
      )}

      {/* Modals */}
      {showAddClient && (
        <AddClientModal 
          onClose={() => setShowAddClient(false)} 
          onAdd={handleAddClient}
        />
      )}

      {showAddCaregiver && (
        <AddCaregiverModal 
          onClose={() => setShowAddCaregiver(false)} 
          onCreate={handleAddCaregiver}
        />
      )}

      {showAddPharmacist && (
        <AddPharmacistModal 
          onClose={() => setShowAddPharmacist(false)} 
          onCreate={handleAddPharmacist}
        />
      )}

      {showEditUserModal && selectedUserForEdit && (
        <EditUserRoleModal 
          user={selectedUserForEdit}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUserForEdit(null);
          }}
          onSave={handleEditUserRole}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal 
          onClose={() => setShowAssignmentModal(false)} 
          onCreate={handleCreateAssignment}
          clients={clients}
          caregivers={caregivers}
          selectedClient={selectedClientForAssignment}
          selectedCaregiver={selectedCaregiverForAssignment}
          onClientChange={setSelectedClientForAssignment}
          onCaregiverChange={setSelectedCaregiverForAssignment}
          assignmentType={assignmentType}
          onAssignmentTypeChange={setAssignmentType}
        />
      )}

      {showClientDetails && selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => {
            setShowClientDetails(false);
            setSelectedClient(null);
          }}
          onAssignTask={handleAssignTaskToClient}
          onDelete={handleArchiveClient}
          onUnarchive={handleUnarchiveClient}
          pharmacists={pharmacists}
          institutionId={effectiveInstitutionId}
          onAssignPharmacist={handleAssignPharmacistToClient}
        />
      )}

      {showCaregiverDetails && selectedCaregiver && (
        <CaregiverDetailsModal
          caregiver={selectedCaregiver}
          assignments={assignments}
          clients={clients}
          onViewAssignment={handleOpenAssignmentsTabFromCaregiver}
          onClose={() => {
            setShowCaregiverDetails(false);
            setSelectedCaregiver(null);
          }}
          onResetPassword={handleResetPassword}
          onToggleStatus={handleToggleCaregiverStatus}
          onDelete={handleDeleteCaregiver}
          onAssignTask={handleAssignTaskToCaregiver}
          onEditPayment={(caregiver) => {
            setSelectedCaregiverForWage(caregiver);
            setShowWageModal(true);
          }}
          onEditAssignment={handleEditAssignment}
          onDeleteAssignment={handleDeleteAssignment}
        />
      )}

      {showWageModal && selectedCaregiverForWage && (
        <CaregiverWageEditModal
          isOpen={showWageModal}
          onClose={() => {
            setShowWageModal(false);
            setSelectedCaregiverForWage(null);
          }}
          caregiver={selectedCaregiverForWage}
          onSave={(updatedCaregiver) => {
            // Reload dashboard data to reflect the updated wage
            loadDashboardData();
            // If the caregiver details modal is open, refresh the selected caregiver
            if (showCaregiverDetails && selectedCaregiver?.id === updatedCaregiver.id) {
              setSelectedCaregiver(updatedCaregiver);
            }
          }}
        />
      )}

      {showEditAssignmentModal && selectedAssignmentForEdit && (
        <EditAssignmentModal
          assignment={selectedAssignmentForEdit}
          clients={clients}
          caregivers={caregivers}
          onClose={() => {
            setShowEditAssignmentModal(false);
            setSelectedAssignmentForEdit(null);
          }}
          onSave={handleUpdateAssignment}
        />
      )}

      {showEditBillingPlanModal && selectedBillingPlan && (
        <EditBillingPlanModal
          plan={selectedBillingPlan}
          onClose={() => {
            setShowEditBillingPlanModal(false);
            setSelectedBillingPlan(null);
          }}
          onSave={handleSaveBillingPlan}
        />
      )}

      {showPaymentGatewayModal && (
        <PaymentGatewayConfigModal
          gateway={selectedGateway}
          existingConfig={paymentGatewayConfig}
          onClose={() => {
            setShowPaymentGatewayModal(false);
            setSelectedGateway(null);
          }}
          onSave={handleSavePaymentGatewayConfig}
        />
      )}

      {showCaregiverPasswordModal && caregiverForPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-yellow-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Reset Caregiver Password</h3>
                <p className="text-sm text-yellow-100">
                  Set a new password for {caregiverForPasswordReset.name || caregiverForPasswordReset.email}.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCaregiverPasswordModal(false);
                  setCaregiverForPasswordReset(null);
                  setCaregiverPasswordForm({ newPassword: '', confirmPassword: '' });
                }}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close password reset modal"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCaregiverPasswordReset} className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={caregiverPasswordForm.newPassword}
                  onChange={(e) => setCaregiverPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={caregiverPasswordForm.confirmPassword}
                  onChange={(e) => setCaregiverPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCaregiverPasswordModal(false);
                    setCaregiverForPasswordReset(null);
                    setCaregiverPasswordForm({ newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingCaregiverPassword}
                  className="px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {resettingCaregiverPassword ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileSettings && (
        <UserProfileSettings
          userId={user?.uid}
          onClose={() => setShowProfileSettings(false)}
        />
      )}

      {showPharmacistDetails && selectedPharmacist && (
        <PharmacistDetailsModal
          pharmacist={selectedPharmacist}
          clients={clients}
          onClose={() => {
            setShowPharmacistDetails(false);
            setSelectedPharmacist(null);
          }}
          onAssignClient={handleAssignPharmacistToClient}
        />
      )}

      {showAssignmentDetails && selectedAssignment && (
        <AssignmentDetailsModal
          assignment={selectedAssignment}
          clients={clients}
          caregivers={caregivers}
          onClose={() => {
            setShowAssignmentDetails(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      {/* Dashboard Card Modals */}
      {showStaffModal && (
        <StaffModal
          staff={caregivers}
          onClose={() => setShowStaffModal(false)}
        />
      )}

      {showClientsModal && (
        <ClientsModal
          clients={clients}
          onClose={() => setShowClientsModal(false)}
        />
      )}

      {showAppointmentsModal && (
        <AppointmentsModal
          appointments={[]} // Using mock data inside the modal
          view={appointmentView}
          onViewChange={setAppointmentView}
          onClose={() => setShowAppointmentsModal(false)}
          institutionId={effectiveInstitutionId}
        />
      )}

      {/* Institution Link Customizer */}
      {showLinkCustomizer && institutionData && (
        <InstitutionLinkCustomizer
          institution={institutionData}
          onUpdate={handleInstitutionLinkUpdate}
          onClose={() => setShowLinkCustomizer(false)}
        />
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="fixed top-20 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-1">You'll be notified of important updates here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.read
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        notification.priority === 'high' || notification.priority === 'urgent'
                          ? 'bg-red-100'
                          : notification.priority === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}>
                        {notification.type === 'pharmacist_prescription_update' ? (
                          <Pill className={`h-4 w-4 ${
                            notification.priority === 'high' ? 'text-red-600' : 'text-blue-600'
                          }`} />
                        ) : notification.type === 'doctor_consultation' ? (
                          <FileText className="h-4 w-4 text-blue-600" />
                        ) : notification.type === 'diagnostic_test_ordered' || notification.type === 'diagnostic_results_uploaded' ? (
                          <Activity className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-400">
                            {notification.createdAt?.toDate ? 
                              notification.createdAt.toDate().toLocaleString() : 
                              new Date(notification.createdAt).toLocaleString()
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
            role: 'caregiver'
          }}
          isIncoming={false}
          externalWebrtcService={webrtc}
          externalCallState={callConnectionState}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}

      {/* Client Details Modal */}
      {showClientDetails && selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => {
            setShowClientDetails(false);
            setSelectedClient(null);
          }}
          onAssignTask={(client) => {
            setSelectedClientForAssignment(client.id);
            setShowAssignmentModal(true);
            setShowClientDetails(false);
          }}
          onDelete={handleArchiveClient}
          onUnarchive={handleUnarchiveClient}
          pharmacists={pharmacists}
          institutionId={effectiveInstitutionId}
          onAssignPharmacist={handleAssignPharmacistToClient}
        />
      )}

      {/* Caregiver Details Modal */}
      {showCaregiverDetails && selectedCaregiver && (
        <CaregiverDetailsModal
          caregiver={selectedCaregiver}
          assignments={assignments.filter(a => a.caregiverId === selectedCaregiver.id || a.caregiverId === selectedCaregiver.uid)}
          clients={clients}
          onViewAssignment={handleOpenAssignmentsTabFromCaregiver}
          onClose={() => {
            setShowCaregiverDetails(false);
            setSelectedCaregiver(null);
          }}
          onResetPassword={handleResetPassword}
          onToggleStatus={handleToggleCaregiverStatus}
          onDelete={handleDeleteCaregiver}
          onAssignTask={(caregiver) => {
            setSelectedCaregiverForAssignment(caregiver.id);
            setShowAssignmentModal(true);
            setShowCaregiverDetails(false);
          }}
          onEditAssignment={handleEditAssignment}
          onDeleteAssignment={handleDeleteAssignment}
        />
      )}
    </div>
  );
};

// Helper Components

// Add Patient Modal Component
const AddClientModal = ({ onClose, onAdd }) => {
  const initialFormState = {
    fullName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    residenceAddress: '',
    preferredLanguage: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    primaryContactName: '',
    primaryContactRelationship: '',
    primaryContactGender: '',
    primaryContactPhone: '',
    primaryContactEmail: '',
    primaryContactAddress: '',
    primaryContactCommunicationPreference: '',
    primaryContactNigeriaLocation: '',
    caregiverStayingInNigeria: '',
    caregiverType: '',
    serviceFrequency: '',
    serviceFrequencyOther: '',
    preferredCareTypes: [],
    preferredCareTimes: '',
    preferredStartDate: '',
    homeEquipment: '',
    specialInstructions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    additionalNotes: '',
    referralSource: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (formData.serviceFrequency !== 'other' && formData.serviceFrequencyOther) {
      setFormData((prev) => ({
        ...prev,
        serviceFrequencyOther: ''
      }));
    }
  }, [formData.serviceFrequency]);

  const caregiverTypeOptions = [
    'Private Doctor',
    'Registered Nurse',
    'Certified Caregiver (Female)',
    'Certified Caregiver (Male)',
    'No Preferences'
  ];

  const serviceFrequencyOptions = [
    { value: 'full_time', label: 'Full time (Live in)' },
    { value: 'part_time', label: 'Part-time (Daily living)' },
    { value: 'weekly', label: 'Weekly visits' },
    { value: 'other', label: 'Others (please specify)' }
  ];

  const careTypeOptions = [
    'Personal care',
    'Companionship',
    'Medication management',
    'Mobility assistance',
    'Feeding',
    'Home cleaning services',
    'Activities of daily living (grooming, laundry, grocery)'
  ];

  const referralSourceOptions = [
    'Family',
    'Friends',
    'Referral',
    'Social Media'
  ];

  const communicationOptions = [
    'Phone call',
    'Email',
    'SMS / WhatsApp',
    'Video call'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxToggle = (field, option) => {
    setFormData((prev) => {
      const current = new Set(prev[field] || []);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      return {
        ...prev,
        [field]: Array.from(current)
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.preferredCareTypes.length === 0) {
      toast.error('Please select at least one type of care required.');
      return;
    }

    if (formData.serviceFrequency === 'other' && !formData.serviceFrequencyOther.trim()) {
      toast.error('Please specify the other service frequency.');
      return;
    }

    const payload = {
      ...formData,
      serviceFrequencyOther:
        formData.serviceFrequency === 'other' ? formData.serviceFrequencyOther : ''
    };

    onAdd(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur">
      <div className="relative mx-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Client Intake
            </p>
            <h3 className="text-2xl font-black text-slate-900">Add New Client</h3>
            <p className="mt-1 text-sm text-slate-500">
              Complete all sections below. Mandatory questions are marked as required.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 overflow-y-auto px-8 py-8 max-h-[80vh]">
          <section className="space-y-6">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                Section A
              </p>
              <h4 className="text-xl font-semibold text-slate-900">
                Client Personal Information
              </h4>
            </header>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {['Male', 'Female', 'Other'].map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm transition ${
                        formData.gender === option
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option}
                        required
                        checked={formData.gender === option}
                        onChange={handleChange}
                        className="accent-blue-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Address of Residence <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="residenceAddress"
                  required
                  rows={3}
                  value={formData.residenceAddress}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Preferred Language <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="preferredLanguage"
                  required
                  value={formData.preferredLanguage}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. English"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                Section C
              </p>
              <h4 className="text-xl font-semibold text-slate-900">
                Primary Contact Person Information
              </h4>
            </header>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="primaryContactName"
                  required
                  value={formData.primaryContactName}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Relationship to Client <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="primaryContactRelationship"
                  required
                  value={formData.primaryContactRelationship}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {['Male', 'Female', 'Other'].map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm transition ${
                        formData.primaryContactGender === option
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="primaryContactGender"
                        value={option}
                        required
                        checked={formData.primaryContactGender === option}
                        onChange={handleChange}
                        className="accent-blue-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Phone Number (Include country code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="primaryContactPhone"
                  required
                  value={formData.primaryContactPhone}
                  onChange={handleChange}
                  placeholder="+234 000 000 0000"
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="primaryContactEmail"
                  required
                  value={formData.primaryContactEmail}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Residential Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="primaryContactAddress"
                  required
                  rows={3}
                  value={formData.primaryContactAddress}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Preferred means of communication <span className="text-red-500">*</span>
                </label>
                <select
                  name="primaryContactCommunicationPreference"
                  required
                  value={formData.primaryContactCommunicationPreference}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select preference</option>
                  {communicationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Location in Nigeria (Detailed Address) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="primaryContactNigeriaLocation"
                  required
                  value={formData.primaryContactNigeriaLocation}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Is someone currently staying with the care recipient in Nigeria?{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="mt-3 flex flex-wrap gap-3">
                  {['Yes', 'No'].map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm transition ${
                        formData.caregiverStayingInNigeria === option
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="caregiverStayingInNigeria"
                        value={option}
                        required
                        checked={formData.caregiverStayingInNigeria === option}
                        onChange={handleChange}
                        className="accent-blue-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                Client Care Needs
              </p>
              <h4 className="text-xl font-semibold text-slate-900">
                Service Preferences
              </h4>
            </header>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Type of caregiver required <span className="text-red-500">*</span>
                </label>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {caregiverTypeOptions.map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm transition ${
                        formData.caregiverType === option
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="caregiverType"
                        value={option}
                        required
                        checked={formData.caregiverType === option}
                        onChange={handleChange}
                        className="accent-blue-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Frequency of service <span className="text-red-500">*</span>
                </label>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {serviceFrequencyOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm transition ${
                        formData.serviceFrequency === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="serviceFrequency"
                        value={option.value}
                        required
                        checked={formData.serviceFrequency === option.value}
                        onChange={handleChange}
                        className="accent-blue-600"
                      />
                      {option.label || option.value}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                Section B
              </p>
              <h4 className="text-xl font-semibold text-slate-900">
                Client Medical Information
              </h4>
            </header>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Medical history, diagnosis, or known conditions{' '}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="medicalHistory"
                  required
                  rows={4}
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Allergies <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="allergies"
                  required
                  rows={3}
                  value={formData.allergies}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">
                  Medications and dosages <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="medications"
                  required
                  rows={3}
                  value={formData.medications}
                  onChange={handleChange}
                  className="mt-2 rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Caregiver Modal Component
const AddCaregiverModal = ({ onClose, onCreate }) => {
  const STORAGE_KEY = 'caregiverFormDraft';
  const saveTimeoutRef = React.useRef(null);
  const [dataRestored, setDataRestored] = useState(false);

  const [formData, setFormData] = useState({
    // Personal Information
    name: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    linkedInId: '',
    residentialAddress: '',
    
    // Account
    password: '',
    userType: 'caregiver',
    
    // Background & Availability
    currentlyEmployed: '',
    caregivingExperience: '',
    yearsOfCaregiverExperience: '',
    certifications: '',
    availability: '', // Live-in, Part time, Full time, Weekends, Weekdays
    preferredLocation: '',
    
    // Professional
    specialization: '',
    qualifications: '',
    experience: '',
    availableDays: [],
    workingHours: [],
    startTime: '',
    endTime: '',
    flexibleArrangement: false,
    rateType: 'per_hour', // 'per_hour' or 'per_month'
    rate: '',
    monthlyRate: '',
    currency: 'USD',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    
    // Health & Availability
    hasMedicalCondition: '',
    medicalConditionDetails: '',
    availableToStartDate: '',
    
    // Guarantor 1
    guarantor1Name: '',
    guarantor1Relationship: '',
    guarantor1Phone: '',
    guarantor1Address: '',
    
    // Guarantor 2
    guarantor2Name: '',
    guarantor2Relationship: '',
    guarantor2Phone: '',
    guarantor2Address: '',
    
    notes: '',
    engagementDates: [] // Array of selected dates
  });

  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [qualificationDocumentFile, setQualificationDocumentFile] = useState(null);
  const [governmentIdFile, setGovernmentIdFile] = useState(null);
  const [guarantor1LetterFile, setGuarantor1LetterFile] = useState(null);
  const [guarantor2LetterFile, setGuarantor2LetterFile] = useState(null);
  const [guarantor1PictureFile, setGuarantor1PictureFile] = useState(null);
  const [guarantor2PictureFile, setGuarantor2PictureFile] = useState(null);

  // Restore saved form data on mount
  React.useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Don't restore password or file objects for security
        const { password, profilePictureFile: _discardedProfile, qualificationDocumentFile: _discardedDoc, ...restoredData } = parsed;

        let derivedStartTime = restoredData.startTime || '';
        let derivedEndTime = restoredData.endTime || '';

        if ((!derivedStartTime || !derivedEndTime) && Array.isArray(restoredData.workingHours) && restoredData.workingHours.length > 0) {
          const [maybeStart, maybeEnd] = restoredData.workingHours[0].split('-').map(part => part.trim());
          derivedStartTime = derivedStartTime || maybeStart || '';
          derivedEndTime = derivedEndTime || maybeEnd || '';
        }

        setFormData(prev => ({
          ...prev,
          ...restoredData,
          startTime: derivedStartTime,
          endTime: derivedEndTime,
          workingHours: Array.isArray(restoredData.workingHours) ? restoredData.workingHours : []
        }));
        setDataRestored(true);
        // Show notification
        setTimeout(() => {
          toast.info('📝 Your previous form data has been restored. You can continue where you left off.', {
            autoClose: 5000,
            position: 'top-right'
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  }, []);

  // Auto-save form data whenever it changes (debounced)
  React.useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Don't save if form is empty
        const hasData = formData.name || formData.email || formData.phone || 
                       formData.specialization || formData.qualifications || 
                       formData.notes || formData.address;
        
        if (hasData) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
          console.log('💾 Form data auto-saved');
        }
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    }, 1000); // Wait 1 second after last change

    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData]);

  // Clear saved data when modal closes (if user explicitly closes it)
  const handleClose = () => {
    // Optionally clear saved data when user closes modal
    // Uncomment the next line if you want to clear on close
    // localStorage.removeItem(STORAGE_KEY);
    onClose();
  };

  // Submit handler - don't clear saved data here, let handleAddCaregiver do it on success
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.startTime || !formData.endTime) {
      toast.error('Please select both a start time and an end time.');
      return;
    }

    const startMinutes = timeToMinutes(formData.startTime);
    const endMinutes = timeToMinutes(formData.endTime);

    if (startMinutes === null || endMinutes === null) {
      toast.error('Invalid working hours selected.');
      return;
    }

    if (endMinutes <= startMinutes) {
      toast.error('End time must be after start time.');
      return;
    }

    if (formData.rateType === 'per_hour' && (!formData.rate || Number(formData.rate) <= 0)) {
      toast.error('Please enter a valid hourly rate.');
      return;
    }

    if (formData.rateType === 'per_month' && (!formData.monthlyRate || Number(formData.monthlyRate) <= 0)) {
      toast.error('Please enter a valid monthly rate.');
      return;
    }

    const workingHoursSummary = buildWorkingHoursSummary(formData.startTime, formData.endTime);

    const submissionData = {
      ...formData,
      workingHours: workingHoursSummary
    };
    
    onCreate(submissionData, { 
      profilePictureFile, 
      qualificationDocumentFile,
      governmentIdFile,
      guarantor1LetterFile,
      guarantor2LetterFile,
      guarantor1PictureFile,
      guarantor2PictureFile
    });
  };

  const formatRoleValue = (role) => role.toLowerCase().replace(/\s+/g, '_');

  const caregiverRoles = [
    'Care Giver',
    'Doctor',
    'Nurse', 
    'Physiotherapist',
    'Occupational Therapist',
    'Social Worker',
    'Home Health Aide',
    'Medication Manager',
    'House Keeper',
    'Other'
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const timeOptions = [
    '00:00',
    '01:00',
    '02:00',
    '03:00',
    '04:00',
    '05:00',
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00'
  ];

  const timeToMinutes = (time) => {
    if (!time) return null;
    const [hourStr, minuteStr = '00'] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'startTime' || name === 'endTime') {
      const updated = {
        ...formData,
        [name]: value
      };
      const summary = updated.startTime && updated.endTime
        ? buildWorkingHoursSummary(updated.startTime, updated.endTime)
        : [];
      setFormData({
        ...updated,
        workingHours: summary
      });
      return;
    }

    if (name === 'rateType') {
      setFormData(prev => ({
        ...prev,
        rateType: value
      }));
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Reset email exists check when email changes
    if (name === 'email') {
      setEmailExists(false);
    }
  };

  const checkEmailUniqueness = async (email) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      // Check in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        setEmailExists(true);
        return;
      }
      
      // Check in caregivers collection
      const caregiversRef = collection(db, 'caregivers');
      const caregiverEmailQuery = query(caregiversRef, where('email', '==', email));
      const caregiverEmailSnapshot = await getDocs(caregiverEmailQuery);
      
      if (!caregiverEmailSnapshot.empty) {
        setEmailExists(true);
        return;
      }
      
      setEmailExists(false);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setProfilePictureFile(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      // Import resizeImage function
      const { resizeImage } = await import('../utils/profilePictureUpload');
      // Resize image to recommended size (400x400)
      const resizedFile = await resizeImage(file, 400, 400, 0.8);
      setProfilePictureFile(resizedFile);
      toast.success('Image resized and ready for upload');
    } catch (error) {
      console.error('Error resizing image:', error);
      // If resize fails, use original file
    setProfilePictureFile(file);
      toast.warning('Could not resize image, using original file');
    }
  };

  const handleQualificationDocumentChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }
    setQualificationDocumentFile(file);
  };

  const handleGovernmentIdChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }
    setGovernmentIdFile(file);
  };

  const handleGuarantor1LetterChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }
    setGuarantor1LetterFile(file);
  };

  const handleGuarantor2LetterChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }
    setGuarantor2LetterFile(file);
  };

  const handleGuarantor1PictureChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setGuarantor1PictureFile(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      // Import resizeImage function
      const { resizeImage } = await import('../utils/profilePictureUpload');
      // Resize image to recommended size (400x400)
      const resizedFile = await resizeImage(file, 400, 400, 0.8);
      setGuarantor1PictureFile(resizedFile);
      toast.success('Guarantor 1 picture ready for upload');
    } catch (error) {
      console.error('Error resizing image:', error);
      // If resize fails, use original file
      setGuarantor1PictureFile(file);
      toast.warning('Could not resize image, using original file');
    }
  };

  const handleGuarantor2PictureChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setGuarantor2PictureFile(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      // Import resizeImage function
      const { resizeImage } = await import('../utils/profilePictureUpload');
      // Resize image to recommended size (400x400)
      const resizedFile = await resizeImage(file, 400, 400, 0.8);
      setGuarantor2PictureFile(resizedFile);
      toast.success('Guarantor 2 picture ready for upload');
    } catch (error) {
      console.error('Error resizing image:', error);
      // If resize fails, use original file
      setGuarantor2PictureFile(file);
      toast.warning('Could not resize image, using original file');
    }
  };

  const handleDayToggle = (day) => {
    setFormData({
      ...formData,
      availableDays: formData.availableDays.includes(day)
        ? formData.availableDays.filter(d => d !== day)
        : [...formData.availableDays, day]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Add New Caregiver</h3>
            {dataRestored && (
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Previous form data restored
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Personal Information Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Personal Information</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    1. Name <span className="text-red-500">*</span>
                  </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
            </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    2. Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    3. Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={formData.gender === 'Male'}
                        onChange={handleChange}
                        required
                        className="mr-2"
                      />
                      Male
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={formData.gender === 'Female'}
                        onChange={handleChange}
                        required
                        className="mr-2"
                      />
                      Female
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    4. E-Mail <span className="text-red-500">*</span>
                  </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => checkEmailUniqueness(e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                    emailExists 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {emailExists && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                      This email is already in use.
                </p>
              )}
              {!emailExists && formData.email && !checkingEmail && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Email is available
                </p>
              )}
                  <p className="text-xs text-gray-500 mt-1">Required</p>
            </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    5. Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    6. Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    7. LinkedIn ID
                  </label>
                  <input
                    type="text"
                    name="linkedInId"
                    value={formData.linkedInId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    8. Residential Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="residentialAddress"
                    required
                    value={formData.residentialAddress}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>
              </div>
            </div>
          </section>

          {/* Account Information Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Account Information</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                  ) : (
                        <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role/Type <span className="text-red-500">*</span>
                  </label>
              <select
                name="userType"
                required
                value={formData.userType}
                onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {caregiverRoles.map(role => (
                  <option key={role} value={formatRoleValue(role)}>{role}</option>
                ))}
              </select>
            </div>
              </div>
            </div>
          </section>

          {/* Background & Availability Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Background & Availability</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  9. Are you currently employed? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="currentlyEmployed"
                      value="Yes"
                      checked={formData.currentlyEmployed === 'Yes'}
                      onChange={handleChange}
                      required
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="currentlyEmployed"
                      value="No"
                      checked={formData.currentlyEmployed === 'No'}
                      onChange={handleChange}
                      required
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  10. Do you have any caregiving experience? <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="caregivingExperience"
                  required
                  value={formData.caregivingExperience}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  11. Years of Caregiver experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="yearsOfCaregiverExperience"
                  required
                  min="0"
                  value={formData.yearsOfCaregiverExperience}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  12. Certifications or Qualifications (e.g. RN, Caregiver Certificate) <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="certifications"
                  required
                  value={formData.certifications}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List certifications, qualifications, etc."
                />
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  13. Availability <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 mt-2">
                  {['Live-in', 'Part time', 'Full time', 'Weekends', 'Weekdays'].map((option) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="radio"
                        name="availability"
                        value={option}
                        checked={formData.availability === option}
                        onChange={handleChange}
                        required
                        className="mr-2"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  14. Preferred Location(s) for Assignment <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="preferredLocation"
                  required
                  value={formData.preferredLocation}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter preferred locations"
                />
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>
            </div>
          </section>

          {/* Emergency Contact Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Emergency Contact</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    15. Emergency Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    required
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    16. Relationship <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="emergencyContactRelationship"
                    required
                    value={formData.emergencyContactRelationship}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    17. Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    required
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>
              </div>
            </div>
          </section>

          {/* Health & Availability Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Health & Availability</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  18. Do you have any medical condition that may affect your work? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasMedicalCondition"
                      value="Yes"
                      checked={formData.hasMedicalCondition === 'Yes'}
                      onChange={handleChange}
                      required
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasMedicalCondition"
                      value="No"
                      checked={formData.hasMedicalCondition === 'No'}
                      onChange={handleChange}
                      required
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              {formData.hasMedicalCondition === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    19. If yes, please explain <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="medicalConditionDetails"
                    required={formData.hasMedicalCondition === 'Yes'}
                    value={formData.medicalConditionDetails}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  20. When are you available to start work? <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="availableToStartDate"
                  required
                  value={formData.availableToStartDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>
            </div>
          </section>

          {/* Guarantor 1 Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Guarantor/Referee 1</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="guarantor1Name"
                    required
                    value={formData.guarantor1Name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="guarantor1Relationship"
                    required
                    value={formData.guarantor1Relationship}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Employer, Supervisor"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="guarantor1Phone"
                    required
                    value={formData.guarantor1Phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="guarantor1Address"
                    required
                    value={formData.guarantor1Address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guarantor 1 Photo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGuarantor1PictureChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {guarantor1PictureFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{guarantor1PictureFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Upload a clear photo of Guarantor/Referee 1</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  22. Please upload a scanned copy or clear photo of the signed letter from your referee or surety 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleGuarantor1LetterChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {guarantor1LetterFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{guarantor1LetterFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Please upload a clear photo or scanned copy of the signed letter</p>
                )}
                <p className="text-xs text-gray-500 mt-1">* Maximum allowed file size is <strong>50MB</strong></p>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>
            </div>
          </section>

          {/* Guarantor 2 Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Guarantor/Referee 2</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="guarantor2Name"
                    required
                    value={formData.guarantor2Name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="guarantor2Relationship"
                    required
                    value={formData.guarantor2Relationship}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Employer, Supervisor"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="guarantor2Phone"
                    required
                    value={formData.guarantor2Phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="guarantor2Address"
                    required
                    value={formData.guarantor2Address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guarantor 2 Photo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGuarantor2PictureChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {guarantor2PictureFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{guarantor2PictureFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Upload a clear photo of Guarantor/Referee 2</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  23. Please upload a scanned copy or clear photo of the signed letter from your referee or surety 2 <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleGuarantor2LetterChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {guarantor2LetterFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{guarantor2LetterFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Please upload a clear photo or scanned copy of the signed letter</p>
                )}
                <p className="text-xs text-gray-500 mt-1">* Maximum allowed file size is <strong>50MB</strong></p>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>
            </div>
          </section>

          {/* Document Uploads Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Document Uploads</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {profilePictureFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{profilePictureFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Upload a clear headshot to personalize the caregiver profile.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  21. Upload a clear photo or scanned copy of your chosen ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleGovernmentIdChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {governmentIdFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{governmentIdFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Please upload a clear photo or scanned copy of your ID</p>
                )}
                <p className="text-xs text-gray-500 mt-1">* Maximum allowed file size is <strong>50MB</strong></p>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  12. Certifications or Qualifications Document
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleQualificationDocumentChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {qualificationDocumentFile ? (
                  <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{qualificationDocumentFile.name}</span></p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Attach certifications, licenses, or other supporting documents.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">* Maximum allowed file size is <strong>50MB</strong></p>
              </div>
            </div>
          </section>

          {/* Professional & Payment Information Section */}
          <section className="space-y-4">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg">
              <h4 className="text-lg font-semibold">Professional & Payment Information</h4>
            </div>
            <div className="border border-gray-200 rounded-b-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience (General)
                  </label>
              <input
                type="number"
                name="experience"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualifications
                  </label>
                  <textarea
                    name="qualifications"
                    rows={3}
                    value={formData.qualifications}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="List educational qualifications, certifications, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type <span className="text-red-500">*</span>
                  </label>
              <select
                name="rateType"
                required
                value={formData.rateType}
                onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="per_hour">Per Hour</option>
                <option value="per_month">Per Month</option>
              </select>
            </div>

            {formData.rateType === 'per_hour' && (
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate <span className="text-red-500">*</span>
                    </label>
                <input
                  type="number"
                  name="rate"
                  required
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={handleChange}
                  placeholder="Enter hourly rate"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {formData.rateType === 'per_month' && (
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rate <span className="text-red-500">*</span>
                    </label>
                <input
                  type="number"
                  name="monthlyRate"
                  required
                  min="0"
                  step="0.01"
                  value={formData.monthlyRate}
                  onChange={handleChange}
                  placeholder="Enter monthly rate"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency <span className="text-red-500">*</span>
                  </label>
              <select
                name="currency"
                required
                value={formData.currency}
                onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
          </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                <select
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select start time</option>
                  {timeOptions.map(option => (
                    <option key={`start-${option}`} value={option}>
                      {formatTimeForDisplay(option)}
                    </option>
                  ))}
                </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                <select
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select end time</option>
                  {timeOptions.map(option => (
                    <option key={`end-${option}`} value={option}>
                      {formatTimeForDisplay(option)}
                    </option>
                  ))}
                </select>
            </div>
                  </div>
                  {formData.startTime && formData.endTime && (
                    <p className="mt-2 text-xs text-gray-600">
                      Scheduled: <span className="font-medium">{formatTimeForDisplay(formData.startTime)} - {formatTimeForDisplay(formData.endTime)}</span>
                    </p>
            )}
          </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Days
                  </label>
                  <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                        className={`px-2 py-1 text-xs rounded-md border ${
                    formData.availableDays.includes(day)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          </div>

          <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engagement Dates <span className="text-gray-500 text-xs">(Select dates for engagements)</span>
                </label>
            <input
                  type="date"
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (selectedDate && !formData.engagementDates.includes(selectedDate)) {
                      setFormData(prev => ({
                        ...prev,
                        engagementDates: [...prev.engagementDates, selectedDate].sort()
                      }));
                      e.target.value = '';
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
                {formData.engagementDates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.engagementDates.map((date, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              engagementDates: prev.engagementDates.filter((_, i) => i !== index)
                            }));
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
            )}
          </div>

          <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>
            </div>
          </section>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={emailExists || checkingEmail}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                emailExists || checkingEmail
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {checkingEmail ? 'Checking...' : emailExists ? 'Email Already Exists' : 'Add Caregiver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Pharmacist Modal Component
const AddPharmacistModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    userType: 'pharmacist',
    licenseNumber: '',
    specialization: 'General Pharmacy',
    experience: '',
    qualifications: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const pharmacySpecializations = [
    'General Pharmacy',
    'Clinical Pharmacy',
    'Hospital Pharmacy',
    'Community Pharmacy',
    'Geriatric Pharmacy',
    'Oncology Pharmacy',
    'Pediatric Pharmacy',
    'Psychiatric Pharmacy'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Reset email exists check when email changes
    if (name === 'email') {
      setEmailExists(false);
    }
  };

  const checkEmailUniqueness = async (email) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      // Check in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        setEmailExists(true);
        return;
      }
      
      setEmailExists(false);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center space-x-3">
            <Pill className="h-8 w-8 text-white" />
            <div>
              <h3 className="text-lg font-medium text-white">Add New Pharmacist</h3>
              <p className="text-sm text-green-100">Onboard a pharmacist to your institution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-green-500 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => checkEmailUniqueness(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                    emailExists 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {emailExists && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  This email is already in use. Please use a different email.
                </p>
              )}
              {!emailExists && formData.email && !checkingEmail && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Email is available
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 mt-0.5 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">License Number *</label>
              <input
                type="text"
                name="licenseNumber"
                required
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="RPh-123456"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization *</label>
              <select
                name="specialization"
                required
                value={formData.specialization}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                {(pharmacySpecializations || []).map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input
                type="number"
                name="experience"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Qualifications</label>
            <textarea
              name="qualifications"
              rows={3}
              value={formData.qualifications}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="List educational qualifications, certifications, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Pill className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Pharmacist Responsibilities:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Medication dispensing and management</li>
                  <li>Patient medication counseling</li>
                  <li>Drug interaction monitoring</li>
                  <li>Prescription verification and processing</li>
                  <li>Inventory management and ordering</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={emailExists || checkingEmail}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                emailExists || checkingEmail
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {checkingEmail ? 'Checking...' : emailExists ? 'Email Already Exists' : 'Add Pharmacist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assignment Modal Component
const AssignmentModal = ({ 
  onClose, 
  onCreate, 
  clients, 
  caregivers, 
  selectedClient, 
  selectedCaregiver, 
  onClientChange, 
  onCaregiverChange,
  assignmentType,
  onAssignmentTypeChange
}) => {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    instructions: '',
    priority: 'normal',
    scheduleDate: '',
    startTime: '',
    endTime: '',
    comments: '',
    activityReport: '',
    dueDate: '',
    dueTime: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Create Assignment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client and Caregiver Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedClient}
                onChange={(e) => onClientChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Choose a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || 'Unknown Client'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Caregiver <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCaregiver}
                onChange={(e) => onCaregiverChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Choose a caregiver...</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.name || 'Unknown Caregiver'} ({caregiver.userType || caregiver.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Morning medication administration"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief description of the task..."
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions from Admin <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Detailed instructions for the caregiver to follow..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide specific instructions that the caregiver should follow
            </p>
          </div>

          {/* Priority */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority <span className="text-red-500">*</span></label>
              <select
              required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

          {/* Schedule Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Details
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.scheduleDate}
                  onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Specify the exact date and time window for this care assignment
            </p>
          </div>

          {/* Comments Section (Required) */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Add any special notes, requirements, or considerations for this assignment..."
            />
            <p className="mt-1 text-xs text-red-600">
              ⚠️ Comments are required before saving this schedule
            </p>
          </div>

          {/* Activity Report Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Report Template
            </label>
            <textarea
              rows={4}
              value={formData.activityReport}
              onChange={(e) => setFormData({ ...formData, activityReport: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Define what activities should be reported after completing this assignment (e.g., vital signs taken, medications administered, meals provided, mobility assistance, etc.)"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Specify what the caregiver should report after completing this task
            </p>
          </div>

          {/* Legacy Due Date fields (for backwards compatibility) */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Deadline (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Due Time</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Set a final deadline if different from the schedule date/time
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedClient || !selectedCaregiver}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Client Details Modal Component
const ClientDetailsModal = ({ client, onClose, onAssignTask, onDelete, onUnarchive, pharmacists, onAssignPharmacist, institutionId }) => {
  const { userProfile } = useUser();
  const [activeTab, setActiveTab] = React.useState('info');
  const [showPharmacistDropdown, setShowPharmacistDropdown] = React.useState(false);
  const [selectedPharmacistId, setSelectedPharmacistId] = React.useState(client?.assignedPharmacistId || '');
  const [clientSubscription, setClientSubscription] = React.useState(null);
  const [billingPlans, setBillingPlans] = React.useState([]);
  const [loadingSubscription, setLoadingSubscription] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = React.useState('monthly');
  const [subscriptionInvoices, setSubscriptionInvoices] = React.useState([]);
  const [generatingInvoice, setGeneratingInvoice] = React.useState(false);
  
  React.useEffect(() => {
    if (activeTab === 'subscription' && client?.id) {
      loadClientSubscription();
      loadBillingPlans();
      loadSubscriptionInvoices();
    }
  }, [activeTab, client?.id]);

  const loadSubscriptionInvoices = async () => {
    try {
      if (!client?.id) return;
      const invoices = await subscriptionInvoiceAPI.getSubscriptionInvoicesByClient(client.id);
      setSubscriptionInvoices(invoices);
    } catch (error) {
      console.error('Error loading subscription invoices:', error);
    }
  };

  const loadClientSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const subscription = await billingPlansAPI.getClientSubscription(client.id);
      setClientSubscription(subscription);
      if (subscription) {
        setSelectedPlanId(subscription.planId);
        setSelectedBillingCycle(subscription.billingCycle || 'monthly');
      }
    } catch (error) {
      console.error('Error loading client subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadBillingPlans = async () => {
    try {
      if (!institutionId) return;
      const plans = await billingPlansAPI.getBillingPlans(institutionId);
      setBillingPlans(plans);
    } catch (error) {
      console.error('Error loading billing plans:', error);
    }
  };

  const handleAssignSubscription = async () => {
    if (!selectedPlanId) {
      alert('Please select a billing plan');
      return;
    }
    try {
      setLoadingSubscription(true);
      await billingPlansAPI.assignSubscriptionToClient(client.id, selectedPlanId, selectedBillingCycle);
      await loadClientSubscription();
      alert('Subscription assigned successfully!');
    } catch (error) {
      console.error('Error assigning subscription:', error);
      alert('Failed to assign subscription: ' + error.message);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!clientSubscription) {
      alert('Client does not have an active subscription');
      return;
    }
    
    if (!window.confirm(`Generate invoice for ${clientSubscription.planName} subscription?`)) {
      return;
    }
    
    try {
      setGeneratingInvoice(true);
      const result = await subscriptionInvoiceAPI.generateInvoiceWithPaymentLink(
        clientSubscription.id,
        {
          ...clientSubscription,
          clientName: client.name || client.fullName,
          clientEmail: client.email
        }
      );
      
      if (result.paymentLink) {
        alert(`Invoice generated successfully!\n\nPayment Link: ${result.paymentLink.paymentLink}\n\nThe payment link will be sent to the client.`);
      } else {
        alert('Invoice generated successfully! However, payment gateway is not configured. Please configure a payment gateway to generate payment links.');
      }
      
      await loadSubscriptionInvoices();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice: ' + error.message);
    } finally {
      setGeneratingInvoice(false);
    }
  };
  
  if (!client) return null;

  const handleAssignPharmacist = async () => {
    if (selectedPharmacistId && onAssignPharmacist) {
      await onAssignPharmacist(client.id, selectedPharmacistId);
      setShowPharmacistDropdown(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-green-600">
                {client.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{client.name || 'Unknown Client'}</h3>
              <p className="text-green-100 text-sm">{client.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Client Info
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Reports
            </button>
            <button
              onClick={() => setActiveTab('careLogs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'careLogs'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Care Logs
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity Timeline
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscription'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Subscription
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Info Tab */}
          {activeTab === 'info' && (
            <>
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Age</label>
                <p className="mt-1 text-gray-900">{client.age || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Gender</label>
                <p className="mt-1 text-gray-900">{client.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{client.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          {client.address && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{client.address}</p>
            </div>
          )}

          {/* Medical Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h4>
            <div className="space-y-3">
              {client.medicalRecordNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Medical Record Number</label>
                  <p className="mt-1 text-gray-900">{client.medicalRecordNumber}</p>
                </div>
              )}
              {client.medicalConditions && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Medical Conditions</label>
                  <p className="mt-1 text-gray-900">{client.medicalConditions}</p>
                </div>
              )}
              {client.allergies && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Allergies</label>
                  <p className="mt-1 text-gray-900 text-red-600">{client.allergies}</p>
                </div>
              )}
              {client.medications && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Current Medications</label>
                  <p className="mt-1 text-gray-900">{client.medications}</p>
                </div>
              )}
              {client.primaryDoctor && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Primary Doctor</label>
                  <p className="mt-1 text-gray-900">{client.primaryDoctor}</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Pharmacist Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Pharmacist</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              {client.assignedPharmacistId ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Pill className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {pharmacists?.find(p => p.id === client.assignedPharmacistId)?.name || 'Unknown Pharmacist'}
                      </p>
                      <p className="text-xs text-gray-500">
                        License: {pharmacists?.find(p => p.id === client.assignedPharmacistId)?.licenseNumber || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pharmacists?.find(p => p.id === client.assignedPharmacistId)?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPharmacistDropdown(true)}
                    className="px-3 py-1 text-sm text-green-700 hover:text-green-800 hover:bg-green-100 rounded-md transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <Pill className="h-8 w-8 mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No pharmacist assigned</p>
                  <button
                    onClick={() => setShowPharmacistDropdown(true)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  >
                    Assign Pharmacist
                  </button>
                </div>
              )}

              {/* Pharmacist Assignment Dropdown */}
              {showPharmacistDropdown && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Pharmacist
                  </label>
                  <select
                    value={selectedPharmacistId}
                    onChange={(e) => setSelectedPharmacistId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm mb-3"
                  >
                    <option value="">-- Select a pharmacist --</option>
                    {pharmacists?.map((pharmacist) => (
                      <option key={pharmacist.id} value={pharmacist.id}>
                        {pharmacist.name} - {pharmacist.licenseNumber} ({pharmacist.specialization || 'General Pharmacy'})
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAssignPharmacist}
                      disabled={!selectedPharmacistId}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setShowPharmacistDropdown(false);
                        setSelectedPharmacistId(client?.assignedPharmacistId || '');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(client.emergencyContactName || client.emergencyContactPhone) && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                {client.emergencyContactName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-gray-900">{client.emergencyContactName}</p>
                  </div>
                )}
                {client.emergencyContactPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{client.emergencyContactPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
          </>
          )}

          {/* Medical Reports Tab */}
          {activeTab === 'reports' && (
            <ClientReportsSection clientId={client.id} />
          )}

          {/* Care Logs Tab */}
          {activeTab === 'careLogs' && (
            <ClientCareLogsSection clientId={client.id} />
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Subscription Management</h4>
                
                {loadingSubscription ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Current Subscription */}
                    {clientSubscription ? (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h5 className="text-lg font-semibold text-gray-900">Current Subscription</h5>
                            <p className="text-sm text-gray-600 mt-1">{clientSubscription.planName || 'N/A'}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            clientSubscription.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {clientSubscription.status || 'Active'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Billing Cycle</label>
                            <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                              {clientSubscription.billingCycle || 'Monthly'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Price</label>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {clientSubscription.currency || 'USD'} {clientSubscription.price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          {clientSubscription.startDate && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Start Date</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {clientSubscription.startDate instanceof Date
                                  ? clientSubscription.startDate.toLocaleDateString()
                                  : new Date(clientSubscription.startDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {clientSubscription.nextBillingDate && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Next Billing</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {clientSubscription.nextBillingDate instanceof Date
                                  ? clientSubscription.nextBillingDate.toLocaleDateString()
                                  : new Date(clientSubscription.nextBillingDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                        {clientSubscription.plan?.features && (
                          <div className="mt-4 pt-4 border-t border-purple-200">
                            <label className="block text-xs font-medium text-gray-500 mb-2">Plan Features</label>
                            <ul className="space-y-1">
                              {clientSubscription.plan.features.slice(0, 5).map((feature, index) => (
                                <li key={index} className="text-xs text-gray-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {clientSubscription && (
                          <div className="mt-4 pt-4 border-t border-purple-200">
                            <button
                              onClick={handleGenerateInvoice}
                              disabled={generatingInvoice}
                              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {generatingInvoice ? (
                                <>
                                  <Loader className="h-4 w-4 animate-spin" />
                                  Generating Invoice...
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4" />
                                  Generate Invoice & Payment Link
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6 text-center">
                        <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No active subscription</p>
                      </div>
                    )}

                    {/* Subscription Invoices */}
                    {subscriptionInvoices.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h5 className="text-md font-semibold text-gray-900 mb-4">Invoice History</h5>
                        <div className="space-y-3">
                          {subscriptionInvoices.map((invoice) => (
                            <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                                  <p className="text-xs text-gray-500">
                                    {invoice.createdAt instanceof Date
                                      ? invoice.createdAt.toLocaleDateString()
                                      : new Date(invoice.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">
                                    {invoice.currency || 'USD'} {invoice.amount?.toFixed(2) || '0.00'}
                                  </p>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    invoice.status === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : invoice.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {invoice.status || 'pending'}
                                  </span>
                                </div>
                              </div>
                              {invoice.paymentLink && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <a
                                    href={invoice.paymentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                    View Payment Link
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assign/Change Subscription */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h5 className="text-md font-semibold text-gray-900 mb-4">
                        {clientSubscription ? 'Change Subscription' : 'Assign Subscription'}
                      </h5>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Billing Plan *
                          </label>
                          <select
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            <option value="">Select a plan</option>
                            {billingPlans.filter(p => p.isActive).map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} - {plan.currency || 'USD'} {selectedBillingCycle === 'monthly' ? plan.monthlyPrice?.toFixed(2) : plan.yearlyPrice?.toFixed(2)}/{selectedBillingCycle === 'monthly' ? 'month' : 'year'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Billing Cycle *
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                value="monthly"
                                checked={selectedBillingCycle === 'monthly'}
                                onChange={(e) => setSelectedBillingCycle(e.target.value)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">Monthly</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                value="yearly"
                                checked={selectedBillingCycle === 'yearly'}
                                onChange={(e) => setSelectedBillingCycle(e.target.value)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">Yearly</span>
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={handleAssignSubscription}
                          disabled={!selectedPlanId || loadingSubscription}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingSubscription ? 'Processing...' : (clientSubscription ? 'Update Subscription' : 'Assign Subscription')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Activity Timeline Tab */}
          {activeTab === 'timeline' && (
            <ClientActivityTimeline 
              clientId={client.id} 
              clientName={client.name} 
              userRole={userProfile?.userType || userProfile?.type}
            />
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            {client.status === 'archived' ? (
              <button
                type="button"
                onClick={() => onUnarchive && onUnarchive(client.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 flex items-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Unarchive Client
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDelete && onDelete(client.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 flex items-center"
              >
                <Package className="h-4 w-4 mr-2" />
                Archive Client
              </button>
            )}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              {client.status !== 'archived' && (
                <button
                  type="button"
                  onClick={() => onAssignTask(client)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                >
                  Assign Task
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// Dashboard Card Modals
const StaffModal = ({ staff, onClose }) => {
  if (!staff) return null;

  const doctors = staff.filter(s => s.userType === 'doctor' || s.type === 'doctor');
  const nurses = staff.filter(s => s.userType === 'nurse' || s.type === 'nurse');
  const caregivers = staff.filter(s => s.userType === 'caregiver' || s.type === 'caregiver');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Total Staff</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Doctors */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Doctors ({doctors.length})</h3>
              </div>
              <div className="space-y-2">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{doctor.name || doctor.displayName}</p>
                        <p className="text-sm text-gray-600">{doctor.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doctor.status === 'active' ? 'bg-green-100 text-green-800' :
                        doctor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {doctor.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-gray-500 text-sm">No doctors found</p>
                )}
              </div>
            </div>

            {/* Nurses */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-purple-900">Nurses ({nurses.length})</h3>
              </div>
              <div className="space-y-2">
                {nurses.map((nurse) => (
                  <div key={nurse.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{nurse.name || nurse.displayName}</p>
                        <p className="text-sm text-gray-600">{nurse.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        nurse.status === 'active' ? 'bg-green-100 text-green-800' :
                        nurse.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {nurse.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {nurses.length === 0 && (
                  <p className="text-gray-500 text-sm">No nurses found</p>
                )}
              </div>
            </div>

            {/* Caregivers */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-900">Caregivers ({caregivers.length})</h3>
              </div>
              <div className="space-y-2">
                {caregivers.map((caregiver) => (
                  <div key={caregiver.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{caregiver.name || caregiver.displayName}</p>
                        <p className="text-sm text-gray-600">{caregiver.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        caregiver.status === 'active' ? 'bg-green-100 text-green-800' :
                        caregiver.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {caregiver.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {caregivers.length === 0 && (
                  <p className="text-gray-500 text-sm">No caregivers found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientsModal = ({ clients, onClose }) => {
  if (!clients) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Total Clients</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name || client.displayName}</h3>
                    <p className="text-sm text-gray-600">{client.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' :
                    client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status || 'active'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.dateOfBirth && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Age: {new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear()}</span>
                    </div>
                  )}
                  {client.medicalCondition && (
                    <div className="flex items-start">
                      <Heart className="h-4 w-4 mr-2 mt-0.5" />
                      <span className="text-xs">{client.medicalCondition}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {clients.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No clients found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentsModal = ({ appointments, view, onViewChange, onClose, institutionId }) => {
  const [calendarData, setCalendarData] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadCalendarData();
  }, [institutionId, currentMonth.getMonth(), currentMonth.getFullYear()]);

  const loadCalendarData = async () => {
    if (!institutionId) return;
    
    try {
      setLoading(true);
      
      // Load all caregivers for the institution
      const caregiversData = await caregiverAPI.getCaregivers({ institutionId });
      setCaregivers(caregiversData);

      // Load all schedules: appointments, task assignments, and care tasks
      const [appointmentsData, taskAssignmentsData, careTasksData] = await Promise.all([
        getAllAppointments(institutionId).catch(() => []),
        getAllTaskAssignments().catch(() => []),
        getAllCareTasks().catch(() => [])
      ]);

      // Get all client assignments
      const allAssignments = await assignmentAPI.getAssignmentsByInstitution(institutionId).catch(() => []);

      // Combine all schedules into a unified format
      const allSchedules = [];

      // Process appointments
      appointmentsData.forEach(apt => {
        if (apt.scheduledTime && apt.caregiverId) {
          const date = apt.scheduledTime instanceof Date ? apt.scheduledTime : new Date(apt.scheduledTime);
          allSchedules.push({
            id: apt.id,
            type: 'appointment',
            caregiverId: apt.caregiverId,
            caregiverName: apt.caregiverName || 'Unknown',
            clientName: apt.clientName || apt.patientName || 'Client',
            title: apt.title || apt.type || 'Appointment',
            date: date,
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: apt.status || 'scheduled',
            description: apt.description || apt.notes || ''
          });
        }
      });

      // Process task assignments
      taskAssignmentsData.forEach(task => {
        const caregiverId = task.caregiverId || task.assignedTo;
        if (caregiverId) {
          const date = task.scheduledTime || task.dueDate;
          if (date) {
            const taskDate = date instanceof Date ? date : new Date(date);
            allSchedules.push({
              id: task.id,
              type: 'task',
              caregiverId: caregiverId,
              caregiverName: task.caregiverName || 'Unknown',
              clientName: task.clientName || 'Client',
              title: task.title || 'Task',
              date: taskDate,
              time: taskDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              status: task.status || 'pending',
              description: task.description || task.instructions || '',
              priority: task.priority || 'normal'
            });
          }
        }
      });

      // Process care tasks
      careTasksData.forEach(task => {
        if (task.caregiverId && task.scheduledTime) {
          const date = task.scheduledTime instanceof Date ? task.scheduledTime : new Date(task.scheduledTime);
          allSchedules.push({
            id: task.id,
            type: 'careTask',
            caregiverId: task.caregiverId,
            caregiverName: task.caregiverName || 'Unknown',
            clientName: task.clientName || 'Client',
            title: task.title || task.task || 'Care Task',
            date: date,
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: task.status || 'pending',
            description: task.description || ''
          });
        }
      });

      // Process client assignments
      allAssignments.forEach(assignment => {
        if (assignment.caregiverId) {
          const date = assignment.dueDate || assignment.startDate;
          if (date) {
            const assignmentDate = date instanceof Date ? date : new Date(date);
            allSchedules.push({
              id: assignment.id,
              type: 'assignment',
              caregiverId: assignment.caregiverId,
              caregiverName: assignment.caregiverName || 'Unknown',
              clientName: assignment.clientName || 'Client',
              title: assignment.title || 'Assignment',
              date: assignmentDate,
              time: assignment.dueTime || '09:00',
              status: assignment.status || 'active',
              description: assignment.description || assignment.instructions || ''
            });
          }
        }
      });

      // Filter schedules for current month
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const filteredSchedules = allSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate >= monthStart && scheduleDate <= monthEnd;
      });

      setCalendarData(filteredSchedules);
      
      // Update selected day tasks
      updateSelectedDayTasks(selectedDate, filteredSchedules);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedDayTasks = (date, schedules = calendarData) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayTasks = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate >= dayStart && scheduleDate <= dayEnd;
    });

    // Sort by time
    dayTasks.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    setSelectedDayTasks(dayTasks);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    updateSelectedDayTasks(date);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getTasksForDay = (date) => {
    if (!date) return [];
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return calendarData.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate >= dayStart && scheduleDate <= dayEnd;
    });
  };

  const getCaregiverColor = (caregiverId) => {
    const colors = [
      { bg: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', border: 'border-blue-300' },
      { bg: 'bg-green-500', gradient: 'from-green-500 to-green-600', light: 'bg-green-50', border: 'border-green-300' },
      { bg: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-50', border: 'border-purple-300' },
      { bg: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600', light: 'bg-orange-50', border: 'border-orange-300' },
      { bg: 'bg-pink-500', gradient: 'from-pink-500 to-pink-600', light: 'bg-pink-50', border: 'border-pink-300' },
      { bg: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-300' },
      { bg: 'bg-teal-500', gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-50', border: 'border-teal-300' },
      { bg: 'bg-red-500', gradient: 'from-red-500 to-red-600', light: 'bg-red-50', border: 'border-red-300' },
      { bg: 'bg-yellow-500', gradient: 'from-yellow-500 to-yellow-600', light: 'bg-yellow-50', border: 'border-yellow-300' },
      { bg: 'bg-cyan-500', gradient: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-300' }
    ];
    const index = caregivers.findIndex(c => c.id === caregiverId);
    return colors[index % colors.length] || { bg: 'bg-gray-500', gradient: 'from-gray-500 to-gray-600', light: 'bg-gray-50', border: 'border-gray-300' };
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Stethoscope className="h-3 w-3" />;
      case 'task':
        return <ClipboardList className="h-3 w-3" />;
      case 'careTask':
        return <Heart className="h-3 w-3" />;
      case 'assignment':
        return <Briefcase className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'scheduled':
      case 'active':
        return <Clock className="h-3 w-3 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-3 w-3 text-yellow-600" />;
      default:
        return <Dot className="h-3 w-3 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-7 w-7 text-blue-600" />
                Caregiver Schedule Calendar
              </h2>
              <p className="text-sm text-gray-600 mt-1">View all caregiver schedules at a glance</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Tasks</p>
                  <p className="text-lg font-bold text-gray-900">{calendarData.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Completed</p>
                  <p className="text-lg font-bold text-gray-900">
                    {calendarData.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Pending</p>
                  <p className="text-lg font-bold text-gray-900">
                    {calendarData.filter(t => t.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Caregivers</p>
                  <p className="text-lg font-bold text-gray-900">{caregivers.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar and Details */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                      }

                      const dayTasks = getTasksForDay(date);
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      const hasTasks = dayTasks.length > 0;
                      const completedCount = dayTasks.filter(t => t.status === 'completed').length;
                      const pendingCount = dayTasks.filter(t => t.status === 'pending').length;

                      // Group tasks by caregiver for better visualization
                      const tasksByCaregiver = dayTasks.reduce((acc, task) => {
                        if (!acc[task.caregiverId]) {
                          acc[task.caregiverId] = [];
                        }
                        acc[task.caregiverId].push(task);
                        return acc;
                      }, {});

                      return (
                        <button
                          key={date.toDateString()}
                          onClick={() => handleDateClick(date)}
                          className={`relative aspect-square border-2 rounded-xl p-2 transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                            isSelected 
                              ? 'ring-4 ring-blue-400 bg-blue-50 border-blue-400 shadow-lg' 
                              : isToday 
                              ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400 shadow-md' 
                              : hasTasks
                              ? 'bg-gray-50 border-gray-300 hover:border-gray-400'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Date Number */}
                          <div className={`flex items-center justify-between mb-1 ${
                            isToday ? 'text-yellow-700' : isSelected ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            <span className={`text-sm font-bold ${isToday ? 'text-lg' : ''}`}>
                              {date.getDate()}
                            </span>
                            {hasTasks && (
                              <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                                {dayTasks.length}
                              </span>
                            )}
                          </div>

                          {/* Task Indicators */}
                          <div className="space-y-1 mt-1">
                            {Object.entries(tasksByCaregiver).slice(0, 2).map(([caregiverId, tasks]) => {
                              const colorScheme = getCaregiverColor(caregiverId);
                              const firstTask = tasks[0];
                              return (
                                <div
                                  key={caregiverId}
                                  className={`flex items-center gap-1 ${colorScheme.bg} text-white text-[10px] px-1.5 py-0.5 rounded-md shadow-sm`}
                                  title={`${firstTask.caregiverName}: ${tasks.length} task${tasks.length > 1 ? 's' : ''}`}
                                >
                                  {getTaskTypeIcon(firstTask.type)}
                                  <span className="font-semibold truncate flex-1">
                                    {firstTask.time}
                                  </span>
                                  {tasks.length > 1 && (
                                    <span className="bg-white/20 px-1 rounded font-bold">
                                      +{tasks.length - 1}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {Object.keys(tasksByCaregiver).length > 2 && (
                              <div className="text-[10px] font-semibold text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded text-center">
                                +{Object.keys(tasksByCaregiver).length - 2} more
                              </div>
                            )}
                          </div>

                          {/* Status Indicators */}
                          {hasTasks && (
                            <div className="absolute bottom-1 right-1 flex gap-0.5">
                              {completedCount > 0 && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" title={`${completedCount} completed`} />
                              )}
                              {pendingCount > 0 && (
                                <div className="w-2 h-2 bg-yellow-500 rounded-full" title={`${pendingCount} pending`} />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Caregiver Legend & Stats */}
                <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Caregivers ({caregivers.length})
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>Pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {caregivers.slice(0, 10).map((caregiver, index) => {
                      const colorScheme = getCaregiverColor(caregiver.id);
                      const caregiverTasks = calendarData.filter(t => t.caregiverId === caregiver.id);
                      return (
                        <div 
                          key={caregiver.id} 
                          className="flex items-center space-x-2 bg-white rounded-lg p-2 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className={`w-4 h-4 rounded-md shadow-sm ${colorScheme.bg}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {caregiver.name || caregiver.fullName || 'Unknown'}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {caregiverTasks.length} task{caregiverTasks.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Day Details */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  
                  {selectedDayTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No tasks scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {selectedDayTasks.map((task) => {
                        const caregiver = caregivers.find(c => c.id === task.caregiverId);
                        const colorScheme = getCaregiverColor(task.caregiverId);
                        return (
                          <div
                            key={task.id}
                            className={`border-l-4 ${getPriorityColor(task.priority)} bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className={`w-3 h-3 rounded-full ${colorScheme.bg} shadow-sm`} />
                                  <span className="text-sm font-bold text-gray-900 truncate">
                                    {task.caregiverName || 'Unknown Caregiver'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  {getTaskTypeIcon(task.type)}
                                  <h4 className="text-sm font-semibold text-gray-800 truncate">{task.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">{task.clientName}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 ml-2">
                                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                  <Clock className="h-3 w-3 text-gray-600" />
                                  <span className="text-xs font-bold text-gray-700">{task.time}</span>
                                </div>
                                {getStatusIcon(task.status)}
                              </div>
                            </div>
                            {task.description && (
                              <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-gray-50 p-2 rounded">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center flex-wrap gap-2 mt-3">
                              <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md font-medium ${
                                task.type === 'appointment' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                task.type === 'task' ? 'bg-green-100 text-green-800 border border-green-200' :
                                task.type === 'careTask' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}>
                                {getTaskTypeIcon(task.type)}
                                {task.type}
                              </span>
                              <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md font-medium ${
                                task.status === 'completed' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                                task.status === 'scheduled' || task.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' :
                                'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}>
                                {getStatusIcon(task.status)}
                                {task.status}
                              </span>
                              {task.priority && task.priority !== 'normal' && (
                                <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                  'bg-green-100 text-green-800 border border-green-200'
                                }`}>
                                  {task.priority} priority
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Caregiver Details Modal Component
// Pharmacist Details Modal Component
const PharmacistDetailsModal = ({ pharmacist, clients, onClose, onAssignClient }) => {
  const [activeTab, setActiveTab] = React.useState('info');
  const [showAssignClient, setShowAssignClient] = React.useState(false);
  const [selectedClientId, setSelectedClientId] = React.useState('');
  
  if (!pharmacist) return null;

  // Get clients assigned to this pharmacist
  const assignedClients = clients.filter(client => client.assignedPharmacistId === pharmacist.id);
  const unassignedClients = clients.filter(client => !client.assignedPharmacistId);

  const handleAssign = async () => {
    if (selectedClientId && onAssignClient) {
      await onAssignClient(selectedClientId, pharmacist.id);
      setShowAssignClient(false);
      setSelectedClientId('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <Pill className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{pharmacist.name || 'Unknown Pharmacist'}</h3>
              <p className="text-green-100 text-sm">{pharmacist.email || 'No email'}</p>
              <p className="text-green-100 text-xs mt-1">License: {pharmacist.licenseNumber || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pharmacist Info
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clients'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assigned Clients ({assignedClients.length})
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Pharmacist Info Tab */}
          {activeTab === 'info' && (
            <>
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">License Number</label>
                    <p className="mt-1 text-gray-900">{pharmacist.licenseNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Specialization</label>
                    <p className="mt-1 text-gray-900">{pharmacist.specialization || 'General Pharmacy'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Experience</label>
                    <p className="mt-1 text-gray-900">{pharmacist.experience || 0} years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pharmacist.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pharmacist.status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{pharmacist.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{pharmacist.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              {pharmacist.qualifications && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Qualifications</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{pharmacist.qualifications}</p>
                </div>
              )}

              {/* Address */}
              {pharmacist.address && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Address</h4>
                  <p className="text-gray-900">{pharmacist.address}</p>
                </div>
              )}

              {/* Notes */}
              {pharmacist.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Notes</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{pharmacist.notes}</p>
                </div>
              )}
            </>
          )}

          {/* Assigned Clients Tab */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Assigned Clients</h4>
                <button
                  onClick={() => setShowAssignClient(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Client
                </button>
              </div>

              {/* Assign Client Form */}
              {showAssignClient && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Assign New Client</h5>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm mb-3"
                  >
                    <option value="">-- Select a client --</option>
                    {unassignedClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.age} years old ({client.gender || 'N/A'})
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAssign}
                      disabled={!selectedClientId}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setShowAssignClient(false);
                        setSelectedClientId('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Assigned Clients List */}
              {assignedClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No clients assigned yet</p>
                  <p className="text-xs mt-1">Click "Assign Client" to assign clients to this pharmacist</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedClients.map((client) => (
                    <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-semibold text-green-700">
                              {client.name?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900">{client.name || 'Unknown Client'}</h5>
                            <p className="text-xs text-gray-500">{client.email || 'No email'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">Age: {client.age || 'N/A'}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{client.gender || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Client Medical Info Preview */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {client.medications && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-gray-500">Current Medications</label>
                            <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{client.medications}</p>
                          </div>
                        )}
                        {client.allergies && (
                          <div>
                            <label className="text-xs font-medium text-red-500">Allergies</label>
                            <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{client.allergies}</p>
                          </div>
                        )}
                        {!client.medications && !client.allergies && (
                          <p className="text-xs text-gray-400 italic">No medication or allergy information</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CaregiverDetailsModal = ({ caregiver, onClose, onResetPassword, onToggleStatus, onDelete, onAssignTask, onEditPayment, onEditAssignment, onDeleteAssignment, onViewAssignment, assignments = [], clients = [] }) => {
  const [activeTab, setActiveTab] = React.useState('info');
  
  if (!caregiver) return null;

  // Filter assignments for this specific caregiver
  const caregiverAssignments = assignments.filter(a => a.caregiverId === caregiver.id || a.caregiverId === caregiver.uid);
  const activeAssignments = caregiverAssignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const completedAssignments = caregiverAssignments.filter(a => a.status === 'completed');
  const scheduleStart = caregiver.startTime || caregiver.workingHoursStart || '';
  const scheduleEnd = caregiver.endTime || caregiver.workingHoursEnd || '';
  const paymentType = caregiver.paymentType || (caregiver.rateType === 'per_month' ? 'monthly' : 'hourly');
  const currencyCode = caregiver.currency || 'USD';
  const hourlyRateValue = caregiver.hourlyRate ?? (caregiver.rateType === 'per_hour' ? caregiver.rate : null);
  const monthlyRateValue = caregiver.monthlyRate ?? (caregiver.rateType === 'per_month' ? caregiver.rate : null);
  const formatCurrencyValue = (value) => {
    if (value === undefined || value === null || value === '') return 'N/A';
    const amount = Number(value);
    if (Number.isNaN(amount)) return value;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(amount);
    } catch (error) {
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  };
  const paymentTypeLabel = paymentType === 'monthly' ? 'Monthly' : 'Hourly';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4 overflow-hidden">
              {caregiver.profilePictureUrl ? (
                <img
                  src={caregiver.profilePictureUrl}
                  alt={caregiver.name || 'Caregiver profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-blue-600">
                  {caregiver.name?.charAt(0) || 'C'}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{caregiver.name || 'Unknown Caregiver'}</h3>
              <p className="text-blue-100 text-sm">{caregiver.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Caregiver Info
            </button>
            <button
              onClick={() => setActiveTab('careLogs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'careLogs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Care Logs
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Caregiver Info Tab */}
          {activeTab === 'info' && (
            <>
          {/* Onboarding Status Alert */}
          {!caregiver.onboardingComplete && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Onboarding Incomplete</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>This caregiver has not completed their onboarding process. They need to:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Fill out their professional profile</li>
                      <li>Upload required documents (license, certifications)</li>
                      <li>Submit for review</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Onboarding Status</label>
                {caregiver.onboardingComplete ? (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete - Documents Submitted
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending - Awaiting Completion
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Role</label>
                <p className="mt-1 text-gray-900">{caregiver.userType || caregiver.type || 'Caregiver'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Account Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  caregiver.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : caregiver.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : caregiver.status === 'suspended'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {caregiver.status || 'pending'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{caregiver.phone || 'N/A'}</p>
              </div>
              {scheduleStart && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Time</label>
                  <p className="mt-1 text-gray-900">{formatTimeForDisplay(scheduleStart)}</p>
                </div>
              )}
              {scheduleEnd && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Time</label>
                  <p className="mt-1 text-gray-900">{formatTimeForDisplay(scheduleEnd)}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Rating</label>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="ml-1 text-gray-900">{caregiver.rating || 0} / 5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Details</h4>
            <div className="space-y-3">
              {caregiver.specialization && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Specialization</label>
                  <p className="mt-1 text-gray-900">{caregiver.specialization}</p>
                </div>
              )}
              {caregiver.qualifications && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Qualifications</label>
                  <p className="mt-1 text-gray-900">{caregiver.qualifications}</p>
                </div>
              )}
              {caregiver.experience && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Experience</label>
                  <p className="mt-1 text-gray-900">{caregiver.experience}</p>
                </div>
              )}
              {caregiver.workingHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Working Hours</label>
                  {Array.isArray(caregiver.workingHours) ? (
                    <div className="mt-1 space-y-1">
                      {caregiver.workingHours.map((hours, index) => (
                        <p key={index} className="text-gray-900">• {hours}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-900">{caregiver.workingHours}</p>
                  )}
                </div>
              )}
              {caregiver.availableDays && caregiver.availableDays.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Available Days</label>
                  <p className="mt-1 text-gray-900">{caregiver.availableDays.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {(paymentType || hourlyRateValue || monthlyRateValue) && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Compensation</h4>
                {onEditPayment && (
                  <button
                    onClick={() => {
                      onEditPayment(caregiver);
                    }}
                    className="flex items-center px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Edit Payment
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Type</label>
                  <p className="mt-1 text-gray-900">{paymentTypeLabel}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Currency</label>
                  <p className="mt-1 text-gray-900">{currencyCode}</p>
                </div>
                {hourlyRateValue !== null && hourlyRateValue !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Hourly Rate</label>
                    <p className="mt-1 text-gray-900">{formatCurrencyValue(hourlyRateValue)}</p>
                  </div>
                )}
                {monthlyRateValue !== null && monthlyRateValue !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monthly Rate</label>
                    <p className="mt-1 text-gray-900">{formatCurrencyValue(monthlyRateValue)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Total Assignments</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiverAssignments.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Active Tasks</label>
                <p className="mt-1 text-2xl font-bold text-blue-600">{activeAssignments.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Completed</label>
                <p className="mt-1 text-2xl font-bold text-green-600">{completedAssignments.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Rating</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiver.rating || 0}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          {caregiver.address && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{caregiver.address}</p>
            </div>
          )}

          {/* Notes */}
          {caregiver.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{caregiver.notes}</p>
            </div>
          )}

          {/* Assignments - List View */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Tasks ({caregiverAssignments.length})</h4>
            {caregiverAssignments.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks assigned to this caregiver</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                {caregiverAssignments.map((assignment, index) => {
                        const client = clients.find(p => p.id === assignment.clientId);
                  // Use a unique key that combines ID and index to handle duplicates
                  const uniqueKey = assignment.id ? `${assignment.id}-${index}` : `assignment-${index}`;
                        return (
                    <div
                      key={uniqueKey}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        // Only trigger if clicking on the row itself, not on buttons
                        if (e.target.closest('button')) {
                          return;
                        }
                        if (onViewAssignment && assignment) {
                          onViewAssignment(assignment);
                        } else if (onEditAssignment && assignment) {
                          onEditAssignment(assignment);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <h5 className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                              {assignment.title || 'Untitled Task'}
                            </h5>
                            <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                              assignment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : assignment.status === 'in_progress' || assignment.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {assignment.status || 'pending'}
                                </span>
                            {assignment.priority && (
                              <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                                assignment.priority === 'urgent'
                                  ? 'bg-red-100 text-red-800'
                                  : assignment.priority === 'high'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.priority}
                              </span>
                            )}
                              </div>
                          
                          {(assignment.description || assignment.instructions) && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                              {assignment.description || assignment.instructions || 'No description'}
                            </p>
                          )}

                          {/* Metadata Row */}
                          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                            {assignment.clientName && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1.5 text-gray-400" />
                                <span>{assignment.clientName || client?.name || 'Unknown Client'}</span>
                            </div>
                            )}
                            {assignment.dueDate && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1.5 text-gray-400" />
                                <span>
                                  {assignment.dueDate}
                                  {assignment.dueTime && ` at ${assignment.dueTime}`}
                                </span>
                          </div>
                            )}
                            {assignment.instructions && (
                              <span className="text-gray-400 italic line-clamp-1">
                                {assignment.instructions}
                              </span>
                            )}
                    </div>
                  </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {onDeleteAssignment && assignment?.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (window.confirm(`Remove the task "${assignment.title || 'Untitled Task'}" from this caregiver?`)) {
                                  onDeleteAssignment(assignment.id);
                                }
                              }}
                              className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove task"
                              aria-label="Remove task"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          {onEditAssignment && assignment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onEditAssignment(assignment);
                              }}
                              className="flex items-center px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                              title="Edit task"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </button>
                          )}
                          {onDeleteAssignment && assignment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (assignment.id) {
                                  if (window.confirm(`Are you sure you want to delete the task "${assignment.title || 'Untitled Task'}"?`)) {
                                    onDeleteAssignment(assignment.id);
                                  }
                                } else {
                                  console.error('Cannot delete assignment: missing ID', assignment);
                                }
                              }}
                              className="flex items-center px-2.5 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </button>
                          )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
          </>
          )}

          {/* Care Logs Tab */}
          {activeTab === 'careLogs' && (
            <CaregiverCareLogsSection caregiverId={caregiver.id || caregiver.uid} clients={clients} />
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onResetPassword(caregiver.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => onToggleStatus(caregiver)}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                  caregiver.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {caregiver.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(caregiver.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onAssignTask(caregiver)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Client Reports Section Component
const ClientReportsSection = ({ clientId }) => {
  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddReport, setShowAddReport] = React.useState(false);
  const [reportType, setReportType] = React.useState('nurse');
  const { user, userProfile } = useUser();

  React.useEffect(() => {
    loadReports();
  }, [clientId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportsData = await getClientReports(clientId);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setReportType('nurse');
              setShowAddReport(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Nurse Report
          </button>
          <button
            onClick={() => {
              setReportType('doctor');
              setShowAddReport(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
          >
            Add Doctor Consultation
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reports yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.type === 'nurse'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {report.type === 'nurse' ? 'Nurse Report' : 'Doctor Consultation'}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(report.createdAt).toLocaleString()} • {report.createdBy}
                  </p>
                </div>
              </div>

              {report.type === 'nurse' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Vitals:</span>
                    <p className="text-gray-600 mt-1">{report.vitals || 'Not recorded'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Treatment/Care:</span>
                    <p className="text-gray-600 mt-1">{report.treatment || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Observation:</span>
                    <p className="text-gray-600 mt-1">{report.observation || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Recommendation:</span>
                    <p className="text-gray-600 mt-1">{report.recommendation || 'N/A'}</p>
                  </div>
                </div>
              )}

              {report.type === 'doctor' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Diagnosis:</span>
                    <p className="text-gray-600 mt-1">{report.diagnosis || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Prescription:</span>
                    <p className="text-gray-600 mt-1">{report.prescription || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Instructions:</span>
                    <p className="text-gray-600 mt-1">{report.instructions || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Care Plan:</span>
                    <p className="text-gray-600 mt-1">{report.carePlan || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddReport && (
        <AddReportModal
          clientId={clientId}
          reportType={reportType}
          onClose={() => setShowAddReport(false)}
          onSubmit={async (reportData) => {
            await createClientReport(clientId, reportData);
            setShowAddReport(false);
            await loadReports();
            toast.success('Report added successfully');
          }}
        />
      )}
    </div>
  );
};

// Client Care Logs Section Component
const ClientCareLogsSection = ({ clientId }) => {
  const [careLogs, setCareLogs] = React.useState([]);
  const [adlLogs, setAdlLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddLog, setShowAddLog] = React.useState(false);
  const [activeLogTab, setActiveLogTab] = React.useState('all'); // all, care, adl
  const { user, userProfile } = useUser();

  React.useEffect(() => {
    loadCareLogs();
  }, [clientId]);

  const loadCareLogs = async () => {
    try {
      setLoading(true);
      
      // Load regular care logs
      const logsData = await getClientCareLogs(clientId);
      setCareLogs(logsData);
      
      // Load ADL logs
      try {
        const adlLogsQuery = query(
          collection(db, 'adlLogs'),
          where('clientId', '==', clientId),
          orderBy('timestamp', 'desc')
        );
        const adlLogsSnapshot = await getDocs(adlLogsQuery);
        const adlLogsData = adlLogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'adl' // Mark as ADL log
        }));
        setAdlLogs(adlLogsData);
      } catch (adlError) {
        console.error('Error loading ADL logs:', adlError);
        // Don't fail the whole component if ADL logs fail
        setAdlLogs([]);
      }
    } catch (error) {
      console.error('Error loading care logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading care logs...</div>;
  }

  // Combine and filter logs based on active tab
  const getFilteredLogs = () => {
    let allLogs = [];
    
    if (activeLogTab === 'all' || activeLogTab === 'care') {
      allLogs = [...allLogs, ...careLogs.map(log => ({ ...log, type: 'care' }))];
    }
    
    if (activeLogTab === 'all' || activeLogTab === 'adl') {
      allLogs = [...allLogs, ...adlLogs];
    }
    
    // Sort by timestamp (most recent first)
    return allLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt || 0);
      const dateB = new Date(b.timestamp || b.createdAt || 0);
      return dateB - dateA;
    });
  };

  const filteredLogs = getFilteredLogs();
  const totalLogs = careLogs.length + adlLogs.length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div>
        <h3 className="text-lg font-semibold text-gray-900">Care Activity Logs</h3>
          <p className="text-sm text-gray-500 mt-1">
            {totalLogs} total logs ({careLogs.length} care logs, {adlLogs.length} ADL activities)
          </p>
        </div>
        <button
          onClick={() => setShowAddLog(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Add Care Log
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveLogTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeLogTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Logs ({totalLogs})
          </button>
          <button
            onClick={() => setActiveLogTab('care')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeLogTab === 'care'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Care Logs ({careLogs.length})
          </button>
          <button
            onClick={() => setActiveLogTab('adl')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeLogTab === 'adl'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ADL Activities ({adlLogs.length})
          </button>
        </nav>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {activeLogTab === 'all' ? '' : activeLogTab} logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`border-l-4 ${
                log.type === 'adl' 
                  ? 'border-purple-500' 
                  : 'border-green-500'
              } bg-white shadow-sm rounded-r-lg p-4 hover:shadow-md transition-shadow`}
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-base">
                      {log.type === 'adl' ? log.activityName : (log.activityType || 'Care Activity')}
                    </p>
                    {log.type === 'adl' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        <Activity className="h-3 w-3 mr-1" />
                        ADL
                      </span>
                    )}
                </div>
                  
                  {/* Detailed timestamp and caregiver info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {new Date(log.timestamp || log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="font-medium">{log.caregiverName || 'Unknown Caregiver'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  log.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : log.status === 'skipped'
                    ? 'bg-yellow-100 text-yellow-800'
                    : log.status === 'issue'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {log.status === 'completed' && '✓ '}
                  {log.status === 'skipped' && '⊘ '}
                  {log.status === 'issue' && '⚠ '}
                  {log.status?.toUpperCase() || 'COMPLETED'}
                </span>
              </div>
              
              {/* Description/Notes Section */}
              {(log.description || log.notes) && (
                <div className="bg-gray-50 rounded-md p-3 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
              <p className="text-gray-700 text-sm">{log.description || log.notes}</p>
                </div>
              )}
              
              {/* Details Grid */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                {/* ADL Category */}
                {log.type === 'adl' && log.activityCategory && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Category:</span>
                    <span className="text-gray-700 bg-purple-50 px-2 py-1 rounded">
                      {log.activityCategory}
                    </span>
                  </div>
                )}
                
                {/* Duration */}
              {log.duration && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Duration:</span>
                    <span className="text-gray-700">{log.duration}</span>
                  </div>
                )}
                
                {/* Caregiver ID (for reference) */}
                {log.caregiverId && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Caregiver ID:</span>
                    <span className="text-gray-700 font-mono text-xs">{log.caregiverId.substring(0, 8)}...</span>
                  </div>
                )}
                
                {/* Activity ID (for ADL logs) */}
                {log.type === 'adl' && log.activityId && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Activity:</span>
                    <span className="text-gray-700">{log.activityId}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddLog && (
        <AddCareLogModal
          clientId={clientId}
          onClose={() => setShowAddLog(false)}
          onSubmit={async (logData) => {
            await createClientCareLog(clientId, logData);
            setShowAddLog(false);
            await loadCareLogs();
            toast.success('Care log added successfully');
          }}
        />
      )}
    </div>
  );
};

// Caregiver Care Logs Section Component
const CaregiverCareLogsSection = ({ caregiverId, clients = [] }) => {
  const [careLogs, setCareLogs] = React.useState([]);
  const [adlLogs, setAdlLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeLogTab, setActiveLogTab] = React.useState('all'); // all, care, adl

  React.useEffect(() => {
    loadCareLogs();
  }, [caregiverId]);

  const loadCareLogs = async () => {
    try {
      setLoading(true);
      
      // Load regular care logs for this caregiver
      const logsData = await getCareLogsByCaregiver(caregiverId);
      setCareLogs(logsData);
      
      // Load ADL logs for this caregiver
      try {
        const adlLogsQuery = query(
          collection(db, 'adlLogs'),
          where('caregiverId', '==', caregiverId),
          orderBy('timestamp', 'desc')
        );
        const adlLogsSnapshot = await getDocs(adlLogsQuery);
        const adlLogsData = adlLogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'adl' // Mark as ADL log
        }));
        setAdlLogs(adlLogsData);
      } catch (adlError) {
        console.error('Error loading ADL logs:', adlError);
        // Don't fail the whole component if ADL logs fail
        setAdlLogs([]);
      }
    } catch (error) {
      console.error('Error loading caregiver care logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading care logs...</div>;
  }

  // Combine and filter logs based on active tab
  const getFilteredLogs = () => {
    let allLogs = [];
    
    if (activeLogTab === 'all' || activeLogTab === 'care') {
      allLogs = [...allLogs, ...careLogs.map(log => ({ ...log, type: 'care' }))];
    }
    
    if (activeLogTab === 'all' || activeLogTab === 'adl') {
      allLogs = [...allLogs, ...adlLogs];
    }
    
    // Sort by timestamp (most recent first)
    return allLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt || a.logDate || 0);
      const dateB = new Date(b.timestamp || b.createdAt || b.logDate || 0);
      return dateB - dateA;
    });
  };

  const filteredLogs = getFilteredLogs();
  const totalLogs = careLogs.length + adlLogs.length;

  const getClientName = (clientId) => {
    if (!clientId) return 'Unknown Client';
    const client = clients.find(c => c.id === clientId || c.uid === clientId);
    return client?.name || client?.fullName || 'Unknown Client';
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Care Activity Logs</h3>
        <p className="text-sm text-gray-500 mt-1">
          {totalLogs} total logs ({careLogs.length} care logs, {adlLogs.length} ADL activities)
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveLogTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeLogTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Logs ({totalLogs})
          </button>
          <button
            onClick={() => setActiveLogTab('care')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeLogTab === 'care'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Care Logs ({careLogs.length})
          </button>
          <button
            onClick={() => setActiveLogTab('adl')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeLogTab === 'adl'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ADL Activities ({adlLogs.length})
          </button>
        </nav>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {activeLogTab === 'all' ? '' : activeLogTab} logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`border-l-4 ${
                log.type === 'adl' 
                  ? 'border-purple-500' 
                  : 'border-green-500'
              } bg-white shadow-sm rounded-r-lg p-4 hover:shadow-md transition-shadow`}
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-base">
                      {log.type === 'adl' ? log.activityName : (log.activityType || log.title || 'Care Activity')}
                    </p>
                    {log.type === 'adl' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        <Activity className="h-3 w-3 mr-1" />
                        ADL
                      </span>
                    )}
                  </div>
                  
                  {/* Client and timestamp info */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {log.clientId && (
                      <>
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{getClientName(log.clientId)}</span>
                        </div>
                        <span className="text-gray-400">•</span>
                      </>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {new Date(log.timestamp || log.createdAt || log.logDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  log.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : log.status === 'skipped'
                    ? 'bg-yellow-100 text-yellow-800'
                    : log.status === 'issue'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {log.status === 'completed' && '✓ '}
                  {log.status === 'skipped' && '⊘ '}
                  {log.status === 'issue' && '⚠ '}
                  {log.status?.toUpperCase() || 'COMPLETED'}
                </span>
              </div>
              
              {/* Description/Notes Section */}
              {(log.description || log.notes || log.content) && (
                <div className="bg-gray-50 rounded-md p-3 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                  <p className="text-gray-700 text-sm">{log.description || log.notes || log.content}</p>
                </div>
              )}
              
              {/* Details Grid */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                {/* Client */}
                {log.clientId && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Client:</span>
                    <span className="text-gray-700">{getClientName(log.clientId)}</span>
                  </div>
                )}
                
                {/* ADL Category */}
                {log.type === 'adl' && log.activityCategory && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Category:</span>
                    <span className="text-gray-700 bg-purple-50 px-2 py-1 rounded">
                      {log.activityCategory}
                    </span>
                  </div>
                )}
                
                {/* Duration */}
                {log.duration && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Duration:</span>
                    <span className="text-gray-700">{log.duration}</span>
                  </div>
                )}
                
                {/* Location */}
                {log.location && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-500 mr-2">Location:</span>
                    <span className="text-gray-700">{log.location}</span>
                  </div>
                )}
              </div>
              
              {/* Media/Photos */}
              {log.media && Array.isArray(log.media) && log.media.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Photos/Media ({log.media.length}):</p>
                  <div className="grid grid-cols-3 gap-2">
                    {log.media.slice(0, 3).map((media, idx) => (
                      <img
                        key={idx}
                        src={media.url || media}
                        alt={`Log media ${idx + 1}`}
                        className="w-full h-20 object-cover rounded border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ))}
                    {log.media.length > 3 && (
                      <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-xs text-gray-600">
                        +{log.media.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add Report Modal Component
const AddReportModal = ({ clientId, reportType, onClose, onSubmit }) => {
  const { userProfile } = useUser();
  const [formData, setFormData] = React.useState(
    reportType === 'nurse'
      ? { vitals: '', treatment: '', observation: '', recommendation: '' }
      : { diagnosis: '', prescription: '', instructions: '', carePlan: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      type: reportType,
      createdBy: userProfile?.name || 'Unknown',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {reportType === 'nurse' ? 'Add Nurse Report' : 'Add Doctor Consultation'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {reportType === 'nurse' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Vitals</label>
                <textarea
                  rows={3}
                  required
                  value={formData.vitals}
                  onChange={(e) => setFormData({ ...formData, vitals: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="BP: 120/80, Temp: 98.6°F, Pulse: 72 bpm..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment/Care Done</label>
                <textarea
                  rows={3}
                  required
                  value={formData.treatment}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Medications administered, wound care, etc..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observation</label>
                <textarea
                  rows={3}
                  required
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Client's condition, behavior, concerns..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation</label>
                <textarea
                  rows={2}
                  value={formData.recommendation}
                  onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Follow-up actions, suggestions..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  rows={3}
                  required
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Medical diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescription</label>
                <textarea
                  rows={3}
                  required
                  value={formData.prescription}
                  onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Medications prescribed..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Client instructions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Care Plan</label>
                <textarea
                  rows={3}
                  value={formData.carePlan}
                  onChange={(e) => setFormData({ ...formData, carePlan: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ongoing care plan..."
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                reportType === 'nurse'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Save Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Care Log Modal Component
const AddCareLogModal = ({ clientId, onClose, onSubmit }) => {
  const { userProfile } = useUser();
  const [formData, setFormData] = React.useState({
    activityType: '',
    description: '',
    duration: '',
    status: 'completed'
  });

  const activityTypes = [
    'Medication Administration',
    'Vital Signs Check',
    'Personal Care',
    'Meal Assistance',
    'Exercise/Mobility',
    'Companionship',
    'Medical Procedure',
    'Emergency Response',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      caregiverName: userProfile?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Add Care Activity Log</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
            <select
              required
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select activity type...</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Describe the care activity..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (optional)</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 30 minutes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Assignment Modal Component
const EditAssignmentModal = ({ assignment, onClose, onSave, clients, caregivers }) => {
  if (!assignment) return null;

  const [formData, setFormData] = React.useState({
    title: assignment.title || '',
    description: assignment.description || '',
    instructions: assignment.instructions || '',
    priority: assignment.priority || 'normal',
    dueDate: assignment.dueDate || '',
    dueTime: assignment.dueTime || '',
    status: assignment.status || 'pending'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div>
            <h3 className="text-xl font-bold text-white">Edit Assignment</h3>
            <p className="text-blue-100 text-sm mt-1">Update task details</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task description"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
            <textarea
              name="instructions"
              rows={4}
              value={formData.instructions}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter special instructions for the caregiver"
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
              <select
                name="priority"
                required
                value={formData.priority}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
              <select
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
              <input
                type="time"
                name="dueTime"
                value={formData.dueTime}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Client and Caregiver Info (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Client: </span>
              <span className="font-medium text-gray-900 ml-1">
                {assignment.clientName || clients.find(c => c.id === assignment.clientId)?.name || 'Unknown Client'}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Caregiver: </span>
              <span className="font-medium text-gray-900 ml-1">
                {assignment.caregiverName || caregivers.find(c => c.id === assignment.caregiverId)?.name || 'Unknown Caregiver'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assignment Details Modal Component
const AssignmentDetailsModal = ({ assignment, onClose, clients, caregivers }) => {
  if (!assignment) return null;

  const client = clients.find(p => p.id === assignment.clientId);
  const caregiver = caregivers.find(c => c.id === assignment.caregiverId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-purple-600">
          <div>
            <h3 className="text-xl font-bold text-white">{assignment.title || 'Assignment Details'}</h3>
            <p className="text-purple-100 text-sm mt-1">Task ID: {assignment.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              assignment.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : assignment.status === 'in_progress' || assignment.status === 'active'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {assignment.status || 'pending'}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              assignment.priority === 'urgent'
                ? 'bg-red-100 text-red-800'
                : assignment.priority === 'high'
                ? 'bg-orange-100 text-orange-800'
                : assignment.priority === 'normal'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {assignment.priority || 'normal'} priority
            </span>
          </div>

          {/* Client & Caregiver Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Client</label>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {(assignment.clientName || client?.name || 'U').charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{assignment.clientName || client?.name || 'Unknown Client'}</p>
                  <p className="text-sm text-gray-500">{assignment.clientEmail || client?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Assigned To</label>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {(assignment.caregiverName || caregiver?.name || 'U').charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{assignment.caregiverName || caregiver?.name || 'Unknown Caregiver'}</p>
                  <p className="text-sm text-gray-500">{assignment.caregiverEmail || caregiver?.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {assignment.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <p className="text-gray-900 bg-gray-50 rounded-lg p-4">{assignment.description}</p>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
              <p className="text-gray-900 bg-yellow-50 border border-yellow-200 rounded-lg p-4">{assignment.instructions}</p>
            </div>
          )}

          {/* Due Date & Time */}
          {(assignment.dueDate || assignment.dueTime) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date & Time</label>
              <div className="flex items-center space-x-4 text-gray-900 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span>{assignment.dueDate || 'No date set'}</span>
                </div>
                {assignment.dueTime && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span>{assignment.dueTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-500">Assigned By</label>
              <p className="mt-1 text-gray-900">{assignment.assignedByName || 'Admin'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Created Date</label>
              <p className="mt-1 text-gray-900">
                {assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit User Role Modal Component
const EditUserRoleModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    userType: user?.userType || user?.type || '',
    role: user?.role || user?.userType || '',
    medicalQualification: user?.medicalQualification || '',
    specialization: user?.specialization || '',
    status: user?.status || 'active',
    active: user?.active !== false
  });

  const userTypes = [
    'caregiver',
    'doctor',
    'nurse',
    'pharmacist',
    'admin',
    'institutionAdmin'
  ];

  const medicalQualifications = [
    'Doctor (MD)',
    'Registered Nurse (RN)',
    'Licensed Practical Nurse (LPN)',
    'Certified Nursing Assistant (CNA)',
    'Physical Therapist',
    'Occupational Therapist',
    'Pharmacist',
    'Caregiver (Non-Medical)',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Edit User Role & Permissions</h3>
              <p className="text-purple-100 text-sm mt-1">Update user role, qualifications, and status</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Info Display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">User Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {user?.name || user?.displayName || 'N/A'}</p>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
              <p><strong>Current Role:</strong> {user?.userType || user?.type || 'N/A'}</p>
            </div>
          </div>

          {/* User Type/Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type/Role *
            </label>
            <select
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="">Select user type</option>
              {userTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This determines what permissions and features the user has access to
            </p>
          </div>

          {/* Medical Qualification */}
          {(formData.userType === 'caregiver' || formData.userType === 'doctor' || formData.userType === 'nurse') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Qualification
              </label>
              <select
                value={formData.medicalQualification}
                onChange={(e) => setFormData({ ...formData, medicalQualification: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select qualification</option>
                {medicalQualifications.map((qual) => (
                  <option key={qual} value={qual}>{qual}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Sets the user's professional qualification level
              </p>
            </div>
          )}

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization
            </label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Geriatric Care, Dementia Care, etc."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Account Active</label>
              <p className="text-xs text-gray-500 mt-1">Enable or disable user access</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.active ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Changing user type affects their dashboard access and permissions</li>
                  <li>User must log out and log back in for changes to take full effect</li>
                  <li>Medical qualifications determine what actions they can perform</li>
                  <li>Setting status to 'inactive' or 'suspended' will block their access</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Billing Plan Modal Component
const EditBillingPlanModal = ({ plan, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    tier: plan?.tier || '',
    description: plan?.description || '',
    monthlyPrice: plan?.monthlyPrice || 0,
    yearlyPrice: plan?.yearlyPrice || 0,
    currency: plan?.currency || 'USD',
    features: plan?.features || [],
    isActive: plan?.isActive !== false
  });
  const [newFeature, setNewFeature] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: plan?.id,
      monthlyPrice: parseFloat(formData.monthlyPrice),
      yearlyPrice: parseFloat(formData.yearlyPrice)
    });
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Edit Billing Plan</h3>
              <p className="text-purple-100 text-sm mt-1">Configure pricing and features for {plan?.name || 'plan'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
              placeholder="e.g., Basic, Standard, Premium"
            />
          </div>

          {/* Plan Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Tier *
            </label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="">Select tier</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={2}
              placeholder="Brief description of the plan"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Price *
              </label>
              <div className="flex items-center">
                <span className="mr-2 text-gray-500">{formData.currency}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yearly Price *
              </label>
              <div className="flex items-center">
                <span className="mr-2 text-gray-500">{formData.currency}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.yearlyPrice}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="NGN">NGN (₦)</option>
            </select>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Features
            </label>
            <div className="space-y-2 mb-3">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">{feature}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add a feature"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Plan Active</label>
              <p className="text-xs text-gray-500 mt-1">Enable or disable this plan</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isActive ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Payment Gateway Configuration Modal
const PaymentGatewayConfigModal = ({ gateway, existingConfig, onClose, onSave }) => {
  const [selectedGateway, setSelectedGateway] = useState(gateway || existingConfig?.gateway || '');
  const [configData, setConfigData] = useState({});
  const [mode, setMode] = useState(existingConfig?.mode || 'sandbox');
  const [isActive, setIsActive] = useState(existingConfig?.isActive !== false);

  const gatewayInfo = selectedGateway ? paymentGatewayAPI.SUPPORTED_GATEWAYS[selectedGateway] : null;

  const handleFieldChange = (field, value) => {
    setConfigData({
      ...configData,
      [field]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedGateway) {
      alert('Please select a payment gateway');
      return;
    }

    // Validate required fields
    const requiredFields = Object.entries(gatewayInfo.fields)
      .filter(([_, field]) => field.required)
      .map(([key, _]) => key);

    const missingFields = requiredFields.filter(field => !configData[field]);
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    onSave({
      gateway: selectedGateway,
      credentials: configData,
      mode,
      isActive
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Configure Payment Gateway</h3>
              <p className="text-indigo-100 text-sm mt-1">Set up your payment gateway credentials</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Gateway Selection */}
          {!gateway && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment Gateway *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(paymentGatewayAPI.SUPPORTED_GATEWAYS).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedGateway(key)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedGateway === key
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{info.icon}</div>
                    <div className="font-semibold text-gray-900">{info.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedGateway && gatewayInfo && (
            <>
              {/* Gateway Info */}
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{gatewayInfo.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{gatewayInfo.name}</h4>
                    <p className="text-sm text-gray-600">Enter your {gatewayInfo.name} credentials below</p>
                  </div>
                </div>
              </div>

              {/* Gateway Fields */}
              <div className="space-y-4">
                {Object.entries(gatewayInfo.fields).map(([key, field]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={configData[key] || ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required={field.required}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={configData[key] || ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={`Enter ${field.label}`}
                        required={field.required}
                      />
                    )}
                    {field.type === 'password' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Your credentials are stored securely and encrypted
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Mode Selection */}
              {gatewayInfo.fields.mode || selectedGateway === 'paypal' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="sandbox"
                        checked={mode === 'sandbox'}
                        onChange={(e) => setMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Sandbox (Test Mode)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="live"
                        checked={mode === 'live'}
                        onChange={(e) => setMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Live (Production)</span>
                    </label>
                  </div>
                </div>
              ) : null}

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Gateway</label>
                  <p className="text-xs text-gray-500 mt-1">Activate this payment gateway</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedGateway}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstitutionAdminDashboard;


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, getDoc, addDoc, orderBy } from '../services/databaseCompat';
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
  AlertCircle,
  TrendingUp,
  UserCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  ArrowLeft,
  Eye,
  EyeOff,
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
  Database,
  CreditCard,
  Ban,
  Menu,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { getAllUsers, createUser, updateUserStatus } from '../api/usersAPI';
import { analyticsAPI } from '../api/analyticsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { getAllClients, createClient, updateClient } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { getClientReports, createClientReport, getClientCareLogs, createClientCareLog } from '../api/patientReportsAPI';
import { getCareLogsByCaregiver } from '../api/careLogsAPI';
import * as billingPlansAPI from '../api/billingPlansAPI';
// Payment gateway removed - using billing plans instead
import * as subscriptionInvoiceAPI from '../api/subscriptionInvoiceAPI';
import { getAllAppointments } from '../api/appointmentsAPI';
import { getAllTaskAssignments } from '../api/taskAssignmentAPI';
import { getAllCareTasks } from '../api/careTasksAPI';
import UserNameWithAvatar from '../components/UserNameWithAvatar';
import UserAvatarDropdown from '../components/UserAvatarDropdown';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES, notificationsAPI } from '../api/notificationsAPI';
import { institutionAPI } from '../api/partnerAPI';
import { deleteDoc } from '../services/databaseCompat';
import PartnerLinkCustomizer from '../components/PartnerLinkCustomizer';
import InventoryBillingTab from '../components/InventoryBillingTab';
import CallInterface from '../components/CallInterface';
import UserManagement from '../components/UserManagement';
import DashboardSwitcher from '../components/DashboardSwitcher';
import AdminRoleAssignment from '../components/AdminRoleAssignment';
import ArchivedClients from '../components/ArchivedClients';
import CleanupOrphanedUsers from '../components/CleanupOrphanedUsers';
import InactiveCaregiversReport from '../components/InactiveCaregiversReport';
import { collection, query, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, where, doc, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';
import SchedulingModule from '../components/SchedulingModule';
import ClientActivityTimeline from '../components/ClientActivityTimeline';
import CaregiverWageManagement from '../components/CaregiverWageManagement';
import CaregiverWageEditModal from '../components/CaregiverWageEditModal';
import UserProfileSettings from '../components/UserProfileSettings';
import PartnerSettings from '../components/PartnerSettings';
import CreatePatientModal from '../components/CreatePatientModal';
import PartnerUserCreationModal from '../components/PartnerUserCreationModal';
import AddCaregiverModal from '../components/AddCaregiverModal';
import CaregiverDetailsModal from '../components/CaregiverDetailsModal';
import ClientDetailsModal from '../components/ClientDetailsModal';
import HelpSupport from '../components/HelpSupport';
import { toast } from 'react-toastify';
import { getConversationsByUser, getMessagesByConversation, sendMessage as sendMessageAPI, getOrCreateConversation, subscribeToUserConversations, subscribeToConversationMessages, markConversationAsRead } from '../api/messagesAPI';
import CallService from '../services/callService';
import WebRTCService from '../services/webrtcService';
import PortalSwitcher from '../components/PortalSwitcher';
import { getAllDiagnostics, updateDiagnosticTest } from '../api/diagnosticsAPI';
import { trackAdminEvent } from '../services/analyticsService';
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
import BillingManagementDashboard from '../components/BillingManagementDashboard';
import TestingQADashboard from '../components/TestingQADashboard';
import useResponsive from '../hooks/useResponsive';
import DashboardLayout from '../components/DashboardLayout';

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

const formatDateValue = (value) => {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Payment gateway constants removed

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="cm-stat">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="cm-stat-label">{label}</p>
        <p className="cm-stat-value">{value}</p>
      </div>
      <div
        className={`cm-stat-icon bg-gradient-to-br ${accent}`}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
  </div>
);

const PartnerAdminDashboard = () => {
  const { institutionData: contextPartnerData, userProfile, institutionId: userPartnerId, user, userRoles } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);

  // Get institutionId from URL params or user profile - use useMemo to ensure it's always defined
  const institutionId = useMemo(() => {
    return searchParams.get('institution') || userPartnerId || userProfile?.institutionId || null;
  }, [searchParams, userPartnerId, userProfile?.institutionId]);
  
  const effectivePartnerId = useMemo(() => {
    return institutionId || userProfile?.institutionId || null;
  }, [institutionId, userProfile?.institutionId]);

  const displayName =
    userProfile?.name || userProfile?.displayName || userProfile?.email || 'Partner admin';

  const currentUserRole = useMemo(() => {
    // Prioritize admin roles from the roles array before falling back to userType/type/role
    if (Array.isArray(userRoles) && userRoles.length > 0) {
      if (userRoles.includes('admin')) return 'admin';
      if (userRoles.includes('institutionAdmin')) return 'institutionAdmin';
      if (userRoles.includes('pharmacist')) return 'pharmacist';
      if (userRoles.includes('doctor')) return 'doctor';
      if (userRoles.includes('nurse')) return 'nurse';
      if (userRoles.includes('caregiver')) return 'caregiver';
      return userRoles[0];
    }
    return userProfile?.userType || userProfile?.type || userProfile?.role || null;
  }, [userProfile, userRoles]);

  const finalPartnerId = useMemo(() => {
    return (
      effectivePartnerId ||
      institutionId ||
      userProfile?.institutionId ||
      searchParams.get('institution') ||
      null
    );
  }, [effectivePartnerId, institutionId, userProfile, searchParams]);
  
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
  const [localPartnerData, setLocalPartnerData] = useState(null);
  
  // Use local institution data if available, otherwise use context data
  const institutionData = localPartnerData || contextPartnerData;

  // Client and Caregiver Management States
  const [clients, setClients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [pharmacists, setPharmacists] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pendingDiagnostics, setPendingDiagnostics] = useState([]);
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showAddPharmacist, setShowAddPharmacist] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState('client-to-caregiver');
  const [selectedClientForAssignment, setSelectedClientForAssignment] = useState('');
  const [selectedCaregiverForAssignment, setSelectedCaregiverForAssignment] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    instructions: '',
    priority: 'normal',
    dueDate: '',
    dueTime: ''
  });
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    title: '',
    description: '',
    instructions: '',
    priority: 'normal',
    dueDate: '',
    dueTime: '',
    status: 'pending'
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Billing Plans States
  const [billingPlans, setBillingPlans] = useState([]);
  const [showEditBillingPlanModal, setShowEditBillingPlanModal] = useState(false);
  const [selectedBillingPlan, setSelectedBillingPlan] = useState(null);

  // Dashboard Card Modal States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [appointmentView, setAppointmentView] = useState('daily'); // daily, weekly, monthly
  
  // Partner Link Customization
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
  const [showMobileChatPane, setShowMobileChatPane] = useState(false);
  const [isNarrowMessagingLayout, setIsNarrowMessagingLayout] = useState(false);
  const [isConversationListCollapsed, setIsConversationListCollapsed] = useState(false);

  const { isMobile, isTablet } = useResponsive();
  const isMobileMessagingView = isMobile || isTablet || isNarrowMessagingLayout;
  const isDesktopMessagingView = !isMobileMessagingView;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleChange = (event) => setIsNarrowMessagingLayout(event.matches);
    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isMobileMessagingView) {
      setIsConversationListCollapsed(false);
    }
  }, [isMobileMessagingView]);

  useEffect(() => {
    if (activeTab !== 'messages') {
      setIsConversationListCollapsed(false);
    }
  }, [activeTab]);

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
    // Partner login flow: First authenticate, then determine partner status and institutionId
    // Wait for user and userProfile to be loaded
    if (!user || !userProfile) {
      console.log('⏳ Waiting for user authentication and profile...');
      return;
    }
    
    // Check if user is a partner (admin with institutionId)
    const isPartner = ['admin', 'institutionAdmin'].includes(currentUserRole) && (userProfile.institutionId || institutionId || effectivePartnerId);
    
    // IMPORTANT: Redirect non-admin users to their appropriate dashboards
    if (currentUserRole === 'pharmacist' || userProfile?.medicalQualification === 'Pharmacist') {
      console.log('🚫 Pharmacist detected in admin dashboard, redirecting to pharmacy dashboard...');
      const instId = userProfile.institutionId || institutionId || effectivePartnerId;
      if (instId) {
        navigate(`/institution-pharmacy/dashboard?institution=${instId}`, { replace: true });
      } else {
        navigate('/institution-pharmacy/dashboard', { replace: true });
      }
      return;
    }
    
    const isAlsoAdmin = Array.isArray(userRoles) && (userRoles.includes('admin') || userRoles.includes('institutionAdmin'));
    if (['caregiver', 'doctor', 'nurse'].includes(currentUserRole) && !isAlsoAdmin) {
      console.log(`🚫 ${currentUserRole} detected in admin dashboard (not admin), redirecting to caregiver dashboard...`);
      const instId = userProfile.institutionId || institutionId || effectivePartnerId;
      if (instId) {
        navigate(`/institution-caregiver/dashboard?institution=${instId}`, { replace: true });
      } else {
        navigate('/institution-caregiver/dashboard', { replace: true });
      }
      return;
    }
    
    // Get institutionId from profile (partner flow) or URL params
    const instIdForSession = userProfile.institutionId || institutionId || effectivePartnerId || searchParams.get('institution');
    
    // If non-admin user has no institutionId, show error
    if (!instIdForSession && !['admin', 'institutionAdmin', 'superAdmin'].includes(currentUserRole)) {
      console.error('❌ Non-admin user with no institutionId');
      setLoading(false);
      toast.error('Unable to determine your institution. Please contact support.');
      return;
    }
    
    // If we have user and profile, proceed with dashboard load (admins can view without institution)
    if (userProfile && user) {
      console.log('✅ Partner login flow - Loading dashboard:', {
        userRole: currentUserRole,
        institutionId: instIdForSession,
        isPartner
      });
      
      // Validate tab session for role conflicts
      const validation = sessionManager.validateTabSession(user, currentUserRole);

      if (validation.needsInit) {
        // First load - set tab session
        sessionManager.setTabSession(currentUserRole, user.uid, instIdForSession);
      } else if (!validation.valid) {
        // Session conflict detected
        sessionManager.handleSessionConflict(validation, navigate, toast);
        return;
      }
      
      loadDashboardData();
      loadPartnerData();
      
      // Safety timeout: Force loading to false after 10 seconds if stuck
      const timeout = setTimeout(() => {
        setLoading(false);
        console.warn('Loading timeout reached - forcing UI to show');
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [userProfile, institutionId, effectivePartnerId, user, navigate, searchParams, currentUserRole]);

  useEffect(() => {
    if (activeTab === 'assignments' && pendingAssignmentFromCaregiver) {
      // Small delay to ensure the assignments tab is fully rendered
      const timer = setTimeout(() => {
        setSelectedAssignmentForEdit(pendingAssignmentFromCaregiver);
        setShowEditAssignmentModal(true);
        setPendingAssignmentFromCaregiver(null);
      }, 200); // Increased delay to ensure tab is rendered
      return () => clearTimeout(timer);
    }
  }, [activeTab, pendingAssignmentFromCaregiver]);

  // Load billing plans when tab is active
  useEffect(() => {
    if (activeTab === 'billing-plans') {
      loadBillingPlans();
    }
  }, [activeTab, effectivePartnerId]);

  // Load payment gateway config when tab is active
  useEffect(() => {
    if (activeTab === 'payment-gateway') {
      loadPaymentGatewayConfig();
    }
  }, [activeTab, effectivePartnerId]);

  useEffect(() => {
    if (activeTab !== 'messages') return;

    if (isMobileMessagingView) {
      setShowMobileChatPane(false);
    } else {
      setShowMobileChatPane(true);
    }
  }, [activeTab, isMobileMessagingView]);

  useEffect(() => {
    if (!isMobileMessagingView) {
      setShowMobileChatPane(true);
    } else if (!selectedConversation) {
      setShowMobileChatPane(false);
    }
  }, [isMobileMessagingView, selectedConversation]);

  // Load institution data
  const loadPartnerData = async () => {
    try {
      // Use effectivePartnerId which includes URL parameter
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      if (instId) {
        const data = await institutionAPI.getPartner(instId);
        setLocalPartnerData(data);
      }
    } catch (error) {
      console.error('Error loading institution data:', error);
    }
  };
  
  // Handle institution link update
  const handlePartnerLinksUpdate = async (updates) => {
    try {
      // Use effectivePartnerId which includes URL parameter
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      await institutionAPI.updatePartnerLinks(instId, updates);
      await loadPartnerData(); // Reload institution data
      toast.success('Partner links updated successfully!');
    } catch (error) {
      console.error('Error updating partner links:', error);
      toast.error('Failed to update partner links');
    }
  };

  const handleDatabaseCleanup = async () => {
    if (!confirm('Are you sure you want to clean up the database? This will:\n1. Delete inactive caregivers\n2. Clear wage management data\n3. Clear admin roles (except admin@bulah.com)\n\nThis action cannot be undone.')) {
      return;
    }

    try {
      toast.info('Starting database cleanup...');

      // 1. Clear inactive caregivers
      // Query all caregivers then filter client-side to avoid composite index requirement
      const caregiversQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'caregiver')
      );
      const caregiversSnapshot = await getDocs(caregiversQuery);
      let deletedCaregivers = 0;

      const inactiveCaregivers = caregiversSnapshot.docs.filter(
        (doc) => doc.data().status !== 'active'
      );

      for (const doc of inactiveCaregivers) {
        const data = doc.data();
        if (data.email !== 'admin@bulah.com') {
          await deleteDoc(doc.ref);
          deletedCaregivers++;
        }
      }

      // 2. Clear wage management
      const wagesSnapshot = await getDocs(collection(db, 'wages'));
      let deletedWages = 0;

      for (const doc of wagesSnapshot.docs) {
        await deleteDoc(doc.ref);
        deletedWages++;
      }

      // 3. Clear admin roles (except admin@bulah.com)
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminsSnapshot = await getDocs(adminsQuery);
      let clearedAdmins = 0;

      for (const doc of adminsSnapshot.docs) {
        const data = doc.data();
        if (data.email !== 'admin@bulah.com') {
          await updateDoc(doc.ref, { role: 'caregiver', userType: 'caregiver' });
          clearedAdmins++;
        }
      }

      toast.success(`Database cleanup complete!\n- Deleted ${deletedCaregivers} inactive caregivers\n- Cleared ${deletedWages} wage records\n- Cleared ${clearedAdmins} admin roles`);
    } catch (error) {
      console.error('Error during database cleanup:', error);
      toast.error('Failed to cleanup database: ' + error.message);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Use effectivePartnerId which includes URL parameter
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      
      console.log('📊 Loading institution dashboard for:', instId);
      
      // Show loading state
      setLoading(true);
      
      // Load all data in parallel but optimized for speed
      // Skip institution-specific calls when admin has no institution assigned
      const hasInstitution = !!instId;
      const [caregiversData, clientsData, assignmentsDataRaw, users, diagnosticsData, appointmentsData] = await Promise.all([
        caregiverAPI.getCaregivers({ institutionId: instId || undefined, limit: 50 }).catch(() => []),
        getAllClients(instId || null).catch(() => []),
        instId ? assignmentAPI.getAssignmentsByInstitution(instId).catch(err => { console.warn('Assignment by institution failed:', err); return []; }) : assignmentAPI.getAllAssignments().catch(err => { console.warn('Assignment all failed:', err); return []; }),
        getAllUsers().catch(() => []),
        hasInstitution ? getAllDiagnostics(instId).catch(() => []) : getAllDiagnostics(null).catch(() => []),
        getAllAppointments(instId || null).catch(() => [])
      ]);

      // Fallback: if institution-filtered assignments returned empty but we have an instId,
      // try fetching all and filtering client-side (handles institutionId mismatches)
      let assignmentsData = assignmentsDataRaw;
      if (instId && (!assignmentsData || assignmentsData.length === 0)) {
        console.log('📋 Institution-filtered assignments empty, trying fallback to all assignments...');
        try {
          const allAssignments = await assignmentAPI.getAllAssignments();
          assignmentsData = allAssignments.filter(a => a.institutionId === instId || !a.institutionId);
          console.log('📋 Fallback assignments loaded:', assignmentsData.length);
        } catch (fallbackErr) {
          console.warn('Fallback assignment fetch also failed:', fallbackErr);
        }
      }
      console.log('📋 Final assignments count:', assignmentsData?.length || 0, 'for institution:', instId);

      // Load non-critical data in background (don't block UI)
      const loadBackgroundData = async () => {
        if (!hasInstitution) return; // Skip when admin has no institution
        try {
          const [analytics, emergencies] = await Promise.all([
            analyticsAPI.getOverviewAnalytics().catch(() => ({})),
            emergencyAPI.getEmergencyHistory({ status: 'active', limit: 10 }).catch(() => [])
          ]);
          
          setSystemAlerts(emergencies.slice(0, 5).map(e => ({
            id: e.id,
            type: 'emergency',
            message: `${e.emergencyType}: ${e.clientName || 'Unknown'}`,
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
      const institutionCaregivers = (instId ? caregiversData.filter(c => c.institutionId === instId) : caregiversData).map(caregiver => {
        // Parse onboarding data from notes JSON
        let onboardingData = {};
        try {
          if (caregiver.notes && typeof caregiver.notes === 'string' && caregiver.notes.trim().startsWith('{')) {
            onboardingData = JSON.parse(caregiver.notes);
          }
        } catch (e) { /* ignore */ }
        
        return {
          ...caregiver,
          ...onboardingData, // Spread all onboarding fields so modal can access them
          address: caregiver.address || onboardingData.address || '',
          medicalQualification: caregiver.qualifications || onboardingData.medicalQualification || '',
          yearsOfExperience: caregiver.yearsOfExperience || onboardingData.yearsOfExperience || '',
          specializations: caregiver.specializations || (caregiver.specialization ? [caregiver.specialization] : []) || onboardingData.specializations || [],
          licenseNumber: caregiver.licenseNumber || onboardingData.licenseNumber || '',
          bio: caregiver.bio || onboardingData.bio || '',
          documentUrls: caregiver.documentUrls || onboardingData.documentUrls || {},
          onboardingComplete: caregiver.onboardingComplete || onboardingData.onboardingComplete || false,
          onboardingStarted: caregiver.onboardingStarted || onboardingData.onboardingStep > 1 || false,
          workingHoursStart: caregiver.workingHoursStart || caregiver.startTime || null,
          workingHoursEnd: caregiver.workingHoursEnd || caregiver.endTime || null,
          paymentType: caregiver.paymentType || (caregiver.rateType === 'per_month' ? 'monthly' : caregiver.rateType === 'per_hour' ? 'hourly' : caregiver.paymentType),
          currency: caregiver.currency || 'USD'
        };
      });
      // Filter out archived clients from main clients list (they appear in Archived Clients tab)
      const institutionClients = (instId ? clientsData.filter(p => p.institutionId === instId) : clientsData)
        .filter(p => p.status !== 'archived');

      // Helper functions for user filtering (used by both filters and counts)
      // Check both 'active' and 'isActive' fields, and allow undefined/null (defaults to active)
      const isUserActive = (u) => {
        if (u.status === 'deleted') return false;
        if (u.active === false) return false;
        if (u.isActive === false) return false;
        return true; // Default to active if not explicitly set to false
      };
      
      // Helper to check if user has a specific role (checks userType, type, and roles array)
      const hasRole = (u, role) => {
        if (u.userType === role || u.type === role) return true;
        if (Array.isArray(u.roles) && u.roles.includes(role)) return true;
        return false;
      };

      // Merge caregivers from users collection (for those created via Add Caregiver button, exclude deleted)
      const caregiversFromUsers = institutionUsers.filter(u => 
        (hasRole(u, 'caregiver') || hasRole(u, 'nurse') || hasRole(u, 'doctor')) &&
        isUserActive(u)
      );
      
      // Filter pharmacists from users collection (exclude deleted)
      // Use the same logic as pharmacistsCount to ensure consistency
      
      // Debug: Log all potential pharmacists before filtering
      const potentialPharmacists = institutionUsers.filter(u => 
        u.userType === 'pharmacist' || u.type === 'pharmacist' || (Array.isArray(u.roles) && u.roles.includes('pharmacist'))
      );
      console.log('🔍 Potential pharmacists found:', potentialPharmacists.length, potentialPharmacists.map(p => ({
        id: p.id || p.uid,
        email: p.email,
        name: p.name || p.displayName,
        userType: p.userType,
        type: p.type,
        roles: p.roles,
        status: p.status,
        active: p.active,
        isActive: p.isActive,
        institutionId: p.institutionId,
        hasRole: hasRole(p, 'pharmacist'),
        isActiveCheck: isUserActive(p)
      })));
      
      const pharmacistsFromUsers = institutionUsers.filter(u => {
        const hasPharmacistRole = hasRole(u, 'pharmacist');
        const isActive = isUserActive(u);
        const result = hasPharmacistRole && isActive;
        
        // Log filtering decision for potential pharmacists
        if (u.userType === 'pharmacist' || u.type === 'pharmacist' || (Array.isArray(u.roles) && u.roles.includes('pharmacist'))) {
          console.log(`🔍 Pharmacist filter check for ${u.email}:`, {
            hasPharmacistRole,
            isActive,
            result,
            userType: u.userType,
            type: u.type,
            roles: u.roles,
            status: u.status,
            active: u.active,
            isActive: u.isActive
          });
        }
        
        return result;
      });
      
      console.log('✅ Pharmacists after filtering:', pharmacistsFromUsers.length, pharmacistsFromUsers.map(p => ({
        id: p.id || p.uid,
        email: p.email,
        name: p.name || p.displayName
      })));
      
      // Deduplicate caregivers
      const allPartnerCaregivers = [...institutionCaregivers];
      caregiversFromUsers.forEach(userCaregiver => {
        if (!allPartnerCaregivers.find(c => c.id === userCaregiver.id || c.id === userCaregiver.uid)) {
          allPartnerCaregivers.push({
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
            address: userCaregiver.address || '',
            bio: userCaregiver.bio || '',
            medicalQualification: userCaregiver.medicalQualification || userCaregiver.qualifications || '',
            yearsOfExperience: userCaregiver.yearsOfExperience || '',
            specializations: userCaregiver.specializations || (userCaregiver.specialization ? [userCaregiver.specialization] : []),
            licenseNumber: userCaregiver.licenseNumber || '',
            documentUrls: userCaregiver.documentUrls || {},
            onboardingComplete: userCaregiver.onboardingComplete,
            onboardingStarted: userCaregiver.onboardingStarted || false,
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
      const allPartnerPharmacists = pharmacistsFromUsers.map(p => ({
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
      
      console.log('💊 Final pharmacists list to set:', allPartnerPharmacists.length, allPartnerPharmacists);
      
      // Update state with pharmacists
      setPharmacists(allPartnerPharmacists);
      
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

      // Filter active appointments (today and upcoming)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeAppointmentsCount = appointmentsData.filter(apt => {
        if (!apt.appointmentDate) return false;
        const aptDate = apt.appointmentDate?.toDate ? apt.appointmentDate.toDate() : new Date(apt.appointmentDate);
        return aptDate >= today && (apt.status === 'scheduled' || apt.status === 'confirmed' || !apt.status);
      }).length;

      // Count users by role directly from users collection (includes all users regardless of onboarding status)
      // This ensures stats update as users are onboarded
      // Note: isUserActive and hasRole helpers are defined earlier in this function
      const doctorsCount = institutionUsers.filter(u => 
        hasRole(u, 'doctor') && isUserActive(u)
      ).length;
      
      const nursesCount = institutionUsers.filter(u => 
        hasRole(u, 'nurse') && isUserActive(u)
      ).length;
      
      // Caregivers: count only those who are NOT doctors, nurses, or pharmacists
      // (to avoid double counting)
      const caregiversCount = institutionUsers.filter(u => 
        hasRole(u, 'caregiver') && 
        !hasRole(u, 'doctor') && 
        !hasRole(u, 'nurse') && 
        !hasRole(u, 'pharmacist') && 
        isUserActive(u)
      ).length;
      
      const pharmacistsCount = institutionUsers.filter(u => 
        hasRole(u, 'pharmacist') && isUserActive(u)
      ).length;
      
      // Debug logging to help identify issues
      console.log('📊 Role counts calculation:', {
        totalPartnerUsers: institutionUsers.length,
        nurses: nursesCount,
        doctors: doctorsCount,
        caregivers: caregiversCount,
        pharmacists: pharmacistsCount,
        allNurses: institutionUsers.filter(u => hasRole(u, 'nurse')).map(u => ({
          id: u.id,
          email: u.email,
          userType: u.userType,
          type: u.type,
          roles: u.roles,
          status: u.status,
          active: u.active,
          isActive: u.isActive,
          institutionId: u.institutionId
        })),
        allPharmacists: institutionUsers.filter(u => hasRole(u, 'pharmacist')).map(u => ({
          id: u.id,
          email: u.email,
          userType: u.userType,
          type: u.type,
          roles: u.roles,
          status: u.status,
          active: u.active,
          isActive: u.isActive,
          institutionId: u.institutionId,
          hasRoleCheck: hasRole(u, 'pharmacist'),
          isActiveCheck: isUserActive(u)
        }))
      });

      // Fallback: count client-type users from users collection when no institution clients available
      const clientsFromUsers = institutionClients.length === 0
        ? institutionUsers.filter(u =>
            hasRole(u, 'client') || hasRole(u, 'elderly') || u.userType === 'client' || u.type === 'client' || u.userType === 'elderly' || u.type === 'elderly'
          ).length
        : 0;
      const clientsCount = institutionClients.length || clientsFromUsers;

      // Build stats object
      const realStats = {
        totalUsers: institutionUsers.length,
        clients: clientsCount,
        caregivers: caregiversCount,
        doctors: doctorsCount,
        nurses: nursesCount,
        pharmacists: pharmacistsCount,
        activeAppointments: activeAppointmentsCount,
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
      setCaregivers(allPartnerCaregivers);
      setAssignments(assignmentsData);
      setTopCaregivers(allPartnerCaregivers.slice(0, 3).map(caregiver => ({
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
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
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
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      if (!instId) {
        toast.error('Partner ID not found');
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
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
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
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      if (!instId) {
        toast.error('Partner ID not found');
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

  const handlePaymentGatewayFormChange = (field, value) => {
    setPaymentGatewayForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    try {
      sessionManager.clearTabSession();
      await authManager.signOutFromRole('admin');
      navigate('/login?institution=' + institutionId);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Client Management Functions
  const handleAddClient = async (clientData) => {
    try {
      // Use effectivePartnerId which includes URL parameter
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      
      // Validate institutionId before proceeding
      if (!instId) {
        toast.error('Partner ID is required. Please ensure you are logged in with an institution account.', {
          autoClose: 6000
        });
        return;
      }

      const newClient = {
        ...clientData,
        institutionId: instId,
        status: 'active'
      };

      let result;
      try {
        result = await createClient(newClient, userProfile);
        console.log('✅ Client created with ID:', result);
      } catch (createError) {
        // Provide specific error messages based on error type
        let errorMessage = 'Failed to create client. Please try again.';
        
        if (createError.code === 'permission-denied' || createError.code === 'PERMISSION_DENIED') {
          errorMessage = 'Permission denied. Please ensure you have admin access to create clients. If the problem persists, try logging out and back in.';
        } else if (createError.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable. Please check your internet connection and try again.';
        } else if (createError.code === 'deadline-exceeded') {
          errorMessage = 'Request timeout. Please try again.';
        } else if (createError.message) {
          errorMessage = createError.message;
        }
        
        toast.error(errorMessage, { 
          autoClose: 8000,
          position: 'top-center'
        });
        console.error('Client creation error:', createError);
        return;
      }
      
      setShowCreatePatientModal(false);
      toast.success('Client added successfully', { 
        autoClose: 5000,
        position: 'top-center'
      });
      
      // Reload dashboard data to get the newly created client
      try {
        await loadDashboardData();
      } catch (reloadError) {
        console.warn('Error reloading dashboard data:', reloadError);
        // Don't show error to user - client was created successfully
      }
    } catch (error) {
      console.error('Unexpected error adding client:', error);
      toast.error(error.message || 'An unexpected error occurred. Please try again.', {
        autoClose: 8000,
        position: 'top-center'
      });
    }
  };

  // Caregiver Management Functions
  const handleAddCaregiver = async (caregiverData) => {
    try {
      const instId = userProfile?.institutionId || effectivePartnerId || institutionId;
      if (!instId) {
        if (userLoading) {
          toast.info('Loading your profile... Please wait a moment and try again.');
          return;
        }
        toast.error('Partner ID is required. Please ensure you are logged in and assigned to an institution.');
        return;
      }

      const { name, email, password, phone } = caregiverData;
      if (!name || !email || !password) {
        toast.error('Name, email, and password are required to add a caregiver.');
        return;
      }

      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
        return;
      }

      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        return;
      }

      // Create Backend Auth user via REST API (does NOT sign out current admin)
      const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
      const backendApiKey = process.env.REACT_APP_BACKEND_API_KEY || '';
      const authResponse = await fetch(`${AUTH_BASE_URL}:signUp?key=${backendApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const authData = await authResponse.json();

      if (!authResponse.ok || authData.error) {
        const msg = authData.error?.message || 'Backend auth creation failed';
        if (msg.includes('EMAIL_EXISTS')) {
          toast.error('Email already exists in Backend Auth. Please use a different email.');
          return;
        }
        throw new Error(msg);
      }

      const caregiverId = authData.localId;
      if (!caregiverId) {
        toast.error('Failed to create caregiver account - no user ID returned.');
        return;
      }

      const additionalFields = {
        // Identity fields
        email,
        name,
        displayName: name,
        phone: phone || '',
        
        // REQUIRED: Role fields (all three formats for compatibility)
        userType: 'caregiver',
        type: 'caregiver',
        role: 'caregiver',
        roles: ['caregiver'], // Array format required for filtering
        
        // REQUIRED: Active status fields
        status: 'pending',     // Can be 'pending', 'active', but NOT 'deleted'
        isActive: true,         // Must not be false
        active: true,            // Must not be false
        
        // REQUIRED: Partner field
        institutionId: instId,
        
        // Account settings
        onboardingComplete: false,
        profileComplete: false,
        accountType: 'institution_created',
        
        // Payment fields
        paymentType: 'hourly',
        hourlyRate: 0,
        monthlyRate: 0,
        rateType: 'per_hour',
        currency: 'USD',
        
        // Timestamps
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'admin'
      };

      await updateDoc(doc(db, 'users', caregiverId), additionalFields);
      await setDoc(doc(db, 'caregivers', caregiverId), additionalFields, { merge: true });

      setShowAddCaregiver(false);
      toast.success(`Caregiver ${name} added successfully. Invite them to finish their profile.`);

      await loadDashboardData();

      await trackAdminEvent('caregiver_created', {
        caregiverId,
        institutionId: instId,
        createdBy: user?.uid || null,
        caregiverEmail: email,
        caregiverName: name,
        rateType: 'per_hour',
        paymentType: 'hourly',
        hourlyRate: 0,
        monthlyRate: 0,
        currency: 'USD'
      });
    } catch (error) {
      console.error('Error adding caregiver:', error);
      toast.error(error.message || 'Failed to add caregiver. Please try again.');
      throw error;
    }
  };

  // Pharmacist Management Functions
  const handleAssignPharmacistToClient = async (clientId, pharmacistId) => {
    try {
      // Use effectivePartnerId which includes URL parameter
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      
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
        clientName: client?.name || client?.displayName ||
          (client?.firstName && client?.lastName ? `${client.firstName} ${client.lastName}` : client?.firstName || client?.lastName) ||
          client?.fullName || 'Unknown Client',
        caregiverName: pharmacist?.name || pharmacist?.displayName ||
          (pharmacist?.firstName && pharmacist?.lastName ? `${pharmacist.firstName} ${pharmacist.lastName}` : pharmacist?.firstName || pharmacist?.lastName) ||
          pharmacist?.fullName || 'Unknown Pharmacist',
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
      console.log('🔍 Admin - Partner ID:', instId);
      
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

      // Update user document in Database
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
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      
      if (!instId) {
        console.error('❌ No institution ID available');
        toast.error('Partner ID is required. Please ensure you are logged in as an admin.');
        return;
      }
      
      console.log('🏥 Using institution ID:', instId);
      
      // Validate required fields
      if (!pharmacistData.email || !pharmacistData.password || !pharmacistData.name) {
        toast.error('Email, password, and name are required fields.');
        return;
      }

      if (pharmacistData.password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
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
      
      console.log('✅ Email is unique, creating pharmacist via Backend Auth REST API...');

      // Create Backend Auth user via REST API (does NOT sign out current admin)
      const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
      const backendApiKey = process.env.REACT_APP_BACKEND_API_KEY || '';
      const authResponse = await fetch(`${AUTH_BASE_URL}:signUp?key=${backendApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pharmacistData.email, password: pharmacistData.password, returnSecureToken: true })
      });
      const authData = await authResponse.json();

      if (!authResponse.ok || authData.error) {
        const msg = authData.error?.message || 'Backend auth creation failed';
        if (msg.includes('EMAIL_EXISTS')) {
          toast.error('Email already exists. Please use a different email.');
          return;
        }
        throw new Error(msg);
      }

      const pharmacistId = authData.localId;
      if (!pharmacistId) {
        toast.error('Failed to create pharmacist - no user ID returned.');
        return;
      }

      // Create Database profile
      const nameParts = pharmacistData.name.trim().split(' ');
      const firstName = nameParts[0] || pharmacistData.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      const pharmacistProfile = {
        uid: pharmacistId,
        email: pharmacistData.email,
        name: pharmacistData.name,
        displayName: pharmacistData.name,
        firstName,
        lastName,
        phone: pharmacistData.phone || '',

        userType: 'pharmacist',
        type: 'pharmacist',
        role: 'pharmacist',
        roles: ['pharmacist'],
        medicalQualification: 'Pharmacist',
        specialization: pharmacistData.specialization || 'General Pharmacy',
        licenseNumber: pharmacistData.licenseNumber || '',

        institutionId: instId,
        status: 'pending',
        isActive: true,
        active: true,

        onboardingComplete: false,
        profileComplete: false,
        accountType: 'institution_created',

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'admin'
      };

      await setDoc(doc(db, 'users', pharmacistId), pharmacistProfile);
      await setDoc(doc(db, 'pharmacists', pharmacistId), pharmacistProfile, { merge: true });

      console.log('✅ Pharmacist created:', pharmacistId);

      setShowAddPharmacist(false);
      toast.success(`✅ Pharmacist ${pharmacistData.name} added successfully! They can now login with their credentials.`);

      // Reload dashboard data to show new pharmacist
      await loadDashboardData();
      
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
      
      // Delete from Database
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
      
      // Use Backend Auth UID (userId/uid) if available, otherwise fall back to id
      // This ensures tasks are queryable by the caregiver using their user.uid
      const caregiverUserId = caregiver?.uid || caregiver?.userId || caregiver?.id || selectedCaregiverForAssignment;

      // Derive the caregiver's role for filtering
      const caregiverRole = caregiver?.role || caregiver?.userType || caregiver?.type || 'caregiver';
      const medicalQualification = (caregiver?.medicalQualification || '').toLowerCase();
      const assignedToRole = medicalQualification.includes('doctor') ? 'doctor' :
                              medicalQualification.includes('nurse') ? 'nurse' :
                              medicalQualification.includes('pharmacist') ? 'pharmacist' :
                              caregiverRole;

      console.log('🔍 Creating assignment:', {
        caregiverId: selectedCaregiverForAssignment,
        caregiverUserId,
        caregiverUid: caregiver?.uid,
        caregiverUserIdField: caregiver?.userId,
        caregiverIdField: caregiver?.id,
        assignedToRole
      });

      const assignmentData = {
        clientId: selectedClientForAssignment,
        caregiverId: caregiverUserId, // Use Backend Auth UID for querying
        clientName: client?.name || client?.displayName ||
          (client?.firstName && client?.lastName ? `${client.firstName} ${client.lastName}` : client?.firstName || client?.lastName) ||
          client?.fullName || 'Unknown Client',
        caregiverName: caregiver?.name || caregiver?.displayName ||
          (caregiver?.firstName && caregiver?.lastName ? `${caregiver.firstName} ${caregiver.lastName}` : caregiver?.firstName || caregiver?.lastName) ||
          caregiver?.fullName || 'Unknown Caregiver',
        clientEmail: client?.email || '',
        caregiverEmail: caregiver?.email || '',
        institutionId: institutionId || userProfile?.institutionId,
        assignedBy: userProfile?.id || user?.uid,
        assignedByName: userProfile?.name || 'Admin',
        assignmentType: assignmentType,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        assignedToRole: assignedToRole,
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
        const { Timestamp } = await import('../services/databaseCompat');
        
        // Parse dueDate and dueTime to create scheduledTime (fix timezone issues)
        let scheduledTime = new Date();
        if (formData.dueDate) {
          // Parse date string and create in local timezone to avoid date shifts
          const dateParts = formData.dueDate.split('-');
          if (dateParts.length === 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
            const day = parseInt(dateParts[2]);
            
            // Create date in local timezone
            scheduledTime = new Date(year, month, day);
            
            if (formData.dueTime) {
              const [hours, minutes] = formData.dueTime.split(':');
              scheduledTime.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
            } else {
              scheduledTime.setHours(9, 0, 0, 0); // Default to 9 AM
            }
          } else {
            // Fallback to original method if date format is different
            scheduledTime = new Date(formData.dueDate);
            if (formData.dueTime) {
              const [hours, minutes] = formData.dueTime.split(':');
              scheduledTime.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
            } else {
              scheduledTime.setHours(9, 0, 0, 0);
            }
          }
        }
        
        await createCareTask({
          caregiverId: caregiverUserId, // Use Backend Auth UID
          clientId: selectedClientForAssignment,
          clientName: assignmentData.clientName,
          title: formData.title,
          description: formData.description || formData.instructions,
          type: 'care',
          priority: formData.priority || 'normal',
          status: 'pending',
          scheduledTime: Timestamp.fromDate(scheduledTime),
          instructions: formData.instructions,
          assignedToRole: assignedToRole,
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
            userId: caregiverUserId, // Use Backend Auth UID for notifications
            type: NOTIFICATION_TYPES.TASK,
            priority: formData.priority === 'urgent' ? NOTIFICATION_PRIORITIES.URGENT : 
                     formData.priority === 'high' ? NOTIFICATION_PRIORITIES.HIGH : 
                     NOTIFICATION_PRIORITIES.MEDIUM,
            title: 'New Task Assigned',
            message: `You have been assigned a new task: "${formData.title}" for client ${assignmentData.clientName}`,
            data: {
              assignmentId: createdAssignment.id,
              clientId: selectedClientForAssignment,
              clientName: assignmentData.clientName,
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
        institutionId: effectivePartnerId || institutionId || userProfile?.institutionId,
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
    if (!assignment) return;

    setShowAssignmentDetails(false);
    setSelectedAssignmentForEdit(assignment);
    setEditAssignmentForm({
      title: assignment.title || '',
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      priority: assignment.priority || 'normal',
      dueDate: formatDateForInput(assignment.dueDate || assignment.dueAt),
      dueTime: assignment.dueTime || '',
      status: assignment.status || 'pending'
    });
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

    const assignmentId = selectedAssignmentForEdit.id || selectedAssignmentForEdit.assignmentId;
    if (!assignmentId) {
      toast.error('Unable to determine assignment ID');
      return;
    }

    try {
      await assignmentAPI.updateAssignment(assignmentId, {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        dueTime: formData.dueTime || '',
        status: formData.status || selectedAssignmentForEdit.status
      });

      toast.success('Assignment updated successfully');
      setShowEditAssignmentModal(false);
      setSelectedAssignmentForEdit(null);
      setEditAssignmentForm({
        title: '',
        description: '',
        instructions: '',
        priority: 'normal',
        dueDate: '',
        dueTime: '',
        status: 'pending'
      });
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
      // Client-side cannot change another user's password without Admin SDK.
      // Send a branded password reset email via Resend/SendGrid callable.
      const emailService = (await import('../services/emailService')).default;
      await emailService.generateAndSendPasswordReset({ email: caregiverForPasswordReset.email });

      toast.success(`Password reset email sent to ${caregiverForPasswordReset.name || 'caregiver'} at ${caregiverForPasswordReset.email}`);
      setShowCaregiverPasswordModal(false);
      setCaregiverForPasswordReset(null);
      setCaregiverPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to send password reset:', error);
      const message = error?.message || 'Failed to send password reset email';
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
      
      toast.success('Caregiver deleted successfully', { autoClose: 3000 });
      
      // Reload dashboard data in background to ensure consistency
      setTimeout(() => {
        loadDashboardData();
      }, 500);
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      toast.error('Failed to delete caregiver', { autoClose: 3000 });
    }
  };

  const handleApproveCaregiver = async (caregiver) => {
    if (!window.confirm(`Approve ${caregiver.name} as a caregiver? They will gain access to the dashboard.`)) {
      return;
    }
    try {
      const { doc, updateDoc, getDoc, serverTimestamp } = await import('../services/databaseCompat');
      const { db } = await import('../backend/config');
      
      const caregiverId = caregiver.id || caregiver.uid || caregiver.userId;
      
      // Update BOTH collections to keep them in sync
      // 1. Update users collection (for User Management tab)
      try {
        const userRef = doc(db, 'users', caregiverId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          await updateDoc(userRef, { 
        status: 'active',
            active: true,
            approvedAt: serverTimestamp(),
            approvedBy: user?.uid || userProfile?.id,
            updatedAt: serverTimestamp()
          });
          console.log('✅ Updated users collection for approval');
        }
      } catch (userError) {
        console.warn('⚠️ Could not update users collection:', userError);
      }
      
      // 2. Update caregivers collection (for Caregivers tab)
      try {
        const caregiverRef = doc(db, 'caregivers', caregiverId);
        const caregiverDoc = await getDoc(caregiverRef);
        if (caregiverDoc.exists()) {
          await updateDoc(caregiverRef, { 
        status: 'active',
            active: true,
            approvedAt: serverTimestamp(),
            approvedBy: user?.uid || userProfile?.id,
            updatedAt: serverTimestamp()
      });
          console.log('✅ Updated caregivers collection for approval');
        }
      } catch (caregiverError) {
        console.warn('⚠️ Could not update caregivers collection:', caregiverError);
      }
      
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
      const instId = diagnostic.institutionId || effectivePartnerId || institutionId || userProfile?.institutionId;
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
      const instId = diagnostic.institutionId || effectivePartnerId || institutionId || userProfile?.institutionId;
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
    if (!window.confirm('Are you sure you want to archive this client? You can restore them later from the Archived Clients section.')) {
      return;
    }
    try {
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      const archivedBy = user?.uid || userProfile?.id || 'admin';
      await updateClient(clientId, { 
        status: 'archived',
        archivedAt: new Date().toISOString(),
        archivedBy
      });
      toast.success('Client archived successfully');
      await trackAdminEvent('client_archived', {
        clientId,
        institutionId: instId,
        archivedBy
      });
      await loadDashboardData();
      setShowClientDetails(false);
    } catch (error) {
      console.error('Error archiving client:', error);
      toast.error('Failed to archive client');
    }
  };

  const handleUnarchiveClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to restore this client? They will be moved back to the active clients list.')) {
      return;
    }
    try {
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
      await updateClient(clientId, { 
        status: 'active',
        archivedAt: null,
        archivedBy: null
      });
      toast.success('Client restored successfully');
      await trackAdminEvent('client_restored', {
        clientId,
        institutionId: instId,
        restoredBy: user?.uid || userProfile?.id || 'admin'
      });
      await loadDashboardData();
      setShowClientDetails(false);
    } catch (error) {
      console.error('Error restoring client:', error);
      toast.error('Failed to restore client');
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
      const instId = effectivePartnerId || institutionId || userProfile?.institutionId;
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

  // Helper function to get unread message count for a conversation
  // Optimized: Uses direct query instead of loading all messages
  const getUnreadCountForConversation = useCallback(async (conversationId, currentUserId) => {
    if (!conversationId || !currentUserId) return 0;
    
    try {
      // Query directly for unread messages where current user is not the sender
      // This is more efficient than loading all messages and filtering
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        where('senderId', '!=', currentUserId),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      // Fallback to the previous method if query fails (e.g., missing index)
      console.warn('Optimized query failed, falling back to message loading:', error);
      try {
        const messages = await getMessagesByConversation(conversationId);
        const unreadCount = messages.filter(msg => 
          msg.senderId !== currentUserId && !msg.read
        ).length;
        return unreadCount;
      } catch (fallbackError) {
        console.error('Error getting unread count for conversation:', conversationId, fallbackError);
        return 0;
      }
    }
  }, []);

  // Messaging Functions
  const loadConversations = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const userConversations = await getConversationsByUser(user.uid);
      console.log(`💬 Loaded ${userConversations.length} conversations`);
      
      // Enrich conversations with participant details and unread counts
      const enrichedConversations = await Promise.all(
        userConversations.map(async (conv) => {
          // Early return check for invalid conversation
          if (!conv || !conv.participants || conv.participants.length === 0) {
            return {
              ...conv,
              name: 'Unknown User',
              unread: 0,
              missedCalls: 0,
              conversationId: conv?.id || 'unknown',
              lastMessage: 'No messages yet',
              timestamp: conv?.createdAt || new Date().toISOString()
            };
          }
          
          // Find the other participant (not the current user)
          const otherParticipantId = conv.participants.find(p => p && p !== user.uid);
          
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
          
          // Get unread message count for this conversation using helper function
          const unreadCount = await getUnreadCountForConversation(conv.id, user.uid);
          
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
  }, [user?.uid, caregivers, pharmacists, getUnreadCountForConversation]);

  const loadMessagesForConversation = async (conversationId) => {
    try {
      const conversationMessages = await getMessagesByConversation(conversationId);
      console.log(`💬 Loaded ${conversationMessages.length} messages`);
      
      // Mark conversation as read when opening it
      if (user?.uid && conversationId) {
        try {
          await markConversationAsRead(conversationId, user.uid);
          console.log('✅ Marked conversation as read');
          // Refresh conversations to update unread counts
          loadConversations();
        } catch (markReadError) {
          console.warn('Could not mark conversation as read:', markReadError);
        }
      }
      
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
      const unsubscribe = subscribeToUserConversations(user.uid, async (updatedConversations) => {
        // Early return if no conversations
        if (!updatedConversations || updatedConversations.length === 0) {
          setConversations([]);
          return;
        }
        
        console.log(`🔄 Real-time update: ${updatedConversations.length} conversations`);
        
        // Enrich conversations with participant details and calculate unread counts
        // Using Promise.all for parallel processing - already optimized
        const enrichedConversations = await Promise.all(
          updatedConversations.map(async (conv) => {
            // Early return check for invalid conversation
            if (!conv || !conv.participants || conv.participants.length === 0) {
              return {
                ...conv,
                name: 'Unknown User',
                type: 'user',
                unread: 0,
                conversationId: conv?.id || 'unknown',
                lastMessage: 'No messages yet',
                timestamp: conv?.createdAt || new Date().toISOString()
              };
            }
            
            const otherParticipantId = conv.participants.find(p => p && p !== user.uid);
            
            // If no other participant found, return early
            if (!otherParticipantId) {
              return {
                ...conv,
                name: 'Unknown User',
                type: 'user',
                unread: 0,
                conversationId: conv.id,
                lastMessage: conv.lastMessage || 'No messages yet',
                timestamp: conv.lastMessageTime || conv.createdAt
              };
            }
            
            let participantName = 'Unknown User';
            let participantType = 'user';
            
            // Try to find participant in caregivers first
            const caregiver = caregivers.find(c => c && (c.id === otherParticipantId || c.userId === otherParticipantId));
            if (caregiver) {
              participantName = caregiver.name || caregiver.fullName || 'Unknown User';
              participantType = caregiver.role || caregiver.type || caregiver.userType || 'caregiver';
            } else {
              // Try pharmacists if not found in caregivers
              const pharmacist = pharmacists.find(p => p && (p.id === otherParticipantId || p.userId === otherParticipantId));
              if (pharmacist) {
                participantName = pharmacist.name || pharmacist.fullName || 'Unknown User';
                participantType = 'pharmacist';
              }
            }
            
            // Calculate unread count for this conversation (optimized query)
            const unreadCount = await getUnreadCountForConversation(conv.id, user.uid);
            
            return {
              ...conv,
              name: participantName,
              type: participantType,
              unread: unreadCount,
              conversationId: conv.id,
              lastMessage: conv.lastMessage || 'No messages yet',
              timestamp: conv.lastMessageTime || conv.createdAt
            };
          })
        );
        
        setConversations(enrichedConversations);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [activeTab, user?.uid, caregivers, pharmacists, loadConversations, getUnreadCountForConversation]);

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
      
      if (!result || !result.callId) {
        const errorMsg = result?.error || 'Failed to initiate call';
        toast.error(errorMsg);
        console.error('❌ Call initiation failed:', result);
        return;
      }
      
      console.log('🔧 Initializing WebRTC for admin...');
      
      // Initialize WebRTC if not already initialized
      if (!webrtc && result.callId) {
        try {
          const service = new WebRTCService(
            userId,
            recipientId,
            result.callId,
            result.signalingRef || result.callData?.id
          );
          
          await service.init();
          setWebrtc(service);
          
          const offer = await service.createOffer();
          console.log('📤 Created offer and sent to recipient...');
        } catch (webrtcError) {
          console.warn('⚠️ WebRTC initialization failed, but call is still active:', webrtcError);
          // Don't fail the call if WebRTC fails - the call can still work
        }
      }
      
      setActiveCall({
        callId: result.callId,
        participantId: recipientId,
        participantName: selectedConversation.name || 'User',
        callType: 'voice'
      });
      setIsInCall(true);
      toast.success(`Voice call initiated with ${selectedConversation.name || 'User'}`);
    } catch (error) {
      console.error('❌ Error starting voice call:', error);
      toast.error(error.message || 'Failed to start voice call. Please check microphone permissions.');
    }
  };

  const startVideoCall = async () => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }
    
    try {
      // Get the caller ID - try multiple sources
      const userId = user?.uid || userProfile?.uid || userProfile?.userId || userProfile?.id;
      
      // Validate caller ID first
      if (!userId) {
        toast.error('Unable to identify your user ID. Please refresh and try again.');
        console.error('❌ Missing userId:', { user, userProfile });
        return;
      }
      
      // Find recipient ID - try multiple strategies
      let recipientId = null;
      
      // Strategy 1: Find in participants array
      if (selectedConversation.participants && Array.isArray(selectedConversation.participants)) {
        recipientId = selectedConversation.participants.find(p => p && p !== userId);
        if (recipientId) {
          console.log('✅ Found recipient in participants:', recipientId);
        }
      }
      
      // Strategy 2: Use userId field if different from caller
      if (!recipientId && selectedConversation.userId && selectedConversation.userId !== userId) {
        recipientId = selectedConversation.userId;
        console.log('✅ Found recipient in userId field:', recipientId);
      }
      
      // Strategy 3: Use id field (only if it's not a conversation ID format and different from caller)
      if (!recipientId && selectedConversation.id && !selectedConversation.id.includes('_conv_') && selectedConversation.id !== userId) {
        recipientId = selectedConversation.id;
        console.log('✅ Found recipient in id field:', recipientId);
      }
      
      // Strategy 4: If conversation has a direct user reference
      if (!recipientId && selectedConversation.user && selectedConversation.user !== userId) {
        recipientId = selectedConversation.user;
        console.log('✅ Found recipient in user field:', recipientId);
      }
      
      // Validate recipient ID
      if (!recipientId) {
        toast.error('Could not identify recipient. Please check conversation data.');
        console.error('❌ Missing recipientId. Conversation data:', {
          participants: selectedConversation.participants,
          userId: selectedConversation.userId,
          id: selectedConversation.id,
          fullConversation: selectedConversation
        });
        return;
      }
      
      console.log('📹 Initiating video call:', {
        callerId: userId,
        recipientId,
        recipientName: selectedConversation.name
      });
      
      // Initiate video call
      const result = await callService.initiateCall({
        callerId: userId,
        recipientId,
        callType: 'video',
        callerName: userProfile?.name || 'Admin',
        recipientName: selectedConversation.name || 'User'
      });
      
      if (!result || !result.callId) {
        const errorMsg = result?.error || 'Failed to initiate call';
        toast.error(errorMsg);
        console.error('❌ Call initiation failed:', result);
        return;
      }
      
      // Initialize WebRTC
      if (!webrtc && result.callId) {
        try {
          const service = new WebRTCService(
            userId,
            recipientId,
            result.callId,
            result.signalingRef || result.callData?.id
          );
          
          await service.init();
          setWebrtc(service);
          
          const offer = await service.createOffer();
          console.log('📤 Created offer and sent to recipient...');
        } catch (webrtcError) {
          console.warn('⚠️ WebRTC initialization failed, but call is still active:', webrtcError);
          // Don't fail the call if WebRTC fails - the call can still work
        }
      }
      
      setActiveCall({
        callId: result.callId,
        participantId: recipientId,
        participantName: selectedConversation.name || 'User',
        callType: 'video'
      });
      setIsInCall(true);
      toast.success(`Video call initiated with ${selectedConversation.name || 'User'}`);
    } catch (error) {
      console.error('❌ Error starting video call:', error);
      toast.error(error.message || 'Failed to start video call. Please check camera and microphone permissions.');
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

  // Partner login flow: Show loading while authenticating and loading profile
  // Don't require institutionId upfront - it will come from userProfile after authentication
  if (!user || !userProfile) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Authenticating...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we verify your credentials.</p>
          </div>
        </div>
      );
    }
    // Loading finished but still no user/profile - redirect to login instead of getting stuck
    return <Navigate to="/login" replace />;
  }
  
// If non-admin user has no institutionId, show error
if (!['admin', 'institutionAdmin', 'superAdmin'].includes(currentUserRole) && !finalPartnerId && !loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Partner Not Found</h2>
        <p className="text-gray-600 mb-4">
          Your account is registered as an admin, but no institution is associated with your account.
        </p>
        <p className="text-sm text-gray-500">
          Please contact support to associate your account with an institution.
        </p>
      </div>
    </div>
  );
}

const renderMessagesTab = () => {
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      let conversationId = selectedConversation.conversationId || selectedConversation.id;

        if (!selectedConversation.conversationId && selectedConversation.participants) {
          const conversationResult = await getOrCreateConversation(selectedConversation.participants, 'admin');
          conversationId = conversationResult.id || conversationResult;
        }

        if (typeof conversationId === 'object' && conversationId?.id) {
          conversationId = conversationId.id;
        }

        await sendMessageAPI(conversationId, user.uid, {
          text: newMessage,
          type: 'text',
          senderName: userProfile?.name || 'Admin'
        });

        const optimisticMessage = {
          id: Date.now(),
          text: newMessage,
          senderId: user?.uid,
          senderName: userProfile?.name || 'You',
          createdAt: new Date().toISOString(),
          read: false
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage('');
        toast.success('Message sent successfully');
        loadConversations();
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    };

    const conversationBadge = (conversation) => {
      const type = (conversation.type || 'user').toLowerCase();
      const styles = {
        caregiver: 'bg-green-100 text-green-800',
        doctor: 'bg-blue-100 text-blue-800',
        pharmacist: 'bg-indigo-100 text-indigo-800',
        nurse: 'bg-purple-100 text-purple-800',
        admin: 'bg-red-100 text-red-800',
        client: 'bg-orange-100 text-orange-800'
      };
      return styles[type] || 'bg-gray-100 text-gray-700';
    };

    const formattedConversations = (conversations || []).map((conversation) => ({
      ...conversation,
      displayName: conversation.name || conversation.displayName || 'Unknown User',
      displayType: (conversation.type || 'user').replace(/^\w/, (c) => c.toUpperCase())
    }));

    const handleConversationSelect = (conversation) => {
      setSelectedConversation(conversation);
      if (!isMobileMessagingView) {
        setIsConversationListCollapsed(false);
      }
      if (isMobileMessagingView) {
        setShowMobileChatPane(true);
      }

      const convId = conversation.conversationId || conversation.id;
      if (convId) {
        loadMessagesForConversation(convId);
      } else {
        setMessages([]);
      }
    };

    const toggleConversationList = () => {
      if (isMobileMessagingView) {
        setShowMobileChatPane(false);
      } else {
        setIsConversationListCollapsed((prev) => !prev);
      }
    };

    const conversationListClasses = [
      'flex flex-col transition-all duration-200',
      isMobileMessagingView
        ? showMobileChatPane
          ? 'hidden lg:flex lg:w-80 lg:border-r lg:border-gray-200'
          : 'flex w-full border-r border-gray-200 lg:w-80'
        : isConversationListCollapsed
          ? 'hidden lg:flex lg:w-0 lg:min-w-0 lg:opacity-0 lg:pointer-events-none'
          : 'hidden lg:flex lg:w-80 lg:border-r lg:border-gray-200'
    ].join(' ');

    const chatPaneClasses = [
      'flex-1 flex flex-col transition-all duration-200',
      isMobileMessagingView
        ? showMobileChatPane
          ? 'flex w-full'
          : 'hidden lg:flex'
        : isConversationListCollapsed
          ? 'flex lg:pl-0'
          : 'flex'
    ].join(' ');

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-250px)]">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={conversationListClasses}>
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-500 mt-1">{formattedConversations.length} conversations</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {formattedConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                formattedConversations.map((conversation) => {
                  const displayName = conversation.displayName || 'Unknown User';
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleConversationSelect(conversation)}
                      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{displayName}</h3>
                            {conversation.unread > 0 && (
                              <span className="bg-blue-600 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                                {conversation.unread}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium ${conversationBadge(
                              conversation
                            )}`}
                          >
                            {conversation.displayType}
                          </span>
                          <p className="text-sm text-gray-500 truncate mt-1">{conversation.lastMessage || 'Start the conversation'}</p>
                          {conversation.timestamp && (
                            <span className="text-xs text-gray-400">
                              {new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Pane */}
          <div className={chatPaneClasses}>
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-3">
                    {isDesktopMessagingView && (
                      <button
                        onClick={toggleConversationList}
                        className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                        aria-label={isConversationListCollapsed ? 'Show conversation list' : 'Hide conversation list'}
                      >
                        {isConversationListCollapsed ? (
                          <PanelLeftOpen className="h-5 w-5" />
                        ) : (
                          <PanelLeftClose className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    {isMobileMessagingView && (
                      <button
                        onClick={() => setShowMobileChatPane(false)}
                        className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                        aria-label="Back to conversations"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    )}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {(selectedConversation.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{selectedConversation.name || 'Unknown User'}</h3>
                      <p className="text-xs text-gray-500">
                        {selectedConversation.type
                          ? selectedConversation.type.replace(/^\w/, (c) => c.toUpperCase())
                          : 'User'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isInCall ? (
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
                    ) : (
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

                {isInCall ? (
                  <div className="p-6 bg-gray-900 flex items-center justify-center h-80">
                    <div className="text-center">
                      {callType === 'video' ? (
                        <div className="space-y-4">
                          <Camera className="h-16 w-16 text-white mx-auto" />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                              <p className="text-white font-medium">You</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                              <p className="text-white font-medium">{selectedConversation.name}</p>
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
                ) : (
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
                          const isMine = (message.senderId || message.sender) === user?.uid;
                          const timeStamp = message.createdAt || message.timestamp;

                          return (
                            <div
                              key={message.id || `${message.senderId}-${message.createdAt}`}
                              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isMine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                                }`}
                              >
                                {!isMine && message.senderName && (
                                  <p className="text-xs font-semibold mb-1">{message.senderName}</p>
                                )}
                                <p className="text-sm">{message.text || message.content}</p>
                                <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                                  {timeStamp
                                    ? new Date(timeStamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400 px-6">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a conversation to start messaging</p>
                  <p className="text-sm mt-2">Or start a voice/video call</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const quickActions = [
    {
      name: 'Add Client',
      icon: Heart,
      color: 'bg-green-600 hover:bg-green-700',
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
      action: () => setActiveTab('enhanced-inventory')
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
      <div className="flex items-center justify-center h-64 cm-dashboard-body">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'clients', label: 'Clients', icon: User },
    { id: 'archived-clients', label: 'Archived Clients', icon: Package },
    { id: 'caregivers', label: 'Caregivers', icon: UserCheck },
    { id: 'inactive-caregivers', label: 'Inactive Caregivers', icon: AlertCircle },
    { id: 'pharmacists', label: 'Pharmacists', icon: Pill },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar },
    { id: 'wage-management', label: 'Wage Management', icon: DollarSign },
    { id: 'billing-plans', label: 'Billing Plans', icon: Briefcase },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'admin-roles', label: 'Admin Roles', icon: UserCog },
    { id: 'cleanup-orphaned-users', label: 'Cleanup Orphaned Users', icon: Trash2 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'enhanced-inventory', label: 'Enhanced Inventory', icon: Building },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help-support', label: 'Help & Support', icon: HelpCircle }
  ];

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Dashboard';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Primary Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('user-management')}
                className="cursor-pointer transform transition hover:scale-105"
              >
                <StatCard icon={Users} label="Total Staff" value={stats.totalUsers.toLocaleString()} accent="from-blue-500 to-blue-600" />
              </div>
              <div 
                onClick={() => setActiveTab('clients')}
                className="cursor-pointer transform transition hover:scale-105"
              >
                <StatCard icon={Heart} label="Total Clients" value={stats.clients.toLocaleString()} accent="from-green-500 to-green-600" />
              </div>
              <div 
                onClick={() => setActiveTab('scheduling')}
                className="cursor-pointer transform transition hover:scale-105"
              >
                <StatCard icon={Activity} label="Active Tasks" value={stats.activeAssignments.toLocaleString()} accent="from-indigo-500 to-purple-500" />
              </div>
              <div 
                onClick={() => setActiveTab('assignments')}
                className="cursor-pointer transform transition hover:scale-105"
              >
                <StatCard icon={ClipboardList} label="Pending Tasks" value={stats.pendingAssignments.toLocaleString()} accent="from-yellow-500 to-orange-500" />
              </div>
            </section>

            {/* Secondary Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard icon={Stethoscope} label="Doctors" value={stats.doctors.toLocaleString()} accent="from-red-500 to-pink-500" />
              <StatCard icon={Heart} label="Nurses" value={stats.nurses.toLocaleString()} accent="from-pink-500 to-rose-500" />
              <StatCard icon={Pill} label="Pharmacists" value={stats.pharmacists.toLocaleString()} accent="from-purple-500 to-indigo-500" />
              <StatCard icon={UserCheck} label="Caregivers" value={stats.caregivers.toLocaleString()} accent="from-teal-500 to-cyan-500" />
              <StatCard icon={TestTube} label="Pending Tests" value={pendingDiagnostics.length.toLocaleString()} accent="from-amber-500 to-yellow-500" />
              <StatCard icon={Calendar} label="Appointments" value={stats.activeAppointments.toLocaleString()} accent="from-blue-500 to-indigo-500" />
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <section className="cm-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    <span className="text-xs text-gray-500">{quickActions.length} tools</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={action.action}
                          className={`${action.color} text-white rounded-lg p-4 flex flex-col items-center gap-2 transition hover:scale-105`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs text-center font-medium">{action.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Pending Diagnostics */}
                {pendingDiagnostics.length > 0 && (
                  <section className="cm-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TestTube className="h-5 w-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Pending Diagnostics</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('enhanced-lis')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {pendingDiagnostics.slice(0, 5).map((diagnostic) => (
                        <div 
                          key={diagnostic.id} 
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                          onClick={() => setActiveTab('enhanced-lis')}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {diagnostic.testName || diagnostic.testType || 'Lab Test'}
                            </p>
                            <p className="text-xs text-gray-600">
                              Client: {diagnostic.clientName || 'Unknown'} • {formatDateValue(diagnostic.orderedAt || diagnostic.createdAt)}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                            {diagnostic.status || 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Recent Assignments */}
                {assignments.length > 0 && (
                  <section className="cm-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Recent Assignments</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('assignments')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {assignments
                        .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
                        .slice(0, 5)
                        .map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowAssignmentDetails(true);
                            }}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{assignment.title || 'Untitled Assignment'}</p>
                              <p className="text-xs text-gray-600">
                                {assignment.clientName || 'Unknown Client'} • {assignment.caregiverName || 'Unassigned'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                              {assignment.status || 'Pending'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column - 1/3 width */}
              <div className="space-y-6">
                {/* System Alerts */}
                {systemAlerts.length > 0 && (
                  <section 
                    className="cm-card p-6 hover:shadow-md transition cursor-pointer"
                    onClick={() => setActiveTab('security')}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
                    </div>
                    <div className="space-y-2">
                      {systemAlerts.slice(0, 5).map((alert, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm font-medium text-red-900">{alert.message}</p>
                          <p className="text-xs text-red-600 mt-1">{alert.time}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Top Caregivers */}
                {topCaregivers.length > 0 && (
                  <section className="cm-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Top Caregivers</h3>
                    </div>
                    <div className="space-y-3">
                      {topCaregivers.map((caregiver, index) => (
                        <div 
                          key={caregiver.id} 
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          onClick={() => {
                            setSelectedCaregiver(caregiver);
                            setShowCaregiverDetails(true);
                          }}
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{caregiver.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-600">⭐ {caregiver.rating?.toFixed(1) || '0.0'}</span>
                              <span className="text-xs text-gray-600">•</span>
                              <span className="text-xs text-gray-600">{caregiver.clientsServed || 0} clients</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Performance Metrics */}
                <section 
                  className="cm-card p-6 hover:shadow-md transition cursor-pointer"
                  onClick={() => setActiveTab('analytics')}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">System Health</span>
                        <span className="text-sm font-semibold text-green-600">{stats.systemHealth}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Uptime</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.uptime}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.uptime}%` }}></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completed Tasks</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.completedAssignments.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Last Updated */}
                <section className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={refreshData}
                      disabled={refreshing}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                      title="Refresh Data"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        );
      case 'clients':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Clients</h3>
                <p className="text-sm text-gray-600">Manage active Client relationships and contact details.</p>
              </div>
              <button
                onClick={() => setShowCreatePatientModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                Add Client
              </button>
            </div>
            <div className="cm-card p-6">
              {clients.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No clients registered yet.</div>
              ) : (
                <div
                  className="overflow-x-auto"
                  style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', touchAction: 'pan-x' }}
                >
                  <table
                    className="min-w-[900px] divide-y divide-gray-200 text-sm"
                    style={{ width: 'max-content', minWidth: '900px' }}
                  >
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left uppercase tracking-wide text-xs font-semibold text-gray-500">Name</th>
                        <th className="px-6 py-3 text-left uppercase tracking-wide text-xs font-semibold text-gray-500">Contact</th>
                        <th className="px-6 py-3 text-left uppercase tracking-wide text-xs font-semibold text-gray-500">Status</th>
                        <th className="px-6 py-3 text-left uppercase tracking-wide text-xs font-semibold text-gray-500">Joined</th>
                        <th className="px-6 py-3 text-left uppercase tracking-wide text-xs font-semibold text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map((client) => (
                        <tr key={client.id || client.uid} className="hover:bg-gray-50 transition-colors">
                          <td 
                            className="px-6 py-4 font-medium text-gray-900 cursor-pointer"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetails(true);
                            }}
                          >
                            {client.name || client.fullName || 'Unnamed'}
                          </td>
                          <td 
                            className="px-6 py-4 text-gray-600 cursor-pointer"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetails(true);
                            }}
                          >
                            {client.phone || client.email || '—'}
                          </td>
                          <td 
                            className="px-6 py-4 cursor-pointer"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetails(true);
                            }}
                          >
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              client.status === 'active' ? 'bg-green-100 text-green-800' :
                              client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              client.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {client.status || 'Pending'}
                            </span>
                          </td>
                          <td 
                            className="px-6 py-4 text-gray-600 cursor-pointer"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetails(true);
                            }}
                          >
                            {formatDateValue(client.createdAt || client.joinedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowClientDetails(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Client Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleArchiveClient(client.id || client.uid)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Archive Client"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      case 'archived-clients':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Archived Clients</h3>
                <p className="text-sm text-gray-600">View and restore archived Client records.</p>
              </div>
              <button
                onClick={() => {
                  setRefreshing(true);
                  loadDashboardData().finally(() => setRefreshing(false));
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <ArchivedClients institutionId={effectivePartnerId} />
          </div>
        );
      case 'caregivers':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Caregivers</h3>
                <p className="text-sm text-gray-600">Track caregivers, roles, and coverage.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{caregivers.length} onboarded caregivers</span>
                <button
                  onClick={() => setShowAddCaregiver(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Caregiver
                </button>
              </div>
            </div>
            <div className="cm-card p-6">
              {caregivers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No caregivers available.</div>
              ) : (
                <div
                  className="overflow-x-auto"
                  style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
                >
                  <table
                    className="min-w-[900px] divide-y divide-gray-200 text-sm"
                    style={{ width: 'max-content', minWidth: '900px' }}
                  >
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Onboarding</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {caregivers.map((caregiver) => {
                        const onboardingStatus = caregiver.onboardingComplete ? 'completed' : (caregiver.onboardingStarted ? 'in-progress' : 'not-started');
                        return (
                        <tr key={caregiver.id || caregiver.uid} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                                  {caregiver.photoURL || caregiver.profilePicture ? (
                                    <img
                                      src={caregiver.photoURL || caregiver.profilePicture}
                                      alt={caregiver.name || 'Caregiver'}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <span className={`text-white font-semibold ${caregiver.photoURL || caregiver.profilePicture ? 'hidden' : 'flex'}`}>
                                    {(caregiver.name || 'C').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900">{caregiver.name || 'Caregiver'}</span>
                              </div>
                            </td>
                          <td className="px-6 py-4 text-gray-600 capitalize">{caregiver.role || caregiver.userType || 'Caregiver'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                onboardingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                onboardingStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {onboardingStatus === 'completed' ? 'Completed' :
                                 onboardingStatus === 'in-progress' ? 'In Progress' :
                                 'Not Started'}
                              </span>
                            </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              caregiver.status === 'active' ? 'bg-green-100 text-green-800' :
                              caregiver.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              caregiver.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                                {caregiver.status || 'Pending'}
                            </span>
                          </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedCaregiver(caregiver);
                                    setShowCaregiverDetails(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Caregiver Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {caregiver.status === 'pending' && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { doc, updateDoc, serverTimestamp, getDoc } = await import('../services/databaseCompat');
                                        const { db } = await import('../backend/config');
                                        
                                        const caregiverId = caregiver.uid || caregiver.id || caregiver.userId;
                                        
                                        // Update BOTH collections to keep them in sync
                                        // 1. Update users collection (for User Management tab)
                                        try {
                                          const userRef = doc(db, 'users', caregiverId);
                                          const userDoc = await getDoc(userRef);
                                          if (userDoc.exists()) {
                                            await updateDoc(userRef, { 
                                              status: 'active', 
                                              active: true,
                                              updatedAt: serverTimestamp()
                                            });
                                            console.log('✅ Updated users collection');
                                          }
                                        } catch (userError) {
                                          console.warn('⚠️ Could not update users collection:', userError);
                                        }
                                        
                                        // 2. Update caregivers collection (for Caregivers tab)
                                        try {
                                          const caregiverRef = doc(db, 'caregivers', caregiverId);
                                          const caregiverDoc = await getDoc(caregiverRef);
                                          if (caregiverDoc.exists()) {
                                            await updateDoc(caregiverRef, { 
                                              status: 'active',
                                              active: true,
                                              updatedAt: serverTimestamp()
                                            });
                                            console.log('✅ Updated caregivers collection');
                                          } else {
                                            // If caregiver doesn't exist in caregivers collection, try using caregiverAPI
                                            await caregiverAPI.updateCaregiver(caregiverId, { status: 'active' });
                                            console.log('✅ Updated via caregiverAPI');
                                          }
                                        } catch (caregiverError) {
                                          console.warn('⚠️ Could not update caregivers collection:', caregiverError);
                                          // Fallback to caregiverAPI
                                          try {
                                            await caregiverAPI.updateCaregiver(caregiverId, { status: 'active' });
                                            console.log('✅ Updated via caregiverAPI (fallback)');
                                          } catch (apiError) {
                                            console.error('❌ Failed to update via caregiverAPI:', apiError);
                                          }
                                        }
                                        
                                        toast.success('Caregiver activated successfully', { autoClose: 3000 });
                                        await loadDashboardData();
                                      } catch (error) {
                                        console.error('Error activating caregiver:', error);
                                        toast.error('Failed to activate caregiver', { autoClose: 3000 });
                                      }
                                    }}
                                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    title="Activate Caregiver"
                                  >
                                    Activate
                                  </button>
                                )}
                                {caregiver.status === 'active' && (
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm('Are you sure you want to suspend this caregiver?')) {
                                        return;
                                      }
                                      try {
                                        const isUser = caregiver.uid && !caregiver.id?.startsWith('caregiver_');
                                        if (isUser) {
                                          const { doc, updateDoc, serverTimestamp } = await import('../services/databaseCompat');
                                          const { db } = await import('../backend/config');
                                          await updateDoc(doc(db, 'users', caregiver.uid || caregiver.id), { 
                                            status: 'suspended', 
                                            active: false,
                                            updatedAt: serverTimestamp()
                                          });
                                        } else {
                                          await caregiverAPI.updateCaregiver(caregiver.id || caregiver.uid, { status: 'suspended' });
                                        }
                                        toast.success('Caregiver suspended successfully', { autoClose: 3000 });
                                        await loadDashboardData();
                                      } catch (error) {
                                        console.error('Error suspending caregiver:', error);
                                        toast.error('Failed to suspend caregiver', { autoClose: 3000 });
                                      }
                                    }}
                                    className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                    title="Suspend Caregiver"
                                  >
                                    Suspend
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (!window.confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) {
                                      return;
                                    }
                                    try {
                                      await handleDeleteCaregiver(caregiver.id || caregiver.uid);
                                    } catch (error) {
                                      console.error('Error deleting caregiver:', error);
                                      toast.error('Failed to delete caregiver', { autoClose: 3000 });
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Caregiver"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      case 'inactive-caregivers':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Inactive Caregivers</h3>
                <p className="text-sm text-gray-600">Review caregivers with no recent activity.</p>
              </div>
              <button
                onClick={() => {
                  setRefreshing(true);
                  loadDashboardData().finally(() => setRefreshing(false));
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <InactiveCaregiversReport institutionId={effectivePartnerId} />
          </div>
        );
      case 'pharmacists':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Pharmacists</h3>
                <p className="text-sm text-gray-600">Manage credentialed pharmacy staff.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{pharmacists.length} pharmacists</span>
                <button
                  onClick={() => {
                    setShowAddPharmacist(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Pharmacist
                </button>
              </div>
            </div>
            <div className="cm-card p-6">
              {pharmacists.length === 0 ? (
                <div className="p-12 text-center">
                  <Pill className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No pharmacists found.</p>
                  <button
                    onClick={() => setShowAddPharmacist(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Pharmacist
                  </button>
                </div>
              ) : (
                <div
                  className="overflow-x-auto"
                  style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
                >
                  <table
                    className="min-w-[900px] divide-y divide-gray-200 text-sm"
                    style={{ width: 'max-content', minWidth: '900px' }}
                  >
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">License</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Specialty</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pharmacists.map((pharmacist) => (
                        <tr key={pharmacist.id || pharmacist.uid} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{pharmacist.name || pharmacist.fullName || 'Pharmacist'}</td>
                          <td className="px-6 py-4 text-gray-600">{pharmacist.licenseNumber || '—'}</td>
                          <td className="px-6 py-4 text-gray-600">{pharmacist.specialization || 'General'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              pharmacist.status === 'active' ? 'bg-green-100 text-green-800' :
                              pharmacist.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              pharmacist.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              pharmacist.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {pharmacist.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPharmacist(pharmacist);
                                  setSelectedUserForEdit(pharmacist);
                                  setShowEditUserModal(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View/Edit Pharmacist"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {pharmacist.status !== 'suspended' ? (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to suspend ${pharmacist.name || 'this pharmacist'}? They will not be able to access the system.`)) {
                                      return;
                                    }
                                    try {
                                      const pharmacistId = pharmacist.id || pharmacist.uid;
                                      await updateDoc(doc(db, 'users', pharmacistId), {
                                        status: 'suspended',
                                        active: false,
                                        isActive: false,
                                        suspendedAt: new Date().toISOString(),
                                        suspendedBy: user?.uid || userProfile?.id,
                                        updatedAt: new Date().toISOString()
                                      });
                                      toast.success('Pharmacist suspended successfully');
                                      await loadDashboardData();
                                    } catch (error) {
                                      console.error('Error suspending pharmacist:', error);
                                      toast.error('Failed to suspend pharmacist');
                                    }
                                  }}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Suspend Pharmacist"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to reactivate ${pharmacist.name || 'this pharmacist'}?`)) {
                                      return;
                                    }
                                    try {
                                      const pharmacistId = pharmacist.id || pharmacist.uid;
                                      await updateDoc(doc(db, 'users', pharmacistId), {
                                        status: 'active',
                                        active: true,
                                        isActive: true,
                                        activatedAt: new Date().toISOString(),
                                        activatedBy: user?.uid || userProfile?.id,
                                        updatedAt: new Date().toISOString()
                                      });
                                      toast.success('Pharmacist reactivated successfully');
                                      await loadDashboardData();
                                    } catch (error) {
                                      console.error('Error reactivating pharmacist:', error);
                                      toast.error('Failed to reactivate pharmacist');
                                    }
                                  }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Reactivate Pharmacist"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Are you sure you want to delete ${pharmacist.name || 'this pharmacist'}? This action cannot be undone.`)) {
                                    return;
                                  }
                                  try {
                                    const pharmacistId = pharmacist.id || pharmacist.uid;
                                    const userRef = doc(db, 'users', pharmacistId);
                                    await updateDoc(userRef, {
                                      status: 'deleted',
                                      active: false,
                                      deletedAt: new Date().toISOString()
                                    });
                                    toast.success('Pharmacist deleted successfully');
                                    await loadDashboardData();
                                  } catch (error) {
                                    console.error('Error deleting pharmacist:', error);
                                    toast.error('Failed to delete pharmacist');
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Pharmacist"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      case 'assignments':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Assignments</h3>
                <p className="text-sm text-gray-600">All client-to-caregiver/intake assignments.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{assignments.length} assignments</span>
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Create Assignment
                </button>
              </div>
            </div>
            <div className="cm-card p-6">
              {assignments.length === 0 ? (
                <div className="p-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No assignments scheduled.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[800px] divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignment</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Caregiver</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <tr key={assignment.id || assignment.assignmentId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{assignment.title || 'Assignment'}</td>
                          <td className="px-6 py-4">
                            {(() => {
                              const client = clients.find(c =>
                                (c.id === assignment.clientId) ||
                                (c.uid === assignment.clientId) ||
                                (c.userId === assignment.clientId) ||
                                (c.user_id === assignment.clientId) ||
                                (c.backend_uid === assignment.clientId)
                              );
                              const displayName = client
                                ? (client.name || client.displayName ||
                                  (client.firstName && client.lastName
                                    ? `${client.firstName} ${client.lastName}`
                                    : client.firstName || client.lastName) ||
                                  client.fullName || 'Client')
                                : (assignment.clientName || 'Client');
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-xs overflow-hidden flex-shrink-0">
                                    {client?.photoURL || client?.profilePicture ? (
                                      <img
                                        src={client.photoURL || client.profilePicture}
                                        alt={displayName}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : null}
                                    <span className={`text-white font-semibold ${client?.photoURL || client?.profilePicture ? 'hidden' : 'flex'}`}>
                                      {displayName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-gray-600">{displayName}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const caregiver = caregivers.find(c => 
                                (c.id === assignment.caregiverId) || 
                                (c.uid === assignment.caregiverId) || 
                                (c.userId === assignment.caregiverId) ||
                                (c.user_id === assignment.caregiverId) ||
                                (c.backend_uid === assignment.caregiverId)
                              );
                              const displayName = caregiver
                                ? (caregiver.name || caregiver.displayName ||
                                  (caregiver.firstName && caregiver.lastName
                                    ? `${caregiver.firstName} ${caregiver.lastName}`
                                    : caregiver.firstName || caregiver.lastName) ||
                                  caregiver.fullName || 'Caregiver')
                                : (assignment.caregiverName || 'Caregiver');
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs overflow-hidden flex-shrink-0">
                                    {caregiver?.photoURL || caregiver?.profilePicture ? (
                                      <img
                                        src={caregiver.photoURL || caregiver.profilePicture}
                                        alt={displayName}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : null}
                                    <span className={`text-white font-semibold ${caregiver?.photoURL || caregiver?.profilePicture ? 'hidden' : 'flex'}`}>
                                      {displayName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-gray-600">{displayName}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              assignment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {assignment.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{formatDateValue(assignment.dueDate || assignment.dueAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setShowAssignmentDetails(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditAssignment(assignment)}
                                className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title="Edit Assignment"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {(assignment.status === 'pending' || assignment.status === 'active') && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to ${assignment.status === 'pending' ? 'start' : 'complete'} this assignment?`)) {
                                      return;
                                    }
                                    try {
                                      const newStatus = assignment.status === 'pending' ? 'active' : 'completed';
                                      await assignmentAPI.updateAssignment(assignment.id || assignment.assignmentId, {
                                        status: newStatus,
                                        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : { startedAt: new Date().toISOString() })
                                      });
                                      toast.success(`Assignment ${newStatus === 'active' ? 'started' : 'completed'} successfully`);
                                      await loadDashboardData();
                                    } catch (error) {
                                      console.error('Error updating assignment status:', error);
                                      toast.error(`Failed to ${assignment.status === 'pending' ? 'start' : 'complete'} assignment`);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    assignment.status === 'pending' 
                                      ? 'text-green-600 hover:bg-green-50' 
                                      : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title={assignment.status === 'pending' ? 'Start Assignment' : 'Complete Assignment'}
                                >
                                  {assignment.status === 'pending' ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Are you sure you want to delete assignment "${assignment.title || 'this assignment'}"? This action cannot be undone.`)) {
                                    return;
                                  }
                                  try {
                                    await assignmentAPI.deleteAssignment(assignment.id || assignment.assignmentId);
                                    toast.success('Assignment deleted successfully');
                                    await loadDashboardData();
                                  } catch (error) {
                                    console.error('Error deleting assignment:', error);
                                    toast.error('Failed to delete assignment');
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Assignment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      case 'scheduling':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Scheduling</h3>
                <p className="text-sm text-gray-600">Manage caregiver schedules and appointments.</p>
              </div>
            </div>
            <SchedulingModule institutionId={effectivePartnerId} />
          </div>
        );
      case 'wage-management':
        return (
          <div className="space-y-6">
            <CaregiverWageManagement institutionId={effectivePartnerId} />
          </div>
        );
      case 'billing-plans':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Billing Plans</h3>
                <p className="text-sm text-gray-600">Manage subscription plans and billing configurations.</p>
              </div>
            </div>
            <BillingManagementDashboard institutionId={effectivePartnerId} clients={clients} />
          </div>
        );
      case 'user-management':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600">Manage all users across your institution.</p>
              </div>
            </div>
            <UserManagement />
          </div>
        );
      case 'admin-roles':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Admin Roles</h3>
                <p className="text-sm text-gray-600">Assign and manage administrative permissions.</p>
              </div>
            </div>
            <AdminRoleAssignment institutionId={effectivePartnerId} />
          </div>
        );
      case 'cleanup-orphaned-users':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Cleanup Orphaned Users</h3>
                <p className="text-sm text-gray-600">Identify and remove users without proper institution associations.</p>
              </div>
            </div>
            <CleanupOrphanedUsers institutionId={effectivePartnerId} />
          </div>
        );
      case 'messages':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-600">Communicate with staff and clients.</p>
              </div>
            </div>
            {renderMessagesTab()}
          </div>
        );
      case 'enhanced-inventory':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Enhanced Inventory</h3>
                <p className="text-sm text-gray-600">Manage medical supplies and equipment inventory.</p>
              </div>
            </div>
            <EnhancedInventoryManagement institutionId={effectivePartnerId} />
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-600">Track performance metrics and system insights.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRefreshing(true);
                    loadDashboardData().finally(() => setRefreshing(false));
                  }}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    const data = {
                      stats,
                      recentActivity,
                      timestamp: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Analytics data exported');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={Activity} label="Active Assignments" value={stats.activeAssignments.toLocaleString()} accent="from-indigo-500 to-purple-500" />
              <StatCard icon={BarChart3} label="Satisfaction" value={`${stats.satisfaction}%`} accent="from-emerald-500 to-teal-500" />
              <StatCard icon={Shield} label="System Health" value={stats.systemHealth} accent="from-gray-600 to-black" />
            </div>
            <div className="cm-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <span className="text-xs text-gray-500">{recentActivity.length} events</span>
              </div>
              {recentActivity.length > 0 ? (
                <ul className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <li key={activity.id || activity.timestamp} className="flex items-start justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{activity.title || activity.type || 'Activity'}</p>
                        <p className="text-xs text-gray-500">{activity.summary || activity.details || '—'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{formatDateValue(activity.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500">No analytics events yet.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-600">Manage security settings and access controls.</p>
              </div>
            </div>
            <SecurityManagement institutionId={effectivePartnerId} />
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Settings</h3>
                <p className="text-sm text-gray-600">Configure institution preferences and options.</p>
              </div>
            </div>
            <PartnerSettings institutionId={effectivePartnerId} />
          </div>
        );
      case 'help-support':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Help & Support</h3>
                <p className="text-sm text-gray-600">Get assistance and access documentation.</p>
              </div>
            </div>
            <HelpSupport institutionId={effectivePartnerId} />
          </div>
        );
      default:
        return (
          <section className="cm-card p-6">
            <h3 className="text-lg font-semibold text-gray-900">Coming Soon</h3>
            <p className="text-sm text-gray-600 mt-2">We are preparing this workspace for you. Check back soon.</p>
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen cm-dashboard-body">
      <DashboardLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        institutionName={institutionData?.name || 'Partner'}
        portalLabel="Partner Admin"
        displayName={displayName}
        userEmail={userProfile?.email || user?.email}
        profilePictureUrl={userProfile?.photoURL || userProfile?.profilePicture}
        onLogout={handleLogout}
        headerActions={
          <>
            {userRoles && userRoles.length > 1 && (
              <div className="hidden lg:block">
                <DashboardSwitcher
                  userRoles={userRoles}
                  currentDashboard="admin"
                  institutionId={finalPartnerId}
                />
              </div>
            )}
            <button
              onClick={handleDatabaseCleanup}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cleanup Database</span>
            </button>
            <button
              onClick={() => setShowProfileSettings(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-ink hover:bg-ink/5 transition"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="cm-section-head">
            <span className="cm-eyebrow">{activeTabLabel}</span>
            <h2 className="mt-2">{institutionData?.name || 'Partner Dashboard'}</h2>
            <p>Welcome back, {displayName}.</p>
          </div>
          {renderTabContent()}
        </div>
      </DashboardLayout>

      {showCreatePatientModal && (
        <CreatePatientModal
          open={showCreatePatientModal}
          onClose={() => setShowCreatePatientModal(false)}
          onSuccess={() => loadDashboardData()}
          institutionId={effectivePartnerId}
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
          onDelete={(client) => handleArchiveClient(client.id || client.uid)}
          onUnarchive={(client) => handleUnarchiveClient(client.id || client.uid)}
          institutionId={effectivePartnerId}
        />
      )}

      {showCaregiverDetails && selectedCaregiver && (
        <CaregiverDetailsModal
          caregiver={selectedCaregiver}
          onClose={() => {
            setShowCaregiverDetails(false);
            setSelectedCaregiver(null);
          }}
          onSuspend={async (caregiver) => {
            try {
              const isUser = caregiver.uid && !caregiver.id?.startsWith('caregiver_');
              if (isUser) {
                const { doc, updateDoc, serverTimestamp } = await import('../services/databaseCompat');
                const { db } = await import('../backend/config');
                await updateDoc(doc(db, 'users', caregiver.uid || caregiver.id), { 
                  status: 'suspended', 
                  active: false,
                  updatedAt: serverTimestamp()
                });
              } else {
                await caregiverAPI.updateCaregiver(caregiver.id || caregiver.uid, { status: 'suspended' });
              }
              toast.success('Caregiver suspended successfully', { autoClose: 3000 });
              await loadDashboardData();
            } catch (error) {
              console.error('Error suspending caregiver:', error);
              toast.error('Failed to suspend caregiver', { autoClose: 3000 });
            }
          }}
          onActivate={async (caregiver) => {
            try {
              const isUser = caregiver.uid && !caregiver.id?.startsWith('caregiver_');
              if (isUser) {
                const { doc, updateDoc, serverTimestamp } = await import('../services/databaseCompat');
                const { db } = await import('../backend/config');
                await updateDoc(doc(db, 'users', caregiver.uid || caregiver.id), { 
                  status: 'active', 
                  active: true,
                  updatedAt: serverTimestamp()
                });
              } else {
                await caregiverAPI.updateCaregiver(caregiver.id || caregiver.uid, { status: 'active' });
              }
              toast.success('Caregiver activated successfully', { autoClose: 3000 });
              await loadDashboardData();
            } catch (error) {
              console.error('Error activating caregiver:', error);
              toast.error('Failed to activate caregiver', { autoClose: 3000 });
            }
          }}
          onDelete={handleDeleteCaregiver}
          institutionId={effectivePartnerId}
        />
      )}

      {showAddCaregiver && (
        <AddCaregiverModal
          isOpen={showAddCaregiver}
          onClose={() => setShowAddCaregiver(false)}
          institutionId={effectivePartnerId}
          createdBy={user?.uid}
          onCaregiverCreated={() => {
            loadDashboardData();
            setShowAddCaregiver(false);
          }}
        />
      )}

      {showAddPharmacist && (
        <PartnerUserCreationModal
          isOpen={showAddPharmacist}
          onClose={() => setShowAddPharmacist(false)}
          institutionId={effectivePartnerId}
          createdBy={user?.uid}
          onUserCreated={() => {
            loadDashboardData();
            setShowAddPharmacist(false);
          }}
        />
      )}

      {/* Assignment Details Modal */}
      {showAssignmentDetails && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Assignment Details</h3>
                <p className="text-sm text-gray-500 mt-1">View complete assignment information</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignmentDetails(false);
                  setSelectedAssignment(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{selectedAssignment.title || 'Assignment'}</h4>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedAssignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedAssignment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    selectedAssignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedAssignment.status || 'Pending'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Priority</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedAssignment.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    selectedAssignment.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedAssignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedAssignment.priority || 'Normal'}
                  </span>
                </div>
              </div>

              {/* Client & Caregiver Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Client</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedAssignment.clientName || 'Unknown Client'}</p>
                  {selectedAssignment.clientEmail && (
                    <p className="text-xs text-gray-600 mt-1">{selectedAssignment.clientEmail}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Caregiver</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedAssignment.caregiverName || 'Unknown Caregiver'}</p>
                  {selectedAssignment.caregiverEmail && (
                    <p className="text-xs text-gray-600 mt-1">{selectedAssignment.caregiverEmail}</p>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs uppercase text-gray-500 mb-2">Due Date & Time</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateValue(selectedAssignment.dueDate || selectedAssignment.dueAt) || 'Not specified'}
                    </span>
                  </div>
                  {selectedAssignment.dueTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{selectedAssignment.dueTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedAssignment.description && (
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-2">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAssignment.description}</p>
                </div>
              )}

              {/* Instructions */}
              {selectedAssignment.instructions && (
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-2">Instructions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAssignment.instructions}</p>
                </div>
              )}

              {/* Assignment Type */}
              {selectedAssignment.assignmentType && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Assignment Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {selectedAssignment.assignmentType.replace(/-/g, ' ')}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAssignment.createdAt ? formatDateValue(selectedAssignment.createdAt) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Assigned By</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAssignment.assignedByName || 'Admin'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEditAssignment(selectedAssignment)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Edit
                </button>
                {(selectedAssignment.status === 'pending' || selectedAssignment.status === 'active') && (
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to ${selectedAssignment.status === 'pending' ? 'start' : 'complete'} this assignment?`)) {
                        return;
                      }
                      try {
                        const newStatus = selectedAssignment.status === 'pending' ? 'active' : 'completed';
                        await assignmentAPI.updateAssignment(selectedAssignment.id || selectedAssignment.assignmentId, {
                          status: newStatus,
                          ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : { startedAt: new Date().toISOString() })
                        });
                        toast.success(`Assignment ${newStatus === 'active' ? 'started' : 'completed'} successfully`);
                        setShowAssignmentDetails(false);
                        setSelectedAssignment(null);
                        await loadDashboardData();
                      } catch (error) {
                        console.error('Error updating assignment status:', error);
                        toast.error(`Failed to ${selectedAssignment.status === 'pending' ? 'start' : 'complete'} assignment`);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
                      selectedAssignment.status === 'pending' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {selectedAssignment.status === 'pending' ? 'Start Assignment' : 'Complete Assignment'}
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete assignment "${selectedAssignment.title || 'this assignment'}"? This action cannot be undone.`)) {
                      return;
                    }
                    try {
                      await assignmentAPI.deleteAssignment(selectedAssignment.id || selectedAssignment.assignmentId);
                      toast.success('Assignment deleted successfully');
                      setShowAssignmentDetails(false);
                      setSelectedAssignment(null);
                      await loadDashboardData();
                    } catch (error) {
                      console.error('Error deleting assignment:', error);
                      toast.error('Failed to delete assignment');
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Creation Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Create Assignment</h3>
                <p className="text-sm text-gray-500 mt-1">Assign a client to a caregiver</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAssignmentForm({
                    title: '',
                    description: '',
                    instructions: '',
                    priority: 'normal',
                    dueDate: '',
                    dueTime: ''
                  });
                  setSelectedClientForAssignment('');
                  setSelectedCaregiverForAssignment('');
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedClientForAssignment || !selectedCaregiverForAssignment || !assignmentForm.title) {
                  toast.error('Please fill in all required fields');
                  return;
                }
                await handleCreateAssignment(assignmentForm);
                setAssignmentForm({
                  title: '',
                  description: '',
                  instructions: '',
                  priority: 'normal',
                  dueDate: '',
                  dueTime: ''
                });
                setSelectedClientForAssignment('');
                setSelectedCaregiverForAssignment('');
              }}
              className="p-6 space-y-4"
            >
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClientForAssignment}
                  onChange={(e) => setSelectedClientForAssignment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.filter(c => c.status !== 'archived').map((client) => (
                    <option key={client.id || client.uid} value={client.id || client.uid}>
                      {client.name || client.displayName || client.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Caregiver Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Caregiver <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCaregiverForAssignment}
                  onChange={(e) => setSelectedCaregiverForAssignment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a caregiver</option>
                  {caregivers.filter(c => c.status === 'active').map((caregiver) => (
                    <option key={caregiver.id || caregiver.uid} value={caregiver.id || caregiver.uid}>
                      {caregiver.name || caregiver.displayName || caregiver.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Assignment title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Assignment description"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
                <textarea
                  value={assignmentForm.instructions}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Special instructions for the caregiver"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={assignmentForm.priority}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Due Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Due Time</label>
                  <input
                    type="time"
                    value={assignmentForm.dueTime}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setAssignmentForm({
                      title: '',
                      description: '',
                      instructions: '',
                      priority: 'normal',
                      dueDate: '',
                      dueTime: ''
                    });
                    setSelectedClientForAssignment('');
                    setSelectedCaregiverForAssignment('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditAssignmentModal && selectedAssignmentForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Edit Assignment</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Update task details for {selectedAssignmentForEdit.clientName || 'client'} and{' '}
                  {selectedAssignmentForEdit.caregiverName || 'caregiver'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditAssignmentModal(false);
                  setSelectedAssignmentForEdit(null);
                  setEditAssignmentForm({
                    title: '',
                    description: '',
                    instructions: '',
                    priority: 'normal',
                    dueDate: '',
                    dueTime: '',
                    status: 'pending'
                  });
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleUpdateAssignment(editAssignmentForm);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Client</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAssignmentForEdit.clientName || 'Unknown Client'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Caregiver</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAssignmentForEdit.caregiverName || 'Unknown Caregiver'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editAssignmentForm.title}
                  onChange={(event) =>
                    setEditAssignmentForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editAssignmentForm.description}
                  onChange={(event) =>
                    setEditAssignmentForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
                <textarea
                  value={editAssignmentForm.instructions}
                  onChange={(event) =>
                    setEditAssignmentForm((prev) => ({ ...prev, instructions: event.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={editAssignmentForm.priority}
                    onChange={(event) =>
                      setEditAssignmentForm((prev) => ({ ...prev, priority: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={editAssignmentForm.status}
                    onChange={(event) =>
                      setEditAssignmentForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={editAssignmentForm.dueDate}
                      onChange={(event) =>
                        setEditAssignmentForm((prev) => ({ ...prev, dueDate: event.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Time</label>
                    <input
                      type="time"
                      value={editAssignmentForm.dueTime}
                      onChange={(event) =>
                        setEditAssignmentForm((prev) => ({ ...prev, dueTime: event.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAssignmentModal(false);
                    setSelectedAssignmentForEdit(null);
                    setEditAssignmentForm({
                      title: '',
                      description: '',
                      instructions: '',
                      priority: 'normal',
                      dueDate: '',
                      dueTime: '',
                      status: 'pending'
                    });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <UserProfileSettings
          userId={user?.uid}
          onClose={() => {
            setShowProfileSettings(false);
            loadDashboardData(); // Refresh data to show updated profile picture
          }}
        />
      )}

      {/* Edit User Modal - For editing pharmacists and other users */}
      {showEditUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit {selectedUserForEdit.userType === 'pharmacist' ? 'Pharmacist' : 'User'}</h3>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUserForEdit(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={selectedUserForEdit.name || selectedUserForEdit.fullName || `${selectedUserForEdit.firstName || ''} ${selectedUserForEdit.lastName || ''}`.trim() || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={selectedUserForEdit.email || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                {selectedUserForEdit.userType === 'pharmacist' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">License Number</label>
                      <input
                        type="text"
                        value={selectedUserForEdit.licenseNumber || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Specialization</label>
                      <input
                        type="text"
                        value={selectedUserForEdit.specialization || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={selectedUserForEdit.status || 'active'}
                    onChange={async (e) => {
                      try {
                        const newStatus = e.target.value;
                        const userId = selectedUserForEdit.id || selectedUserForEdit.uid;
                        await updateUserStatus(userId, newStatus);
                        toast.success('Status updated successfully');
                        await loadDashboardData();
                        setShowEditUserModal(false);
                        setSelectedUserForEdit(null);
                      } catch (error) {
                        console.error('Error updating status:', error);
                        toast.error('Failed to update status');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> To edit other details like name, email, or license number, please contact support or use the Backend Console.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUserForEdit(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default PartnerAdminDashboard;


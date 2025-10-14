import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import { db } from './firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProvider, useUser } from './contexts/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import errorHandler from './utils/errorHandler';
import logger from './utils/logger';
import securityMonitoringService from './services/securityMonitoringService';
import biometricAuthService from './services/biometricAuthService';
import secureConfigService from './services/secureConfigService';
import Layout from './components/Layout';
import SuperAdminGuard from './components/SuperAdminGuard';
import InstitutionAdminGuard from './components/InstitutionAdminGuard';
// Old admin components removed - using new admin system
import ServiceProviderLayout from './components/ServiceProviderLayout';
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Medications = lazy(() => import('./pages/Medications'));
const VitalSigns = lazy(() => import('./pages/VitalSigns'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Consultation = lazy(() => import('./pages/Consultation'));
const Profile = lazy(() => import('./pages/Profile'));
const CaregiverDashboard = lazy(() => import('./pages/CaregiverDashboard'));
const PreclinicCaregiverDashboard = lazy(() => import('./pages/PreclinicCaregiverDashboard'));
const CaregiverSchedule = lazy(() => import('./pages/CaregiverSchedule'));
const CaregiverClients = lazy(() => import('./pages/CaregiverPatients'));
const CaregiverTasks = lazy(() => import('./pages/CaregiverTasks'));
const CaregiverOnboarding = lazy(() => import('./pages/CaregiverOnboarding'));
const SuperAdminLicensing = lazy(() => import('./pages/SuperAdminLicensing'));
const SuperAdminLogin = lazy(() => import('./pages/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminSettings = lazy(() => import('./pages/SuperAdminSettings'));
const InstitutionAdminDashboard = lazy(() => import('./pages/InstitutionAdminDashboard'));
const InstitutionUserManagement = lazy(() => import('./pages/InstitutionUserManagement'));
const InstitutionSettings = lazy(() => import('./pages/InstitutionSettings'));
const InstitutionLanding = lazy(() => import('./pages/InstitutionLanding'));
const InstitutionLogin = lazy(() => import('./pages/InstitutionLogin'));
const InstitutionCaregiverOnboarding = lazy(() => import('./pages/InstitutionCaregiverOnboarding'));
const InstitutionCaregiverPendingApproval = lazy(() => import('./pages/InstitutionCaregiverPendingApproval'));
const InstitutionCaregiverDashboard = lazy(() => import('./pages/InstitutionCaregiverDashboard'));
const CaregiverMessages = lazy(() => import('./pages/CaregiverMessages'));
const CaregiverNavigation = lazy(() => import('./pages/CaregiverNavigation'));
const CaregiverPhotos = lazy(() => import('./pages/CaregiverPhotos'));
const CaregiverPerformance = lazy(() => import('./pages/CaregiverPerformance'));
const CaregiverEmergency = lazy(() => import('./pages/CaregiverEmergency'));
const CaregiverSettings = lazy(() => import('./pages/CaregiverSettings'));
const Telemedicine = lazy(() => import('./pages/Telemedicine'));
import CaregiverLayout from './components/CaregiverLayout';
const Messages = lazy(() => import('./pages/Messages'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Services = lazy(() => import('./pages/Services'));
const ClientCaregivers = lazy(() => import('./pages/PatientCaregivers'));
const Pricing = lazy(() => import('./pages/Pricing'));
// All onboarding is now integrated into Auth.js
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminAppointments = lazy(() => import('./pages/AdminAppointments'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminEmergency = lazy(() => import('./pages/AdminEmergency'));
const AdminEmergencyProtocols = lazy(() => import('./pages/AdminEmergencyProtocols'));
const AdminMedications = lazy(() => import('./pages/AdminMedications'));
const AdminMedicationAnalytics = lazy(() => import('./pages/AdminMedicationAnalytics'));
const AdminCaregivers = lazy(() => import('./pages/AdminCaregivers'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminCommunication = lazy(() => import('./pages/AdminCommunication'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));
const AdminClientAssignments = lazy(() => import('./pages/AdminPatientAssignments'));
const AdminUserVerification = lazy(() => import('./pages/AdminUserVerification'));
const SystemStatus = lazy(() => import('./pages/SystemStatus'));
const MedicalDocuments = lazy(() => import('./pages/MedicalDocuments'));
const AdminClientDatabase = lazy(() => import('./pages/AdminPatientDatabase'));
const AdminCaregiverManagement = lazy(() => import('./pages/AdminCaregiverManagement'));
const NewAdminLogin = lazy(() => import('./pages/NewAdminLogin'));
const NewAdminDashboard = lazy(() => import('./pages/NewAdminDashboard'));
const AdminClientFeedback = lazy(() => import('./pages/AdminPatientFeedback'));
const ServiceProviderDashboard = lazy(() => import('./pages/ServiceProviderDashboard'));
const RouteOptimization = lazy(() => import('./pages/RouteOptimization'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const WebRTCTest = lazy(() => import('./pages/WebRTCTest'));
import EnhancedMessagingInterface from './components/EnhancedMessagingInterface';
import MobileOptimization from './components/MobileOptimization';
import LoadingSpinner from './components/LoadingSpinner';

// PWA and Mobile Components
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import VoiceCommandInterface from './components/VoiceCommandInterface';
import GestureControls from './components/GestureControls';
import MobileActionBar from './components/MobileActionBar';

// PWA Services
import SecuritySettings from './components/SecuritySettings';
import SecurityDashboard from './components/SecurityDashboard';
import pwaService from './services/pwaService';
import hapticService from './services/hapticService';
import voiceCommandService from './services/voiceCommandService';
import gestureService from './services/gestureService';

function App() {
  const [user, loading] = useAuthState(auth);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);
  const [showGestureControls, setShowGestureControls] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobile, setIsMobile] = useState(false);

  // PWA and Security Services Setup
  useEffect(() => {
    try {
      // Initialize PWA services
      pwaService.init();
      logger.info('PWA services initialized successfully');

      // Initialize security services
      securityMonitoringService.initialize();
      biometricAuthService.initialize();
      
      // Log security initialization
      securityMonitoringService.logSecurityEvent('APP_INITIALIZATION', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        features: secureConfigService.getFeatureFlags()
      });
      
      logger.info('Security services initialized successfully');
    } catch (error) {
      errorHandler.handleError(error, { context: 'pwa_initialization' });
    }
    
    // Check if mobile device
    const checkMobile = () => {
      try {
        setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
      } catch (error) {
        errorHandler.handleError(error, { context: 'mobile_detection' });
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('App is back online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('App is offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        pwaService.requestNotificationPermission();
      } catch (error) {
        errorHandler.handleError(error, { context: 'notification_permission' });
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ensure users/{uid}.createdAt exists (account creation timestamp)
  useEffect(() => {
    const ensureCreatedAt = async () => {
      try {
        if (!user?.uid) return;
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          await setDoc(userDocRef, { createdAt: serverTimestamp(), id: user.uid, email: user.email || null }, { merge: true });
          return;
        }
        const data = snap.data();
        if (!data?.createdAt) {
          await setDoc(userDocRef, { createdAt: serverTimestamp() }, { merge: true });
        }
      } catch (e) {
        errorHandler.handleError(e, { context: 'ensure_user_createdAt' });
      }
    };
    ensureCreatedAt();
  }, [user?.uid, user?.email]);

  // Voice command handlers
  const handleVoiceCommand = (command, params) => {
    console.log('Voice command received:', command, params);
    
    switch (command) {
      case 'call':
        // Navigate to messages page (calls tab removed)
        window.location.href = '/service-provider/messages';
        break;
      case 'endCall':
        // End current call (implement call service integration)
        break;
      case 'answerCall':
        // Answer incoming call
        break;
      case 'rejectCall':
        // Reject incoming call
        break;
      case 'sendMessage':
        // Navigate to messages
        window.location.href = '/service-provider/messages';
        break;
      case 'readMessages':
        // Navigate to messages
        window.location.href = '/service-provider/messages';
        break;
      case 'navigate':
        // Handle navigation commands
        if (params.text) {
          const navText = params.text.toLowerCase();
          if (navText.includes('client')) {
            window.location.href = '/service-provider/clients';
          } else if (navText.includes('schedule')) {
            window.location.href = '/service-provider/schedule';
          } else if (navText.includes('task')) {
            window.location.href = '/service-provider/tasks';
          }
        }
        break;
      case 'back':
        // Go back
        window.history.back();
        break;
      case 'home':
        // Go to dashboard
        window.location.href = '/service-provider';
        break;
      case 'completeTask':
        // Handle task completion
        break;
      case 'assignTask':
        // Handle task assignment
        break;
      case 'emergency':
        // Trigger emergency alert
        window.location.href = '/service-provider/emergency';
        break;
      case 'medication':
        // Navigate to medications
        window.location.href = '/service-provider/prescriptions';
        break;
      case 'vitalSigns':
        // Navigate to vital signs
        window.location.href = '/service-provider/diagnostics';
        break;
      case 'help':
        // Show help
        break;
      default:
        console.log('Unknown voice command:', command);
    }
  };

  // Gesture handlers
  const handleGesture = (gesture, data) => {
    console.log('Gesture received:', gesture, data);
    
    switch (gesture) {
      case 'swipe-left':
        // Go back
        window.history.back();
        break;
      case 'swipe-right':
        // Go forward
        window.history.forward();
        break;
      case 'swipe-up':
        // Scroll up
        window.scrollBy(0, -100);
        break;
      case 'swipe-down':
        // Scroll down
        window.scrollBy(0, 100);
        break;
      case 'pinch-in':
        // Zoom out
        document.body.style.zoom = Math.max(0.5, parseFloat(document.body.style.zoom || 1) - 0.1);
        break;
      case 'pinch-out':
        // Zoom in
        document.body.style.zoom = Math.min(2, parseFloat(document.body.style.zoom || 1) + 0.1);
        break;
      case 'long-press':
        // Show context menu or long press action
        break;
      case 'double-tap':
        // Refresh page
        window.location.reload();
        break;
      default:
        console.log('Unknown gesture:', gesture);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary name="App">
      <UserProvider>
        <MobileOptimization />
      
      {/* PWA Components */}
      <PWAInstallPrompt />
      <OfflineIndicator />
      
      {/* Mobile Action Bar */}
      {isMobile && user && (
        <MobileActionBar
          onVoiceCommand={(enabled) => setShowVoiceInterface(enabled)}
          onGestureControl={(enabled) => setShowGestureControls(enabled)}
          onSettings={() => {
            // Open mobile settings
          }}
          isOnline={isOnline}
          isVoiceEnabled={voiceCommandService.isSupported}
          isGestureEnabled={gestureService.isSupported}
          isHapticEnabled={hapticService.isSupported}
        />
      )}
      
      {/* Voice Command Interface */}
      <VoiceCommandInterface
        isOpen={showVoiceInterface}
        onClose={() => setShowVoiceInterface(false)}
        onCommand={handleVoiceCommand}
      />
      
      {/* Gesture Controls */}
      <GestureControls
        isOpen={showGestureControls}
        onClose={() => setShowGestureControls(false)}
        onGesture={handleGesture}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
      <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={<Landing />} 
      />
      <Route 
        path="/auth" 
        element={user ? <RoleBasedDashboardRoute /> : <Auth />} 
      />
      <Route 
        path="/login" 
        element={user ? <SignInRouteHandler /> : <Auth />} 
      />
      <Route 
        path="/signup" 
        element={<Navigate to="/admin/login" replace />} 
      />
      
      {/* Super Admin Routes - Must be before other protected routes */}
      <Route 
        path="/super-admin/login" 
        element={<SuperAdminLogin />} 
      />
      
      <Route 
        path="/super-admin/dashboard" 
        element={<SuperAdminGuard><SuperAdminDashboard /></SuperAdminGuard>} 
      />
      
      <Route 
        path="/super-admin/licensing" 
        element={<SuperAdminGuard><SuperAdminLicensing /></SuperAdminGuard>} 
      />
      
      <Route 
        path="/super-admin/settings" 
        element={<SuperAdminGuard><SuperAdminSettings /></SuperAdminGuard>} 
      />
      
      <Route 
        path="/super-admin" 
        element={<SuperAdminGuard><SuperAdminDashboard /></SuperAdminGuard>} 
      />

      {/* Institution Onboarding Routes - Public */}
      <Route 
        path="/onboard" 
        element={<InstitutionLanding />} 
      />
      
      <Route 
        path="/institution/login" 
        element={<InstitutionLogin />} 
      />

      {/* Institution Admin Routes - TEMPORARILY UNGUARDED FOR DEBUGGING */}
      <Route 
        path="/institution-admin/dashboard" 
        element={<InstitutionAdminDashboard />} 
      />
      
      <Route 
        path="/institution-admin/users" 
        element={<InstitutionUserManagement />} 
      />
      
      <Route 
        path="/institution-admin/settings" 
        element={<InstitutionSettings />} 
      />
      
      <Route 
        path="/institution-admin" 
        element={<Navigate to="/institution-admin/dashboard" replace />} 
      />
      
      {/* Legacy dashboard route - redirect to institution-admin */}
      <Route 
        path="/dashboard" 
        element={<Navigate to="/institution-admin/dashboard" replace />} 
      />

      {/* Institution Caregiver Routes */}
      <Route 
        path="/institution-caregiver/onboarding" 
        element={user ? <InstitutionCaregiverOnboarding /> : <Navigate to="/institution/login" replace />} 
      />
      
      <Route 
        path="/institution-caregiver/pending-approval" 
        element={user ? <InstitutionCaregiverPendingApproval /> : <Navigate to="/institution/login" replace />} 
      />
      
      <Route 
        path="/institution-caregiver/dashboard" 
        element={user ? <InstitutionCaregiverDashboard /> : <Navigate to="/institution/login" replace />} 
      />

      <Route 
        path="/institution-caregiver" 
        element={<Navigate to="/institution-caregiver/dashboard" replace />} 
      />

      {/* Institution Pharmacist Routes */}
      <Route 
        path="/institution-pharmacist/dashboard" 
        element={user ? <InstitutionCaregiverDashboard /> : <Navigate to="/institution/login" replace />} 
      />

      <Route 
        path="/institution-pharmacist" 
        element={<Navigate to="/institution-pharmacist/dashboard" replace />} 
      />
      
      {/* Protected routes - Dashboard removed (clients don't have accounts) */}
      <Route 
        path="/medications" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Medications />} />
      </Route>
      <Route 
        path="/vital-signs" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<VitalSigns />} />
      </Route>
      <Route 
        path="/appointments" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Appointments />} />
      </Route>
      <Route 
        path="/telemedicine" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Telemedicine />} />
      </Route>
      <Route 
        path="/medical-documents" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<MedicalDocuments />} />
      </Route>
      <Route 
        path="/webrtc-test" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<WebRTCTest />} />
      </Route>
      
      {/* Direct test route for caregiver onboarding - removed as onboarding is now integrated into Auth.js */}
      <Route 
        path="/profile" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Profile />} />
      </Route>
      <Route 
        path="/messages" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Messages />} />
      </Route>
      <Route 
        path="/subscription" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Subscription />} />
      </Route>
      <Route 
        path="/client-caregivers" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<ClientCaregivers />} />
      </Route>
      <Route 
        path="/security" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<SecuritySettings />} />
      </Route>
      <Route 
        path="/security-dashboard" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<SecurityDashboard />} />
      </Route>
      <Route 
        path="/caregiver" 
        element={user ? <StrictCaregiverGuard /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<CaregiverDashboard />} />
        <Route path="schedule" element={<CaregiverSchedule />} />
        <Route path="tasks" element={<CaregiverTasks />} />
        <Route path="messages" element={<CaregiverMessages />} />
        <Route path="navigation" element={<CaregiverNavigation />} />
        <Route path="photos" element={<CaregiverPhotos />} />
        <Route path="performance" element={<CaregiverPerformance />} />
        <Route path="emergency" element={<CaregiverEmergency />} />
        <Route path="settings" element={<CaregiverSettings />} />
      </Route>

      {/* Service Provider routes (unified for doctors and caregivers) */}
      <Route 
        path="/service-provider" 
        element={user ? <ServiceProviderGuard /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<ServiceProviderDashboard />} />
        <Route path="schedule" element={<CaregiverSchedule />} />
        <Route path="routes" element={<RouteOptimization />} />
        <Route path="messages" element={<EnhancedMessagingInterface />} />
        <Route path="tasks" element={<CaregiverTasks />} />
        <Route path="care-logs" element={<CaregiverPhotos />} />
        <Route path="photos" element={<CaregiverPhotos />} />
        <Route path="activities" element={<CaregiverPerformance />} />
        <Route path="medical-records" element={<CaregiverClients />} />
        <Route path="prescriptions" element={<Medications />} />
        <Route path="consultations" element={<Consultation />} />
        <Route path="diagnostics" element={<VitalSigns />} />
        <Route path="settings" element={<CaregiverSettings />} />
      </Route>
      <Route 
        path="/services" 
        element={<Services />} 
      />
      <Route 
        path="/pricing" 
        element={<Pricing />} 
      />
      
      {/* Caregiver Login Route */}
      <Route 
        path="/caregiver/login" 
        element={<Auth />} 
      />
      {/* Caregiver Onboarding Route */}
      <Route 
        path="/caregiver/onboarding" 
        element={user ? <CaregiverOnboarding /> : <Navigate to="/caregiver/login" replace />} 
      />
      
      {/* Admin Login Route */}
      <Route 
        path="/admin/login" 
        element={<NewAdminLogin />} 
      />
      
      {/* Alternative Admin Login Route */}
      <Route 
        path="/new-admin-login" 
        element={<NewAdminLogin />} 
      />
      
      {/* Admin Dashboard Route */}
      <Route 
        path="/admin/dashboard" 
        element={<NewAdminDashboard />} 
      />
      
      {/* Admin Client Feedback Route */}
      <Route 
        path="/admin/client-feedback" 
        element={<AdminClientFeedback />} 
      />
      
      {/* Admin Analytics Route */}
      <Route 
        path="/admin/analytics" 
        element={<AdminAnalytics />} 
      />
      
      {/* Admin Users Route */}
      <Route 
        path="/admin/users" 
        element={<AdminUsers />} 
      />
      
      {/* Admin Caregivers Route */}
      <Route 
        path="/admin/caregivers" 
        element={<AdminCaregivers />} 
      />
      
      {/* Admin Communication Route */}
      <Route 
        path="/admin/communication" 
        element={<AdminCommunication />} 
      />
      
      {/* Admin Audit Logs Route */}
      <Route 
        path="/admin/audit-logs" 
        element={<AdminAuditLogs />} 
      />
      
      {/* Admin Emergency Route */}
      <Route 
        path="/admin/emergency" 
        element={<AdminEmergency />} 
      />
      
      {/* Admin Reports Route */}
      <Route 
        path="/admin/reports" 
        element={<AdminReports />} 
      />
      
      {/* Admin Settings Route */}
      <Route 
        path="/admin/settings" 
        element={<AdminSettings />} 
      />
      
      {/* Admin Root Redirect - always send to admin login to enforce session */}
      <Route 
        path="/admin" 
        element={<Navigate to="/admin/login" replace />} 
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </UserProvider>
    </ErrorBoundary>
  );
}

// Sign-in route handler - focuses on caregiver/service provider access
function SignInRouteHandler() {
  const { userRole, userProfile, loading } = useUser();
  
  // Show loading while user profile is being fetched
  if (loading || !userProfile) {
    return <LoadingSpinner />;
  }
  
  console.log('🔄 SignInRouteHandler - Checking user role:', {
    userRole,
    userType: userProfile?.userType
  });
  
  // Redirect ALL users (caregivers, doctors, and admins) to service provider dashboard
  // This allows admins to access caregiver functionality when using the caregiver portal
  if (userRole === 'caregiver' || userRole === 'doctor' || userRole === 'admin') {
    console.log('🚀 Redirecting user to /service-provider (caregiver portal)');
    return <Navigate to="/service-provider" replace />;
  }
  
  // For other users (clients, elderly), show message that this is for caregivers
  console.log('✅ Client/elderly accessing caregiver portal, redirecting to home');
  return <Navigate to="/" replace />;
}

// Role-based dashboard routing component
function RoleBasedDashboardRoute() {
  const { userRole, userProfile, loading } = useUser();
  
  // Show loading while user profile is being fetched
  if (loading || !userProfile) {
    return <LoadingSpinner />;
  }
  
  console.log('🔄 RoleBasedDashboardRoute - Checking user role:', {
    userRole,
    userType: userProfile?.userType,
    redirecting: userRole === 'caregiver' || userRole === 'doctor'
  });
  
  // Check for admin session override
  const hasAdminSession = sessionStorage.getItem('elderx_admin_session') === 'true';
  
  // Redirect admins to admin dashboard
  if (userRole === 'admin' || hasAdminSession) {
    console.log('🚀 Redirecting admin to /admin');
    return <Navigate to="/admin" replace />;
  }
  
  // Redirect caregivers and doctors to service provider dashboard (unless they have admin session)
  if ((userRole === 'caregiver' || userRole === 'doctor') && !hasAdminSession) {
    console.log('🚀 Redirecting service provider to /service-provider');
    return <Navigate to="/service-provider" replace />;
  }
  
  // Default to client dashboard for elderly/client users
  console.log('✅ Showing client dashboard for role:', userRole);
  return <Layout />;
}


export default App;

// Small component that runs inside UserProvider to read context safely
function OnboardingGuardedLayout() {
  // Import hook normally; component is rendered under <UserProvider>
  const { isOnboardingIncomplete, userProfile, getCaregiverOnboardingRoute, user, loading } = useUser();
  
  console.log('🔍 OnboardingGuardedLayout Debug:', {
    user: user?.uid,
    userProfile: userProfile,
    userType: userProfile?.userType,
    isIncomplete: isOnboardingIncomplete(),
    loading: loading
  });
  
  // Show loading while user profile is being fetched
  if (loading || (user && !userProfile)) {
    console.log('⏳ Loading user profile...');
    return <LoadingSpinner />;
  }
  
  if (isOnboardingIncomplete()) {
    // IMPORTANT: Check userProfile exists before checking userType
    if (userProfile && userProfile.userType === 'caregiver') {
      const caregiverRoute = getCaregiverOnboardingRoute();
      console.log('🔄 Redirecting CAREGIVER to:', caregiverRoute);
      return <Navigate to={caregiverRoute} replace />;
    }
    // Redirect clients/elderly to client onboarding
    console.log('🔄 Redirecting PATIENT to onboarding, userType:', userProfile?.userType);
    return <Navigate to="/onboarding/profile" replace />;
  }
  
  console.log('✅ Onboarding complete, showing layout');
  return <Layout />;
}

// Caregiver-specific onboarding guard
function CaregiverOnboardingGuard() {
  const { userProfile, getCaregiverOnboardingRoute } = useUser();
  
  // Only allow access if caregiver has completed onboarding
  if (userProfile?.userType === 'caregiver' && !userProfile?.onboardingComplete) {
    const caregiverRoute = getCaregiverOnboardingRoute();
    console.log('🚫 Caregiver onboarding incomplete, redirecting to:', caregiverRoute);
    return <Navigate to={caregiverRoute} replace />;
  }
  
  console.log('✅ Caregiver onboarding complete, showing caregiver layout');
  return <CaregiverLayout />;
}

// Strict caregiver guard with immediate redirect
function StrictCaregiverGuard() {
  const { userProfile, user, loading } = useUser();
  
  // CRITICAL: If no user is authenticated, redirect to login immediately
  if (!user) {
    console.log('🚫 STRICT: No authenticated user - redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Show loading while profile loads
  if (loading || !userProfile) {
    return <LoadingSpinner />;
  }
  
  console.log('🔍 StrictCaregiverGuard Check:', {
    userType: userProfile?.userType,
    onboardingComplete: userProfile?.onboardingComplete,
    userId: user?.uid
  });
  
  // Allow admin users to access caregiver dashboard
  if (userProfile?.userType === 'admin') {
    console.log('✅ Admin access granted to caregiver dashboard');
    return <CaregiverLayout />;
  }
  
  // Force onboarding for incomplete caregivers
  if (userProfile?.userType === 'caregiver' && !userProfile?.onboardingComplete) {
    console.log('🚫 STRICT: Caregiver onboarding required - forcing redirect');
    window.location.replace('/caregiver/onboarding');
    return <LoadingSpinner />;
  }
  
  // Allow access to caregiver dashboard for complete caregivers
  if (userProfile?.userType === 'caregiver') {
    console.log('✅ Caregiver access granted to caregiver dashboard');
    return <CaregiverLayout />;
  }
  
  // Allow doctors to access caregiver dashboard
  if (userProfile?.userType === 'doctor') {
    console.log('✅ Doctor access granted to caregiver dashboard');
    return <CaregiverLayout />;
  }
  
  // Redirect other user types to their appropriate dashboard
  console.log('🚫 Access denied: Invalid user type for caregiver dashboard - redirecting to dashboard');
  return <Navigate to="/dashboard" replace />;
}

// Service Provider Guard - ensures only authenticated doctors and caregivers can access
function ServiceProviderGuard() {
  const { userProfile, user, loading } = useUser();
  
  // CRITICAL: If no user is authenticated, redirect to login immediately
  if (!user) {
    console.log('🚫 SERVICE PROVIDER: No authenticated user - redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Show loading while profile loads
  if (loading || !userProfile) {
    return <LoadingSpinner />;
  }
  
  console.log('🔍 ServiceProviderGuard Check:', {
    userType: userProfile?.userType,
    onboardingComplete: userProfile?.onboardingComplete,
    userId: user?.uid
  });
  
  // Allow admin users to access service provider dashboard
  if (userProfile?.userType === 'admin') {
    console.log('✅ Admin access granted to service provider dashboard');
    return <ServiceProviderLayout />;
  }
  
  // Allow doctors to access service provider dashboard
  if (userProfile?.userType === 'doctor') {
    console.log('✅ Doctor access granted to service provider dashboard');
    return <ServiceProviderLayout />;
  }
  
  // Allow caregivers to access service provider dashboard (after onboarding)
  if (userProfile?.userType === 'caregiver') {
    if (!userProfile?.onboardingComplete) {
      console.log('🚫 SERVICE PROVIDER: Caregiver onboarding required - redirecting to onboarding');
      window.location.replace('/caregiver/onboarding');
      return <LoadingSpinner />;
    }
    console.log('✅ Caregiver access granted to service provider dashboard');
    return <ServiceProviderLayout />;
  }
  
  // Redirect other user types to their appropriate dashboard
  console.log('🚫 Access denied: Invalid user type for service provider dashboard - redirecting to dashboard');
  return <Navigate to="/dashboard" replace />;
}
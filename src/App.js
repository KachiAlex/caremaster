import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import { UserProvider, useUser } from './contexts/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import errorHandler from './utils/errorHandler';
import logger from './utils/logger';
import securityMonitoringService from './services/securityMonitoringService';
import biometricAuthService from './services/biometricAuthService';
import secureConfigService from './services/secureConfigService';
import Layout from './components/Layout';
// Old admin components removed - using new admin system
import ServiceProviderLayout from './components/ServiceProviderLayout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import VitalSigns from './pages/VitalSigns';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import CaregiverDashboard from './pages/CaregiverDashboard';
import PreclinicCaregiverDashboard from './pages/PreclinicCaregiverDashboard';
import CaregiverSchedule from './pages/CaregiverSchedule';
import CaregiverPatients from './pages/CaregiverPatients';
import CaregiverTasks from './pages/CaregiverTasks';
import CaregiverOnboarding from './pages/CaregiverOnboarding';
import CaregiverMessages from './pages/CaregiverMessages';
import CaregiverNavigation from './pages/CaregiverNavigation';
import CaregiverPhotos from './pages/CaregiverPhotos';
import CaregiverPerformance from './pages/CaregiverPerformance';
import CaregiverEmergency from './pages/CaregiverEmergency';
import CaregiverSettings from './pages/CaregiverSettings';
import Telemedicine from './pages/Telemedicine';
import CaregiverLayout from './components/CaregiverLayout';
import Messages from './pages/Messages';
import Subscription from './pages/Subscription';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
// All onboarding is now integrated into Auth.js
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminReports from './pages/AdminReports';
import AdminAppointments from './pages/AdminAppointments';
import AdminSettings from './pages/AdminSettings';
import AdminEmergency from './pages/AdminEmergency';
import AdminEmergencyProtocols from './pages/AdminEmergencyProtocols';
import AdminMedications from './pages/AdminMedications';
import AdminMedicationAnalytics from './pages/AdminMedicationAnalytics';
import AdminCaregivers from './pages/AdminCaregivers';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminCommunication from './pages/AdminCommunication';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminPatientAssignments from './pages/AdminPatientAssignments';
import AdminUserVerification from './pages/AdminUserVerification';
import SystemStatus from './pages/SystemStatus';
import MedicalDocuments from './pages/MedicalDocuments';
import AdminPatientDatabase from './pages/AdminPatientDatabase';
import AdminCaregiverManagement from './pages/AdminCaregiverManagement';
import NewAdminLogin from './pages/NewAdminLogin';
import NewAdminDashboard from './pages/NewAdminDashboard';
import ServiceProviderDashboard from './pages/ServiceProviderDashboard';
import UserManagement from './pages/UserManagement';
import CallsPage from './pages/CallsPage';
import WebRTCTest from './pages/WebRTCTest';
import MessagingInterface from './components/MessagingInterface';
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

  // Voice command handlers
  const handleVoiceCommand = (command, params) => {
    console.log('Voice command received:', command, params);
    
    switch (command) {
      case 'call':
        // Navigate to calls page
        window.location.href = '/service-provider/calls';
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
          if (navText.includes('patient')) {
            window.location.href = '/service-provider/patients';
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
      
      {/* Protected routes - Dashboard removed (patients don't have accounts) */}
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
        <Route path="messages" element={<MessagingInterface />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="tasks" element={<CaregiverTasks />} />
        <Route path="care-logs" element={<CaregiverPhotos />} />
        <Route path="photos" element={<CaregiverPhotos />} />
        <Route path="activities" element={<CaregiverPerformance />} />
        <Route path="medical-records" element={<CaregiverPatients />} />
        <Route path="prescriptions" element={<Medications />} />
        <Route path="consultations" element={<Appointments />} />
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
      
      {/* Admin Dashboard Route */}
      <Route 
        path="/admin/dashboard" 
        element={<AdminGuardedRoute><NewAdminDashboard /></AdminGuardedRoute>} 
      />
      
      {/* Admin Root Redirect - always send to admin login to enforce session */}
      <Route 
        path="/admin" 
        element={<Navigate to="/admin/login" replace />} 
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
  
  // For other users (patients, elderly), show message that this is for caregivers
  console.log('✅ Patient/elderly accessing caregiver portal, redirecting to home');
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
  
  // Default to patient dashboard for elderly/patient users
  console.log('✅ Showing patient dashboard for role:', userRole);
  return <Layout />;
}

// Admin Guard Component to prevent redirects
function AdminGuardedRoute({ children }) {
  const isAdminAuthenticated = localStorage.getItem('elderx_admin_authenticated') === 'true';
  
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Set session flag to prevent other guards from interfering
  sessionStorage.setItem('elderx_admin_session', 'true');
  
  return children;
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
    // Redirect patients/elderly to patient onboarding
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
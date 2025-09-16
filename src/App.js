import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import { UserProvider } from './contexts/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import errorHandler from './utils/errorHandler';
import logger from './utils/logger';
import securityMonitoringService from './services/securityMonitoringService';
import biometricAuthService from './services/biometricAuthService';
import secureConfigService from './services/secureConfigService';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ServiceProviderLayout from './components/ServiceProviderLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import VitalSigns from './pages/VitalSigns';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import CaregiverDashboard from './pages/CaregiverDashboard';
import CaregiverSchedule from './pages/CaregiverSchedule';
import CaregiverPatients from './pages/CaregiverPatients';
import CaregiverTasks from './pages/CaregiverTasks';
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
import OnboardingProfile from './pages/OnboardingProfile';
import OnboardingMedical from './pages/OnboardingMedical';
import CaregiverOnboardingCareer from './pages/CaregiverOnboardingCareer';
import CaregiverOnboardingQualifications from './pages/CaregiverOnboardingQualifications';
import CaregiverOnboardingReferences from './pages/CaregiverOnboardingReferences';
import CaregiverOnboardingDocuments from './pages/CaregiverOnboardingDocuments';
import CaregiverOnboardingStatement from './pages/CaregiverOnboardingStatement';
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
import ServiceProviderDashboard from './pages/ServiceProviderDashboard';
import UserManagement from './pages/UserManagement';
import CallsPage from './pages/CallsPage';
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
      {/* Onboarding routes */}
      <Route path="/onboarding/profile" element={<OnboardingProfile />} />
      <Route path="/onboarding/medical" element={<OnboardingMedical />} />
      
      {/* Caregiver onboarding routes */}
      <Route path="/caregiver/onboarding/career" element={<CaregiverOnboardingCareer />} />
      <Route path="/caregiver/onboarding/qualifications" element={<CaregiverOnboardingQualifications />} />
      <Route path="/caregiver/onboarding/references" element={<CaregiverOnboardingReferences />} />
      <Route path="/caregiver/onboarding/documents" element={<CaregiverOnboardingDocuments />} />
      <Route path="/caregiver/onboarding/statement" element={<CaregiverOnboardingStatement />} />
      {/* Public routes */}
      <Route 
        path="/" 
        element={<Landing />} 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/dashboard" replace /> : <Signup />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={user ? (<OnboardingGuardedLayout />) : <Navigate to="/login" replace />} 
      >
        <Route index element={<Dashboard />} />
      </Route>
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
        element={user ? <CaregiverLayout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<CaregiverDashboard />} />
        <Route path="schedule" element={<CaregiverSchedule />} />
        <Route path="patients" element={<CaregiverPatients />} />
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
        element={user ? <ServiceProviderLayout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<ServiceProviderDashboard />} />
        <Route path="schedule" element={<CaregiverSchedule />} />
        <Route path="patients" element={<CaregiverPatients />} />
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
      
      {/* Secret Admin Login Route */}
      <Route 
        path="/admin/login" 
        element={user ? <Navigate to="/admin" replace /> : <AdminLogin />} 
      />
      
      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={user ? <AdminLayout /> : <Navigate to="/admin/login" replace />} 
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="user-management" element={<UserManagement />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="emergency" element={<AdminEmergency />} />
        <Route path="emergency/protocols" element={<AdminEmergencyProtocols />} />
        <Route path="medications" element={<AdminMedications />} />
        <Route path="medications/analytics" element={<AdminMedicationAnalytics />} />
        <Route path="caregivers" element={<AdminCaregivers />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="communication" element={<AdminCommunication />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;

// Small component that runs inside UserProvider to read context safely
function OnboardingGuardedLayout() {
  // Import hook normally; component is rendered under <UserProvider>
  const { useUser } = require('./contexts/UserContext');
  const { isOnboardingIncomplete } = useUser();
  return isOnboardingIncomplete() ? (
    <Navigate to="/onboarding/profile" replace />
  ) : (
    <Layout />
  );
}
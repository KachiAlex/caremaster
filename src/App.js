import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import { UserProvider } from './contexts/UserContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ServiceProviderLayout from './components/ServiceProviderLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
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
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <UserProvider>
      <Routes>
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
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
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
        <Route path="messages" element={<CaregiverMessages />} />
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
      
      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={user ? <AdminLayout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
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
  );
}

export default App;
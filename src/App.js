import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import VitalSigns from './pages/VitalSigns';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <Landing />} 
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
        path="/profile" 
        element={user ? <Layout /> : <Navigate to="/login" replace />} 
      >
        <Route index element={<Profile />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

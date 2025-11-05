import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import { Pill, LogOut, Building2, Bell } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import PharmacyTab from '../components/PharmacyTab';

const InstitutionPharmacyDashboard = () => {
  const { user, userProfile, institutionId, institutionData } = useUser();
  const navigate = useNavigate();
  const [assignedClients, setAssignedClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is a pharmacist
  const isPharmacist = userProfile?.role === 'pharmacist' ||
                       userProfile?.userType === 'pharmacist' || 
                       userProfile?.type === 'pharmacist' ||
                       userProfile?.medicalQualification === 'pharmacist';

  useEffect(() => {
    // Redirect if not a pharmacist
    if (userProfile && !isPharmacist) {
      toast.error('Access denied. This dashboard is for pharmacists only.');
      navigate('/');
      return;
    }

    // Validate tab session for role conflicts
    if (userProfile && user) {
      const userRole = userProfile.userType || userProfile.type || userProfile.role;
      const validation = sessionManager.validateTabSession(user, userRole);
      
      if (validation.needsInit) {
        // First load - set tab session
        sessionManager.setTabSession(userRole, user.uid, institutionId);
      } else if (!validation.valid) {
        // Session conflict detected
        sessionManager.handleSessionConflict(validation, navigate, toast);
        return;
      }
    }

    // Load assigned clients
    if (user?.uid && institutionId) {
      loadAssignedClients();
    }
  }, [user, userProfile, institutionId, isPharmacist, navigate]);

  const loadAssignedClients = async () => {
    try {
      setLoading(true);
      console.log('🔍 Pharmacy Dashboard - Loading clients for pharmacist UID:', user.uid);
      console.log('🔍 Pharmacy Dashboard - User profile:', userProfile);
      
      // First try the assignment API (new method)
      const { assignmentAPI } = await import('../api/assignmentAPI');
      let clients = await assignmentAPI.getAssignedClients(user.uid);
      console.log('📋 Assignment API returned clients:', clients.length);
      
      // If no clients found, try the old method (direct client assignment)
      if (clients.length === 0) {
        console.log('🔄 No clients from assignment API, trying direct client assignment...');
        const { collection: firestoreCollection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        
        const clientsQuery = query(
          firestoreCollection(db, 'clients'),
          where('assignedPharmacistId', '==', user.uid),
          where('institutionId', '==', institutionId)
        );
        
        const querySnapshot = await getDocs(clientsQuery);
        clients = [];
        
        querySnapshot.forEach((doc) => {
          clients.push({
            id: doc.id,
            ...doc.data()
          });
        });
        console.log('📋 Direct assignment method returned clients:', clients.length);
      }
      
      setAssignedClients(clients);
      console.log('📋 Final loaded assigned clients for pharmacist:', clients.length);
      console.log('📋 Client details:', clients);
    } catch (error) {
      console.error('Error loading assigned clients:', error);
      toast.error('Failed to load assigned clients');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      sessionManager.clearTabSession();
      const auth = getAuth();
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/institution-login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pharmacy dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isPharmacist) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Pill className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Pharmacy Dashboard
                </h1>
                <p className="text-xs text-gray-600">
                  {institutionData?.name || 'Institution'}
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              {/* Institution Info */}
              <div className="hidden md:flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-700">
                  {institutionData?.name || 'Institution'}
                </span>
              </div>

              {/* Notifications */}
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-3 bg-gray-50 px-3 py-2 rounded-lg">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {userProfile?.name || userProfile?.displayName || 'Pharmacist'}
                  </p>
                  <p className="text-xs text-gray-600">Pharmacist</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {(userProfile?.name || userProfile?.displayName || 'P').charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PharmacyTab
          user={user}
          userProfile={userProfile}
          institutionId={institutionId}
          assignedClients={assignedClients}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} Care Master - Pharmacy Management System</p>
            <p className="mt-1">Professional medication management and dispensing</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InstitutionPharmacyDashboard;


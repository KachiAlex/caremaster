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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 shadow-lg shadow-emerald-500/40">
              <Pill className="h-4 w-4 text-slate-950" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Institution pharmacy
              </p>
              <h1 className="truncate text-sm font-semibold text-slate-50 sm:text-base">
                {institutionData?.name || 'UltimateCare pharmacy workspace'}
              </h1>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] text-slate-300 md:flex">
              <Building2 className="h-3.5 w-3.5 text-sky-300" />
              <span className="truncate">{institutionData?.name || 'Institution'}</span>
            </div>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 text-slate-950 text-xs font-semibold">
                {(userProfile?.name || userProfile?.displayName || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-xs font-medium text-slate-100">
                  {userProfile?.name || userProfile?.displayName || 'Pharmacist'}
                </p>
                <p className="text-[10px] text-slate-400">Pharmacist</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="hidden items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-900 sm:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <PharmacyTab
          user={user}
          userProfile={userProfile}
          institutionId={institutionId}
          assignedClients={assignedClients}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-[11px] text-slate-400 sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} UltimateCare · Medication management and dispensing
            workspace
          </p>
        </div>
      </footer>
    </div>
  );
};

export default InstitutionPharmacyDashboard;


import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import { Pill, Building2, Bell } from 'lucide-react';
import { toast } from 'react-toastify';
import PharmacyTab from '../components/PharmacyTab';
import UserAvatarDropdown from '../components/UserAvatarDropdown';
import { fetchLicenseStatus } from '../services/licenseService';
import { signOut, getAuth } from 'backend/auth';

const InstitutionPharmacyDashboard = () => {
  const { user, userProfile, institutionId: contextInstitutionId, institutionData } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [assignedClients, setAssignedClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get institutionId from URL params, context, or profile (in that order)
  const institutionId = useMemo(() => {
    return searchParams.get('institution') || 
           contextInstitutionId || 
           userProfile?.institutionId || 
           null;
  }, [searchParams, contextInstitutionId, userProfile?.institutionId]);

  // Check if user is a pharmacist
  const isPharmacist = userProfile?.role === 'pharmacist' ||
                       userProfile?.userType === 'pharmacist' || 
                       userProfile?.type === 'pharmacist' ||
                       userProfile?.medicalQualification === 'pharmacist';

  useEffect(() => {
    const initializeDashboard = async () => {
      // Redirect if not a pharmacist
      if (userProfile && !isPharmacist) {
        toast.error('Access denied. This dashboard is for pharmacists only.');
        navigate('/');
        return;
      }

      // CRITICAL: Check institution license before allowing any access
      if (institutionId) {
        try {
          console.log('🔍 Checking institution license for pharmacist access...');
          const licenseStatus = await fetchLicenseStatus(institutionId);
          
          if (!licenseStatus.active) {
            console.warn('⛔ Institution license inactive:', licenseStatus.reason);
            toast.error(`Access denied. Institution license is ${licenseStatus.reason || 'inactive'}. Please contact your administrator.`);
            signOut(getAuth()).then(() => {
              navigate(`/license-required?institution=${institutionId}`, { replace: true });
            });
            return;
          }
          console.log('✅ Institution license verified for pharmacist');
        } catch (licenseError) {
          console.error('❌ License check error:', licenseError);
          toast.error('Unable to verify institution license. Access denied.');
          signOut(getAuth()).then(() => {
            navigate(`/license-required?institution=${institutionId}`, { replace: true });
          });
          return;
        }
      }

      // Validate tab session for role conflicts
      if (userProfile && user) {
        const userRole = userProfile.userType || userProfile.type || userProfile.role || 'pharmacist';
        const validation = sessionManager.validateTabSession(user, userRole);
        
        if (validation.needsInit) {
          // First load - set tab session with institutionId from URL if available
          const effectiveInstitutionId = institutionId || searchParams.get('institution');
          sessionManager.setTabSession(userRole, user.uid, effectiveInstitutionId);
          
          // If institutionId was in URL but not in profile, update Database
          if (effectiveInstitutionId && !userProfile.institutionId) {
            console.log('🔄 Updating profile with institutionId from URL...');
            try {
              const { doc, updateDoc } = await import('backend/database');
              const { db } = await import('../backend/config');
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { institutionId: effectiveInstitutionId });
              console.log('✅ Updated profile with institutionId:', effectiveInstitutionId);
              // Reload profile after a short delay
              setTimeout(() => {
                window.location.reload();
              }, 500);
              return;
            } catch (error) {
              console.error('❌ Failed to update institutionId:', error);
            }
          }
        } else if (!validation.valid) {
          // Session conflict detected
          sessionManager.handleSessionConflict(validation, navigate, toast);
          return;
        }
      }

      // Load assigned clients
      if (user?.uid && institutionId) {
        loadAssignedClients();
      } else if (user?.uid && !institutionId) {
        // InstitutionId missing - show error
        setLoading(false);
        toast.error('Institution ID is required. Please contact support.');
      }
    };

    initializeDashboard();
  }, [user, userProfile, institutionId, isPharmacist, navigate, searchParams]);

  const loadAssignedClients = async () => {
    try {
      setLoading(true);
      console.log('🔍 Pharmacy Dashboard - Loading clients for pharmacist UID:', user.uid);
      console.log('🔍 Pharmacy Dashboard - Institution ID:', institutionId);
      console.log('🔍 Pharmacy Dashboard - User profile:', userProfile);
      
      // Pharmacists should see ALL clients in their institution (not just assigned ones)
      // This allows them to access prescriptions for any client
      if (!institutionId) {
        console.warn('⚠️ No institutionId provided, cannot load clients');
        setAssignedClients([]);
        return;
      }
      
      // Load all clients from the institution
      // Try getClientsByInstitution first, fall back to getAllClients if needed
      let clients = [];
      try {
        const { getClientsByInstitution } = await import('../api/patientsAPI');
        clients = await getClientsByInstitution(institutionId);
        console.log('📋 Institution clients loaded:', clients.length);
      } catch (error) {
        console.warn('⚠️ Error loading clients with getClientsByInstitution, trying getAllClients:', error);
        try {
          const { getAllClients } = await import('../api/patientsAPI');
          clients = await getAllClients(institutionId);
          console.log('📋 getAllClients returned clients:', clients.length);
        } catch (fallbackError) {
          console.error('❌ Error with getAllClients fallback:', fallbackError);
          // Try direct query as last resort
          const { collection: databaseCollection, query, where, getDocs } = await import('backend/database');
          const { db } = await import('../backend/config');
          
          const clientsQuery = query(
            databaseCollection(db, 'clients'),
            where('institutionId', '==', institutionId)
          );
          
          const querySnapshot = await getDocs(clientsQuery);
          querySnapshot.forEach((doc) => {
            clients.push({
              id: doc.id,
              ...doc.data()
            });
          });
          console.log('📋 Direct query returned clients:', clients.length);
        }
      }
      
      // Filter out any archived or inactive clients if needed
      clients = clients.filter(client => {
        // Include active clients and those without explicit status
        return client.status !== 'archived' && client.status !== 'inactive';
      });
      
      setAssignedClients(clients);
      console.log('📋 Final loaded clients for pharmacist:', clients.length);
      console.log('📋 Client details:', clients.map(c => ({ id: c.id, name: c.name || c.fullName })));
      
      if (clients.length === 0) {
        console.warn('⚠️ No clients found for institution:', institutionId);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients. Please try refreshing the page.');
      
      // Set empty array on error
      setAssignedClients([]);
    } finally {
      setLoading(false);
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

              {/* User Profile with Dropdown */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {userProfile?.name || userProfile?.displayName || 'Pharmacist'}
                  </p>
                  <p className="text-xs text-gray-600">Pharmacist</p>
                </div>
                <UserAvatarDropdown
                  userProfile={userProfile}
                  user={user}
                  profileImageUrl={userProfile?.photoURL || userProfile?.profilePictureUrl}
                  size="md"
                />
              </div>
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


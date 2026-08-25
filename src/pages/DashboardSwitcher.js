import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Stethoscope,
  Users,
  Pill,
  ChevronDown,
  CheckCircle,
  Heart
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { setTabSession } from '../utils/sessionManager';

/**
 * Derive the active dashboard key from the current URL pathname.
 * This ensures the switcher always shows the correct label for the
 * page the user is on, regardless of what role their userProfile says.
 */
const ACTIVE_ROLE_KEY = 'Care_Master_active_dashboard_role';

const getDashboardFromPath = (location) => {
  const pathname = location.pathname;
  if (pathname.startsWith('/institution-admin')) return 'admin';
  if (pathname.startsWith('/institution-pharmacist')) return 'pharmacist';
  if (pathname.startsWith('/institution-pharmacy')) return 'pharmacist';
  if (pathname.startsWith('/institution-caregiver')) {
    // doctor / nurse / caregiver all share this path.
    // First check URL ?role= param (most reliable), then fall back to sessionStorage.
    const params = new URLSearchParams(location.search);
    const urlRole = params.get('role');
    if (urlRole && ['doctor', 'nurse', 'caregiver'].includes(urlRole)) return urlRole;
    const stored = sessionStorage.getItem(ACTIVE_ROLE_KEY);
    if (stored && ['doctor', 'nurse', 'caregiver'].includes(stored)) return stored;
    return 'caregiver';
  }
  if (pathname.startsWith('/dashboard')) return 'client';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/service-provider')) return 'caregiver';
  return null;
};

const DashboardSwitcher = ({ userRoles = [], currentDashboard: propDashboard, institutionId, onSwitch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // Sync stored role preference when landing on non-shared paths
  // so the switcher always reflects the current page.
  useEffect(() => {
    const urlDash = getDashboardFromPath(location);
    if (urlDash && urlDash !== 'caregiver') {
      sessionStorage.setItem(ACTIVE_ROLE_KEY, urlDash);
    }
  }, [location.pathname]);

  // Dashboard configuration
  const dashboards = {
    admin: {
      label: 'Admin Dashboard',
      icon: Shield,
      color: 'red',
      path: '/institution-admin/dashboard'
    },
    doctor: {
      label: 'Doctor Dashboard',
      icon: Stethoscope,
      color: 'blue',
      path: '/institution-caregiver/dashboard'
    },
    nurse: {
      label: 'Nurse Dashboard',
      icon: Users,
      color: 'green',
      path: '/institution-caregiver/dashboard'
    },
    caregiver: {
      label: 'Caregiver Dashboard',
      icon: Users,
      color: 'purple',
      path: '/institution-caregiver/dashboard'
    },
    pharmacist: {
      label: 'Pharmacist Dashboard',
      icon: Pill,
      color: 'amber',
      path: '/institution-pharmacist/dashboard'
    },
    client: {
      label: 'Patient Dashboard',
      icon: Heart,
      color: 'pink',
      path: '/dashboard'
    }
  };

  // Determine active dashboard from URL first, then fall back to prop
  const urlDashboard = getDashboardFromPath(location);
  const activeDashboard = urlDashboard || propDashboard || 'admin';

  // Get available dashboards based on user roles
  const availableDashboards = userRoles
    .filter(role => dashboards[role])
    .map(role => ({
      role,
      ...dashboards[role]
    }));

  // Don't show switcher if user only has one role
  if (availableDashboards.length <= 1) {
    return null;
  }

  const currentDashboardConfig = dashboards[activeDashboard] || availableDashboards[0];
  const CurrentIcon = currentDashboardConfig.icon;

  const handleSwitch = (dashboardRole, dashboardPath) => {
    setIsOpen(false);

    // Update the tab session to the new role BEFORE navigating.
    // This prevents the destination dashboard's validateTabSession
    // from seeing a role mismatch and redirecting back.
    if (user?.uid) {
      setTabSession(dashboardRole, user.uid, institutionId);
      console.log(`🔄 Dashboard switch: tab session updated to ${dashboardRole}`);
    }

    // Remember which role the user explicitly chose so the switcher
    // can highlight the right label even when multiple roles share one URL.
    sessionStorage.setItem(ACTIVE_ROLE_KEY, dashboardRole);

    // Build navigation path. For shared caregiver path, add ?role= so
    // each role gets a unique URL and React Router re-renders properly.
    let path = dashboardPath;
    const params = new URLSearchParams();
    if (institutionId) {
      params.set('institution', institutionId);
    }
    if (dashboardPath === '/institution-caregiver/dashboard') {
      params.set('role', dashboardRole);
    }
    if (params.toString()) {
      path = `${dashboardPath}?${params.toString()}`;
    }

    // Call onSwitch callback if provided
    if (onSwitch) {
      onSwitch(dashboardRole);
    }

    // Navigate to the selected dashboard — no reload needed
    navigate(path, { replace: true });
  };

  return (
    <div className="relative">
      {/* Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 bg-white border-2 border-${currentDashboardConfig.color}-200 rounded-lg hover:border-${currentDashboardConfig.color}-400 transition-all shadow-sm`}
      >
        <CurrentIcon className={`h-5 w-5 text-${currentDashboardConfig.color}-600`} />
        <span className="text-sm font-semibold text-gray-700">
          {currentDashboardConfig.label}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 border-b border-gray-100 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Switch Dashboard
                </p>
              </div>
              
              {availableDashboards.map((dashboard) => {
                const DashboardIcon = dashboard.icon;
                const isActive = dashboard.role === activeDashboard;

                return (
                  <button
                    key={dashboard.role}
                    onClick={() => handleSwitch(dashboard.role, dashboard.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all mb-1 ${
                      isActive
                        ? `bg-${dashboard.color}-50 border-2 border-${dashboard.color}-200`
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${dashboard.color}-100`}>
                        <DashboardIcon className={`h-4 w-4 text-${dashboard.color}-600`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${
                          isActive ? `text-${dashboard.color}-700` : 'text-gray-700'
                        }`}>
                          {dashboard.label}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{dashboard.role}</p>
                      </div>
                    </div>
                    {isActive && (
                      <CheckCircle className={`h-5 w-5 text-${dashboard.color}-600`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <LayoutDashboard className="h-4 w-4 text-gray-500" />
                <p className="text-xs text-gray-600">
                  You have access to <span className="font-semibold">{availableDashboards.length}</span> dashboards
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardSwitcher;


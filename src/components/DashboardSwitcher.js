import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  Stethoscope, 
  Users, 
  Pill,
  ChevronDown,
  CheckCircle
} from 'lucide-react';

const DashboardSwitcher = ({ userRoles = [], currentDashboard, institutionId, onSwitch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
    }
  };

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

  const currentDashboardConfig = dashboards[currentDashboard] || availableDashboards[0];
  const CurrentIcon = currentDashboardConfig.icon;

  const handleSwitch = (dashboardRole, dashboardPath) => {
    setIsOpen(false);
    
    // Add institution parameter if available
    const path = institutionId 
      ? `${dashboardPath}?institution=${institutionId}`
      : dashboardPath;
    
    // Call onSwitch callback if provided
    if (onSwitch) {
      onSwitch(dashboardRole);
    }
    
    // Navigate to the selected dashboard
    navigate(path);
    
    // Reload the page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="relative">
      {/* Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-ink/12 rounded-full hover:border-ink/25 transition-all shadow-sm"
      >
        <CurrentIcon className="h-5 w-5 text-gold-deep" />
        <span className="text-sm font-semibold text-ink">
          {currentDashboardConfig.label}
        </span>
        <ChevronDown className={`h-4 w-4 text-text-soft transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
          <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-lg border border-ink/8 z-50 overflow-hidden cm-animate-in">
            <div className="p-2">
              <div className="px-3 py-2 border-b border-ink/8 mb-2">
                <p className="cm-mono text-[10px] uppercase tracking-[0.12em] text-text-soft">
                  Switch Dashboard
                </p>
              </div>

              {availableDashboards.map((dashboard) => {
                const DashboardIcon = dashboard.icon;
                const isActive = dashboard.role === currentDashboard;

                return (
                  <button
                    key={dashboard.role}
                    onClick={() => handleSwitch(dashboard.role, dashboard.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all mb-1 ${
                      isActive
                        ? 'bg-sand border border-sand-deep'
                        : 'hover:bg-cream border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-cream">
                        <DashboardIcon className="h-4 w-4 text-gold-deep" />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${
                          isActive ? 'text-ink' : 'text-text'
                        }`}>
                          {dashboard.label}
                        </p>
                        <p className="text-xs text-text-soft capitalize">{dashboard.role}</p>
                      </div>
                    </div>
                    {isActive && (
                      <CheckCircle className="h-5 w-5 text-sage" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="px-4 py-3 bg-cream border-t border-ink/8">
              <div className="flex items-center space-x-2">
                <LayoutDashboard className="h-4 w-4 text-text-soft" />
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


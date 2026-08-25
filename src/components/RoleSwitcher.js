import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  HeartPulse,
  Stethoscope,
  Pill,
  User,
  Home,
  Building2,
  ChevronDown,
  Check,
  Repeat
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const roleMeta = {
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-purple-600'
  },
  institutionAdmin: {
    label: 'Institution Admin',
    icon: Building2,
    color: 'text-indigo-600'
  },
  caregiver: {
    label: 'Caregiver',
    icon: HeartPulse,
    color: 'text-rose-600'
  },
  doctor: {
    label: 'Doctor',
    icon: Stethoscope,
    color: 'text-teal-600'
  },
  nurse: {
    label: 'Nurse',
    icon: HeartPulse,
    color: 'text-pink-600'
  },
  pharmacist: {
    label: 'Pharmacist',
    icon: Pill,
    color: 'text-emerald-600'
  },
  client: {
    label: 'Client',
    icon: User,
    color: 'text-blue-600'
  },
  elderly: {
    label: 'Client',
    icon: User,
    color: 'text-blue-600'
  },
  student: {
    label: 'User',
    icon: Home,
    color: 'text-gray-600'
  }
};

const roleRoutes = {
  admin: '/institution-admin/dashboard',
  institutionAdmin: '/institution-admin/dashboard',
  caregiver: '/service-provider',
  doctor: '/service-provider',
  nurse: '/service-provider',
  pharmacist: '/institution-pharmacy/dashboard',
  client: '/dashboard',
  elderly: '/dashboard',
  student: '/dashboard'
};

const RoleSwitcher = () => {
  const { userRoles, activeRole, switchRole } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSwitch = (role) => {
    if (role === activeRole) {
      setOpen(false);
      return;
    }
    if (switchRole(role)) {
      const route = roleRoutes[role] || '/dashboard';
      setOpen(false);
      navigate(route, { replace: true });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide if user has only one role
  if (!userRoles || userRoles.length <= 1) return null;

  const currentMeta = roleMeta[activeRole] || roleMeta.student;
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Switch role"
        aria-expanded={open}
      >
        <CurrentIcon className={`h-4 w-4 ${currentMeta.color}`} />
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">{currentMeta.label}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Switch Portal</p>
          </div>
          {userRoles.map((role) => {
            const meta = roleMeta[role] || roleMeta.student;
            const Icon = meta.icon;
            const isActive = role === activeRole;

            return (
              <button
                key={role}
                onClick={() => handleSwitch(role)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                  isActive ? 'bg-blue-50/50' : ''
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${meta.color}`} />
                <span className={`text-sm flex-1 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {meta.label}
                </span>
                {isActive && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            );
          })}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => { setOpen(false); navigate('/select-role', { replace: true }); }}
              className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <Repeat className="h-3.5 w-3.5" />
              View all portals
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;

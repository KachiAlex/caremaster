import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield,
  HeartPulse,
  Stethoscope,
  Pill,
  User,
  Home,
  ArrowRight,
  Building2,
  Clock
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import LoadingSpinner from './LoadingSpinner';

const roleMeta = {
  'super-admin': {
    label: 'Super Admin',
    description: 'Manage the entire platform, institutions, and system settings',
    icon: Shield,
    color: 'bg-red-50 text-red-700 border-red-200 hover:border-red-400',
    route: '/super-admin/dashboard'
  },
  admin: {
    label: 'System Administrator',
    description: 'Manage users, institutions, and system settings',
    icon: Shield,
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400',
    route: '/institution-admin/dashboard'
  },
  institutionAdmin: {
    label: 'Institution Admin',
    description: 'Manage your institution, staff, and operations',
    icon: Building2,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400',
    route: '/institution-admin/dashboard'
  },
  caregiver: {
    label: 'Caregiver',
    description: 'Access patient care tools, schedules, and tasks',
    icon: HeartPulse,
    color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400',
    route: '/service-provider'
  },
  doctor: {
    label: 'Doctor',
    description: 'Manage consultations, prescriptions, and patient records',
    icon: Stethoscope,
    color: 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400',
    route: '/service-provider'
  },
  nurse: {
    label: 'Nurse',
    description: 'Patient care, vitals, and medication administration',
    icon: HeartPulse,
    color: 'bg-pink-50 text-pink-700 border-pink-200 hover:border-pink-400',
    route: '/service-provider'
  },
  pharmacist: {
    label: 'Pharmacist',
    description: 'Manage prescriptions, inventory, and dispensing',
    icon: Pill,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
    route: '/institution-pharmacy/dashboard'
  },
  client: {
    label: 'Client',
    description: 'Your health dashboard, appointments, and care plan',
    icon: User,
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
    route: '/dashboard'
  },
  elderly: {
    label: 'Client',
    description: 'Your health dashboard, appointments, and care plan',
    icon: User,
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
    route: '/dashboard'
  },
  student: {
    label: 'User',
    description: 'Your dashboard and services',
    icon: Home,
    color: 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400',
    route: '/dashboard'
  }
};

const RoleGate = () => {
  const { userProfile, userRoles, activeRole, switchRole, loading } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [autoRole, setAutoRole] = useState(null);

  const redirectPath = searchParams.get('redirect') || null;
  const institutionId = userProfile?.institutionId || null;

  // Build route for a role, including institutionId when available
  const buildRoute = (role) => {
    const meta = roleMeta[role] || roleMeta.student;
    let route = meta.route;
    // For institution roles, append institutionId if available
    if (institutionId && (role === 'admin' || role === 'institutionAdmin')) {
      route = `/institution-admin/dashboard?institution=${institutionId}`;
    } else if (institutionId && role === 'pharmacist') {
      route = `/institution-pharmacy/dashboard?institution=${institutionId}`;
    } else if (institutionId && (role === 'caregiver' || role === 'doctor' || role === 'nurse')) {
      route = `/institution-caregiver/dashboard?institution=${institutionId}&role=${role}`;
    }
    return route;
  };

  useEffect(() => {
    if (loading) return;

    // Single role: auto-redirect immediately
    if (userRoles.length === 1) {
      const role = userRoles[0];
      switchRole(role);
      const target = redirectPath || buildRoute(role);
      navigate(target, { replace: true });
      return;
    }

    // Only pre-select a role if the user has explicitly chosen one before
    if (activeRole && userRoles.includes(activeRole)) {
      setAutoRole(activeRole);
    } else {
      setAutoRole(null);
    }
  }, [loading, userRoles, activeRole, navigate, redirectPath, switchRole, institutionId]);

  // Auto-redirect disabled: multi-role users must manually choose their portal

  const handleSelectRole = (role) => {
    if (!switchRole(role)) return;
    const target = redirectPath || buildRoute(role);
    navigate(target, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const displayName = userProfile?.displayName || userProfile?.firstName || userProfile?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <img src="/images/caremaster-logo.jpg" alt="Caremaster" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {displayName}</h1>
          <p className="mt-2 text-gray-600">You have access to multiple portals. Select one to continue.</p>
        </div>

        {autoRole && (
          <div className="mb-6 bg-white rounded-xl border border-blue-200 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Last used: <span className="font-semibold text-gray-900">{(roleMeta[autoRole]?.label || autoRole)}</span>
              </span>
            </div>
            <button
              onClick={() => handleSelectRole(autoRole)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
 Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {userRoles.map((role) => {
            const meta = roleMeta[role] || roleMeta.student;
            const Icon = meta.icon;
            const isAuto = autoRole === role;

            return (
              <button
                key={role}
                onClick={() => handleSelectRole(role)}
                className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${meta.color} ${
                  isAuto ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-white/80 shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{meta.label}</h3>
                    <p className="mt-1 text-sm opacity-90 leading-relaxed">{meta.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 mt-1 opacity-60" />
                </div>
                {isAuto && (
                  <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
 You can switch between portals anytime from the top navigation menu.
        </p>
      </div>
    </div>
  );
};

export default RoleGate;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Building, Shield, Stethoscope, Users } from 'lucide-react';

const PortalSwitcher = () => {
  const navigate = useNavigate();
  const { userProfile, institutionId } = useUser();

  const portals = [];
  const role = userProfile?.userType || userProfile?.type || userProfile?.role;

  // Institution portals
  if (institutionId || userProfile?.institutionId) {
    // Admin
    if (role === 'admin') {
      portals.push({
        label: 'Institution Admin',
        to: `/institution-admin/dashboard?institution=${encodeURIComponent(institutionId || userProfile?.institutionId)}`,
        icon: Shield
      });
    }
    // Care provider
    if (['doctor','caregiver','nurse','pharmacist'].includes((role||'').toLowerCase())) {
      portals.push({
        label: 'Care Provider',
        to: `/institution-caregiver/dashboard?institution=${encodeURIComponent(institutionId || userProfile?.institutionId)}`,
        icon: Stethoscope
      });
    }
  }

  // Client
  if (['client', 'elderly', 'patient'].includes((role||'').toLowerCase()) || (userProfile?.isElderly)) {
    portals.push({ label: 'Client Portal', to: '/dashboard', icon: Users });
  }

  // Super admin
  if ((role||'').toLowerCase() === 'super-admin') {
    portals.push({ label: 'Super Admin', to: '/super-admin/dashboard', icon: Building });
  }

  const go = (to) => navigate(to);

  if (portals.length === 0) return null;

  return (
    <div className="inline-flex items-center space-x-2">
      <span className="text-xs text-gray-500">Portal:</span>
      <div className="inline-flex bg-white border rounded-md overflow-hidden">
        {portals.map((p, idx) => (
          <button
            key={p.label}
            onClick={() => go(p.to)}
            className={`px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center space-x-1 ${idx>0?'border-l':''}`}
          >
            <p.icon className="h-4 w-4 text-gray-600" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PortalSwitcher;



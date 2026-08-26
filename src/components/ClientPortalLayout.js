import React, { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Heart,
  Video,
  Pill,
  FileText,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import DashboardLayout from './DashboardLayout';

const TABS = [
  { id: 'dashboard', label: 'My Dashboard', icon: Home },
  { id: 'caregivers', label: 'My Care Team', icon: Users },
  { id: 'appointments', label: 'Care Appointments', icon: Calendar },
  { id: 'vital-signs', label: 'Health Monitoring', icon: Heart },
  { id: 'telemedicine', label: 'Video Consultations', icon: Video },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'medical-documents', label: 'Medical Documents', icon: FileText },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'care-plan', label: 'Help & Support', icon: HelpCircle },
];

const TAB_TO_ROUTE = {
  dashboard: '/dashboard',
  caregivers: '/client-caregivers',
  appointments: '/appointments',
  'vital-signs': '/vital-signs',
  telemedicine: '/telemedicine',
  medications: '/medications',
  'medical-documents': '/medical-documents',
  messages: '/messages',
  'care-plan': '/subscription',
};

const ROUTE_TO_TAB = Object.fromEntries(
  Object.entries(TAB_TO_ROUTE).map(([tab, route]) => [route, tab])
);
// /client/dashboard is an alias for the dashboard
ROUTE_TO_TAB['/client/dashboard'] = 'dashboard';

const ClientPortalLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, userProfile } = useUser();

  const activeTab = ROUTE_TO_TAB[pathname] || 'dashboard';

  const displayName =
    userProfile?.name ||
    userProfile?.displayName ||
    user?.displayName ||
    user?.email ||
    'there';

  const handleTabChange = (tabId) => {
    const route = TAB_TO_ROUTE[tabId];
    if (route) {
      navigate(route);
    }
  };

  const handleLogout = () => {
    import('backend/auth').then(({ signOut, getAuth }) => {
      signOut(getAuth()).then(() => {
        window.location.href = '/login';
      });
    });
  };

  return (
    <DashboardLayout
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      institutionName="Client Portal"
      portalLabel="Client"
      displayName={displayName}
      userEmail={userProfile?.email || user?.email || ''}
      profilePictureUrl={userProfile?.photoURL || userProfile?.profilePicture}
      onLogout={handleLogout}
    >
      <Outlet />
    </DashboardLayout>
  );
};

export default ClientPortalLayout;

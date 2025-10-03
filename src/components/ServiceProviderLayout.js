import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useUser } from '../contexts/UserContext';
import NotificationPanel from './NotificationPanel';
import { 
  Home, 
  Calendar, 
  MessageCircle, 
  Phone,
  ClipboardList,
  Camera,
  Activity,
  FileText,
  Pill,
  Stethoscope,
  Settings,
  Menu, 
  X,
  LogOut,
  Heart,
  Users
} from 'lucide-react';
import { toast } from 'react-toastify';

const ServiceProviderLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, userRole } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Error signing out');
      console.error('Sign out error:', error);
    }
  };

  const isDoctor = userRole === 'doctor';
  const isCaregiver = userRole === 'caregiver';

  const navigation = [
    { name: 'Dashboard', href: '/service-provider', icon: Home, roles: ['caregiver', 'doctor', 'admin'] },
    { name: 'Schedule', href: '/service-provider/schedule', icon: Calendar, roles: ['caregiver', 'doctor', 'admin'] },
    { name: 'Messages', href: '/service-provider/messages', icon: MessageCircle, roles: ['caregiver', 'doctor', 'admin'] },
    { name: 'Tasks', href: '/service-provider/tasks', icon: ClipboardList, roles: ['caregiver', 'doctor', 'admin'] },
    { name: 'Care Logs', href: '/service-provider/care-logs', icon: Camera, roles: ['caregiver', 'admin'] },
    { name: 'Activities', href: '/service-provider/activities', icon: Activity, roles: ['caregiver', 'admin'] },
    { name: 'Patients', href: '/service-provider/medical-records', icon: Users, roles: ['caregiver', 'doctor', 'admin'] },
    { name: 'Prescriptions', href: '/service-provider/prescriptions', icon: Pill, roles: ['doctor', 'admin'] },
    { name: 'Consultations', href: '/service-provider/consultations', icon: Stethoscope, roles: ['doctor', 'admin'] },
    { name: 'Diagnostics', href: '/service-provider/diagnostics', icon: FileText, roles: ['doctor', 'admin'] },
    { name: 'Settings', href: '/service-provider/settings', icon: Settings, roles: ['caregiver', 'doctor', 'admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole) || item.roles.includes('admin')
  );

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-blue-600">ElderX</h1>
                <p className="text-xs text-gray-500">
                  {isDoctor ? 'Medical Portal' : 'Care Portal'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                    isCurrentPath(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-blue-600">ElderX</h1>
                <p className="text-xs text-gray-500">
                  {isDoctor ? 'Medical Portal' : 'Care Portal'}
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                  }}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                    isCurrentPath(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notification Panel */}
              {userProfile?.id && <NotificationPanel userId={userProfile.id} />}
              
              <div className="flex items-center gap-x-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">
                    {userProfile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{userProfile?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServiceProviderLayout;

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useUser } from '../contexts/UserContext';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Menu, 
  X,
  LogOut,
  Bell,
  User,
  Shield,
  Activity,
  FileText,
  Heart,
  AlertTriangle,
  Pill,
  UserCheck,
  TrendingUp,
  MessageSquare,
  ClipboardList,
  Calendar,
  Camera,
  Stethoscope,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { toast } from 'react-toastify';

const ServiceProviderLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, userRole, isDoctor, isCaregiver } = useUser();

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

  // Base navigation items that all service providers have
  const baseNavigation = [
    { name: 'Dashboard', href: '/service-provider', icon: BarChart3 },
    { name: 'Schedule', href: '/service-provider/schedule', icon: Calendar },
    { name: 'Patients', href: '/service-provider/patients', icon: Users },
    { name: 'Messages', href: '/service-provider/messages', icon: MessageSquare },
    { name: 'Calls', href: '/service-provider/calls', icon: Phone },
    { name: 'Settings', href: '/service-provider/settings', icon: Settings },
  ];

  // Doctor-specific navigation items
  const doctorNavigation = [
    { name: 'Medical Records', href: '/service-provider/medical-records', icon: FileText },
    { name: 'Prescriptions', href: '/service-provider/prescriptions', icon: Pill },
    { name: 'Consultations', href: '/service-provider/consultations', icon: Stethoscope },
    { name: 'Diagnostics', href: '/service-provider/diagnostics', icon: Activity },
  ];

  // Caregiver-specific navigation items
  const caregiverNavigation = [
    { name: 'Tasks', href: '/service-provider/tasks', icon: ClipboardList },
    { name: 'Care Logs', href: '/service-provider/care-logs', icon: FileText },
    { name: 'Photo Updates', href: '/service-provider/photos', icon: Camera },
    { name: 'Activities', href: '/service-provider/activities', icon: Activity },
  ];

  // Combine navigation based on role
  const getNavigationItems = () => {
    let navigation = [...baseNavigation];
    
    if (isDoctor()) {
      navigation = [...navigation, ...doctorNavigation];
    } else if (isCaregiver()) {
      navigation = [...navigation, ...caregiverNavigation];
    }
    
    return navigation;
  };

  const navigation = getNavigationItems();

  const isCurrentPath = (path) => location.pathname === path;

  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'doctor': return 'Doctor';
      case 'caregiver': return 'Caregiver';
      default: return 'Service Provider';
    }
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'doctor': return <Stethoscope className="h-8 w-8 text-blue-600" />;
      case 'caregiver': return <UserCheck className="h-8 w-8 text-green-600" />;
      default: return <Shield className="h-8 w-8 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getRoleIcon()}
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">ElderX</h1>
                  <p className="text-xs text-gray-500">{getRoleDisplayName()}</p>
                </div>
              </div>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isCurrentPath(item.href)
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-4 h-6 w-6 ${
                      isCurrentPath(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getRoleIcon()}
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-bold text-gray-900">ElderX</h1>
                    <p className="text-xs text-gray-500">{getRoleDisplayName()}</p>
                  </div>
                </div>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isCurrentPath(item.href)
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${
                        isCurrentPath(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {userProfile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{userProfile?.name || 'User'}</p>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 dashboard-container">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <span className="text-sm text-gray-500">{getRoleDisplayName()} Panel</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Bell className="h-6 w-6" />
              </button>
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {userProfile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">{userProfile?.name || 'User'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto w-full dashboard-main">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServiceProviderLayout;

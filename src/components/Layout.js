import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  Home, 
  Calendar, 
  Heart, 
  MessageCircle, 
  CreditCard,
  Video,
  Menu, 
  X,
  LogOut,
  Bell,
  User,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const navigation = [
    { name: 'My Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Care Team', href: '/patient-caregivers', icon: User },
    { name: 'Care Appointments', href: '/appointments', icon: Calendar },
    { name: 'Health Monitoring', href: '/vital-signs', icon: Heart },
    { name: 'Video Consultations', href: '/telemedicine', icon: Video },
    { name: 'Medical Documents', href: '/medical-documents', icon: FileText },
    { name: 'Messages', href: '/messages', icon: MessageCircle },
    { name: 'Care Plan', href: '/subscription', icon: CreditCard },
  ];

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50 animate-fade-in" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs sm:max-w-sm flex-col bg-white shadow-xl safe-area-inset animate-slide-in-left">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-green-500 rounded-lg flex items-center justify-center mr-2 shrink-0">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-teal-600 truncate">ElderCare Nigeria</h1>
                <p className="text-xs text-gray-500 truncate hidden sm:block">Home Healthcare for the Elderly</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 touch-manipulation shrink-0"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 overflow-y-auto smooth-scroll">
            {navigation.map((item) => {
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
                  className={`mobile-nav-item mb-2 touch-feedback ${
                    isCurrentPath(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 shrink-0" />
                  <span className="text-sm sm:text-base font-medium truncate">{item.name}</span>
                </a>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-3 shrink-0 safe-area-bottom">
            <button
              onClick={handleSignOut}
              className="mobile-nav-item w-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 touch-feedback"
            >
              <LogOut className="mr-3 h-5 w-5 shrink-0" />
              <span className="text-sm sm:text-base font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-teal-600">ElderCare Nigeria</h1>
                <p className="text-xs text-gray-500">Home Healthcare for the Elderly</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                  }}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${
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
              className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 md:h-16 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-gray-200 bg-white px-3 sm:px-4 lg:px-8 shadow-sm safe-area-top">
          <button
            type="button"
            className="p-2 text-gray-700 lg:hidden rounded-lg hover:bg-gray-100 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-2 sm:gap-x-4 self-stretch items-center">
            <div className="flex flex-1 min-w-0"></div>
            <div className="flex items-center gap-x-2 sm:gap-x-4">
              <button 
                className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex items-center gap-x-2 px-3 py-1 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">Client</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 py-3 sm:py-4 md:py-6 safe-area-bottom">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
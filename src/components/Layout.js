import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  Home, 
  Pill, 
  Heart, 
  Calendar, 
  User, 
  Menu, 
  X,
  LogOut
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
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Vital Signs', href: '/vital-signs', icon: Heart },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-blue-600">ElderX</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
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
                    setSidebarOpen(false);
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

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-blue-600">ElderX</h1>
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
              <div className="text-sm text-gray-500">
                Welcome back, {auth.currentUser?.displayName || 'User'}
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

export default Layout;

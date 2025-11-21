import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Bell,
  User,
  Settings,
  Menu,
  X,
  LogOut,
  Heart,
  Activity,
  FileText,
  Camera,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';

const CaregiverLayout = () => {
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
    { name: 'Dashboard', href: '/caregiver', icon: Activity },
    { name: 'Today\'s Schedule', href: '/caregiver/schedule', icon: Calendar },
    { name: 'Tasks', href: '/caregiver/tasks', icon: CheckCircle },
    { name: 'Messages', href: '/caregiver/messages', icon: MessageSquare },
    { name: 'Navigation', href: '/caregiver/navigation', icon: Navigation },
    { name: 'Photo Updates', href: '/caregiver/photos', icon: Camera },
    { name: 'Performance', href: '/caregiver/performance', icon: TrendingUp },
    { name: 'Emergency', href: '/caregiver/emergency', icon: AlertTriangle },
    { name: 'Settings', href: '/caregiver/settings', icon: Settings },
  ];

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-950/75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex h-full w-full max-w-xs flex-col bg-slate-950 border-r border-slate-800/80">
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-400 to-blue-500 flex items-center justify-center">
                <Heart className="h-4 w-4 text-slate-950" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-slate-50">UltimateCare</h1>
                <p className="text-[11px] text-slate-400">Caregiver workspace</p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:text-slate-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-slate-900 text-blue-300'
                      : 'text-slate-300 hover:bg-slate-900/70 hover:text-slate-50'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? 'text-blue-300' : 'text-slate-400'}`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-800/80 px-4 py-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex h-full w-64 flex-col border-r border-slate-800/80 bg-slate-950">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-400 to-blue-500 flex items-center justify-center">
              <Heart className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-slate-50">UltimateCare</h1>
              <p className="text-[11px] text-slate-400">Caregiver workspace</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs text-slate-300">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-slate-900 text-blue-300'
                      : 'text-slate-300 hover:bg-slate-900/70 hover:text-slate-50'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? 'text-blue-300' : 'text-slate-400'}`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-800/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-100 truncate">Caregiver</p>
                <button
                  onClick={handleSignOut}
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center border-b border-slate-800/80 bg-slate-950/90 px-3 sm:px-5 backdrop-blur">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="ml-3 flex flex-1 items-center justify-between gap-3">
            <div className="hidden flex-col text-xs text-slate-400 sm:flex">
              <span className="font-medium text-slate-100">Caregiver Portal</span>
              <span>Today’s visits, tasks, and routes in one place.</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900">
                <Bell className="h-4 w-4" />
              </button>
              <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] text-slate-300 sm:flex">
                <Phone className="h-3.5 w-3.5 text-blue-300" />
                On duty
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="dashboard-main flex-1 overflow-auto bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CaregiverLayout;

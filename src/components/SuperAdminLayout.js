import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import FontSizeToggle from './FontSizeToggle';
import {
  Shield,
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Home,
  Search,
  Menu,
  X,
  BarChart3,
  Plus,
  CreditCard,
  UserPlus,
  Activity
} from 'lucide-react';
import { onAuthStateChanged } from 'backend/auth';
import { auth } from '../backend/config';

const pageTitles = {
  '/super-admin/dashboard': 'Dashboard',
  '/super-admin/licensing': 'Licensing Console',
  '/super-admin/users': 'User Management',
  '/super-admin/management': 'Institutions',
  '/super-admin/audit-logs': 'Audit Logs',
  '/super-admin/analytics': 'Analytics',
  '/super-admin/settings': 'System Settings',
};

const SuperAdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u?.email) setUserEmail(u.email);
    });
    return () => unsub();
  }, []);

  const navigation = [
    { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: 'Institutions', path: '/super-admin/management', icon: Building2 },
    { name: 'Licensing', path: '/super-admin/licensing', icon: FileText },
    { name: 'User Management', path: '/super-admin/users', icon: Users },
    { name: 'Audit Logs', path: '/super-admin/audit-logs', icon: ClipboardList },
    { name: 'Analytics', path: '/super-admin/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/super-admin/settings', icon: Settings },
  ];

  const quickActions = [
    { name: 'Add Institution', icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', onClick: () => navigate('/super-admin/management') },
    { name: 'Issue License', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', onClick: () => navigate('/super-admin/licensing') },
    { name: 'Assign Admin', icon: UserPlus, color: 'text-violet-400', bg: 'bg-violet-500/10', onClick: () => navigate('/super-admin/users') },
    { name: 'Audit Logs', icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/10', onClick: () => navigate('/super-admin/audit-logs') },
  ];

  const handleLogout = async () => {
    try {
      // Clear React + localStorage state FIRST to avoid race conditions
      await logout();
      await auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/super-admin/login';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  const pageTitle = pageTitles[location.pathname] || 'Super Admin';
  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : 'SA';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800/60">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 flex-shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <h1 className="text-sm font-bold text-white whitespace-nowrap tracking-wide">CARE MASTER</h1>
              <p className="text-[10px] text-slate-400 whitespace-nowrap tracking-wider">PLATFORM</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`group w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? 'bg-red-600/20 text-red-400 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title={collapsed ? item.name : ''}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-red-500 rounded-r-full" />
                )}
                <Icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-red-400' : 'text-slate-500 group-hover:text-white'}`} />
                {!collapsed && <span className="ml-3 whitespace-nowrap">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Quick Actions */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-slate-800/60">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Actions</p>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.name}
                    onClick={action.onClick}
                    className="w-full flex items-center px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className={`w-6 h-6 rounded-md ${action.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${action.color}`} />
                    </div>
                    <span className="ml-2 text-xs text-slate-400">{action.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer branding */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-600/20 flex items-center justify-center">
                <Shield className="h-3 w-3 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400">Care Master Platform</p>
                <p className="text-[9px] text-slate-500">Enterprise Edition</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-600 mt-1.5">© 2026 All rights reserved</p>
          </div>
        )}

        {/* Bottom section */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center px-3 py-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-xs"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-slate-400 hover:bg-red-600/20 hover:text-red-400 rounded-xl transition-all duration-200"
            title={collapsed ? 'Sign out' : ''}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left: mobile menu + breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <nav className="hidden sm:flex items-center text-sm text-slate-500">
                <button
                  onClick={() => navigate('/super-admin/dashboard')}
                  className="flex items-center hover:text-slate-800 transition-colors"
                >
                  <Home className="h-4 w-4 mr-1" />
                  Portal
                </button>
                <span className="mx-2 text-slate-300">/</span>
                <span className="font-semibold text-slate-800">{pageTitle}</span>
              </nav>
              {/* Title on mobile */}
              <h1 className="sm:hidden text-base font-semibold text-slate-800">{pageTitle}</h1>
            </div>

            {/* Right: search, notifications, profile */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-3 py-1.5 w-64">
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="ml-2 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400 w-full"
                  readOnly
                  onClick={() => toast.info('Search coming soon')}
                />
              </div>

              <FontSizeToggle className="hidden sm:flex" />

              {/* Notifications */}
              <button
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => toast.info('Notifications coming soon')}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white px-1">8</span>
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">Super Admin</p>
                    <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">{userEmail}</p>
                  </div>
                </button>

                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/60 py-1 z-20 animate-fade-in">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">{userEmail}</p>
                        <p className="text-xs text-slate-500">Platform Administrator</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/super-admin/settings');
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-slate-400" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

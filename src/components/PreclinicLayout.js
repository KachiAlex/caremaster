import React, { useState } from 'react';
import { 
  Building, 
  BarChart3, 
  Users, 
  UserCheck, 
  Calendar, 
  Activity, 
  Settings,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

const PreclinicLayout = ({ children, userRole = 'admin', activeTab, setActiveTab, userEmail }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getNavigationItems = () => {
    const navItems = {
      admin: [
        { id: 'dashboard', label: 'Admin Dashboard', icon: BarChart3 },
        { id: 'clients', label: 'Client Database', icon: Users },
        { id: 'caregivers', label: 'Caregiver Management', icon: UserCheck },
        { id: 'tasks', label: 'Task Assignment', icon: Calendar },
        { id: 'monitoring', label: 'Care Monitoring', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Settings }
      ],
      caregiver: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'activities', label: 'Activities', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Settings }
      ],
      client: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'appointments', label: 'Appointments', icon: Calendar },
        { id: 'health', label: 'Health Records', icon: Activity },
        { id: 'messages', label: 'Messages', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    };
    return navItems[userRole] || navItems.admin;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Top halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />
      
      {/* Sidebar */}
      <div className={`relative z-10 ${sidebarOpen ? 'w-64' : 'w-16'} border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 via-blue-400 to-blue-500 shadow-lg shadow-blue-500/40">
              <Building className="h-5 w-5 text-slate-950" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="brand-title-alt text-slate-50">UltimateCare</h1>
                <p className="text-xs text-slate-400">Unified care workspace</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] mb-4">
              {sidebarOpen ? 'Main Menu' : ''}
            </div>
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-500/20 text-blue-300 border-r-2 border-blue-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <item.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                {sidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-400 flex items-center justify-center ring-2 ring-slate-800">
              <span className="text-sm font-semibold text-slate-950">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-50 truncate">
                  {userEmail || 'User'}
                </p>
                <p className="text-[11px] text-slate-400 capitalize">{userRole}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-slate-50"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 w-64 placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-slate-50 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-rose-400 ring-2 ring-slate-950"></span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-400 flex items-center justify-center ring-2 ring-slate-800">
                  <span className="text-sm font-semibold text-slate-950">
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-slate-50">{userEmail || 'User'}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative z-10 flex-1 overflow-y-auto bg-slate-950">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PreclinicLayout;

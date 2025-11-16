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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="brand-title-alt text-gray-900">UltimateCare</h1>
                <p className="text-sm text-gray-500">Unified care workspace</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {sidebarOpen ? 'Main Menu' : ''}
            </div>
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-600">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userEmail || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{userEmail || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PreclinicLayout;

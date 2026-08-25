import React from 'react';
import { Home, Calendar, Users, Bell, User } from 'lucide-react';

/**
 * MobileBottomNav — fixed bottom navigation bar for mobile devices.
 *
 * Props:
 *   tabs       - Array of { id, label, icon } objects
 *   activeTab  - Currently active tab id
 *   onTabChange - Callback when tab changes
 */
const MobileBottomNav = ({
  tabs = [],
  activeTab,
  onTabChange,
}) => {
  // Show at most 5 tabs; prioritize the first 5
  const visibleTabs = tabs.slice(0, 5);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-pb"
      style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-center justify-around px-1 py-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon || Home;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-gold-deep'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`} />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

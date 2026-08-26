import React, { useState } from 'react';
import { Menu, X, LogOut, ChevronDown } from 'lucide-react';
import MobileBottomNav from './MobileBottomNav';

/**
 * CareMaster Dashboard Layout
 * 
 * A reusable layout component implementing the CareMaster design system.
 * Provides a dark green sidebar, cream background, and top bar.
 *
 * Props:
 *   tabs          - Array of { id, label, icon } objects
 *   activeTab     - Currently active tab id
 *   onTabChange   - Callback when tab changes
 *   institutionName - Name shown in sidebar header
 *   portalLabel   - Small label above institution name (e.g. "Institution admin")
 *   displayName   - User's display name for the top bar
 *   userEmail     - User's email
 *   profilePictureUrl - Optional avatar image
 *   onLogout      - Logout handler
 *   children      - Main content
 *   headerActions - Optional React node for top bar right side actions
 *   footerContent - Optional React node for sidebar footer (above logout)
 */
const DashboardLayout = ({
  tabs = [],
  activeTab,
  onTabChange,
  institutionName = 'Institution',
  portalLabel = 'Admin',
  displayName = 'User',
  userEmail = '',
  profilePictureUrl,
  onLogout,
  children,
  headerActions,
  footerContent,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    setSidebarOpen(false);
  };

  const activeTabObj = tabs.find((t) => t.id === activeTab);
  const activeTabLabel = activeTabObj?.label || 'Dashboard';

  const initials = displayName
    ? displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const SidebarContent = ({ onNavigate }) => (
    <>
      {/* Header */}
      <div className="cm-sidebar-header px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="cm-sidebar-logo">CM</span>
          <div className="min-w-0">
            <p className="cm-mono text-[10px] uppercase tracking-[0.12em] text-gold">
              {portalLabel}
            </p>
            <h1 className="cm-display text-sm text-sand truncate">{institutionName}</h1>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-smooth px-3 py-4 space-y-1" style={{ overscrollBehaviorY: 'contain' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                handleTabClick(tab.id);
                onNavigate?.();
              }}
              className={`cm-nav-item ${isActive ? 'cm-nav-active' : ''}`}
            >
              {Icon && <Icon />}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--cm-ink-line)] space-y-2">
        {footerContent}
        <button
          onClick={onLogout}
          className="cm-nav-item"
          style={{ color: '#F0A98F' }}
        >
          <LogOut />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen cm-dashboard-body flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="cm-sidebar-overlay md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] cm-sidebar flex flex-col h-screen transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-sand/60 hover:text-sand"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 cm-sidebar flex-col fixed h-screen z-20">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 min-w-0">
        {/* Top bar */}
        <div className="cm-topbar sticky top-0 z-10 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-ink/5 text-ink"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="cm-mono text-[10px] uppercase tracking-[0.12em] text-gold-deep">
                  {activeTabLabel}
                </p>
                <h2 className="cm-display text-lg text-ink truncate">
                  {institutionName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {headerActions}

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-ink/5 transition"
                >
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(155deg, var(--cm-sage), var(--cm-ink))' }}
                    >
                      {initials}
                    </span>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-ink max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-text-soft hidden sm:block" />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-ink/8 py-2 z-20 cm-animate-in">
                      <div className="px-4 py-2 border-b border-ink/8">
                        <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
                        <p className="text-xs text-text-soft truncate">{userEmail}</p>
                      </div>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-coral hover:bg-coral-soft/50 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-6xl mx-auto cm-animate-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  );
};

export default DashboardLayout;

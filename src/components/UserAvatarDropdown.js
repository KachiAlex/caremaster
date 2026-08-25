import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserProfileSettings from './UserProfileSettings';
import { signOut } from 'backend/auth';
import { auth } from '../backend/config';

/**
 * UserAvatarDropdown Component
 * 
 * A clickable avatar that shows a dropdown menu with:
 * - Sign Out option
 * - Set Profile option
 */
const UserAvatarDropdown = ({ 
  userProfile, 
  user, 
  profileImageUrl,
  size = 'md' // 'sm', 'md', 'lg'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get user initials
  const getInitials = () => {
    const name = userProfile?.name || userProfile?.displayName || userProfile?.firstName || 'User';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/login');
      setIsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleProfileSettings = () => {
    setShowProfileSettings(true);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Avatar Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all overflow-hidden shrink-0`}
          aria-label="User menu"
        >
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="Profile"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span className={profileImageUrl ? 'hidden' : ''}>
            {getInitials()}
          </span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userProfile?.name || userProfile?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {userProfile?.email || user?.email || ''}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={handleProfileSettings}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Set Profile</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] my-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
                <button
                  onClick={() => setShowProfileSettings(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <UserProfileSettings 
                userId={user?.uid} 
                onClose={() => setShowProfileSettings(false)} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserAvatarDropdown;


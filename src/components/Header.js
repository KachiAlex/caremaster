import React from 'react';
import { Heart, Bell, User } from 'lucide-react';

const Header = () => {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Heart className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-xl font-bold text-blue-900">ElderX</h1>
            </div>
          </div>

          {/* Right side - Icons only */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-gray-800">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

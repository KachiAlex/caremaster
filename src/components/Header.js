import React from 'react';
import { Heart, Bell, User } from 'lucide-react';

const Header = () => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Heart className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">ElderX</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Home
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Services
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              About
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Contact
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

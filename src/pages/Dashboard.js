import React from 'react';
import { Heart, Calendar, Phone, MessageCircle, AlertTriangle, User } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - User Info */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Welcome back, Adunni</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="text-lg font-semibold text-gray-900">72 years</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Emergency Contact</p>
              <p className="text-lg font-semibold text-gray-900">Dr. Kemi Okafor</p>
              <p className="text-sm text-gray-600">+234 801 987 6543</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Subscription</p>
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Premium
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Medical Conditions</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Hypertension</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Diabetes Type 2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Emergency & Contact */}
        <div className="space-y-4">
          <button className="w-full bg-red-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors">
            <AlertTriangle className="h-6 w-6 inline mr-2" />
            EMERGENCY - NEED HELP NOW
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-orange-100 text-orange-700 py-3 px-4 rounded-lg hover:bg-orange-200 transition-colors">
              <Phone className="h-5 w-5 inline mr-2" />
              Family
            </button>
            <button className="bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors">
              <Heart className="h-5 w-5 inline mr-2" />
              Doctor
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">1</div>
          <div className="text-sm text-gray-500">Upcoming Visits</div>
        </div>
        <div className="card text-center">
          <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">140/90</div>
          <div className="text-sm text-gray-500">Last BP Reading</div>
        </div>
        <div className="card text-center">
          <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">3</div>
          <div className="text-sm text-gray-500">New Messages</div>
        </div>
        <div className="card text-center">
          <Phone className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">24/7</div>
          <div className="text-sm text-gray-500">Support Available</div>
        </div>
      </div>

      {/* Upcoming Care Visits */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Care Visits</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">Medication Administration</h3>
              <p className="text-sm text-gray-600">Caregiver TBD</p>
              <p className="text-sm text-gray-600">Time TBD</p>
            </div>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Heart, 
  AlertTriangle,
  Plus,
  BarChart3
} from 'lucide-react';

const TempAdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ElderX Admin Dashboard</h1>
          <p className="text-gray-600">Healthcare Management Platform</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button 
            onClick={() => navigate('/admin/patient-database')}
            className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Patient Database</h3>
                <p className="text-gray-600">Add and manage patient records</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/caregiver-management')}
            className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Caregiver Management</h3>
                <p className="text-gray-600">Create and manage caregiver accounts</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/task-assignment')}
            className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Task Assignment</h3>
                <p className="text-gray-600">Assign and schedule caregiver tasks</p>
              </div>
            </div>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Caregivers</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alerts</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Functions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/admin/patient-database')}
              className="flex items-center p-3 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Users className="h-5 w-5 mr-2" />
              Patients
            </button>
            <button 
              onClick={() => navigate('/admin/caregiver-management')}
              className="flex items-center p-3 text-green-600 hover:bg-green-50 rounded-lg"
            >
              <UserCheck className="h-5 w-5 mr-2" />
              Caregivers
            </button>
            <button 
              onClick={() => navigate('/admin/task-assignment')}
              className="flex items-center p-3 text-purple-600 hover:bg-purple-50 rounded-lg"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Tasks
            </button>
            <button 
              onClick={() => navigate('/admin/analytics')}
              className="flex items-center p-3 text-orange-600 hover:bg-orange-50 rounded-lg"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempAdminDashboard;

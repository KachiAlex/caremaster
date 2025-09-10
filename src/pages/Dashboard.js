import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Pill, 
  Heart, 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const Dashboard = () => {
  // Mock data - will be replaced with real data from Data Connect
  const stats = {
    medications: 5,
    upcomingAppointments: 2,
    vitalSignsToday: 3,
    missedDoses: 1
  };

  const recentMedications = [
    { name: 'Aspirin', dosage: '100mg', time: '8:00 AM', taken: true },
    { name: 'Vitamin D', dosage: '2000IU', time: '9:00 AM', taken: true },
    { name: 'Blood Pressure Med', dosage: '10mg', time: '2:00 PM', taken: false },
  ];

  const upcomingAppointments = [
    { doctor: 'Dr. Smith', type: 'Checkup', date: 'Tomorrow', time: '10:00 AM' },
    { doctor: 'Dr. Johnson', type: 'Physical Therapy', date: 'Friday', time: '2:00 PM' },
  ];

  const recentVitalSigns = [
    { type: 'Blood Pressure', value: '120/80', unit: 'mmHg', time: '2 hours ago' },
    { type: 'Heart Rate', value: '72', unit: 'bpm', time: '1 hour ago' },
    { type: 'Temperature', value: '98.6', unit: '°F', time: '30 min ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your health overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card medication-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-green-100 rounded-xl">
              <Pill className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Medications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.medications}</p>
            </div>
          </div>
        </div>

        <div className="card appointment-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-xl">
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
            </div>
          </div>
        </div>

        <div className="card vital-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-red-100 rounded-xl">
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vital Signs Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vitalSignsToday}</p>
            </div>
          </div>
        </div>

        <div className="card health-card">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-xl">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Missed Doses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.missedDoses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Medications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Medications</h2>
            <Link to="/medications" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentMedications.map((med, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${med.taken ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium text-gray-900">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.dosage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{med.time}</p>
                  <p className="text-xs text-gray-500">
                    {med.taken ? 'Taken' : 'Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingAppointments.map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{appointment.doctor}</p>
                  <p className="text-sm text-gray-500">{appointment.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{appointment.date}</p>
                  <p className="text-xs text-gray-500">{appointment.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Vital Signs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Vital Signs</h2>
            <Link to="/vital-signs" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentVitalSigns.map((vital, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Heart className="h-5 w-5 text-red-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{vital.type}</p>
                    <p className="text-sm text-gray-500">{vital.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{vital.value}</p>
                  <p className="text-xs text-gray-500">{vital.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/medications"
              className="flex items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Pill className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">Add Medication</span>
            </Link>
            <Link
              to="/vital-signs"
              className="flex items-center justify-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Heart className="h-6 w-6 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-700">Record Vital</span>
            </Link>
            <Link
              to="/appointments"
              className="flex items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Calendar className="h-6 w-6 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-700">Schedule Visit</span>
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <TrendingUp className="h-6 w-6 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">View Reports</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

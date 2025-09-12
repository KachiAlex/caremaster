import React, { useState } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Star,
  ChevronDown,
  Maximize2
} from 'lucide-react';

const Appointments = () => {
  const [careType, setCareType] = useState('immediate'); // 'immediate' or 'scheduled'
  const [formData, setFormData] = useState({
    careType: 'Blood Pressure Check',
    preferredDate: '',
    preferredTime: '',
    additionalNotes: ''
  });

  // Mock data for available caregivers
  const availableCaregivers = [
    {
      id: 1,
      name: 'Nurse Fatima Abdullahi',
      specialty: 'Geriatric Care',
      rating: 4.8,
      location: 'Victoria Island, Lagos',
      status: 'Available',
      visits: 156,
      avatar: null
    },
    {
      id: 2,
      name: 'Dr. Chinedu Okoro',
      specialty: 'General Medicine',
      rating: 4.9,
      location: 'Ikeja, Lagos',
      status: 'Busy',
      visits: 89,
      avatar: null
    }
  ];

  // Mock data for recent care requests
  const recentRequests = [
    {
      id: 1,
      title: 'Blood Pressure Check',
      assignedCaregiver: 'Nurse Fatima Abdullahi',
      createdDate: '9/1/2025',
      scheduledDate: '9/3/2025, 2:00:00 PM',
      description: 'Regular weekly checkup',
      status: 'In Progress',
      priority: 'Medium'
    },
    {
      id: 2,
      title: 'Medication Administration',
      assignedCaregiver: 'Caregiver not assigned yet',
      createdDate: '9/3/2025',
      scheduledDate: null,
      description: 'Daily medication reminder and administration',
      status: 'Pending',
      priority: 'High'
    }
  ];

  const careTypes = [
    'Blood Pressure Check',
    'Medication Administration',
    'Wound Care',
    'Physical Therapy',
    'Vital Signs Monitoring',
    'Meal Preparation',
    'Companionship',
    'Transportation',
    'Housekeeping',
    'Emergency Response'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Care request submitted:', formData);
    // Reset form
    setFormData({
      careType: 'Blood Pressure Check',
      preferredDate: '',
      preferredTime: '',
      additionalNotes: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Busy':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-orange-100 text-orange-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Request Care Service Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Stethoscope className="h-6 w-6 text-gray-700 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Request Care Service</h1>
        </div>

        {/* Care Type Selection */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setCareType('immediate')}
            className={`flex items-center px-6 py-3 rounded-lg border-2 transition-colors ${
              careType === 'immediate'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center mr-3">
              <span className="text-xs font-bold">!</span>
            </div>
            Need Care Now
          </button>
          <button
            onClick={() => setCareType('scheduled')}
            className={`flex items-center px-6 py-3 rounded-lg border-2 transition-colors ${
              careType === 'scheduled'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            <Calendar className="h-5 w-5 mr-3" />
            Schedule Visit
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type of Care Needed
            </label>
            <div className="relative">
              <select
                value={formData.careType}
                onChange={(e) => setFormData({...formData, careType: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                {careTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {careType === 'scheduled' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({...formData, preferredDate: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="mm/dd/yyyy"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({...formData, preferredTime: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="--:--"
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <div className="relative">
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Please describe your symptoms or specific care needs..."
              />
              <Maximize2 className="absolute bottom-3 right-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            {careType === 'immediate' ? 'Request Immediate Care' : 'Schedule Care Visit'}
          </button>
        </form>
      </div>

      {/* Available Caregivers Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <User className="h-6 w-6 text-gray-700 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Available Caregivers Nearby</h2>
        </div>

        <div className="space-y-4">
          {availableCaregivers.map((caregiver) => (
            <div key={caregiver.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{caregiver.name}</h3>
                  <p className="text-sm text-gray-600">{caregiver.specialty}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-600">{caregiver.rating}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">{caregiver.location}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(caregiver.status)}`}>
                  {caregiver.status}
                </span>
                <p className="text-sm text-gray-500 mt-1">{caregiver.visits} visits</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Care Requests Section */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Care Requests</h2>
        
        <div className="space-y-4">
          {recentRequests.map((request) => (
            <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{request.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{request.assignedCaregiver}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{request.createdDate}</span>
                    </div>
                    {request.scheduledDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{request.scheduledDate}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{request.description}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Appointments;
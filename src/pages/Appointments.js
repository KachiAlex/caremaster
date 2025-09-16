import React, { useState, useEffect } from 'react';
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
import { useUser } from '../contexts/UserContext';
import { getAppointmentsByPatient, createAppointment } from '../api/appointmentsAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { toast } from 'react-toastify';

const Appointments = () => {
  const { user, userProfile } = useUser();
  const [careType, setCareType] = useState('immediate'); // 'immediate' or 'scheduled'
  const [formData, setFormData] = useState({
    careType: 'Blood Pressure Check',
    preferredDate: '',
    preferredTime: '',
    additionalNotes: ''
  });
  const [availableCaregivers, setAvailableCaregivers] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available caregivers and recent appointments
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        
        // Fetch available caregivers
        const caregivers = await caregiverAPI.getCaregivers({ 
          status: 'active',
          limit: 10 
        });
        setAvailableCaregivers(caregivers.map(caregiver => ({
          id: caregiver.id,
          name: caregiver.name || caregiver.displayName || 'Caregiver',
          specialty: caregiver.specializations?.[0] || 'General Care',
          rating: caregiver.rating || 4.5,
          location: caregiver.location || 'Lagos, Nigeria',
          status: caregiver.status === 'active' ? 'Available' : 'Busy',
          visits: caregiver.totalPatients || 0,
          avatar: caregiver.avatar || null
        })));

        // Fetch recent appointments for this patient
        const appointments = await getAppointmentsByPatient(user.uid);
        setRecentRequests(appointments.slice(0, 5).map(appointment => ({
          id: appointment.id,
          title: appointment.careType || appointment.title || 'Care Request',
          assignedCaregiver: appointment.caregiverName || 'Caregiver not assigned yet',
          createdDate: appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString() : 'Unknown',
          scheduledDate: appointment.scheduledTime ? new Date(appointment.scheduledTime).toLocaleString() : null,
          description: appointment.notes || appointment.description || 'No description provided',
          status: appointment.status === 'scheduled' ? 'Scheduled' : 
                  appointment.status === 'completed' ? 'Completed' :
                  appointment.status === 'cancelled' ? 'Cancelled' : 'Pending',
          priority: appointment.priority || 'Medium'
        })));
        
      } catch (error) {
        console.error('Error fetching appointments data:', error);
        toast.error('Failed to load appointments data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error('Please log in to request care');
      return;
    }

    // Prevent multiple submissions
    if (submitting) {
      return;
    }

    // Validation for scheduled appointments
    if (careType === 'scheduled') {
      if (!formData.preferredDate) {
        toast.error('Please select a preferred date');
        return;
      }
      if (!formData.preferredTime) {
        toast.error('Please select a preferred time');
        return;
      }
      
      // Check if the selected date/time is in the future
      const selectedDateTime = new Date(`${formData.preferredDate}T${formData.preferredTime}`);
      const now = new Date();
      if (selectedDateTime <= now) {
        toast.error('Please select a future date and time');
        return;
      }
    }

    setSubmitting(true);

    try {
      console.log('Starting appointment creation...', { careType, formData, user: user?.uid });
      
      const appointmentData = {
        patientId: user.uid,
        patientName: userProfile?.name || userProfile?.displayName || user?.displayName || 'Patient',
        careType: formData.careType,
        notes: formData.additionalNotes,
        priority: careType === 'immediate' ? 'high' : 'medium',
        status: 'pending'
      };

      // Add scheduled time if it's a scheduled appointment
      if (careType === 'scheduled' && formData.preferredDate && formData.preferredTime) {
        const scheduledDateTime = new Date(`${formData.preferredDate}T${formData.preferredTime}`);
        appointmentData.scheduledTime = scheduledDateTime;
        appointmentData.status = 'scheduled';
        console.log('Scheduled appointment data:', { scheduledDateTime, appointmentData });
      }

      console.log('Creating appointment with data:', appointmentData);
      const appointmentId = await createAppointment(appointmentData);
      console.log('Appointment created successfully:', appointmentId);
      
      toast.success(careType === 'immediate' ? 'Immediate care request submitted!' : 'Care visit scheduled successfully!');
      
      // Reset form
      setFormData({
        careType: 'Blood Pressure Check',
        preferredDate: '',
        preferredTime: '',
        additionalNotes: ''
      });

      // Refresh the recent requests
      const appointments = await getAppointmentsByPatient(user.uid);
      setRecentRequests(appointments.slice(0, 5).map(appointment => ({
        id: appointment.id,
        title: appointment.careType || appointment.title || 'Care Request',
        assignedCaregiver: appointment.caregiverName || 'Caregiver not assigned yet',
        createdDate: appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString() : 'Unknown',
        scheduledDate: appointment.scheduledTime ? new Date(appointment.scheduledTime).toLocaleString() : null,
        description: appointment.notes || appointment.description || 'No description provided',
        status: appointment.status === 'scheduled' ? 'Scheduled' : 
                appointment.status === 'completed' ? 'Completed' :
                appointment.status === 'cancelled' ? 'Cancelled' : 'Pending',
        priority: appointment.priority || 'Medium'
      })));
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to submit care request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Busy':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading appointments...</span>
          </div>
        </div>
      </div>
    );
  }

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
                    min={new Date().toISOString().split('T')[0]}
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
            disabled={submitting}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
              submitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </div>
            ) : (
              careType === 'immediate' ? 'Request Immediate Care' : 'Schedule Care Visit'
            )}
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
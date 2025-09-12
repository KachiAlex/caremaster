import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  MessageSquare, 
  Navigation,
  CheckCircle,
  AlertTriangle,
  Star,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
  Activity,
  FileText
} from 'lucide-react';

const CaregiverSchedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadScheduleData();
  }, [selectedDate]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockAppointments = [
          {
            id: 1,
            patientName: 'Adunni Okafor',
            patientAge: 72,
            patientAddress: '123 Victoria Island, Lagos',
            patientPhone: '+234 801 234 5678',
            appointmentTime: '09:00',
            duration: 60,
            type: 'Home Visit',
            status: 'scheduled',
            tasks: [
              'Medication administration',
              'Vital signs check',
              'Meal preparation',
              'Light housekeeping'
            ],
            notes: 'Patient has diabetes, check blood sugar levels',
            priority: 'high',
            estimatedTravelTime: 25
          },
          {
            id: 2,
            patientName: 'Tunde Adebayo',
            patientAge: 68,
            patientAddress: '456 Ikoyi, Lagos',
            patientPhone: '+234 802 345 6789',
            appointmentTime: '11:30',
            duration: 90,
            type: 'Home Visit',
            status: 'scheduled',
            tasks: [
              'Physical therapy exercises',
              'Medication reminder',
              'Grocery shopping',
              'Companionship'
            ],
            notes: 'Patient recovering from hip surgery',
            priority: 'medium',
            estimatedTravelTime: 15
          },
          {
            id: 3,
            patientName: 'Grace Johnson',
            patientAge: 75,
            patientAddress: '789 Lekki, Lagos',
            patientPhone: '+234 803 456 7890',
            appointmentTime: '14:00',
            duration: 45,
            type: 'Home Visit',
            status: 'completed',
            tasks: [
              'Medication administration',
              'Vital signs check',
              'Meal preparation'
            ],
            notes: 'Regular checkup visit',
            priority: 'low',
            estimatedTravelTime: 30
          }
        ];

        setAppointments(mockAppointments);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Schedule</h1>
          <p className="text-gray-600">Your appointments and tasks for {formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-gray-500">
              {appointments.filter(apt => apt.status === 'scheduled').length} appointments scheduled
            </p>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule Timeline</h2>
        <div className="space-y-4">
          {appointments
            .filter(apt => apt.status === 'scheduled')
            .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
            .map((appointment) => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-medium">
                        {appointment.patientName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{appointment.patientName}</h3>
                      <span className="text-sm text-gray-500">Age: {appointment.patientAge}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(appointment.priority)}`}>
                        {appointment.priority} priority
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{appointment.appointmentTime} ({appointment.duration} minutes)</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{appointment.patientAddress}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{appointment.patientPhone}</span>
                      </div>
                      <div className="flex items-center">
                        <Navigation className="h-4 w-4 mr-2" />
                        <span>{appointment.estimatedTravelTime} min travel time</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    </div>
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tasks:</h4>
                      <div className="flex flex-wrap gap-2">
                        {appointment.tasks.map((task, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="btn btn-secondary">
                    <Navigation className="h-4 w-4 mr-2" />
                    Navigate
                  </button>
                  <button className="btn btn-primary">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Start Visit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => apt.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => apt.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.reduce((total, apt) => total + apt.duration, 0) / 60}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => apt.priority === 'high').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverSchedule;

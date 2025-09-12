import React, { useState } from 'react';
import { Plus, Calendar, Clock, MapPin, User, Edit, Trash2, Phone, Video } from 'lucide-react';

const Appointments = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Mock data - will be replaced with real data from Data Connect
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      doctorName: 'Dr. Smith',
      type: 'Checkup',
      date: '2024-01-16',
      time: '10:00 AM',
      location: 'Main Street Clinic',
      notes: 'Annual physical examination',
      status: 'upcoming',
      appointmentType: 'in-person'
    },
    {
      id: 2,
      doctorName: 'Dr. Johnson',
      type: 'Physical Therapy',
      date: '2024-01-19',
      time: '2:00 PM',
      location: 'Oak Avenue Hospital',
      notes: 'Follow-up session',
      status: 'upcoming',
      appointmentType: 'in-person'
    },
    {
      id: 3,
      doctorName: 'Dr. Williams',
      type: 'Cardiology',
      date: '2024-01-22',
      time: '11:30 AM',
      location: 'Heart Center',
      notes: 'EKG and consultation',
      status: 'upcoming',
      appointmentType: 'telehealth'
    }
  ]);

  const [newAppointment, setNewAppointment] = useState({
    doctorName: '',
    type: 'Checkup',
    date: '',
    time: '',
    location: '',
    notes: '',
    appointmentType: 'in-person'
  });

  const appointmentTypes = [
    'Checkup',
    'Follow-up',
    'Physical Therapy',
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Orthopedics',
    'Mental Health',
    'Emergency'
  ];

  const handleAddAppointment = (e) => {
    e.preventDefault();
    const appointment = {
      id: Date.now(),
      ...newAppointment,
      status: 'upcoming'
    };
    setAppointments([...appointments, appointment]);
    setNewAppointment({
      doctorName: '',
      type: 'Checkup',
      date: '',
      time: '',
      location: '',
      notes: '',
      appointmentType: 'in-person'
    });
    setShowAddForm(false);
  };

  const handleDeleteAppointment = (id) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600">Manage your medical appointments</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </button>
      </div>

      {/* Add Appointment Form */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule New Appointment</h2>
          <form onSubmit={handleAddAppointment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Doctor Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAppointment.doctorName}
                  onChange={(e) => setNewAppointment({...newAppointment, doctorName: e.target.value})}
                  placeholder="Dr. Smith"
                  required
                />
              </div>
              <div>
                <label className="form-label">Appointment Type</label>
                <select
                  className="form-input"
                  value={newAppointment.type}
                  onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
                >
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="form-label">Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAppointment.location}
                  onChange={(e) => setNewAppointment({...newAppointment, location: e.target.value})}
                  placeholder="Clinic or Hospital Name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Appointment Format</label>
                <select
                  className="form-input"
                  value={newAppointment.appointmentType}
                  onChange={(e) => setNewAppointment({...newAppointment, appointmentType: e.target.value})}
                >
                  <option value="in-person">In-Person</option>
                  <option value="telehealth">Telehealth</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input form-textarea"
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                placeholder="Any special instructions or notes for this appointment"
              />
            </div>
            <div className="flex space-x-4">
              <button type="submit" className="btn btn-primary">
                Schedule Appointment
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appointments List */}
      <div className="grid grid-cols-1 gap-4">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <Calendar className="h-8 w-8 text-blue-600 mr-4 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{appointment.doctorName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{appointment.type}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(appointment.date)} at {appointment.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {appointment.location}
                    </div>
                    <div className="flex items-center">
                      {appointment.appointmentType === 'telehealth' ? (
                        <Video className="h-4 w-4 mr-1" />
                      ) : (
                        <User className="h-4 w-4 mr-1" />
                      )}
                      {appointment.appointmentType === 'telehealth' ? 'Video Call' : 'In-Person'}
                    </div>
                  </div>
                  {appointment.notes && (
                    <p className="text-sm text-gray-500">{appointment.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="btn btn-outline">
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDeleteAppointment(appointment.id)}
                  className="btn btn-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {appointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
          <p className="text-gray-500 mb-4">Schedule your first appointment to get started</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Your First Appointment
          </button>
        </div>
      )}
    </div>
  );
};

export default Appointments;

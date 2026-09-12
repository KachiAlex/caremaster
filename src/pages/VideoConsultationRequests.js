import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Clock,
  User,
  Search,
  CheckCircle,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import telemedicineAPI from '../api/telemedicineAPI';
import { getUsersByType } from '../api/usersAPI';

const VideoConsultationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    doctorId: '',
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [pending, doctorList] = await Promise.all([
        telemedicineAPI.getPendingRequests(),
        getUsersByType('doctor').catch(() => [])
      ]);
      setRequests(pending || []);
      setDoctors((doctorList || []).filter(d => d.user_type === 'doctor' || d.type === 'doctor'));
    } catch (error) {
      console.error('Error loading consultation requests:', error);
      toast.error('Failed to load consultation requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const formatDateTime = (dateTime) => {
    if (!dateTime) return { date: 'TBD', time: 'TBD' };
    const d = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime);
    if (isNaN(d.getTime())) return { date: 'TBD', time: 'TBD' };
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const filteredRequests = requests.filter(req => {
    const term = searchTerm.toLowerCase();
    return (
      (req.clientName || '').toLowerCase().includes(term) ||
      (req.reason || '').toLowerCase().includes(term) ||
      (req.notes || '').toLowerCase().includes(term)
    );
  });

  const startScheduling = (request) => {
    setScheduling(request);
    const date = request.appointmentDate
      ? new Date(request.appointmentDate?.toDate ? request.appointmentDate.toDate() : request.appointmentDate)
      : null;
    const dateStr = date && !isNaN(date.getTime())
      ? date.toISOString().split('T')[0]
      : '';
    const timeStr = date && !isNaN(date.getTime())
      ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      : '09:00';
    setScheduleForm({
      doctorId: '',
      doctorName: '',
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      duration: 30,
      notes: ''
    });
  };

  const handleDoctorChange = (doctorId) => {
    const doctor = doctors.find(d => d.id === doctorId);
    setScheduleForm(prev => ({
      ...prev,
      doctorId,
      doctorName: doctor ? (doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()) : ''
    }));
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.doctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (!scheduleForm.appointmentDate) {
      toast.error('Please select an appointment date');
      return;
    }

    setSubmitting(true);
    try {
      const appointmentDate = new Date(`${scheduleForm.appointmentDate}T${scheduleForm.appointmentTime || '09:00'}`);
      await telemedicineAPI.scheduleRequest(scheduling.id, {
        doctorId: scheduleForm.doctorId,
        doctorName: scheduleForm.doctorName,
        appointmentDate,
        duration: parseInt(scheduleForm.duration) || 30,
        notes: scheduleForm.notes,
        status: 'scheduled'
      });
      toast.success('Consultation scheduled successfully');
      setScheduling(null);
      loadRequests();
    } catch (error) {
      console.error('Error scheduling request:', error);
      toast.error('Failed to schedule consultation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Video className="h-6 w-6 text-blue-600 mr-2" />
            Video Consultation Requests
          </h1>
          <p className="text-gray-600 mt-1">Review client requests and assign a doctor</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
          <p className="text-gray-600">There are no client video consultation requests awaiting scheduling.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const dateTime = formatDateTime(request.appointmentDate);
            const isExpanded = expanded === request.id;
            return (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.clientName || 'Client'}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.urgency === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {request.urgency === 'urgent' ? (
                            <><AlertCircle className="h-3 w-3 mr-1" /> Urgent</>
                          ) : (
                            'Normal'
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{request.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startScheduling(request)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : request.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Client ID: {request.clientId}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Preferred: {dateTime.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Time: {dateTime.time}</span>
                      </div>
                    </div>
                    {request.notes && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Additional Notes</h4>
                        <p className="text-sm text-gray-700">{request.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {scheduling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Schedule Consultation</h2>
                <p className="text-sm text-gray-600">Assign a doctor and confirm the appointment</p>
              </div>
              <button
                onClick={() => setScheduling(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor *</label>
                <select
                  value={scheduleForm.doctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || doctor.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    value={scheduleForm.appointmentDate}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Time *</label>
                  <input
                    type="time"
                    value={scheduleForm.appointmentTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, appointmentTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <select
                  value={scheduleForm.duration}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduling Notes</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes for the client or doctor..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduling(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConsultationRequests;

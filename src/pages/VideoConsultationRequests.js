import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronUp,
  Filter,
  Stethoscope,
  Phone,
  Mail,
  Activity,
  Inbox
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
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

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

  const formatTimeAgo = (dateTime) => {
    if (!dateTime) return '';
    const d = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const stats = useMemo(() => {
    const total = requests.length;
    const urgent = requests.filter(r => r.urgency === 'urgent').length;
    const normal = total - urgent;
    return { total, urgent, normal };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(req => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (req.clientName || '').toLowerCase().includes(term) ||
        (req.reason || '').toLowerCase().includes(term) ||
        (req.notes || '').toLowerCase().includes(term)
      );
      const matchesUrgency = urgencyFilter === 'all' || req.urgency === urgencyFilter;
      return matchesSearch && matchesUrgency;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        const aTime = a.createdAt ? new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).getTime() : 0;
        return bTime - aTime;
      }
      if (sortBy === 'urgency') {
        if (a.urgency === 'urgent' && b.urgency !== 'urgent') return -1;
        if (a.urgency !== 'urgent' && b.urgency === 'urgent') return 1;
        return 0;
      }
      return 0;
    });

    return filtered;
  }, [requests, searchTerm, urgencyFilter, sortBy]);

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Video className="h-7 w-7 text-blue-600 mr-3" />
            Video Consultation Requests
          </h1>
          <p className="text-gray-600 mt-1">Review client requests and assign a doctor</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-56"
            />
          </div>
          <button
            onClick={loadRequests}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
            title="Refresh requests"
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
            <Inbox className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Pending</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Urgent</p>
            <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Normal</p>
            <p className="text-2xl font-bold text-gray-900">{stats.normal}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center text-gray-700 text-sm font-medium">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </div>
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Urgency</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="urgency">Urgency First</option>
          </select>
        </div>
        <p className="text-sm text-gray-500">
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Requests List */}
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
            const isUrgent = request.urgency === 'urgent';

            return (
              <div
                key={request.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-shadow hover:shadow-md ${
                  isUrgent ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className={`px-6 py-4 ${isUrgent ? 'bg-red-50' : 'bg-white'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Avatar + client */}
                    <div className="flex items-start flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4 ${
                        isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{request.clientName || 'Client'}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isUrgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isUrgent ? (
                              <><AlertCircle className="h-3 w-3 mr-1" /> Urgent</>
                            ) : (
                              'Normal'
                            )}
                          </span>
                          <span className="text-xs text-gray-400">{formatTimeAgo(request.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2 mb-2">{request.reason}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            Preferred: {dateTime.date}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {dateTime.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 lg:pt-1">
                      <button
                        onClick={() => startScheduling(request)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium shadow-sm"
                      >
                        <Stethoscope className="h-4 w-4 mr-2" />
                        Schedule
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : request.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 py-5 border-t border-gray-200 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Client ID</span>
                        <p className="mt-1 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {request.clientId}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Urgency</span>
                        <p className={`mt-1 font-medium ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
                          {isUrgent ? 'Urgent — needs attention' : 'Normal'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preferred Date</span>
                        <p className="mt-1 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {dateTime.date}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preferred Time</span>
                        <p className="mt-1 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {dateTime.time}
                        </p>
                      </div>
                    </div>
                    {request.notes && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Additional Notes</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.notes}</p>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Schedule Consultation</h2>
                <p className="text-sm text-gray-600">Assign a doctor and confirm the appointment for {scheduling.clientName}</p>
              </div>
              <button
                onClick={() => setScheduling(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitSchedule} className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Request Reason
                </h4>
                <p className="text-sm text-blue-800">{scheduling.reason}</p>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type</label>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center">
                    <Video className="h-4 w-4 mr-2 text-blue-600" />
                    Video Call
                  </div>
                </div>
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

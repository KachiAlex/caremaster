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
  Heart,
  Activity,
  Inbox,
  Phone
} from 'lucide-react';
import { toast } from 'react-toastify';
import telemedicineAPI from '../api/telemedicineAPI';
import { getAllAppointments, updateAppointment } from '../api/appointmentsAPI';
import { getAllUsers } from '../api/usersAPI';

const ClientCareRequests = ({ institutionId }) => {
  const [requests, setRequests] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    assigneeId: '',
    assigneeName: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [pendingVideo, allAppointments] = await Promise.all([
        telemedicineAPI.getPendingRequests(),
        getAllAppointments().catch(() => [])
      ]);

      const pendingCare = (allAppointments || []).filter(apt => {
        // A care visit is a request if it's pending/requested OR
        // scheduled but hasn't been assigned a caregiver yet
        if (apt.status === 'pending' || apt.status === 'requested') return true;
        if (apt.status === 'scheduled') {
          return !(apt.caregiverId || apt.caregiver_id || apt.caregiverName);
        }
        return false;
      });

      const normalized = [
        ...(pendingVideo || []).map(r => ({
          ...r,
          requestType: 'video',
          displayType: 'Video Consultation',
          displayReason: r.reason,
          displayUrgency: r.urgency || 'normal'
        })),
        ...pendingCare.map(r => ({
          ...r,
          requestType: 'care',
          displayType: 'Care Visit',
          displayReason: r.careType || r.title || r.description || 'Care request',
          displayUrgency: r.priority || 'normal'
        }))
      ];

      // Sort by newest first
      normalized.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setRequests(normalized);

      const users = await getAllUsers().catch(() => []);
      setDoctors((users || []).filter(u =>
        u.user_type === 'doctor' || u.type === 'doctor' || u.userType === 'doctor'
      ));
      setCaregivers((users || []).filter(u =>
        u.user_type === 'caregiver' || u.type === 'caregiver' || u.userType === 'caregiver'
      ));
    } catch (error) {
      console.error('Error loading care requests:', error);
      toast.error('Failed to load care requests');
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
    const video = requests.filter(r => r.requestType === 'video').length;
    const care = requests.filter(r => r.requestType === 'care').length;
    const urgent = requests.filter(r => r.displayUrgency === 'urgent' || r.priority === 'urgent' || r.urgency === 'urgent').length;
    return { total, video, care, urgent };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (req.clientName || '').toLowerCase().includes(term) ||
        (req.displayReason || '').toLowerCase().includes(term) ||
        (req.notes || '').toLowerCase().includes(term)
      );
      const matchesType = typeFilter === 'all' || req.requestType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [requests, searchTerm, typeFilter]);

  const startScheduling = (request) => {
    setScheduling(request);
    const isVideo = request.requestType === 'video';
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
      assigneeId: '',
      assigneeName: '',
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      duration: 30,
      notes: ''
    });
  };

  const handleAssigneeChange = (assigneeId) => {
    const isVideo = scheduling?.requestType === 'video';
    const pool = isVideo ? doctors : caregivers;
    const assignee = pool.find(p => p.id === assigneeId);
    setScheduleForm(prev => ({
      ...prev,
      assigneeId,
      assigneeName: assignee ? (assignee.name || `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim()) : ''
    }));
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.assigneeId) {
      toast.error(`Please select a ${scheduling.requestType === 'video' ? 'doctor' : 'caregiver'}`);
      return;
    }
    if (!scheduleForm.appointmentDate) {
      toast.error('Please select an appointment date');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${scheduleForm.appointmentDate}T${scheduleForm.appointmentTime || '09:00'}`);
      if (scheduling.requestType === 'video') {
        await telemedicineAPI.scheduleRequest(scheduling.id, {
          doctorId: scheduleForm.assigneeId,
          doctorName: scheduleForm.assigneeName,
          appointmentDate: scheduledAt,
          duration: parseInt(scheduleForm.duration) || 30,
          notes: scheduleForm.notes,
          status: 'scheduled'
        });
      } else {
        await updateAppointment(scheduling.id, {
          caregiverId: scheduleForm.assigneeId,
          caregiverName: scheduleForm.assigneeName,
          scheduledTime: scheduledAt,
          status: 'scheduled',
          notes: scheduleForm.notes,
        });
      }
      toast.success('Request scheduled successfully');
      setScheduling(null);
      loadRequests();
    } catch (error) {
      console.error('Error scheduling request:', error);
      toast.error('Failed to schedule request');
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Inbox className="h-7 w-7 text-blue-600 mr-3" />
            Client Care Requests
          </h2>
          <p className="text-gray-600 mt-1">Pending video consultations and care visits awaiting action</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <Inbox className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
            <Video className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Video</p>
            <p className="text-2xl font-bold text-gray-900">{stats.video}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <Heart className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Care Visits</p>
            <p className="text-2xl font-bold text-gray-900">{stats.care}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Urgent</p>
            <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center text-gray-700 text-sm font-medium">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="video">Video Consultation</option>
          <option value="care">Care Visit</option>
        </select>
        <p className="text-sm text-gray-500 sm:ml-auto">
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Care Requests</h3>
          <p className="text-gray-600">There are no client care or video consultation requests awaiting action.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const dateTime = formatDateTime(request.appointmentDate || request.scheduledTime);
            const isExpanded = expanded === request.id;
            const isUrgent = request.displayUrgency === 'urgent';
            const isVideo = request.requestType === 'video';

            return (
              <div
                key={request.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-shadow hover:shadow-md ${
                  isUrgent ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className={`px-6 py-4 ${isUrgent ? 'bg-red-50' : 'bg-white'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex items-start flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4 ${
                        isVideo ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {isVideo ? <Video className="h-6 w-6" /> : <Heart className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{request.clientName || 'Client'}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isVideo ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {isVideo ? 'Video Consultation' : 'Care Visit'}
                          </span>
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
                        <p className="text-sm text-gray-700 line-clamp-2 mb-2">{request.displayReason}</p>
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

                    <div className="flex items-center gap-2 lg:pt-1">
                      <button
                        onClick={() => startScheduling(request)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium shadow-sm"
                      >
                        <Stethoscope className="h-4 w-4 mr-2" />
                        {isVideo ? 'Schedule Doctor' : 'Assign Caregiver'}
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
                        <p className="mt-1">{request.clientId}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Urgency / Priority</span>
                        <p className={`mt-1 font-medium ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
                          {isUrgent ? 'Urgent' : 'Normal'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preferred Date</span>
                        <p className="mt-1">{dateTime.date}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preferred Time</span>
                        <p className="mt-1">{dateTime.time}</p>
                      </div>
                    </div>
                    {request.notes && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h4>
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

      {/* Schedule / Assign Modal */}
      {scheduling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {scheduling.requestType === 'video' ? 'Schedule Video Consultation' : 'Assign Caregiver Visit'}
                </h2>
                <p className="text-sm text-gray-600">For {scheduling.clientName}</p>
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
                  Request
                </h4>
                <p className="text-sm text-blue-800">{scheduling.displayReason}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {scheduling.requestType === 'video' ? 'Select Doctor *' : 'Select Caregiver *'}
                </label>
                <select
                  value={scheduleForm.assigneeId}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose {scheduling.requestType === 'video' ? 'a doctor' : 'a caregiver'}</option>
                  {(scheduling.requestType === 'video' ? doctors : caregivers).map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={scheduleForm.appointmentDate}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center">
                    {scheduling.requestType === 'video' ? (
                      <><Video className="h-4 w-4 mr-2 text-purple-600" />Video Call</>
                    ) : (
                      <><Heart className="h-4 w-4 mr-2 text-green-600" />Care Visit</>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduling Notes</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes for the client or provider..."
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {scheduling.requestType === 'video' ? 'Confirm Schedule' : 'Confirm Assignment'}
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

export default ClientCareRequests;

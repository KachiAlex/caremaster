import React, { useState, useEffect } from 'react';
import {
  Video,
  Phone,
  Calendar,
  Clock,
  Download,
  FileText,
  Plus,
  X,
  Filter,
  MoreVertical
} from 'lucide-react';
import telemedicineAPI from '../api/telemedicineAPI';
import { toast } from 'react-toastify';
import { useAuthState } from 'backend/auth-hooks';
import DocumentManager from '../components/DocumentManager';
import ConsultationCall from '../components/ConsultationCall';
import { auth } from '../backend/config';
import { useUser } from '../contexts/UserContext';
import { notifyAdmins, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../services/notificationService';

const Telemedicine = () => {
  const [user, userLoading] = useAuthState(auth);
  const { userProfile, institutionId: contextInstitutionId } = useUser();
  const [appointments, setAppointments] = useState([]);
  // The appointment the user is currently in a video call for (or null)
  const [activeCall, setActiveCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedAppointmentForDocs, setSelectedAppointmentForDocs] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    reason: '',
    preferredDate: '',
    preferredTime: '',
    urgency: 'normal',
    notes: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Canonical user id — used for appointment scoping (client_id / doctor_id)
  const myUserId = userProfile?.id || user?.id || user?.uid;
  const isDoctor = userProfile?.user_type === 'doctor' || userProfile?.userType === 'doctor';
  const userType = isDoctor ? 'doctor' : 'Client';

  useEffect(() => {
    if (user && !userLoading) {
      loadTelemedicineData();
    }
  }, [user, userLoading]);

  const loadTelemedicineData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!myUserId) {
        setLoading(false);
        return;
      }

      // Load appointments from Backend
      const appointmentsData = await telemedicineAPI.getAppointments(myUserId, userType);

      // Format appointments for display
      const formattedAppointments = appointmentsData.map(appointment =>
        telemedicineAPI.formatAppointmentForDisplay(appointment)
      );

      setAppointments(formattedAppointments);
      setLoading(false);
    } catch (error) {
      console.error('Error loading telemedicine data:', error);
      setError('Failed to load appointments. Please try again.');
      setLoading(false);
      setAppointments([]);
    }
  };


  // Open the WebRTC consultation call for a scheduled appointment.
  // Both parties join the deterministic channel consult_<appointmentId>.
  const startCall = async (appointment) => {
    setActiveCall(appointment);
    // Record the call session (marks the appointment in-progress)
    try {
      const callResult = await telemedicineAPI.startCall(appointment.id, {
        clientId: isDoctor ? appointment.clientId : myUserId,
        doctorId: isDoctor ? myUserId : appointment.doctorId,
        channelName: `consult_${appointment.id}`,
        callType: appointment.type || 'video',
        status: 'active'
      });
      setActiveCall(prev => prev && prev.id === appointment.id
        ? { ...prev, callId: callResult.id }
        : prev);
    } catch (backendError) {
      console.warn('Failed to save call to Backend:', backendError);
      // Continue with call even if Backend save fails
    }
  };

  // Called by ConsultationCall when either side ends the call
  const handleCallEnded = async (durationSeconds) => {
    const ended = activeCall;
    setActiveCall(null);

    if (ended?.callId) {
      try {
        await telemedicineAPI.endCall(ended.callId, {
          duration: durationSeconds || 0,
          endReason: 'user_ended'
        });
      } catch (backendError) {
        console.warn('Failed to save call end to Backend:', backendError);
        // Still mark the appointment completed locally
        telemedicineAPI.updateAppointmentStatus(ended.id, 'completed').catch(() => {});
      }
    } else if (ended?.id) {
      telemedicineAPI.updateAppointmentStatus(ended.id, 'completed').catch(() => {});
    }

    loadTelemedicineData();
  };

  const openRequestModal = () => {
    setRequestForm({
      reason: '',
      preferredDate: '',
      preferredTime: '',
      urgency: 'normal',
      notes: ''
    });
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
  };

  const handleRequestChange = (field, value) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
  };

  const submitConsultationRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.reason.trim()) {
      toast.error('Please provide a reason for the consultation');
      return;
    }

    setSubmittingRequest(true);
    try {
      const requestData = {
        clientId: myUserId,
        clientName: userProfile?.name || user.displayName || user.email || 'Client',
        reason: requestForm.reason,
        notes: requestForm.notes,
        urgency: requestForm.urgency,
        status: 'requested',
        type: 'video',
        appointmentDate: requestForm.preferredDate
          ? new Date(`${requestForm.preferredDate}T${requestForm.preferredTime || '09:00'}`)
          : null,
        duration: 30,
        requestedAt: new Date().toISOString(),
        requestedBy: myUserId
      };

      await telemedicineAPI.requestConsultation(requestData);
      toast.success('Video consultation request submitted. An admin will schedule a doctor for you.');
      
      // Notify institution admins of the new video consultation request
      const institutionId = userProfile?.institutionId || contextInstitutionId || null;
      if (institutionId) {
        try {
          await notifyAdmins(institutionId, {
            type: NOTIFICATION_TYPES.CONSULTATION,
            title: 'New Video Consultation Request',
            message: `${userProfile?.name || user?.displayName || 'A client'} requested a video consultation${requestForm.reason ? `: ${requestForm.reason.substring(0, 80)}` : '.'}`,
            priority: requestForm.urgency === 'urgent' ? NOTIFICATION_PRIORITIES.HIGH : NOTIFICATION_PRIORITIES.MEDIUM,
            navigateTo: '/institution-admin/dashboard',
            metadata: {
              clientName: userProfile?.name || user?.displayName || 'Client',
              reason: requestForm.reason,
              urgency: requestForm.urgency,
            },
          });
        } catch (notifErr) {
          console.warn('Failed to send admin notification:', notifErr);
        }
      }
      
      closeRequestModal();
      loadTelemedicineData();
    } catch (error) {
      console.error('Failed to request consultation:', error);
      toast.error('Failed to submit consultation request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openDocuments = (appointment) => {
    setSelectedAppointmentForDocs(appointment);
    setShowDocuments(true);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const formatDateTime = (dateTime) => {
    if (!dateTime) return { date: 'N/A', time: 'N/A' };
    const d = dateTime?.toDate ? dateTime.toDate() : new Date(dateTime);
    if (isNaN(d.getTime())) return { date: 'N/A', time: 'N/A' };
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Show loading state while user is being authenticated
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access telemedicine features.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
          <p className="text-gray-600">Virtual consultations and remote healthcare</p>
        </div>
        <div className="flex items-center space-x-3">
          {!isDoctor && (
            <button
              onClick={openRequestModal}
              className="btn btn-primary"
              title="Request a new video consultation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Video Consultation
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Active Consultation Call — WebRTC overlay */}
      {activeCall && (
        <ConsultationCall
          appointment={activeCall}
          role={isDoctor ? 'doctor' : 'client'}
          onEnd={handleCallEnded}
        />
      )}

      {/* Upcoming Appointments & Requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Video Consultations</h2>
        </div>
        <div className="space-y-4">
          {appointments.filter(apt => apt.status === 'requested' || apt.status === 'scheduled' || apt.status === 'in-progress').sort((a, b) => {
            const aTime = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
            const bTime = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
            return aTime - bTime;
          }).map((appointment) => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-medium">
                      {appointment.doctorName ? appointment.doctorName.split(' ').map(n => n[0]).join('') : (appointment.status === 'requested' ? '?' : 'DC')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {appointment.status === 'requested' ? 'Pending Request' : (appointment.doctorName || 'Doctor')}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'requested' ? 'Requested' : appointment.status}
                      </span>
                      {appointment.urgency && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.urgency === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {appointment.urgency}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      {appointment.reason && (
                        <div className="col-span-1 md:col-span-2">
                          <span className="font-medium">Reason:</span> {appointment.reason}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).date : 'TBD'}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).time : 'TBD'} ({appointment.duration || 30}min)</span>
                      </div>
                    </div>
                    {appointment.notes && (
                      <p className="mt-2 text-sm text-gray-600">{appointment.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {appointment.status === 'scheduled' || appointment.status === 'in-progress' ? (
                    <button
                      onClick={() => startCall(appointment)}
                      className="btn btn-primary"
                    >
                      {appointment.type === 'video' ? <Video className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                      Join Call
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn btn-secondary opacity-60 cursor-not-allowed"
                      title="Waiting for an admin to schedule a doctor"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {appointments.filter(apt => apt.status === 'requested' || apt.status === 'scheduled' || apt.status === 'in-progress').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No video consultations or requests yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Consultations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Consultations</h2>
          <button className="btn btn-secondary">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.filter(apt => apt.status === 'completed').map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {appointment.doctorName ? appointment.doctorName.split(' ').map(n => n[0]).join('') : 'DC'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{appointment.doctorName || 'Doctor'}</div>
                        <div className="text-sm text-gray-500">{appointment.doctorSpecialty || 'General Practice'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.clientName || 'Client'}</div>
                    <div className="text-sm text-gray-500">Age: {appointment.patientAge || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).date : 'TBD'}</div>
                    <div className="text-sm text-gray-500">{appointment.appointmentDate ? formatDateTime(appointment.appointmentDate).time : 'TBD'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {appointment.type === 'video' ? <Video className="h-4 w-4 text-blue-600 mr-1" /> : <Phone className="h-4 w-4 text-green-600 mr-1" />}
                      <span className="text-sm text-gray-900 capitalize">{appointment.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openDocuments(appointment)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Download Invoice & Prescription"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      {appointment.recording && (
                        <button className="text-green-600 hover:text-green-900">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-purple-600 hover:text-purple-900">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Manager Modal */}
      {showDocuments && selectedAppointmentForDocs && (
        <DocumentManager
          appointment={selectedAppointmentForDocs}
          patientInfo={{
            name: user?.displayName || 'Client Name',
            email: user?.email,
            phone: user?.phoneNumber || '+234 XXX XXX XXXX',
            address: 'Client Address',
            age: 65,
            gender: 'Not specified',
            id: user?.uid
          }}
          doctorInfo={{
            name: selectedAppointmentForDocs.doctorName || 'Healthcare Provider',
            specialty: selectedAppointmentForDocs.doctorSpecialty || 'General Practice',
            email: 'doctor@Care Master.com',
            phone: '+234 800 Care Master',
            licenseNumber: 'MD-2024-001',
            qualifications: ['MBBS', 'MD'],
            hospital: 'Care Master Telemedicine Platform'
          }}
          onClose={() => setShowDocuments(false)}
        />
      )}
      {/* Request Video Consultation Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Request Video Consultation</h2>
                <p className="text-sm text-gray-600">An admin will review and assign a doctor</p>
              </div>
              <button
                onClick={closeRequestModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitConsultationRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason / Chief Complaint *
                </label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => handleRequestChange('reason', e.target.value)}
                  placeholder="Describe the reason for the video consultation..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={requestForm.preferredDate}
                    onChange={(e) => handleRequestChange('preferredDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                  <input
                    type="time"
                    value={requestForm.preferredTime}
                    onChange={(e) => handleRequestChange('preferredTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  value={requestForm.urgency}
                  onChange={(e) => handleRequestChange('urgency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => handleRequestChange('notes', e.target.value)}
                  placeholder="Any other details the doctor should know..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
                >
                  {submittingRequest ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Request
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

export default Telemedicine;

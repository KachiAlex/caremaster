import React, { useState, useEffect } from 'react';
import { X, Plus, Stethoscope, Clock, User, FileText, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import { getConsultationsByClient, createConsultation } from '../api/consultationsAPI';
import { useUser } from '../contexts/UserContext';

const ConsultationsLogModal = ({ client, isOpen, onClose, institutionId }) => {
  const { user, userProfile } = useUser();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [consultationFormData, setConsultationFormData] = useState({
    consultationType: 'review',
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    notes: '',
    followUpRequired: false,
    followUpDate: null,
    followUpNotes: ''
  });

  useEffect(() => {
    if (isOpen && client?.id) {
      loadConsultations();
    }
  }, [isOpen, client]);

  const loadConsultations = async () => {
    if (!client?.id) return;
    
    setLoading(true);
    try {
      const clientId = client.id || client.clientId || client.uid;
      const consultationsData = await getConsultationsByClient(clientId);
      setConsultations(consultationsData || []);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Failed to load consultations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConsultation = () => {
    setShowAddForm(true);
    setConsultationFormData({
      consultationType: 'review',
      chiefComplaint: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      notes: '',
      followUpRequired: false,
      followUpDate: null,
      followUpNotes: ''
    });
  };

  const handleSubmitConsultation = async () => {
    try {
      const clientId = client.id || client.clientId || client.uid;
      const clientName = client.name || client.fullName || 'Client';
      const doctorId = user?.uid;
      const doctorName = userProfile?.name || userProfile?.displayName || 'Doctor';

      await createConsultation({
        clientId: clientId,
        clientName: clientName,
        doctorId: doctorId,
        doctorName: doctorName,
        institutionId: institutionId,
        consultationType: consultationFormData.consultationType,
        chiefComplaint: consultationFormData.chiefComplaint,
        subjective: consultationFormData.subjective,
        objective: consultationFormData.objective,
        assessment: consultationFormData.assessment,
        plan: consultationFormData.plan,
        notes: consultationFormData.notes,
        followUpRequired: consultationFormData.followUpRequired,
        followUpDate: consultationFormData.followUpDate,
        followUpNotes: consultationFormData.followUpNotes
      });

      toast.success('Consultation recorded successfully');
      await loadConsultations();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Failed to record consultation');
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  if (!isOpen) return null;

  const clientId = client?.id || client?.clientId || client?.uid;
  const clientName = client?.name || client?.fullName || 'Client';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Stethoscope className="h-7 w-7 mr-3" />
                Consultations Log
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {clientName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {showAddForm ? (
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Record New Consultation</h3>
                  <p className="text-sm text-gray-600">Fill in the consultation details</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Consultation Type
                    </label>
                    <select
                      value={consultationFormData.consultationType}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, consultationType: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="review">Review</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="telemedicine">Telemedicine</option>
                      <option value="in-person">In-Person</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Chief Complaint *
                    </label>
                    <input
                      type="text"
                      value={consultationFormData.chiefComplaint}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                      placeholder="Enter chief complaint"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subjective (Client's Description)
                    </label>
                    <textarea
                      value={consultationFormData.subjective}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, subjective: e.target.value }))}
                      placeholder="Client's description of symptoms"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Objective (Doctor's Observations)
                    </label>
                    <textarea
                      value={consultationFormData.objective}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, objective: e.target.value }))}
                      placeholder="Doctor's observations and findings"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assessment (Diagnosis)
                    </label>
                    <textarea
                      value={consultationFormData.assessment}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, assessment: e.target.value }))}
                      placeholder="Diagnosis or assessment"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Plan (Treatment Plan)
                    </label>
                    <textarea
                      value={consultationFormData.plan}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, plan: e.target.value }))}
                      placeholder="Treatment plan and recommendations"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={consultationFormData.notes}
                      onChange={(e) => setConsultationFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional notes"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={consultationFormData.followUpRequired}
                        onChange={(e) => setConsultationFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Follow-up required</span>
                    </label>
                  </div>
                  {consultationFormData.followUpRequired && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={consultationFormData.followUpDate || ''}
                        onChange={(e) => setConsultationFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCancelAdd}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitConsultation}
                      disabled={!consultationFormData.chiefComplaint}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Consultation
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Add Button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleAddConsultation}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Record New Consultation
                  </button>
                </div>

                {/* Logs List */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading consultations...</p>
                  </div>
                ) : consultations.length === 0 ? (
                  <div className="text-center py-12">
                    <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No consultations recorded yet</p>
                    <p className="text-gray-500 text-sm mt-2">Click "Record New Consultation" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultations.map((consultation) => {
                      const consultationDate = formatDate(consultation.consultationDate || consultation.createdAt);
                      const doctorName = consultation.doctorName || 'Unknown Doctor';

                      return (
                        <div
                          key={consultation.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 flex items-center">
                                  <Stethoscope className="h-5 w-5 mr-2 text-blue-600" />
                                  {consultation.consultationType || 'Consultation'}
                                </h3>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {consultation.status || 'completed'}
                                </span>
                              </div>
                              {consultation.chiefComplaint && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <span className="font-medium">Chief Complaint:</span> {consultation.chiefComplaint}
                                </p>
                              )}
                              {consultation.assessment && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <span className="font-medium">Assessment:</span> {consultation.assessment}
                                </p>
                              )}
                              {consultation.plan && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <span className="font-medium">Plan:</span> {consultation.plan}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  <span>Dr. {doctorName}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>{consultationDate}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConsultationsLogModal;


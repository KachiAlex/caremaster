import React, { useState } from 'react';
import { Stethoscope, User, Clock, Eye, FileText, Activity, Calendar, ChevronDown, ChevronUp, Video, UserCheck } from 'lucide-react';

const ConsultationsTabContent = ({
  isDoctor,
  selectedClient,
  consultations,
  onOpenConsultationModal,
  userProfile
}) => {
  const [expandedConsultation, setExpandedConsultation] = useState(null);

  const getConsultationTypeIcon = (type) => {
    const icons = {
      telemedicine: <Video className="h-4 w-4" />,
      'in-person': <UserCheck className="h-4 w-4" />,
      'follow-up': <Calendar className="h-4 w-4" />,
      review: <FileText className="h-4 w-4" />,
      emergency: <Activity className="h-4 w-4" />
    };
    return icons[type] || <Stethoscope className="h-4 w-4" />;
  };

  const getConsultationTypeBadge = (type) => {
    const config = {
      telemedicine: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Telemedicine' },
      'in-person': { bg: 'bg-green-100', text: 'text-green-800', label: 'In-Person' },
      'follow-up': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Follow-Up' },
      review: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Review' },
      emergency: { bg: 'bg-red-100', text: 'text-red-800', label: 'Emergency' }
    };
    const cfg = config[type] || config.review;
    return (
      <span className={`px-3 py-1 ${cfg.bg} ${cfg.text} rounded-full text-xs font-semibold flex items-center`}>
        {getConsultationTypeIcon(type)}
        <span className="ml-1">{cfg.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Stethoscope className="h-8 w-8 text-blue-600 mr-3" />
            Consultation Notes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isDoctor ? 'Write and review consultation notes' : 'View consultation history and medical notes'}
          </p>
        </div>
        {isDoctor && selectedClient && (
          <button
            onClick={onOpenConsultationModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center font-medium"
          >
            <FileText className="h-5 w-5 mr-2" />
            Write Consultation
          </button>
        )}
      </div>

      {/* Client Info Banner */}
      {selectedClient ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-bold text-gray-900">
                  {selectedClient.name || selectedClient.fullName}
                </h3>
                <p className="text-sm text-gray-600">
                  {consultations.length} consultation{consultations.length !== 1 ? 's' : ''} on record
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Stethoscope className="h-20 w-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Client Selected</h3>
          <p className="text-gray-600">
            Please select a client from the dropdown above to view their consultation history.
          </p>
        </div>
      )}

      {/* Consultations List */}
      {selectedClient && (
        <div className="space-y-4">
          {consultations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Consultations Yet</h3>
              <p className="text-gray-600 mb-4">
                {isDoctor 
                  ? 'Start by writing the first consultation note for this client.'
                  : 'No consultation notes have been recorded for this client yet.'}
              </p>
              {isDoctor && (
                <button
                  onClick={onOpenConsultationModal}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Write First Consultation
                </button>
              )}
            </div>
          ) : (
            consultations.map((consultation) => (
              <div
                key={consultation.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Consultation Header */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getConsultationTypeBadge(consultation.consultationType)}
                        {consultation.followUpRequired && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Follow-up Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Dr. {consultation.doctorName}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(consultation.consultationDate).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedConsultation(
                        expandedConsultation === consultation.id ? null : consultation.id
                      )}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm font-medium"
                    >
                      {expandedConsultation === consultation.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </>
                      )}
                    </button>
                  </div>
                  {consultation.chiefComplaint && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Chief Complaint:</span>
                      <p className="text-sm text-gray-900 mt-1 font-medium">{consultation.chiefComplaint}</p>
                    </div>
                  )}
                </div>

                {/* Consultation Details */}
                {expandedConsultation === consultation.id && (
                  <div className="p-6 space-y-5">
                    {/* SOAP Notes */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                      <h4 className="text-md font-bold text-gray-900 mb-4 flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        Clinical Notes (SOAP)
                      </h4>
                      
                      <div className="space-y-4">
                        {/* Subjective */}
                        {consultation.subjective && (
                          <div className="bg-white rounded-lg p-4">
                            <h5 className="text-xs font-bold text-blue-600 uppercase mb-2">
                              S - Subjective
                            </h5>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                              {consultation.subjective}
                            </p>
                          </div>
                        )}

                        {/* Objective */}
                        {consultation.objective && (
                          <div className="bg-white rounded-lg p-4">
                            <h5 className="text-xs font-bold text-green-600 uppercase mb-2">
                              O - Objective
                            </h5>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                              {consultation.objective}
                            </p>
                          </div>
                        )}

                        {/* Assessment */}
                        {consultation.assessment && (
                          <div className="bg-white rounded-lg p-4">
                            <h5 className="text-xs font-bold text-purple-600 uppercase mb-2">
                              A - Assessment
                            </h5>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                              {consultation.assessment}
                            </p>
                          </div>
                        )}

                        {/* Plan */}
                        {consultation.plan && (
                          <div className="bg-white rounded-lg p-4">
                            <h5 className="text-xs font-bold text-orange-600 uppercase mb-2">
                              P - Plan
                            </h5>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                              {consultation.plan}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vital Signs */}
                    {consultation.vitalSigns && Object.keys(consultation.vitalSigns).some(k => consultation.vitalSigns[k]) && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                          <Activity className="h-4 w-4 text-red-600 mr-2" />
                          Vital Signs
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {consultation.vitalSigns.bloodPressure && (
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <p className="text-xs text-gray-600">Blood Pressure</p>
                              <p className="text-sm font-semibold text-gray-900">{consultation.vitalSigns.bloodPressure}</p>
                            </div>
                          )}
                          {consultation.vitalSigns.pulse && (
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <p className="text-xs text-gray-600">Pulse</p>
                              <p className="text-sm font-semibold text-gray-900">{consultation.vitalSigns.pulse} bpm</p>
                            </div>
                          )}
                          {consultation.vitalSigns.temperature && (
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <p className="text-xs text-gray-600">Temperature</p>
                              <p className="text-sm font-semibold text-gray-900">{consultation.vitalSigns.temperature}°C</p>
                            </div>
                          )}
                          {consultation.vitalSigns.oxygenSaturation && (
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <p className="text-xs text-gray-600">O2 Saturation</p>
                              <p className="text-sm font-semibold text-gray-900">{consultation.vitalSigns.oxygenSaturation}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Follow-Up */}
                    {consultation.followUpRequired && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-yellow-900 mb-2 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Follow-Up Required
                        </h5>
                        {consultation.followUpDate && (
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">Date:</span> {new Date(consultation.followUpDate).toLocaleDateString()}
                          </p>
                        )}
                        {consultation.followUpNotes && (
                          <p className="text-sm text-gray-900 mt-2">
                            <span className="font-semibold">Notes:</span> {consultation.followUpNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Additional Notes */}
                    {consultation.notes && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-gray-900 mb-2">Additional Notes</h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{consultation.notes}</p>
                      </div>
                    )}

                    {/* Private Notes - Only visible to doctors */}
                    {isDoctor && consultation.privateNotes && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-yellow-900 mb-2">🔒 Private Notes (Doctor Only)</h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{consultation.privateNotes}</p>
                      </div>
                    )}

                    {/* Related Documents */}
                    {(consultation.relatedMedicalReports?.length > 0 || consultation.relatedCareLogs?.length > 0) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-blue-900 mb-2">📎 Related Documents</h5>
                        <div className="text-sm text-gray-700">
                          {consultation.relatedMedicalReports?.length > 0 && (
                            <p>• {consultation.relatedMedicalReports.length} Medical Report(s)</p>
                          )}
                          {consultation.relatedCareLogs?.length > 0 && (
                            <p>• {consultation.relatedCareLogs.length} Care Log(s)</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Information Box for Non-Doctors */}
      {!isDoctor && selectedClient && consultations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h4 className="text-sm font-bold text-blue-900 mb-2">📋 About Consultation Notes</h4>
          <p className="text-sm text-gray-700">
            These consultation notes are written by doctors after medical consultations. Review them to better understand
            the client's medical condition, treatment plan, and care requirements. If you have questions about any
            consultation, please consult with the attending doctor.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsultationsTabContent;


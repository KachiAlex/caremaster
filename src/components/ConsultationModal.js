import React, { useState } from 'react';
import { X, FileText, Activity, Stethoscope, ClipboardList, Calendar } from 'lucide-react';

const ConsultationModal = ({
  isOpen,
  onClose,
  consultationFormData,
  setConsultationFormData,
  onSubmit,
  selectedClient,
  relatedMedicalReports = [],
  relatedCareLogs = []
}) => {
  const [showRelatedDocs, setShowRelatedDocs] = useState(false);

  if (!isOpen) return null;

  const handleFieldChange = (field, value) => {
    setConsultationFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVitalSignChange = (field, value) => {
    setConsultationFormData(prev => ({
      ...prev,
      vitalSigns: {
        ...(prev.vitalSigns || {}),
        [field]: value
      }
    }));
  };

  const toggleRelatedReport = (reportId) => {
    const current = consultationFormData.relatedMedicalReports || [];
    const newRelated = current.includes(reportId)
      ? current.filter(id => id !== reportId)
      : [...current, reportId];
    handleFieldChange('relatedMedicalReports', newRelated);
  };

  const toggleRelatedCareLog = (logId) => {
    const current = consultationFormData.relatedCareLogs || [];
    const newRelated = current.includes(logId)
      ? current.filter(id => id !== logId)
      : [...current, logId];
    handleFieldChange('relatedCareLogs', newRelated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Stethoscope className="h-7 w-7 mr-3" />
              Write Consultation Note
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {selectedClient ? `For ${selectedClient.name || selectedClient.fullName}` : 'No client selected'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Consultation Type and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Consultation Type *
              </label>
              <select
                value={consultationFormData.consultationType}
                onChange={(e) => handleFieldChange('consultationType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="telemedicine">Telemedicine</option>
                <option value="in-person">In-Person</option>
                <option value="follow-up">Follow-Up</option>
                <option value="review">Review</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Consultation Date *
              </label>
              <input
                type="datetime-local"
                value={consultationFormData.consultationDate}
                onChange={(e) => handleFieldChange('consultationDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chief Complaint *
            </label>
            <input
              type="text"
              value={consultationFormData.chiefComplaint}
              onChange={(e) => handleFieldChange('chiefComplaint', e.target.value)}
              placeholder="Main reason for consultation"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* SOAP Notes Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <ClipboardList className="h-5 w-5 text-blue-600 mr-2" />
              SOAP Notes
            </h3>

            <div className="space-y-4">
              {/* Subjective */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subjective (Patient's Description) *
                </label>
                <textarea
                  value={consultationFormData.subjective}
                  onChange={(e) => handleFieldChange('subjective', e.target.value)}
                  placeholder="Patient's symptoms, complaints, and concerns in their own words..."
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Objective */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objective (Clinical Findings) *
                </label>
                <textarea
                  value={consultationFormData.objective}
                  onChange={(e) => handleFieldChange('objective', e.target.value)}
                  placeholder="Physical examination findings, vital signs, lab results..."
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Assessment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessment (Diagnosis) *
                </label>
                <textarea
                  value={consultationFormData.assessment}
                  onChange={(e) => handleFieldChange('assessment', e.target.value)}
                  placeholder="Clinical diagnosis, differential diagnosis, problem list..."
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Plan (Treatment) *
                </label>
                <textarea
                  value={consultationFormData.plan}
                  onChange={(e) => handleFieldChange('plan', e.target.value)}
                  placeholder="Treatment plan, medications prescribed, investigations ordered, follow-up..."
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Vital Signs (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Activity className="h-4 w-4 inline mr-1" />
              Vital Signs (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="BP (e.g., 120/80)"
                value={consultationFormData.vitalSigns?.bloodPressure || ''}
                onChange={(e) => handleVitalSignChange('bloodPressure', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Pulse (bpm)"
                value={consultationFormData.vitalSigns?.pulse || ''}
                onChange={(e) => handleVitalSignChange('pulse', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Temp (°C)"
                value={consultationFormData.vitalSigns?.temperature || ''}
                onChange={(e) => handleVitalSignChange('temperature', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="O2 Sat (%)"
                value={consultationFormData.vitalSigns?.oxygenSaturation || ''}
                onChange={(e) => handleVitalSignChange('oxygenSaturation', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Follow-Up */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={consultationFormData.followUpRequired}
                onChange={(e) => handleFieldChange('followUpRequired', e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="followUpRequired" className="ml-3 text-sm font-semibold text-gray-900">
                <Calendar className="h-4 w-4 inline mr-1" />
                Follow-Up Required
              </label>
            </div>
            {consultationFormData.followUpRequired && (
              <div className="space-y-3">
                <input
                  type="date"
                  value={consultationFormData.followUpDate || ''}
                  onChange={(e) => handleFieldChange('followUpDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <textarea
                  value={consultationFormData.followUpNotes}
                  onChange={(e) => handleFieldChange('followUpNotes', e.target.value)}
                  placeholder="Follow-up instructions and notes..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Related Documents */}
          {(relatedMedicalReports.length > 0 || relatedCareLogs.length > 0) && (
            <div>
              <button
                onClick={() => setShowRelatedDocs(!showRelatedDocs)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 mb-2"
              >
                {showRelatedDocs ? '▼' : '▶'} Link Related Documents ({relatedMedicalReports.length + relatedCareLogs.length} available)
              </button>
              {showRelatedDocs && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  {relatedMedicalReports.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Medical Reports</h4>
                      <div className="space-y-2">
                        {relatedMedicalReports.map(report => (
                          <label key={report.id} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={(consultationFormData.relatedMedicalReports || []).includes(report.id)}
                              onChange={() => toggleRelatedReport(report.id)}
                              className="mr-2 h-4 w-4 text-blue-600"
                            />
                            <span className="text-gray-700">
                              {new Date(report.reportDate).toLocaleDateString()} - {report.diagnosis || 'Medical Report'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {relatedCareLogs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Recent Care Logs</h4>
                      <div className="space-y-2">
                        {relatedCareLogs.slice(0, 5).map(log => (
                          <label key={log.id} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={(consultationFormData.relatedCareLogs || []).includes(log.id)}
                              onChange={() => toggleRelatedCareLog(log.id)}
                              className="mr-2 h-4 w-4 text-blue-600"
                            />
                            <span className="text-gray-700">
                              {log.logDate} - {log.activityType || log.notes?.substring(0, 50)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={consultationFormData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Any additional observations or instructions..."
              rows="2"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Private Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Private Notes (Doctor Only)
            </label>
            <textarea
              value={consultationFormData.privateNotes}
              onChange={(e) => handleFieldChange('privateNotes', e.target.value)}
              placeholder="Private notes visible only to doctors..."
              rows="2"
              className="w-full px-4 py-3 border border-yellow-200 bg-yellow-50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-colors font-medium flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Save Consultation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationModal;


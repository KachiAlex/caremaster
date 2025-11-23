/**
 * SOAP Notes Display Component
 * 
 * Displays structured SOAP notes in a readable format
 */

import React from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatSOAPNoteForDisplay } from '../api/soapNotesAPI';

const SOAPNotesDisplay = ({ soapNote }) => {
  if (!soapNote) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No SOAP notes available</p>
      </div>
    );
  }

  const formatted = formatSOAPNoteForDisplay(soapNote);

  return (
    <div className="space-y-6">
      {/* Subjective Section */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          S - Subjective
        </h3>

        <div className="space-y-3 text-sm">
          {formatted.subjective.chiefComplaint && (
            <div>
              <span className="font-medium text-blue-900">Chief Complaint:</span>
              <p className="text-gray-700 mt-1">{formatted.subjective.chiefComplaint}</p>
            </div>
          )}

          {formatted.subjective.historyOfPresentIllness && (
            <div>
              <span className="font-medium text-blue-900">History of Present Illness:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{formatted.subjective.historyOfPresentIllness}</p>
            </div>
          )}

          {formatted.subjective.pastMedicalHistory.length > 0 && (
            <div>
              <span className="font-medium text-blue-900">Past Medical History:</span>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                {formatted.subjective.pastMedicalHistory.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {formatted.subjective.medications.length > 0 && (
            <div>
              <span className="font-medium text-blue-900">Current Medications:</span>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                {formatted.subjective.medications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {formatted.subjective.allergies.length > 0 && (
            <div>
              <span className="font-medium text-red-900">Allergies:</span>
              <ul className="list-disc list-inside text-red-700 mt-1">
                {formatted.subjective.allergies.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Objective Section */}
      <div className="bg-green-50 rounded-xl border border-green-200 p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          O - Objective
        </h3>

        <div className="space-y-3 text-sm">
          {formatted.objective.vitalSigns && (
            <div>
              <span className="font-medium text-green-900">Vital Signs:</span>
              <div className="grid grid-cols-3 gap-2 mt-1 text-gray-700">
                {formatted.objective.vitalSigns.bloodPressure !== 'Not recorded' && (
                  <div>BP: {formatted.objective.vitalSigns.bloodPressure}</div>
                )}
                {formatted.objective.vitalSigns.heartRate !== 'Not recorded' && (
                  <div>HR: {formatted.objective.vitalSigns.heartRate} bpm</div>
                )}
                {formatted.objective.vitalSigns.temperature !== 'Not recorded' && (
                  <div>Temp: {formatted.objective.vitalSigns.temperature}°C</div>
                )}
                {formatted.objective.vitalSigns.respiratoryRate !== 'Not recorded' && (
                  <div>RR: {formatted.objective.vitalSigns.respiratoryRate}</div>
                )}
                {formatted.objective.vitalSigns.oxygenSaturation !== 'Not recorded' && (
                  <div>SpO2: {formatted.objective.vitalSigns.oxygenSaturation}%</div>
                )}
                {formatted.objective.vitalSigns.weight !== 'Not recorded' && (
                  <div>Weight: {formatted.objective.vitalSigns.weight} kg</div>
                )}
              </div>
            </div>
          )}

          {formatted.objective.physicalExamination && Object.values(formatted.objective.physicalExamination).some(v => v !== 'Not documented') && (
            <div>
              <span className="font-medium text-green-900">Physical Examination:</span>
              <div className="mt-1 space-y-1 text-gray-700">
                {Object.entries(formatted.objective.physicalExamination).map(([system, findings]) => (
                  findings !== 'Not documented' && (
                    <div key={system}>
                      <span className="font-medium capitalize">{system.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="ml-2">{findings}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {formatted.objective.otherObservations && (
            <div>
              <span className="font-medium text-green-900">Other Observations:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{formatted.objective.otherObservations}</p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Section */}
      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          A - Assessment
        </h3>

        <div className="space-y-3 text-sm">
          {formatted.assessment.primaryDiagnosis && (
            <div>
              <span className="font-medium text-yellow-900">Primary Diagnosis:</span>
              <p className="text-gray-700 mt-1">
                {formatted.assessment.primaryDiagnosis}
                {formatted.assessment.primaryDiagnosisICD10 && (
                  <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">
                    ICD-10: {formatted.assessment.primaryDiagnosisICD10}
                  </span>
                )}
              </p>
            </div>
          )}

          {formatted.assessment.clinicalImpression && (
            <div>
              <span className="font-medium text-yellow-900">Clinical Impression:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{formatted.assessment.clinicalImpression}</p>
            </div>
          )}

          {formatted.assessment.secondaryDiagnoses.length > 0 && (
            <div>
              <span className="font-medium text-yellow-900">Secondary Diagnoses:</span>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                {formatted.assessment.secondaryDiagnoses.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Plan Section */}
      <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          P - Plan
        </h3>

        <div className="space-y-3 text-sm">
          {formatted.plan.medications.length > 0 && (
            <div>
              <span className="font-medium text-purple-900">Medications:</span>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                {formatted.plan.medications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {formatted.plan.procedures.length > 0 && (
            <div>
              <span className="font-medium text-purple-900">Procedures:</span>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                {formatted.plan.procedures.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {formatted.plan.diagnosticTests.length > 0 && (
            <div>
              <span className="font-medium text-purple-900">Diagnostic Tests:</span>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                {formatted.plan.diagnosticTests.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {formatted.plan.followUp && formatted.plan.followUp.required && (
            <div>
              <span className="font-medium text-purple-900">Follow-up:</span>
              <div className="mt-1 text-gray-700">
                {formatted.plan.followUp.date && (
                  <div>Date: {new Date(formatted.plan.followUp.date).toLocaleDateString()}</div>
                )}
                {formatted.plan.followUp.notes && (
                  <div className="mt-1">{formatted.plan.followUp.notes}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SOAPNotesDisplay;


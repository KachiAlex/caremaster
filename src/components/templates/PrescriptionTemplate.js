import React from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Stethoscope,
  Pill,
  AlertTriangle,
  Clock,
  CheckCircle,
  Shield
} from 'lucide-react';

const PrescriptionTemplate = ({ 
  prescriptionData, 
  onDownload, 
  showDownloadButton = true 
}) => {
  const {
    prescriptionNumber,
    appointmentId,
    patientInfo,
    doctorInfo,
    consultationDate,
    medications,
    diagnosis,
    symptoms,
    vitalSigns,
    instructions,
    followUpDate,
    emergencyInstructions,
    validUntil
  } = prescriptionData;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg" id="prescription-template">
      {/* Header */}
      <div className="bg-green-600 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">ElderX Healthcare</h1>
            <p className="text-green-100 mt-2">Professional Medical Prescription</p>
            <div className="mt-4 text-sm">
              <p>📍 Lagos, Nigeria</p>
              <p>📞 +234 800 ELDERX (353379)</p>
              <p>✉️ prescriptions@elderx.com</p>
              <p>🌐 www.elderx.com</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white text-green-600 px-4 py-2 rounded-lg">
              <h2 className="text-xl font-bold">PRESCRIPTION</h2>
              <p className="text-sm">#{prescriptionNumber}</p>
            </div>
            <div className="mt-4 text-sm">
              <p>Date: {formatDate(consultationDate)}</p>
              <p>Time: {formatTime(consultationDate)}</p>
              <p>Valid Until: {formatDate(validUntil)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Information */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Stethoscope className="h-5 w-5 mr-2" />
          Prescribing Physician
        </h3>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-lg text-green-800">{doctorInfo.name}</p>
              <p className="text-green-700">{doctorInfo.specialty}</p>
              <p className="text-gray-600 mt-2">{doctorInfo.qualifications?.join(', ')}</p>
            </div>
            <div>
              <p className="text-gray-600">📧 {doctorInfo.email}</p>
              <p className="text-gray-600">📞 {doctorInfo.phone}</p>
              <p className="text-gray-600">🏥 {doctorInfo.hospital || 'ElderX Telemedicine'}</p>
              <p className="text-sm text-gray-500 mt-2">
                Medical License: {doctorInfo.licenseNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Patient Information
        </h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-lg">{patientInfo.name}</p>
              <p className="text-gray-600">Age: {patientInfo.age} years</p>
              <p className="text-gray-600">Gender: {patientInfo.gender}</p>
              <p className="text-gray-600">📞 {patientInfo.phone}</p>
            </div>
            <div>
              <p className="text-gray-600">📧 {patientInfo.email}</p>
              <p className="text-gray-600">📍 {patientInfo.address}</p>
              <p className="text-sm text-gray-500 mt-2">
                Patient ID: {patientInfo.id}
              </p>
              <p className="text-sm text-gray-500">
                Appointment: {appointmentId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Information */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Clinical Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Diagnosis */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Diagnosis</h4>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-gray-800">{diagnosis}</p>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Presenting Symptoms</h4>
            <div className="bg-red-50 p-3 rounded-lg">
              <ul className="list-disc list-inside text-gray-800">
                {symptoms?.map((symptom, index) => (
                  <li key={index}>{symptom}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Vital Signs */}
          {vitalSigns && (
            <div className="md:col-span-2">
              <h4 className="font-semibold text-gray-700 mb-2">Vital Signs</h4>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Blood Pressure</p>
                    <p className="font-semibold">{vitalSigns.bloodPressure || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Heart Rate</p>
                    <p className="font-semibold">{vitalSigns.heartRate || 'N/A'} bpm</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="font-semibold">{vitalSigns.temperature || 'N/A'}°F</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="font-semibold">{vitalSigns.weight || 'N/A'} kg</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prescription Details */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Pill className="h-5 w-5 mr-2" />
          Prescription Details
        </h3>
        
        <div className="space-y-4">
          {medications?.map((medication, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <h4 className="font-bold text-lg text-gray-800">{medication.name}</h4>
                  <p className="text-gray-600">{medication.genericName}</p>
                  <p className="text-sm text-gray-500 mt-1">{medication.form} • {medication.strength}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dosage</p>
                  <p className="font-semibold">{medication.dosage}</p>
                  <p className="text-sm text-gray-600 mt-1">Frequency</p>
                  <p className="font-semibold">{medication.frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold">{medication.duration}</p>
                  <p className="text-sm text-gray-600 mt-1">Quantity</p>
                  <p className="font-semibold">{medication.quantity}</p>
                </div>
              </div>
              
              {medication.instructions && (
                <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm">
                    <strong>Instructions:</strong> {medication.instructions}
                  </p>
                </div>
              )}
              
              {medication.warnings && (
                <div className="mt-2 p-3 bg-red-50 rounded border-l-4 border-red-400">
                  <p className="text-sm flex items-start">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><strong>Warning:</strong> {medication.warnings}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* General Instructions */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          General Instructions
        </h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-800 whitespace-pre-line">{instructions}</p>
        </div>
      </div>

      {/* Follow-up and Emergency */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Follow-up */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Follow-up Care
            </h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-semibold">Next Appointment</p>
              <p className="text-gray-700">{formatDate(followUpDate)}</p>
              <p className="text-sm text-gray-600 mt-2">
                Please schedule a follow-up consultation to monitor your progress.
              </p>
            </div>
          </div>

          {/* Emergency Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Contact
            </h3>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-semibold text-red-800">If you experience severe side effects:</p>
              <p className="text-red-700 mt-1">
                🚨 Call Emergency: 199 or 112
              </p>
              <p className="text-red-700">
                📞 ElderX 24/7 Hotline: +234 800 ELDERX
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {emergencyInstructions || "Seek immediate medical attention for any severe adverse reactions."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legal and Validation */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-green-600 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">Digital Prescription Verification</h4>
              <p className="text-sm text-gray-600 mt-1">
                This digital prescription is valid and authorized by {doctorInfo.name}, 
                Medical License #{doctorInfo.licenseNumber}. 
                Valid until {formatDate(validUntil)}.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Prescription ID: {prescriptionNumber} | Generated: {formatDate(new Date())}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-6">
        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">
            <strong>ElderX Healthcare Services</strong> - Digital Health Platform
          </p>
          <p className="mb-2">
            This prescription is generated electronically and is valid for medical use.
            Please present this document to your pharmacist.
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <span>📞 +234 800 ELDERX</span>
            <span>✉️ prescriptions@elderx.com</span>
            <span>🌐 www.elderx.com</span>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            ⚠️ Important: Do not share this prescription with others. 
            Follow all medication instructions carefully.
          </p>
        </div>
      </div>

      {/* Download Button */}
      {showDownloadButton && (
        <div className="p-6 border-t bg-white">
          <div className="flex justify-center">
            <button
              onClick={onDownload}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Prescription PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionTemplate;

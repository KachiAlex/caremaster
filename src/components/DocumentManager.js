import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Printer,
  Calendar,
  User,
  DollarSign,
  Pill,
  X,
  CheckCircle
} from 'lucide-react';
import InvoiceTemplate from './templates/InvoiceTemplate';
import PrescriptionTemplate from './templates/PrescriptionTemplate';
import pdfGeneratorService from '../services/pdfGeneratorService';
import { toast } from 'react-toastify';

const DocumentManager = ({ 
  appointment, 
  patientInfo, 
  doctorInfo,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('invoice');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate sample invoice data
  const generateInvoiceData = () => {
    const consultationFee = 15000; // ₦15,000
    const platformFee = 2000; // ₦2,000
    const subtotal = consultationFee + platformFee;
    const tax = subtotal * 0.075; // 7.5% VAT
    const total = subtotal + tax;

    return {
      invoiceNumber: `INV-${Date.now()}`,
      appointmentId: appointment.id,
      patientInfo: {
        name: patientInfo.name || patientInfo.displayName,
        email: patientInfo.email,
        phone: patientInfo.phone || '+234 XXX XXX XXXX',
        address: patientInfo.address || 'Patient Address',
        id: patientInfo.id
      },
      doctorInfo: {
        name: doctorInfo.name || doctorInfo.displayName,
        specialty: doctorInfo.specialty || 'General Practitioner',
        email: doctorInfo.email,
        phone: doctorInfo.phone || '+234 XXX XXX XXXX',
        licenseNumber: doctorInfo.licenseNumber || 'MD-2024-XXXX'
      },
      consultationDate: appointment.appointmentDate || new Date(),
      services: [
        {
          description: 'Telemedicine Consultation',
          details: `${appointment.duration || 30} minute video consultation`,
          duration: appointment.duration || 30,
          rate: consultationFee / (appointment.duration || 30) * 30,
          amount: consultationFee
        },
        {
          description: 'Platform Service Fee',
          details: 'ElderX telemedicine platform usage',
          duration: 1,
          rate: platformFee,
          amount: platformFee
        }
      ],
      subtotal,
      tax,
      total,
      paymentStatus: appointment.paymentStatus || 'paid',
      paymentMethod: appointment.paymentMethod || 'Credit Card',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: 'Thank you for choosing ElderX Healthcare for your telemedicine consultation.'
    };
  };

  // Generate sample prescription data
  const generatePrescriptionData = () => {
    return {
      prescriptionNumber: `RX-${Date.now()}`,
      appointmentId: appointment.id,
      patientInfo: {
        name: patientInfo.name || patientInfo.displayName,
        email: patientInfo.email,
        phone: patientInfo.phone || '+234 XXX XXX XXXX',
        address: patientInfo.address || 'Patient Address',
        age: patientInfo.age || 'N/A',
        gender: patientInfo.gender || 'Not specified',
        id: patientInfo.id
      },
      doctorInfo: {
        name: doctorInfo.name || doctorInfo.displayName,
        specialty: doctorInfo.specialty || 'General Practitioner',
        email: doctorInfo.email,
        phone: doctorInfo.phone || '+234 XXX XXX XXXX',
        licenseNumber: doctorInfo.licenseNumber || 'MD-2024-XXXX',
        qualifications: doctorInfo.qualifications || ['MBBS', 'MD'],
        hospital: doctorInfo.hospital || 'ElderX Telemedicine Platform'
      },
      consultationDate: appointment.appointmentDate || new Date(),
      diagnosis: appointment.diagnosis || 'General health consultation',
      symptoms: appointment.symptoms || ['General wellness check'],
      vitalSigns: appointment.vitalSigns || {
        bloodPressure: '120/80',
        heartRate: 72,
        temperature: 98.6,
        weight: 70
      },
      medications: appointment.prescription?.medications || [
        {
          name: 'Paracetamol',
          genericName: 'Acetaminophen',
          form: 'Tablet',
          strength: '500mg',
          dosage: '1 tablet',
          frequency: 'Every 6 hours as needed',
          duration: '7 days',
          quantity: '28 tablets',
          instructions: 'Take with food. Do not exceed 4 tablets in 24 hours.',
          warnings: 'Do not use with alcohol. Consult doctor if symptoms persist.'
        }
      ],
      instructions: appointment.instructions || 
        `Take medications as prescribed. Rest and stay hydrated. 
        
Monitor your symptoms and contact us if you experience any worsening of your condition.
        
Follow up as scheduled to ensure proper recovery.`,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      emergencyInstructions: 'If you experience severe side effects or your condition worsens significantly, seek immediate medical attention.',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days validity
    };
  };

  const handleDownloadPDF = async (type) => {
    try {
      setIsGenerating(true);
      
      if (!pdfGeneratorService.isPDFSupported()) {
        toast.error('PDF generation is not supported in this browser');
        return;
      }

      if (type === 'invoice') {
        await pdfGeneratorService.generateInvoicePDF(generateInvoiceData());
        toast.success('Invoice PDF generated successfully');
      } else {
        await pdfGeneratorService.generatePrescriptionPDF(generatePrescriptionData());
        toast.success('Prescription PDF generated successfully');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (type) => {
    setActiveTab(type);
    setShowPreview(true);
  };

  const invoiceData = generateInvoiceData();
  const prescriptionData = generatePrescriptionData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Medical Documents</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!showPreview ? (
          /* Document Selection */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Card */}
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Medical Invoice</h3>
                    <p className="text-gray-600">Consultation billing statement</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Consultation Fee:</span>
                    <span className="font-semibold">₦15,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee:</span>
                    <span className="font-semibold">₦2,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (7.5%):</span>
                    <span className="font-semibold">₦1,275</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-blue-600">₦18,275</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview('invoice')}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownloadPDF('invoice')}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Download'}
                  </button>
                </div>
              </div>

              {/* Prescription Card */}
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Pill className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Medical Prescription</h3>
                    <p className="text-gray-600">Medication and treatment plan</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-semibold">{doctorInfo.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold">
                      {new Date(appointment.appointmentDate || new Date()).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Medications:</span>
                    <span className="font-semibold">1 prescribed</span>
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>Valid for 30 days</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview('prescription')}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownloadPDF('prescription')}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Download'}
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Document Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    These documents are generated based on your telemedicine consultation. 
                    The invoice can be used for insurance claims or personal records. 
                    The prescription is valid for 30 days and can be presented to any licensed pharmacy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Document Preview */
          <div>
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
                >
                  ← Back to Documents
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('invoice')}
                    className={`px-4 py-2 rounded-lg ${
                      activeTab === 'invoice' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => setActiveTab('prescription')}
                    className={`px-4 py-2 rounded-lg ${
                      activeTab === 'prescription' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Prescription
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadPDF(activeTab)}
                  disabled={isGenerating}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Download PDF'}
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {activeTab === 'invoice' ? (
                <InvoiceTemplate 
                  invoiceData={invoiceData}
                  onDownload={() => handleDownloadPDF('invoice')}
                  showDownloadButton={false}
                />
              ) : (
                <PrescriptionTemplate 
                  prescriptionData={prescriptionData}
                  onDownload={() => handleDownloadPDF('prescription')}
                  showDownloadButton={false}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;

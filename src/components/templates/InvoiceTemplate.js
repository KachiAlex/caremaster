import React from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  CreditCard,
  CheckCircle
} from 'lucide-react';

const InvoiceTemplate = ({ 
  invoiceData, 
  onDownload, 
  showDownloadButton = true 
}) => {
  const {
    invoiceNumber,
    appointmentId,
    patientInfo,
    doctorInfo,
    consultationDate,
    services,
    subtotal,
    tax,
    total,
    paymentStatus,
    paymentMethod,
    dueDate,
    notes
  } = invoiceData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg" id="invoice-template">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">ElderX Healthcare</h1>
            <p className="text-blue-100 mt-2">Professional Healthcare Services</p>
            <div className="mt-4 text-sm">
              <p>📍 Lagos, Nigeria</p>
              <p>📞 +234 800 ELDERX (353379)</p>
              <p>✉️ billing@elderx.com</p>
              <p>🌐 www.elderx.com</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white text-blue-600 px-4 py-2 rounded-lg">
              <h2 className="text-xl font-bold">INVOICE</h2>
              <p className="text-sm">#{invoiceNumber}</p>
            </div>
            <div className="mt-4 text-sm">
              <p>Date: {formatDate(new Date())}</p>
              <p>Due Date: {formatDate(dueDate)}</p>
              {paymentStatus === 'paid' && (
                <div className="flex items-center mt-2 text-green-300">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>PAID</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patient and Doctor Information */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bill To */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Bill To
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-lg">{patientInfo.name}</p>
            <p className="text-gray-600 mt-1">{patientInfo.email}</p>
            <p className="text-gray-600">{patientInfo.phone}</p>
            <p className="text-gray-600 mt-2">{patientInfo.address}</p>
            <p className="text-sm text-gray-500 mt-2">
              Patient ID: {patientInfo.id}
            </p>
          </div>
        </div>

        {/* Service Provider */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Service Provider
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-lg">{doctorInfo.name}</p>
            <p className="text-gray-600">{doctorInfo.specialty}</p>
            <p className="text-gray-600">{doctorInfo.email}</p>
            <p className="text-gray-600">{doctorInfo.phone}</p>
            <p className="text-sm text-gray-500 mt-2">
              License: {doctorInfo.licenseNumber || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Consultation Details */}
      <div className="px-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Consultation Details
        </h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Appointment ID</p>
              <p className="font-semibold">{appointmentId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Consultation Date</p>
              <p className="font-semibold">{formatDate(consultationDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="font-semibold">Telemedicine Consultation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Services Provided</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Duration</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Rate</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3">
                    <div>
                      <p className="font-semibold">{service.description}</p>
                      {service.details && (
                        <p className="text-sm text-gray-600">{service.details}</p>
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    {service.duration} min
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right">
                    {formatCurrency(service.rate)}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                    {formatCurrency(service.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="px-6 pb-6">
        <div className="flex justify-end">
          <div className="w-full md:w-1/2">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (7.5% VAT):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${
                    paymentStatus === 'paid' ? 'text-green-600' : 
                    paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {paymentStatus.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span>{paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span>{formatDate(dueDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Notes</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                {notes || "Thank you for choosing ElderX Healthcare. Your health and well-being are our top priority."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-6 border-t">
        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">
            <strong>ElderX Healthcare Services</strong> - Professional Telemedicine Platform
          </p>
          <p>
            This invoice is generated electronically and is valid without signature.
            For questions about this invoice, please contact our billing department.
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <span>📞 +234 800 ELDERX</span>
            <span>✉️ billing@elderx.com</span>
            <span>🌐 www.elderx.com</span>
          </div>
        </div>
      </div>

      {/* Download Button */}
      {showDownloadButton && (
        <div className="p-6 border-t bg-white">
          <div className="flex justify-center">
            <button
              onClick={onDownload}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Invoice PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTemplate;

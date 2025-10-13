import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Receipt, 
  DollarSign,
  Calendar,
  User,
  Pill,
  FileText,
  CheckCircle,
  Printer
} from 'lucide-react';
import { toast } from 'react-toastify';
import { pharmacyAPI } from '../api/pharmacyAPI';

const PharmacyInvoiceGenerator = ({ 
  client, 
  prescriptions, 
  institutionId,
  pharmacistId,
  pharmacistName,
  onClose 
}) => {
  const invoiceRef = useRef(null);
  const [invoiceData, setInvoiceData] = useState({
    items: prescriptions.map(p => ({
      medicationId: p.id,
      name: p.name,
      dosage: p.dosage,
      frequency: p.frequency,
      quantity: p.pharmacyData?.dispensedQuantity || 1,
      unitPrice: parseFloat(p.pharmacyData?.price) || 0,
      totalPrice: (parseFloat(p.pharmacyData?.price) || 0) * (p.pharmacyData?.dispensedQuantity || 1),
      available: p.pharmacyData?.available
    })),
    discount: 0,
    tax: 0,
    notes: '',
    paymentMethod: 'cash'
  });

  const [saving, setSaving] = useState(false);

  const calculateSubtotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * invoiceData.tax) / 100;
    const discountAmount = (subtotal * invoiceData.discount) / 100;
    return subtotal + taxAmount - discountAmount;
  };

  const handleQuantityChange = (index, quantity) => {
    const newItems = [...invoiceData.items];
    const qty = parseInt(quantity) || 0;
    newItems[index].quantity = qty;
    newItems[index].totalPrice = newItems[index].unitPrice * qty;
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const handlePriceChange = (index, price) => {
    const newItems = [...invoiceData.items];
    const unitPrice = parseFloat(price) || 0;
    newItems[index].unitPrice = unitPrice;
    newItems[index].totalPrice = unitPrice * newItems[index].quantity;
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const handleSaveInvoice = async () => {
    setSaving(true);
    try {
      const result = await pharmacyAPI.createPharmacyInvoice({
        clientId: client.id,
        clientName: client.name || client.fullName,
        institutionId,
        pharmacistId,
        pharmacistName,
        items: invoiceData.items,
        subtotal: calculateSubtotal(),
        tax: invoiceData.tax,
        discount: invoiceData.discount,
        total: calculateTotal(),
        status: 'pending',
        paymentMethod: invoiceData.paymentMethod,
        notes: invoiceData.notes
      });

      toast.success(`Invoice ${result.invoiceNumber} generated successfully!`);
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // In a real implementation, this would use a library like jsPDF or html2pdf
    toast.info('PDF download feature coming soon!');
  };

  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Receipt className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Pharmacy Invoice</h2>
              <p className="text-blue-100 text-sm">Generate invoice for medication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={invoiceRef} className="bg-white">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">PHARMACY INVOICE</h1>
                <p className="text-gray-600">Invoice Date: {today}</p>
                <p className="text-gray-600">Invoice #: INV-{Date.now().toString().substring(7)}</p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-gray-900 mb-1">Pharmacist</h3>
                <p className="text-gray-600">{pharmacistName}</p>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 text-sm">Name:</span>
                  <p className="font-semibold text-gray-900">{client.name || client.fullName}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Age:</span>
                  <p className="font-semibold text-gray-900">{client.age || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Allergies:</span>
                  <p className="font-semibold text-red-600">{client.allergies || 'None'}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Medical Conditions:</span>
                  <p className="font-semibold text-gray-900">{client.medicalConditions || 'None'}</p>
                </div>
              </div>
            </div>

            {/* Medications Table */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Pill className="h-5 w-5 text-blue-600 mr-2" />
                Prescribed Medications
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Medication</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dosage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Frequency</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price (₦)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoiceData.items.map((item, index) => (
                      <tr key={index} className={!item.available ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {!item.available && (
                            <span className="text-xs text-red-600 font-medium">Unavailable</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.dosage}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.frequency}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ₦{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="flex justify-end mb-6">
              <div className="w-full md:w-1/2 space-y-3">
                <div className="flex justify-between items-center pb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    ₦{calculateSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Discount:</span>
                    <input
                      type="number"
                      value={invoiceData.discount}
                      onChange={(e) => setInvoiceData({ ...invoiceData, discount: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-gray-600">%</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    -₦{((calculateSubtotal() * invoiceData.discount) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Tax:</span>
                    <input
                      type="number"
                      value={invoiceData.tax}
                      onChange={(e) => setInvoiceData({ ...invoiceData, tax: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-gray-600">%</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    +₦{((calculateSubtotal() * invoiceData.tax) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                  <span className="text-xl font-bold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₦{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={invoiceData.paymentMethod}
                  onChange={(e) => setInvoiceData({ ...invoiceData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="insurance">Insurance</option>
                  <option value="wallet">Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Notes
                </label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                <FileText className="h-5 w-5 text-yellow-600 mr-2" />
                Important Information
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Please follow the dosage instructions provided by your doctor</li>
                <li>Store medications in a cool, dry place away from direct sunlight</li>
                <li>Check expiry dates before consumption</li>
                <li>Contact your doctor if you experience any adverse reactions</li>
                {client.allergies && client.allergies !== 'None' && (
                  <li className="font-semibold text-red-600">
                    Patient Allergies: {client.allergies}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>

            <button
              onClick={handleSaveInvoice}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .invoice-content, .invoice-content * {
            visibility: visible;
          }
          
          .invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PharmacyInvoiceGenerator;


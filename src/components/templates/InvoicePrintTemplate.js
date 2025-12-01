/**
 * Invoice Print Template
 * Optimized for printing and PDF export
 */

import React from 'react';
import { formatCurrencyAmount } from '../../utils/currencyFormatter';

const InvoicePrintTemplate = ({ invoice, institutionId, currencySettings }) => {
  const formatCurrencyAmountAmount = (amount) => {
    return formatCurrencyAmount(amount, currencySettings);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white" id="invoice-print">
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-blue-600 text-white p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="text-blue-100 mt-2">Professional Healthcare Services</p>
          </div>
          <div className="text-right">
            <div className="bg-white text-blue-600 px-4 py-2 rounded-lg inline-block">
              <h2 className="text-xl font-bold">#{invoice.invoiceNumber || 'DRAFT'}</h2>
            </div>
            <div className="mt-4 text-sm">
              <p>Date: {formatDate(invoice.createdAt || new Date())}</p>
              <p>Due Date: {formatDate(invoice.dueDate)}</p>
              {invoice.status === 'paid' && (
                <p className="mt-2 text-green-300 font-semibold">✓ PAID</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Bill To</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-lg">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-gray-600 mt-1">{invoice.clientEmail}</p>
            )}
            {invoice.clientPhone && (
              <p className="text-gray-600">{invoice.clientPhone}</p>
            )}
            {invoice.clientAddress && (
              <p className="text-gray-600 mt-2">{invoice.clientAddress}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Client ID: {invoice.clientId}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Quantity</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Unit Price</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3">
                    {item.description}
                    {item.unit && item.unit !== 'piece' && (
                      <span className="text-sm text-gray-500 ml-2">({item.unit})</span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right">
                    {formatCurrencyAmount(item.unitPrice)}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                    {formatCurrencyAmount(item.total || (item.quantity * item.unitPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-full md:w-1/2">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrencyAmount(invoice.subtotal || 0)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({invoice.discountPercent || 0}%):</span>
                  <span>-{formatCurrencyAmount(invoice.discount)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({invoice.taxRate || 0}%):</span>
                  <span>{formatCurrencyAmount(invoice.tax)}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrencyAmount(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  invoice.status === 'paid' ? 'text-green-600' : 
                  invoice.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {invoice.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
              {invoice.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span>{invoice.paymentMethod}</span>
                </div>
              )}
              {invoice.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="text-sm">{invoice.paymentReference}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {invoice.notes && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Notes</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-6 border-t mt-6">
        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">
            <strong>Professional Healthcare Services</strong>
          </p>
          <p>
            This invoice is generated electronically and is valid without signature.
            For questions about this invoice, please contact our billing department.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintTemplate;


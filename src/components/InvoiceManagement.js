/**
 * Invoice Management Component
 * 
 * Comprehensive invoicing system with:
 * - Client selection
 * - Dynamic item creation and management
 * - Current billing display
 * - Checkout functionality
 * - Print/PDF export
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  ShoppingCart,
  User,
  Calculator,
  CreditCard,
  Printer,
  CheckCircle,
  XCircle,
  Search,
  DollarSign,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { invoiceAPI, calculateInvoiceTotals } from '../api/inventoryAPI';
import { getClientsByInstitution } from '../api/patientsAPI';
import InvoicePrintTemplate from './templates/InvoicePrintTemplate';
import { formatCurrencyAmount, getInstitutionCurrencySettings } from '../utils/currencyFormatter';

const InvoiceManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  // State
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [items, setItems] = useState([]);
  const [currentBilling, setCurrentBilling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [currencySettings, setCurrencySettings] = useState(null);

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    paymentMethod: '',
    taxRate: 0, // Will be loaded from institution settings
    discount: 0
  });

  // New item form state
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
    unit: 'piece'
  });

  // Load currency settings and clients on mount
  useEffect(() => {
    if (institutionId) {
      loadCurrencySettings();
      loadClients();
    }
  }, [institutionId]);

  const loadCurrencySettings = async () => {
    try {
      const settings = await getInstitutionCurrencySettings(institutionId);
      setCurrencySettings(settings);
      // Update default tax rate from settings
      setInvoiceForm(prev => ({
        ...prev,
        taxRate: settings.taxRate || 0
      }));
    } catch (error) {
      console.error('Error loading currency settings:', error);
      // Use defaults if loading fails
      setCurrencySettings({
        currency: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        taxRate: 0
      });
    }
  };

  // Load current billing when client is selected
  useEffect(() => {
    if (selectedClient) {
      loadCurrentBilling();
    } else {
      setCurrentBilling(null);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await getClientsByInstitution(institutionId);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentBilling = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      const invoices = await invoiceAPI.getInvoicesByClient(selectedClient.id);
      
      // Calculate outstanding balance
      const outstanding = invoices
        .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      setCurrentBilling({
        totalInvoices: invoices.length,
        pendingInvoices: invoices.filter(inv => inv.status === 'pending').length,
        overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
        outstandingBalance: outstanding,
        recentInvoices: invoices.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading current billing:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  // Filter clients by search
  const filteredClients = clients.filter(client => {
    const searchLower = clientSearch.toLowerCase();
    const name = (client.name || client.fullName || '').toLowerCase();
    const email = (client.email || '').toLowerCase();
    const phone = (client.phone || client.phoneNumber || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
  });

  // Item management
  const handleAddItem = () => {
    if (!newItem.description || !newItem.unitPrice) {
      toast.error('Please fill in item description and unit price');
      return;
    }

    const item = {
      id: Date.now().toString(),
      description: newItem.description,
      quantity: parseFloat(newItem.quantity) || 1,
      unitPrice: parseFloat(newItem.unitPrice) || 0,
      unit: newItem.unit,
      total: (parseFloat(newItem.quantity) || 1) * (parseFloat(newItem.unitPrice) || 0)
    };

    setItems([...items, item]);
    setNewItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
      unit: 'piece'
    });
    toast.success('Item added');
  };

  const handleRemoveItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
    toast.success('Item removed');
  };

  const handleUpdateItem = (itemId, field, value) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: parseFloat(value) || 0 };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = (subtotal * (invoiceForm.discount || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * (invoiceForm.taxRate || 0)) / 100;
    const total = taxableAmount + taxAmount;

    return {
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total
    };
  };

  const totals = calculateTotals();

  // Checkout
  const handleCheckout = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (!invoiceForm.paymentMethod && !showCheckout) {
      setShowCheckout(true);
      return;
    }

    try {
      setLoading(true);
      
      const invoiceData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name || selectedClient.fullName,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone || selectedClient.phoneNumber,
        clientAddress: selectedClient.address,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          total: item.total
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        taxRate: invoiceForm.taxRate,
        totalAmount: totals.total,
        dueDate: new Date(invoiceForm.dueDate),
        notes: invoiceForm.notes,
        status: invoiceForm.paymentMethod ? 'paid' : 'pending',
        paymentMethod: invoiceForm.paymentMethod || null,
        createdAt: new Date(),
        institutionId
      };

      const invoice = await invoiceAPI.createInvoice({
        ...invoiceData,
        status: invoiceForm.paymentMethod ? 'paid' : 'pending'
      });
      
      // If paid, update status with payment details
      if (invoiceForm.paymentMethod) {
        await invoiceAPI.updateInvoiceStatus(invoice.id, 'paid', {
          method: invoiceForm.paymentMethod,
          reference: `PAY-${Date.now()}`
        });
        invoice.status = 'paid';
        invoice.paymentMethod = invoiceForm.paymentMethod;
        invoice.paymentReference = `PAY-${Date.now()}`;
        invoice.paidAt = new Date();
      }

      setCreatedInvoice({ ...invoice, ...invoiceData });
      toast.success(`Invoice ${invoice.invoiceNumber} created successfully!`);
      
      // Reset form
      setItems([]);
      setInvoiceForm({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        paymentMethod: '',
        taxRate: currencySettings?.taxRate || 0,
        discount: 0
      });
      setShowCheckout(false);
      
      // Reload billing
      await loadCurrentBilling();
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  // Print/Export
  const handlePrint = () => {
    if (!createdInvoice) {
      // Create invoice data from current form
      const invoiceData = {
        invoiceNumber: `DRAFT-${Date.now()}`,
        clientId: selectedClient.id,
        clientName: selectedClient.name || selectedClient.fullName,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone || selectedClient.phoneNumber,
        clientAddress: selectedClient.address,
        items: items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        totalAmount: totals.total,
        dueDate: invoiceForm.dueDate,
        notes: invoiceForm.notes,
        status: 'draft',
        createdAt: new Date()
      };
      setCreatedInvoice(invoiceData);
    }
    setShowPrintPreview(true);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const formatCurrencyAmountAmount = (amount) => {
    return formatCurrencyAmount(amount, currencySettings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Invoice Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage invoices for clients</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Selection & Current Billing */}
        <div className="lg:col-span-1 space-y-6">
          {/* Client Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Select Client
            </h3>
            
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Client List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredClients.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No clients found</p>
              ) : (
                filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedClient?.id === client.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {client.name || client.fullName}
                    </div>
                    {client.email && (
                      <div className="text-sm text-gray-600">{client.email}</div>
                    )}
                    {client.phone && (
                      <div className="text-sm text-gray-500">{client.phone}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Current Billing */}
          {selectedClient && currentBilling && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Current Billing
              </h3>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-600 font-medium">Outstanding Balance</div>
                  <div className="text-2xl font-bold text-red-700">
                    {formatCurrencyAmount(currentBilling.outstandingBalance)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-600">Total Invoices</div>
                    <div className="text-lg font-bold text-blue-700">{currentBilling.totalInvoices}</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-xs text-yellow-600">Pending</div>
                    <div className="text-lg font-bold text-yellow-700">{currentBilling.pendingInvoices}</div>
                  </div>
                </div>

                {currentBilling.overdueInvoices > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs text-red-600">Overdue</div>
                    <div className="text-lg font-bold text-red-700">{currentBilling.overdueInvoices}</div>
                  </div>
                )}

                {currentBilling.recentInvoices.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Recent Invoices</div>
                    <div className="space-y-2">
                      {currentBilling.recentInvoices.map(invoice => (
                        <div key={invoice.id} className="text-xs text-gray-600 flex justify-between">
                          <span>{invoice.invoiceNumber}</span>
                          <span className={invoice.status === 'paid' ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrencyAmount(invoice.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Invoice Builder */}
        <div className="lg:col-span-2 space-y-6">
          {selectedClient ? (
            <>
              {/* Invoice Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Invoice Items
                </h3>

                {/* Add Item Form */}
                <div className="grid grid-cols-12 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Item description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Unit"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={handleAddItem}
                      className="w-full h-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {items.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No items added yet</p>
                    <p className="text-sm">Add items to create an invoice</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Description</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-center">Unit</th>
                          <th className="px-4 py-3 text-right">Unit Price</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{item.description}</td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                                min="1"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">{item.unit}</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                                min="0"
                                step="0.01"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrencyAmount(item.total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Invoice Summary */}
                {items.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrencyAmount(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Discount ({invoiceForm.discount}%):</span>
                      <span className="font-medium text-green-600">-{formatCurrencyAmount(totals.discount)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax ({invoiceForm.taxRate}%):</span>
                      <span className="font-medium">{formatCurrencyAmount(totals.tax)}</span>
                    </div>
                    <hr className="my-3" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrencyAmount(totals.total)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Details */}
              {items.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        value={invoiceForm.taxRate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRate: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={invoiceForm.discount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method (optional)
                      </label>
                      <select
                        value={invoiceForm.paymentMethod}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                      rows="3"
                      placeholder="Additional notes or terms..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {items.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleCheckout}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-5 w-5" />
                      {showCheckout ? 'Complete Checkout' : 'Checkout'}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Printer className="h-5 w-5" />
                      Print/Export
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Client Selected</h3>
              <p className="text-gray-600">Please select a client from the list to create an invoice</p>
            </div>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && createdInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Invoice Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6">
              <InvoicePrintTemplate invoice={createdInvoice} institutionId={institutionId} currencySettings={currencySettings} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;


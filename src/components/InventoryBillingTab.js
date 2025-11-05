import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Eye,
  Search
} from 'lucide-react';
import { inventoryAPI, invoiceAPI, calculateInvoiceTotals } from '../api/inventoryAPI';
import { toast } from 'react-toastify';

const InventoryBillingTab = ({ institutionId, clients }) => {
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInvoiceViewModal, setShowInvoiceViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Item form data
  const [itemFormData, setItemFormData] = useState({
    name: '',
    category: 'medical',
    unitPrice: '',
    quantity: '',
    unit: 'piece',
    description: '',
    sku: '',
    supplier: '',
    minStock: 10
  });

  // Invoice form data
  const [invoiceFormData, setInvoiceFormData] = useState({
    clientId: '',
    items: [],
    notes: '',
    dueDate: '',
    paymentTerms: 'net30'
  });

  const categories = ['Medical', 'Personal Care', 'Nutrition', 'Mobility', 'Safety', 'Other'];
  const units = ['Piece', 'Box', 'Pack', 'Bottle', 'Tube', 'Roll', 'Bag'];

  useEffect(() => {
    if (institutionId) {
      loadData();
    }
  }, [institutionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryData, invoicesData, statsData] = await Promise.all([
        inventoryAPI.getItemsByInstitution(institutionId),
        invoiceAPI.getInvoicesByInstitution(institutionId),
        invoiceAPI.getInvoiceStats(institutionId)
      ]);

      setInventory(inventoryData);
      setInvoices(invoicesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    try {
      await inventoryAPI.createItem({
        ...itemFormData,
        institutionId,
        unitPrice: parseFloat(itemFormData.unitPrice),
        quantity: parseInt(itemFormData.quantity),
        minStock: parseInt(itemFormData.minStock)
      });

      toast.success('✅ Item added successfully!');
      setShowAddItemModal(false);
      resetItemForm();
      loadData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    try {
      await inventoryAPI.updateItem(selectedItem.id, {
        ...itemFormData,
        unitPrice: parseFloat(itemFormData.unitPrice),
        quantity: parseInt(itemFormData.quantity),
        minStock: parseInt(itemFormData.minStock)
      });

      toast.success('✅ Item updated successfully!');
      setShowAddItemModal(false);
      setSelectedItem(null);
      resetItemForm();
      loadData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await inventoryAPI.deleteItem(itemId);
      toast.success('✅ Item deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (invoiceFormData.items.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    try {
      const client = clients.find(c => c.id === invoiceFormData.clientId);
      const totals = calculateInvoiceTotals(invoiceFormData.items);

      await invoiceAPI.createInvoice({
        ...invoiceFormData,
        institutionId,
        clientName: client?.name || client?.fullName,
        clientEmail: client?.email,
        subtotal: totals.subtotal,
        tax: totals.tax,
        totalAmount: totals.total,
        dueDate: new Date(invoiceFormData.dueDate)
      });

      toast.success('✅ Invoice created successfully!');
      setShowInvoiceModal(false);
      resetInvoiceForm();
      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const handleInvoiceStatusChange = async (invoiceId, status, paymentDetails = null) => {
    try {
      await invoiceAPI.updateInvoiceStatus(invoiceId, status, paymentDetails);
      toast.success(`✅ Invoice marked as ${status}`);
      loadData();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handleViewInvoice = (invoice) => {
    setViewingInvoice(invoice);
    setShowInvoiceViewModal(true);
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      // Create a printable HTML version
      const printWindow = window.open('', '_blank');
      const invoiceHTML = generateInvoiceHTML(invoice);
      
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      
      // Trigger print dialog which allows saving as PDF
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      toast.success('Invoice opened for download');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const generateInvoiceHTML = (invoice) => {
    const formatCurrency = (amount) => `₦${amount?.toLocaleString() || '0'}`;
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { background: #2563eb; color: white; padding: 30px; margin-bottom: 30px; }
            .header h1 { font-size: 32px; margin-bottom: 10px; }
            .header p { opacity: 0.9; }
            .invoice-info { display: flex; justify-between; margin-bottom: 30px; }
            .invoice-info div { flex: 1; }
            .invoice-info h3 { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
            .invoice-info p { margin: 5px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th { background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
            .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .totals { margin-left: auto; width: 300px; margin-top: 20px; }
            .totals tr td { padding: 8px 12px; }
            .totals tr:last-child { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
            .status { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status.paid { background: #d1fae5; color: #065f46; }
            .status.pending { background: #fef3c7; color: #92400e; }
            .status.cancelled { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <h1>Care Master Healthcare</h1>
              <p>Professional Healthcare Services & Elderly Care</p>
              <p style="margin-top: 15px; font-size: 14px;">📍 Lagos, Nigeria | 📞 +234 800 Care Master | ✉️ billing@Care Master.com</p>
            </div>

            <div style="text-align: right; margin-bottom: 20px;">
              <h2 style="font-size: 24px; color: #2563eb;">INVOICE</h2>
              <p style="font-size: 18px; font-weight: 600;">#${invoice.invoiceNumber}</p>
              <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span>
            </div>

            <div class="invoice-info">
              <div>
                <h3>Bill To:</h3>
                <p><strong>${invoice.clientName || 'Client Name'}</strong></p>
                <p>${invoice.clientEmail || ''}</p>
                <p>${invoice.clientPhone || ''}</p>
              </div>
              <div>
                <h3>Invoice Details:</h3>
                <p><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
                <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
                <p><strong>Payment Terms:</strong> ${invoice.paymentTerms || 'Net 30'}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items?.map(item => `
                  <tr>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                    </td>
                    <td style="text-align: center;">${item.quantity} ${item.unit || ''}</td>
                    <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                    <td style="text-align: right;">${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4">No items</td></tr>'}
              </tbody>
            </table>

            <table class="totals">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">${formatCurrency(invoice.subtotal)}</td>
              </tr>
              ${invoice.taxAmount > 0 ? `
              <tr>
                <td>Tax (7.5%):</td>
                <td style="text-align: right;">${formatCurrency(invoice.taxAmount)}</td>
              </tr>
              ` : ''}
              ${invoice.discount > 0 ? `
              <tr>
                <td>Discount:</td>
                <td style="text-align: right;">-${formatCurrency(invoice.discount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td>Total Amount:</td>
                <td style="text-align: right;">${formatCurrency(invoice.totalAmount)}</td>
              </tr>
            </table>

            ${invoice.notes ? `
            <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-left: 4px solid #2563eb;">
              <h3 style="font-size: 14px; margin-bottom: 10px;">Notes:</h3>
              <p style="color: #666;">${invoice.notes}</p>
            </div>
            ` : ''}

            ${invoice.status === 'paid' && invoice.paymentDetails ? `
            <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-left: 4px solid #059669;">
              <h3 style="font-size: 14px; margin-bottom: 10px; color: #065f46;">Payment Information:</h3>
              <p style="color: #065f46;"><strong>Method:</strong> ${invoice.paymentDetails.method || 'N/A'}</p>
              <p style="color: #065f46;"><strong>Reference:</strong> ${invoice.paymentDetails.reference || 'N/A'}</p>
              <p style="color: #065f46;"><strong>Date:</strong> ${formatDate(invoice.paymentDetails.date)}</p>
            </div>
            ` : ''}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="margin-top: 10px;">For inquiries, please contact billing@Care Master.com or call +234 800 Care Master</p>
              <p style="margin-top: 5px;">© ${new Date().getFullYear()} Care Master Healthcare. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const addItemToInvoice = (item) => {
    setInvoiceFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        inventoryId: item.id,
        name: item.name,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: 1,
        unit: item.unit
      }]
    }));
  };

  const removeItemFromInvoice = (index) => {
    setInvoiceFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateInvoiceItemQuantity = (index, quantity) => {
    setInvoiceFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, quantity: parseInt(quantity) || 1 } : item
      )
    }));
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      category: 'medical',
      unitPrice: '',
      quantity: '',
      unit: 'piece',
      description: '',
      sku: '',
      supplier: '',
      minStock: 10
    });
  };

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      clientId: '',
      items: [],
      notes: '',
      dueDate: '',
      paymentTerms: 'net30'
    });
  };

  const editItem = (item) => {
    setSelectedItem(item);
    setItemFormData({
      name: item.name,
      category: item.category,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: item.unit,
      description: item.description || '',
      sku: item.sku || '',
      supplier: item.supplier || '',
      minStock: item.minStock || 10
    });
    setShowAddItemModal(true);
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <Package className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">
                {inventory.filter(i => i.quantity <= i.minStock).length}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Invoices</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
            </div>
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue (Paid)</p>
              <p className="text-2xl font-bold text-green-600">
                ₦{stats?.paidAmount?.toLocaleString() || 0}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveSubTab('inventory')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeSubTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="h-5 w-5 mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeSubTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-5 w-5 mr-2" />
              Invoices & Billing
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Inventory Tab Content */}
          {activeSubTab === 'inventory' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    resetItemForm();
                    setShowAddItemModal(true);
                  }}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Item
                </button>
              </div>

              {/* Inventory Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className={item.quantity <= item.minStock ? 'bg-orange-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            {item.sku && <div className="text-sm text-gray-500">SKU: {item.sku}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${
                              item.quantity <= item.minStock ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                              {item.quantity} {item.unit}
                            </span>
                            {item.quantity <= item.minStock && (
                              <AlertTriangle className="h-4 w-4 text-orange-600 ml-2" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₦{item.unitPrice?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₦{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => editItem(item)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredInventory.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No inventory items found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoices Tab Content */}
          {activeSubTab === 'invoices' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => {
                    resetInvoiceForm();
                    setShowInvoiceModal(true);
                  }}
                  className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Invoice
                </button>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.createdAt?.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₦{invoice.totalAmount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {invoice.status === 'paid' && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center w-fit">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </span>
                          )}
                          {invoice.status === 'pending' && (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex items-center w-fit">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                          {invoice.status === 'cancelled' && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center w-fit">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {invoice.status === 'pending' && (
                            <button
                              onClick={() => handleInvoiceStatusChange(invoice.id, 'paid', { method: 'cash', reference: 'CASH-' + Date.now() })}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Download/Print Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No invoices found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {selectedItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              
              <form onSubmit={selectedItem ? handleUpdateItem : handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Adult Diapers"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={itemFormData.category}
                      onChange={(e) => setItemFormData({...itemFormData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (₦) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={itemFormData.unitPrice}
                      onChange={(e) => setItemFormData({...itemFormData, unitPrice: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={itemFormData.quantity}
                      onChange={(e) => setItemFormData({...itemFormData, quantity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      required
                      value={itemFormData.unit}
                      onChange={(e) => setItemFormData({...itemFormData, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit.toLowerCase()}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock Alert
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemFormData.minStock}
                      onChange={(e) => setItemFormData({...itemFormData, minStock: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={itemFormData.sku}
                      onChange={(e) => setItemFormData({...itemFormData, sku: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SKU-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={itemFormData.supplier}
                      onChange={(e) => setItemFormData({...itemFormData, supplier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Supplier name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Item description..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddItemModal(false);
                      setSelectedItem(null);
                      resetItemForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Create New Invoice
              </h3>
              
              <form onSubmit={handleCreateInvoice} className="space-y-6">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Client *
                  </label>
                  <select
                    required
                    value={invoiceFormData.clientId}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, clientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name || client.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Invoice Items
                    </label>
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          const item = inventory.find(i => i.id === e.target.value);
                          if (item) {
                            addItemToInvoice(item);
                            e.target.value = '';
                          }
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">+ Add Item</option>
                        {inventory.filter(i => i.quantity > 0).map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} - ₦{item.unitPrice} ({item.quantity} available)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Invoice Items Table */}
                  {invoiceFormData.items.length > 0 ? (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoiceFormData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">₦{item.unitPrice}</td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateInvoiceItemQuantity(index, e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                ₦{(item.unitPrice * item.quantity).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeItemFromInvoice(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="3" className="px-4 py-2 text-right text-sm font-medium text-gray-700">Subtotal:</td>
                            <td className="px-4 py-2 text-sm font-bold text-gray-900" colSpan="2">
                              ₦{calculateInvoiceTotals(invoiceFormData.items).subtotal.toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="3" className="px-4 py-2 text-right text-sm font-medium text-gray-700">Tax (7.5%):</td>
                            <td className="px-4 py-2 text-sm font-bold text-gray-900" colSpan="2">
                              ₦{calculateInvoiceTotals(invoiceFormData.items).tax.toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="3" className="px-4 py-2 text-right text-sm font-medium text-gray-900">Total:</td>
                            <td className="px-4 py-2 text-lg font-bold text-green-600" colSpan="2">
                              ₦{calculateInvoiceTotals(invoiceFormData.items).total.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No items added yet. Select items from the dropdown above.</p>
                    </div>
                  )}
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={invoiceFormData.dueDate}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, dueDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={invoiceFormData.paymentTerms}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, paymentTerms: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="immediate">Due Immediately</option>
                      <option value="net7">Net 7 Days</option>
                      <option value="net30">Net 30 Days</option>
                      <option value="net60">Net 60 Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows="3"
                    value={invoiceFormData.notes}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes for the client..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvoiceModal(false);
                      resetInvoiceForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {showInvoiceViewModal && viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Invoice #{viewingInvoice.invoiceNumber}
                </h3>
                <button
                  onClick={() => setShowInvoiceViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Invoice Header */}
              <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                <h1 className="text-3xl font-bold">Care Master Healthcare</h1>
                <p className="text-blue-100 mt-2">Professional Healthcare Services & Elderly Care</p>
                <div className="mt-4 text-sm">
                  <p>📍 Lagos, Nigeria</p>
                  <p>📞 +234 800 Care Master (353379)</p>
                  <p>✉️ billing@Care Master.com</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                {viewingInvoice.status === 'paid' && (
                  <span className="px-4 py-2 text-sm font-semibold bg-green-100 text-green-800 rounded-full flex items-center w-fit">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    PAID
                  </span>
                )}
                {viewingInvoice.status === 'pending' && (
                  <span className="px-4 py-2 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-full flex items-center w-fit">
                    <Clock className="h-4 w-4 mr-2" />
                    PENDING
                  </span>
                )}
                {viewingInvoice.status === 'cancelled' && (
                  <span className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-800 rounded-full flex items-center w-fit">
                    <XCircle className="h-4 w-4 mr-2" />
                    CANCELLED
                  </span>
                )}
              </div>

              {/* Client and Invoice Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Bill To</h4>
                  <p className="font-semibold text-gray-900">{viewingInvoice.clientName}</p>
                  <p className="text-gray-600">{viewingInvoice.clientEmail}</p>
                  <p className="text-gray-600">{viewingInvoice.clientPhone}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Invoice Details</h4>
                  <p className="text-gray-900"><strong>Date:</strong> {viewingInvoice.createdAt?.toLocaleDateString()}</p>
                  <p className="text-gray-900"><strong>Due Date:</strong> {viewingInvoice.dueDate?.toLocaleDateString()}</p>
                  <p className="text-gray-900"><strong>Terms:</strong> {viewingInvoice.paymentTerms || 'Net 30'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Items</h4>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewingInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-900">₦{item.unitPrice?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">₦{item.totalPrice?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-80">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">₦{viewingInvoice.subtotal?.toLocaleString()}</span>
                  </div>
                  {viewingInvoice.taxAmount > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Tax (7.5%):</span>
                      <span className="font-medium text-gray-900">₦{viewingInvoice.taxAmount?.toLocaleString()}</span>
                    </div>
                  )}
                  {viewingInvoice.discount > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">-₦{viewingInvoice.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-t-2 border-gray-300">
                    <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                    <span className="text-lg font-bold text-gray-900">₦{viewingInvoice.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.notes && (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h4>
                  <p className="text-gray-600">{viewingInvoice.notes}</p>
                </div>
              )}

              {/* Payment Info */}
              {viewingInvoice.status === 'paid' && viewingInvoice.paymentDetails && (
                <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-600 rounded">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Payment Information:</h4>
                  <p className="text-green-700"><strong>Method:</strong> {viewingInvoice.paymentDetails.method}</p>
                  <p className="text-green-700"><strong>Reference:</strong> {viewingInvoice.paymentDetails.reference}</p>
                  <p className="text-green-700"><strong>Date:</strong> {viewingInvoice.paymentDetails.date?.toLocaleDateString()}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowInvoiceViewModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownloadInvoice(viewingInvoice)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download/Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryBillingTab;


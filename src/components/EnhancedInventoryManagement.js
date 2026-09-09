/**
 * Enhanced Inventory Management Component
 *
 * Features:
 * - Supplier management
 * - Purchase order workflow
 * - Goods received notes (GRN)
 * - Expiry date tracking
 * - Reorder level alerts
 * - Stock audit trail
 * - Invoice creation with inventory-linked line items
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  supplierAPI,
  purchaseOrderAPI,
  grnAPI,
  expiryAPI,
  reorderAPI,
  getStockAuditTrail,
  PURCHASE_ORDER_STATUS,
  GRN_STATUS
} from '../api/enhancedInventoryAPI';
import { inventoryAPI } from '../api/inventoryAPI';
import { getInstitutionCurrencySettings, formatCurrencyAmount } from '../utils/currencyFormatter';
import { getClientsByInstitution } from '../api/patientsAPI';
import { invoiceAPI, calculateInvoiceTotals } from '../api/inventoryAPI';

const EnhancedInventoryManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, user, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('suppliers');
  const [loading, setLoading] = useState(true);

  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    notes: ''
  });

  // Purchase Orders state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poForm, setPOForm] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    items: [],
    notes: ''
  });

  // GRN state
  const [grns, setGrns] = useState([]);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [grnForm, setGRNForm] = useState({
    purchaseOrderId: '',
    supplierId: '',
    receivedDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: ''
  });

  // Expiry & Reorder state
  const [expiringItems, setExpiringItems] = useState([]);
  const [expiredItems, setExpiredItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);

  // Inventory items for PO/GRN
  const [inventoryItems, setInventoryItems] = useState([]);
  const [currencySettings, setCurrencySettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPOItem, setNewPOItem] = useState({
    inventoryId: '',
    name: '',
    quantity: 1,
    unitPrice: 0,
    unit: 'piece'
  });

  // Invoice state
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    items: [],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    taxRate: 0,
    discount: 0,
    discountType: 'percentage', // 'percentage' or 'flat'
    notes: '',
    paymentMethod: '',
  });
  const [newInvoiceItem, setNewInvoiceItem] = useState({
    inventoryId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    unit: 'piece',
  });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (institutionId) {
      loadData();
    }
  }, [institutionId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      switch (activeTab) {
        case 'suppliers':
          const suppliersData = await supplierAPI.getSuppliersByInstitution(institutionId);
          setSuppliers(suppliersData);
          break;
        case 'purchase-orders':
          const poData = await purchaseOrderAPI.getPurchaseOrdersByInstitution(institutionId);
          setPurchaseOrders(poData);
          break;
        case 'grn':
          const grnData = await grnAPI.getGRNsByInstitution(institutionId);
          setGrns(grnData);
          break;
        case 'expiry':
          const [expiring, expired] = await Promise.all([
            expiryAPI.getExpiringItems(institutionId, 30),
            expiryAPI.getExpiredItems(institutionId)
          ]);
          setExpiringItems(expiring);
          setExpiredItems(expired);
          break;
        case 'reorder':
          const lowStock = await reorderAPI.checkReorderLevels(institutionId);
          setLowStockItems(lowStock);
          break;
        case 'audit':
          const audit = await getStockAuditTrail(institutionId);
          setAuditTrail(audit);
          break;
        case 'invoices':
          const [invData, clientData, invItems] = await Promise.all([
            invoiceAPI.getInvoicesByInstitution(institutionId).catch(() => []),
            getClientsByInstitution(institutionId).catch(() => []),
            inventoryAPI.getItemsByInstitution(institutionId).catch(() => []),
          ]);
          setInvoices(invData);
          setClients(clientData.filter(c => c.status !== 'archived' && c.status !== 'inactive'));
          setInventoryItems(invItems);
          break;
      }

      // Load inventory items and suppliers for PO/GRN
      if (activeTab === 'purchase-orders' || activeTab === 'grn') {
        const [items, suppliersData] = await Promise.all([
          inventoryAPI.getItemsByInstitution(institutionId),
          supplierAPI.getSuppliersByInstitution(institutionId)
        ]);
        setInventoryItems(items);
        setSuppliers(suppliersData);
      }

      // Load currency settings
      if (institutionId) {
        const currency = await getInstitutionCurrencySettings(institutionId);
        setCurrencySettings(currency);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Supplier handlers
  const handleSaveSupplier = async () => {
    try {
      if (selectedSupplier) {
        await supplierAPI.updateSupplier(selectedSupplier.id, supplierForm);
        toast.success('Supplier updated successfully');
      } else {
        await supplierAPI.createSupplier({
          ...supplierForm,
          institutionId
        });
        toast.success('Supplier created successfully');
      }
      setShowSupplierModal(false);
      setSelectedSupplier(null);
      resetSupplierForm();
      loadData();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      await supplierAPI.deleteSupplier(supplierId);
      toast.success('Supplier deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      notes: ''
    });
  };

  // Purchase Order handlers
  const handleSavePO = async () => {
    // Validation
    if (!poForm.supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (!poForm.items || poForm.items.length === 0) {
      toast.error('Please add at least one item to the purchase order');
      return;
    }

    // Validate all items
    const invalidItems = poForm.items.filter(item => 
      !item.inventoryId && !item.name || 
      !item.quantity || item.quantity <= 0 || 
      !item.unitPrice || item.unitPrice <= 0
    );

    if (invalidItems.length > 0) {
      toast.error('Please complete all item details (name, quantity, and unit price)');
      return;
    }

    try {
      setSaving(true);
      const userId = user?.uid || userProfile?.id || userProfile?.uid;

      if (selectedPO) {
        await purchaseOrderAPI.updatePurchaseOrderStatus(selectedPO.id, poForm.status || PURCHASE_ORDER_STATUS.PENDING, {
          items: poForm.items,
          expectedDeliveryDate: poForm.expectedDeliveryDate ? new Date(poForm.expectedDeliveryDate) : null,
          notes: poForm.notes
        });
        toast.success('Purchase order updated successfully');
      } else {
        await purchaseOrderAPI.createPurchaseOrder({
          ...poForm,
          institutionId,
          createdBy: userId,
          expectedDeliveryDate: poForm.expectedDeliveryDate ? new Date(poForm.expectedDeliveryDate) : null,
          supplierName: suppliers.find(s => s.id === poForm.supplierId)?.name || ''
        });
        toast.success('Purchase order created successfully');
      }
      setShowPOModal(false);
      setSelectedPO(null);
      resetPOForm();
      loadData();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast.error(`Failed to save purchase order: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePO = async (poId) => {
    try {
      const userId = user?.uid || userProfile?.id || userProfile?.uid;
      await purchaseOrderAPI.approvePurchaseOrder(poId, userId);
      toast.success('Purchase order approved');
      loadData();
    } catch (error) {
      console.error('Error approving purchase order:', error);
      toast.error(`Failed to approve purchase order: ${error.message || 'Unknown error'}`);
    }
  };

  const resetPOForm = () => {
    setPOForm({
      supplierId: '',
      expectedDeliveryDate: '',
      items: [],
      notes: ''
    });
  };

  const addPOItem = () => {
    if (!newPOItem.inventoryId && !newPOItem.name) {
      toast.error('Please select an inventory item or enter item name');
      return;
    }

    const selectedItem = inventoryItems.find(item => item.id === newPOItem.inventoryId);
    const itemToAdd = {
      inventoryId: newPOItem.inventoryId || null,
      name: selectedItem?.name || newPOItem.name,
      quantity: parseFloat(newPOItem.quantity) || 1,
      unitPrice: parseFloat(newPOItem.unitPrice) || (selectedItem?.unitPrice || 0),
      unit: selectedItem?.unit || newPOItem.unit || 'piece'
    };

    setPOForm(prev => ({
      ...prev,
      items: [...prev.items, itemToAdd]
    }));

    // Reset new item form
    setNewPOItem({
      inventoryId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      unit: 'piece'
    });
  };

  const removePOItem = (index) => {
    setPOForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updatePOItem = (index, field, value) => {
    setPOForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitPrice) || 0);
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const formatCurrency = (amount) => {
    if (!currencySettings) {
      return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const { currency = 'USD', currencySymbol = '$', currencyPosition = 'before' } = currencySettings;
    const formatted = (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currencyPosition === 'after' ? `${formatted} ${currencySymbol}` : `${currencySymbol}${formatted}`;
  };

  // GRN handlers
  const handleSaveGRN = async () => {
    if (!grnForm.purchaseOrderId && !grnForm.supplierId) {
      toast.error('Please select a purchase order or supplier');
      return;
    }

    if (!grnForm.items || grnForm.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      const userId = user?.uid || userProfile?.id || userProfile?.uid;
      await grnAPI.createGRN({
        ...grnForm,
        institutionId,
        receivedBy: userId,
        receivedDate: grnForm.receivedDate ? new Date(grnForm.receivedDate) : new Date()
      });
      toast.success('Goods received note created successfully');
      setShowGRNModal(false);
      resetGRNForm();
      loadData();
    } catch (error) {
      console.error('Error saving GRN:', error);
      toast.error(`Failed to save GRN: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetGRNForm = () => {
    setGRNForm({
      purchaseOrderId: '',
      supplierId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      items: [],
      notes: ''
    });
  };

  const addGRNItem = () => {
    setGRNForm(prev => ({
      ...prev,
      items: [...prev.items, {
        inventoryId: '',
        name: '',
        quantityOrdered: 0,
        quantityReceived: 0,
        unitPrice: 0,
        batchNumber: '',
        expiryDate: '',
        createNew: false
      }]
    }));
  };

  if (loading && !suppliers.length && !purchaseOrders.length && !invoices.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ─── Invoice helpers ───

  const filteredClients = clients.filter(client => {
    const searchLower = clientSearch.toLowerCase();
    const name = (client.name || client.fullName || '').toLowerCase();
    const email = (client.email || '').toLowerCase();
    const phone = (client.phone || client.phoneNumber || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
  });

  const handleSelectClient = (client) => {
    setInvoiceForm(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name || client.fullName || '',
      clientEmail: client.email || '',
      clientPhone: client.phone || client.phoneNumber || '',
      clientAddress: client.address || '',
    }));
    setClientSearch(client.name || client.fullName || '');
    setShowClientDropdown(false);
  };

  const handleAddInvoiceItem = () => {
    if (!newInvoiceItem.description || !newInvoiceItem.unitPrice) {
      toast.error('Please fill in item description and unit price');
      return;
    }
    const item = {
      id: Date.now().toString(),
      inventoryId: newInvoiceItem.inventoryId || null,
      description: newInvoiceItem.description,
      quantity: parseFloat(newInvoiceItem.quantity) || 1,
      unitPrice: parseFloat(newInvoiceItem.unitPrice) || 0,
      unit: newInvoiceItem.unit,
      total: (parseFloat(newInvoiceItem.quantity) || 1) * (parseFloat(newInvoiceItem.unitPrice) || 0),
    };
    setInvoiceForm(prev => ({ ...prev, items: [...prev.items, item] }));
    setNewInvoiceItem({ inventoryId: '', description: '', quantity: 1, unitPrice: 0, unit: 'piece' });
    toast.success('Item added');
  };

  const handleRemoveInvoiceItem = (itemId) => {
    setInvoiceForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
  };

  const handleSelectInventoryItem = (invId) => {
    const invItem = inventoryItems.find(i => i.id === invId);
    if (invItem) {
      setNewInvoiceItem({
        inventoryId: invId,
        description: invItem.name || invItem.description || '',
        quantity: 1,
        unitPrice: invItem.unitPrice || invItem.unit_price || 0,
        unit: invItem.unit || 'piece',
      });
    } else {
      setNewInvoiceItem({ inventoryId: '', description: '', quantity: 1, unitPrice: 0, unit: 'piece' });
    }
  };

  const calculateInvoiceTotals = () => {
    const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = invoiceForm.discountType === 'flat'
      ? parseFloat(invoiceForm.discount) || 0
      : (subtotal * (parseFloat(invoiceForm.discount) || 0)) / 100;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxableAmount * (parseFloat(invoiceForm.taxRate) || 0)) / 100;
    const total = taxableAmount + taxAmount;
    return { subtotal, discount: discountAmount, tax: taxAmount, total };
  };

  const invoiceTotals = calculateInvoiceTotals();

  const handleSaveInvoice = async () => {
    if (!invoiceForm.clientId) {
      toast.error('Please select a client');
      return;
    }
    if (invoiceForm.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    try {
      setSaving(true);
      const invoiceData = {
        clientId: invoiceForm.clientId,
        clientName: invoiceForm.clientName,
        clientEmail: invoiceForm.clientEmail,
        clientPhone: invoiceForm.clientPhone,
        clientAddress: invoiceForm.clientAddress,
        patientId: invoiceForm.clientId,
        institutionId,
        items: invoiceForm.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          total: item.total,
          inventoryId: item.inventoryId,
        })),
        lineItems: invoiceForm.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          total: item.total,
          inventoryId: item.inventoryId,
        })),
        subtotal: invoiceTotals.subtotal,
        amount: invoiceTotals.subtotal,
        discount: invoiceTotals.discount,
        taxAmount: invoiceTotals.tax,
        tax_amount: invoiceTotals.tax,
        taxRate: parseFloat(invoiceForm.taxRate) || 0,
        totalAmount: invoiceTotals.total,
        total_amount: invoiceTotals.total,
        currency: currencySettings?.currency || 'USD',
        issueDate: new Date(invoiceForm.issueDate),
        issue_date: new Date(invoiceForm.issueDate),
        dueDate: new Date(invoiceForm.dueDate),
        due_date: new Date(invoiceForm.dueDate),
        notes: invoiceForm.notes,
        description: invoiceForm.notes,
        status: invoiceForm.paymentMethod ? 'paid' : 'pending',
        paymentMethod: invoiceForm.paymentMethod || null,
        payment_method: invoiceForm.paymentMethod || null,
        paidDate: invoiceForm.paymentMethod ? new Date() : null,
        paid_date: invoiceForm.paymentMethod ? new Date() : null,
      };

      const invoice = await invoiceAPI.createInvoice(invoiceData);

      // Decrement inventory stock for linked items
      for (const item of invoiceForm.items) {
        if (item.inventoryId) {
          try {
            await inventoryAPI.updateStock(item.inventoryId, item.quantity, 'subtract');
          } catch (stockErr) {
            console.error('Failed to decrement stock for', item.description, stockErr);
          }
        }
      }

      toast.success('Invoice created successfully');
      setShowInvoiceModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId) => {
    try {
      await invoiceAPI.updateInvoiceStatus(invoiceId, 'paid', {
        method: 'cash',
        reference: `PAY-${Date.now()}`,
      });
      toast.success('Invoice marked as paid');
      setViewingInvoice(null);
      loadData();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mt-1">Manage suppliers, purchase orders, and stock tracking</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex space-x-1 border-b border-gray-200">
          {[
            { id: 'suppliers', label: 'Suppliers', icon: Package },
            { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
            { id: 'grn', label: 'Goods Received', icon: Truck },
            { id: 'invoices', label: 'Invoices', icon: DollarSign },
            { id: 'expiry', label: 'Expiry Tracking', icon: Calendar },
            { id: 'reorder', label: 'Reorder Alerts', icon: AlertTriangle },
            { id: 'audit', label: 'Audit Trail', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Suppliers</h3>
            <button
              onClick={() => {
                setSelectedSupplier(null);
                resetSupplierForm();
                setShowSupplierModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(supplier => (
              <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{supplier.name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setSupplierForm(supplier);
                        setShowSupplierModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(supplier.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                <p className="text-sm text-gray-600">{supplier.email}</p>
                <p className="text-sm text-gray-600">{supplier.phone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'purchase-orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
            <button
              onClick={async () => {
                setSelectedPO(null);
                resetPOForm();
                // Load suppliers if not already loaded
                if (suppliers.length === 0 && institutionId) {
                  try {
                    const suppliersData = await supplierAPI.getSuppliersByInstitution(institutionId);
                    setSuppliers(suppliersData);
                  } catch (error) {
                    console.error('Error loading suppliers:', error);
                    toast.error('Failed to load suppliers');
                  }
                }
                setShowPOModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create PO
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">PO Number</th>
                  <th className="px-4 py-2 text-left">Supplier</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Total Amount</th>
                  <th className="px-4 py-2 text-left">Expected Delivery</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{po.poNumber}</td>
                    <td className="px-4 py-2">
                      {suppliers.find(s => s.id === po.supplierId)?.name || po.supplierName || po.supplierId || 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        po.status === PURCHASE_ORDER_STATUS.APPROVED ? 'bg-green-100 text-green-800' :
                        po.status === PURCHASE_ORDER_STATUS.RECEIVED ? 'bg-blue-100 text-blue-800' :
                        po.status === PURCHASE_ORDER_STATUS.CANCELLED ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{formatCurrency(po.totalAmount || 0)}</td>
                    <td className="px-4 py-2">
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      {po.status === PURCHASE_ORDER_STATUS.PENDING && (
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="text-green-600 hover:text-green-700 mr-2"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          // Load suppliers if not already loaded
                          if (suppliers.length === 0 && institutionId) {
                            try {
                              const suppliersData = await supplierAPI.getSuppliersByInstitution(institutionId);
                              setSuppliers(suppliersData);
                            } catch (error) {
                              console.error('Error loading suppliers:', error);
                            }
                          }
                          
                          // Format date for form input
                          const formattedPO = {
                            ...po,
                            expectedDeliveryDate: po.expectedDeliveryDate 
                              ? (po.expectedDeliveryDate instanceof Date 
                                  ? po.expectedDeliveryDate.toISOString().split('T')[0]
                                  : new Date(po.expectedDeliveryDate).toISOString().split('T')[0])
                              : ''
                          };
                          
                          setSelectedPO(po);
                          setPOForm(formattedPO);
                          setShowPOModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRN Tab */}
      {activeTab === 'grn' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Goods Received Notes</h3>
            <button
              onClick={() => {
                setSelectedGRN(null);
                resetGRNForm();
                setShowGRNModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create GRN
            </button>
          </div>

          <div className="space-y-4">
            {grns.map(grn => (
              <div key={grn.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{grn.grnNumber}</h4>
                    <p className="text-sm text-gray-600">
                      Received: {new Date(grn.receivedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    grn.status === GRN_STATUS.VERIFIED ? 'bg-green-100 text-green-800' :
                    grn.status === GRN_STATUS.REJECTED ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {grn.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Items: {grn.items?.length || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
              <p className="text-sm text-gray-600">Create and manage client invoices</p>
            </div>
            <button
              onClick={() => {
                setInvoiceForm({
                  clientId: '',
                  clientName: '',
                  clientEmail: '',
                  clientPhone: '',
                  clientAddress: '',
                  items: [],
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  issueDate: new Date().toISOString().split('T')[0],
                  taxRate: currencySettings?.taxRate || 0,
                  discount: 0,
                  discountType: 'percentage',
                  notes: '',
                  paymentMethod: '',
                });
                setNewInvoiceItem({ inventoryId: '', description: '', quantity: 1, unitPrice: 0, unit: 'piece' });
                setClientSearch('');
                setShowClientDropdown(false);
                setShowInvoiceModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </button>
          </div>

          {/* Invoice stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Total Invoices</p>
              <p className="text-xl font-bold text-blue-700">{invoices.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-700">{invoices.filter(i => i.status === 'pending').length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Paid</p>
              <p className="text-xl font-bold text-green-700">{invoices.filter(i => i.status === 'paid').length}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Outstanding</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrencyAmount(
                  invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
                    .reduce((sum, i) => sum + (i.totalAmount || i.total_amount || 0), 0),
                  currencySettings
                )}
              </p>
            </div>
          </div>

          {/* Invoice list */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No invoices yet. Click "Create Invoice" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Invoice #</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Issue Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Due Date</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {inv.invoiceNumber || inv.invoice_number || inv.id?.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {inv.clientName || inv.client_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {inv.issueDate || inv.issue_date
                          ? new Date(inv.issueDate || inv.issue_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {inv.dueDate || inv.due_date
                          ? new Date(inv.dueDate || inv.due_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrencyAmount(inv.totalAmount || inv.total_amount || 0, currencySettings)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                          inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          inv.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expiry Tracking Tab */}
      {activeTab === 'expiry' && (
        <div className="space-y-6">
          {/* Expiring Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              Expiring Soon (Next 30 Days)
            </h3>
            <div className="space-y-2">
              {expiringItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items expiring soon</p>
              ) : (
                expiringItems.map(item => (
                  <div key={item.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Expires: {new Date(item.expiryDate).toLocaleDateString()} ({item.daysUntilExpiry} days)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Stock: {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expired Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              Expired Items
            </h3>
            <div className="space-y-2">
              {expiredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No expired items</p>
              ) : (
                expiredItems.map(item => (
                  <div key={item.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-red-600">
                          Expired: {new Date(item.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Stock: {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reorder Alerts Tab */}
      {activeTab === 'reorder' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingDown className="h-5 w-5 text-orange-600 mr-2" />
            Low Stock Items
          </h3>
          <div className="space-y-2">
            {lowStockItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">All items are above reorder level</p>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Current: {item.quantity} | Reorder Level: {item.reorderLevel || item.minStock}
                      </p>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Create PO
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Audit Trail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2 text-right">Previous</th>
                  <th className="px-4 py-2 text-right">New Stock</th>
                  <th className="px-4 py-2 text-left">Reference</th>
                </tr>
              </thead>
              <tbody>
                {auditTrail.map(audit => (
                  <tr key={audit.id} className="border-b">
                    <td className="px-4 py-2">
                      {audit.timestamp ? new Date(audit.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        audit.type === 'received' ? 'bg-green-100 text-green-800' :
                        audit.type === 'dispensed' ? 'bg-blue-100 text-blue-800' :
                        audit.type === 'created' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {audit.type}
                      </span>
                    </td>
                    <td className="px-4 py-2">{audit.inventoryId}</td>
                    <td className="px-4 py-2 text-right">{audit.quantity}</td>
                    <td className="px-4 py-2 text-right">{audit.previousStock}</td>
                    <td className="px-4 py-2 text-right font-medium">{audit.newStock}</td>
                    <td className="px-4 py-2">{audit.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Order Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedPO ? 'View/Edit Purchase Order' : 'Create New Purchase Order'}
              </h3>
              <button
                onClick={() => {
                  setShowPOModal(false);
                  setSelectedPO(null);
                  resetPOForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPOForm(prev => ({ ...prev, supplierId: e.target.value }))}
                  disabled={!!selectedPO}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expected Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={poForm.expectedDeliveryDate || ''}
                  onChange={(e) => setPOForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">Items</h4>
                  {!selectedPO && (
                    <button
                      onClick={addPOItem}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  )}
                </div>

                {/* Add New Item Form */}
                {!selectedPO && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <select
                          value={newPOItem.inventoryId}
                          onChange={(e) => {
                            const selected = inventoryItems.find(item => item.id === e.target.value);
                            setNewPOItem(prev => ({
                              ...prev,
                              inventoryId: e.target.value,
                              name: selected?.name || prev.name,
                              unitPrice: selected?.unitPrice || prev.unitPrice,
                              unit: selected?.unit || prev.unit
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Select from inventory</option>
                          {inventoryItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} - Stock: {item.quantity || 0}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Or enter item name"
                          value={newPOItem.name}
                          onChange={(e) => setNewPOItem(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={newPOItem.quantity}
                          onChange={(e) => setNewPOItem(prev => ({ ...prev, quantity: e.target.value }))}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Unit Price"
                          value={newPOItem.unitPrice}
                          onChange={(e) => setNewPOItem(prev => ({ ...prev, unitPrice: e.target.value }))}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={addPOItem}
                          className="w-full h-full bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Table */}
                {poForm.items && poForm.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Item Name</th>
                          <th className="px-4 py-2 text-center">Quantity</th>
                          <th className="px-4 py-2 text-center">Unit</th>
                          <th className="px-4 py-2 text-right">Unit Price</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          {!selectedPO && <th className="px-4 py-2 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {poForm.items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">{item.name}</td>
                            <td className="px-4 py-2 text-center">
                              {selectedPO ? (
                                item.quantity
                              ) : (
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updatePOItem(index, 'quantity', e.target.value)}
                                  min="1"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">{item.unit || 'piece'}</td>
                            <td className="px-4 py-2 text-right">
                              {selectedPO ? (
                                formatCurrency(item.unitPrice)
                              ) : (
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updatePOItem(index, 'unitPrice', e.target.value)}
                                  min="0"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                            </td>
                            {!selectedPO && (
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => removePOItem(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={selectedPO ? 4 : 5} className="px-4 py-2 text-right font-semibold">
                            Total Amount:
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-lg">
                            {formatCurrency(
                              poForm.items.reduce((sum, item) => 
                                sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0
                              )
                            )}
                          </td>
                          {!selectedPO && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No items added yet</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={poForm.notes || ''}
                  onChange={(e) => setPOForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes or instructions..."
                />
              </div>

              {/* Action Buttons */}
              {!selectedPO && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowPOModal(false);
                      setSelectedPO(null);
                      resetPOForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePO}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Purchase Order'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setSelectedSupplier(null);
                    resetSupplierForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSupplier}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Create Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client by name, email, or phone..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {showClientDropdown && clientSearch && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No clients found</div>
                      ) : (
                        filteredClients.slice(0, 10).map(client => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-sm text-gray-900">
                              {client.name || client.fullName || 'Unnamed'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {client.email || ''} {client.phone || client.phoneNumber || ''}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {invoiceForm.clientName && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                    <div className="font-medium text-blue-900">{invoiceForm.clientName}</div>
                    {invoiceForm.clientEmail && <div className="text-blue-700">{invoiceForm.clientEmail}</div>}
                    {invoiceForm.clientPhone && <div className="text-blue-700">{invoiceForm.clientPhone}</div>}
                  </div>
                )}
              </div>

              {/* Issue & Due Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={invoiceForm.issueDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                {/* Existing items */}
                {invoiceForm.items.length > 0 && (
                  <div className="mb-3 overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoiceForm.items.map(item => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-gray-900">
                              {item.description}
                              {item.inventoryId && (
                                <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Inventory</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{formatCurrencyAmount(item.unitPrice, currencySettings)}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrencyAmount(item.total, currencySettings)}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => handleRemoveInvoiceItem(item.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add new item */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  {/* Inventory item selector */}
                  {inventoryItems.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Select from Inventory (optional)</label>
                      <select
                        value={newInvoiceItem.inventoryId}
                        onChange={(e) => handleSelectInventoryItem(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Custom item (not from inventory) —</option>
                        {inventoryItems.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name || inv.description} (Stock: {inv.quantity || 0} {inv.unit || ''})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={newInvoiceItem.description}
                        onChange={(e) => setNewInvoiceItem(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={newInvoiceItem.quantity}
                        onChange={(e) => setNewInvoiceItem(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Unit price"
                        min="0"
                        step="0.01"
                        value={newInvoiceItem.unitPrice}
                        onChange={(e) => setNewInvoiceItem(prev => ({ ...prev, unitPrice: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        onClick={handleAddInvoiceItem}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax, Discount, Notes */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceForm.taxRate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, taxRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceForm.discount}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, discount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={invoiceForm.discountType}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, discountType: e.target.value }))}
                      className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="percentage">%</option>
                      <option value="flat">Flat</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Unpaid —</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="insurance">Insurance</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal notes..."
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="ml-auto max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrencyAmount(invoiceTotals.subtotal, currencySettings)}</span>
                  </div>
                  {invoiceTotals.discount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount</span>
                      <span className="font-medium text-red-600">-{formatCurrencyAmount(invoiceTotals.discount, currencySettings)}</span>
                    </div>
                  )}
                  {invoiceTotals.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({invoiceForm.taxRate}%)</span>
                      <span className="font-medium">{formatCurrencyAmount(invoiceTotals.tax, currencySettings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrencyAmount(invoiceTotals.total, currencySettings)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvoice}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                Invoice {viewingInvoice.invoiceNumber || viewingInvoice.invoice_number || viewingInvoice.id?.substring(0, 8)}
              </h3>
              <button onClick={() => setViewingInvoice(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Client info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-medium text-gray-900">{viewingInvoice.clientName || viewingInvoice.client_name || 'N/A'}</div>
                {viewingInvoice.clientEmail && <div className="text-sm text-gray-600">{viewingInvoice.clientEmail}</div>}
                {viewingInvoice.clientPhone && <div className="text-sm text-gray-600">{viewingInvoice.clientPhone}</div>}
                {viewingInvoice.clientAddress && <div className="text-sm text-gray-600">{viewingInvoice.clientAddress}</div>}
              </div>

              {/* Dates + status */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Issue Date</div>
                  <div className="font-medium text-gray-900">
                    {viewingInvoice.issueDate || viewingInvoice.issue_date
                      ? new Date(viewingInvoice.issueDate || viewingInvoice.issue_date).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Due Date</div>
                  <div className="font-medium text-gray-900">
                    {viewingInvoice.dueDate || viewingInvoice.due_date
                      ? new Date(viewingInvoice.dueDate || viewingInvoice.due_date).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    viewingInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    viewingInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    viewingInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingInvoice.status}
                  </span>
                </div>
              </div>

              {/* Line items */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(viewingInvoice.items || viewingInvoice.lineItems || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-900">{item.description || item.name || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{item.quantity} {item.unit || ''}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrencyAmount(item.unitPrice || item.unit_price || 0, currencySettings)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrencyAmount(item.total || (item.quantity * (item.unitPrice || item.unit_price || 0)), currencySettings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="ml-auto max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrencyAmount(viewingInvoice.subtotal || viewingInvoice.amount || 0, currencySettings)}</span>
                </div>
                {(viewingInvoice.discount || viewingInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span className="font-medium text-red-600">-{formatCurrencyAmount(viewingInvoice.discount || viewingInvoice.discount_amount || 0, currencySettings)}</span>
                  </div>
                )}
                {(viewingInvoice.taxAmount || viewingInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="font-medium">{formatCurrencyAmount(viewingInvoice.taxAmount || viewingInvoice.tax_amount || 0, currencySettings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrencyAmount(viewingInvoice.totalAmount || viewingInvoice.total_amount || 0, currencySettings)}</span>
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.notes && (
                <div className="text-sm text-gray-600">
                  <div className="font-medium text-gray-700 mb-1">Notes</div>
                  <div>{viewingInvoice.notes}</div>
                </div>
              )}

              {/* Actions */}
              {viewingInvoice.status !== 'paid' && (
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    onClick={() => handleMarkInvoicePaid(viewingInvoice.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark as Paid
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedInventoryManagement;


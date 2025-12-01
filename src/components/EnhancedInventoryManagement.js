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
 */

import React, { useState, useEffect } from 'react';
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
  Eye
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
import { getInstitutionCurrencySettings } from '../utils/currencyFormatter';
import { X } from 'lucide-react';

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

  if (loading && !suppliers.length && !purchaseOrders.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enhanced Inventory Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage suppliers, purchase orders, and stock tracking</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex space-x-1 border-b border-gray-200">
          {[
            { id: 'suppliers', label: 'Suppliers', icon: Package },
            { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
            { id: 'grn', label: 'Goods Received', icon: Truck },
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
    </div>
  );
};

export default EnhancedInventoryManagement;


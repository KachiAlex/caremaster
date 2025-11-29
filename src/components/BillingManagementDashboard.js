/**
 * Billing Management Dashboard
 * 
 * Comprehensive billing management:
 * - Auto-billing from services
 * - Outstanding payments
 * - Invoice generation
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  FileText,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Download,
  Filter,
  RefreshCw,
  Users,
  Receipt,
  Building
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getBillsByClient,
  getBillsByInstitution,
  getOutstandingPayments,
  recordPayment,
  BILL_STATUS,
  SERVICE_TYPE
} from '../api/autoBillingAPI';
import { useUser } from '../contexts/UserContext';

const BillingManagementDashboard = ({ institutionId: propInstitutionId, clients = [] }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('bills');
  const [bills, setBills] = useState([]);
  const [outstandingPayments, setOutstandingPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (institutionId) {
      loadData();
    }
  }, [institutionId, activeTab, selectedPatient]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'bills') {
        await loadBills();
      } else if (activeTab === 'outstanding') {
        await loadOutstandingPayments();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    // Load bills for all clients or selected client
    if (selectedPatient) {
      const patientBills = await getBillsByClient(selectedPatient);
      setBills(patientBills);
    } else {
      // Load all bills for institution
      const allBills = await getBillsByInstitution(institutionId);
      setBills(allBills);
    }
  };


  const loadOutstandingPayments = async () => {
    const outstanding = {};
    for (const Client of clients) {
      const result = await getOutstandingPayments(client.id);
      if (result.totalOutstanding > 0) {
        outstanding[client.id] = result;
      }
    }
    setOutstandingPayments(outstanding);
  };

  const handleRecordPayment = async (paymentData) => {
    try {
      await recordPayment(selectedBill.id, paymentData);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedBill(null);
      await loadBills();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case BILL_STATUS.PAID:
        return 'bg-green-100 text-green-800 border-green-300';
      case BILL_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case BILL_STATUS.PARTIALLY_PAID:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case BILL_STATUS.OVERDUE:
        return 'bg-red-100 text-red-800 border-red-300';
      case BILL_STATUS.CANCELLED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };


  const filteredBills = bills.filter(bill => {
    // Filter by selected client if one is selected
    const matchesClient = !selectedPatient || bill.clientId === selectedPatient || bill.clientId === selectedPatient;
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesClient && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage bills and outstanding payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'bills', name: 'Bills', icon: Receipt },
            { id: 'outstanding', name: 'Outstanding', icon: AlertCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bills Tab */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search bill by Client
                </label>
                <select
                  value={selectedPatient || ''}
                  onChange={(e) => {
                    const clientId = e.target.value;
                    setSelectedPatient(clientId || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.fullName || 'Unknown Client'} {client.age ? `- ${client.age} yrs` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value={BILL_STATUS.PENDING}>Pending</option>
                  <option value={BILL_STATUS.PARTIALLY_PAID}>Partially Paid</option>
                  <option value={BILL_STATUS.PAID}>Paid</option>
                  <option value={BILL_STATUS.OVERDUE}>Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bills List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading bills...</div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No bills found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.clientName || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.serviceType || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.currency} {bill.total?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(bill.status)}`}>
                            {bill.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowPaymentModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                // View bill details
                                setSelectedBill(bill);
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outstanding Payments Tab */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Payments</h3>
            {Object.keys(outstandingPayments).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                <p>No outstanding payments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(outstandingPayments).map(([clientId, data]) => {
                  const Client = clients.find(p => p.id === clientId);
                  return (
                    <div key={clientId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{Client?.name || 'Unknown Client'}</p>
                          <p className="text-sm text-gray-500">{data.count} outstanding bill(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            NGN {data.totalOutstanding.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <PaymentModal
          bill={selectedBill}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
          }}
          onPayment={handleRecordPayment}
        />
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({ bill, onClose, onPayment }) => {
  const [paymentData, setPaymentData] = useState({
    amount: bill.total - (bill.paidAmount || 0),
    paymentMethod: 'cash',
    transactionId: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onPayment(paymentData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (Optional)</label>
            <input
              type="text"
              value={paymentData.transactionId}
              onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillingManagementDashboard;


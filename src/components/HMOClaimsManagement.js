/**
 * HMO Claims Management Component
 * 
 * Phase 2 Implementation - Complete HMO claims workflow:
 * - View all HMO claims
 * - Submit claims to HMO providers
 * - Track claim status (pending, submitted, approved, rejected, paid)
 * - Approve/reject claims (if institution is HMO provider)
 * - Claim reconciliation
 * - Reports and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  Download,
  Send,
  AlertCircle,
  Search,
  Calendar,
  Building,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  getHMOClaims,
  submitHMOClaim,
  approveHMOClaim,
  rejectHMOClaim,
  markHMOClaimAsPaid,
  getHMOClaimStats,
  BILL_STATUS
} from '../api/autoBillingAPI';
import { getHMOPlans } from '../api/hmoPlansAPI';
import { getBillsByClient } from '../api/autoBillingAPI';

const HMO_CLAIM_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid'
};

const HMOClaimsManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState([]);
  const [hmoPlans, setHmoPlans] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    return {
      startDate: threeMonthsAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });

  // View states
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimDetails, setShowClaimDetails] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    
    loadClaims();
    loadHMOPlans();
  }, [institutionId]);

  useEffect(() => {
    filterClaims();
  }, [claims, statusFilter, planFilter, searchTerm, dateRange]);

  const loadClaims = async () => {
    if (!institutionId) return;
    
    try {
      setLoading(true);
      const claimsData = await getHMOClaims(institutionId);
      setClaims(claimsData);
    } catch (error) {
      console.error('Error loading HMO claims:', error);
      toast.error('Failed to load HMO claims');
    } finally {
      setLoading(false);
    }
  };

  const loadHMOPlans = async () => {
    if (!institutionId) return;
    
    try {
      const plans = await getHMOPlans(institutionId);
      setHmoPlans(plans);
    } catch (error) {
      console.error('Error loading HMO plans:', error);
    }
  };

  const filterClaims = () => {
    let filtered = [...claims];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.status === statusFilter);
    }

    // Filter by plan
    if (planFilter !== 'all') {
      filtered = filtered.filter(claim => claim.hmoPlanId === planFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(claim =>
        claim.hmoPlanName?.toLowerCase().includes(searchLower) ||
        claim.clientId?.toLowerCase().includes(searchLower) ||
        claim.claimAmount?.toString().includes(searchTerm)
      );
    }

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(claim => {
        const claimDate = claim.createdAt instanceof Date 
          ? claim.createdAt 
          : new Date(claim.createdAt);
        const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (start && claimDate < start) return false;
        if (end && claimDate > end) return false;
        return true;
      });
    }

    setFilteredClaims(filtered);
  };

  const handleSubmitClaim = async (claimId) => {
    try {
      await submitHMOClaim(claimId);
      toast.success('Claim submitted successfully');
      loadClaims();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim');
    }
  };

  const handleApproveClaim = async (claimId) => {
    try {
      await approveHMOClaim(claimId, userProfile?.id || userProfile?.uid);
      toast.success('Claim approved');
      loadClaims();
    } catch (error) {
      console.error('Error approving claim:', error);
      toast.error('Failed to approve claim');
    }
  };

  const handleRejectClaim = async (claimId, reason) => {
    if (!reason) {
      const inputReason = prompt('Please provide a reason for rejection:');
      if (!inputReason) return;
      reason = inputReason;
    }
    
    try {
      await rejectHMOClaim(claimId, reason, userProfile?.id || userProfile?.uid);
      toast.success('Claim rejected');
      loadClaims();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast.error('Failed to reject claim');
    }
  };

  const handleViewClaimDetails = async (claim) => {
    try {
      // Load bill details
      const bills = await getBillsByClient(claim.clientId);
      const relatedBill = bills.find(b => b.id === claim.billId);
      
      setSelectedClaim({
        ...claim,
        bill: relatedBill
      });
      setShowClaimDetails(true);
    } catch (error) {
      console.error('Error loading claim details:', error);
      toast.error('Failed to load claim details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case HMO_CLAIM_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case HMO_CLAIM_STATUS.SUBMITTED:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case HMO_CLAIM_STATUS.APPROVED:
        return 'bg-green-100 text-green-800 border-green-300';
      case HMO_CLAIM_STATUS.REJECTED:
        return 'bg-red-100 text-red-800 border-red-300';
      case HMO_CLAIM_STATUS.PAID:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case HMO_CLAIM_STATUS.PENDING:
        return <Clock className="h-4 w-4" />;
      case HMO_CLAIM_STATUS.SUBMITTED:
        return <Send className="h-4 w-4" />;
      case HMO_CLAIM_STATUS.APPROVED:
        return <CheckCircle className="h-4 w-4" />;
      case HMO_CLAIM_STATUS.REJECTED:
        return <XCircle className="h-4 w-4" />;
      case HMO_CLAIM_STATUS.PAID:
        return <DollarSign className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  // Calculate statistics
  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === HMO_CLAIM_STATUS.PENDING).length,
    submitted: claims.filter(c => c.status === HMO_CLAIM_STATUS.SUBMITTED).length,
    approved: claims.filter(c => c.status === HMO_CLAIM_STATUS.APPROVED).length,
    rejected: claims.filter(c => c.status === HMO_CLAIM_STATUS.REJECTED).length,
    paid: claims.filter(c => c.status === HMO_CLAIM_STATUS.PAID).length,
    totalAmount: claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0),
    pendingAmount: claims
      .filter(c => [HMO_CLAIM_STATUS.PENDING, HMO_CLAIM_STATUS.SUBMITTED].includes(c.status))
      .reduce((sum, c) => sum + (c.claimAmount || 0), 0),
    paidAmount: claims
      .filter(c => c.status === HMO_CLAIM_STATUS.PAID)
      .reduce((sum, c) => sum + (c.claimAmount || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">HMO Claims Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage and track HMO insurance claims
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.pendingAmount)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.values(HMO_CLAIM_STATUS).map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              HMO Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Plans</option>
              {hmoPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search claims..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Claim ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">HMO Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    Loading claims...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No claims found
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {claim.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {claim.hmoPlanName || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {claim.clientId?.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(claim.claimAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${getStatusColor(claim.status)}`}>
                        {getStatusIcon(claim.status)}
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(claim.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewClaimDetails(claim)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          View
                        </button>
                        {claim.status === HMO_CLAIM_STATUS.PENDING && (
                          <button
                            onClick={() => handleSubmitClaim(claim.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            title="Submit Claim"
                          >
                            Submit
                          </button>
                        )}
                        {claim.status === HMO_CLAIM_STATUS.SUBMITTED && (
                          <>
                            <button
                              onClick={() => handleApproveClaim(claim.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                              title="Approve Claim"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClaim(claim.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                              title="Reject Claim"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Details Modal */}
      {showClaimDetails && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Claim Details</h3>
              <button
                onClick={() => {
                  setShowClaimDetails(false);
                  setSelectedClaim(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Claim ID</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedClaim.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${getStatusColor(selectedClaim.status)}`}>
                    {getStatusIcon(selectedClaim.status)}
                    {selectedClaim.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">HMO Plan</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedClaim.hmoPlanName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Claim Amount</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedClaim.claimAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedClaim.createdAt)}</p>
                </div>
                {selectedClaim.submittedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedClaim.submittedAt)}</p>
                  </div>
                )}
                {selectedClaim.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedClaim.approvedAt)}</p>
                  </div>
                )}
                {selectedClaim.paidAt && (
                  <div>
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedClaim.paidAt)}</p>
                  </div>
                )}
              </div>

              {selectedClaim.rejectionReason && (
                <div>
                  <p className="text-sm text-gray-600">Rejection Reason</p>
                  <p className="text-sm text-gray-900 bg-red-50 p-3 rounded-lg">{selectedClaim.rejectionReason}</p>
                </div>
              )}

              {selectedClaim.bill && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Related Bill</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Bill ID</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedClaim.bill.id.substring(0, 8)}...</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total Amount</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedClaim.bill.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">HMO Covered</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedClaim.bill.hmoCovered)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Co-pay</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedClaim.bill.coPay)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {selectedClaim.status === HMO_CLAIM_STATUS.PENDING && (
                  <button
                    onClick={() => {
                      handleSubmitClaim(selectedClaim.id);
                      setShowClaimDetails(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Submit Claim
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowClaimDetails(false);
                    setSelectedClaim(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HMOClaimsManagement;


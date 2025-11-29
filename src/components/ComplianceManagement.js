/**
 * Compliance Management Component
 * 
 * Provides comprehensive compliance management including:
 * - Audit trail viewing
 * - Compliance policies management
 * - Data retention rules
 * - Privacy consents
 * - Compliance reporting
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Clock, 
  Eye, 
  Download, 
  Settings, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Calendar,
  BarChart3
} from 'lucide-react';
import complianceAPI, { AUDIT_ACTIONS, POLICY_TYPES } from '../api/complianceAPI';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

const ComplianceManagement = ({ institutionId }) => {
  const { user: currentUser } = useUser();
  const [activeTab, setActiveTab] = useState('audit');
  const [loading, setLoading] = useState(false);
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    resourceType: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Compliance policies state
  const [policies, setPolicies] = useState([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    policyType: POLICY_TYPES.DATA_RETENTION,
    name: '',
    description: '',
    rules: {},
    isActive: true
  });

  // Retention rules state
  const [retentionRules, setRetentionRules] = useState([]);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionForm, setRetentionForm] = useState({
    dataType: '',
    retentionPeriodDays: 365,
    autoArchive: false,
    autoDelete: false,
    archiveAfterDays: 365,
    deleteAfterDays: 730,
    description: ''
  });

  // Compliance stats
  const [complianceStats, setComplianceStats] = useState(null);

  useEffect(() => {
    if (institutionId) {
      loadComplianceData();
    }
  }, [institutionId, activeTab, auditFilters]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'audit') {
        const logs = await complianceAPI.getAuditLogs({
          institutionId,
          ...auditFilters
        });
        setAuditLogs(logs);
      } else if (activeTab === 'policies') {
        const policiesData = await complianceAPI.getCompliancePolicies(institutionId);
        setPolicies(policiesData);
      } else if (activeTab === 'retention') {
        const rules = await complianceAPI.getDataRetentionRules(institutionId);
        setRetentionRules(rules);
      } else if (activeTab === 'stats') {
        const stats = await complianceAPI.getComplianceStats(institutionId, 30);
        setComplianceStats(stats);
      }
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      await complianceAPI.upsertCompliancePolicy({
        institutionId,
        ...policyForm
      });
      toast.success('Compliance policy created successfully');
      setShowPolicyModal(false);
      setPolicyForm({
        policyType: POLICY_TYPES.DATA_RETENTION,
        name: '',
        description: '',
        rules: {},
        isActive: true
      });
      loadComplianceData();
    } catch (error) {
      console.error('Error creating policy:', error);
      toast.error('Failed to create policy');
    }
  };

  const handleCreateRetentionRule = async () => {
    try {
      await complianceAPI.createDataRetentionRule({
        institutionId,
        ...retentionForm,
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || 'Admin'
      });
      toast.success('Data retention rule created successfully');
      setShowRetentionModal(false);
      setRetentionForm({
        dataType: '',
        retentionPeriodDays: 365,
        autoArchive: false,
        autoDelete: false,
        archiveAfterDays: 365,
        deleteAfterDays: 730,
        description: ''
      });
      loadComplianceData();
    } catch (error) {
      console.error('Error creating retention rule:', error);
      toast.error('Failed to create retention rule');
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const report = await complianceAPI.generateComplianceReport({
        institutionId,
        reportType: 'comprehensive',
        startDate: auditFilters.startDate,
        endDate: auditFilters.endDate,
        generatedBy: currentUser?.uid,
        generatedByName: currentUser?.displayName || 'Admin'
      });
      toast.success('Compliance report generated successfully');
      // Could download or display the report here
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case AUDIT_ACTIONS.CREATE:
        return 'bg-green-100 text-green-800';
      case AUDIT_ACTIONS.UPDATE:
        return 'bg-blue-100 text-blue-800';
      case AUDIT_ACTIONS.DELETE:
        return 'bg-red-100 text-red-800';
      case AUDIT_ACTIONS.READ:
        return 'bg-gray-100 text-gray-800';
      case AUDIT_ACTIONS.ACCESS_DENIED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Management</h2>
          <p className="text-gray-600">Manage audit trails, policies, and compliance reporting</p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'audit', name: 'Audit Logs', icon: Eye },
            { id: 'policies', name: 'Policies', icon: FileText },
            { id: 'retention', name: 'Data Retention', icon: Clock },
            { id: 'stats', name: 'Statistics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {Object.values(AUDIT_ACTIONS).map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                <input
                  type="text"
                  value={auditFilters.resourceType}
                  onChange={(e) => setAuditFilters({ ...auditFilters, resourceType: e.target.value })}
                  placeholder="e.g., Client, bill"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={auditFilters.startDate}
                  onChange={(e) => setAuditFilters({ ...auditFilters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={auditFilters.endDate}
                  onChange={(e) => setAuditFilters({ ...auditFilters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString() : log.createdAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userName} ({log.userRole})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.resourceType} {log.resourceName && `- ${log.resourceName}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPolicyModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Create Policy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                    <p className="text-sm text-gray-500">{policy.policyType}</p>
                  </div>
                  {policy.isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4">{policy.description}</p>
                <div className="text-xs text-gray-500">
                  Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowRetentionModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Clock className="h-4 w-4 mr-2" />
              Create Rule
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retention Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto Archive</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto Delete</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {retentionRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rule.dataType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.retentionPeriodDays} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rule.autoArchive ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rule.autoDelete ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'stats' && complianceStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Audit Events</p>
                <p className="text-2xl font-bold text-gray-900">{complianceStats.totalAuditEvents}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Access Denials</p>
                <p className="text-2xl font-bold text-red-600">{complianceStats.accessDeniedCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold text-green-600">{complianceStats.complianceScore}%</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create Compliance Policy</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Type</label>
                <select
                  value={policyForm.policyType}
                  onChange={(e) => setPolicyForm({ ...policyForm, policyType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.values(POLICY_TYPES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={policyForm.isActive}
                  onChange={(e) => setPolicyForm({ ...policyForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePolicy}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retention Rule Modal */}
      {showRetentionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create Data Retention Rule</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                <input
                  type="text"
                  value={retentionForm.dataType}
                  onChange={(e) => setRetentionForm({ ...retentionForm, dataType: e.target.value })}
                  placeholder="e.g., patient_records, audit_logs"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retention Period (days)</label>
                <input
                  type="number"
                  value={retentionForm.retentionPeriodDays}
                  onChange={(e) => setRetentionForm({ ...retentionForm, retentionPeriodDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={retentionForm.autoArchive}
                  onChange={(e) => setRetentionForm({ ...retentionForm, autoArchive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Auto Archive</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={retentionForm.autoDelete}
                  onChange={(e) => setRetentionForm({ ...retentionForm, autoDelete: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Auto Delete</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={retentionForm.description}
                  onChange={(e) => setRetentionForm({ ...retentionForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowRetentionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRetentionRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceManagement;


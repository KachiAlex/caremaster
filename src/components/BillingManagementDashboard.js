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
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getOutstandingPayments } from '../api/autoBillingAPI';
import { useUser } from '../contexts/UserContext';
import BillingPlanConfiguration from './BillingPlanConfiguration';

const BillingManagementDashboard = ({ institutionId: propInstitutionId, clients = [] }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('outstanding');
  const [outstandingPayments, setOutstandingPayments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (institutionId) {
      loadData();
    }
  }, [institutionId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'outstanding') {
        await loadOutstandingPayments();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOutstandingPayments = async () => {
    const outstanding = {};
    for (const client of clients) {
      const result = await getOutstandingPayments(client.id);
      if (result.totalOutstanding > 0) {
        outstanding[client.id] = result;
      }
    }
    setOutstandingPayments(outstanding);
  };

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
            { id: 'outstanding', name: 'Outstanding Payments', icon: AlertCircle },
            { id: 'configuration', name: 'Plan Configuration', icon: Settings }
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

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <BillingPlanConfiguration institutionId={institutionId} />
      )}
    </div>
  );
};

export default BillingManagementDashboard;


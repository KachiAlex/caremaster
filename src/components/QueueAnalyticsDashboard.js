/**
 * Queue Analytics Dashboard
 * 
 * Features:
 * - Wait time trends
 * - Throughput analysis
 * - Peak hours identification
 * - Department performance comparison
 * - Patient flow analytics
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { getQueueAnalytics, getDepartmentPerformance } from '../api/queueAnalyticsAPI';
import { DEPARTMENT_TYPES } from '../api/queueAPI';

const QueueAnalyticsDashboard = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeDepartment, setActiveDepartment] = useState(DEPARTMENT_TYPES.GP);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [analytics, setAnalytics] = useState(null);
  const [departmentPerformance, setDepartmentPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (institutionId) {
      loadAnalytics();
      loadDepartmentPerformance();
    }
  }, [institutionId, activeDepartment, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const analyticsData = await getQueueAnalytics(
        institutionId,
        activeDepartment,
        startDate,
        endDate
      );
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load queue analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentPerformance = async () => {
    try {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const performance = await getDepartmentPerformance(
        institutionId,
        startDate,
        endDate
      );
      setDepartmentPerformance(performance);
    } catch (error) {
      console.error('Error loading department performance:', error);
    }
  };

  if (loading && !analytics) {
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Queue Analytics</h2>
              <p className="text-sm text-gray-600">Performance metrics and insights</p>
            </div>
          </div>
          <button
            onClick={() => {
              loadAnalytics();
              loadDepartmentPerformance();
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Refresh
          </button>
        </div>

        {/* Date Range & Department Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={activeDepartment}
              onChange={(e) => setActiveDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={DEPARTMENT_TYPES.GP}>General Practice</option>
              <option value={DEPARTMENT_TYPES.SPECIALIST}>Specialist</option>
              <option value={DEPARTMENT_TYPES.LAB}>Laboratory</option>
              <option value={DEPARTMENT_TYPES.PHARMACY}>Pharmacy</option>
              <option value={DEPARTMENT_TYPES.BILLING}>Billing</option>
              <option value={DEPARTMENT_TYPES.RADIOLOGY}>Radiology</option>
              <option value={DEPARTMENT_TYPES.TRIAGE}>Triage</option>
            </select>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalPatients}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Wait Time</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(analytics.averageWaitTime)}m
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Service Time</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(analytics.averageServiceTime)}m
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Throughput/Day</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(analytics.throughput.perDay)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Wait Time Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Wait Time Distribution</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(analytics.waitTimeDistribution).map(([range, count]) => (
                <div key={range} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{range}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours */}
          {Object.keys(analytics.peakHours).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h3>
              <div className="grid grid-cols-6 gap-3">
                {Object.entries(analytics.peakHours)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([hour, data]) => (
                    <div key={hour} className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-900">{hour}:00</div>
                      <div className="text-sm text-blue-700">{data.patientCount} patients</div>
                      <div className="text-xs text-blue-600">
                        Avg: {Math.round(data.averageWaitTime)}m
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Trends */}
          {analytics.trends.waitTimeTrend.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wait Time Trend</h3>
              <div className="space-y-2">
                {analytics.trends.waitTimeTrend.map((trend, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{trend.date}</span>
                    <span className="text-sm text-gray-600">
                      {Math.round(trend.averageWaitTime)} minutes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Department Performance Comparison */}
      {departmentPerformance && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Department</th>
                  <th className="px-4 py-2 text-right">Total Patients</th>
                  <th className="px-4 py-2 text-right">Avg Wait Time</th>
                  <th className="px-4 py-2 text-right">Avg Service Time</th>
                  <th className="px-4 py-2 text-right">Throughput/Day</th>
                  <th className="px-4 py-2 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(departmentPerformance).map(([dept, perf]) => {
                  if (!perf) return null;
                  return (
                    <tr key={dept} className="border-b">
                      <td className="px-4 py-2 font-medium capitalize">{dept}</td>
                      <td className="px-4 py-2 text-right">{perf.totalPatients}</td>
                      <td className="px-4 py-2 text-right">{Math.round(perf.averageWaitTime)}m</td>
                      <td className="px-4 py-2 text-right">{Math.round(perf.averageServiceTime)}m</td>
                      <td className="px-4 py-2 text-right">{Math.round(perf.throughput)}</td>
                      <td className="px-4 py-2 text-right">{perf.completionRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueAnalyticsDashboard;


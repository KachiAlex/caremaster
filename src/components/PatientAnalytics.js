/**
 * Patient Analytics Component
 * Displays analytics and visualizations based on patient logs
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { getPatientLogs, getLogsByCategory } from '../utils/patientLogger';
import { useUser } from '../contexts/UserContext';

const PatientAnalytics = ({ patientId, patientName }) => {
  const { institutionId } = useUser();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    if (patientId) {
      loadAnalytics();
    }
  }, [patientId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      const logs = await getPatientLogs(patientId, 1000);
      const filteredLogs = logs.filter(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });

      // Calculate analytics
      const categoryCounts = {};
      const clinicianCounts = {};
      const dailyActivity = {};
      const activityTypes = {};

      filteredLogs.forEach(log => {
        // Category counts
        const category = log.category || 'general';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        // Clinician counts
        const clinician = log.clinicianName || 'Unknown';
        clinicianCounts[clinician] = (clinicianCounts[clinician] || 0) + 1;

        // Daily activity
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
        const dateKey = logDate.toISOString().split('T')[0];
        dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;

        // Activity types
        const action = log.action || 'unknown';
        activityTypes[action] = (activityTypes[action] || 0) + 1;
      });

      // Calculate trends
      const sortedDates = Object.keys(dailyActivity).sort();
      const recentActivity = sortedDates.slice(-7).reduce((sum, date) => sum + dailyActivity[date], 0);
      const previousActivity = sortedDates.slice(-14, -7).reduce((sum, date) => sum + dailyActivity[date], 0);
      const trend = previousActivity > 0 
        ? ((recentActivity - previousActivity) / previousActivity * 100).toFixed(1)
        : 0;

      setAnalytics({
        totalActivities: filteredLogs.length,
        categoryCounts,
        clinicianCounts,
        dailyActivity,
        activityTypes,
        trend: parseFloat(trend),
        dateRange: {
          start: startDate,
          end: endDate
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6">
        <div className="flex items-center justify-center p-8 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6">
        <div className="text-center py-12 text-slate-400">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  const topCategories = Object.entries(analytics.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topClinicians = Object.entries(analytics.clinicianCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-50 flex items-center">
          <BarChart3 className="h-6 w-6 mr-3 text-blue-400" />
          Analytics for {patientName || patientId}
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Activities</p>
              <p className="text-2xl font-bold text-slate-50">{analytics.totalActivities}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Activity Trend</p>
              <p className={`text-2xl font-bold ${analytics.trend >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {analytics.trend >= 0 ? '+' : ''}{analytics.trend}%
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${analytics.trend >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Categories</p>
              <p className="text-2xl font-bold text-slate-50">{Object.keys(analytics.categoryCounts).length}</p>
            </div>
            <PieChartIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Active Clinicians</p>
              <p className="text-2xl font-bold text-slate-50">{Object.keys(analytics.clinicianCounts).length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 text-blue-400" />
            Top Categories
          </h4>
          <div className="space-y-3">
            {topCategories.map(([category, count], index) => {
              const percentage = ((count / analytics.totalActivities) * 100).toFixed(1);
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 capitalize text-sm">{category}</span>
                    <span className="text-slate-400 text-sm">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Clinicians */}
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-400" />
            Most Active Clinicians
          </h4>
          <div className="space-y-3">
            {topClinicians.map(([clinician, count], index) => {
              const percentage = ((count / analytics.totalActivities) * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-slate-50 font-medium">{clinician}</p>
                    <p className="text-xs text-slate-400">{count} activities</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 font-semibold">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      {Object.keys(analytics.dailyActivity).length > 0 && (
        <div className="mt-6 bg-slate-900/70 border border-slate-800/60 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-400" />
            Daily Activity
          </h4>
          <div className="flex items-end gap-2 h-48">
            {Object.entries(analytics.dailyActivity)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .slice(-14)
              .map(([date, count], index) => {
                const maxCount = Math.max(...Object.values(analytics.dailyActivity));
                const height = (count / maxCount) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-400 rounded-t transition-all hover:bg-blue-300"
                      style={{ height: `${height}%` }}
                      title={`${date}: ${count} activities`}
                    ></div>
                    <p className="text-xs text-slate-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAnalytics;


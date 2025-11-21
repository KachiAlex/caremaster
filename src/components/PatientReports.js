/**
 * Patient Reports Component
 * Generates and displays reports based on patient logs
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Activity,
  Filter,
  Loader2,
  Printer
} from 'lucide-react';
import {
  generatePatientActivityReport,
  generateClinicianActivityReport,
  generateInstitutionActivityReport,
  exportReportToCSV,
  exportReportToJSON
} from '../utils/reportGenerator';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

const PatientReports = ({ patientId = null, patientName = null }) => {
  const { userProfile, institutionId } = useUser();
  const [reportType, setReportType] = useState('patient'); // patient, clinician, institution
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      let data = null;
      if (reportType === 'patient' && patientId) {
        data = await generatePatientActivityReport(patientId, start, end);
      } else if (reportType === 'clinician' && userProfile?.id) {
        data = await generateClinicianActivityReport(userProfile.id, start, end);
      } else if (reportType === 'institution' && institutionId) {
        data = await generateInstitutionActivityReport(institutionId, start, end);
      } else {
        toast.error('Missing required information for report generation');
        return;
      }

      setReportData(data);
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }
    try {
      const filename = `patient-report-${new Date().toISOString().split('T')[0]}.csv`;
      exportReportToCSV(reportData, filename);
      toast.success('Report exported to CSV');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleExportJSON = () => {
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }
    try {
      const filename = `patient-report-${new Date().toISOString().split('T')[0]}.json`;
      exportReportToJSON(reportData, filename);
      toast.success('Report exported to JSON');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Failed to export JSON');
    }
  };

  const handlePrint = () => {
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }
    window.print();
  };

  return (
    <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-50 flex items-center">
          <FileText className="h-6 w-6 mr-3 text-blue-400" />
          Patient Reports
        </h3>
        {reportData && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center text-sm"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
        )}
      </div>

      {/* Report Configuration */}
      <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportData(null);
              }}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-blue-500 focus:border-blue-500"
            >
              {patientId && <option value="patient">Patient Activity</option>}
              <option value="clinician">Clinician Activity</option>
              {institutionId && <option value="institution">Institution Activity</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={generating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {loading && (
        <div className="flex items-center justify-center p-8 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          Loading report data...
        </div>
      )}

      {reportData && !loading && (
        <div className="space-y-6">
          {/* Statistics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Total Activities</p>
                  <p className="text-2xl font-bold text-slate-50">{reportData.statistics?.totalActivities || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            {reportData.statistics?.uniquePatients && (
              <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Unique Patients</p>
                    <p className="text-2xl font-bold text-slate-50">{reportData.statistics.uniquePatients}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            )}
            {reportData.statistics?.totalPatients && (
              <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total Patients</p>
                    <p className="text-2xl font-bold text-slate-50">{reportData.statistics.totalPatients}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            )}
            <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Date Range</p>
                  <p className="text-sm font-semibold text-slate-50">
                    {new Date(reportData.dateRange.start).toLocaleDateString()} - {new Date(reportData.dateRange.end).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {reportData.statistics?.byCategory && reportData.statistics.byCategory.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-blue-400" />
                Activities by Category
              </h4>
              <div className="space-y-3">
                {reportData.statistics.byCategory.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-400 mr-3"></div>
                      <span className="text-slate-300 capitalize">{cat.category || 'general'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 text-sm">{cat.count} activities</span>
                      <span className="text-slate-500 text-sm">({cat.percentage}%)</span>
                      <div className="w-32 bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinician Breakdown */}
          {reportData.statistics?.byClinician && reportData.statistics.byClinician.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" />
                Activities by Clinician
              </h4>
              <div className="space-y-3">
                {reportData.statistics.byClinician.map((clin, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-50 font-medium">{clin.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{clin.role}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 text-sm">{clin.count} activities</span>
                      {clin.percentage && (
                        <span className="text-slate-500 text-sm">({clin.percentage}%)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {reportData.logs && reportData.logs.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800/60 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                Activity Timeline
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {reportData.logs.slice(0, 50).map((log, index) => {
                  const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.dateTime || log.timestamp);
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                      <div className="flex-grow">
                        <p className="text-slate-50 text-sm">{log.description || log.action}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {log.clinicianName} ({log.clinicianRole}) • {logDate.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {reportData.logs.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-2">
                    Showing first 50 of {reportData.logs.length} activities
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!reportData && !loading && (
        <div className="text-center py-12 text-slate-400">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p>Configure report parameters and click "Generate Report" to view data</p>
        </div>
      )}
    </div>
  );
};

export default PatientReports;


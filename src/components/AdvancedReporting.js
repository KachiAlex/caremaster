/**
 * Advanced Reporting Component
 * 
 * Features:
 * - Custom report builder
 * - Report templates
 * - Export to CSV/JSON
 * - Scheduled reports
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Download,
  Calendar,
  Settings,
  Trash2,
  Eye,
  Edit,
  Save,
  X,
  Filter,
  BarChart3
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  customReportAPI,
  scheduledReportAPI
} from '../api/advancedReportingAPI';

const AdvancedReporting = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('builder');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Report Builder Form
  const [reportForm, setReportForm] = useState({
    name: '',
    description: '',
    dataSource: 'patients',
    fields: [],
    filters: [],
    groupBy: [],
    sortBy: { field: '', order: 'asc' }
  });

  // Available data sources and their fields
  const dataSources = {
    patients: [
      { key: 'name', label: 'Patient Name', type: 'string' },
      { key: 'patientId', label: 'Patient ID', type: 'string' },
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { key: 'gender', label: 'Gender', type: 'string' },
      { key: 'phoneNumber', label: 'Phone', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'createdAt', label: 'Registration Date', type: 'date' }
    ],
    appointments: [
      { key: 'patientName', label: 'Patient Name', type: 'string' },
      { key: 'appointmentDate', label: 'Date', type: 'date' },
      { key: 'appointmentTime', label: 'Time', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'type', label: 'Type', type: 'string' }
    ],
    consultations: [
      { key: 'patientName', label: 'Patient Name', type: 'string' },
      { key: 'doctorName', label: 'Doctor', type: 'string' },
      { key: 'chiefComplaint', label: 'Chief Complaint', type: 'string' },
      { key: 'createdAt', label: 'Date', type: 'date' }
    ],
    billing: [
      { key: 'patientName', label: 'Patient Name', type: 'string' },
      { key: 'total', label: 'Total Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'createdAt', label: 'Date', type: 'date' }
    ],
    inventory: [
      { key: 'name', label: 'Item Name', type: 'string' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unitPrice', label: 'Unit Price', type: 'number' },
      { key: 'category', label: 'Category', type: 'string' }
    ],
    staff: [
      { key: 'name', label: 'Staff Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'userType', label: 'Role', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' }
    ]
  };

  useEffect(() => {
    if (institutionId) {
      loadReports();
      loadSchedules();
    }
  }, [institutionId, activeTab]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportsData = await customReportAPI.getReports(institutionId);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const schedulesData = await scheduledReportAPI.getSchedules(institutionId);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const handleSaveReport = async () => {
    try {
      if (!reportForm.name) {
        toast.error('Please enter a report name');
        return;
      }

      if (reportForm.fields.length === 0) {
        toast.error('Please select at least one field');
        return;
      }

      await customReportAPI.createReport({
        ...reportForm,
        institutionId
      });

      toast.success('Report created successfully');
      setShowReportModal(false);
      resetReportForm();
      loadReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    }
  };

  const handleGenerateReport = async (reportId) => {
    try {
      setLoading(true);
      const data = await customReportAPI.generateReportData(reportId);
      setReportData(data);
      setSelectedReport(reports.find(r => r.id === reportId));
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (reportId) => {
    try {
      const exportData = await customReportAPI.exportToCSV(reportId);
      
      // Download file
      const blob = new Blob([exportData.content], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report exported to CSV');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const handleExportJSON = async (reportId) => {
    try {
      const exportData = await customReportAPI.exportToJSON(reportId);
      
      const blob = new Blob([exportData.content], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report exported to JSON');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const toggleField = (fieldKey) => {
    setReportForm(prev => {
      const isSelected = prev.fields.some(f => f.key === fieldKey);
      if (isSelected) {
        return {
          ...prev,
          fields: prev.fields.filter(f => f.key !== fieldKey)
        };
      } else {
        const availableFields = dataSources[prev.dataSource] || [];
        const field = availableFields.find(f => f.key === fieldKey);
        if (field) {
          return {
            ...prev,
            fields: [...prev.fields, field]
          };
        }
      }
      return prev;
    });
  };

  const resetReportForm = () => {
    setReportForm({
      name: '',
      description: '',
      dataSource: 'patients',
      fields: [],
      filters: [],
      groupBy: [],
      sortBy: { field: '', order: 'asc' }
    });
  };

  const availableFields = dataSources[reportForm.dataSource] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Advanced Reporting</h2>
              <p className="text-sm text-gray-600">Create custom reports and schedule exports</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetReportForm();
              setShowReportModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Report
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex space-x-1 border-b border-gray-200">
          {[
            { id: 'builder', label: 'Report Builder', icon: FileText },
            { id: 'schedules', label: 'Scheduled Reports', icon: Calendar }
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

      {/* Report Builder Tab */}
      {activeTab === 'builder' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(report => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{report.name}</h4>
                    <p className="text-sm text-gray-600">{report.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Source: {report.dataSource}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 inline mr-1" />
                    Generate
                  </button>
                  <button
                    onClick={() => handleExportCSV(report.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    title="Export CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleExportJSON(report.id)}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    title="Export JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {reportData && selectedReport && (
            <div className="mt-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{selectedReport.name} - Results</h3>
                <button
                  onClick={() => {
                    setReportData(null);
                    setSelectedReport(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {selectedReport.fields.map(field => (
                        <th key={field.key} className="px-4 py-2 text-left">
                          {field.label || field.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {selectedReport.fields.map(field => (
                          <td key={field.key} className="px-4 py-2">
                            {row[field.key] || 'N/A'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.length > 100 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing first 100 of {reportData.length} rows. Export to see all data.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {activeTab === 'schedules' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Schedule
            </button>
          </div>
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{schedule.reportName || 'Scheduled Report'}</p>
                    <p className="text-sm text-gray-600">
                      Frequency: {schedule.frequency} • 
                      Next Run: {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    schedule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {schedule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Builder Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Custom Report</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  resetReportForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name *</label>
                <input
                  type="text"
                  value={reportForm.name}
                  onChange={(e) => setReportForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Patient Registration Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Report description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Source *</label>
                <select
                  value={reportForm.dataSource}
                  onChange={(e) => {
                    setReportForm(prev => ({ ...prev, dataSource: e.target.value, fields: [] }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(dataSources).map(source => (
                    <option key={source} value={source}>
                      {source.charAt(0).toUpperCase() + source.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Fields *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {availableFields.map(field => {
                    const isSelected = reportForm.fields.some(f => f.key === field.key);
                    return (
                      <label
                        key={field.key}
                        className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleField(field.key)}
                          className="rounded"
                        />
                        <span className="text-sm">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    resetReportForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 inline mr-2" />
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedReporting;


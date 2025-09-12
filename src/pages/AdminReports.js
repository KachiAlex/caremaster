import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  Filter, 
  BarChart3, 
  TrendingUp,
  Users,
  Heart,
  Activity,
  FileText,
  Eye
} from 'lucide-react';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportType, setReportType] = useState('all');

  useEffect(() => {
    // Simulate loading reports data
    const loadReports = async () => {
      try {
        setTimeout(() => {
          const mockReports = [
            {
              id: 1,
              title: 'User Activity Report',
              description: 'Comprehensive overview of user engagement and activity patterns',
              type: 'user_activity',
              generatedAt: '2024-01-20T10:30:00Z',
              period: 'Last 30 days',
              records: 1247,
              status: 'ready'
            },
            {
              id: 2,
              title: 'Emergency Response Report',
              description: 'Analysis of emergency alerts and response times',
              type: 'emergency',
              generatedAt: '2024-01-19T15:45:00Z',
              period: 'Last 7 days',
              records: 23,
              status: 'ready'
            },
            {
              id: 3,
              title: 'Medication Compliance Report',
              description: 'Medication adherence and reminder effectiveness',
              type: 'medication',
              generatedAt: '2024-01-18T09:15:00Z',
              period: 'Last 14 days',
              records: 892,
              status: 'ready'
            },
            {
              id: 4,
              title: 'Caregiver Performance Report',
              description: 'Caregiver activity and patient satisfaction metrics',
              type: 'caregiver',
              generatedAt: '2024-01-17T14:20:00Z',
              period: 'Last 30 days',
              records: 355,
              status: 'generating'
            },
            {
              id: 5,
              title: 'System Health Report',
              description: 'Platform performance and system metrics',
              type: 'system',
              generatedAt: '2024-01-16T11:00:00Z',
              period: 'Last 24 hours',
              records: 156,
              status: 'ready'
            }
          ];
          
          setReports(mockReports);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading reports:', error);
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const getReportIcon = (type) => {
    switch (type) {
      case 'user_activity':
        return <Users className="h-5 w-5 text-blue-600" />;
      case 'emergency':
        return <Activity className="h-5 w-5 text-red-600" />;
      case 'medication':
        return <Heart className="h-5 w-5 text-green-600" />;
      case 'caregiver':
        return <Users className="h-5 w-5 text-purple-600" />;
      case 'system':
        return <BarChart3 className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGenerateReport = () => {
    // Handle report generation
    console.log('Generating report with:', { dateRange, reportType });
  };

  const handleDownloadReport = (reportId) => {
    // Handle report download
    console.log('Downloading report:', reportId);
  };

  const handleViewReport = (reportId) => {
    // Handle report viewing
    console.log('Viewing report:', reportId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view platform reports</p>
        </div>
        <button 
          onClick={handleGenerateReport}
          className="btn btn-primary"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Report Generation Form */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              className="form-input"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="all">All Reports</option>
              <option value="user_activity">User Activity</option>
              <option value="emergency">Emergency Response</option>
              <option value="medication">Medication Compliance</option>
              <option value="caregiver">Caregiver Performance</option>
              <option value="system">System Health</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ready Reports</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter(r => r.status === 'ready').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Generating</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter(r => r.status === 'generating').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.reduce((sum, r) => sum + r.records, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
          <div className="flex items-center space-x-2">
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getReportIcon(report.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">
                        Generated: {new Date(report.generatedAt).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Period: {report.period}
                      </span>
                      <span className="text-sm text-gray-500">
                        Records: {report.records.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                  <div className="flex items-center space-x-1">
                    {report.status === 'ready' && (
                      <>
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View Report"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadReport(report.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Download Report"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {report.status === 'generating' && (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-500">Generating...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate your first report to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Pill, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Download,
  Filter,
  Eye,
  Heart,
  Activity,
  Shield
} from 'lucide-react';

const AdminMedicationAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    complianceTrends: [],
    medicationStats: [],
    patientCompliance: [],
    sideEffectReports: [],
    drugInteractions: [],
    reminderEffectiveness: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('compliance');

  useEffect(() => {
    // Simulate loading analytics data
    const loadAnalyticsData = async () => {
      try {
        setTimeout(() => {
          const mockAnalytics = {
            complianceTrends: [
              { date: '2024-01-01', compliance: 85, patients: 120 },
              { date: '2024-01-02', compliance: 87, patients: 122 },
              { date: '2024-01-03', compliance: 89, patients: 125 },
              { date: '2024-01-04', compliance: 88, patients: 128 },
              { date: '2024-01-05', compliance: 91, patients: 130 },
              { date: '2024-01-06', compliance: 90, patients: 132 },
              { date: '2024-01-07', compliance: 92, patients: 135 },
              { date: '2024-01-08', compliance: 89, patients: 138 },
              { date: '2024-01-09', compliance: 87, patients: 140 },
              { date: '2024-01-10', compliance: 90, patients: 142 },
              { date: '2024-01-11', compliance: 93, patients: 145 },
              { date: '2024-01-12', compliance: 91, patients: 148 },
              { date: '2024-01-13', compliance: 88, patients: 150 },
              { date: '2024-01-14', compliance: 90, patients: 152 },
              { date: '2024-01-15', compliance: 92, patients: 155 },
              { date: '2024-01-16', compliance: 89, patients: 158 },
              { date: '2024-01-17', compliance: 87, patients: 160 },
              { date: '2024-01-18', compliance: 91, patients: 162 },
              { date: '2024-01-19', compliance: 93, patients: 165 },
              { date: '2024-01-20', compliance: 90, patients: 167 }
            ],
            medicationStats: [
              { medication: 'Metformin', totalPatients: 45, avgCompliance: 92, sideEffects: 3, interactions: 2 },
              { medication: 'Lisinopril', totalPatients: 38, avgCompliance: 88, sideEffects: 5, interactions: 1 },
              { medication: 'Insulin', totalPatients: 25, avgCompliance: 95, sideEffects: 2, interactions: 3 },
              { medication: 'Warfarin', totalPatients: 18, avgCompliance: 85, sideEffects: 4, interactions: 4 },
              { medication: 'Calcium', totalPatients: 32, avgCompliance: 78, sideEffects: 6, interactions: 1 },
              { medication: 'Aspirin', totalPatients: 28, avgCompliance: 90, sideEffects: 2, interactions: 2 }
            ],
            patientCompliance: [
              { patient: 'Adunni Okafor', totalMedications: 3, compliance: 92, missedDoses: 5, lastCheck: '2024-01-20' },
              { patient: 'Grace Johnson', totalMedications: 2, compliance: 85, missedDoses: 8, lastCheck: '2024-01-19' },
              { patient: 'Tunde Adebayo', totalMedications: 4, compliance: 95, missedDoses: 2, lastCheck: '2024-01-20' },
              { patient: 'Mary Okonkwo', totalMedications: 2, compliance: 88, missedDoses: 6, lastCheck: '2024-01-18' },
              { patient: 'John Smith', totalMedications: 3, compliance: 78, missedDoses: 12, lastCheck: '2024-01-17' },
              { patient: 'Sarah Williams', totalMedications: 1, compliance: 96, missedDoses: 1, lastCheck: '2024-01-20' }
            ],
            sideEffectReports: [
              { medication: 'Metformin', sideEffect: 'Nausea', frequency: 12, severity: 'Mild', trend: 'decreasing' },
              { medication: 'Lisinopril', sideEffect: 'Dry Cough', frequency: 8, severity: 'Moderate', trend: 'stable' },
              { medication: 'Warfarin', sideEffect: 'Bruising', frequency: 6, severity: 'Mild', trend: 'stable' },
              { medication: 'Calcium', sideEffect: 'Constipation', frequency: 15, severity: 'Mild', trend: 'increasing' },
              { medication: 'Insulin', sideEffect: 'Injection Site Irritation', frequency: 4, severity: 'Mild', trend: 'decreasing' }
            ],
            drugInteractions: [
              { medication1: 'Warfarin', medication2: 'Aspirin', severity: 'High', frequency: 3, action: 'Monitor INR closely' },
              { medication1: 'Metformin', medication2: 'Warfarin', severity: 'Medium', frequency: 2, action: 'Monitor blood sugar' },
              { medication1: 'Calcium', medication2: 'Iron', severity: 'Low', frequency: 5, action: 'Take 2 hours apart' },
              { medication1: 'Lisinopril', medication2: 'Potassium', severity: 'Medium', frequency: 1, action: 'Monitor potassium levels' }
            ],
            reminderEffectiveness: [
              { method: 'Push Notifications', sent: 1250, responded: 1100, effectiveness: 88 },
              { method: 'SMS', sent: 890, responded: 756, effectiveness: 85 },
              { method: 'Email', sent: 650, responded: 520, effectiveness: 80 },
              { method: 'Phone Calls', sent: 120, responded: 108, effectiveness: 90 }
            ]
          };
          
          setAnalytics(mockAnalytics);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading analytics data:', error);
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [dateRange]);

  const getComplianceColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (rate) => {
    if (rate >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rate >= 80) return <Activity className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Medication Analytics</h1>
          <p className="text-gray-600">Comprehensive medication compliance and safety analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            className="form-input"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="1year">Last year</option>
          </select>
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Compliance</p>
              <p className="text-2xl font-bold text-gray-900">90%</p>
              <p className="text-xs text-green-600">+2% from last month</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doses Taken</p>
              <p className="text-2xl font-bold text-gray-900">2,847</p>
              <p className="text-xs text-green-600">+5% from last month</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Missed Doses</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-xs text-red-600">-8% from last month</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-2xl font-bold text-gray-900">167</p>
              <p className="text-xs text-blue-600">+12 from last month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Trends Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Trends</h2>
          <div className="flex items-center space-x-2">
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Compliance trend chart would be displayed here</p>
            <p className="text-sm text-gray-400">Integration with charting library needed</p>
          </div>
        </div>
      </div>

      {/* Medication Performance */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Medication Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Side Effects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interactions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.medicationStats.map((med, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Pill className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{med.medication}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{med.totalPatients}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getComplianceIcon(med.avgCompliance)}
                      <span className={`ml-2 text-sm font-medium ${getComplianceColor(med.avgCompliance)}`}>
                        {med.avgCompliance}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{med.sideEffects}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{med.interactions}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Compliance */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Compliance Overview</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missed Doses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Check
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.patientCompliance.map((patient, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-gray-700">
                          {patient.patient.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{patient.patient}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{patient.totalMedications}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getComplianceIcon(patient.compliance)}
                      <span className={`ml-2 text-sm font-medium ${getComplianceColor(patient.compliance)}`}>
                        {patient.compliance}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{patient.missedDoses}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{patient.lastCheck}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Effects & Drug Interactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Side Effects */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Side Effect Reports</h2>
          <div className="space-y-3">
            {analytics.sideEffectReports.map((report, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Pill className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{report.medication}</span>
                  </div>
                  <div className="flex items-center">
                    {getTrendIcon(report.trend)}
                    <span className="ml-1 text-xs text-gray-500">{report.trend}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{report.sideEffect}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Frequency: {report.frequency}</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    report.severity === 'Mild' ? 'bg-green-100 text-green-800' :
                    report.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {report.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drug Interactions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Drug Interactions</h2>
          <div className="space-y-3">
            {analytics.drugInteractions.map((interaction, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {interaction.medication1} + {interaction.medication2}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(interaction.severity)}`}>
                    {interaction.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{interaction.action}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Frequency: {interaction.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reminder Effectiveness */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reminder Effectiveness</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.reminderEffectiveness.map((reminder, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">{reminder.method}</h3>
                <span className="text-sm font-bold text-gray-900">{reminder.effectiveness}%</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Sent: {reminder.sent}</span>
                  <span>Responded: {reminder.responded}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${reminder.effectiveness}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminMedicationAnalytics;

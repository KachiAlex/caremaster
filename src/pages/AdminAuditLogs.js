import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Shield,
  Activity,
  Heart,
  MessageSquare,
  UserCheck,
  Calendar,
  Settings,
  Database,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  MapPin,
  Phone,
  Mail,
  Star,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

const AdminAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [filters, setFilters] = useState({
    action: 'all',
    user: 'all',
    resource: 'all',
    status: 'all',
    dateRange: 'all',
    severity: 'all'
  });
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    recent: true,
    security: false,
    system: false,
    user: false,
    data: false
  });
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    securityEvents: 0,
    systemEvents: 0,
    userEvents: 0,
    dataEvents: 0,
    criticalEvents: 0,
    warningEvents: 0
  });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchTerm, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockAuditLogs = [
          {
            id: 1,
            timestamp: '2024-01-20T14:30:00Z',
            action: 'LOGIN',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'Authentication',
            resourceId: 'auth_001',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              loginMethod: 'email_password',
              sessionId: 'sess_abc123',
              location: 'Lagos, Nigeria'
            },
            changes: null,
            category: 'security'
          },
          {
            id: 2,
            timestamp: '2024-01-20T14:25:00Z',
            action: 'CREATE',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'Caregiver',
            resourceId: 'caregiver_002',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              caregiverName: 'Sarah Williams',
              email: 'sarah@example.com',
              phone: '+234 803 456 7890'
            },
            changes: {
              before: null,
              after: {
                name: 'Sarah Williams',
                email: 'sarah@example.com',
                phone: '+234 803 456 7890',
                status: 'pending'
              }
            },
            category: 'user'
          },
          {
            id: 3,
            timestamp: '2024-01-20T14:20:00Z',
            action: 'UPDATE',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'Medication',
            resourceId: 'med_001',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              medicationName: 'Metformin',
              patientId: 'patient_001',
              dosage: '500mg'
            },
            changes: {
              before: {
                dosage: '250mg',
                frequency: 'twice daily'
              },
              after: {
                dosage: '500mg',
                frequency: 'once daily'
              }
            },
            category: 'data'
          },
          {
            id: 4,
            timestamp: '2024-01-20T14:15:00Z',
            action: 'DELETE',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'Appointment',
            resourceId: 'appt_003',
            status: 'SUCCESS',
            severity: 'WARNING',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              appointmentDate: '2024-01-25',
              patientName: 'Adunni Okafor',
              doctorName: 'Healthcare Provider',
              reason: 'Patient requested cancellation'
            },
            changes: {
              before: {
                status: 'scheduled',
                date: '2024-01-25T10:00:00Z'
              },
              after: null
            },
            category: 'system'
          },
          {
            id: 5,
            timestamp: '2024-01-20T14:10:00Z',
            action: 'LOGIN_FAILED',
            user: 'unknown@example.com',
            userId: null,
            resource: 'Authentication',
            resourceId: 'auth_002',
            status: 'FAILED',
            severity: 'WARNING',
            ipAddress: '192.168.1.200',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              loginMethod: 'email_password',
              failureReason: 'Invalid password',
              attemptCount: 3
            },
            changes: null,
            category: 'security'
          },
          {
            id: 6,
            timestamp: '2024-01-20T14:05:00Z',
            action: 'PERMISSION_CHANGE',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'User',
            resourceId: 'user_005',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              targetUser: 'caregiver@example.com',
              permissionType: 'admin_access'
            },
            changes: {
              before: {
                role: 'caregiver',
                permissions: ['read_patients', 'update_medications']
              },
              after: {
                role: 'admin',
                permissions: ['read_patients', 'update_medications', 'manage_users', 'view_analytics']
              }
            },
            category: 'security'
          },
          {
            id: 7,
            timestamp: '2024-01-20T14:00:00Z',
            action: 'DATA_EXPORT',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'Patient Data',
            resourceId: 'export_001',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              exportType: 'patient_medications',
              recordCount: 1247,
              format: 'CSV',
              purpose: 'Monthly report'
            },
            changes: null,
            category: 'data'
          },
          {
            id: 8,
            timestamp: '2024-01-20T13:55:00Z',
            action: 'SYSTEM_CONFIG',
            user: 'admin@elderx.com',
            userId: 'admin_001',
            resource: 'System Settings',
            resourceId: 'config_001',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            details: {
              settingName: 'notification_frequency',
              settingValue: 'immediate'
            },
            changes: {
              before: {
                notification_frequency: 'hourly'
              },
              after: {
                notification_frequency: 'immediate'
              }
            },
            category: 'system'
          },
          {
            id: 9,
            timestamp: '2024-01-20T13:50:00Z',
            action: 'EMERGENCY_ALERT',
            user: 'system',
            userId: 'system',
            resource: 'Emergency System',
            resourceId: 'emergency_001',
            status: 'SUCCESS',
            severity: 'CRITICAL',
            ipAddress: 'system',
            userAgent: 'ElderX Emergency System',
            details: {
              patientId: 'patient_003',
              patientName: 'Grace Johnson',
              alertType: 'fall_detected',
              location: 'Lagos, Nigeria',
              responseTime: '2 minutes'
            },
            changes: null,
            category: 'system'
          },
          {
            id: 10,
            timestamp: '2024-01-20T13:45:00Z',
            action: 'BACKUP',
            user: 'system',
            userId: 'system',
            resource: 'Database',
            resourceId: 'backup_001',
            status: 'SUCCESS',
            severity: 'INFO',
            ipAddress: 'system',
            userAgent: 'ElderX Backup System',
            details: {
              backupType: 'full_database',
              size: '2.5GB',
              duration: '15 minutes',
              location: 'cloud_storage'
            },
            changes: null,
            category: 'system'
          }
        ];

        // Calculate stats
        const totalLogs = mockAuditLogs.length;
        const todayLogs = mockAuditLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          const today = new Date();
          return logDate.toDateString() === today.toDateString();
        }).length;
        
        const securityEvents = mockAuditLogs.filter(log => log.category === 'security').length;
        const systemEvents = mockAuditLogs.filter(log => log.category === 'system').length;
        const userEvents = mockAuditLogs.filter(log => log.category === 'user').length;
        const dataEvents = mockAuditLogs.filter(log => log.category === 'data').length;
        const criticalEvents = mockAuditLogs.filter(log => log.severity === 'CRITICAL').length;
        const warningEvents = mockAuditLogs.filter(log => log.severity === 'WARNING').length;

        setStats({
          totalLogs,
          todayLogs,
          securityEvents,
          systemEvents,
          userEvents,
          dataEvents,
          criticalEvents,
          warningEvents
        });

        setAuditLogs(mockAuditLogs);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = auditLogs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (filters.action !== 'all') {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    // User filter
    if (filters.user !== 'all') {
      filtered = filtered.filter(log => log.user === filters.user);
    }

    // Resource filter
    if (filters.resource !== 'all') {
      filtered = filtered.filter(log => log.resource === filters.resource);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    setFilteredLogs(filtered);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'data':
        return <Database className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN':
        return <Unlock className="h-4 w-4" />;
      case 'LOGOUT':
        return <Lock className="h-4 w-4" />;
      case 'CREATE':
        return <Plus className="h-4 w-4" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      case 'LOGIN_FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'PERMISSION_CHANGE':
        return <Shield className="h-4 w-4" />;
      case 'DATA_EXPORT':
        return <Download className="h-4 w-4" />;
      case 'SYSTEM_CONFIG':
        return <Settings className="h-4 w-4" />;
      case 'EMERGENCY_ALERT':
        return <AlertTriangle className="h-4 w-4" />;
      case 'BACKUP':
        return <Database className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString()
    };
  };

  const handleLogAction = (action, log) => {
    setSelectedLog(log);
    switch (action) {
      case 'view':
        setShowLogModal(true);
        break;
      default:
        break;
    }
  };

  const exportLogs = () => {
    // Implement export functionality
    console.log('Exporting logs...');
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
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Comprehensive system activity and security monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={loadAuditLogs}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button 
            onClick={exportLogs}
            className="btn btn-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayLogs}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.criticalEvents}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Shield className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Security Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.securityEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Overview */}
      <div className="card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <h2 className="text-lg font-semibold text-gray-900">Activity Overview</h2>
          {expandedSections.overview ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        {expandedSections.overview && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-lg font-bold text-gray-900">{stats.securityEvents}</span>
                </div>
                <p className="text-sm text-gray-600">Security Events</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Settings className="h-6 w-6 text-green-600 mr-2" />
                  <span className="text-lg font-bold text-gray-900">{stats.systemEvents}</span>
                </div>
                <p className="text-sm text-gray-600">System Events</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <User className="h-6 w-6 text-purple-600 mr-2" />
                  <span className="text-lg font-bold text-gray-900">{stats.userEvents}</span>
                </div>
                <p className="text-sm text-gray-600">User Events</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Database className="h-6 w-6 text-orange-600 mr-2" />
                  <span className="text-lg font-bold text-gray-900">{stats.dataEvents}</span>
                </div>
                <p className="text-sm text-gray-600">Data Events</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="form-input"
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN_FAILED">Login Failed</option>
              <option value="PERMISSION_CHANGE">Permission Change</option>
              <option value="DATA_EXPORT">Data Export</option>
              <option value="SYSTEM_CONFIG">System Config</option>
              <option value="EMERGENCY_ALERT">Emergency Alert</option>
              <option value="BACKUP">Backup</option>
            </select>
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
            <select
              className="form-input"
              value={filters.severity}
              onChange={(e) => setFilters({...filters, severity: e.target.value})}
            >
              <option value="all">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
              <option value="DEBUG">Debug</option>
            </select>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDateTime(log.timestamp).date}</div>
                    <div className="text-sm text-gray-500">{formatDateTime(log.timestamp).time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getActionIcon(log.action)}
                      <span className="ml-2 text-sm font-medium text-gray-900">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.user}</div>
                    <div className="text-sm text-gray-500">{log.ipAddress}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getCategoryIcon(log.category)}
                      <span className="ml-2 text-sm text-gray-900">{log.resource}</span>
                    </div>
                    <div className="text-sm text-gray-500">{log.resourceId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleLogAction('view', log)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some(f => f !== 'all')
                ? 'Try adjusting your search or filter criteria.'
                : 'No audit logs have been recorded yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getActionIcon(selectedLog.action)}
                  <h3 className="text-lg font-medium text-gray-900">{selectedLog.action}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                </div>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Event Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Timestamp:</span>
                        <span className="text-sm text-gray-900">{formatDateTime(selectedLog.timestamp).full}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">User:</span>
                        <span className="text-sm text-gray-900">{selectedLog.user}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">IP Address:</span>
                        <span className="text-sm text-gray-900">{selectedLog.ipAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                          {selectedLog.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Resource:</span>
                        <span className="text-sm text-gray-900">{selectedLog.resource} ({selectedLog.resourceId})</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Technical Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">User Agent</label>
                        <p className="text-sm text-gray-900 break-all">{selectedLog.userAgent}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <div className="flex items-center">
                          {getCategoryIcon(selectedLog.category)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">{selectedLog.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Details and Changes */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Event Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {selectedLog.changes && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">Changes</h4>
                      <div className="space-y-3">
                        {selectedLog.changes.before && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Before:</label>
                            <div className="bg-red-50 rounded-lg p-3">
                              <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                {JSON.stringify(selectedLog.changes.before, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                        {selectedLog.changes.after && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">After:</label>
                            <div className="bg-green-50 rounded-lg p-3">
                              <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                {JSON.stringify(selectedLog.changes.after, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <Download className="h-4 w-4 mr-2" />
                  Export Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  FileText
} from 'lucide-react';
import FontSizeToggle from '../components/FontSizeToggle';
import { collection, query, getDocs, orderBy, limit, startAfter } from 'backend/database';
import { db } from '../backend/config';

const SuperAdminAuditLogs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    type: '',
    startDate: '',
    endDate: '',
    severity: ''
  });

  // Action types for filter dropdown
  const actionTypes = [
    'super_admin_created',
    'super_admin_deleted',
    'super_admin_password_reset',
    'system_settings_updated',
    'institution_created',
    'institution_updated',
    'institution_deleted',
    'license_created',
    'license_updated',
    'license_suspended',
    'license_activated',
    'admin_assigned',
    'admin_removed'
  ];

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, auditLogs]);

  const loadAuditLogs = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setAuditLogs([]);
        setLastDoc(null);
      }

      let auditQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      if (loadMore && lastDoc) {
        auditQuery = query(auditQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(auditQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
        if (!loadMore) {
          setMessage('No audit logs found');
        }
      } else {
        const newLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));

        if (loadMore) {
          setAuditLogs(prev => [...prev, ...newLogs]);
        } else {
          setAuditLogs(newLogs);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setMessage('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.type?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower) ||
        log.email?.toLowerCase().includes(searchLower) ||
        log.userId?.toLowerCase().includes(searchLower) ||
        log.performedByEmail?.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
      );
    }

    // Action filter
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(log => log.type === filters.type);
    }

    // User ID filter
    if (filters.userId) {
      filtered = filtered.filter(log => 
        log.userId === filters.userId || 
        log.performedBy === filters.userId
      );
    }

    // Date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(log => log.timestamp >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => log.timestamp <= endDate);
    }

    setFilteredLogs(filtered);
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Action', 'User Email', 'Performed By', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp?.toISOString() || '',
        log.type || '',
        log.action || '',
        log.email || '',
        log.performedByEmail || '',
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage('Audit logs exported successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const getActionIcon = (type) => {
    if (type?.includes('created') || type?.includes('activated')) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (type?.includes('deleted') || type?.includes('suspended')) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (type?.includes('updated') || type?.includes('reset')) {
      return <Info className="h-4 w-4 text-blue-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      userId: '',
      type: '',
      startDate: '',
      endDate: '',
      severity: ''
    });
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/super-admin/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-sm text-gray-600">View and filter system activity logs</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FontSizeToggle />
              <button
                onClick={handleExport}
                disabled={filteredLogs.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => loadAuditLogs()}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') || message.includes('exported')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by type, action, email, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filters.action || filters.userId || filters.type || filters.startDate || filters.endDate) && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {actionTypes.map(action => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <input
                  type="text"
                  placeholder="Filter by type..."
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="text"
                  placeholder="Filter by user ID..."
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredLogs.length} of {auditLogs.length} audit logs
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {auditLogs.length === 0 ? 'No audit logs found' : 'No logs match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {log.timestamp?.toLocaleString() || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getActionIcon(log.type)}
                          <span className="ml-2 text-sm text-gray-900">
                            {log.type?.replace(/_/g, ' ') || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {log.action?.replace(/_/g, ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.email || log.userId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {log.performedByEmail || log.performedBy || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {log.details ? JSON.stringify(log.details).substring(0, 100) : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={() => loadAuditLogs(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminAuditLogs;


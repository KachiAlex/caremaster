import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import { 
  UserX, 
  Search, 
  RefreshCw, 
  Eye, 
  Calendar,
  Mail,
  Phone,
  Download,
  Activity,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';

const InactiveCaregiversReport = ({ institutionId }) => {
  const [inactiveCaregivers, setInactiveCaregivers] = useState([]);
  const [filteredCaregivers, setFilteredCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inactiveDaysFilter, setInactiveDaysFilter] = useState('all');
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    loadInactiveCaregivers();
  }, [institutionId]);

  useEffect(() => {
    filterCaregivers();
  }, [inactiveCaregivers, searchTerm, inactiveDaysFilter]);

  const loadInactiveCaregivers = async () => {
    try {
      setLoading(true);
      
      // Query for caregivers in institution
      const caregiversQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', institutionId),
        where('userType', 'in', ['caregiver', 'doctor', 'nurse'])
      );
      
      const querySnapshot = await getDocs(caregiversQuery);
      const allCaregivers = [];
      
      querySnapshot.forEach((doc) => {
        const caregiverData = doc.data();
        allCaregivers.push({
          id: doc.id,
          ...caregiverData
        });
      });

      // Get activity logs for each caregiver
      const caregiversWithActivity = await Promise.all(
        allCaregivers.map(async (caregiver) => {
          const logs = await getCaregiverActivityLogs(caregiver.id);
          const lastActivity = logs.length > 0 ? logs[0].timestamp : caregiver.createdAt || null;
          const daysSinceLastActivity = lastActivity 
            ? Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24))
            : 999;

          return {
            ...caregiver,
            lastActivity,
            daysSinceLastActivity,
            activityLogCount: logs.length,
            isInactive: daysSinceLastActivity > 7 || logs.length === 0
          };
        })
      );

      // Filter only inactive caregivers (no activity in last 7 days OR no activity at all)
      const inactive = caregiversWithActivity.filter(c => c.isInactive);
      
      // Sort by days since last activity (most inactive first)
      inactive.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
      
      setInactiveCaregivers(inactive);
    } catch (error) {
      console.error('Error loading inactive caregivers:', error);
      toast.error('Failed to load inactive caregivers');
    } finally {
      setLoading(false);
    }
  };

  const getCaregiverActivityLogs = async (caregiverId) => {
    try {
      // Query for assignments completed by caregiver
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('caregiverId', '==', caregiverId),
        orderBy('createdAt', 'desc')
      );

      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const logs = [];

      assignmentsSnapshot.forEach((doc) => {
        const assignment = doc.data();
        logs.push({
          type: 'assignment',
          timestamp: assignment.updatedAt || assignment.createdAt,
          description: `Assignment: ${assignment.title || 'Untitled'}`,
          status: assignment.status
        });
      });

      // Query for care logs created by caregiver
      const careLogsQuery = query(
        collection(db, 'careLogs'),
        where('caregiverId', '==', caregiverId),
        orderBy('timestamp', 'desc')
      );

      const careLogsSnapshot = await getDocs(careLogsQuery);
      
      careLogsSnapshot.forEach((doc) => {
        const log = doc.data();
        logs.push({
          type: 'careLog',
          timestamp: log.timestamp,
          description: log.notes || 'Care log entry',
          clientId: log.clientId
        });
      });

      // Sort all logs by timestamp
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return logs;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  };

  const filterCaregivers = () => {
    let filtered = inactiveCaregivers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(caregiver =>
        caregiver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caregiver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caregiver.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Inactive days filter
    if (inactiveDaysFilter !== 'all') {
      const days = parseInt(inactiveDaysFilter);
      filtered = filtered.filter(c => c.daysSinceLastActivity >= days);
    }

    setFilteredCaregivers(filtered);
  };

  const handleViewDetails = async (caregiver) => {
    setSelectedCaregiver(caregiver);
    setShowDetailsModal(true);
    
    // Load detailed activity logs
    const logs = await getCaregiverActivityLogs(caregiver.id);
    setActivityLogs(logs);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Last Activity', 'Days Inactive', 'Activity Count'];
    const rows = filteredCaregivers.map(c => [
      c.name || c.fullName || 'Unknown',
      c.email || '',
      c.phone || '',
      c.userType || c.type || 'caregiver',
      formatDate(c.lastActivity) || 'Never',
      c.daysSinceLastActivity,
      c.activityLogCount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inactive-caregivers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getInactivityBadge = (days) => {
    if (days >= 90) return { text: '90+ days', color: 'bg-red-100 text-red-800' };
    if (days >= 30) return { text: '30+ days', color: 'bg-orange-100 text-orange-800' };
    if (days >= 14) return { text: '14+ days', color: 'bg-yellow-100 text-yellow-800' };
    return { text: `${days} days`, color: 'bg-gray-100 text-gray-800' };
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <UserX className="h-6 w-6 mr-2 text-red-600" />
              Inactive Caregivers Report
            </h2>
            <p className="text-gray-600 mt-1">
              Caregivers with no activity in the last 7+ days
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadInactiveCaregivers}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredCaregivers.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <div className="text-sm text-gray-500">
              {filteredCaregivers.length} inactive caregiver(s)
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={inactiveDaysFilter}
            onChange={(e) => setInactiveDaysFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Inactive Caregivers</option>
            <option value="7">7+ days inactive</option>
            <option value="14">14+ days inactive</option>
            <option value="30">30+ days inactive</option>
            <option value="90">90+ days inactive</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Inactive</div>
          <div className="text-2xl font-bold text-red-600">{inactiveCaregivers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">7-14 Days</div>
          <div className="text-2xl font-bold text-yellow-600">
            {inactiveCaregivers.filter(c => c.daysSinceLastActivity >= 7 && c.daysSinceLastActivity < 14).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">14-30 Days</div>
          <div className="text-2xl font-bold text-orange-600">
            {inactiveCaregivers.filter(c => c.daysSinceLastActivity >= 14 && c.daysSinceLastActivity < 30).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">30+ Days</div>
          <div className="text-2xl font-bold text-red-600">
            {inactiveCaregivers.filter(c => c.daysSinceLastActivity >= 30).length}
          </div>
        </div>
      </div>

      {/* Inactive Caregivers List */}
      {filteredCaregivers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <UserX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No matching inactive caregivers' : 'No inactive caregivers'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'All caregivers are active!'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inactive Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCaregivers.map((caregiver) => {
                const badge = getInactivityBadge(caregiver.daysSinceLastActivity);
                return (
                  <tr key={caregiver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-red-800">
                              {(caregiver.name || caregiver.fullName || 'C')?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {caregiver.name || caregiver.fullName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {caregiver.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {caregiver.userType || caregiver.type || 'caregiver'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {caregiver.lastActivity ? (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(caregiver.lastActivity)}
                        </div>
                      ) : (
                        <span className="text-gray-400 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Never active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-gray-400" />
                        {caregiver.activityLogCount} logs
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(caregiver)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Activity
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Details Modal */}
      {showDetailsModal && selectedCaregiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Activity Log - {selectedCaregiver.name || selectedCaregiver.fullName}
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCaregiver(null);
                    setActivityLogs([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Activity className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Caregiver Info */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <UserX className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      Inactive for {selectedCaregiver.daysSinceLastActivity} days
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCaregiver.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCaregiver.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Last Activity</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(selectedCaregiver.lastActivity) || 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activity Logs */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Activity History ({activityLogs.length} entries)
                  </h4>
                  
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No activity logs found</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {activityLogs.map((log, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.type === 'assignment' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {log.type === 'assignment' ? 'Assignment' : 'Care Log'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{log.description}</p>
                          {log.status && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                log.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : log.status === 'in-progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCaregiver(null);
                    setActivityLogs([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InactiveCaregiversReport;

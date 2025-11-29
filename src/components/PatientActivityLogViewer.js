import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  User, 
  Filter, 
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  X
} from 'lucide-react';
import { getPatientActivities } from '../utils/patientActivityLogger';
import { toast } from 'react-toastify';

/**
 * Client Activity Log Viewer
 * 
 * Displays comprehensive activity log for a Client
 * Shows all activities with:
 * - Time and date
 * - Staff member details
 * - Activity description
 * - Activity details
 * 
 * @param {string} clientId - Client registration number (e.g., UC-2025-0001)
 * @param {string} patientDocId - Client Firestore document ID
 * @param {string} clientName - Client name (optional, for display)
 */
const PatientActivityLogViewer = ({ clientId, patientDocId, clientName = 'Client' }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActivityType, setFilterActivityType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const categories = [
    { value: 'all', label: 'All Categories', color: 'slate' },
    { value: 'registration', label: 'Registration', color: 'blue' },
    { value: 'profile', label: 'Profile', color: 'indigo' },
    { value: 'medical', label: 'Medical', color: 'red' },
    { value: 'care', label: 'Care', color: 'emerald' },
    { value: 'documents', label: 'Documents', color: 'amber' },
    { value: 'billing', label: 'Billing', color: 'purple' },
    { value: 'assignment', label: 'Assignments', color: 'sky' },
    { value: 'notes', label: 'Notes', color: 'gray' },
    { value: 'general', label: 'General', color: 'slate' }
  ];

  const severityColors = {
    info: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  const getRoleColor = (role) => {
    const roleColors = {
      admin: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      doctor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      nurse: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      caregiver: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      pharmacist: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      default: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
    };
    return roleColors[role?.toLowerCase()] || roleColors.default;
  };

  useEffect(() => {
    loadActivities();
  }, [clientId, filterCategory, filterActivityType]);

  const loadActivities = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const options = {
        limitCount: 200,
        category: filterCategory !== 'all' ? filterCategory : null,
        activityType: filterActivityType !== 'all' ? filterActivityType : null
      };
      
      const loadedActivities = await getPatientActivities(clientId, options);
      setActivities(loadedActivities);
    } catch (error) {
      console.error('Error loading Client activities:', error);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        activity.activityDescription?.toLowerCase().includes(searchLower) ||
        activity.staffMember?.name?.toLowerCase().includes(searchLower) ||
        activity.staffMember?.role?.toLowerCase().includes(searchLower) ||
        activity.activityType?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const exportToCSV = () => {
    const csvHeaders = ['Date', 'Time', 'Activity Type', 'Description', 'Staff Member', 'Role', 'Category', 'Details'];
    const csvRows = filteredActivities.map(activity => {
      const { date, time } = formatDateTime(activity.timestamp);
      return [
        date,
        time,
        activity.activityType || '',
        activity.activityDescription || '',
        activity.staffMember?.name || '',
        activity.staffMember?.role || '',
        activity.category || '',
        JSON.stringify(activity.activityDetails || {})
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Client-${clientId}-activities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Activity log exported successfully');
  };

  if (!clientId) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-300">No Client selected</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800/60 px-6 py-4 bg-gradient-to-r from-emerald-600/10 to-sky-600/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
              <Activity className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-50">Client Activity Log</h3>
              <p className="text-xs text-slate-400">
                {clientName} • Registration: <span className="font-mono text-emerald-300">{clientId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadActivities}
              className="px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={exportToCSV}
              className="px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-slate-800/60 px-6 py-4 bg-slate-900/40">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-50 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-emerald-500/50"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300">No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredActivities.map((activity) => {
              const { date, time } = formatDateTime(activity.timestamp);
              const category = categories.find(c => c.value === activity.category);
              
              return (
                <div
                  key={activity.id}
                  className="px-6 py-4 hover:bg-slate-900/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${
                      severityColors[activity.severity] || severityColors.info
                    }`}>
                      {activity.severity === 'critical' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : activity.severity === 'warning' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Info className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-50 mb-1">
                            {activity.activityDescription || activity.activityType}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {time}
                            </span>
                            {category && (
                              <span className={`px-2 py-0.5 rounded-lg border ${
                                category.color === 'emerald' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' :
                                category.color === 'red' ? 'text-red-300 bg-red-500/10 border-red-500/30' :
                                category.color === 'blue' ? 'text-blue-300 bg-blue-500/10 border-blue-500/30' :
                                'text-slate-300 bg-slate-500/10 border-slate-500/30'
                              }`}>
                                {category.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-xs text-slate-300">{activity.staffMember?.name || 'Unknown'}</span>
                          <span className={`px-2 py-0.5 rounded text-xs border ${getRoleColor(activity.staffMember?.role)}`}>
                            {activity.staffMember?.role || 'staff'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-sm shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-50">Activity Details</h3>
              <button
                onClick={() => setSelectedActivity(null)}
                className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-400 hover:border-emerald-400/60 hover:text-emerald-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase">Activity</label>
                <p className="text-slate-50 mt-1">{selectedActivity.activityDescription || selectedActivity.activityType}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase">Date & Time</label>
                  <p className="text-slate-50 mt-1">
                    {formatDateTime(selectedActivity.timestamp).date} at {formatDateTime(selectedActivity.timestamp).time}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase">Category</label>
                  <p className="text-slate-50 mt-1 capitalize">{selectedActivity.category || 'General'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase">Staff Member</label>
                  <p className="text-slate-50 mt-1">{selectedActivity.staffMember?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase">Role</label>
                  <p className="text-slate-50 mt-1 capitalize">{selectedActivity.staffMember?.role || 'Staff'}</p>
                </div>
              </div>
              {selectedActivity.activityDetails && Object.keys(selectedActivity.activityDetails).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase">Details</label>
                  <pre className="mt-2 p-4 rounded-xl border border-slate-700/60 bg-slate-900/60 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedActivity.activityDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientActivityLogViewer;


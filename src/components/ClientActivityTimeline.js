import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Heart,
  Pill,
  Stethoscope,
  Briefcase,
  Calendar,
  MessageSquare,
  Archive,
  UserPlus,
  Edit,
  Trash2,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserNameWithAvatar from './UserNameWithAvatar';
import { collection, query, getDocs, where, orderBy } from 'backend/database';
import { db } from '../backend/config';

/**
 * ClientActivityTimeline Component
 * 
 * A comprehensive activity timeline that shows ALL actions performed on a client
 * Visible to: Admin, Doctor, Nurse
 * 
 * Sources tracked:
 * - ADL Logs (Activities of Daily Living)
 * - Care Logs (Manual nursing/caregiver entries)
 * - Client Activities (System-tracked activities)
 * - Assignments (Task assignments)
 * - Medical Reports (Doctor/Nurse reports)
 * - Prescriptions (Medication changes)
 * - Profile Updates (Client information changes)
 */

const ClientActivityTimeline = ({ clientId, clientName, userRole }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, adl, care, system, medical, assignment
  const [filterRole, setFilterRole] = useState('all'); // all, caregiver, doctor, nurse, pharmacist, admin
  const [expandedActivities, setExpandedActivities] = useState(new Set());
  const [limit, setLimit] = useState(50);

  // Activity type configurations
  const activityTypes = {
    adl: { label: 'ADL Activity', color: 'purple', icon: Activity },
    care: { label: 'Care Log', color: 'green', icon: Heart },
    system: { label: 'System Activity', color: 'blue', icon: FileText },
    medical: { label: 'Medical Report', color: 'red', icon: Stethoscope },
    prescription: { label: 'Prescription', color: 'orange', icon: Pill },
    assignment: { label: 'Task Assignment', color: 'cyan', icon: Briefcase },
    update: { label: 'Profile Update', color: 'gray', icon: Edit },
    note: { label: 'Note/Comment', color: 'yellow', icon: MessageSquare }
  };

  useEffect(() => {
    if (clientId) {
      loadAllActivities();
    }
  }, [clientId, limit]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchTerm, filterType, filterRole]);

  const loadAllActivities = async () => {
    try {
      setLoading(true);
      const allActivities = [];

      // 1. Load ADL Logs
      try {
        const adlLogsQuery = query(
          collection(db, 'adlLogs'),
          where('clientId', '==', clientId),
          orderBy('timestamp', 'desc'),
          databaseLimit(limit)
        );
        const adlSnapshot = await getDocs(adlLogsQuery);
        adlSnapshot.forEach(doc => {
          const data = doc.data();
          allActivities.push({
            id: `adl-${doc.id}`,
            sourceId: doc.id,
            source: 'adl',
            type: 'adl',
            activityName: data.activityName,
            activityCategory: data.activityCategory || data.category,
            status: data.status,
            notes: data.notes,
            performedBy: data.caregiverId,
            performerName: data.caregiverName,
            performerRole: 'caregiver',
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
            details: {
              activityId: data.activityId,
              clientName: data.clientName
            }
          });
        });
      } catch (error) {
        console.error('Error loading ADL logs:', error);
      }

      // 2. Load Care Logs
      try {
        const careLogsQuery = query(
          collection(db, 'careLogs'),
          where('clientId', '==', clientId),
          orderBy('createdAt', 'desc'),
          databaseLimit(limit)
        );
        const careSnapshot = await getDocs(careLogsQuery);
        careSnapshot.forEach(doc => {
          const data = doc.data();
          allActivities.push({
            id: `care-${doc.id}`,
            sourceId: doc.id,
            source: 'care',
            type: 'care',
            activityName: data.activityType || 'Care Activity',
            status: data.status || 'completed',
            notes: data.description || data.notes,
            performedBy: data.caregiverId,
            performerName: data.caregiverName,
            performerRole: data.performerRole || 'caregiver',
            timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
            details: {
              duration: data.duration
            }
          });
        });
      } catch (error) {
        console.error('Error loading care logs:', error);
      }

      // 3. Load Client Activities (System-tracked activities)
      try {
        const activitiesQuery = query(
          collection(db, 'clientActivities'),
          where('clientId', '==', clientId),
          orderBy('createdAt', 'desc'),
          databaseLimit(limit)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        activitiesSnapshot.forEach(doc => {
          const data = doc.data();
          allActivities.push({
            id: `activity-${doc.id}`,
            sourceId: doc.id,
            source: 'clientActivities',
            type: data.activityType === 'medical_report' ? 'medical' : 'system',
            activityName: data.activityType || 'System Activity',
            status: data.status,
            notes: data.description || data.notes,
            performedBy: data.performedBy,
            performerName: data.performerName,
            performerRole: data.performerRole || 'system',
            timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
            details: data.details || {}
          });
        });
      } catch (error) {
        console.error('Error loading client activities:', error);
      }

      // 4. Load Medical Reports
      try {
        const reportsQuery = query(
          collection(db, 'medicalReports'),
          where('clientId', '==', clientId),
          orderBy('createdAt', 'desc'),
          databaseLimit(limit)
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        reportsSnapshot.forEach(doc => {
          const data = doc.data();
          allActivities.push({
            id: `report-${doc.id}`,
            sourceId: doc.id,
            source: 'medicalReports',
            type: 'medical',
            activityName: `Medical Report - ${data.reportType || 'General'}`,
            status: 'completed',
            notes: data.diagnosis || data.observation || data.notes,
            performedBy: data.doctorId || data.nurseId,
            performerName: data.doctorName || data.nurseName,
            performerRole: data.reportType === 'doctor' ? 'doctor' : 'nurse',
            timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
            details: {
              reportType: data.reportType,
              prescription: data.prescription,
              instructions: data.instructions
            }
          });
        });
      } catch (error) {
        console.error('Error loading medical reports:', error);
      }

      // 5. Load Assignments
      try {
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('clientId', '==', clientId),
          orderBy('createdAt', 'desc'),
          databaseLimit(limit)
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        assignmentsSnapshot.forEach(doc => {
          const data = doc.data();
          allActivities.push({
            id: `assignment-${doc.id}`,
            sourceId: doc.id,
            source: 'assignments',
            type: 'assignment',
            activityName: data.title || 'Task Assignment',
            status: data.status || 'assigned',
            notes: data.description || data.instructions,
            performedBy: data.assignedBy,
            performerName: data.assignedByName,
            performerRole: 'admin',
            timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
            details: {
              assignedTo: data.caregiverName,
              priority: data.priority,
              dueDate: data.dueDate,
              scheduleDate: data.scheduleDate,
              comments: data.comments
            }
          });
        });
      } catch (error) {
        console.error('Error loading assignments:', error);
      }

      // Sort all activities by timestamp (most recent first)
      allActivities.sort((a, b) => b.timestamp - a.timestamp);

      setActivities(allActivities);
      console.log(`✅ Loaded ${allActivities.length} activities for client ${clientName}`);
    } catch (error) {
      console.error('Error loading client activities:', error);
      toast.error('Failed to load activity timeline');
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = activities;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(activity => activity.performerRole === filterRole);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.activityName.toLowerCase().includes(searchLower) ||
        activity.performerName?.toLowerCase().includes(searchLower) ||
        activity.notes?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredActivities(filtered);
  };

  const toggleActivityExpanded = (activityId) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const getActivityIcon = (type) => {
    const config = activityTypes[type] || activityTypes.system;
    const Icon = config.icon;
    return <Icon className="h-5 w-5" />;
  };

  const getActivityColor = (type) => {
    const colors = {
      adl: 'purple',
      care: 'green',
      system: 'blue',
      medical: 'red',
      prescription: 'orange',
      assignment: 'cyan',
      update: 'gray',
      note: 'yellow'
    };
    return colors[type] || 'blue';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-yellow-600" />;
      case 'issue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'issue':
        return 'bg-red-100 text-red-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    try {
      const headers = ['Date/Time', 'Activity', 'Type', 'Status', 'Performed By', 'Role', 'Notes'];
      const rows = filteredActivities.map(activity => [
        formatTimestamp(activity.timestamp),
        activity.activityName,
        activityTypes[activity.type]?.label || activity.type,
        activity.status || '-',
        activity.performerName || 'Unknown',
        activity.performerRole || '-',
        activity.notes || '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName}_activity_timeline_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Activity timeline exported successfully!');
    } catch (error) {
      console.error('Error exporting timeline:', error);
      toast.error('Failed to export timeline');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading activity timeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Activity Timeline</h3>
          <p className="text-sm text-gray-500 mt-1">
            Complete history of all actions and activities for {clientName}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'} • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter by Type */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Types</option>
              <option value="adl">ADL Activities</option>
              <option value="care">Care Logs</option>
              <option value="medical">Medical Reports</option>
              <option value="assignment">Assignments</option>
              <option value="system">System Activities</option>
            </select>
          </div>

          {/* Filter by Role */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="caregiver">Caregiver</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No activities found</p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm || filterType !== 'all' || filterRole !== 'all'
              ? 'Try adjusting your filters'
              : 'Activities will appear here as they are logged'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Activities */}
          <div className="space-y-6">
            {filteredActivities.map((activity) => {
              const color = getActivityColor(activity.type);
              const isExpanded = expandedActivities.has(activity.id);

              return (
                <div key={activity.id} className="relative pl-16">
                  {/* Timeline Dot */}
                  <div className={`absolute left-6 top-6 w-4 h-4 rounded-full border-4 border-white bg-${color}-500`} style={{
                    backgroundColor: `var(--${color}-500, #3B82F6)`
                  }}></div>

                  {/* Activity Card */}
                  <div className={`bg-white rounded-lg shadow-sm border-l-4 border-${color}-500 hover:shadow-md transition-shadow`}>
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{activity.activityName}</h4>
                              {activity.status && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                                  {getStatusIcon(activity.status)}
                                  <span className="ml-1">{activity.status.toUpperCase()}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatTimestamp(activity.timestamp)}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="flex items-center">
                                <UserNameWithAvatar
                                  userId={activity.performedBy}
                                  userName={activity.performerName || 'Unknown'}
                                  userType={activity.performerRole || 'user'}
                                  profilePictureUrl={activity.performerProfilePicture}
                                  size="small"
                                  showName={true}
                                  nameClassName="font-medium"
                                />
                                <span className="ml-2 text-gray-400">({activity.performerRole})</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        {(activity.notes || Object.keys(activity.details).length > 0) && (
                          <button
                            onClick={() => toggleActivityExpanded(activity.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                          </button>
                        )}
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          {/* Notes */}
                          {activity.notes && (
                            <div className="bg-gray-50 rounded-md p-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                              <p className="text-sm text-gray-700">{activity.notes}</p>
                            </div>
                          )}

                          {/* Additional Details */}
                          {Object.keys(activity.details).length > 0 && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {activity.activityCategory && (
                                <div>
                                  <span className="font-medium text-gray-500">Category:</span>
                                  <span className="ml-2 text-gray-700">{activity.activityCategory}</span>
                                </div>
                              )}
                              {activity.details.duration && (
                                <div>
                                  <span className="font-medium text-gray-500">Duration:</span>
                                  <span className="ml-2 text-gray-700">{activity.details.duration}</span>
                                </div>
                              )}
                              {activity.details.priority && (
                                <div>
                                  <span className="font-medium text-gray-500">Priority:</span>
                                  <span className={`ml-2 font-medium ${
                                    activity.details.priority === 'urgent' ? 'text-red-600' :
                                    activity.details.priority === 'high' ? 'text-orange-600' :
                                    'text-gray-700'
                                  }`}>{activity.details.priority.toUpperCase()}</span>
                                </div>
                              )}
                              {activity.details.assignedTo && (
                                <div>
                                  <span className="font-medium text-gray-500">Assigned To:</span>
                                  <span className="ml-2 text-gray-700">{activity.details.assignedTo}</span>
                                </div>
                              )}
                              {activity.details.scheduleDate && (
                                <div>
                                  <span className="font-medium text-gray-500">Scheduled:</span>
                                  <span className="ml-2 text-gray-700">{new Date(activity.details.scheduleDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {activity.details.comments && (
                                <div className="col-span-2">
                                  <span className="font-medium text-gray-500">Comments:</span>
                                  <span className="ml-2 text-gray-700">{activity.details.comments}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Source Info */}
                          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                            Source: {activity.source} • ID: {activity.sourceId}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {activities.length >= limit && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setLimit(prev => prev + 50)}
                className="px-6 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Load More Activities
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientActivityTimeline;


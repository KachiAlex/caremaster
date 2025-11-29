import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  FileText, 
  Pill, 
  MessageSquare,
  Camera,
  CheckCircle,
  AlertCircle,
  Heart,
  FlaskConical,
  Brain,
  Home,
  Eye
} from 'lucide-react';
import { getClientActivities, subscribeToClientActivities } from '../api/diagnosticsAPI';

const ClientActivityLog = ({ clientId, clientName, userProfile }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!clientId) return;

    const loadActivities = async () => {
      try {
        setLoading(true);
        const activitiesData = await getClientActivities(clientId);
        setActivities(activitiesData);
      } catch (error) {
        console.error('Error loading client activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToClientActivities(
      clientId,
      (activitiesData) => {
        setActivities(activitiesData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  // Get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'care_log_created':
      case 'care_log_updated':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'prescription_created':
      case 'prescription_updated':
        return <Pill className="w-4 h-4 text-green-500" />;
      case 'diagnostic_test_ordered':
      case 'diagnostic_results_uploaded':
      case 'doctor_notes_added':
        return <FlaskConical className="w-4 h-4 text-purple-500" />;
      case 'consultation_created':
      case 'consultation_updated':
        return <Stethoscope className="w-4 h-4 text-red-500" />;
      case 'task_created':
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-orange-500" />;
      case 'message_sent':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'vital_signs_recorded':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'photo_uploaded':
        return <Camera className="w-4 h-4 text-gray-500" />;
      case 'visit_completed':
        return <Home className="w-4 h-4 text-teal-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get activity color
  const getActivityColor = (type) => {
    switch (type) {
      case 'care_log_created':
      case 'care_log_updated':
        return 'bg-blue-100 text-blue-800';
      case 'prescription_created':
      case 'prescription_updated':
        return 'bg-green-100 text-green-800';
      case 'diagnostic_test_ordered':
      case 'diagnostic_results_uploaded':
      case 'doctor_notes_added':
        return 'bg-purple-100 text-purple-800';
      case 'consultation_created':
      case 'consultation_updated':
        return 'bg-red-100 text-red-800';
      case 'task_created':
      case 'task_completed':
        return 'bg-orange-100 text-orange-800';
      case 'message_sent':
        return 'bg-indigo-100 text-indigo-800';
      case 'vital_signs_recorded':
        return 'bg-pink-100 text-pink-800';
      case 'photo_uploaded':
        return 'bg-gray-100 text-gray-800';
      case 'visit_completed':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format activity type for display
  const formatActivityType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filterType === 'all') return true;
    return activity.type === filterType;
  });

  // Get unique activity types for filter
  const activityTypes = [...new Set(activities.map(a => a.type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading activity log...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Activity Log
          </h2>
          <span className="text-sm text-gray-500">for {clientName}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Total: {activities.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Activities</option>
            {activityTypes.map(type => (
              <option key={type} value={type}>
                {formatActivityType(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No activities found</p>
            {filterType !== 'all' && (
              <p className="text-sm mt-2">Try changing the filter to see more activities</p>
            )}
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                        {formatActivityType(activity.type)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{activity.date}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-900 mt-2">{activity.description}</p>
                  
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <User className="w-3 h-3 mr-1" />
                    <span>By: {activity.performedByName}</span>
                  </div>

                  {/* Metadata */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          View Details
                        </summary>
                        <div className="mt-2 space-y-1">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="text-gray-900 font-medium">
                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {activities.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Activity Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activityTypes.slice(0, 8).map(type => {
              const count = activities.filter(a => a.type === type).length;
              return (
                <div key={type} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600">{formatActivityType(type)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientActivityLog;

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Search, 
  Filter,
  Plus,
  Edit,
  Calendar,
  User,
  Heart,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import adlAPI from '../api/adlAPI';
import { useUser } from '../contexts/UserContext';
import UserNameWithAvatar from './UserNameWithAvatar';

const AdlLogger = ({ clientId, clientName, onActivityLogged }) => {
  const { userProfile } = useUser();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loggingActivity, setLoggingActivity] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [notes, setNotes] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 activities per page

  // ADL Categories and Activities (based on AxisCare reference)
  const adlCategories = {
    'personal-care': 'Personal Care',
    'mobility': 'Mobility & Transfers',
    'nutrition': 'Nutrition & Feeding',
    'toileting': 'Toileting & Incontinence',
    'medication': 'Medication & Health',
    'household': 'Household & Homemaking',
    'transportation': 'Transportation & Appointments',
    'social': 'Social & Companionship',
    'specialized': 'Specialized Care'
  };

  const adlActivities = [
    // Personal Care
    { id: 'bathing', name: 'Bathing/Tub, shower or partial', category: 'personal-care', icon: '🛁' },
    { id: 'bed-bath', name: 'Bed Bath', category: 'personal-care', icon: '🛏️' },
    { id: 'sponge-bath', name: 'Sponge Bath', category: 'personal-care', icon: '🧽' },
    { id: 'dressing', name: 'Dressing', category: 'personal-care', icon: '👕' },
    { id: 'grooming', name: 'Grooming', category: 'personal-care', icon: '💄' },
    { id: 'hair-care', name: 'Hair Care', category: 'personal-care', icon: '💇' },
    { id: 'oral-care', name: 'Oral Care', category: 'personal-care', icon: '🦷' },
    { id: 'nail-care', name: 'Nail Care', category: 'personal-care', icon: '💅' },
    { id: 'foot-care', name: 'Foot Care/Foot Soaks', category: 'personal-care', icon: '🦶' },
    { id: 'skin-care', name: 'Skin Care', category: 'personal-care', icon: '🧴' },
    { id: 'shampoo', name: 'Shampoo Hair', category: 'personal-care', icon: '🧴' },

    // Mobility & Transfers
    { id: 'ambulation', name: 'Ambulation', category: 'mobility', icon: '🚶' },
    { id: 'assist-walking', name: 'Assist with walking', category: 'mobility', icon: '🚶‍♂️' },
    { id: 'assist-exercise', name: 'Assist with exercise', category: 'mobility', icon: '🏃' },
    { id: 'transfer-gait', name: 'Transfer - Gait Belt', category: 'mobility', icon: '🦽' },
    { id: 'transfer-slide', name: 'Transfer - Slide Board', category: 'mobility', icon: '🛹' },
    { id: 'transferring', name: 'Transferring', category: 'mobility', icon: '🔄' },
    { id: 'hoyer-lift', name: 'Hoyer Lift Assist', category: 'mobility', icon: '🏋️' },
    { id: 'positioning', name: 'Positioning', category: 'mobility', icon: '🛌' },
    { id: 'turn-client', name: 'Turn Client', category: 'mobility', icon: '🔄' },
    { id: 'stand-by', name: 'Stand By Assist', category: 'mobility', icon: '🤝' },

    // Nutrition & Feeding
    { id: 'feeding', name: 'Feeding', category: 'nutrition', icon: '🍽️' },
    { id: 'assist-eating', name: 'Assist Eating', category: 'nutrition', icon: '🥄' },
    { id: 'meal-prep', name: 'Meal Preparation', category: 'nutrition', icon: '👨‍🍳' },
    { id: 'meal-planning', name: 'Meal Planning', category: 'nutrition', icon: '📋' },
    { id: 'special-diet', name: 'Special Diet Needs', category: 'nutrition', icon: '🥗' },
    { id: 'g-tube', name: 'Perform G-Tube feeding', category: 'nutrition', icon: '🏥' },
    { id: 'encourage-fluids', name: 'Encourage Fluids', category: 'nutrition', icon: '💧' },
    { id: 'restrict-fluids', name: 'Restrict Fluids', category: 'nutrition', icon: '🚫' },

    // Toileting & Incontinence
    { id: 'assist-commode', name: 'Assist to Commode', category: 'toileting', icon: '🚽' },
    { id: 'bedpan', name: 'Bedpan Assistance', category: 'toileting', icon: '🛏️' },
    { id: 'toileting', name: 'Toileting Assistance', category: 'toileting', icon: '🚽' },
    { id: 'incontinence', name: 'Incontinence Care', category: 'toileting', icon: '🩹' },
    { id: 'catheter', name: 'Catheter Care', category: 'toileting', icon: '🏥' },
    { id: 'bladder', name: 'Bladder Care', category: 'toileting', icon: '🩺' },
    { id: 'bowel', name: 'Bowel Care', category: 'toileting', icon: '🩺' },
    { id: 'peri-care', name: 'Peri Care', category: 'toileting', icon: '🧽' },

    // Medication & Health
    { id: 'med-reminders', name: 'Medication Reminders', category: 'medication', icon: '💊' },
    { id: 'med-setup', name: 'Med Set-Up', category: 'medication', icon: '📋' },
    { id: 'vital-signs', name: 'Vital Signs', category: 'medication', icon: '🩺' },
    { id: 'safety-care', name: 'Safety Care', category: 'medication', icon: '🛡️' },
    { id: 'fall-risk', name: 'Fall Risk', category: 'medication', icon: '⚠️' },
    { id: 'respiratory', name: 'Respiratory Care', category: 'medication', icon: '🫁' },
    { id: 'rom-exercises', name: 'Range of Motion Exercises', category: 'medication', icon: '🤸' },
    { id: 'physical-therapy', name: 'Basic Physical Therapy', category: 'medication', icon: '🏥' },
    { id: 'massage', name: 'Light Massage', category: 'medication', icon: '🤲' },

    // Household & Homemaking
    { id: 'light-housekeeping', name: 'Light Housekeeping', category: 'household', icon: '🏠' },
    { id: 'cleaning', name: 'Cleaning', category: 'household', icon: '🧹' },
    { id: 'dishwashing', name: 'Dishwashing', category: 'household', icon: '🍽️' },
    { id: 'laundry', name: 'Laundry', category: 'household', icon: '👕' },
    { id: 'ironing', name: 'Ironing', category: 'household', icon: '👔' },
    { id: 'make-bed', name: 'Make bed', category: 'household', icon: '🛏️' },
    { id: 'kitchen-cleanup', name: 'Kitchen Cleanup', category: 'household', icon: '🍳' },
    { id: 'bathroom-cleanup', name: 'Bathroom Cleanup', category: 'household', icon: '🚿' },
    { id: 'vacuuming', name: 'Vacuuming', category: 'household', icon: '🧹' },
    { id: 'sweeping', name: 'Sweeping', category: 'household', icon: '🧹' },
    { id: 'mopping', name: 'Mopping', category: 'household', icon: '🧽' },
    { id: 'dusting', name: 'Dusting', category: 'household', icon: '🪶' },
    { id: 'garbage', name: 'Dispose of garbage', category: 'household', icon: '🗑️' },

    // Transportation & Appointments
    { id: 'transportation', name: 'Client Transportation', category: 'transportation', icon: '🚗' },
    { id: 'appointments', name: 'Taking client to appointment', category: 'transportation', icon: '🏥' },
    { id: 'dr-appointment', name: 'Client Dr. Appointment', category: 'transportation', icon: '👨‍⚕️' },
    { id: 'errands', name: 'Client Errands', category: 'transportation', icon: '🛒' },

    // Social & Companionship
    { id: 'companionship', name: 'Companionship', category: 'social', icon: '👥' },
    { id: 'conversation', name: 'Conversation', category: 'social', icon: '💬' },
    { id: 'games', name: 'Games', category: 'social', icon: '🎮' },
    { id: 'walks', name: 'Taking Walks', category: 'social', icon: '🚶‍♀️' },
    { id: 'activity-out', name: 'Activity Out of Home', category: 'social', icon: '🏃‍♂️' },
    { id: 'respite', name: 'Respite', category: 'social', icon: '😌' },
    { id: 'well-being', name: 'Well Being Observation', category: 'social', icon: '👁️' },

    // Specialized Care
    { id: 'hospice', name: 'Hospice Care', category: 'specialized', icon: '🏥' },
    { id: 'homemaker', name: 'Homemaker', category: 'specialized', icon: '🏠' },
    { id: 'hygiene', name: 'Hygiene Assistance', category: 'specialized', icon: '🧼' },
    { id: 'plants', name: 'Watering Plants', category: 'specialized', icon: '🌱' },
    { id: 'pet-care', name: 'Pet Care', category: 'specialized', icon: '🐕' },
    { id: 'other', name: 'Other', category: 'specialized', icon: '📝' }
  ];

  useEffect(() => {
    loadClientActivities();
  }, [clientId]);

  // Filter activities whenever search term, category, or activities change
  useEffect(() => {
    filterActivities(searchTerm, selectedCategory);
    setCurrentPage(1); // Reset to first page when filtering changes
  }, [activities, searchTerm, selectedCategory]);

  const loadClientActivities = async () => {
    try {
      setLoading(true);
      
      // Use the static activities list directly
      const allActivities = adlActivities;
      
      // Load recent logs for this client (optional)
      try {
        const recentLogs = await adlAPI.getClientAdlLogs(clientId, 100);
        setRecentLogs(recentLogs);
        
        // Map activities with their recent status
        const enabledActivities = allActivities.map(activity => {
          const recentLog = recentLogs.find(log => log.activityId === activity.id);
          return {
            ...activity,
            lastLogged: recentLog?.timestamp,
            status: recentLog?.status || 'pending'
          };
        });
        
        setActivities(enabledActivities);
      } catch (logError) {
        console.log('No recent logs found, showing all activities');
        // If no logs found, just show all activities with default status
        const enabledActivities = allActivities.map(activity => ({
          ...activity,
          status: 'pending'
        }));
        setActivities(enabledActivities);
      }
    } catch (error) {
      console.error('Error loading client activities:', error);
      toast.error('Failed to load activities');
      // Fallback: show static activities
      const enabledActivities = adlActivities.map(activity => ({
        ...activity,
        status: 'pending'
      }));
      setActivities(enabledActivities);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    filterActivities(term, selectedCategory);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    filterActivities(searchTerm, category);
  };

  // Pagination helpers
  const getCurrentPageActivities = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredActivities.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(filteredActivities.length / itemsPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const filterActivities = (search, category) => {
    let filtered = activities || [];

    if (search) {
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category !== 'all') {
      filtered = filtered.filter(activity => activity.category === category);
    }

    setFilteredActivities(filtered);
  };

  const handleActivityAction = async (activity, action) => {
    setCurrentActivity(activity);
    
    // If clicking the same status, toggle it off (set to null/undefined)
    if (activity.status === action) {
      // Toggle off - don't log anything
      return;
    }
    
    if (action === 'completed' || action === 'skipped') {
      // Log activity directly
      await logActivity(activity, action, '');
    } else if (action === 'issue') {
      // Show notes modal for issues
      setShowNotesModal(true);
    }
  };

  const logActivity = async (activity, status, notes) => {
    try {
      const now = new Date();
      
      // Comprehensive log data with complete caregiver details
      const logData = {
        // Client information
        clientId,
        clientName,
        
        // Activity information
        activityId: activity.id,
        activityName: activity.name,
        activityCategory: activity.category,
        status,
        notes: notes || '',
        
        // Caregiver information (complete attribution)
        caregiverId: userProfile?.id || userProfile?.uid || user?.uid,
        caregiverName: userProfile?.name || userProfile?.fullName || userProfile?.displayName || 'Unknown Caregiver',
        caregiverEmail: userProfile?.email || user?.email,
        caregiverRole: userProfile?.userType || userProfile?.type || userProfile?.role || 'caregiver',
        caregiverPhone: userProfile?.phone || userProfile?.phoneNumber,
        
        // Timestamp information (for accurate time tracking)
        loggedAt: now.toISOString(),
        loggedDate: now.toISOString().split('T')[0], // YYYY-MM-DD format
        loggedTime: now.toTimeString().split(' ')[0], // HH:MM:SS format
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        weekNumber: getWeekNumber(now),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        
        // Duration tracking (estimated time for activity)
        duration: estimateActivityDuration(activity.id, status),
        durationUnit: 'hours',
        
        // Additional metadata
        institutionId: userProfile?.institutionId || null,
        logSource: 'adl_logger',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: now.toISOString()
        }
      };

      // Save to database
      const loggedActivity = await adlAPI.logActivity(logData);
      console.log('✅ Activity logged with complete details:', {
        activity: activity.name,
        status,
        caregiver: logData.caregiverName,
        timestamp: logData.loggedAt,
        duration: logData.duration
      });
      
      // Update local state
      setActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { ...a, lastLogged: now, status, duration: logData.duration }
          : a
      ));

      // Update filtered activities
      setFilteredActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { ...a, lastLogged: now, status, duration: logData.duration }
          : a
      ));

      // Update recent logs
      setRecentLogs(prev => [loggedActivity, ...prev.slice(0, 99)]);

      setShowNotesModal(false);
      setNotes('');
      
      toast.success(`${activity.name} logged as ${status} (${logData.duration}h)`);
      
      if (onActivityLogged) {
        onActivityLogged(loggedActivity);
      }
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      toast.error('Failed to log activity');
    }
  };

  // Helper function to get ISO week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Helper function to estimate activity duration based on activity type
  const estimateActivityDuration = (activityId, status) => {
    if (status === 'skipped') return 0;
    
    // Duration estimates in hours based on typical activity time
    const durationMap = {
      // Personal Care (15-45 min)
      'bathing': 0.5, 'bed-bath': 0.5, 'sponge-bath': 0.25,
      'dressing': 0.25, 'grooming': 0.25, 'hair-care': 0.25,
      'oral-care': 0.15, 'nail-care': 0.25, 'foot-care': 0.25,
      'skin-care': 0.15, 'shampoo': 0.25,
      
      // Mobility (10-30 min)
      'ambulation': 0.25, 'assist-walking': 0.25, 'assist-exercise': 0.5,
      'transfer-gait': 0.15, 'transfer-slide': 0.15, 'transferring': 0.15,
      'hoyer-lift': 0.25, 'positioning': 0.15, 'turn-client': 0.1,
      'stand-by': 0.25,
      
      // Nutrition (20-60 min)
      'feeding': 0.5, 'assist-eating': 0.5, 'meal-prep': 1.0,
      'meal-planning': 0.25, 'special-diet': 1.0, 'g-tube': 0.25,
      'encourage-fluids': 0.15, 'restrict-fluids': 0.15,
      
      // Toileting (10-20 min)
      'assist-commode': 0.25, 'bedpan': 0.15, 'toileting': 0.25,
      'incontinence': 0.25, 'catheter': 0.25, 'bladder': 0.25,
      'bowel': 0.25, 'peri-care': 0.15,
      
      // Medication (10-20 min)
      'med-reminders': 0.15, 'med-setup': 0.25, 'vital-signs': 0.25,
      'safety-care': 0.25, 'fall-risk': 0.15, 'respiratory': 0.25,
      'rom-exercises': 0.5, 'physical-therapy': 1.0, 'massage': 0.5,
      
      // Household (30-60 min)
      'light-housekeeping': 1.0, 'cleaning': 1.0, 'dishwashing': 0.5,
      'laundry': 1.0, 'ironing': 0.5, 'make-bed': 0.25,
      'kitchen-cleanup': 0.5, 'bathroom-cleanup': 0.5,
      'vacuuming': 0.5, 'sweeping': 0.5, 'mopping': 0.5,
      'dusting': 0.5, 'garbage': 0.15,
      
      // Transportation (1-3 hours)
      'transportation': 2.0, 'appointments': 2.0, 'dr-appointment': 2.0,
      'errands': 1.5,
      
      // Social (30-120 min)
      'companionship': 1.0, 'conversation': 0.5, 'games': 1.0,
      'walks': 0.5, 'activity-out': 2.0, 'respite': 4.0,
      'well-being': 0.25,
      
      // Specialized
      'hospice': 2.0, 'homemaker': 2.0, 'hygiene': 0.5,
      'plants': 0.25, 'pet-care': 0.5, 'other': 0.5
    };
    
    return durationMap[activityId] || 0.25; // Default 15 minutes
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'skipped': return 'text-yellow-600 bg-yellow-100';
      case 'issue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'skipped': return <Clock className="h-4 w-4" />;
      case 'issue': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activities of Daily Living</h2>
            <p className="text-gray-600">Log activities for {clientName}</p>
          </div>
          <div className="text-sm text-gray-500">
            <Calendar className="h-4 w-4 inline mr-1" />
            {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {Object.entries(adlCategories).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {/* Pagination Info */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length} activities
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Page:</span>
              <select 
                value={currentPage} 
                onChange={(e) => handlePageChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                {Array.from({ length: getTotalPages() }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-600">of {getTotalPages()}</span>
            </div>
          </div>

          <div className="grid gap-4">
            {getCurrentPageActivities().map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{activity.icon}</div>
                  <div>
                    <h3 className="font-medium text-gray-900">{activity.name}</h3>
                    <p className="text-sm text-gray-500">{adlCategories[activity.category]}</p>
                    {activity.lastLogged && (
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {getStatusIcon(activity.status)}
                          <span className="ml-1">
                            {activity.status} • {new Date(activity.lastLogged).toLocaleTimeString()}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Toggle Switches */}
                <div className="flex items-center space-x-6">
                  {/* Complete Toggle */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Complete</label>
                    <div 
                      className="relative inline-block w-11 h-6 cursor-pointer"
                      onClick={() => handleActivityAction(activity, 'completed')}
                    >
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activity.status === 'completed'}
                        readOnly
                      />
                      <div className={`w-11 h-6 rounded-full shadow-inner transition-colors duration-200 ${
                        activity.status === 'completed' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        activity.status === 'completed' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>
                  
                  {/* Skip Toggle */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Skip</label>
                    <div 
                      className="relative inline-block w-11 h-6 cursor-pointer"
                      onClick={() => handleActivityAction(activity, 'skipped')}
                    >
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activity.status === 'skipped'}
                        readOnly
                      />
                      <div className={`w-11 h-6 rounded-full shadow-inner transition-colors duration-200 ${
                        activity.status === 'skipped' ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        activity.status === 'skipped' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>
                  
                  {/* Issue Toggle */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Issue</label>
                    <div 
                      className="relative inline-block w-11 h-6 cursor-pointer"
                      onClick={() => handleActivityAction(activity, 'issue')}
                    >
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activity.status === 'issue'}
                        readOnly
                      />
                      <div className={`w-11 h-6 rounded-full shadow-inner transition-colors duration-200 ${
                        activity.status === 'issue' ? 'bg-red-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        activity.status === 'issue' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredActivities.length === 0 && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No activities found matching your search.</p>
            </div>
          )}

          {/* Pagination Navigation */}
          {filteredActivities.length > 0 && getTotalPages() > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: getTotalPages() }, (_, i) => {
                    const page = i + 1;
                    // Show first 3 pages, last 3 pages, and current page with context
                    const shouldShow = page <= 3 || page >= getTotalPages() - 2 || Math.abs(page - currentPage) <= 1;
                    
                    if (!shouldShow) {
                      // Show ellipsis for gaps
                      if (page === 4 && currentPage > 5) {
                        return <span key={`ellipsis-${page}`} className="px-2 py-1 text-sm text-gray-500">...</span>;
                      }
                      if (page === getTotalPages() - 3 && currentPage < getTotalPages() - 4) {
                        return <span key={`ellipsis-${page}`} className="px-2 py-1 text-sm text-gray-500">...</span>;
                      }
                      return null;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'text-white bg-blue-600 border border-blue-600'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                Page {currentPage} of {getTotalPages()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Log Issue for {currentActivity?.name}</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the issue or add notes..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => logActivity(currentActivity, 'issue', notes)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Log Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdlLogger;

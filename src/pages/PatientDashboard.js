/**
 * Patient Dashboard
 * 
 * Comprehensive dashboard showing all patient activities from all staff types:
 * - Physicians (Doctors)
 * - Registered Nurses (RN)
 * - Licensed Practical Nurses (LPN)
 * - Caregivers
 * - Pharmacists
 * - Laboratory Technicians
 * - Administrators
 * 
 * All activities are displayed with:
 * - Activity description
 * - Staff member (with proper medical terminology)
 * - Date and time
 * - Activity details
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Clock, 
  User, 
  Calendar, 
  Filter, 
  Search, 
  Download,
  FileText,
  Stethoscope,
  Pill,
  Heart,
  ClipboardList,
  TestTube,
  UserCheck,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getPatientActivities } from '../utils/patientActivityLogger';
import { getPatientById, getPatientByPatientId } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';

const PatientDashboard = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useUser();
  
  const [patient, setPatient] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStaffRole, setSelectedStaffRole] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const categories = [
    { value: 'all', label: 'All Categories', icon: Activity, color: 'slate' },
    { value: 'registration', label: 'Registration', icon: UserCheck, color: 'blue' },
    { value: 'profile', label: 'Profile', icon: User, color: 'indigo' },
    { value: 'medical', label: 'Medical', icon: Stethoscope, color: 'red' },
    { value: 'care', label: 'Care', icon: Heart, color: 'emerald' },
    { value: 'documents', label: 'Documents', icon: FileText, color: 'amber' },
    { value: 'assignment', label: 'Assignments', icon: UserCheck, color: 'sky' },
    { value: 'notes', label: 'Notes', icon: ClipboardList, color: 'gray' }
  ];

  const staffRoles = [
    { value: 'all', label: 'All Staff' },
    { value: 'Physician', label: 'Physicians' },
    { value: 'Registered Nurse (RN)', label: 'Registered Nurses' },
    { value: 'Licensed Practical Nurse (LPN)', label: 'LPNs' },
    { value: 'Caregiver', label: 'Caregivers' },
    { value: 'Pharmacist', label: 'Pharmacists' },
    { value: 'Laboratory Technician', label: 'Lab Technicians' },
    { value: 'Administrator', label: 'Administrators' }
  ];

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  useEffect(() => {
    if (patient) {
      loadActivities();
    }
  }, [patient, selectedCategory, selectedStaffRole, dateRange]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      // Try to get by registration number first, then by document ID
      let patientData;
      try {
        patientData = await getPatientByPatientId(patientId);
      } catch (error) {
        patientData = await getPatientById(patientId);
      }
      setPatient(patientData);
    } catch (error) {
      console.error('Error loading patient:', error);
      toast.error('Failed to load patient data');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      const options = {
        limitCount: 500,
        category: selectedCategory !== 'all' ? selectedCategory : null,
        startDate: dateRange.start || null,
        endDate: dateRange.end || null
      };

      const patientIdentifier = patient?.patientId || patient?.id || patientId;
      const activitiesData = await getPatientActivities(patientIdentifier, options);
      
      // Filter by staff role if selected
      let filteredActivities = activitiesData;
      if (selectedStaffRole !== 'all') {
        filteredActivities = activitiesData.filter(activity => 
          activity.staffMember?.role === selectedStaffRole
        );
      }

      // Filter by search term
      if (searchTerm) {
        filteredActivities = filteredActivities.filter(activity =>
          activity.activityDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.staffMember?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.activityType?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setActivities(filteredActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load patient activities');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (category, activityType) => {
    if (activityType?.includes('vital')) return Heart;
    if (activityType?.includes('medication')) return Pill;
    if (activityType?.includes('laboratory') || activityType?.includes('lab')) return TestTube;
    if (activityType?.includes('consultation') || activityType?.includes('report')) return Stethoscope;
    if (activityType?.includes('document')) return FileText;
    if (activityType?.includes('care')) return ClipboardList;
    if (activityType?.includes('assignment')) return UserCheck;
    return Activity;
  };

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat?.color || 'slate';
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const exportActivities = () => {
    const csvContent = [
      ['Date', 'Time', 'Activity', 'Staff Member', 'Role', 'Category', 'Details'].join(','),
      ...activities.map(activity => {
        const { date, time } = formatDateTime(activity.timestamp);
        return [
          date,
          time,
          `"${activity.activityDescription || activity.activityType || ''}"`,
          `"${activity.staffMember?.name || 'Unknown'}"`,
          `"${activity.staffMember?.role || 'Unknown'}"`,
          activity.category || 'general',
          `"${JSON.stringify(activity.activityDetails || {}).replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-activities-${patient?.patientId || patientId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Activities exported successfully');
  };

  if (loading && !patient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-50">
                  {patient?.name || patient?.fullName || 'Patient'} Dashboard
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Registration: {patient?.patientId || patientId} • Complete Activity Log
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadActivities}
                className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={exportActivities}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {/* Staff Role Filter */}
            <select
              value={selectedStaffRole}
              onChange={(e) => setSelectedStaffRole(e.target.value)}
              className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {staffRoles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* Activities List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-slate-800/60 bg-slate-900/50">
              <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No activities found</p>
            </div>
          ) : (
            activities.map((activity) => {
              const { date, time } = formatDateTime(activity.timestamp);
              const ActivityIcon = getActivityIcon(activity.category, activity.activityType);
              const categoryColor = getCategoryColor(activity.category);
              
              return (
                <div
                  key={activity.id}
                  className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl bg-${categoryColor}-500/10 border border-${categoryColor}-500/20`}>
                      <ActivityIcon className={`h-5 w-5 text-${categoryColor}-400`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-50 mb-1">
                            {activity.activityDescription || activity.activityType}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {time}
                            </span>
                            <span className={`px-2 py-1 rounded-full bg-${categoryColor}-500/10 text-${categoryColor}-400 text-xs`}>
                              {activity.category || 'general'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Staff Member */}
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-300">
                          <span className="font-medium">{activity.staffMember?.name || 'Unknown Staff'}</span>
                          {' • '}
                          <span className="text-slate-400">{activity.staffMember?.role || 'Staff Member'}</span>
                        </span>
                      </div>

                      {/* Activity Details */}
                      {activity.activityDetails && Object.keys(activity.activityDetails).length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/30">
                          <details className="cursor-pointer">
                            <summary className="text-sm font-medium text-slate-400 hover:text-slate-300">
                              View Details
                            </summary>
                            <div className="mt-3 text-sm text-slate-400 space-y-1">
                              {Object.entries(activity.activityDetails).map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-medium text-slate-300 w-32">{key}:</span>
                                  <span className="text-slate-400">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
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
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        {activities.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
              <div className="text-sm text-slate-400 mb-1">Total Activities</div>
              <div className="text-2xl font-bold text-slate-50">{activities.length}</div>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
              <div className="text-sm text-slate-400 mb-1">Unique Staff</div>
              <div className="text-2xl font-bold text-slate-50">
                {new Set(activities.map(a => a.staffMember?.id)).size}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
              <div className="text-sm text-slate-400 mb-1">Categories</div>
              <div className="text-2xl font-bold text-slate-50">
                {new Set(activities.map(a => a.category)).size}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
              <div className="text-sm text-slate-400 mb-1">Date Range</div>
              <div className="text-sm font-medium text-slate-50">
                {activities.length > 0 && formatDateTime(activities[activities.length - 1].timestamp).date}
                {' - '}
                {activities.length > 0 && formatDateTime(activities[0].timestamp).date}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;


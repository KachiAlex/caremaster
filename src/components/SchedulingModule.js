import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import { getAllClients } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import {
  Calendar,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  XCircle,
  Clock,
  MapPin,
  User,
  Users,
  Edit,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MoreVertical
} from 'lucide-react';

const SchedulingModule = ({ institutionId }) => {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [clients, setClients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [viewMode, setViewMode] = useState('day'); // day, week, month
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState(null);

  useEffect(() => {
    loadData();
  }, [institutionId, selectedDate]);

  useEffect(() => {
    filterSchedules();
  }, [schedules, searchTerm, selectedDate, viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load clients from clients collection
      const clientsList = await getAllClients(institutionId);
      setClients(clientsList);

      // Load caregivers
      const caregiversQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', institutionId),
        where('userType', 'in', ['caregiver', 'doctor', 'nurse'])
      );
      const caregiversSnapshot = await getDocs(caregiversQuery);
      const caregiversList = caregiversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCaregivers(caregiversList);

      // Load schedules
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('institutionId', '==', institutionId)
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const schedulesList = schedulesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure scheduleDate is in ISO format (YYYY-MM-DD)
          scheduleDate: data.scheduleDate || (data.scheduledDate ? new Date(data.scheduledDate).toISOString().split('T')[0] : null)
        };
      });

      // Load assignments from clientAssignments collection
      let assignmentsList = [];
      try {
        // Get all assignments and filter by institution
        const allAssignments = await assignmentAPI.getAllAssignments();
        
        // Filter assignments for this institution by checking caregiver's institutionId
        assignmentsList = allAssignments
          .filter(assignment => {
            if (!assignment.caregiverId) return false;
            // Check if caregiver belongs to this institution
            const caregiver = caregiversList.find(c => c.id === assignment.caregiverId);
            // Also check if assignment has institutionId field
            return caregiver || assignment.institutionId === institutionId;
          })
          .map(assignment => {
            // Convert assignment to schedule format
            let dueDate = assignment.dueDate;
            let scheduleDate = null;
            
            // Convert Firestore Timestamp to Date if needed
            if (dueDate && dueDate.toDate && typeof dueDate.toDate === 'function') {
              dueDate = dueDate.toDate();
            }
            
            if (dueDate) {
              // Handle different date formats
              if (dueDate instanceof Date) {
                scheduleDate = dueDate.toISOString().split('T')[0];
              } else if (typeof dueDate === 'string') {
                // If it's already in ISO format, use it; otherwise parse it
                if (dueDate.includes('T')) {
                  scheduleDate = dueDate.split('T')[0];
                } else if (dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  // Already in YYYY-MM-DD format
                  scheduleDate = dueDate;
                } else {
                  // Try to parse as date
                  const parsed = new Date(dueDate);
                  if (!isNaN(parsed.getTime())) {
                    scheduleDate = parsed.toISOString().split('T')[0];
                  }
                }
              }
            }

            // Convert dueTime to startTime format
            let startTime = '09:00';
            if (assignment.dueTime) {
              // dueTime might be in format "HH:MM" or "HH:MM:SS"
              startTime = assignment.dueTime.split(':').slice(0, 2).join(':');
            }

            // Determine end time (default to 1 hour after start)
            let endTime = '17:00';
            if (startTime) {
              const [hours, minutes] = startTime.split(':').map(Number);
              const endDate = new Date();
              endDate.setHours(hours + 1, minutes, 0, 0);
              endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
            }

            return {
              id: `assignment-${assignment.id}`,
              assignmentId: assignment.id,
              institutionId: institutionId,
              clientId: assignment.clientId,
              clientName: assignment.clientName || 'Unknown Client',
              caregiverId: assignment.caregiverId,
              caregiverName: assignment.caregiverName || 'Unknown Caregiver',
              title: assignment.title || assignment.description || 'Assigned Task',
              description: assignment.description || assignment.instructions || '',
              serviceType: 'care-visit', // Default service type for assignments
              type: 'care-visit',
              priority: assignment.priority || 'medium',
              scheduleDate: scheduleDate,
              endDate: scheduleDate, // Use same date for end date
              startTime: startTime,
              endTime: endTime,
              comments: assignment.instructions || assignment.description || '',
              specialInstructions: assignment.instructions || assignment.description || '',
              status: assignment.status || 'scheduled',
              isAssignment: true, // Flag to identify this came from assignments
              createdAt: assignment.createdAt,
              updatedAt: assignment.updatedAt
            };
          });
      } catch (error) {
        console.error('Error loading assignments:', error);
        // Don't show error toast, just log it - assignments are optional
      }

      // Merge schedules and assignments
      const allSchedules = [...schedulesList, ...assignmentsList];
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  const filterSchedules = () => {
    let filtered = schedules;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(schedule =>
        schedule.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.caregiverName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range based on view mode
    if (viewMode === 'day') {
      const dayStr = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter(schedule => schedule.scheduleDate === dayStr);
    } else if (viewMode === 'week') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      filtered = filtered.filter(schedule => {
        const schedDate = new Date(schedule.scheduleDate);
        return schedDate >= weekStart && schedDate <= weekEnd;
      });
    } else if (viewMode === 'month') {
      filtered = filtered.filter(schedule => {
        const schedDate = new Date(schedule.scheduleDate);
        return schedDate.getMonth() === selectedDate.getMonth() &&
               schedDate.getFullYear() === selectedDate.getFullYear();
      });
    }

    // Sort by date and start time
    filtered.sort((a, b) => {
      if (a.scheduleDate !== b.scheduleDate) {
        return new Date(a.scheduleDate) - new Date(b.scheduleDate);
      }
      return a.startTime?.localeCompare(b.startTime || '');
    });

    setFilteredSchedules(filtered);
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    if (viewMode === 'day') {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (viewMode === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  // Service type configurations with colors (inspired by ServiceTitan)
  const serviceTypes = {
    'care-visit': { color: '#3B82F6', bg: 'bg-blue-500', label: 'CARE', code: 'CV' },
    'medical-check': { color: '#10B981', bg: 'bg-green-500', label: 'MED', code: 'MC' },
    'medication': { color: '#F59E0B', bg: 'bg-amber-500', label: 'MEDS', code: 'MD' },
    'therapy': { color: '#8B5CF6', bg: 'bg-purple-500', label: 'THER', code: 'TH' },
    'companion': { color: '#EC4899', bg: 'bg-pink-500', label: 'COMP', code: 'CO' },
    'emergency': { color: '#EF4444', bg: 'bg-red-500', label: 'EMER', code: 'EM' },
    'assessment': { color: '#06B6D4', bg: 'bg-cyan-500', label: 'ASSES', code: 'AS' },
    'follow-up': { color: '#6366F1', bg: 'bg-indigo-500', label: 'FU', code: 'FU' }
  };

  const getServiceTypeConfig = (schedule) => {
    const type = schedule?.serviceType || schedule?.type || 'care-visit';
    return serviceTypes[type] || serviceTypes['care-visit'];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const toIsoDateString = (date) => {
    const iso = date.toISOString();
    return iso.split('T')[0];
  };

  const getWeekDates = (referenceDate) => {
    const date = new Date(referenceDate);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + index);
      return current;
    });
  };

  const formatWeekRangeLabel = (dates) => {
    if (!dates.length) return '';
    const first = dates[0];
    const last = dates[dates.length - 1];
    const options = { month: 'short', day: 'numeric' };
    return `${first.toLocaleDateString('en-US', options)} - ${last.toLocaleDateString('en-US', options)}`;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekDateStrings = useMemo(() => weekDates.map((date) => toIsoDateString(date)), [weekDates]);
  const weekSchedules = useMemo(() => {
    if (!weekDateStrings.length) return [];
    return schedules.filter((schedule) => schedule?.scheduleDate && weekDateStrings.includes(schedule.scheduleDate));
  }, [schedules, weekDateStrings]);

  const schedulesByCaregiverAndDay = useMemo(() => {
    const map = {};
    weekSchedules.forEach((schedule) => {
      const caregiverId = schedule.caregiverId || 'unassigned';
      const dateKey = schedule.scheduleDate || toIsoDateString(new Date());
      if (!map[caregiverId]) map[caregiverId] = {};
      if (!map[caregiverId][dateKey]) map[caregiverId][dateKey] = [];
      map[caregiverId][dateKey].push(schedule);
    });
    return map;
  }, [weekSchedules]);

  const caregiverRows = useMemo(() => {
    const map = new Map();
    caregivers.forEach((caregiver) => {
      if (caregiver?.id) {
        map.set(caregiver.id, caregiver);
      }
    });
    weekSchedules.forEach((schedule) => {
      const caregiverId = schedule.caregiverId;
      if (caregiverId && !map.has(caregiverId)) {
        map.set(caregiverId, {
          id: caregiverId,
          name: schedule.caregiverName || 'Caregiver',
          userType: schedule.caregiverRole || schedule.role || 'Caregiver'
        });
      }
    });

    const rows = Array.from(map.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );

    if (weekSchedules.some((schedule) => !schedule.caregiverId) && !rows.find((row) => row.id === 'unassigned')) {
      rows.push({ id: 'unassigned', name: 'Unassigned', userType: 'Unassigned' });
    }

    return rows;
  }, [caregivers, weekSchedules]);

  useEffect(() => {
    if (selectedScheduleDetail && !weekDateStrings.includes(selectedScheduleDetail.scheduleDate)) {
      setSelectedScheduleDetail(null);
    }
  }, [selectedScheduleDetail, weekDateStrings]);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-blue-600" />
              Schedule Management
            </h2>
            <p className="text-gray-600 mt-1">Manage caregiver schedules and appointments</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* View Mode */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          <Calendar className="inline h-4 w-4 mr-1" />
          {formatDate(selectedDate)}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Schedules</div>
          <div className="text-2xl font-bold text-gray-900">{filteredSchedules.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Scheduled</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredSchedules.filter(s => s.status === 'scheduled').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredSchedules.filter(s => s.status === 'in-progress').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredSchedules.filter(s => s.status === 'completed').length}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr,1fr]">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500">Weekly Planner</p>
              <h3 className="text-xl font-semibold text-gray-900">Caregiver Calendar</h3>
            </div>
            <span className="text-sm font-medium text-gray-600">{formatWeekRangeLabel(weekDates)}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[220px_repeat(7,_minmax(160px,1fr))] border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-widest text-gray-500">
                <div className="border-r border-gray-200 px-3 py-2">Caregiver</div>
                {weekDates.map((date) => (
                  <div key={date.toDateString()} className="px-3 py-2 text-center">
                    <div className="text-[11px] text-gray-400">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="text-sm font-semibold text-gray-900">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-gray-100">
                {caregiverRows.length === 0 ? (
                  <div className="grid min-h-[160px] place-items-center px-3 py-10 text-sm text-gray-500">
                    No caregivers configured yet.
                  </div>
                ) : (
                  caregiverRows.map((caregiver) => (
                    <div
                      key={caregiver.id}
                      className="grid grid-cols-[220px_repeat(7,_minmax(160px,1fr))] border-b border-gray-100 bg-white last:border-b-0"
                    >
                      <div className="border-r border-gray-100 bg-white px-3 py-3 sticky left-0">
                        <p className="text-sm font-semibold text-gray-900">{caregiver.name || 'Caregiver'}</p>
                        <p className="text-xs text-gray-500">{caregiver.userType || caregiver.type || 'Caregiver'}</p>
                      </div>

                      {weekDates.map((date) => {
                        const isoDate = toIsoDateString(date);
                        const daySchedules = schedulesByCaregiverAndDay[caregiver.id]?.[isoDate] || [];
                        return (
                          <div key={`${caregiver.id}-${isoDate}`} className="px-2 py-2 min-h-[120px] bg-gray-50">
                            {daySchedules.length === 0 ? (
                              <p className="text-[10px] text-gray-400 mt-2">Available</p>
                            ) : (
                              daySchedules.map((schedule) => {
                                const serviceConfig = getServiceTypeConfig(schedule);
                                const priority = schedule.priority || 'medium';
                                const assignedCount = schedule.assignedPersonnel?.length || 1;
                                
                                return (
                                  <button
                                    key={schedule.id}
                                    type="button"
                                    onClick={() => setSelectedScheduleDetail(schedule)}
                                    className="group mb-2 w-full rounded-md border-l-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                    style={{ 
                                      borderLeftColor: serviceConfig.color,
                                      backgroundColor: `${serviceConfig.color}15`
                                    }}
                                  >
                                    <div className="p-2.5">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                          <span 
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wide flex-shrink-0"
                                            style={{ backgroundColor: serviceConfig.color }}
                                          >
                                            {serviceConfig.code}
                                          </span>
                                          {schedule.priority === 'high' && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white bg-red-500 uppercase">
                                              HIGH
                                            </span>
                                          )}
                                          {assignedCount > 1 && (
                                            <span className="text-[9px] text-gray-600 font-medium">
                                              {assignedCount}N
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs font-semibold text-gray-900 truncate mb-0.5">
                                        {schedule.clientName || schedule.title || 'Care Visit'}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                        <Clock className="h-3 w-3" />
                                        <span>{schedule.startTime || '9:00 AM'}</span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-fit max-h-[calc(100vh-200px)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-900">Schedule Details</h4>
            <div className="flex items-center gap-2">
              {selectedScheduleDetail && (
                <>
                  <button
                    onClick={() => {
                      setSelectedSchedule(selectedScheduleDetail);
                      setShowEditModal(true);
                    }}
                    className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (selectedScheduleDetail) {
                    setSelectedScheduleDetail(null);
                  } else {
                    setShowAddModal(true);
                  }
                }}
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                title={selectedScheduleDetail ? "Close" : "New Schedule"}
              >
                {selectedScheduleDetail ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {selectedScheduleDetail ? (
            <div className="flex-1 overflow-y-auto">
              {/* Title Section */}
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="px-2 py-1 rounded text-xs font-bold text-white uppercase"
                        style={{ backgroundColor: getServiceTypeConfig(selectedScheduleDetail).color }}
                      >
                        {getServiceTypeConfig(selectedScheduleDetail).code}
                      </span>
                      {selectedScheduleDetail.priority === 'high' && (
                        <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-red-500 uppercase">
                          HIGH
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 truncate">
                      {selectedScheduleDetail.title || selectedScheduleDetail.clientName || 'Care Visit'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Schedule #{selectedScheduleDetail.id?.slice(-6) || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedScheduleDetail.status || 'scheduled')}`}>
                    {selectedScheduleDetail.status || 'Scheduled'}
                  </span>
                </div>
              </div>

              {/* Key Information */}
              <div className="px-5 py-4 space-y-4 border-b border-gray-200">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Assigned To</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedScheduleDetail.caregiverName || 'Unassigned'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Client</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedScheduleDetail.clientName || 'Unassigned'}
                  </p>
                  {selectedScheduleDetail.clientAddress && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedScheduleDetail.clientAddress}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Date & Time</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(selectedScheduleDetail.scheduleDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {selectedScheduleDetail.startTime || '9:00 AM'} - {selectedScheduleDetail.endTime || '5:00 PM'}
                  </p>
                  {selectedScheduleDetail.arrivalWindow && (
                    <p className="text-xs text-gray-600 mt-1">
                      Arrival Window: {selectedScheduleDetail.arrivalWindow}
                    </p>
                  )}
                </div>
              </div>

              {/* Assigned Personnel */}
              {selectedScheduleDetail.assignedPersonnel && selectedScheduleDetail.assignedPersonnel.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                    <Users className="h-4 w-4" />
                    <span>Assigned Personnel</span>
                  </div>
                  <div className="space-y-2">
                    {selectedScheduleDetail.assignedPersonnel.map((person, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          defaultChecked={person.assigned}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{person.name || person}</span>
                        {person.role && (
                          <span className="text-xs text-gray-500 ml-auto">({person.role})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {(selectedScheduleDetail.description || selectedScheduleDetail.specialInstructions || selectedScheduleDetail.comments) && (
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <FileText className="h-4 w-4" />
                    <span>Special Instructions</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedScheduleDetail.specialInstructions || selectedScheduleDetail.description || selectedScheduleDetail.comments || 'No special instructions provided.'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="px-5 py-4 bg-gray-50">
                <button
                  onClick={() => {
                    setSelectedSchedule(selectedScheduleDetail);
                    setShowEditModal(true);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit Schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">No schedule selected</p>
              <p className="text-xs text-gray-500 mb-4">
                Click any schedule block to view details
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Schedule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note about separate scheduling */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Dedicated Scheduling Module</h4>
            <p className="text-sm text-blue-700 mt-1">
              This is a separate scheduling interface from client assignments. Use this to manage all caregiver schedules
              in one place without affecting the assignment workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Schedule Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-purple-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {showEditModal ? 'Edit Schedule' : 'Create New Schedule'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedSchedule(null);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData(e.target);
                  const scheduleData = {
                    institutionId,
                    clientId: formData.get('clientId'),
                    clientName: clients.find(c => c.id === formData.get('clientId'))?.name || '',
                    caregiverId: formData.get('caregiverId'),
                    caregiverName: caregivers.find(c => c.id === formData.get('caregiverId'))?.name || '',
                    title: formData.get('title'),
                    description: formData.get('description'),
                    serviceType: formData.get('serviceType'),
                    type: formData.get('serviceType'), // Also set type for compatibility
                    priority: formData.get('priority'),
                    scheduleDate: formData.get('scheduleDate'),
                    endDate: formData.get('endDate'),
                    startTime: formData.get('startTime'),
                    endTime: formData.get('endTime'),
                    comments: formData.get('comments'),
                    specialInstructions: formData.get('comments'),
                    status: 'scheduled',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  };

                  if (showEditModal && selectedSchedule) {
                    await updateDoc(doc(db, 'schedules', selectedSchedule.id), {
                      ...scheduleData,
                      createdAt: selectedSchedule.createdAt
                    });
                    toast.success('Schedule updated successfully!');
                  } else {
                    await addDoc(collection(db, 'schedules'), scheduleData);
                    toast.success('Schedule created successfully!');
                  }

                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedSchedule(null);
                  loadData();
                } catch (error) {
                  console.error('Error saving schedule:', error);
                  toast.error('Failed to save schedule');
                }
              }}
              className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      name="clientId"
                      required
                      defaultValue={selectedSchedule?.clientId || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name || client.fullName || client.email || 'Unnamed Client'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caregiver *
                    </label>
                    <select
                      name="caregiverId"
                      required
                      defaultValue={selectedSchedule?.caregiverId || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Caregiver</option>
                      {caregivers.map(caregiver => (
                        <option key={caregiver.id} value={caregiver.id}>{caregiver.name || caregiver.email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type *
                    </label>
                    <select
                      name="serviceType"
                      required
                      defaultValue={selectedSchedule?.serviceType || selectedSchedule?.type || 'care-visit'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {Object.entries(serviceTypes).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      defaultValue={selectedSchedule?.priority || 'medium'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={selectedSchedule?.title || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Morning Care Visit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={selectedSchedule?.description || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional details about this schedule..."
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="scheduleDate"
                      required
                      defaultValue={selectedSchedule?.scheduleDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      required
                      defaultValue={selectedSchedule?.startTime || '09:00'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      required
                      defaultValue={selectedSchedule?.endDate || selectedSchedule?.scheduleDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      required
                      defaultValue={selectedSchedule?.endTime || '17:00'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments *
                  </label>
                  <textarea
                    name="comments"
                    rows={3}
                    required
                    defaultValue={selectedSchedule?.comments || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Required: Add any special notes or instructions..."
                  />
                </div>

              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedSchedule(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {showEditModal ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingModule;

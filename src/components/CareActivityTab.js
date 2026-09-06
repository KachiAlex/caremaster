import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle, FileText, Activity, Heart, Clock, Plus,
  Calendar, User, AlertTriangle, Filter, ChevronLeft, ChevronRight,
  ClipboardList, Camera, Pill, Utensils, Droplets, Thermometer
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { getCareLogsByClient } from '../api/careLogsAPI';
import adlAPI from '../api/adlAPI';
import { collection, query, where, getDocs, orderBy } from 'backend/database';
import { db } from '../backend/config';

const FILTER_CHIPS = [
  { id: 'all', label: 'All', icon: ClipboardList },
  { id: 'task', label: 'Tasks', icon: CheckCircle },
  { id: 'care-note', label: 'Care Notes', icon: FileText },
  { id: 'adl', label: 'ADLs', icon: Activity },
  { id: 'vitals', label: 'Vitals', icon: Heart },
];

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-800',
  active: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  refused: 'bg-red-100 text-red-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const TYPE_META = {
  task: { label: 'Task', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-400' },
  'care-note': { label: 'Care Note', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400' },
  adl: { label: 'ADL', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-400' },
  vitals: { label: 'Vitals', icon: Heart, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-400' },
};

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'number') return new Date(value);
  return null;
}

const CareActivityTab = ({
  caregiverId,
  caregiverName,
  institutionId,
  assignedClients,
  selectedClient,
  onSelectClient,
  onLogActivity,
  recentTasks = [],
  isDoctor = false,
  isNurse = false,
}) => {
  const { userProfile, user } = useUser();
  const [filter, setFilter] = useState('all');
  const [careLogs, setCareLogs] = useState([]);
  const [adlLogs, setAdlLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const effectiveCaregiverId = caregiverId || userProfile?.id || userProfile?.uid || user?.uid;
  const clientId = selectedClient?.id || selectedClient?.clientId;

  // Load care logs and ADL logs
  const loadActivityData = useCallback(async () => {
    if (!effectiveCaregiverId) return;
    setLoading(true);
    try {
      const [logsResult, adlResult] = await Promise.all([
        // Care logs by caregiver
        (async () => {
          try {
            const q = query(
              collection(db, 'careLogs'),
              where('caregiverId', '==', effectiveCaregiverId)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'careLogs' }));
          } catch { return []; }
        })(),
        // ADL logs by caregiver
        (async () => {
          try {
            const q = query(
              collection(db, 'adlLogs'),
              where('caregiverId', '==', effectiveCaregiverId)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'adlLogs' }));
          } catch { return []; }
        })(),
      ]);

      setCareLogs(logsResult);
      setAdlLogs(adlResult);
    } catch (err) {
      console.error('Error loading activity data:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveCaregiverId]);

  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

  // Merge all activity sources into a unified timeline
  const mergedTimeline = useMemo(() => {
    const items = [];

    // Tasks
    recentTasks.forEach(task => {
      const time = toDate(task.scheduledTime || task.dueDate || task.time || task.createdAt);
      items.push({
        id: task.id,
        type: 'task',
        title: task.title || task.type || 'Task',
        description: task.description,
        clientName: task.client || task.clientName || 'Client',
        clientId: task.clientId,
        status: task.status || 'pending',
        priority: task.priority,
        time,
        photos: task.photos,
        notes: task.completionNotes || task.notes,
        _source: 'tasks',
      });
    });

    // Care logs (includes vitals)
    careLogs.forEach(log => {
      const isVitals = log.logType === 'vitals' || log.bloodPressure || log.heartRate || log.temperature;
      items.push({
        id: log.id,
        type: isVitals ? 'vitals' : 'care-note',
        title: isVitals ? 'Vital Signs Recorded' : (log.activityDescription || log.observations || 'Care Note'),
        description: log.observations || log.concerns,
        clientName: log.clientName || 'Client',
        clientId: log.clientId,
        status: log.status || 'completed',
        mood: log.moodBehavior,
        time: toDate(log.logDate || log.createdAt) || toDate(log.createdAt),
        photos: log.photos,
        // Vitals-specific
        bloodPressure: log.bloodPressure,
        heartRate: log.heartRate,
        temperature: log.temperature,
        respiratoryRate: log.respiratoryRate,
        oxygenSat: log.oxygenSaturation,
        bloodSugar: log.bloodSugar,
        painLevel: log.painLevel,
        weight: log.weight,
        _source: log._source,
      });
    });

    // ADL logs
    adlLogs.forEach(log => {
      items.push({
        id: log.id,
        type: 'adl',
        title: log.activityName || 'ADL Activity',
        description: log.notes,
        clientName: log.clientName || 'Client',
        clientId: log.clientId,
        status: log.status || 'completed',
        adlCategory: log.category,
        time: toDate(log.timestamp || log.createdAt),
        photos: log.photos,
        _source: log._source,
      });
    });

    // Sort by time, newest first
    items.sort((a, b) => {
      const aTime = a.time ? a.time.getTime() : 0;
      const bTime = b.time ? b.time.getTime() : 0;
      return bTime - aTime;
    });

    return items;
  }, [recentTasks, careLogs, adlLogs]);

  // Apply filter
  const filteredTimeline = useMemo(() => {
    if (filter === 'all') return mergedTimeline;
    return mergedTimeline.filter(item => item.type === filter);
  }, [mergedTimeline, filter]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayItems = mergedTimeline.filter(i => i.time && i.time >= today);
    return {
      total: mergedTimeline.length,
      today: todayItems.length,
      tasks: mergedTimeline.filter(i => i.type === 'task').length,
      careNotes: mergedTimeline.filter(i => i.type === 'care-note').length,
      adls: mergedTimeline.filter(i => i.type === 'adl').length,
      vitals: mergedTimeline.filter(i => i.type === 'vitals').length,
      pending: mergedTimeline.filter(i => i.type === 'task' && (i.status === 'pending' || i.status === 'assigned')).length,
    };
  }, [mergedTimeline]);

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderVitals = (item) => {
    const vitals = [];
    if (item.bloodPressure) vitals.push({ label: 'BP', value: item.bloodPressure });
    if (item.heartRate) vitals.push({ label: 'HR', value: `${item.heartRate} bpm` });
    if (item.temperature) vitals.push({ label: 'Temp', value: `${item.temperature}°C` });
    if (item.respiratoryRate) vitals.push({ label: 'RR', value: item.respiratoryRate });
    if (item.oxygenSat) vitals.push({ label: 'O₂', value: `${item.oxygenSat}%` });
    if (item.bloodSugar) vitals.push({ label: 'BS', value: `${item.bloodSugar} mg/dL` });
    if (item.painLevel) vitals.push({ label: 'Pain', value: `${item.painLevel}/10` });
    if (item.weight) vitals.push({ label: 'Wt', value: `${item.weight} kg` });

    if (vitals.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {vitals.map(v => (
          <span key={v.label} className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-red-50 text-red-700 border border-red-200">
            <span className="font-semibold mr-1">{v.label}:</span>{v.value}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Today</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.today}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Tasks</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">{stats.tasks}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Notes</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.careNotes}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">ADLs</p>
          <p className="text-lg sm:text-xl font-bold text-purple-600">{stats.adls}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Pending</p>
          <p className="text-lg sm:text-xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
      </div>

      {/* ── Client selector + Log button ── */}
      <div className="cm-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
            <select
              value={clientId || ''}
              onChange={(e) => {
                const c = assignedClients.find(c => c.id === e.target.value);
                onSelectClient(c || null);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All clients</option>
              {assignedClients.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.fullName || 'Unknown'}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (!selectedClient) {
                toast.error('Please select a client first');
                return;
              }
              onLogActivity();
            }}
            disabled={!selectedClient}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition flex-shrink-0 ${
              selectedClient
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus className="h-4 w-4" />
            Log Activity
          </button>
        </div>
      </div>

      {/* ── Filter chips + Timeline ── */}
      <div className="cm-card overflow-hidden flex flex-col">
        {/* Sticky filter bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto"
             style={{ scrollbarWidth: 'thin' }}
        >
          {FILTER_CHIPS.map(chip => {
            const Icon = chip.icon;
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition flex-shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Timeline — scrollable */}
        <div
          className="overflow-y-auto px-4 sm:px-6 py-4"
          style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '200px', scrollbarWidth: 'thin' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="text-center text-gray-400 py-8 sm:py-12">
              <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2" />
              <p className="text-sm sm:text-base font-medium">No activities logged yet</p>
              <p className="text-xs sm:text-sm mt-1">Select a client and tap "Log Activity" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTimeline.map((item, index) => {
                const meta = TYPE_META[item.type] || TYPE_META['care-note'];
                const Icon = meta.icon;
                const isOverdue = item.type === 'task' && item.status !== 'completed' && item.time && item.time < new Date();

                return (
                  <div
                    key={`${item._source}-${item.id}`}
                    className={`flex gap-3 ${index !== filteredTimeline.length - 1 ? 'pb-3 border-b border-gray-100' : ''}`}
                  >
                    {/* Type icon */}
                    <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                            {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.clientName}
                            </span>
                            {item.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(item.time)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                          {isOverdue ? 'Overdue' : item.status}
                        </span>
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1.5 line-clamp-2">{item.description}</p>
                      )}

                      {/* Vitals display */}
                      {item.type === 'vitals' && renderVitals(item)}

                      {/* ADL category */}
                      {item.type === 'adl' && item.adlCategory && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-purple-50 text-purple-700 mt-1.5">
                          {item.adlCategory.replace(/-/g, ' ')}
                        </span>
                      )}

                      {/* Mood */}
                      {item.mood && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-blue-50 text-blue-700 mt-1.5 ml-1.5">
                          Mood: {item.mood}
                        </span>
                      )}

                      {/* Photos */}
                      {item.photos && item.photos.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {item.photos.slice(0, 4).map((photo, idx) => (
                            <img
                              key={idx}
                              src={typeof photo === 'string' ? photo : photo.url || photo.preview}
                              alt={`Photo ${idx + 1}`}
                              className="h-12 w-12 object-cover rounded-md border border-gray-200"
                            />
                          ))}
                          {item.photos.length > 4 && (
                            <div className="h-12 w-12 rounded-md border border-gray-200 flex items-center justify-center text-xs text-gray-500 bg-gray-50">
                              +{item.photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareActivityTab;

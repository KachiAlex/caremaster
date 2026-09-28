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
  { id: 'clinical-note', label: 'Clinical Notes', icon: FileText },
  { id: 'medication', label: 'Medications', icon: Pill },
  { id: 'adl', label: 'ADLs', icon: Activity },
  { id: 'vitals', label: 'Vitals', icon: Heart },
];

const DATE_RANGES = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

const ROLE_LABELS = {
  caregiver: 'Caregiver',
  nurse: 'Nurse',
  doctor: 'Doctor',
  pharmacist: 'Pharmacist',
  admin: 'Admin',
  'super-admin': 'Super Admin',
};

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
  'clinical-note': { label: 'Clinical Note', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-400' },
  medication: { label: 'Medication', icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-400' },
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
  // When true (embedded in the client profile), show activity from ALL
  // personnel who logged for this client — not just the viewing caregiver.
  clientScoped = false,
  // Institution user directory [{id, name, role}] for author attribution.
  staffDirectory = [],
}) => {
  const { userProfile, user } = useUser();
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [personnelFilter, setPersonnelFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [careLogs, setCareLogs] = useState([]);
  const [adlLogs, setAdlLogs] = useState([]);
  const [medLogs, setMedLogs] = useState([]);
  const [clientNotes, setClientNotes] = useState([]);
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

  // Fetch all institution users once so log entries can resolve who wrote them
  const [directory, setDirectory] = useState(staffDirectory);
  useEffect(() => {
    if (staffDirectory.length > 0) {
      setDirectory(staffDirectory);
      return;
    }
    if (!institutionId) return;
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'users'),
          where('institutionId', '==', institutionId)
        ));
        setDirectory(snap.docs.map(d => {
          const u = d.data();
          return {
            id: d.id,
            name: u.name || u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
            role: u.userType || u.type || u.role || 'staff',
          };
        }));
      } catch { /* directory is best-effort */ }
    })();
  }, [staffDirectory, institutionId]);

  const resolveAuthor = useCallback((...ids) => {
    for (const id of ids) {
      if (!id) continue;
      const person = directory.find(p => p.id === id);
      if (person) return person;
    }
    return null;
  }, [directory]);

  // Load activity data. In clientScoped mode (client profile view) fetch every
  // personnel's logs for this client; otherwise fetch the viewing caregiver's.
  const loadActivityData = useCallback(async () => {
    if (clientScoped ? !clientId : !effectiveCaregiverId) return;
    setLoading(true);
    const scopeWhere = clientScoped
      ? where('clientId', '==', clientId)
      : where('caregiverId', '==', effectiveCaregiverId);
    try {
      const fetchColl = async (coll) => {
        try {
          const snap = await getDocs(query(collection(db, coll), scopeWhere));
          return snap.docs.map(d => ({ id: d.id, ...d.data(), _source: coll }));
        } catch { return []; }
      };
      const [logsResult, adlResult, medResult, noteResult] = await Promise.all([
        fetchColl('careLogs'),
        fetchColl('adlLogs'),
        fetchColl('medicationLogs'),
        fetchColl('clientActivities'),
      ]);

      setCareLogs(logsResult);
      setAdlLogs(adlResult);
      setMedLogs(medResult);
      setClientNotes(noteResult);
    } catch (err) {
      console.error('Error loading activity data:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveCaregiverId, clientScoped, clientId]);

  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

  // Merge all activity sources into a unified timeline
  const mergedTimeline = useMemo(() => {
    const items = [];

    // Tasks
    recentTasks.forEach(task => {
      const time = toDate(task.scheduledTime || task.dueDate || task.time || task.createdAt);
      const author = resolveAuthor(task.caregiverId, task.assignedTo, task.createdBy);
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
        authorName: task.caregiverName || author?.name,
        authorRole: author?.role,
        _source: 'tasks',
      });
    });

    // Care logs (includes vitals). New writes put the rich payload into the
    // `details` jsonb column; legacy rows only carry caregiver_id + created_at.
    careLogs.forEach(log => {
      const d = log.details || {};
      const vitals = d.vitals || {};
      const isVitals = log.category === 'vitals' || d.logType === 'vitals' || log.logType === 'vitals'
        || log.bloodPressure || log.heartRate || log.temperature || vitals.bloodPressure;
      const author = resolveAuthor(log.caregiverId, log.recordedBy);
      items.push({
        id: log.id,
        type: isVitals ? 'vitals' : 'care-note',
        title: isVitals ? 'Vital Signs Recorded' : (d.activityDescription || log.activityDescription || log.observations || log.notes || 'Care Note'),
        description: log.notes || log.observations || log.concerns || d.observations || d.concerns,
        clientName: log.clientName || d.clientName || 'Client',
        clientId: log.clientId || log.patientId,
        status: log.status || 'completed',
        mood: log.mood || log.moodBehavior,
        time: toDate(log.logTime) || toDate(log.logDate) || toDate(log.createdAt),
        photos: d.photos || log.photos,
        authorName: d.caregiverName || log.caregiverName || author?.name,
        authorRole: d.roleType || author?.role || log.source,
        // Vitals-specific (new writes nest under details.vitals)
        bloodPressure: log.bloodPressure || vitals.bloodPressure,
        heartRate: log.heartRate || vitals.heartRate,
        temperature: log.temperature || vitals.temperature,
        respiratoryRate: log.respiratoryRate || vitals.respiratoryRate,
        oxygenSat: log.oxygenSaturation || vitals.oxygenSaturation,
        bloodSugar: log.bloodSugar || vitals.bloodSugar,
        painLevel: log.painLevel ?? vitals.painLevel,
        weight: log.weight || vitals.weight,
        _source: log._source,
      });
    });

    // ADL logs
    adlLogs.forEach(log => {
      const author = resolveAuthor(log.caregiverId, log.recordedBy);
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
        photos: log.photos || log.metadata?.photos,
        authorName: log.caregiverName || log.metadata?.caregiverName || author?.name,
        authorRole: author?.role,
        _source: log._source,
      });
    });

    // Medication administration (MAR) entries
    medLogs.forEach(log => {
      const author = resolveAuthor(log.recordedBy, log.caregiverId);
      const st = (log.status || 'administered').toLowerCase();
      items.push({
        id: log.id,
        type: 'medication',
        title: `${log.medicationName || 'Medication'} — ${st.charAt(0).toUpperCase() + st.slice(1)}`,
        description: [log.dosage, log.notes].filter(Boolean).join(' · '),
        clientName: log.clientName || 'Client',
        clientId: log.clientId || log.patientId,
        status: st === 'administered' ? 'completed' : st,
        time: toDate(log.takenTime || log.scheduledTime || log.createdAt),
        authorName: author?.name,
        authorRole: author?.role || log.source,
        _source: log._source,
      });
    });

    // Clinical notes (client_activities feed)
    clientNotes.forEach(note => {
      const meta = note.metadata || {};
      const author = resolveAuthor(note.performedBy);
      items.push({
        id: note.id,
        type: 'clinical-note',
        title: meta.noteType ? `${meta.noteType} note` : 'Clinical Note',
        description: note.description,
        clientName: note.clientName || 'Client',
        clientId: note.clientId || note.patientId,
        status: 'completed',
        time: toDate(note.createdAt),
        authorName: meta.authorName || meta.performedByName || author?.name,
        authorRole: meta.authorRole || author?.role,
        _source: note._source,
      });
    });

    // Sort by time, newest first
    items.sort((a, b) => {
      const aTime = a.time ? a.time.getTime() : 0;
      const bTime = b.time ? b.time.getTime() : 0;
      return bTime - aTime;
    });

    return items;
  }, [recentTasks, careLogs, adlLogs, medLogs, clientNotes, resolveAuthor]);

  // Distinct roles + personnel present in the data (for the filter dropdowns)
  const roleOptions = useMemo(() => {
    const roles = new Set();
    mergedTimeline.forEach(i => i.authorRole && roles.add(i.authorRole));
    return Array.from(roles);
  }, [mergedTimeline]);

  const personnelOptions = useMemo(() => {
    const names = new Set();
    mergedTimeline.forEach(i => i.authorName && names.add(i.authorName));
    return Array.from(names).sort();
  }, [mergedTimeline]);

  // Apply type + role + personnel + date filters
  const filteredTimeline = useMemo(() => {
    let items = mergedTimeline;
    if (filter !== 'all') items = items.filter(item => item.type === filter);
    if (roleFilter !== 'all') items = items.filter(item => item.authorRole === roleFilter);
    if (personnelFilter !== 'all') items = items.filter(item => item.authorName === personnelFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      let start = null;
      if (dateFilter === 'today') {
        start = new Date(now); start.setHours(0, 0, 0, 0);
      } else if (dateFilter === '7d') {
        start = new Date(now.getTime() - 7 * 86400000);
      } else if (dateFilter === '30d') {
        start = new Date(now.getTime() - 30 * 86400000);
      }
      if (start) items = items.filter(item => item.time && item.time >= start);
    }
    return items;
  }, [mergedTimeline, filter, roleFilter, personnelFilter, dateFilter]);

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
    const opts = {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    };
    // Include the year for entries older than ~6 months
    if (Date.now() - date.getTime() > 180 * 86400000) opts.year = 'numeric';
    return date.toLocaleString('en-US', opts);
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
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
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
          {/* Role / personnel / date filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={personnelFilter}
              onChange={(e) => setPersonnelFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700"
            >
              <option value="all">All personnel</option>
              {personnelOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700"
            >
              <option value="all">All roles</option>
              {roleOptions.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700"
            >
              {DATE_RANGES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
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
                            {(item.authorName || item.authorRole) && (
                              <span className="flex items-center gap-1 text-gray-600 font-medium">
                                by {item.authorName || 'Staff'}
                                {item.authorRole && (
                                  <span className="text-gray-400 font-normal">· {ROLE_LABELS[item.authorRole] || item.authorRole}</span>
                                )}
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

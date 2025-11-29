/**
 * Client Log Viewer Component
 * 
 * Displays comprehensive Client logs with clinician information,
 * date, time, and action details
 * 
 * @component
 * @param {string} clientId - The Client's document ID
 * @param {string} clientName - The Client's name for display
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Clock,
  User,
  Activity,
  Filter,
  Calendar,
  Search,
  FileText,
  Heart,
  Pill,
  Stethoscope,
  ClipboardList,
  UserCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getPatientLogs, getLogsByCategory } from '../utils/patientLogger';

const PatientLogViewer = ({ clientId, clientName = 'Client' }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [limit, setLimit] = useState(50);

  const categories = [
    { value: 'all', label: 'All Logs', icon: Activity, color: 'slate' },
    { value: 'vital_signs', label: 'Vital Signs', icon: Heart, color: 'red' },
    { value: 'medication', label: 'Medications', icon: Pill, color: 'blue' },
    { value: 'consultation', label: 'Consultations', icon: Stethoscope, color: 'green' },
    { value: 'care_plan', label: 'Care Plans', icon: ClipboardList, color: 'purple' },
    { value: 'profile', label: 'Profile Updates', icon: UserCircle, color: 'amber' },
    { value: 'registration', label: 'Registration', icon: User, color: 'emerald' },
    { value: 'general', label: 'General', icon: FileText, color: 'gray' }
  ];

  useEffect(() => {
    loadLogs();
  }, [clientId, selectedCategory, limit]);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, logs]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let loadedLogs;
      
      if (selectedCategory === 'all') {
        loadedLogs = await getPatientLogs(clientId, limit);
      } else {
        loadedLogs = await getLogsByCategory(clientId, selectedCategory, limit);
      }
      
      setLogs(loadedLogs);
      setFilteredLogs(loadedLogs);
    } catch (error) {
      console.error('Error loading Client logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (!searchTerm.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = logs.filter(log => 
      log.clinicianName?.toLowerCase().includes(searchLower) ||
      log.description?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.category?.toLowerCase().includes(searchLower)
    );
    
    setFilteredLogs(filtered);
  };

  const toggleExpand = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getCategoryInfo = (category) => {
    return categories.find(c => c.value === category) || categories[0];
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-950 rounded-3xl border border-slate-800/80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Client logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 shadow-xl shadow-black/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-50">
              Client Logs
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {clientName && `${clientName} • `}Complete activity history
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{filteredLogs.length}</div>
            <div className="text-xs text-slate-400">Total Logs</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by clinician, action, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm appearance-none"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-slate-900">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 shadow-xl shadow-black/50 p-12 text-center">
            <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No logs found</p>
            {searchTerm && (
              <p className="text-xs text-slate-500 mt-2">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const categoryInfo = getCategoryInfo(log.category);
            const CategoryIcon = categoryInfo.icon;
            const isExpanded = expandedLogs.has(log.id);

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/60 shadow-lg shadow-black/40 overflow-hidden"
              >
                {/* Log Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-900/40 transition-colors"
                  onClick={() => toggleExpand(log.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Category Icon */}
                      <div className={`p-2 rounded-lg bg-${categoryInfo.color}-500/20 border border-${categoryInfo.color}-500/30`}>
                        <CategoryIcon className={`h-4 w-4 text-${categoryInfo.color}-300`} />
                      </div>

                      {/* Log Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-slate-50 truncate">
                            {log.description || log.action}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${categoryInfo.color}-500/20 text-${categoryInfo.color}-300 border border-${categoryInfo.color}-500/30`}>
                            {categoryInfo.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{log.clinicianName || 'Unknown Clinician'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">•</span>
                            <span className="capitalize">{log.clinicianRole || 'Unknown Role'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(log.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <button className="ml-2 p-1 text-slate-400 hover:text-slate-200">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-800/60 bg-slate-900/40 p-4 space-y-3">
                    {/* Action Details */}
                    <div>
                      <div className="text-xs font-medium text-slate-400 mb-1">Action</div>
                      <div className="text-sm text-slate-200 font-mono">{log.action}</div>
                    </div>

                    {/* Details Object */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-2">Details</div>
                        <div className="bg-slate-900/60 rounded-lg p-3">
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Timestamp Information */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-1">Date</div>
                        <div className="text-xs text-slate-300">{formatDate(log.date)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-1">Time</div>
                        <div className="text-xs text-slate-300">{formatTime(log.time)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-1">Severity</div>
                        <div className={`text-xs capitalize px-2 py-0.5 rounded inline-block ${
                          log.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                          log.severity === 'warning' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {log.severity || 'info'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-1">Source</div>
                        <div className="text-xs text-slate-300 capitalize">{log.source || 'web_app'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {filteredLogs.length >= limit && (
        <div className="text-center">
          <button
            onClick={() => setLimit(limit + 50)}
            className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
          >
            Load More Logs
          </button>
        </div>
      )}
    </div>
  );
};

PatientLogViewer.propTypes = {
  clientId: PropTypes.string.isRequired,
  clientName: PropTypes.string
};

export default PatientLogViewer;


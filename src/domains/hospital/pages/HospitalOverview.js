import React, { useState, useEffect } from 'react';
import {
  Bed, 
  Users, 
  AlertTriangle, 
  Activity, 
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Filter,
  Search,
  Clock,
  MapPin,
  User,
  X,
  Download,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import HospitalShell from '../components/HospitalShell.jsx';
import { HospitalProvider, useHospitalContext } from '../context/HospitalContext';
import useHospitalOperations from '../hooks/useHospitalOperations';
import { hospitalOperationsAPI } from '../api/hospitalOperationsAPI';
import { useUser } from '../../../contexts/UserContext';
import { exportBedStatus, exportIncidents, exportHospitalSummary } from '../../../utils/hospitalOperationsExporter';
import { startHospitalMonitoring } from '../../../utils/hospitalNotifications';

const HospitalOverviewContent = () => {
  const { selectedHospitalId, setSelectedHospitalId, selectedDateRange, setSelectedDateRange, availableHospitals, setAvailableHospitals } = useHospitalContext();
  const { userProfile } = useUser();
  const { 
    summary, 
    bedStatus, 
    incidentFeed, 
    loading, 
    bedLoading, 
    incidentLoading,
    error,
    fetchBedStatus,
    fetchIncidentFeed,
    refreshSummary,
    createIncident
  } = useHospitalOperations();
  
  const [bedFilters, setBedFilters] = useState({ status: '', department: '' });
  const [incidentFilters, setIncidentFilters] = useState({ status: 'open', limit: 10 });
  const [showBedModal, setShowBedModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [bedForm, setBedForm] = useState({
    bedNumber: '',
    department: '',
    floor: '',
    unit: '',
    status: 'available',
    roomType: '',
    notes: ''
  });
  const [incidentForm, setIncidentForm] = useState({
    type: '',
    severity: 'medium',
    description: '',
    location: '',
    department: '',
    reportedBy: userProfile?.name || userProfile?.displayName || '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Load hospitals list if super admin
  useEffect(() => {
    const loadHospitals = async () => {
      if (userProfile?.userType === 'super-admin' || userProfile?.superAdmin) {
        try {
          const hospitals = await hospitalOperationsAPI.getHospitals();
          setAvailableHospitals(hospitals);
        } catch (err) {
          console.error('Error loading hospitals:', err);
        }
      }
    };
    loadHospitals();
  }, [userProfile, setAvailableHospitals]);

  // Load bed status and incidents on mount
  useEffect(() => {
    if (selectedHospitalId) {
      fetchBedStatus(bedFilters);
      fetchIncidentFeed(incidentFilters);
    }
    // Note: fetchBedStatus and fetchIncidentFeed are stable callbacks from useHospitalOperations hook
    // eslint-disable-next-line
  }, [selectedHospitalId]);

  // Start monitoring hospital operations notifications
  useEffect(() => {
    if (!selectedHospitalId) return;

    const unsubscribe = startHospitalMonitoring(selectedHospitalId, {
      bedThreshold: 5, // Alert when less than 5 beds available
      onBedShortage: (alert) => {
        toast.warning(alert.message, { autoClose: 10000 });
      },
      onCriticalIncident: (alert) => {
        toast.error(alert.message, { autoClose: 15000 });
      },
      onShiftConflict: (alert) => {
        toast.warning(alert.message, { autoClose: 10000 });
      },
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedHospitalId]);

  const handleRefresh = () => {
    refreshSummary();
    fetchBedStatus(bedFilters);
    fetchIncidentFeed(incidentFilters);
    toast.info('Refreshing data...');
  };

  const handleExportBeds = () => {
    if (!bedStatus?.beds || bedStatus.beds.length === 0) {
      toast.warning('No bed data to export');
      return;
    }
    exportBedStatus(bedStatus.beds);
    toast.success('Bed status exported successfully');
  };

  const handleExportIncidents = () => {
    if (!incidentFeed?.incidents || incidentFeed.incidents.length === 0) {
      toast.warning('No incident data to export');
      return;
    }
    exportIncidents(incidentFeed.incidents);
    toast.success('Incidents exported successfully');
  };

  const handleExportSummary = () => {
    if (!summary || !bedStatus || !incidentFeed) {
      toast.warning('No data available to export');
      return;
    }
    exportHospitalSummary(summary, bedStatus.beds || [], incidentFeed.incidents || []);
    toast.success('Hospital summary exported successfully');
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    if (!bedForm.bedNumber || !bedForm.department) {
      toast.error('Please fill in bed number and department');
      return;
    }

    setSubmitting(true);
    try {
      await hospitalOperationsAPI.createBed({
        ...bedForm,
        institutionId: selectedHospitalId,
        bedNumber: bedForm.bedNumber.trim(),
        department: bedForm.department.trim(),
        floor: bedForm.floor ? parseInt(bedForm.floor) : null,
        roomType: bedForm.roomType || 'standard',
      });
      toast.success('Bed added successfully');
      setShowBedModal(false);
      setBedForm({
        bedNumber: '',
        department: '',
        floor: '',
        unit: '',
        status: 'available',
        roomType: '',
        notes: ''
      });
      fetchBedStatus(bedFilters);
      refreshSummary();
    } catch (err) {
      console.error('Error adding bed:', err);
      toast.error('Failed to add bed: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.type || !incidentForm.description) {
      toast.error('Please fill in incident type and description');
      return;
    }

    setSubmitting(true);
    try {
      await createIncident({
        ...incidentForm,
        reportedBy: userProfile?.name || userProfile?.displayName || 'Unknown',
        reportedById: userProfile?.uid || userProfile?.id,
      });
      toast.success('Incident reported successfully');
      setShowIncidentModal(false);
      setIncidentForm({
        type: '',
        severity: 'medium',
        description: '',
        location: '',
        department: '',
        reportedBy: userProfile?.name || userProfile?.displayName || '',
        notes: ''
      });
    } catch (err) {
      console.error('Error reporting incident:', err);
      toast.error('Failed to report incident: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'occupied':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'available':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'reserved':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'maintenance':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    if (date instanceof Date) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-800/60 text-slate-300 rounded-lg hover:bg-slate-700/60 border border-slate-700/60 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
        <button
          onClick={() => setShowBedModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Bed
        </button>
        <button
          onClick={() => setShowIncidentModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Report Incident
        </button>
        <div className="flex gap-2 border-l border-slate-700/60 pl-2">
          <button onClick={handleExportBeds} className="px-4 py-2 bg-slate-800/60 text-slate-300 rounded-lg hover:bg-slate-700/60 border border-slate-700/60 flex items-center gap-2 transition-colors" title="Export Bed Status">
            <Download className="h-4 w-4" /> Export Beds
          </button>
          <button onClick={handleExportIncidents} className="px-4 py-2 bg-slate-800/60 text-slate-300 rounded-lg hover:bg-slate-700/60 border border-slate-700/60 flex items-center gap-2 transition-colors" title="Export Incidents">
            <Download className="h-4 w-4" /> Export Incidents
          </button>
          <button onClick={handleExportSummary} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors" title="Export Full Summary">
            <FileText className="h-4 w-4" /> Export Summary
          </button>
        </div>
      </div>

      {/* Hospital Selector (for super admin) */}
      {availableHospitals.length > 0 && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-4 shadow-xl shadow-black/50">
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Hospital</label>
          <select
            value={selectedHospitalId || ''}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select a hospital...</option>
            {availableHospitals.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.name || hospital.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-4 shadow-xl shadow-black/50">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
            <input
              type="date"
              value={selectedDateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDateRange({ ...selectedDateRange, start: new Date(e.target.value) })}
              className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
            <input
              type="date"
              value={selectedDateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDateRange({ ...selectedDateRange, end: new Date(e.target.value) })}
              className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-3xl border border-red-500/50 bg-red-500/10 p-4 shadow-xl shadow-black/50">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Error: {error}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Bed Capacity</p>
            <Bed className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-50">
            {loading ? '—' : summary?.bedCapacity || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total beds</p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Occupied</p>
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-50">
            {loading ? '—' : summary?.occupiedBeds || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.occupancyRate ? `${summary.occupancyRate}% occupancy` : '0% occupancy'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Open Incidents</p>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-50">
            {loading ? '—' : summary?.incidentsOpen || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Requires attention</p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Staff On Duty</p>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-50">
            {loading ? '—' : summary?.staffOnDuty || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Active staff</p>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Client Census</p>
            <User className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-50">
            {loading ? '—' : summary?.patientCensus || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Active clients</p>
        </div>
      </div>

      {/* Bed Status Table */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
              <Bed className="h-5 w-5 text-emerald-400" />
              Bed Status
            </h2>
            <p className="text-sm text-slate-400 mt-1">Monitor bed availability and occupancy</p>
          </div>
          <div className="flex gap-2">
            <select
              value={bedFilters.status}
              onChange={(e) => {
                const newFilters = { ...bedFilters, status: e.target.value };
                setBedFilters(newFilters);
                fetchBedStatus(newFilters);
              }}
              className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <input
              type="text"
              placeholder="Filter by department..."
              value={bedFilters.department}
              onChange={(e) => {
                const newFilters = { ...bedFilters, department: e.target.value };
                setBedFilters(newFilters);
                fetchBedStatus(newFilters);
              }}
              className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 text-sm placeholder-slate-500 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {bedLoading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading bed status...
            </div>
          ) : bedStatus?.beds?.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-800/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Bed Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Floor/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bedStatus.beds.map((bed) => (
                  <tr key={bed.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-50">{bed.bedNumber || bed.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{bed.department || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {bed.floor ? `Floor ${bed.floor}` : ''} {bed.unit ? `- ${bed.unit}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(bed.status)}`}>
                        {bed.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {bed.clientName || bed.clientId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {bed.lastUpdated ? formatTime(bed.lastUpdated) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <Bed className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No beds found. Add beds to start tracking.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Recent Incidents
            </h2>
            <p className="text-sm text-slate-400 mt-1">Track and manage hospital incidents</p>
          </div>
          <select
            value={incidentFilters.status}
            onChange={(e) => {
              const newFilters = { ...incidentFilters, status: e.target.value };
              setIncidentFilters(newFilters);
              fetchIncidentFeed(newFilters);
            }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 text-sm focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="p-6">
          {incidentLoading ? (
            <div className="text-center text-slate-400 py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading incidents...
            </div>
          ) : incidentFeed?.incidents?.length > 0 ? (
            <div className="space-y-4">
              {incidentFeed.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(incident.severity)}`}>
                          {incident.severity || 'Unknown'}
                        </span>
                        <span className="text-sm font-medium text-slate-50">{incident.type || 'Incident'}</span>
                        {incident.location && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {incident.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{incident.description || 'No description'}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {incident.reportedBy && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {incident.reportedBy}
                          </span>
                        )}
                        {incident.reportedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(incident.reportedAt)} {formatTime(incident.reportedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(incident.status)}`}>
                      {incident.status || 'open'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No incidents found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Bed Modal */}
      {showBedModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
                <Bed className="h-5 w-5 text-emerald-400" />
                Add New Bed
              </h3>
              <button
                onClick={() => setShowBedModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddBed} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bed Number *</label>
                <input
                  type="text"
                  value={bedForm.bedNumber}
                  onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., 101, A-12"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Department *</label>
                <input
                  type="text"
                  value={bedForm.department}
                  onChange={(e) => setBedForm({ ...bedForm, department: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Emergency, ICU, General"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Floor</label>
                  <input
                    type="number"
                    value={bedForm.floor}
                    onChange={(e) => setBedForm({ ...bedForm, floor: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Floor number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={bedForm.unit}
                    onChange={(e) => setBedForm({ ...bedForm, unit: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., A, B, ICU-A"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Type</label>
                <select
                  value={bedForm.roomType}
                  onChange={(e) => setBedForm({ ...bedForm, roomType: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="standard">Standard</option>
                  <option value="private">Private</option>
                  <option value="semi-private">Semi-Private</option>
                  <option value="icu">ICU</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Initial Status</label>
                <select
                  value={bedForm.status}
                  onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={bedForm.notes}
                  onChange={(e) => setBedForm({ ...bedForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="3"
                  placeholder="Additional notes about this bed..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBedModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Adding...' : 'Add Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Report Incident
              </h3>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleReportIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Incident Type *</label>
                <select
                  value={incidentForm.type}
                  onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="Safety">Safety</option>
                  <option value="Medical">Medical</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Security">Security</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Severity *</label>
                <select
                  value={incidentForm.severity}
                  onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                <textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="4"
                  placeholder="Describe the incident in detail..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Room 101, Floor 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={incidentForm.department}
                    onChange={(e) => setIncidentForm({ ...incidentForm, department: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., Emergency, ICU"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Additional Notes</label>
                <textarea
                  value={incidentForm.notes}
                  onChange={(e) => setIncidentForm({ ...incidentForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="3"
                  placeholder="Any additional information..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Reporting...' : 'Report Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const HospitalOverview = () => (
  <HospitalProvider>
    <HospitalShell
      title="Hospital Operations Overview"
      subtitle="Monitor occupancy, incidents, and staffing at a glance."
    >
      <HospitalOverviewContent />
    </HospitalShell>
  </HospitalProvider>
);

export default HospitalOverview;


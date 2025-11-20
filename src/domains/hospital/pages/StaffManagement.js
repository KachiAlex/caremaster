import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Search,
  Filter,
  UserPlus,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import HospitalShell from '../components/HospitalShell.jsx';
import { HospitalProvider, useHospitalContext } from '../context/HospitalContext';
import useStaffManagement from '../hooks/useStaffManagement';
import { useUser } from '../../../contexts/UserContext';

const StaffManagementContent = () => {
  const { selectedHospitalId } = useHospitalContext();
  const { userProfile } = useUser();
  const {
    staff,
    shifts,
    loading,
    shiftLoading,
    error,
    filters,
    setFilters,
    fetchShiftCalendar,
    subscribeToShifts,
    assignShift,
    updateShift,
    deleteShift,
    updateStaffMember,
    getStaffMember,
    refreshStaff
  } = useStaffManagement();

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'shifts'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    staffId: '',
    staffName: '',
    startTime: '',
    endTime: '',
    department: '',
    role: '',
    notes: ''
  });

  // Update filters when search term changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters({ ...filters, searchTerm });
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, filters, setFilters]);

  // Real-time shift subscription when shifts tab is active
  useEffect(() => {
    if (activeTab === 'shifts' && selectedHospitalId) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days
      
      const unsubscribe = subscribeToShifts({ startDate, endDate });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [activeTab, selectedHospitalId, subscribeToShifts]);

  const handleAssignShift = async (e) => {
    e.preventDefault();
    if (!shiftForm.staffId || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await assignShift({
        ...shiftForm,
        startTime: new Date(shiftForm.startTime),
        endTime: new Date(shiftForm.endTime),
      });
      toast.success('Shift assigned successfully');
      setShowShiftModal(false);
      setShiftForm({
        staffId: '',
        staffName: '',
        startTime: '',
        endTime: '',
        department: '',
        role: '',
        notes: ''
      });
    } catch (err) {
      toast.error('Failed to assign shift: ' + err.message);
    }
  };

  const handleViewStaff = async (staffId) => {
    try {
      const staffMember = await getStaffMember(staffId);
      setSelectedStaff(staffMember);
      setShowStaffModal(true);
    } catch (err) {
      toast.error('Failed to load staff details: ' + err.message);
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'doctor':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'nurse':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'caregiver':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'admin':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
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
      {/* Error Display */}
      {error && (
        <div className="rounded-3xl border border-red-500/50 bg-red-500/10 p-4 shadow-xl shadow-black/50">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
        <div className="flex border-b border-slate-800/60">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'directory'
                ? 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Staff Directory
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'shifts'
                ? 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Shift Calendar
          </button>
        </div>

        {/* Staff Directory Tab */}
        {activeTab === 'directory' && (
          <div className="p-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, or qualification..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={filters.role || ''}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Roles</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="caregiver">Caregiver</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={filters.status || 'active'}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="">All Status</option>
              </select>
              <button
                onClick={refreshStaff}
                className="px-4 py-2 bg-slate-800/60 text-slate-300 rounded-lg hover:bg-slate-700/60 border border-slate-700/60 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {/* Staff Table */}
            {loading ? (
              <div className="text-center text-slate-400 py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading staff roster...
              </div>
            ) : staff.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-800/60">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Qualification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {staff.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-slate-900 font-semibold mr-3">
                              {(member.name || member.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-50">
                                {member.name || member.displayName || 'Unknown'}
                              </div>
                              {member.email && (
                                <div className="text-xs text-slate-400">{member.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(member.userType || member.role)}`}>
                            {member.userType || member.role || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {member.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {member.medicalQualification || member.specialization || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                            member.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : member.status === 'suspended'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                          }`}>
                            {member.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewStaff(member.id)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setShiftForm({ ...shiftForm, staffId: member.id, staffName: member.name || member.displayName });
                                setShowShiftModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Assign Shift"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No staff members found.</p>
              </div>
            )}
          </div>
        )}

        {/* Shift Calendar Tab */}
        {activeTab === 'shifts' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-50">Upcoming Shifts</h3>
              <button
                onClick={() => setShowShiftModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Assign Shift
              </button>
            </div>

            {shiftLoading ? (
              <div className="text-center text-slate-400 py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading shifts...
              </div>
            ) : shifts.length > 0 ? (
              <div className="space-y-4">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 hover:bg-slate-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-slate-50">{shift.staffName || 'Unknown Staff'}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(shift.role)}`}>
                            {shift.role || 'N/A'}
                          </span>
                          {shift.department && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {shift.department}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-300">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDate(shift.startTime)} {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </span>
                        </div>
                        {shift.notes && (
                          <p className="text-sm text-slate-400 mt-2">{shift.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                          shift.status === 'scheduled' 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : shift.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        }`}>
                          {shift.status || 'scheduled'}
                        </span>
                        <button
                          onClick={() => deleteShift(shift.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Shift"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No shifts scheduled.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shift Assignment Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-slate-50 mb-4">Assign Shift</h3>
            <form onSubmit={handleAssignShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Staff Member</label>
                <select
                  value={shiftForm.staffId}
                  onChange={(e) => {
                    const selected = staff.find(s => s.id === e.target.value);
                    setShiftForm({
                      ...shiftForm,
                      staffId: e.target.value,
                      staffName: selected?.name || selected?.displayName || '',
                      role: selected?.userType || selected?.role || '',
                      department: selected?.department || ''
                    });
                  }}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Select staff member...</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.displayName} ({member.userType || member.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={shiftForm.department}
                  onChange={(e) => setShiftForm({ ...shiftForm, department: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Emergency, ICU"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftModal(false);
                    setShiftForm({
                      staffId: '',
                      staffName: '',
                      startTime: '',
                      endTime: '',
                      department: '',
                      role: '',
                      notes: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl border border-slate-800/80 shadow-xl shadow-black/50 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-slate-50">Staff Details</h3>
              <button
                onClick={() => {
                  setShowStaffModal(false);
                  setSelectedStaff(null);
                }}
                className="text-slate-400 hover:text-slate-300"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-slate-50 font-medium">{selectedStaff.name || selectedStaff.displayName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Role</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(selectedStaff.userType || selectedStaff.role)}`}>
                    {selectedStaff.userType || selectedStaff.role || 'N/A'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-slate-50">{selectedStaff.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="text-slate-50">{selectedStaff.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Qualification</p>
                  <p className="text-slate-50">{selectedStaff.medicalQualification || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${
                    selectedStaff.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }`}>
                    {selectedStaff.status || 'unknown'}
                  </span>
                </div>
              </div>
              {selectedStaff.specialization && (
                <div>
                  <p className="text-sm text-slate-400">Specialization</p>
                  <p className="text-slate-50">{Array.isArray(selectedStaff.specialization) ? selectedStaff.specialization.join(', ') : selectedStaff.specialization}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StaffManagement = () => (
  <HospitalProvider>
    <HospitalShell
      title="Staff Management"
      subtitle="Coordinate care teams, shifts, and incident response."
    >
      <StaffManagementContent />
    </HospitalShell>
  </HospitalProvider>
);

export default StaffManagement;


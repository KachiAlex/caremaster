/**
 * Attendance Tracking Component
 * 
 * Phase 1 Implementation - Complete attendance tracking UI:
 * - Check-in/check-out for staff
 * - Attendance dashboard for admins
 * - Leave request management
 * - Attendance reports
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  TrendingUp,
  Users,
  AlertCircle,
  MapPin,
  LogIn,
  LogOut,
  FileText,
  Plus,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceByStaff,
  getAttendanceStats,
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequestStatus,
  ATTENDANCE_METHOD,
  ATTENDANCE_STATUS,
  LEAVE_TYPE,
  LEAVE_STATUS
} from '../api/attendanceAPI';

const AttendanceTracking = ({ staffId: propStaffId, viewMode = 'staff' }) => {
  const { user, userProfile, institutionId } = useUser();
  const staffId = propStaffId || user?.uid;
  const isAdmin = userProfile?.userType === 'admin' || userProfile?.type === 'admin';
  const canManageAttendance = isAdmin || viewMode === 'admin';

  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  // Check-in/out states
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  
  // Leave request states
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    leaveType: LEAVE_TYPE.SICK,
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: ''
  });
  
  // Filter states
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });
  const [selectedStaff, setSelectedStaff] = useState(staffId);

  useEffect(() => {
    if (!institutionId) return;
    
    loadTodayAttendance();
    loadAttendanceRecords();
    if (canManageAttendance) {
      loadStats();
      loadLeaveRequests();
    }
  }, [institutionId, staffId, dateRange, selectedStaff, canManageAttendance]);

  const loadTodayAttendance = async () => {
    if (!staffId || !institutionId) return;
    
    try {
      setLoading(true);
      const attendance = await getTodayAttendance(staffId, institutionId);
      setTodayAttendance(attendance);
    } catch (error) {
      console.error('Error loading today attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceRecords = async () => {
    if (!staffId || !institutionId) return;
    
    try {
      const records = await getAttendanceByStaff(staffId, institutionId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const loadStats = async () => {
    if (!institutionId) return;
    
    try {
      const statsData = await getAttendanceStats(
        institutionId,
        dateRange.startDate,
        dateRange.endDate
      );
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadLeaveRequests = async () => {
    if (!institutionId) return;
    
    try {
      const requests = await getLeaveRequests(institutionId, {
        staffId: canManageAttendance ? null : staffId
      });
      setLeaveRequests(requests);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!staffId || !institutionId) {
      toast.error('Staff ID and Institution ID are required');
      return;
    }

    try {
      setCheckingIn(true);
      const result = await checkIn(staffId, {
        institutionId,
        method: ATTENDANCE_METHOD.MANUAL,
        notes: checkInNotes,
        location: 'Office', // Could be enhanced with geolocation
        deviceInfo: navigator.userAgent
      });
      
      setTodayAttendance(result);
      setCheckInNotes('');
      toast.success(result.isLate ? 'Checked in (Late)' : 'Checked in successfully');
      loadAttendanceRecords();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!staffId || !institutionId) {
      toast.error('Staff ID and Institution ID are required');
      return;
    }

    try {
      setCheckingOut(true);
      const result = await checkOut(staffId, {
        institutionId,
        method: ATTENDANCE_METHOD.MANUAL,
        notes: checkOutNotes,
        location: 'Office',
        deviceInfo: navigator.userAgent
      });
      
      setTodayAttendance(result);
      setCheckOutNotes('');
      toast.success('Checked out successfully');
      loadAttendanceRecords();
      if (canManageAttendance) {
        loadStats();
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error(error.message || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    if (!staffId || !institutionId) {
      toast.error('Staff ID and Institution ID are required');
      return;
    }

    if (!leaveRequestForm.startDate || !leaveRequestForm.endDate || !leaveRequestForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await createLeaveRequest({
        staffId,
        institutionId,
        ...leaveRequestForm
      });
      
      toast.success('Leave request submitted');
      setShowLeaveRequestModal(false);
      setLeaveRequestForm({
        leaveType: LEAVE_TYPE.SICK,
        startDate: '',
        endDate: '',
        reason: '',
        emergencyContact: ''
      });
      loadLeaveRequests();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveRequestId) => {
    try {
      await updateLeaveRequestStatus(leaveRequestId, LEAVE_STATUS.APPROVED, user?.uid);
      toast.success('Leave request approved');
      loadLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (leaveRequestId, reason) => {
    if (!reason) {
      const reason = prompt('Please provide a reason for rejection:');
      if (!reason) return;
    }
    
    try {
      await updateLeaveRequestStatus(leaveRequestId, LEAVE_STATUS.REJECTED, user?.uid, reason);
      toast.success('Leave request rejected');
      loadLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave request');
    }
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case ATTENDANCE_STATUS.CHECKED_IN:
        return 'bg-blue-100 text-blue-800';
      case ATTENDANCE_STATUS.CHECKED_OUT:
        return 'bg-green-100 text-green-800';
      case ATTENDANCE_STATUS.LATE:
        return 'bg-yellow-100 text-yellow-800';
      case ATTENDANCE_STATUS.EARLY_LEAVE:
        return 'bg-orange-100 text-orange-800';
      case ATTENDANCE_STATUS.ABSENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveStatusColor = (status) => {
    switch (status) {
      case LEAVE_STATUS.APPROVED:
        return 'bg-green-100 text-green-800';
      case LEAVE_STATUS.REJECTED:
        return 'bg-red-100 text-red-800';
      case LEAVE_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Tracking</h2>
          <p className="text-sm text-gray-600 mt-1">
            {canManageAttendance ? 'Manage staff attendance' : 'Track your attendance'}
          </p>
        </div>
      </div>

      {/* Check-in/Check-out Card */}
      {!canManageAttendance && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>

          {todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Check-in Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTime(todayAttendance.checkInTime)}
                  </p>
                  {todayAttendance.isLate && (
                    <span className="text-xs text-yellow-600 mt-1">Late</span>
                  )}
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>

              {todayAttendance.status === ATTENDANCE_STATUS.CHECKED_IN && (
                <div className="space-y-3">
                  <textarea
                    value={checkOutNotes}
                    onChange={(e) => setCheckOutNotes(e.target.value)}
                    placeholder="Check-out notes (optional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                  />
                  <button
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    {checkingOut ? 'Checking Out...' : 'Check Out'}
                  </button>
                </div>
              )}

              {todayAttendance.status === ATTENDANCE_STATUS.CHECKED_OUT && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Check-out Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatTime(todayAttendance.checkOutTime)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Total Hours: {todayAttendance.totalHours || 0}h
                    </p>
                    {todayAttendance.overtimeHours > 0 && (
                      <p className="text-sm text-blue-600 mt-1">
                        Overtime: {todayAttendance.overtimeHours}h
                      </p>
                    )}
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Check-in notes (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
              />
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="h-5 w-5" />
                {checkingIn ? 'Checking In...' : 'Check In'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Statistics (Admin View) */}
      {canManageAttendance && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecords || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Late Arrivals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.late || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(stats.totalHours || 0)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overtime Hours</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(stats.totalOvertimeHours || 0)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Attendance History</h3>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Check-in</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Check-out</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hours</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatTime(record.checkInTime)}
                      {record.isLate && (
                        <span className="ml-2 text-xs text-yellow-600">(Late)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {record.checkOutTime ? formatTime(record.checkOutTime) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {record.totalHours ? `${record.totalHours}h` : '-'}
                      {record.overtimeHours > 0 && (
                        <span className="ml-2 text-xs text-blue-600">
                          (+{record.overtimeHours}h OT)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(record.status)}`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Leave Requests</h3>
          {!canManageAttendance && (
            <button
              onClick={() => setShowLeaveRequestModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Request Leave
            </button>
          )}
        </div>

        <div className="space-y-3">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No leave requests</div>
          ) : (
            leaveRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${getLeaveStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {request.leaveType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{request.reason}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                  </div>
                  {canManageAttendance && request.status === LEAVE_STATUS.PENDING && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveLeave(request.id)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectLeave(request.id)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Leave Request Modal */}
      {showLeaveRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Leave</h3>
              <button
                onClick={() => setShowLeaveRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Leave Type *
                </label>
                <select
                  value={leaveRequestForm.leaveType}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, leaveType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.values(LEAVE_TYPE).map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaveRequestForm.startDate}
                    onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={leaveRequestForm.endDate}
                    onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  value={leaveRequestForm.reason}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Please provide a reason for your leave request"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={leaveRequestForm.emergencyContact}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, emergencyContact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Phone number (optional)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowLeaveRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitLeaveRequest}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracking;


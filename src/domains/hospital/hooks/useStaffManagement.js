import { useEffect, useState, useCallback } from 'react';
import staffManagementAPI from '../api/staffManagementAPI';
import { useHospitalContext } from '../context/HospitalContext';

export const useStaffManagement = (initialFilters = {}) => {
  const { selectedHospitalId } = useHospitalContext();
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  // Fetch staff roster
  useEffect(() => {
    if (!selectedHospitalId) return;
    let mounted = true;

    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await staffManagementAPI.getStaffRoster(
          selectedHospitalId,
          filters
        );
        if (mounted) {
          setStaff(result.staff || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          console.error('Error fetching staff roster:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStaff();

    return () => {
      mounted = false;
    };
  }, [selectedHospitalId, JSON.stringify(filters)]);

  // Real-time shift calendar subscription (when activeTab is 'shifts')
  // Note: This will be controlled by the component that uses this hook
  const subscribeToShifts = useCallback((params = {}) => {
    if (!selectedHospitalId) return () => {};

    setShiftLoading(true);
    const unsubscribe = staffManagementAPI.subscribeToShiftCalendar(
      selectedHospitalId,
      params,
      (result) => {
        setShifts(result.shifts || []);
        setShiftLoading(false);
        if (result.error) {
          setError(result.error);
        }
      }
    );

    return unsubscribe;
  }, [selectedHospitalId]);

  // Fetch shift calendar (for manual refresh or filtered queries)
  const fetchShiftCalendar = useCallback(async (params = {}) => {
    if (!selectedHospitalId) return;
    setShiftLoading(true);
    setError(null);
    try {
      const result = await staffManagementAPI.getShiftCalendar(selectedHospitalId, params);
      setShifts(result.shifts || []);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching shift calendar:', err);
      throw err;
    } finally {
      setShiftLoading(false);
    }
  }, [selectedHospitalId]);

  // Assign shift
  const assignShift = useCallback(async (shiftData) => {
    try {
      const result = await staffManagementAPI.assignShift({
        ...shiftData,
        institutionId: selectedHospitalId,
      });
      // Refresh shift calendar after assignment
      await fetchShiftCalendar();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error assigning shift:', err);
      throw err;
    }
  }, [selectedHospitalId, fetchShiftCalendar]);

  // Update shift
  const updateShift = useCallback(async (shiftId, updateData) => {
    try {
      const result = await staffManagementAPI.updateShift(shiftId, updateData);
      // Refresh shift calendar after update
      await fetchShiftCalendar();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error updating shift:', err);
      throw err;
    }
  }, [fetchShiftCalendar]);

  // Delete shift
  const deleteShift = useCallback(async (shiftId) => {
    try {
      const result = await staffManagementAPI.deleteShift(shiftId);
      // Refresh shift calendar after deletion
      await fetchShiftCalendar();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting shift:', err);
      throw err;
    }
  }, [fetchShiftCalendar]);

  // Update staff member
  const updateStaffMember = useCallback(async (staffId, updateData) => {
    try {
      const result = await staffManagementAPI.updateStaffMember(staffId, updateData);
      // Refresh staff roster after update
      setStaff(prevStaff => 
        prevStaff.map(s => s.id === staffId ? { ...s, ...updateData } : s)
      );
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error updating staff member:', err);
      throw err;
    }
  }, []);

  // Get staff member details
  const getStaffMember = useCallback(async (staffId) => {
    try {
      const result = await staffManagementAPI.getStaffMember(staffId);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching staff member:', err);
      throw err;
    }
  }, []);

  return {
    loading,
    shiftLoading,
    staff,
    shifts,
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
    refreshStaff: () => {
      // Trigger staff refresh by updating filters
      setFilters({ ...filters });
    },
  };
};

export default useStaffManagement;


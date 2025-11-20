import { useEffect, useState, useCallback } from 'react';
import { hospitalOperationsAPI } from '../api/hospitalOperationsAPI';
import { useHospitalContext } from '../context/HospitalContext';

export const useHospitalOperations = () => {
  const { selectedHospitalId, selectedDateRange } = useHospitalContext();
  const [summary, setSummary] = useState(null);
  const [bedStatus, setBedStatus] = useState(null);
  const [incidentFeed, setIncidentFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bedLoading, setBedLoading] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch hospital summary
  useEffect(() => {
    if (!selectedHospitalId) return;
    let mounted = true;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await hospitalOperationsAPI.getHospitalSummary(
          selectedHospitalId,
          selectedDateRange
        );
        if (mounted) {
          setSummary(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          console.error('Error fetching hospital summary:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      mounted = false;
    };
  }, [selectedHospitalId, selectedDateRange]);

  // Real-time bed status subscription
  useEffect(() => {
    if (!selectedHospitalId) return;

    setBedLoading(true);
    const unsubscribe = hospitalOperationsAPI.subscribeToBedStatus(
      selectedHospitalId,
      {},
      (result) => {
        setBedStatus(result);
        setBedLoading(false);
        if (result.error) {
          setError(result.error);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedHospitalId]);

  // Real-time incident feed subscription
  useEffect(() => {
    if (!selectedHospitalId) return;

    setIncidentLoading(true);
    const unsubscribe = hospitalOperationsAPI.subscribeToIncidentFeed(
      selectedHospitalId,
      { limit: 10 },
      (result) => {
        setIncidentFeed(result);
        setIncidentLoading(false);
        if (result.error) {
          setError(result.error);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedHospitalId]);

  // Fetch bed status (for manual refresh or filtered queries)
  const fetchBedStatus = useCallback(async (filters = {}) => {
    if (!selectedHospitalId) return;
    setBedLoading(true);
    setError(null);
    try {
      const result = await hospitalOperationsAPI.getBedStatus(selectedHospitalId, filters);
      setBedStatus(result);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching bed status:', err);
    } finally {
      setBedLoading(false);
    }
  }, [selectedHospitalId]);

  // Fetch incident feed (for manual refresh or filtered queries)
  const fetchIncidentFeed = useCallback(async (params = {}) => {
    if (!selectedHospitalId) return;
    setIncidentLoading(true);
    setError(null);
    try {
      const result = await hospitalOperationsAPI.getIncidentFeed(selectedHospitalId, params);
      setIncidentFeed(result);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching incident feed:', err);
    } finally {
      setIncidentLoading(false);
    }
  }, [selectedHospitalId]);

  // Update bed status
  const updateBedStatus = useCallback(async (bedId, updateData) => {
    try {
      const result = await hospitalOperationsAPI.updateBedStatus(bedId, updateData);
      // Refresh bed status after update
      await fetchBedStatus();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error updating bed status:', err);
      throw err;
    }
  }, [fetchBedStatus]);

  // Create incident
  const createIncident = useCallback(async (incidentData) => {
    try {
      const result = await hospitalOperationsAPI.createIncident({
        ...incidentData,
        institutionId: selectedHospitalId,
      });
      // Refresh incident feed after creation
      await fetchIncidentFeed();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error creating incident:', err);
      throw err;
    }
  }, [selectedHospitalId, fetchIncidentFeed]);

  // Update incident
  const updateIncident = useCallback(async (incidentId, updateData) => {
    try {
      const result = await hospitalOperationsAPI.updateIncident(incidentId, updateData);
      // Refresh incident feed after update
      await fetchIncidentFeed();
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error updating incident:', err);
      throw err;
    }
  }, [fetchIncidentFeed]);

  return {
    loading,
    bedLoading,
    incidentLoading,
    summary,
    bedStatus,
    incidentFeed,
    error,
    fetchBedStatus,
    fetchIncidentFeed,
    updateBedStatus,
    createIncident,
    updateIncident,
    refreshSummary: () => {
      // Trigger summary refresh by updating a dependency
      setSummary(null);
    },
  };
};

export default useHospitalOperations;


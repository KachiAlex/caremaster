import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useUser } from '../../../contexts/UserContext';

const HospitalContext = createContext(null);

export const HospitalProvider = ({ children }) => {
  const { institutionId: userInstitutionId } = useUser();
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
    end: new Date(new Date().setHours(23, 59, 59, 999)), // End of today
  });
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [availableHospitals, setAvailableHospitals] = useState([]);

  // Auto-set selectedHospitalId from user's institutionId if available
  useEffect(() => {
    if (userInstitutionId && !selectedHospitalId) {
      setSelectedHospitalId(userInstitutionId);
    }
  }, [userInstitutionId, selectedHospitalId]);

  const value = useMemo(
    () => ({
      selectedHospitalId: selectedHospitalId || userInstitutionId,
      setSelectedHospitalId,
      selectedDateRange,
      setSelectedDateRange,
      activeDepartment,
      setActiveDepartment,
      availableHospitals,
      setAvailableHospitals,
      userInstitutionId, // Expose user's institution ID for convenience
    }),
    [selectedHospitalId, selectedDateRange, activeDepartment, availableHospitals, userInstitutionId]
  );

  return (
    <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
  );
};

export const useHospitalContext = () => {
  const ctx = useContext(HospitalContext);
  if (!ctx) {
    throw new Error('useHospitalContext must be used within HospitalProvider');
  }
  return ctx;
};

export default HospitalContext;


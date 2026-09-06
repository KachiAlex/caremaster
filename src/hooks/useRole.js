import { useMemo } from 'react';

/**
 * Derives role flags from the user profile object used across caregiver
 * dashboards. This centralises the many defensive role checks that were
 * scattered through pages and avoids subtle inconsistencies.
 *
 * @param {object} userProfile - The current user's profile object.
 * @returns {object} { isDoctor, isNurse, isPharmacist, isCaregiver, isNonMedicalCaregiver }
 */
export function useRole(userProfile) {
  return useMemo(() => {
    const isDoctor =
      (userProfile?.medicalQualification || '').includes('Doctor') ||
      userProfile?.role === 'doctor' ||
      userProfile?.userType === 'doctor' ||
      userProfile?.type === 'doctor';

    const isNurse =
      (userProfile?.medicalQualification || '').includes('Nurse') ||
      userProfile?.role === 'nurse' ||
      userProfile?.userType === 'nurse' ||
      userProfile?.type === 'nurse';

    const isPharmacist =
      userProfile?.userType === 'pharmacist' ||
      userProfile?.type === 'pharmacist' ||
      userProfile?.role === 'pharmacist';

    const isCaregiver =
      userProfile?.userType === 'caregiver' ||
      userProfile?.type === 'caregiver' ||
      (!userProfile?.userType && !userProfile?.type && !userProfile?.role);

    const isNonMedicalCaregiver =
      isCaregiver && !isDoctor && !isNurse && !isPharmacist;
    const isMedicalProfessional = isDoctor || isNurse;

    return {
      isDoctor,
      isNurse,
      isPharmacist,
      isCaregiver,
      isNonMedicalCaregiver,
      isMedicalProfessional,
    };
  }, [
    userProfile?.medicalQualification,
    userProfile?.role,
    userProfile?.userType,
    userProfile?.type,
  ]);
}

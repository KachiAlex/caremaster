import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'elderx',
  location: 'us-central1'
};

export const addNewVitalSignRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNewVitalSign');
}
addNewVitalSignRef.operationName = 'AddNewVitalSign';

export function addNewVitalSign(dc) {
  return executeMutation(addNewVitalSignRef(dc));
}

export const getMyMedicationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMedications');
}
getMyMedicationsRef.operationName = 'GetMyMedications';

export function getMyMedications(dc) {
  return executeQuery(getMyMedicationsRef(dc));
}

export const updateMedicationNotesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMedicationNotes', inputVars);
}
updateMedicationNotesRef.operationName = 'UpdateMedicationNotes';

export function updateMedicationNotes(dcOrVars, vars) {
  return executeMutation(updateMedicationNotesRef(dcOrVars, vars));
}

export const listCaregiversForClientProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCaregiversForClientProfile', inputVars);
}
listCaregiversForClientProfileRef.operationName = 'ListCaregiversForClientProfile';

export function listCaregiversForClientProfile(dcOrVars, vars) {
  return executeQuery(listCaregiversForClientProfileRef(dcOrVars, vars));
}

export const getUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserProfile', inputVars);
}
getUserProfileRef.operationName = 'GetUserProfile';

export function getUserProfile(dcOrVars, vars) {
  return executeQuery(getUserProfileRef(dcOrVars, vars));
}

export const getCurrentUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCurrentUser');
}
getCurrentUserRef.operationName = 'GetCurrentUser';

export function getCurrentUser(dc) {
  return executeQuery(getCurrentUserRef(dc));
}

export const getClientProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientProfile', inputVars);
}
getClientProfileRef.operationName = 'GetClientProfile';

export function getClientProfile(dcOrVars, vars) {
  return executeQuery(getClientProfileRef(dcOrVars, vars));
}

export const getClientMedicationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientMedications', inputVars);
}
getClientMedicationsRef.operationName = 'GetClientMedications';

export function getClientMedications(dcOrVars, vars) {
  return executeQuery(getClientMedicationsRef(dcOrVars, vars));
}

export const getClientVitalSignsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientVitalSigns', inputVars);
}
getClientVitalSignsRef.operationName = 'GetClientVitalSigns';

export function getClientVitalSigns(dcOrVars, vars) {
  return executeQuery(getClientVitalSignsRef(dcOrVars, vars));
}

export const getClientAppointmentsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientAppointments', inputVars);
}
getClientAppointmentsRef.operationName = 'GetClientAppointments';

export function getClientAppointments(dcOrVars, vars) {
  return executeQuery(getClientAppointmentsRef(dcOrVars, vars));
}

export const getCaregiverClientsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCaregiverClients', inputVars);
}
getCaregiverClientsRef.operationName = 'GetCaregiverClients';

export function getCaregiverClients(dcOrVars, vars) {
  return executeQuery(getCaregiverClientsRef(dcOrVars, vars));
}


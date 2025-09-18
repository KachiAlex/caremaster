const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'elderx',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const addNewVitalSignRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNewVitalSign');
}
addNewVitalSignRef.operationName = 'AddNewVitalSign';
exports.addNewVitalSignRef = addNewVitalSignRef;

exports.addNewVitalSign = function addNewVitalSign(dc) {
  return executeMutation(addNewVitalSignRef(dc));
};

const getMyMedicationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMedications');
}
getMyMedicationsRef.operationName = 'GetMyMedications';
exports.getMyMedicationsRef = getMyMedicationsRef;

exports.getMyMedications = function getMyMedications(dc) {
  return executeQuery(getMyMedicationsRef(dc));
};

const updateMedicationNotesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMedicationNotes', inputVars);
}
updateMedicationNotesRef.operationName = 'UpdateMedicationNotes';
exports.updateMedicationNotesRef = updateMedicationNotesRef;

exports.updateMedicationNotes = function updateMedicationNotes(dcOrVars, vars) {
  return executeMutation(updateMedicationNotesRef(dcOrVars, vars));
};

const listCaregiversForClientProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCaregiversForClientProfile', inputVars);
}
listCaregiversForClientProfileRef.operationName = 'ListCaregiversForClientProfile';
exports.listCaregiversForClientProfileRef = listCaregiversForClientProfileRef;

exports.listCaregiversForClientProfile = function listCaregiversForClientProfile(dcOrVars, vars) {
  return executeQuery(listCaregiversForClientProfileRef(dcOrVars, vars));
};

const getUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserProfile', inputVars);
}
getUserProfileRef.operationName = 'GetUserProfile';
exports.getUserProfileRef = getUserProfileRef;

exports.getUserProfile = function getUserProfile(dcOrVars, vars) {
  return executeQuery(getUserProfileRef(dcOrVars, vars));
};

const getCurrentUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCurrentUser');
}
getCurrentUserRef.operationName = 'GetCurrentUser';
exports.getCurrentUserRef = getCurrentUserRef;

exports.getCurrentUser = function getCurrentUser(dc) {
  return executeQuery(getCurrentUserRef(dc));
};

const getClientProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientProfile', inputVars);
}
getClientProfileRef.operationName = 'GetClientProfile';
exports.getClientProfileRef = getClientProfileRef;

exports.getClientProfile = function getClientProfile(dcOrVars, vars) {
  return executeQuery(getClientProfileRef(dcOrVars, vars));
};

const getClientMedicationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientMedications', inputVars);
}
getClientMedicationsRef.operationName = 'GetClientMedications';
exports.getClientMedicationsRef = getClientMedicationsRef;

exports.getClientMedications = function getClientMedications(dcOrVars, vars) {
  return executeQuery(getClientMedicationsRef(dcOrVars, vars));
};

const getClientVitalSignsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientVitalSigns', inputVars);
}
getClientVitalSignsRef.operationName = 'GetClientVitalSigns';
exports.getClientVitalSignsRef = getClientVitalSignsRef;

exports.getClientVitalSigns = function getClientVitalSigns(dcOrVars, vars) {
  return executeQuery(getClientVitalSignsRef(dcOrVars, vars));
};

const getClientAppointmentsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientAppointments', inputVars);
}
getClientAppointmentsRef.operationName = 'GetClientAppointments';
exports.getClientAppointmentsRef = getClientAppointmentsRef;

exports.getClientAppointments = function getClientAppointments(dcOrVars, vars) {
  return executeQuery(getClientAppointmentsRef(dcOrVars, vars));
};

const getCaregiverClientsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCaregiverClients', inputVars);
}
getCaregiverClientsRef.operationName = 'GetCaregiverClients';
exports.getCaregiverClientsRef = getCaregiverClientsRef;

exports.getCaregiverClients = function getCaregiverClients(dcOrVars, vars) {
  return executeQuery(getCaregiverClientsRef(dcOrVars, vars));
};

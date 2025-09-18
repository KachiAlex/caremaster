import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddNewVitalSignData {
  vitalSign_insert: VitalSign_Key;
}

export interface Appointment_Key {
  id: UUIDString;
  __typename?: 'Appointment_Key';
}

export interface CaregiverRelationship_Key {
  caregiverId: UUIDString;
  clientProfileId: UUIDString;
  __typename?: 'CaregiverRelationship_Key';
}

export interface ClientProfile_Key {
  id: UUIDString;
  __typename?: 'ClientProfile_Key';
}

export interface DoseLog_Key {
  id: UUIDString;
  __typename?: 'DoseLog_Key';
}

export interface GetCaregiverClientsData {
  caregiverRelationships: ({
    clientProfile: {
      id: UUIDString;
      user: {
        displayName: string;
        email?: string | null;
      };
        emergencyContactName: string;
        emergencyContactPhone: string;
    } & ClientProfile_Key;
      establishedAt: TimestampString;
      accessLevel?: string | null;
  })[];
}

export interface GetCaregiverClientsVariables {
  caregiverId: UUIDString;
}

export interface GetClientAppointmentsData {
  appointments: ({
    id: UUIDString;
    dateTime: TimestampString;
    type: string;
    location: string;
    doctorName?: string | null;
    notes?: string | null;
  } & Appointment_Key)[];
}

export interface GetClientAppointmentsVariables {
  clientProfileId: UUIDString;
}

export interface GetClientMedicationsData {
  medications: ({
    id: UUIDString;
    name: string;
    dosage: string;
    frequency: string;
    startTime: TimestampString;
    instructions?: string | null;
    notes?: string | null;
    endDate?: DateString | null;
  } & Medication_Key)[];
}

export interface GetClientMedicationsVariables {
  clientProfileId: UUIDString;
}

export interface GetClientProfileData {
  clientProfiles: ({
    id: UUIDString;
    user: {
      id: UUIDString;
      displayName: string;
      email?: string | null;
    } & User_Key;
      emergencyContactName: string;
      emergencyContactPhone: string;
      primaryCareDoctor?: string | null;
      allergies?: string | null;
      medicalConditions?: string | null;
  } & ClientProfile_Key)[];
}

export interface GetClientProfileVariables {
  clientId: UUIDString;
}

export interface GetClientVitalSignsData {
  vitalSigns: ({
    id: UUIDString;
    type: string;
    value: number;
    unit?: string | null;
    recordedAt: TimestampString;
    notes?: string | null;
  } & VitalSign_Key)[];
}

export interface GetClientVitalSignsVariables {
  clientProfileId: UUIDString;
}

export interface GetCurrentUserData {
  users: ({
    id: UUIDString;
    firebaseUid: string;
    displayName: string;
    userType: string;
    email?: string | null;
    photoUrl?: string | null;
    dateOfBirth?: DateString | null;
    createdAt: TimestampString;
  } & User_Key)[];
}

export interface GetMyMedicationsData {
  medications: ({
    id: UUIDString;
    name: string;
    dosage: string;
    frequency: string;
  } & Medication_Key)[];
}

export interface GetUserProfileData {
  users: ({
    id: UUIDString;
    firebaseUid: string;
    displayName: string;
    userType: string;
    email?: string | null;
    photoUrl?: string | null;
    dateOfBirth?: DateString | null;
    createdAt: TimestampString;
  } & User_Key)[];
}

export interface GetUserProfileVariables {
  firebaseUid: string;
}

export interface ListCaregiversForClientProfileData {
  caregiverRelationships: ({
    caregiver: {
      id: UUIDString;
      displayName: string;
      email?: string | null;
    } & User_Key;
      accessLevel?: string | null;
  })[];
}

export interface ListCaregiversForClientProfileVariables {
  clientProfileId: UUIDString;
}

export interface Medication_Key {
  id: UUIDString;
  __typename?: 'Medication_Key';
}

export interface UpdateMedicationNotesData {
  medication_update?: Medication_Key | null;
}

export interface UpdateMedicationNotesVariables {
  id: UUIDString;
  notes?: string | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface VitalSign_Key {
  id: UUIDString;
  __typename?: 'VitalSign_Key';
}

interface AddNewVitalSignRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<AddNewVitalSignData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<AddNewVitalSignData, undefined>;
  operationName: string;
}
export const addNewVitalSignRef: AddNewVitalSignRef;

export function addNewVitalSign(): MutationPromise<AddNewVitalSignData, undefined>;
export function addNewVitalSign(dc: DataConnect): MutationPromise<AddNewVitalSignData, undefined>;

interface GetMyMedicationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyMedicationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyMedicationsData, undefined>;
  operationName: string;
}
export const getMyMedicationsRef: GetMyMedicationsRef;

export function getMyMedications(): QueryPromise<GetMyMedicationsData, undefined>;
export function getMyMedications(dc: DataConnect): QueryPromise<GetMyMedicationsData, undefined>;

interface UpdateMedicationNotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMedicationNotesVariables): MutationRef<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMedicationNotesVariables): MutationRef<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;
  operationName: string;
}
export const updateMedicationNotesRef: UpdateMedicationNotesRef;

export function updateMedicationNotes(vars: UpdateMedicationNotesVariables): MutationPromise<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;
export function updateMedicationNotes(dc: DataConnect, vars: UpdateMedicationNotesVariables): MutationPromise<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;

interface ListCaregiversForClientProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCaregiversForClientProfileVariables): QueryRef<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListCaregiversForClientProfileVariables): QueryRef<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;
  operationName: string;
}
export const listCaregiversForClientProfileRef: ListCaregiversForClientProfileRef;

export function listCaregiversForClientProfile(vars: ListCaregiversForClientProfileVariables): QueryPromise<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;
export function listCaregiversForClientProfile(dc: DataConnect, vars: ListCaregiversForClientProfileVariables): QueryPromise<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;

interface GetUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  operationName: string;
}
export const getUserProfileRef: GetUserProfileRef;

export function getUserProfile(vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;
export function getUserProfile(dc: DataConnect, vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetCurrentUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetCurrentUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetCurrentUserData, undefined>;
  operationName: string;
}
export const getCurrentUserRef: GetCurrentUserRef;

export function getCurrentUser(): QueryPromise<GetCurrentUserData, undefined>;
export function getCurrentUser(dc: DataConnect): QueryPromise<GetCurrentUserData, undefined>;

interface GetClientProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientProfileVariables): QueryRef<GetClientProfileData, GetClientProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetClientProfileVariables): QueryRef<GetClientProfileData, GetClientProfileVariables>;
  operationName: string;
}
export const getClientProfileRef: GetClientProfileRef;

export function getClientProfile(vars: GetClientProfileVariables): QueryPromise<GetClientProfileData, GetClientProfileVariables>;
export function getClientProfile(dc: DataConnect, vars: GetClientProfileVariables): QueryPromise<GetClientProfileData, GetClientProfileVariables>;

interface GetClientMedicationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientMedicationsVariables): QueryRef<GetClientMedicationsData, GetClientMedicationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetClientMedicationsVariables): QueryRef<GetClientMedicationsData, GetClientMedicationsVariables>;
  operationName: string;
}
export const getClientMedicationsRef: GetClientMedicationsRef;

export function getClientMedications(vars: GetClientMedicationsVariables): QueryPromise<GetClientMedicationsData, GetClientMedicationsVariables>;
export function getClientMedications(dc: DataConnect, vars: GetClientMedicationsVariables): QueryPromise<GetClientMedicationsData, GetClientMedicationsVariables>;

interface GetClientVitalSignsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientVitalSignsVariables): QueryRef<GetClientVitalSignsData, GetClientVitalSignsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetClientVitalSignsVariables): QueryRef<GetClientVitalSignsData, GetClientVitalSignsVariables>;
  operationName: string;
}
export const getClientVitalSignsRef: GetClientVitalSignsRef;

export function getClientVitalSigns(vars: GetClientVitalSignsVariables): QueryPromise<GetClientVitalSignsData, GetClientVitalSignsVariables>;
export function getClientVitalSigns(dc: DataConnect, vars: GetClientVitalSignsVariables): QueryPromise<GetClientVitalSignsData, GetClientVitalSignsVariables>;

interface GetClientAppointmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientAppointmentsVariables): QueryRef<GetClientAppointmentsData, GetClientAppointmentsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetClientAppointmentsVariables): QueryRef<GetClientAppointmentsData, GetClientAppointmentsVariables>;
  operationName: string;
}
export const getClientAppointmentsRef: GetClientAppointmentsRef;

export function getClientAppointments(vars: GetClientAppointmentsVariables): QueryPromise<GetClientAppointmentsData, GetClientAppointmentsVariables>;
export function getClientAppointments(dc: DataConnect, vars: GetClientAppointmentsVariables): QueryPromise<GetClientAppointmentsData, GetClientAppointmentsVariables>;

interface GetCaregiverClientsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCaregiverClientsVariables): QueryRef<GetCaregiverClientsData, GetCaregiverClientsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCaregiverClientsVariables): QueryRef<GetCaregiverClientsData, GetCaregiverClientsVariables>;
  operationName: string;
}
export const getCaregiverClientsRef: GetCaregiverClientsRef;

export function getCaregiverClients(vars: GetCaregiverClientsVariables): QueryPromise<GetCaregiverClientsData, GetCaregiverClientsVariables>;
export function getCaregiverClients(dc: DataConnect, vars: GetCaregiverClientsVariables): QueryPromise<GetCaregiverClientsData, GetCaregiverClientsVariables>;


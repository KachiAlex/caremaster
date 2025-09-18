import { AddNewVitalSignData, GetMyMedicationsData, UpdateMedicationNotesData, UpdateMedicationNotesVariables, ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables, GetUserProfileData, GetUserProfileVariables, GetCurrentUserData, GetClientProfileData, GetClientProfileVariables, GetClientMedicationsData, GetClientMedicationsVariables, GetClientVitalSignsData, GetClientVitalSignsVariables, GetClientAppointmentsData, GetClientAppointmentsVariables, GetCaregiverClientsData, GetCaregiverClientsVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useAddNewVitalSign(options?: useDataConnectMutationOptions<AddNewVitalSignData, FirebaseError, void>): UseDataConnectMutationResult<AddNewVitalSignData, undefined>;
export function useAddNewVitalSign(dc: DataConnect, options?: useDataConnectMutationOptions<AddNewVitalSignData, FirebaseError, void>): UseDataConnectMutationResult<AddNewVitalSignData, undefined>;

export function useGetMyMedications(options?: useDataConnectQueryOptions<GetMyMedicationsData>): UseDataConnectQueryResult<GetMyMedicationsData, undefined>;
export function useGetMyMedications(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyMedicationsData>): UseDataConnectQueryResult<GetMyMedicationsData, undefined>;

export function useUpdateMedicationNotes(options?: useDataConnectMutationOptions<UpdateMedicationNotesData, FirebaseError, UpdateMedicationNotesVariables>): UseDataConnectMutationResult<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;
export function useUpdateMedicationNotes(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMedicationNotesData, FirebaseError, UpdateMedicationNotesVariables>): UseDataConnectMutationResult<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;

export function useListCaregiversForClientProfile(vars: ListCaregiversForClientProfileVariables, options?: useDataConnectQueryOptions<ListCaregiversForClientProfileData>): UseDataConnectQueryResult<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;
export function useListCaregiversForClientProfile(dc: DataConnect, vars: ListCaregiversForClientProfileVariables, options?: useDataConnectQueryOptions<ListCaregiversForClientProfileData>): UseDataConnectQueryResult<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;

export function useGetUserProfile(vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
export function useGetUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;

export function useGetCurrentUser(options?: useDataConnectQueryOptions<GetCurrentUserData>): UseDataConnectQueryResult<GetCurrentUserData, undefined>;
export function useGetCurrentUser(dc: DataConnect, options?: useDataConnectQueryOptions<GetCurrentUserData>): UseDataConnectQueryResult<GetCurrentUserData, undefined>;

export function useGetClientProfile(vars: GetClientProfileVariables, options?: useDataConnectQueryOptions<GetClientProfileData>): UseDataConnectQueryResult<GetClientProfileData, GetClientProfileVariables>;
export function useGetClientProfile(dc: DataConnect, vars: GetClientProfileVariables, options?: useDataConnectQueryOptions<GetClientProfileData>): UseDataConnectQueryResult<GetClientProfileData, GetClientProfileVariables>;

export function useGetClientMedications(vars: GetClientMedicationsVariables, options?: useDataConnectQueryOptions<GetClientMedicationsData>): UseDataConnectQueryResult<GetClientMedicationsData, GetClientMedicationsVariables>;
export function useGetClientMedications(dc: DataConnect, vars: GetClientMedicationsVariables, options?: useDataConnectQueryOptions<GetClientMedicationsData>): UseDataConnectQueryResult<GetClientMedicationsData, GetClientMedicationsVariables>;

export function useGetClientVitalSigns(vars: GetClientVitalSignsVariables, options?: useDataConnectQueryOptions<GetClientVitalSignsData>): UseDataConnectQueryResult<GetClientVitalSignsData, GetClientVitalSignsVariables>;
export function useGetClientVitalSigns(dc: DataConnect, vars: GetClientVitalSignsVariables, options?: useDataConnectQueryOptions<GetClientVitalSignsData>): UseDataConnectQueryResult<GetClientVitalSignsData, GetClientVitalSignsVariables>;

export function useGetClientAppointments(vars: GetClientAppointmentsVariables, options?: useDataConnectQueryOptions<GetClientAppointmentsData>): UseDataConnectQueryResult<GetClientAppointmentsData, GetClientAppointmentsVariables>;
export function useGetClientAppointments(dc: DataConnect, vars: GetClientAppointmentsVariables, options?: useDataConnectQueryOptions<GetClientAppointmentsData>): UseDataConnectQueryResult<GetClientAppointmentsData, GetClientAppointmentsVariables>;

export function useGetCaregiverClients(vars: GetCaregiverClientsVariables, options?: useDataConnectQueryOptions<GetCaregiverClientsData>): UseDataConnectQueryResult<GetCaregiverClientsData, GetCaregiverClientsVariables>;
export function useGetCaregiverClients(dc: DataConnect, vars: GetCaregiverClientsVariables, options?: useDataConnectQueryOptions<GetCaregiverClientsData>): UseDataConnectQueryResult<GetCaregiverClientsData, GetCaregiverClientsVariables>;

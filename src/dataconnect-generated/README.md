# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMyMedications*](#getmymedications)
  - [*ListCaregiversForClientProfile*](#listcaregiversforclientprofile)
  - [*GetUserProfile*](#getuserprofile)
  - [*GetCurrentUser*](#getcurrentuser)
  - [*GetClientProfile*](#getclientprofile)
  - [*GetClientMedications*](#getclientmedications)
  - [*GetClientVitalSigns*](#getclientvitalsigns)
  - [*GetClientAppointments*](#getclientappointments)
  - [*GetCaregiverClients*](#getcaregiverclients)
- [**Mutations**](#mutations)
  - [*AddNewVitalSign*](#addnewvitalsign)
  - [*UpdateMedicationNotes*](#updatemedicationnotes)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMyMedications
You can execute the `GetMyMedications` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyMedications(): QueryPromise<GetMyMedicationsData, undefined>;

interface GetMyMedicationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyMedicationsData, undefined>;
}
export const getMyMedicationsRef: GetMyMedicationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyMedications(dc: DataConnect): QueryPromise<GetMyMedicationsData, undefined>;

interface GetMyMedicationsRef {
  ...
  (dc: DataConnect): QueryRef<GetMyMedicationsData, undefined>;
}
export const getMyMedicationsRef: GetMyMedicationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyMedicationsRef:
```typescript
const name = getMyMedicationsRef.operationName;
console.log(name);
```

### Variables
The `GetMyMedications` query has no variables.
### Return Type
Recall that executing the `GetMyMedications` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyMedicationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyMedicationsData {
  medications: ({
    id: UUIDString;
    name: string;
    dosage: string;
    frequency: string;
  } & Medication_Key)[];
}
```
### Using `GetMyMedications`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyMedications } from '@dataconnect/generated';


// Call the `getMyMedications()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyMedications();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyMedications(dataConnect);

console.log(data.medications);

// Or, you can use the `Promise` API.
getMyMedications().then((response) => {
  const data = response.data;
  console.log(data.medications);
});
```

### Using `GetMyMedications`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyMedicationsRef } from '@dataconnect/generated';


// Call the `getMyMedicationsRef()` function to get a reference to the query.
const ref = getMyMedicationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyMedicationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.medications);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.medications);
});
```

## ListCaregiversForClientProfile
You can execute the `ListCaregiversForClientProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCaregiversForClientProfile(vars: ListCaregiversForClientProfileVariables): QueryPromise<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;

interface ListCaregiversForClientProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCaregiversForClientProfileVariables): QueryRef<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;
}
export const listCaregiversForClientProfileRef: ListCaregiversForClientProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCaregiversForClientProfile(dc: DataConnect, vars: ListCaregiversForClientProfileVariables): QueryPromise<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;

interface ListCaregiversForClientProfileRef {
  ...
  (dc: DataConnect, vars: ListCaregiversForClientProfileVariables): QueryRef<ListCaregiversForClientProfileData, ListCaregiversForClientProfileVariables>;
}
export const listCaregiversForClientProfileRef: ListCaregiversForClientProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCaregiversForClientProfileRef:
```typescript
const name = listCaregiversForClientProfileRef.operationName;
console.log(name);
```

### Variables
The `ListCaregiversForClientProfile` query requires an argument of type `ListCaregiversForClientProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCaregiversForClientProfileVariables {
  clientProfileId: UUIDString;
}
```
### Return Type
Recall that executing the `ListCaregiversForClientProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCaregiversForClientProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListCaregiversForClientProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCaregiversForClientProfile, ListCaregiversForClientProfileVariables } from '@dataconnect/generated';

// The `ListCaregiversForClientProfile` query requires an argument of type `ListCaregiversForClientProfileVariables`:
const listCaregiversForClientProfileVars: ListCaregiversForClientProfileVariables = {
  clientProfileId: ..., 
};

// Call the `listCaregiversForClientProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCaregiversForClientProfile(listCaregiversForClientProfileVars);
// Variables can be defined inline as well.
const { data } = await listCaregiversForClientProfile({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCaregiversForClientProfile(dataConnect, listCaregiversForClientProfileVars);

console.log(data.caregiverRelationships);

// Or, you can use the `Promise` API.
listCaregiversForClientProfile(listCaregiversForClientProfileVars).then((response) => {
  const data = response.data;
  console.log(data.caregiverRelationships);
});
```

### Using `ListCaregiversForClientProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCaregiversForClientProfileRef, ListCaregiversForClientProfileVariables } from '@dataconnect/generated';

// The `ListCaregiversForClientProfile` query requires an argument of type `ListCaregiversForClientProfileVariables`:
const listCaregiversForClientProfileVars: ListCaregiversForClientProfileVariables = {
  clientProfileId: ..., 
};

// Call the `listCaregiversForClientProfileRef()` function to get a reference to the query.
const ref = listCaregiversForClientProfileRef(listCaregiversForClientProfileVars);
// Variables can be defined inline as well.
const ref = listCaregiversForClientProfileRef({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCaregiversForClientProfileRef(dataConnect, listCaregiversForClientProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.caregiverRelationships);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.caregiverRelationships);
});
```

## GetUserProfile
You can execute the `GetUserProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserProfile(vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProfile(dc: DataConnect, vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProfileRef:
```typescript
const name = getUserProfileRef.operationName;
console.log(name);
```

### Variables
The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProfileVariables {
  firebaseUid: string;
}
```
### Return Type
Recall that executing the `GetUserProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProfile, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  firebaseUid: ..., 
};

// Call the `getUserProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProfile(getUserProfileVars);
// Variables can be defined inline as well.
const { data } = await getUserProfile({ firebaseUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProfile(dataConnect, getUserProfileVars);

console.log(data.users);

// Or, you can use the `Promise` API.
getUserProfile(getUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `GetUserProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProfileRef, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  firebaseUid: ..., 
};

// Call the `getUserProfileRef()` function to get a reference to the query.
const ref = getUserProfileRef(getUserProfileVars);
// Variables can be defined inline as well.
const ref = getUserProfileRef({ firebaseUid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProfileRef(dataConnect, getUserProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## GetCurrentUser
You can execute the `GetCurrentUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getCurrentUser(): QueryPromise<GetCurrentUserData, undefined>;

interface GetCurrentUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetCurrentUserData, undefined>;
}
export const getCurrentUserRef: GetCurrentUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCurrentUser(dc: DataConnect): QueryPromise<GetCurrentUserData, undefined>;

interface GetCurrentUserRef {
  ...
  (dc: DataConnect): QueryRef<GetCurrentUserData, undefined>;
}
export const getCurrentUserRef: GetCurrentUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCurrentUserRef:
```typescript
const name = getCurrentUserRef.operationName;
console.log(name);
```

### Variables
The `GetCurrentUser` query has no variables.
### Return Type
Recall that executing the `GetCurrentUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCurrentUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetCurrentUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCurrentUser } from '@dataconnect/generated';


// Call the `getCurrentUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCurrentUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCurrentUser(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
getCurrentUser().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `GetCurrentUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCurrentUserRef } from '@dataconnect/generated';


// Call the `getCurrentUserRef()` function to get a reference to the query.
const ref = getCurrentUserRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCurrentUserRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## GetClientProfile
You can execute the `GetClientProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getClientProfile(vars: GetClientProfileVariables): QueryPromise<GetClientProfileData, GetClientProfileVariables>;

interface GetClientProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientProfileVariables): QueryRef<GetClientProfileData, GetClientProfileVariables>;
}
export const getClientProfileRef: GetClientProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getClientProfile(dc: DataConnect, vars: GetClientProfileVariables): QueryPromise<GetClientProfileData, GetClientProfileVariables>;

interface GetClientProfileRef {
  ...
  (dc: DataConnect, vars: GetClientProfileVariables): QueryRef<GetClientProfileData, GetClientProfileVariables>;
}
export const getClientProfileRef: GetClientProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getClientProfileRef:
```typescript
const name = getClientProfileRef.operationName;
console.log(name);
```

### Variables
The `GetClientProfile` query requires an argument of type `GetClientProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetClientProfileVariables {
  clientId: UUIDString;
}
```
### Return Type
Recall that executing the `GetClientProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetClientProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetClientProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getClientProfile, GetClientProfileVariables } from '@dataconnect/generated';

// The `GetClientProfile` query requires an argument of type `GetClientProfileVariables`:
const getClientProfileVars: GetClientProfileVariables = {
  clientId: ..., 
};

// Call the `getClientProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getClientProfile(getClientProfileVars);
// Variables can be defined inline as well.
const { data } = await getClientProfile({ clientId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getClientProfile(dataConnect, getClientProfileVars);

console.log(data.clientProfiles);

// Or, you can use the `Promise` API.
getClientProfile(getClientProfileVars).then((response) => {
  const data = response.data;
  console.log(data.clientProfiles);
});
```

### Using `GetClientProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getClientProfileRef, GetClientProfileVariables } from '@dataconnect/generated';

// The `GetClientProfile` query requires an argument of type `GetClientProfileVariables`:
const getClientProfileVars: GetClientProfileVariables = {
  clientId: ..., 
};

// Call the `getClientProfileRef()` function to get a reference to the query.
const ref = getClientProfileRef(getClientProfileVars);
// Variables can be defined inline as well.
const ref = getClientProfileRef({ clientId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getClientProfileRef(dataConnect, getClientProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.clientProfiles);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.clientProfiles);
});
```

## GetClientMedications
You can execute the `GetClientMedications` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getClientMedications(vars: GetClientMedicationsVariables): QueryPromise<GetClientMedicationsData, GetClientMedicationsVariables>;

interface GetClientMedicationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientMedicationsVariables): QueryRef<GetClientMedicationsData, GetClientMedicationsVariables>;
}
export const getClientMedicationsRef: GetClientMedicationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getClientMedications(dc: DataConnect, vars: GetClientMedicationsVariables): QueryPromise<GetClientMedicationsData, GetClientMedicationsVariables>;

interface GetClientMedicationsRef {
  ...
  (dc: DataConnect, vars: GetClientMedicationsVariables): QueryRef<GetClientMedicationsData, GetClientMedicationsVariables>;
}
export const getClientMedicationsRef: GetClientMedicationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getClientMedicationsRef:
```typescript
const name = getClientMedicationsRef.operationName;
console.log(name);
```

### Variables
The `GetClientMedications` query requires an argument of type `GetClientMedicationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetClientMedicationsVariables {
  clientProfileId: UUIDString;
}
```
### Return Type
Recall that executing the `GetClientMedications` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetClientMedicationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetClientMedications`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getClientMedications, GetClientMedicationsVariables } from '@dataconnect/generated';

// The `GetClientMedications` query requires an argument of type `GetClientMedicationsVariables`:
const getClientMedicationsVars: GetClientMedicationsVariables = {
  clientProfileId: ..., 
};

// Call the `getClientMedications()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getClientMedications(getClientMedicationsVars);
// Variables can be defined inline as well.
const { data } = await getClientMedications({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getClientMedications(dataConnect, getClientMedicationsVars);

console.log(data.medications);

// Or, you can use the `Promise` API.
getClientMedications(getClientMedicationsVars).then((response) => {
  const data = response.data;
  console.log(data.medications);
});
```

### Using `GetClientMedications`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getClientMedicationsRef, GetClientMedicationsVariables } from '@dataconnect/generated';

// The `GetClientMedications` query requires an argument of type `GetClientMedicationsVariables`:
const getClientMedicationsVars: GetClientMedicationsVariables = {
  clientProfileId: ..., 
};

// Call the `getClientMedicationsRef()` function to get a reference to the query.
const ref = getClientMedicationsRef(getClientMedicationsVars);
// Variables can be defined inline as well.
const ref = getClientMedicationsRef({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getClientMedicationsRef(dataConnect, getClientMedicationsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.medications);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.medications);
});
```

## GetClientVitalSigns
You can execute the `GetClientVitalSigns` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getClientVitalSigns(vars: GetClientVitalSignsVariables): QueryPromise<GetClientVitalSignsData, GetClientVitalSignsVariables>;

interface GetClientVitalSignsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientVitalSignsVariables): QueryRef<GetClientVitalSignsData, GetClientVitalSignsVariables>;
}
export const getClientVitalSignsRef: GetClientVitalSignsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getClientVitalSigns(dc: DataConnect, vars: GetClientVitalSignsVariables): QueryPromise<GetClientVitalSignsData, GetClientVitalSignsVariables>;

interface GetClientVitalSignsRef {
  ...
  (dc: DataConnect, vars: GetClientVitalSignsVariables): QueryRef<GetClientVitalSignsData, GetClientVitalSignsVariables>;
}
export const getClientVitalSignsRef: GetClientVitalSignsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getClientVitalSignsRef:
```typescript
const name = getClientVitalSignsRef.operationName;
console.log(name);
```

### Variables
The `GetClientVitalSigns` query requires an argument of type `GetClientVitalSignsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetClientVitalSignsVariables {
  clientProfileId: UUIDString;
}
```
### Return Type
Recall that executing the `GetClientVitalSigns` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetClientVitalSignsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetClientVitalSigns`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getClientVitalSigns, GetClientVitalSignsVariables } from '@dataconnect/generated';

// The `GetClientVitalSigns` query requires an argument of type `GetClientVitalSignsVariables`:
const getClientVitalSignsVars: GetClientVitalSignsVariables = {
  clientProfileId: ..., 
};

// Call the `getClientVitalSigns()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getClientVitalSigns(getClientVitalSignsVars);
// Variables can be defined inline as well.
const { data } = await getClientVitalSigns({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getClientVitalSigns(dataConnect, getClientVitalSignsVars);

console.log(data.vitalSigns);

// Or, you can use the `Promise` API.
getClientVitalSigns(getClientVitalSignsVars).then((response) => {
  const data = response.data;
  console.log(data.vitalSigns);
});
```

### Using `GetClientVitalSigns`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getClientVitalSignsRef, GetClientVitalSignsVariables } from '@dataconnect/generated';

// The `GetClientVitalSigns` query requires an argument of type `GetClientVitalSignsVariables`:
const getClientVitalSignsVars: GetClientVitalSignsVariables = {
  clientProfileId: ..., 
};

// Call the `getClientVitalSignsRef()` function to get a reference to the query.
const ref = getClientVitalSignsRef(getClientVitalSignsVars);
// Variables can be defined inline as well.
const ref = getClientVitalSignsRef({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getClientVitalSignsRef(dataConnect, getClientVitalSignsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.vitalSigns);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.vitalSigns);
});
```

## GetClientAppointments
You can execute the `GetClientAppointments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getClientAppointments(vars: GetClientAppointmentsVariables): QueryPromise<GetClientAppointmentsData, GetClientAppointmentsVariables>;

interface GetClientAppointmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientAppointmentsVariables): QueryRef<GetClientAppointmentsData, GetClientAppointmentsVariables>;
}
export const getClientAppointmentsRef: GetClientAppointmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getClientAppointments(dc: DataConnect, vars: GetClientAppointmentsVariables): QueryPromise<GetClientAppointmentsData, GetClientAppointmentsVariables>;

interface GetClientAppointmentsRef {
  ...
  (dc: DataConnect, vars: GetClientAppointmentsVariables): QueryRef<GetClientAppointmentsData, GetClientAppointmentsVariables>;
}
export const getClientAppointmentsRef: GetClientAppointmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getClientAppointmentsRef:
```typescript
const name = getClientAppointmentsRef.operationName;
console.log(name);
```

### Variables
The `GetClientAppointments` query requires an argument of type `GetClientAppointmentsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetClientAppointmentsVariables {
  clientProfileId: UUIDString;
}
```
### Return Type
Recall that executing the `GetClientAppointments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetClientAppointmentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetClientAppointments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getClientAppointments, GetClientAppointmentsVariables } from '@dataconnect/generated';

// The `GetClientAppointments` query requires an argument of type `GetClientAppointmentsVariables`:
const getClientAppointmentsVars: GetClientAppointmentsVariables = {
  clientProfileId: ..., 
};

// Call the `getClientAppointments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getClientAppointments(getClientAppointmentsVars);
// Variables can be defined inline as well.
const { data } = await getClientAppointments({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getClientAppointments(dataConnect, getClientAppointmentsVars);

console.log(data.appointments);

// Or, you can use the `Promise` API.
getClientAppointments(getClientAppointmentsVars).then((response) => {
  const data = response.data;
  console.log(data.appointments);
});
```

### Using `GetClientAppointments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getClientAppointmentsRef, GetClientAppointmentsVariables } from '@dataconnect/generated';

// The `GetClientAppointments` query requires an argument of type `GetClientAppointmentsVariables`:
const getClientAppointmentsVars: GetClientAppointmentsVariables = {
  clientProfileId: ..., 
};

// Call the `getClientAppointmentsRef()` function to get a reference to the query.
const ref = getClientAppointmentsRef(getClientAppointmentsVars);
// Variables can be defined inline as well.
const ref = getClientAppointmentsRef({ clientProfileId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getClientAppointmentsRef(dataConnect, getClientAppointmentsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.appointments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.appointments);
});
```

## GetCaregiverClients
You can execute the `GetCaregiverClients` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getCaregiverClients(vars: GetCaregiverClientsVariables): QueryPromise<GetCaregiverClientsData, GetCaregiverClientsVariables>;

interface GetCaregiverClientsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCaregiverClientsVariables): QueryRef<GetCaregiverClientsData, GetCaregiverClientsVariables>;
}
export const getCaregiverClientsRef: GetCaregiverClientsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCaregiverClients(dc: DataConnect, vars: GetCaregiverClientsVariables): QueryPromise<GetCaregiverClientsData, GetCaregiverClientsVariables>;

interface GetCaregiverClientsRef {
  ...
  (dc: DataConnect, vars: GetCaregiverClientsVariables): QueryRef<GetCaregiverClientsData, GetCaregiverClientsVariables>;
}
export const getCaregiverClientsRef: GetCaregiverClientsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCaregiverClientsRef:
```typescript
const name = getCaregiverClientsRef.operationName;
console.log(name);
```

### Variables
The `GetCaregiverClients` query requires an argument of type `GetCaregiverClientsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCaregiverClientsVariables {
  caregiverId: UUIDString;
}
```
### Return Type
Recall that executing the `GetCaregiverClients` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCaregiverClientsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetCaregiverClients`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCaregiverClients, GetCaregiverClientsVariables } from '@dataconnect/generated';

// The `GetCaregiverClients` query requires an argument of type `GetCaregiverClientsVariables`:
const getCaregiverClientsVars: GetCaregiverClientsVariables = {
  caregiverId: ..., 
};

// Call the `getCaregiverClients()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCaregiverClients(getCaregiverClientsVars);
// Variables can be defined inline as well.
const { data } = await getCaregiverClients({ caregiverId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCaregiverClients(dataConnect, getCaregiverClientsVars);

console.log(data.caregiverRelationships);

// Or, you can use the `Promise` API.
getCaregiverClients(getCaregiverClientsVars).then((response) => {
  const data = response.data;
  console.log(data.caregiverRelationships);
});
```

### Using `GetCaregiverClients`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCaregiverClientsRef, GetCaregiverClientsVariables } from '@dataconnect/generated';

// The `GetCaregiverClients` query requires an argument of type `GetCaregiverClientsVariables`:
const getCaregiverClientsVars: GetCaregiverClientsVariables = {
  caregiverId: ..., 
};

// Call the `getCaregiverClientsRef()` function to get a reference to the query.
const ref = getCaregiverClientsRef(getCaregiverClientsVars);
// Variables can be defined inline as well.
const ref = getCaregiverClientsRef({ caregiverId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCaregiverClientsRef(dataConnect, getCaregiverClientsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.caregiverRelationships);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.caregiverRelationships);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## AddNewVitalSign
You can execute the `AddNewVitalSign` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addNewVitalSign(): MutationPromise<AddNewVitalSignData, undefined>;

interface AddNewVitalSignRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<AddNewVitalSignData, undefined>;
}
export const addNewVitalSignRef: AddNewVitalSignRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addNewVitalSign(dc: DataConnect): MutationPromise<AddNewVitalSignData, undefined>;

interface AddNewVitalSignRef {
  ...
  (dc: DataConnect): MutationRef<AddNewVitalSignData, undefined>;
}
export const addNewVitalSignRef: AddNewVitalSignRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addNewVitalSignRef:
```typescript
const name = addNewVitalSignRef.operationName;
console.log(name);
```

### Variables
The `AddNewVitalSign` mutation has no variables.
### Return Type
Recall that executing the `AddNewVitalSign` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddNewVitalSignData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddNewVitalSignData {
  vitalSign_insert: VitalSign_Key;
}
```
### Using `AddNewVitalSign`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addNewVitalSign } from '@dataconnect/generated';


// Call the `addNewVitalSign()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addNewVitalSign();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addNewVitalSign(dataConnect);

console.log(data.vitalSign_insert);

// Or, you can use the `Promise` API.
addNewVitalSign().then((response) => {
  const data = response.data;
  console.log(data.vitalSign_insert);
});
```

### Using `AddNewVitalSign`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addNewVitalSignRef } from '@dataconnect/generated';


// Call the `addNewVitalSignRef()` function to get a reference to the mutation.
const ref = addNewVitalSignRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addNewVitalSignRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.vitalSign_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.vitalSign_insert);
});
```

## UpdateMedicationNotes
You can execute the `UpdateMedicationNotes` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateMedicationNotes(vars: UpdateMedicationNotesVariables): MutationPromise<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;

interface UpdateMedicationNotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMedicationNotesVariables): MutationRef<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;
}
export const updateMedicationNotesRef: UpdateMedicationNotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMedicationNotes(dc: DataConnect, vars: UpdateMedicationNotesVariables): MutationPromise<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;

interface UpdateMedicationNotesRef {
  ...
  (dc: DataConnect, vars: UpdateMedicationNotesVariables): MutationRef<UpdateMedicationNotesData, UpdateMedicationNotesVariables>;
}
export const updateMedicationNotesRef: UpdateMedicationNotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMedicationNotesRef:
```typescript
const name = updateMedicationNotesRef.operationName;
console.log(name);
```

### Variables
The `UpdateMedicationNotes` mutation requires an argument of type `UpdateMedicationNotesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMedicationNotesVariables {
  id: UUIDString;
  notes?: string | null;
}
```
### Return Type
Recall that executing the `UpdateMedicationNotes` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMedicationNotesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMedicationNotesData {
  medication_update?: Medication_Key | null;
}
```
### Using `UpdateMedicationNotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMedicationNotes, UpdateMedicationNotesVariables } from '@dataconnect/generated';

// The `UpdateMedicationNotes` mutation requires an argument of type `UpdateMedicationNotesVariables`:
const updateMedicationNotesVars: UpdateMedicationNotesVariables = {
  id: ..., 
  notes: ..., // optional
};

// Call the `updateMedicationNotes()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMedicationNotes(updateMedicationNotesVars);
// Variables can be defined inline as well.
const { data } = await updateMedicationNotes({ id: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMedicationNotes(dataConnect, updateMedicationNotesVars);

console.log(data.medication_update);

// Or, you can use the `Promise` API.
updateMedicationNotes(updateMedicationNotesVars).then((response) => {
  const data = response.data;
  console.log(data.medication_update);
});
```

### Using `UpdateMedicationNotes`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMedicationNotesRef, UpdateMedicationNotesVariables } from '@dataconnect/generated';

// The `UpdateMedicationNotes` mutation requires an argument of type `UpdateMedicationNotesVariables`:
const updateMedicationNotesVars: UpdateMedicationNotesVariables = {
  id: ..., 
  notes: ..., // optional
};

// Call the `updateMedicationNotesRef()` function to get a reference to the mutation.
const ref = updateMedicationNotesRef(updateMedicationNotesVars);
// Variables can be defined inline as well.
const ref = updateMedicationNotesRef({ id: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMedicationNotesRef(dataConnect, updateMedicationNotesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.medication_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.medication_update);
});
```


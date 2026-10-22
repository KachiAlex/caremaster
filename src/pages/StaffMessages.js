import React from 'react';
import Messages from './Messages';
import { getAllUsers } from '../api/usersAPI';
import assignmentAPI from '../api/assignmentAPI';
import { doc, getDoc } from 'backend/database';
import { db } from '../backend/config';

// Staff-side contact source for the "New Chat" dialog:
//   1. Admins and fellow care staff in the caller's institution (the backend
//      scopes getAllUsers by auth token).
//   2. Clients assigned to this caregiver — resolved through the clients
//      table to their linked user account, since conversation participants
//      are user ids. Clients without a user account can't receive messages
//      and are skipped.
const STAFF_ROLES = new Set([
  'admin', 'super-admin', 'superadmin', 'institution-admin', 'institutionadmin',
  'institution_admin', 'institutionAdmin',
  'caregiver', 'nurse', 'doctor', 'pharmacist',
  'service-provider', 'serviceProvider', 'partner',
]);

const resolveClientContact = async (assignment) => {
  const clientId = assignment.clientId || assignment.client_id;
  if (!clientId) return null;

  const fallbackName = assignment.clientName || assignment.client_name || 'Client';
  try {
    const snap = await getDoc(doc(db, 'clients', clientId));
    if (snap && snap.exists()) {
      const c = snap.data() || {};
      const userId = c.userId || c.user_id || c.uid || null;
      if (!userId) return null;
      return {
        id: userId,
        name: c.name || c.fullName || c.full_name || fallbackName,
        role: 'client',
      };
    }
  } catch {
    // Fall through — treat clientId as already being a user id.
  }
  return { id: clientId, name: fallbackName, role: 'client' };
};

const staffContactLoader = async ({ myId }) => {
  const [users, assignments] = await Promise.all([
    getAllUsers(),
    myId ? assignmentAPI.getAssignmentsByCaregiver(myId).catch(() => []) : Promise.resolve([]),
  ]);

  const staff = (users || [])
    .filter(u => u && u.id && String(u.id) !== String(myId)
      && (!u.status || u.status === 'active')
      && STAFF_ROLES.has(u.userType || u.user_type || u.role || ''))
    .map(u => ({
      id: u.id,
      name: u.name || u.displayName || u.email || 'User',
      role: u.role || u.userType || u.user_type || 'staff',
    }));

  const seenClientIds = new Set();
  const clientAssignments = (assignments || []).filter(a => {
    const cid = a.clientId || a.client_id;
    if (!cid || seenClientIds.has(cid)) return false;
    seenClientIds.add(cid);
    return true;
  });
  const clients = (await Promise.all(clientAssignments.map(resolveClientContact)))
    .filter(Boolean);

  // De-dupe (a client may also appear as a user; keep the staff entry)
  const seen = new Set(staff.map(c => String(c.id)));
  return [...staff, ...clients.filter(c => {
    const key = String(c.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })];
};

const StaffMessages = (props) => (
  <Messages
    contactLoader={staffContactLoader}
    newChatTitle="Start New Chat"
    contactsLoadingText="Loading contacts..."
    contactsEmptyTitle="No contacts found."
    contactsEmptyHint="You can message admins, other caregivers, and your assigned clients."
    {...props}
  />
);

export default StaffMessages;

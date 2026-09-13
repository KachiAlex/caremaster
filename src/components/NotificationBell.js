/**
 * NotificationBell — convenience wrapper that wraps NotificationPanel
 * in a NotificationProvider so layouts can drop it in with a single
 * import and a single prop (userId).
 *
 * Usage:
 *   import NotificationBell from '../components/NotificationBell';
 *   <NotificationBell userId={userProfile.id} />
 */

import React from 'react';
import { NotificationProvider } from '../contexts/NotificationContext';
import NotificationPanel from './NotificationPanel';

const NotificationBell = ({ userId }) => {
  if (!userId) return null;
  return (
    <NotificationProvider userId={userId}>
      <NotificationPanel userId={userId} />
    </NotificationProvider>
  );
};

export default NotificationBell;

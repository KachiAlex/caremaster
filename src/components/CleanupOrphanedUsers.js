import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import { Trash2, AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react';

const CleanupOrphanedUsers = ({ institutionId }) => {
  const [orphanedUsers, setOrphanedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  useEffect(() => {
    if (institutionId) {
      findOrphanedUsers();
    }
  }, [institutionId]);

  const findOrphanedUsers = async () => {
    setLoading(true);
    try {
      // Find ALL users (not just caregivers) that might be orphaned
      const usersRef = collection(db, 'users');
      
      // Try to get all users - if query fails, get all and filter
      let snapshot;
      try {
        const usersQuery = query(
          usersRef,
          where('userType', 'in', ['caregiver', 'doctor', 'nurse', 'pharmacist'])
        );
        snapshot = await getDocs(usersQuery);
      } catch (queryError) {
        // If query fails (e.g., missing index), get all users and filter client-side
        console.warn('Query with userType filter failed, fetching all users:', queryError);
        snapshot = await getDocs(usersRef);
      }
      
      const orphaned = [];
      
      snapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const userType = userData.userType || userData.type || userData.role;
        
        // Check if this is a caregiver/doctor/nurse/pharmacist
        const isStaffMember = ['caregiver', 'doctor', 'nurse', 'pharmacist'].includes(userType);
        
        // Consider orphaned if:
        // 1. Missing institutionId (for staff members)
        // 2. Missing name or email
        // 3. Has institutionId but it doesn't match current institution (and no name/email)
        const isOrphaned = isStaffMember && (
          !userData.institutionId || 
          userData.institutionId === '' ||
          userData.institutionId === null ||
          (!userData.name || userData.name === '') ||
          (!userData.email || userData.email === '')
        );
        
        if (isOrphaned) {
          orphaned.push({
            id: docSnap.id,
            ...userData,
            reason: !userData.institutionId ? 'Missing institutionId' : 
                   !userData.name ? 'Missing name' :
                   !userData.email ? 'Missing email' : 'Invalid data'
          });
        }
      });
      
      setOrphanedUsers(orphaned);
    } catch (error) {
      console.error('Error finding orphaned users:', error);
      toast.error('Failed to find orphaned users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === orphanedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(orphanedUsers.map(u => u.id)));
    }
  };

  const handleCleanup = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user to clean up');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.size} orphaned user(s)? This will delete both Firestore documents and Firebase Auth accounts. This action cannot be undone.`)) {
      return;
    }

    setCleaning(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const functions = getFunctions(getApp(), 'us-central1');
      const deleteUserFunction = httpsCallable(functions, 'deleteUserFunction');

      for (const userId of selectedUsers) {
        try {
          // Try to delete via Cloud Function (deletes both Auth and Firestore)
          try {
            await deleteUserFunction({ userId });
            successCount++;
          } catch (cloudError) {
            // If Cloud Function fails, try to delete from Firestore only
            console.warn(`Cloud Function delete failed for ${userId}, trying Firestore only:`, cloudError);
            await deleteDoc(doc(db, 'users', userId));
            successCount++;
            toast.warning(`User ${userId} deleted from Firestore but Auth account may still exist.`);
          }
        } catch (error) {
          console.error(`Error deleting user ${userId}:`, error);
          errorCount++;
        }
      }

      toast.success(`Successfully deleted ${successCount} user(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
      
      // Refresh the list
      await findOrphanedUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Error during cleanup: ' + error.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-yellow-600" />
              Cleanup Orphaned Users
            </h2>
            <p className="text-gray-600 mt-1">
              Find and remove users that were created but have missing or invalid data
            </p>
          </div>
          <button
            onClick={findOrphanedUsers}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Scanning for orphaned users...</p>
          </div>
        ) : orphanedUsers.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orphaned Users Found</h3>
            <p className="text-gray-600">All users appear to have valid data.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedUsers.size === orphanedUsers.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-600">
                  {selectedUsers.size} of {orphanedUsers.length} selected
                </span>
              </div>
              {selectedUsers.size > 0 && (
                <button
                  onClick={handleCleanup}
                  disabled={cleaning}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cleaning ? 'Deleting...' : `Delete ${selectedUsers.size} Selected`}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === orphanedUsers.length && orphanedUsers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orphanedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {user.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email || <span className="text-red-600">Missing</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.name || <span className="text-red-600">Missing</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.institutionId || <span className="text-red-600">Missing</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {user.reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will only delete Firestore documents. Firebase Auth accounts may still exist. 
                To fully clean up, you may need to delete Auth accounts manually from Firebase Console or use a Cloud Function.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CleanupOrphanedUsers;


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import { Trash2, AlertTriangle, CheckCircle, RefreshCw, Users, Search, Filter } from 'lucide-react';

const CleanupOrphanedUsers = ({ institutionId }) => {
  const [orphanedUsers, setOrphanedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    return orphanedUsers.filter(user => {
      const matchesSearch = !searchTerm || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || 
        (user.userType || user.type || user.role) === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [orphanedUsers, searchTerm, filterType]);

  // Find orphaned users - optimized to only scan institution users
  const findOrphanedUsers = useCallback(async () => {
    if (!institutionId) {
      toast.error('Institution ID is required');
      return;
    }

    setLoading(true);
    setOrphanedUsers([]);
    setSelectedUsers(new Set());

    try {
      const orphaned = [];
      const usersRef = collection(db, 'users');
      
      // Query only users from this institution first
      const institutionUsersQuery = query(
        usersRef,
        where('institutionId', '==', institutionId)
      );
      
      const institutionSnapshot = await getDocs(institutionUsersQuery);
      
      institutionSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const userType = userData.userType || userData.type || userData.role;
        const isStaffMember = ['caregiver', 'doctor', 'nurse', 'pharmacist'].includes(userType);
        
        // Check for missing critical data
        if (isStaffMember) {
          const issues = [];
          if (!userData.name && !userData.displayName) issues.push('Missing name');
          if (!userData.email) issues.push('Missing email');
          if (!userData.status || userData.status === 'incomplete') issues.push('Incomplete profile');
          
          if (issues.length > 0) {
            orphaned.push({
              id: docSnap.id,
              ...userData,
              userType: userType,
              reason: issues.join(', ')
            });
          }
        }
      });

      // Also check for users without institutionId (truly orphaned)
      const staffTypes = ['caregiver', 'doctor', 'nurse', 'pharmacist'];
      
      for (const staffType of staffTypes) {
        try {
          const typeQuery = query(
            usersRef,
            where('userType', '==', staffType)
          );
          
          const typeSnapshot = await getDocs(typeQuery);
          
          typeSnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            
            // Skip if already processed or has an institution
            if (userData.institutionId) return;
            
            // Check if already in orphaned list
            if (orphaned.some(u => u.id === docSnap.id)) return;
            
            orphaned.push({
              id: docSnap.id,
              ...userData,
              userType: staffType,
              reason: 'No institution assigned'
            });
          });
        } catch (queryError) {
          console.warn(`Query for ${staffType} failed:`, queryError.message);
        }
      }

      setOrphanedUsers(orphaned);
      
      if (orphaned.length === 0) {
        toast.success('No orphaned users found');
      } else {
        toast.info(`Found ${orphaned.length} orphaned user(s)`);
      }
    } catch (error) {
      console.error('Error finding orphaned users:', error);
      toast.error('Failed to scan for orphaned users');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    if (institutionId) {
      findOrphanedUsers();
    }
  }, [institutionId, findOrphanedUsers]);

  const handleSelectUser = useCallback((userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  }, [selectedUsers.size, filteredUsers]);

  // Batch delete for better performance
  const handleCleanup = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user to clean up');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.size} orphaned user(s)? This action cannot be undone.`)) {
      return;
    }

    setCleaning(true);
    setProgress({ current: 0, total: selectedUsers.size });

    try {
      const selectedArray = Array.from(selectedUsers);
      const batchSize = 10; // Firestore batch limit is 500, using 10 for safety
      let successCount = 0;
      let errorCount = 0;

      // Process in batches
      for (let i = 0; i < selectedArray.length; i += batchSize) {
        const batchUsers = selectedArray.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const userId of batchUsers) {
          const userRef = doc(db, 'users', userId);
          batch.delete(userRef);
          
          // Also try to delete from caregivers collection if exists
          const caregiverRef = doc(db, 'caregivers', userId);
          batch.delete(caregiverRef);
        }

        try {
          await batch.commit();
          successCount += batchUsers.length;
        } catch (batchError) {
          console.error('Batch delete error:', batchError);
          // Fall back to individual deletes
          for (const userId of batchUsers) {
            try {
              await deleteDoc(doc(db, 'users', userId));
              successCount++;
            } catch (individualError) {
              console.error(`Failed to delete ${userId}:`, individualError);
              errorCount++;
            }
          }
        }

        setProgress({ current: Math.min(i + batchSize, selectedArray.length), total: selectedArray.length });
      }

      toast.success(
        `Cleanup complete: ${successCount} deleted${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      );
      
      // Refresh the list
      await findOrphanedUsers();
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Cleanup failed: ' + error.message);
    } finally {
      setCleaning(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const userTypes = useMemo(() => {
    const types = new Set(orphanedUsers.map(u => u.userType || u.type || u.role));
    return Array.from(types).filter(Boolean);
  }, [orphanedUsers]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cleanup Orphaned Users</h2>
                <p className="text-sm text-gray-600">
                  Find and remove users with incomplete or invalid data
                </p>
              </div>
            </div>
            <button
              onClick={findOrphanedUsers}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Types</option>
                {userTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Scanning for orphaned users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {orphanedUsers.length === 0 ? 'No Orphaned Users Found' : 'No Matching Users'}
              </h3>
              <p className="text-gray-600">
                {orphanedUsers.length === 0 
                  ? 'All users have valid data.' 
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedUsers.size} of {filteredUsers.length} selected
                  </span>
                </div>
                {selectedUsers.size > 0 && (
                  <button
                    onClick={handleCleanup}
                    disabled={cleaning}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {cleaning 
                      ? `Deleting... (${progress.current}/${progress.total})` 
                      : `Delete ${selectedUsers.size} Selected`}
                  </button>
                )}
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedUsers.has(user.id) ? 'bg-amber-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {user.id.substring(0, 12)}...
                          </code>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {user.email || <span className="text-red-500 font-medium">Missing</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {user.name || user.displayName || <span className="text-red-500 font-medium">Missing</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.userType || user.type || user.role || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {user.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warning Note */}
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important Note</p>
                    <p>
                      Deleting users removes their Firestore documents. Firebase Auth accounts may need 
                      separate cleanup via the Firebase Console if they exist.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CleanupOrphanedUsers;

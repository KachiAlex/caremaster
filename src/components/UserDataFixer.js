import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';
import { collection, getDocs, updateDoc, doc } from 'backend/database';
import { db } from '../backend/config';

const UserDataFixer = ({ institutionId }) => {
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState(null);

  const fixAllUsers = async () => {
    setFixing(true);
    setResults(null);
    
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let fixed = 0;
      let skipped = 0;
      const errors = [];
      
      for (const userDoc of snapshot.docs) {
        try {
          const userId = userDoc.id;
          const userData = userDoc.data();
          
          // Skip if already has consistent data
          if (Array.isArray(userData.roles) && 
              userData.roles.length > 0 && 
              userData.userType === userData.roles[0] &&
              userData.type === userData.roles[0] &&
              userData.role === userData.roles[0]) {
            skipped++;
            continue;
          }
          
          // Determine primary role
          let primaryRole = userData.role || userData.userType || userData.type || 'client';
          
          // Check medical qualification for role override
          const medicalQual = (userData.medicalQualification || '').toLowerCase();
          if (medicalQual.includes('doctor') || medicalQual.includes('physician') || medicalQual.includes('md')) {
            primaryRole = 'doctor';
          } else if (medicalQual.includes('nurse') && medicalQual.includes('registered')) {
            primaryRole = 'nurse';
          } else if (medicalQual.includes('nurse')) {
            primaryRole = 'nurse';
          }
          
          // Build roles array
          let roles = [primaryRole];
          
          // Add existing roles if different
          if (Array.isArray(userData.roles)) {
            userData.roles.forEach(role => {
              if (!roles.includes(role)) {
                roles.push(role);
              }
            });
          }
          
          // Add additional roles based on flags
          if (userData.isAdmin || userData.institutionAdmin) {
            if (!roles.includes('admin')) {
              roles.push('admin');
            }
          }
          
          // Update user document
          await updateDoc(doc(db, 'users', userId), {
            userType: primaryRole,
            type: primaryRole,
            role: primaryRole,
            roles: roles,
            updatedAt: new Date()
          });
          
          console.log(`✅ Fixed ${userData.email || userId}: ${roles.join(', ')}`);
          fixed++;
          
        } catch (userError) {
          console.error(`❌ Error fixing user ${userDoc.id}:`, userError);
          errors.push({ userId: userDoc.id, error: userError.message });
        }
      }
      
      setResults({
        total: snapshot.size,
        fixed,
        skipped,
        errors
      });
      
      if (fixed > 0) {
        toast.success(`Fixed ${fixed} user(s) successfully!`);
      } else {
        toast.info('All users already have consistent data');
      }
      
    } catch (error) {
      console.error('Error fixing users:', error);
      toast.error('Failed to fix user data');
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">User Data Fixer</h3>
            <p className="text-sm text-gray-600">Fix inconsistent role data</p>
          </div>
        </div>
        <button
          onClick={fixAllUsers}
          disabled={fixing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
          {fixing ? 'Fixing...' : 'Fix All Users'}
        </button>
      </div>

      {results && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{results.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700">Fixed</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{results.fixed}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Skipped</p>
              <p className="text-2xl font-bold text-gray-900">{results.skipped}</p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-semibold text-red-700">Errors ({results.errors.length})</p>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {results.errors.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-600">
                    • User {err.userId}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
        <p className="text-xs text-gray-600">
          <strong>What this does:</strong> Ensures all users have consistent role data 
          (userType, type, role, and roles array). Detects doctors/nurses from medical qualifications.
        </p>
      </div>
    </div>
  );
};

export default UserDataFixer;


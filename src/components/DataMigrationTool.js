/**
 * Data Migration Tool Component
 * 
 * Features:
 * - Migrate clients to patients
 * - Generate patient IDs for existing records
 * - Validate and clean data
 * - Find and merge duplicates
 * - Migration history
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
  Search,
  Merge,
  Download,
  Play,
  Square
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import migrationAPI from '../utils/dataMigrationUtils';

const DataMigrationTool = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('migrate');
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [migrationHistory, setMigrationHistory] = useState([]);
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    if (institutionId && activeTab === 'history') {
      loadMigrationHistory();
    }
  }, [institutionId, activeTab]);

  const loadMigrationHistory = async () => {
    try {
      const history = await migrationAPI.getMigrationHistory(institutionId);
      setMigrationHistory(history);
    } catch (error) {
      console.error('Error loading migration history:', error);
      toast.error('Failed to load migration history');
    }
  };

  const handleMigrateClients = async () => {
    try {
      setLoading(true);
      setMigrationStatus(null);

      const result = await migrationAPI.migrateClientsToPatients(institutionId, {
        dryRun,
        batchSize: 50,
        generatePatientIds: true,
        preserveLegacyData: true
      });

      setMigrationStatus(result);
      
      if (dryRun) {
        toast.success(`Dry run complete: ${result.migrated} would be migrated, ${result.skipped} skipped, ${result.errors} errors`);
      } else {
        toast.success(`Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`);
        loadMigrationHistory();
      }
    } catch (error) {
      console.error('Error migrating clients:', error);
      toast.error('Migration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePatientIds = async () => {
    try {
      setLoading(true);
      const result = await migrationAPI.generatePatientIdsForExisting(institutionId, { dryRun });
      
      if (dryRun) {
        toast.success(`Dry run: ${result.updated} patient IDs would be generated`);
      } else {
        toast.success(`Generated ${result.updated} patient IDs`);
      }
    } catch (error) {
      console.error('Error generating patient IDs:', error);
      toast.error('Failed to generate patient IDs');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateData = async () => {
    try {
      setLoading(true);
      const results = await migrationAPI.validateAndCleanPatientData(institutionId);
      setValidationResults(results);
      toast.success('Data validation complete');
    } catch (error) {
      console.error('Error validating data:', error);
      toast.error('Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFindDuplicates = async () => {
    try {
      setLoading(true);
      const duplicateGroups = await migrationAPI.findDuplicatePatients(institutionId, ['email', 'phone', 'name']);
      setDuplicates(duplicateGroups);
      toast.success(`Found ${duplicateGroups.length} duplicate groups`);
    } catch (error) {
      console.error('Error finding duplicates:', error);
      toast.error('Failed to find duplicates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Migration Tool</h2>
              <p className="text-sm text-gray-600">Migrate and clean legacy data</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Dry Run (Preview Only)</span>
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex space-x-1 border-b border-gray-200">
          {[
            { id: 'migrate', label: 'Migrate Clients', icon: RefreshCw },
            { id: 'validate', label: 'Validate Data', icon: CheckCircle },
            { id: 'duplicates', label: 'Find Duplicates', icon: Search },
            { id: 'history', label: 'Migration History', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Migrate Clients Tab */}
      {activeTab === 'migrate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Migrate Clients to Patients</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This will migrate all clients from the legacy 'clients' collection to the new 'patients' collection.
                  Patient IDs will be automatically generated for records without them.
                </p>
              </div>
              <button
                onClick={handleMigrateClients}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    {dryRun ? 'Preview Migration' : 'Start Migration'}
                  </>
                )}
              </button>

              {migrationStatus && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Migration Results</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{migrationStatus.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Migrated</p>
                      <p className="text-2xl font-bold text-green-600">{migrationStatus.migrated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-600">{migrationStatus.skipped}</p>
                    </div>
                    {migrationStatus.errors > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Errors</p>
                        <p className="text-2xl font-bold text-red-600">{migrationStatus.errors}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Patient IDs</h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Generate patient IDs for existing patient records that don't have one.
                </p>
              </div>
              <button
                onClick={handleGeneratePatientIds}
                disabled={loading}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    {dryRun ? 'Preview' : 'Generate IDs'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validate Data Tab */}
      {activeTab === 'validate' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Data Validation</h3>
            <button
              onClick={handleValidateData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Validating...' : 'Run Validation'}
            </button>
          </div>

          {validationResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{validationResults.totalPatients}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Missing Fields</p>
                  <p className="text-2xl font-bold text-red-600">{validationResults.summary.missingFields}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">Invalid Dates</p>
                  <p className="text-2xl font-bold text-yellow-600">{validationResults.summary.invalidDates}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600">Duplicates</p>
                  <p className="text-2xl font-bold text-orange-600">{validationResults.summary.duplicates}</p>
                </div>
              </div>

              {validationResults.issues.missingRequiredFields.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Missing Required Fields</h4>
                  <div className="max-h-48 overflow-y-auto">
                    {validationResults.issues.missingRequiredFields.slice(0, 20).map((issue, idx) => (
                      <div key={idx} className="text-sm text-gray-600 p-2 border-b">
                        Patient {issue.id}: Missing {issue.field}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Find Duplicates Tab */}
      {activeTab === 'duplicates' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Find Duplicate Patients</h3>
            <button
              onClick={handleFindDuplicates}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Find Duplicates'}
            </button>
          </div>

          {duplicates.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Found {duplicates.length} duplicate groups</p>
              {duplicates.map((group, idx) => (
                <div key={idx} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Duplicate Group {idx + 1}</h4>
                  <div className="space-y-2">
                    {group.map(patient => (
                      <div key={patient.id} className="text-sm text-gray-700">
                        <strong>{patient.name || patient.fullName}</strong> - {patient.email || patient.phone || 'No contact'}
                        <span className="text-gray-500 ml-2">(ID: {patient.id})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Migration History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Migration History</h3>
            <button
              onClick={loadMigrationHistory}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {migrationHistory.map(migration => (
              <div key={migration.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{migration.type}</p>
                    <p className="text-sm text-gray-600">
                      Started: {migration.startedAt ? new Date(migration.startedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    migration.status === 'completed' ? 'bg-green-100 text-green-800' :
                    migration.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {migration.status}
                  </span>
                </div>
                {migration.stats && (
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>Total: {migration.stats.total}</div>
                    <div className="text-green-600">Migrated: {migration.stats.migrated}</div>
                    <div className="text-yellow-600">Skipped: {migration.stats.skipped}</div>
                    {migration.stats.errors > 0 && (
                      <div className="text-red-600">Errors: {migration.stats.errors}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMigrationTool;


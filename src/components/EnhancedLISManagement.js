/**
 * Enhanced LIS Management Component
 * 
 * Phase 2 Implementation - Enhanced lab workflow:
 * - Barcode sample labeling
 * - Sample tracking workflow
 * - Automated normal range comparisons
 * - Pathologist verification
 * - Result attachments
 */

import React, { useState, useEffect } from 'react';
import {
  TestTube,
  Barcode,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Upload,
  Eye,
  X,
  FileText,
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  createLabSample,
  updateSampleStatus,
  createLabResult,
  verifyLabResult,
  getLabSamples,
  getLabResultBySample,
  getSampleByBarcode,
  compareWithNormalRange,
  getLabStats,
  SAMPLE_STATUS,
  RESULT_STATUS
} from '../api/enhancedLISAPI';
import { getAllDiagnostics, updateDiagnosticTest } from '../api/diagnosticsAPI';
import fileStorageService from '../services/fileStorageService';

const EnhancedLISManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;
  const isPathologist = userProfile?.userType === 'doctor' || userProfile?.type === 'doctor';

  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState([]);
  const [pendingTests, setPendingTests] = useState([]);
  const [stats, setStats] = useState(null);
  const [filteredSamples, setFilteredSamples] = useState([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  
  // Modal states
  const [showCreateSampleModal, setShowCreateSampleModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  
  // Selected items
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  
  // Form states
  const [sampleForm, setSampleForm] = useState({
    sampleType: 'blood',
    sampleVolume: '',
    collectionSite: '',
    notes: ''
  });
  
  const [resultForm, setResultForm] = useState({
    results: [{ parameter: '', value: '', unit: '', normalRange: '', isAbnormal: false }],
    notes: '',
    attachments: []
  });

  useEffect(() => {
    if (!institutionId) return;
    
    loadSamples();
    loadPendingTests();
    loadStats();
  }, [institutionId]);

  useEffect(() => {
    filterSamples();
  }, [samples, statusFilter, barcodeSearch]);

  const loadSamples = async () => {
    if (!institutionId) return;
    
    try {
      setLoading(true);
      const samplesData = await getLabSamples(institutionId);
      setSamples(samplesData);
    } catch (error) {
      console.error('Error loading samples:', error);
      toast.error('Failed to load samples');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTests = async () => {
    if (!institutionId) return;
    
    try {
      const tests = await getAllDiagnostics(institutionId);
      const pending = tests.filter(t => t.status === 'pending' && !t.sampleId);
      setPendingTests(pending);
    } catch (error) {
      console.error('Error loading pending tests:', error);
    }
  };

  const loadStats = async () => {
    if (!institutionId) return;
    
    try {
      const statsData = await getLabStats(institutionId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterSamples = () => {
    let filtered = [...samples];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (barcodeSearch) {
      filtered = filtered.filter(s => 
        s.barcode?.toLowerCase().includes(barcodeSearch.toLowerCase())
      );
    }

    setFilteredSamples(filtered);
  };

  const handleCreateSample = async () => {
    if (!selectedTest) {
      toast.error('Please select a test');
      return;
    }

    try {
      setLoading(true);
      const sample = await createLabSample({
        testId: selectedTest.id,
        patientId: selectedTest.clientId || selectedTest.patientId,
        patientName: selectedTest.clientName || selectedTest.patientName,
        institutionId,
        testType: selectedTest.testType,
        testName: selectedTest.testName || selectedTest.testType,
        collectedBy: userProfile?.id || userProfile?.uid,
        collectedByName: userProfile?.name || userProfile?.displayName,
        ...sampleForm
      });
      
      toast.success(`Sample created with barcode: ${sample.barcode}`);
      setShowCreateSampleModal(false);
      setShowBarcodeModal(true);
      setSelectedSample(sample);
      setSampleForm({
        sampleType: 'blood',
        sampleVolume: '',
        collectionSite: '',
        notes: ''
      });
      loadSamples();
      loadPendingTests();
      loadStats();
    } catch (error) {
      console.error('Error creating sample:', error);
      toast.error('Failed to create sample');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSampleStatus = async (sampleId, newStatus) => {
    try {
      await updateSampleStatus(sampleId, newStatus, {
        updatedBy: userProfile?.id || userProfile?.uid
      });
      toast.success('Sample status updated');
      loadSamples();
      loadStats();
    } catch (error) {
      console.error('Error updating sample status:', error);
      toast.error('Failed to update sample status');
    }
  };

  const handleAddResult = async () => {
    if (!selectedSample || resultForm.results.length === 0) {
      toast.error('Please fill in result data');
      return;
    }

    try {
      setLoading(true);
      
      // Compare each result with normal range
      const resultsWithComparison = await Promise.all(
        resultForm.results.map(async (result) => {
          if (!result.parameter || !result.value) return result;
          
          const comparison = await compareWithNormalRange(
            institutionId,
            selectedSample.testType,
            result.parameter,
            result.value,
            result.unit
          );
          
          return {
            ...result,
            isAbnormal: comparison.isAbnormal,
            comparison: comparison.comparison,
            normalRange: comparison.normalRange
          };
        })
      );

      await createLabResult(selectedSample.id, {
        testId: selectedSample.testId,
        patientId: selectedSample.patientId,
        institutionId,
        testName: selectedSample.testName,
        results: resultsWithComparison,
        technicianId: userProfile?.id || userProfile?.uid,
        technicianName: userProfile?.name || userProfile?.displayName,
        notes: resultForm.notes,
        attachments: resultForm.attachments
      });
      
      toast.success('Lab result created');
      setShowResultModal(false);
      setResultForm({
        results: [{ parameter: '', value: '', unit: '', normalRange: '', isAbnormal: false }],
        notes: '',
        attachments: []
      });
      loadSamples();
      loadStats();
    } catch (error) {
      console.error('Error creating result:', error);
      toast.error('Failed to create lab result');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResult = async (isApproved) => {
    if (!selectedResult) return;

    const verificationNotes = isApproved 
      ? prompt('Verification notes (optional):') || ''
      : prompt('Rejection reason (required):') || '';

    if (!isApproved && !verificationNotes) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      await verifyLabResult(selectedResult.id, {
        verifiedBy: userProfile?.id || userProfile?.uid,
        verifiedByName: userProfile?.name || userProfile?.displayName,
        verificationNotes,
        isApproved
      });
      
      toast.success(isApproved ? 'Result verified' : 'Result rejected');
      setShowVerifyModal(false);
      loadSamples();
    } catch (error) {
      console.error('Error verifying result:', error);
      toast.error('Failed to verify result');
    }
  };

  const handleBarcodeScan = async (barcode) => {
    try {
      const sample = await getSampleByBarcode(barcode);
      if (sample) {
        setSelectedSample(sample);
        const result = await getLabResultBySample(sample.id);
        if (result) {
          setSelectedResult(result);
          setShowVerifyModal(true);
        } else {
          setShowResultModal(true);
        }
      } else {
        toast.error('Sample not found');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast.error('Failed to scan barcode');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case SAMPLE_STATUS.COLLECTED:
        return 'bg-blue-100 text-blue-800';
      case SAMPLE_STATUS.IN_PROCESS:
        return 'bg-yellow-100 text-yellow-800';
      case SAMPLE_STATUS.COMPLETED:
        return 'bg-orange-100 text-orange-800';
      case SAMPLE_STATUS.VERIFIED:
        return 'bg-green-100 text-green-800';
      case SAMPLE_STATUS.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced LIS Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage lab samples, results, and verification workflow
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
          >
            <Barcode className="h-4 w-4" />
            Scan Barcode
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Samples</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TestTube className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.collected}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Process</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProcess}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TestTube className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tests (for creating samples) */}
      {pendingTests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Tests (Create Sample)</h3>
          <div className="space-y-2">
            {pendingTests.slice(0, 5).map((test) => (
              <div
                key={test.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {test.testName || test.testType} - {test.clientName || test.patientName}
                    </p>
                    <p className="text-xs text-gray-600">{test.reason || 'No reason provided'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTest(test);
                      setShowCreateSampleModal(true);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Create Sample
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.values(SAMPLE_STATUS).map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search by Barcode
            </label>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                placeholder="Enter barcode..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Barcode</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Patient</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Test</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sample Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Collected</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    Loading samples...
                  </td>
                </tr>
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No samples found
                  </td>
                </tr>
              ) : (
                filteredSamples.map((sample) => (
                  <tr key={sample.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-900">
                      {sample.barcode}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {sample.patientName || sample.patientId?.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {sample.testName || sample.testType}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {sample.sampleType || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(sample.status)}`}>
                        {sample.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(sample.collectionDate)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {sample.status === SAMPLE_STATUS.COLLECTED && (
                          <button
                            onClick={() => {
                              setSelectedSample(sample);
                              handleUpdateSampleStatus(sample.id, SAMPLE_STATUS.IN_PROCESS);
                            }}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                          >
                            Start Processing
                          </button>
                        )}
                        {sample.status === SAMPLE_STATUS.IN_PROCESS && (
                          <button
                            onClick={() => {
                              setSelectedSample(sample);
                              setShowResultModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Enter Results
                          </button>
                        )}
                        {sample.status === SAMPLE_STATUS.COMPLETED && isPathologist && (
                          <button
                            onClick={async () => {
                              const result = await getLabResultBySample(sample.id);
                              if (result) {
                                setSelectedResult(result);
                                setShowVerifyModal(true);
                              }
                            }}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSample(sample);
                            handleBarcodeScan(sample.barcode);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Sample Modal */}
      {showCreateSampleModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Lab Sample</h3>
              <button
                onClick={() => setShowCreateSampleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Test: {selectedTest.testName || selectedTest.testType}</p>
                <p className="text-sm text-gray-600">Patient: {selectedTest.clientName || selectedTest.patientName}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sample Type *
                </label>
                <select
                  value={sampleForm.sampleType}
                  onChange={(e) => setSampleForm({ ...sampleForm, sampleType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="blood">Blood</option>
                  <option value="urine">Urine</option>
                  <option value="stool">Stool</option>
                  <option value="sputum">Sputum</option>
                  <option value="swab">Swab</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sample Volume
                </label>
                <input
                  type="text"
                  value={sampleForm.sampleVolume}
                  onChange={(e) => setSampleForm({ ...sampleForm, sampleVolume: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 5ml"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Collection Site
                </label>
                <input
                  type="text"
                  value={sampleForm.collectionSite}
                  onChange={(e) => setSampleForm({ ...sampleForm, collectionSite: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Left arm, Right arm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={sampleForm.notes}
                  onChange={(e) => setSampleForm({ ...sampleForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Collection notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateSampleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSample}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Sample'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Display Modal */}
      {showBarcodeModal && selectedSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sample Barcode</h3>
              <button
                onClick={() => {
                  setShowBarcodeModal(false);
                  setSelectedSample(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-gray-50 rounded-lg">
                <Barcode className="h-24 w-full mx-auto mb-4" />
                <p className="text-2xl font-mono font-bold text-gray-900">{selectedSample.barcode}</p>
              </div>
              <p className="text-sm text-gray-600">
                Print this barcode and attach to sample container
              </p>
              <button
                onClick={() => {
                  // Print barcode functionality
                  window.print();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Print Barcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Results Modal */}
      {showResultModal && selectedSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Enter Lab Results</h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Sample: {selectedSample.barcode}</p>
                <p className="text-sm text-gray-600">Test: {selectedSample.testName || selectedSample.testType}</p>
                <p className="text-sm text-gray-600">Patient: {selectedSample.patientName}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Results
                </label>
                {resultForm.results.map((result, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      value={result.parameter}
                      onChange={(e) => {
                        const newResults = [...resultForm.results];
                        newResults[index].parameter = e.target.value;
                        setResultForm({ ...resultForm, results: newResults });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Parameter"
                    />
                    <input
                      type="text"
                      value={result.value}
                      onChange={(e) => {
                        const newResults = [...resultForm.results];
                        newResults[index].value = e.target.value;
                        setResultForm({ ...resultForm, results: newResults });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Value"
                    />
                    <input
                      type="text"
                      value={result.unit}
                      onChange={(e) => {
                        const newResults = [...resultForm.results];
                        newResults[index].unit = e.target.value;
                        setResultForm({ ...resultForm, results: newResults });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Unit"
                    />
                    <button
                      onClick={() => {
                        const newResults = resultForm.results.filter((_, i) => i !== index);
                        setResultForm({ ...resultForm, results: newResults });
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setResultForm({
                      ...resultForm,
                      results: [...resultForm.results, { parameter: '', value: '', unit: '', normalRange: '', isAbnormal: false }]
                    });
                  }}
                  className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  + Add Result
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={resultForm.notes}
                  onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResult}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Results'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify Result Modal */}
      {showVerifyModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Verify Lab Result</h3>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Test: {selectedResult.testName}</p>
                <p className="text-sm text-gray-600">Patient: {selectedResult.patientName}</p>
                {selectedResult.hasAbnormal && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">
                      ⚠️ Abnormal Results Detected
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Parameters: {selectedResult.abnormalResults?.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Results
                </label>
                <div className="space-y-2">
                  {selectedResult.results?.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{result.parameter}</span>
                        {result.isAbnormal && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                            ABNORMAL
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Value: </span>
                          <span className="font-semibold">{result.value} {result.unit}</span>
                        </div>
                        {result.normalRange && (
                          <div>
                            <span className="text-gray-600">Normal: </span>
                            <span className="font-semibold">
                              {result.normalRange.min} - {result.normalRange.max} {result.normalRange.unit}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Status: </span>
                          <span className={result.isAbnormal ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                            {result.comparison || (result.isAbnormal ? 'Abnormal' : 'Normal')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleVerifyResult(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleVerifyResult(true);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve & Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedLISManagement;


import React, { useState, useEffect } from 'react';
import { X, Plus, TestTube, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getClientDiagnostics, createDiagnosticTest } from '../api/diagnosticsAPI';
import { useUser } from '../contexts/UserContext';

const LabTestsLogModal = ({ patient, isOpen, onClose, institutionId }) => {
  const { user, userProfile } = useUser();
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testFormData, setTestFormData] = useState({
    testType: '',
    reason: '',
    urgency: 'routine',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && patient?.id) {
      loadLabTests();
    }
  }, [isOpen, patient]);

  const loadLabTests = async () => {
    if (!patient?.id) return;
    
    setLoading(true);
    try {
      const patientId = patient.id || patient.patientId || patient.uid;
      const testsData = await getClientDiagnostics(patientId);
      setLabTests(testsData || []);
    } catch (error) {
      console.error('Error loading lab tests:', error);
      toast.error('Failed to load lab tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = () => {
    setShowAddForm(true);
    setTestFormData({
      testType: '',
      reason: '',
      urgency: 'routine',
      notes: ''
    });
  };

  const handleSubmitTest = async () => {
    try {
      if (!testFormData.testType) {
        toast.error('Please enter a test type');
        return;
      }

      const patientId = patient.id || patient.patientId || patient.uid;
      const patientName = patient.name || patient.fullName || 'Patient';
      const orderedBy = user?.uid;
      const orderedByName = userProfile?.name || userProfile?.displayName || 'Doctor';

      await createDiagnosticTest({
        clientId: patientId,
        clientName: patientName,
        orderedBy: orderedBy,
        orderedByName: orderedByName,
        institutionId: institutionId,
        testType: testFormData.testType,
        testName: testFormData.testType,
        reason: testFormData.reason,
        urgency: testFormData.urgency,
        notes: testFormData.notes
      });

      toast.success('Lab test ordered successfully');
      await loadLabTests();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating lab test:', error);
      toast.error('Failed to order lab test');
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'routine':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  const patientId = patient?.id || patient?.patientId || patient?.uid;
  const patientName = patient?.name || patient?.fullName || 'Patient';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <TestTube className="h-7 w-7 mr-3" />
              Lab Tests Log
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              {patientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Order New Lab Test</h3>
                <p className="text-sm text-gray-600">Fill in the lab test details</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Test Type *
                  </label>
                  <input
                    type="text"
                    value={testFormData.testType}
                    onChange={(e) => setTestFormData(prev => ({ ...prev, testType: e.target.value }))}
                    placeholder="e.g., Complete Blood Count (CBC), Blood Glucose, Lipid Panel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for Test
                  </label>
                  <textarea
                    value={testFormData.reason}
                    onChange={(e) => setTestFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason for ordering this test"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Urgency
                  </label>
                  <select
                    value={testFormData.urgency}
                    onChange={(e) => setTestFormData(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={testFormData.notes}
                    onChange={(e) => setTestFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes or instructions"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelAdd}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitTest}
                    disabled={!testFormData.testType}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Order Test
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Add Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleAddTest}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Order New Lab Test
                </button>
              </div>

              {/* Logs List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading lab tests...</p>
                </div>
              ) : labTests.length === 0 ? (
                <div className="text-center py-12">
                  <TestTube className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No lab tests ordered yet</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Order New Lab Test" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {labTests.map((test) => {
                    const testDate = formatDate(test.createdAt);
                    const orderedByName = test.orderedByName || 'Unknown Doctor';
                    const statusColor = getStatusColor(test.status);
                    const urgencyColor = getUrgencyColor(test.urgency);

                    return (
                      <div
                        key={test.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                <TestTube className="h-5 w-5 mr-2 text-purple-600" />
                                {test.testType || test.testName || 'Lab Test'}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {test.urgency && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor}`}>
                                    {test.urgency}
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                  {test.status || 'pending'}
                                </span>
                              </div>
                            </div>
                            {test.reason && (
                              <p className="text-sm text-gray-700 mb-2">
                                <span className="font-medium">Reason:</span> {test.reason}
                              </p>
                            )}
                            {test.doctorNotes && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                                <p className="text-xs font-medium text-blue-900 mb-1">Doctor Notes:</p>
                                <p className="text-sm text-blue-800">{test.doctorNotes.notes || test.doctorNotes}</p>
                                {test.doctorNotes.diagnosis && (
                                  <p className="text-sm text-blue-800 mt-1">
                                    <span className="font-medium">Diagnosis:</span> {test.doctorNotes.diagnosis}
                                  </p>
                                )}
                              </div>
                            )}
                            {test.results && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                                <p className="text-xs font-medium text-green-900 mb-1">Results Available</p>
                                {Array.isArray(test.results) ? (
                                  <ul className="text-sm text-green-800 space-y-1">
                                    {test.results.map((result, idx) => (
                                      <li key={idx}>
                                        {result.name || result.test}: {result.value} {result.unit || ''}
                                        {result.status && (
                                          <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                                            result.status === 'abnormal' ? 'bg-red-100 text-red-800' :
                                            result.status === 'normal' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {result.status}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-green-800">{test.results}</p>
                                )}
                              </div>
                            )}
                            {test.notes && (
                              <p className="text-sm text-gray-600 mb-2">{test.notes}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span>Ordered by: {orderedByName}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{testDate}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabTestsLogModal;


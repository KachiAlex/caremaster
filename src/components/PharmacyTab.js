import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  Calendar,
  User,
  Plus,
  Edit,
  Trash2,
  Download,
  Receipt,
  Clock,
  Check,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { pharmacyAPI } from '../api/pharmacyAPI';
import prescriptionsAPI from '../api/prescriptionsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import PharmacyInvoiceGenerator from './PharmacyInvoiceGenerator';
import { drugInteractionService } from '../services/drugInteractionService';

const PharmacyTab = ({ 
  user, 
  userProfile, 
  institutionId, 
  assignedClients = [] 
}) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState([]);
  const [pharmacyStats, setPharmacyStats] = useState(null);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [safetyCheck, setSafetyCheck] = useState(null);
  const [showSafetyPanel, setShowSafetyPanel] = useState(false);

  // Load pharmacy statistics
  useEffect(() => {
    if (institutionId) {
      loadPharmacyStats();
    }
  }, [institutionId]);

  // Load prescriptions when client is selected
  useEffect(() => {
    if (selectedClientId) {
      loadPrescriptions();
    }
  }, [selectedClientId]);

  // Filter prescriptions based on search and status
  useEffect(() => {
    let filtered = prescriptions;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dosage?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.pharmacyStatus === statusFilter);
    }

    setFilteredPrescriptions(filtered);
  }, [prescriptions, searchTerm, statusFilter]);

  const loadPharmacyStats = async () => {
    try {
      const stats = await pharmacyAPI.getPharmacyStats(institutionId);
      setPharmacyStats(stats);
    } catch (error) {
      console.error('Error loading pharmacy stats:', error);
    }
  };

  const loadPrescriptions = async () => {
    if (!selectedClientId) return;
    
    setLoading(true);
    try {
      console.log('💊 Pharmacy - Loading prescriptions for client:', selectedClientId);
      const data = await prescriptionsAPI.getPrescriptionsByClient(selectedClientId);
      setPrescriptions(data);
      console.log('✅ Pharmacy - Prescriptions loaded:', data.length);
      
      // Run safety check when prescriptions are loaded
      if (data.length > 0 && selectedClient) {
        runSafetyCheck(data);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const runSafetyCheck = async (prescriptionsList) => {
    try {
      const check = await drugInteractionService.comprehensiveSafetyCheck(
        prescriptionsList,
        selectedClient?.allergies,
        selectedClient?.medicalConditions
      );
      setSafetyCheck(check);
      
      // Show panel if there are critical alerts
      if (check.criticalAlerts.length > 0) {
        setShowSafetyPanel(true);
        toast.warning(`${check.criticalAlerts.length} critical safety alert(s) detected!`);
      }
    } catch (error) {
      console.error('Error running safety check:', error);
    }
  };

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    const client = assignedClients.find(c => c.id === clientId);
    setSelectedClient(client);
    setSelectedPrescriptions([]);
  };

  const handleUpdatePrescription = async (prescriptionId, pharmacyData) => {
    try {
      await pharmacyAPI.updatePrescriptionPharmacy(prescriptionId, {
        ...pharmacyData,
        pharmacistId: user?.uid,
        pharmacistName: userProfile?.name || userProfile?.displayName
      });
      
      toast.success('Prescription updated successfully');
      loadPrescriptions();
      loadPharmacyStats();
      setEditingPrescription(null);
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast.error('Failed to update prescription');
    }
  };

  const togglePrescriptionSelection = (prescription) => {
    setSelectedPrescriptions(prev => {
      const exists = prev.find(p => p.id === prescription.id);
      if (exists) {
        return prev.filter(p => p.id !== prescription.id);
      } else {
        return [...prev, prescription];
      }
    });
  };

  const handleGenerateInvoice = () => {
    if (selectedPrescriptions.length === 0) {
      toast.warning('Please select at least one prescription to generate invoice');
      return;
    }

    const hasUnavailable = selectedPrescriptions.some(p => 
      p.pharmacyData?.available === false
    );

    if (hasUnavailable) {
      toast.warning('Some selected medications are marked as unavailable');
    }

    setShowInvoiceGenerator(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      partially_filled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Partially Filled' },
      filled: { bg: 'bg-green-100', text: 'text-green-800', label: 'Filled' },
      unavailable: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unavailable' }
    };

    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Pharmacy Statistics */}
      {pharmacyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Prescriptions</p>
                <p className="text-3xl font-bold mt-2">{pharmacyStats.totalPrescriptions}</p>
              </div>
              <Pill className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold mt-2">{pharmacyStats.pendingPrescriptions}</p>
              </div>
              <Clock className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Filled</p>
                <p className="text-3xl font-bold mt-2">{pharmacyStats.filledPrescriptions}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">₦{pharmacyStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        </div>
      )}

      {/* Client Selection */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 text-blue-600 mr-2" />
          Select Client
        </h3>
        
        <select
          value={selectedClientId}
          onChange={(e) => handleClientSelect(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select a client --</option>
          {assignedClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name || client.fullName || 'Unknown Client'}
            </option>
          ))}
        </select>

        {selectedClient && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Client:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {selectedClient.name || selectedClient.fullName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Age:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {selectedClient.age || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Allergies:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {selectedClient.allergies || 'None recorded'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Conditions:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {selectedClient.medicalConditions || 'None recorded'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Check Panel */}
      {selectedClientId && safetyCheck && (
        <div className={`rounded-2xl shadow-lg border p-6 ${
          safetyCheck.criticalAlerts.length > 0 
            ? 'bg-red-50 border-red-200' 
            : safetyCheck.interactions.hasMajorInteractions
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`h-6 w-6 ${
                safetyCheck.criticalAlerts.length > 0 
                  ? 'text-red-600' 
                  : safetyCheck.interactions.hasMajorInteractions
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
              <div>
                <h3 className={`text-lg font-semibold ${
                  safetyCheck.criticalAlerts.length > 0 
                    ? 'text-red-900' 
                    : safetyCheck.interactions.hasMajorInteractions
                    ? 'text-yellow-900'
                    : 'text-green-900'
                }`}>
                  Medication Safety Check
                </h3>
                <p className={`text-sm ${
                  safetyCheck.criticalAlerts.length > 0 
                    ? 'text-red-700' 
                    : safetyCheck.interactions.hasMajorInteractions
                    ? 'text-yellow-700'
                    : 'text-green-700'
                }`}>
                  {safetyCheck.isSafe 
                    ? 'No critical issues detected' 
                    : `${safetyCheck.criticalAlerts.length} critical alert(s) found`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSafetyPanel(!showSafetyPanel)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
            >
              {showSafetyPanel ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showSafetyPanel && (
            <div className="space-y-4">
              {/* Critical Alerts */}
              {safetyCheck.criticalAlerts.length > 0 && (
                <div className="bg-white rounded-lg p-4 border-2 border-red-300">
                  <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Critical Alerts - DO NOT DISPENSE
                  </h4>
                  <div className="space-y-2">
                    {safetyCheck.criticalAlerts.map((alert, index) => (
                      <div key={index} className="bg-red-50 rounded p-3 border border-red-200">
                        <p className="font-medium text-red-900">{alert.message || alert.description}</p>
                        {alert.recommendation && (
                          <p className="text-sm text-red-700 mt-1">→ {alert.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drug Interactions */}
              {safetyCheck.interactions.interactions.length > 0 && (
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Drug Interactions ({safetyCheck.interactions.interactions.length})
                  </h4>
                  <div className="space-y-2">
                    {safetyCheck.interactions.interactions.map((interaction, index) => (
                      <div key={index} className={`rounded p-3 border ${
                        interaction.severity === 'critical' 
                          ? 'bg-red-50 border-red-200' 
                          : interaction.severity === 'major'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {interaction.drug1} + {interaction.drug2}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">{interaction.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            interaction.severity === 'critical' 
                              ? 'bg-red-200 text-red-900' 
                              : interaction.severity === 'major'
                              ? 'bg-orange-200 text-orange-900'
                              : 'bg-yellow-200 text-yellow-900'
                          }`}>
                            {interaction.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergy Alerts */}
              {safetyCheck.allergies.some(a => a.hasContraindication) && (
                <div className="bg-white rounded-lg p-4 border-2 border-red-300">
                  <h4 className="font-semibold text-red-900 mb-3">Allergy Contraindications</h4>
                  <div className="space-y-2">
                    {safetyCheck.allergies
                      .filter(a => a.hasContraindication)
                      .flatMap(a => a.alerts)
                      .map((alert, index) => (
                        <div key={index} className="bg-red-50 rounded p-3 border border-red-200">
                          <p className="font-medium text-red-900">{alert.message}</p>
                          {alert.recommendation && (
                            <p className="text-sm text-red-700 mt-1">→ {alert.recommendation}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Duplicate Therapy */}
              {safetyCheck.duplicates.length > 0 && (
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Duplicate Therapy Detected</h4>
                  <div className="space-y-2">
                    {safetyCheck.duplicates.map((dup, index) => (
                      <div key={index} className="bg-yellow-50 rounded p-3 border border-yellow-200">
                        <p className="font-medium text-gray-900">{dup.message}</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Medications: {dup.medications.join(', ')}
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">→ {dup.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {safetyCheck.recommendations && safetyCheck.recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Pharmacist Recommendations</h4>
                  <ul className="space-y-2">
                    {safetyCheck.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-blue-800 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prescriptions List */}
      {selectedClientId && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          {/* Search and Filter Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Pill className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Prescriptions ({filteredPrescriptions.length})
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="partially_filled">Partially Filled</option>
                  <option value="filled">Filled</option>
                  <option value="unavailable">Unavailable</option>
                </select>

                <button
                  onClick={handleGenerateInvoice}
                  disabled={selectedPrescriptions.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Invoice ({selectedPrescriptions.length})
                </button>
              </div>
            </div>
          </div>

          {/* Prescriptions Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredPrescriptions.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No prescriptions found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Doctor hasn\'t prescribed any medications yet'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedPrescriptions.length === filteredPrescriptions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPrescriptions([...filteredPrescriptions]);
                          } else {
                            setSelectedPrescriptions([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Dosage & Frequency
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prescribed By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPrescriptions.map((prescription) => (
                    <PrescriptionRow
                      key={prescription.id}
                      prescription={prescription}
                      isSelected={selectedPrescriptions.some(p => p.id === prescription.id)}
                      onToggleSelect={() => togglePrescriptionSelection(prescription)}
                      onUpdate={(data) => handleUpdatePrescription(prescription.id, data)}
                      isEditing={editingPrescription === prescription.id}
                      onStartEdit={() => setEditingPrescription(prescription.id)}
                      onCancelEdit={() => setEditingPrescription(null)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Invoice Generator Modal */}
      {showInvoiceGenerator && (
        <PharmacyInvoiceGenerator
          client={selectedClient}
          prescriptions={selectedPrescriptions}
          institutionId={institutionId}
          pharmacistId={user?.uid}
          pharmacistName={userProfile?.name || userProfile?.displayName}
          onClose={() => {
            setShowInvoiceGenerator(false);
            setSelectedPrescriptions([]);
            loadPrescriptions();
            loadPharmacyStats();
          }}
        />
      )}
    </div>
  );
};

// Prescription Row Component
const PrescriptionRow = ({ 
  prescription, 
  isSelected, 
  onToggleSelect, 
  onUpdate, 
  isEditing,
  onStartEdit,
  onCancelEdit
}) => {
  const [formData, setFormData] = useState({
    available: prescription.pharmacyData?.available ?? null,
    price: prescription.pharmacyData?.price || '',
    stockQuantity: prescription.pharmacyData?.stockQuantity || '',
    notes: prescription.pharmacyData?.notes || '',
    status: prescription.pharmacyStatus || 'pending'
  });

  const handleSave = () => {
    if (formData.available === null) {
      toast.warning('Please mark availability first');
      return;
    }

    if (formData.available && !formData.price) {
      toast.warning('Please enter price for available medication');
      return;
    }

    onUpdate(formData);
  };

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-gray-300"
          />
        </td>
        <td className="px-6 py-4">
          <div className="font-medium text-gray-900">{prescription.name}</div>
          <div className="text-sm text-gray-500">{prescription.instructions}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{prescription.dosage}</div>
          <div className="text-sm text-gray-500">{prescription.frequency}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{prescription.prescribedBy || 'Doctor'}</div>
        </td>
        <td className="px-6 py-4">
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="pending">Pending</option>
            <option value="partially_filled">Partially Filled</option>
            <option value="filled">Filled</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFormData({ ...formData, available: true })}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                formData.available === true 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFormData({ ...formData, available: false })}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                formData.available === false 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {formData.available && (
            <input
              type="number"
              placeholder="Stock qty"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
              className="mt-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          )}
        </td>
        <td className="px-6 py-4">
          {formData.available ? (
            <div className="flex items-center">
              <span className="text-sm font-medium mr-1">₦</span>
              <input
                type="number"
                placeholder="Price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          ) : (
            <span className="text-gray-400 text-sm">N/A</span>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-gray-300"
        />
      </td>
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{prescription.name}</div>
        <div className="text-sm text-gray-500">{prescription.instructions}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">{prescription.dosage}</div>
        <div className="text-sm text-gray-500">{prescription.frequency}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">{prescription.prescribedBy || 'Doctor'}</div>
        <div className="text-xs text-gray-500">
          {prescription.createdAt?.toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4">
        {prescription.pharmacyStatus === 'pending' ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            Pending
          </span>
        ) : prescription.pharmacyStatus === 'filled' ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Filled
          </span>
        ) : prescription.pharmacyStatus === 'unavailable' ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            Unavailable
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Partially Filled
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {prescription.pharmacyData?.available === true ? (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">
              Available ({prescription.pharmacyData?.stockQuantity || 0})
            </span>
          </div>
        ) : prescription.pharmacyData?.available === false ? (
          <div className="flex items-center text-red-600">
            <XCircle className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">Unavailable</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">Not Set</span>
        )}
      </td>
      <td className="px-6 py-4">
        {prescription.pharmacyData?.price ? (
          <span className="text-sm font-semibold text-gray-900">
            ₦{parseFloat(prescription.pharmacyData.price).toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">Not Set</span>
        )}
      </td>
      <td className="px-6 py-4">
        <button
          onClick={onStartEdit}
          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center text-sm"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </button>
      </td>
    </tr>
  );
};

export default PharmacyTab;


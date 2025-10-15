import React, { useState } from 'react';
import { Pill, User, Clock, CheckCircle, XCircle, Eye, DollarSign, Package, AlertCircle, FileText, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import prescriptionsAPI from '../api/prescriptionsAPI';

const PrescriptionsTabContent = ({
  isDoctor,
  isPharmacist,
  selectedClient,
  prescriptions,
  onOpenPrescriptionModal,
  onUpdatePrescriptionItem,
  onEditPrescription,
  onDeletePrescription,
  userProfile
}) => {
  const [expandedPrescription, setExpandedPrescription] = useState(null);
  const [itemUpdates, setItemUpdates] = useState({});
  const [deletingPrescription, setDeletingPrescription] = useState(null);

  // Debug logging
  console.log('🔍 PrescriptionsTabContent Debug:', {
    selectedClient: selectedClient?.name || selectedClient?.fullName,
    prescriptionsCount: prescriptions?.length || 0,
    prescriptions: prescriptions
  });

  // Handle prescription deletion
  const handleDeletePrescription = async (prescriptionId) => {
    if (!confirm('Are you sure you want to delete this prescription? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingPrescription(prescriptionId);
      await prescriptionsAPI.deletePrescription(prescriptionId);
      toast.success('Prescription deleted successfully');
      
      // Call the parent handler to refresh the list
      if (onDeletePrescription) {
        onDeletePrescription(prescriptionId);
      }
    } catch (error) {
      console.error('Error deleting prescription:', error);
      toast.error('Failed to delete prescription');
    } finally {
      setDeletingPrescription(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' },
      dispensed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dispensed' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      // Legacy status support
      pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' },
      verified: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-full text-xs font-semibold`}>
        {config.label}
      </span>
    );
  };

  const handleItemFieldChange = (itemId, field, value) => {
    setItemUpdates(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveItemUpdates = async (itemId) => {
    const updates = itemUpdates[itemId];
    if (!updates) {
      toast.warning('No changes to save');
      return;
    }

    // Calculate total price if unit price and quantity are provided
    if (updates.unitPrice && updates.quantity) {
      updates.totalPrice = parseFloat(updates.unitPrice) * parseFloat(updates.quantity);
    }

    await onUpdatePrescriptionItem(itemId, updates);
    
    // Clear updates for this item
    setItemUpdates(prev => {
      const newUpdates = { ...prev };
      delete newUpdates[itemId];
      return newUpdates;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Pill className="h-8 w-8 text-indigo-600 mr-3" />
            Prescription Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isDoctor && 'Write and manage prescriptions'}
            {isPharmacist && 'Review prescriptions, check availability, and set pricing'}
            {!isDoctor && !isPharmacist && 'View prescribed medications'}
          </p>
        </div>
        {isDoctor && selectedClient && (
          <button
            onClick={onOpenPrescriptionModal}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center font-medium"
          >
            <Pill className="h-5 w-5 mr-2" />
            Write Prescription
          </button>
        )}
      </div>

      {/* Client Info Banner */}
      {selectedClient ? (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
          <div className="flex items-center">
            <User className="h-6 w-6 text-indigo-600 mr-3" />
            <div>
              <h3 className="font-bold text-gray-900">
                {selectedClient.name || selectedClient.fullName}
              </h3>
              <p className="text-sm text-gray-600">
                {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} on file
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Pill className="h-20 w-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Client Selected</h3>
          <p className="text-gray-600">
            Please select a client from the dropdown above to view their prescriptions.
          </p>
        </div>
      )}

      {/* Prescriptions List */}
      {selectedClient && (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prescriptions Yet</h3>
              <p className="text-gray-600 mb-4">
                {isDoctor 
                  ? 'Start by writing the first prescription for this client.'
                  : 'No prescriptions have been written for this client yet.'}
              </p>
              {isDoctor && (
                <button
                  onClick={onOpenPrescriptionModal}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
                >
                  <Pill className="h-4 w-4 mr-2" />
                  Write First Prescription
                </button>
              )}
            </div>
          ) : (
            prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Prescription Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          {prescription.prescriptionNumber}
                        </h3>
                        {getStatusBadge(prescription.status)}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Dr. {prescription.doctorName}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(prescription.prescriptionDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center font-medium text-indigo-600">
                          {prescription.totalItems} item{prescription.totalItems !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isDoctor && prescription.doctorId === userProfile?.userId && (
                        <>
                          <button
                            onClick={() => onEditPrescription && onEditPrescription(prescription)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm font-medium"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePrescription(prescription.id)}
                            disabled={deletingPrescription === prescription.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-medium"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deletingPrescription === prescription.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedPrescription(
                          expandedPrescription === prescription.id ? null : prescription.id
                        )}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm font-medium"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {expandedPrescription === prescription.id ? 'Collapse' : 'View Details'}
                      </button>
                    </div>
                  </div>
                  {prescription.diagnosis && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Diagnosis:</span>
                      <p className="text-sm text-gray-900 mt-1">{prescription.diagnosis}</p>
                    </div>
                  )}
                </div>

                {/* Prescription Details */}
                {expandedPrescription === prescription.id && (
                  <div className="p-6 space-y-4">
                    {/* Debug info */}
                    {console.log('🔍 Expanded prescription debug:', {
                      prescriptionId: prescription.id,
                      diagnosis: prescription.diagnosis,
                      medicationsCount: prescription.medications?.length || 0,
                      medications: prescription.medications,
                      notes: prescription.notes
                    })}
                    
                    {/* Medications */}
                    <div>
                      <h4 className="text-md font-bold text-gray-900 mb-4 flex items-center">
                        <Package className="h-5 w-5 text-indigo-600 mr-2" />
                        Prescribed Medications ({prescription.medications?.length || 0})
                      </h4>
                      <div className="space-y-4">
                        {prescription.medications && prescription.medications.length > 0 ? (
                          prescription.medications.map((medication) => {
                            const currentUpdates = itemUpdates[medication.id] || {};
                            const isAvailable = currentUpdates.isAvailable ?? medication.isAvailable;
                            const unitPrice = currentUpdates.unitPrice ?? medication.unitPrice;
                            const totalPrice = currentUpdates.totalPrice ?? medication.totalPrice;
                            
                            return (
                              <div
                                key={medication.id}
                                className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-5"
                              >
                                {/* Item Number and Name */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-start flex-1">
                                    <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">
                                      {medication.itemNumber}
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="font-bold text-lg text-gray-900">
                                        {medication.medicationName}
                                      </h5>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 text-sm">
                                        <div>
                                          <span className="text-gray-600">Dosage:</span>
                                          <span className="ml-1 font-semibold text-gray-900">{medication.dosage}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Frequency:</span>
                                          <span className="ml-1 font-semibold text-gray-900">{medication.frequency}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Route:</span>
                                          <span className="ml-1 font-semibold text-gray-900 capitalize">{medication.route}</span>
                                        </div>
                                        {medication.duration && (
                                          <div>
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="ml-1 font-semibold text-gray-900">{medication.duration}</span>
                                          </div>
                                        )}
                                        {medication.quantity && (
                                          <div>
                                            <span className="text-gray-600">Quantity:</span>
                                            <span className="ml-1 font-semibold text-gray-900">{medication.quantity}</span>
                                          </div>
                                        )}
                                      </div>
                                      {medication.instructions && (
                                        <div className="mt-2 p-2 bg-white rounded border border-indigo-200">
                                          <span className="text-xs font-semibold text-gray-500 uppercase">Instructions:</span>
                                          <p className="text-sm text-gray-900 mt-1">{medication.instructions}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Pharmacist Controls */}
                                {isPharmacist && (
                                  <div className="mt-4 pt-4 border-t border-indigo-300">
                                    <h6 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                      <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                                      Pharmacist Controls
                                    </h6>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* Availability */}
                                      <div className="flex items-center bg-white p-3 rounded-lg border border-gray-200">
                                        <input
                                          type="checkbox"
                                          id={`available-${medication.id}`}
                                          checked={isAvailable === true}
                                          onChange={(e) => handleItemFieldChange(medication.id, 'isAvailable', e.target.checked)}
                                          className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor={`available-${medication.id}`} className="ml-3 text-sm font-medium text-gray-900">
                                          Available in Stock
                                        </label>
                                      </div>

                                      {/* Unit Price */}
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                          Unit Price (₦)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={unitPrice || ''}
                                          onChange={(e) => handleItemFieldChange(medication.id, 'unitPrice', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                      </div>

                                      {/* Total Price (Auto-calculated or manual) */}
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                          Total Price (₦)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={totalPrice || ''}
                                          onChange={(e) => handleItemFieldChange(medication.id, 'totalPrice', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                      </div>

                                      {/* Alternative Suggestion */}
                                      <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                          Alternative Suggestion
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Suggest alternative medication if unavailable"
                                          value={currentUpdates.alternativeSuggestion || medication.alternativeSuggestion || ''}
                                          onChange={(e) => handleItemFieldChange(medication.id, 'alternativeSuggestion', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                      </div>

                                      {/* Pharmacist Notes */}
                                      <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                          Pharmacist Notes
                                        </label>
                                        <textarea
                                          placeholder="Add notes about availability, generic options, etc."
                                          value={currentUpdates.pharmacistNotes || medication.pharmacistNotes || ''}
                                          onChange={(e) => handleItemFieldChange(medication.id, 'pharmacistNotes', e.target.value)}
                                          rows="2"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                      </div>
                                    </div>

                                    {/* Save Button */}
                                    {itemUpdates[medication.id] && (
                                      <button
                                        onClick={() => handleSaveItemUpdates(medication.id)}
                                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Save Changes
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* View-only Status for non-pharmacists */}
                                {!isPharmacist && medication.isAvailable !== null && (
                                  <div className="mt-4 pt-4 border-t border-indigo-300">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        {medication.isAvailable ? (
                                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Available - ₦{medication.totalPrice || medication.unitPrice || '0.00'}
                                          </span>
                                        ) : (
                                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center">
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Currently Unavailable
                                          </span>
                                        )}
                                      </div>
                                      {medication.alternativeSuggestion && (
                                        <div className="text-sm text-gray-600">
                                          <span className="font-semibold">Alternative:</span> {medication.alternativeSuggestion}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>No medications found for this prescription</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    {prescription.notes && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="text-sm font-bold text-yellow-900 mb-1">Additional Notes:</h5>
                        <p className="text-sm text-gray-900">{prescription.notes}</p>
                      </div>
                    )}

                    {/* Total Cost */}
                    {isPharmacist && prescription.totalCost > 0 && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">Total Prescription Cost:</span>
                          <span className="text-2xl font-bold text-green-600">₦{prescription.totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PrescriptionsTabContent;


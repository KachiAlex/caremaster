import React, { useState, useEffect } from 'react';
import { DollarSign, X, Save, AlertCircle } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import UserNameWithAvatar from './UserNameWithAvatar';

/**
 * CaregiverWageEditModal Component
 * 
 * Modal for editing caregiver wage rates (hourly or monthly)
 * Can be used from both User Management and Caregivers tabs
 */
const CaregiverWageEditModal = ({ isOpen, onClose, caregiver, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    paymentType: 'hourly',
    hourlyRate: '',
    monthlyRate: ''
  });

  useEffect(() => {
    if (isOpen && caregiver) {
      // Load current wage data
      const hourlyRate = caregiver.hourlyRate || caregiver.caregiverData?.hourlyRate || 15;
      const monthlyRate = caregiver.monthlyRate || caregiver.caregiverData?.monthlyRate || 0;
      const paymentType = caregiver.paymentType || (monthlyRate > 0 ? 'monthly' : 'hourly');

      setFormData({
        paymentType: paymentType,
        hourlyRate: hourlyRate.toString(),
        monthlyRate: monthlyRate.toString()
      });
    }
  }, [isOpen, caregiver]);

  const handleSave = async () => {
    if (!caregiver) return;

    // Validation
    if (formData.paymentType === 'hourly') {
      const hourlyRate = parseFloat(formData.hourlyRate);
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        toast.error('Please enter a valid hourly rate');
        return;
      }
    } else {
      const monthlyRate = parseFloat(formData.monthlyRate);
      if (isNaN(monthlyRate) || monthlyRate <= 0) {
        toast.error('Please enter a valid monthly rate');
        return;
      }
    }

    try {
      setLoading(true);

      const updateData = {
        paymentType: formData.paymentType,
        updatedAt: new Date().toISOString()
      };

      if (formData.paymentType === 'hourly') {
        updateData.hourlyRate = parseFloat(formData.hourlyRate);
        updateData.monthlyRate = 0; // Clear monthly rate when using hourly
      } else {
        updateData.monthlyRate = parseFloat(formData.monthlyRate);
        updateData.hourlyRate = 0; // Clear hourly rate when using monthly
      }

      // Update in Firestore
      const userRef = doc(db, 'users', caregiver.id);
      await updateDoc(userRef, updateData);

      toast.success('Wage rate updated successfully!');
      
      // Call onSave callback if provided
      if (onSave) {
        onSave({ ...caregiver, ...updateData });
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating wage rate:', error);
      toast.error('Failed to update wage rate');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !caregiver) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-white" />
            <div>
              <h3 className="text-xl font-bold text-white">Manage Wages</h3>
              <p className="text-purple-100 text-sm">Update caregiver wage rates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-500 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Caregiver Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <UserNameWithAvatar
                userId={caregiver.id}
                userName={caregiver.name || caregiver.fullName || 'Unknown'}
                userType={caregiver.userType || caregiver.type || 'caregiver'}
                profilePictureUrl={caregiver.profilePictureUrl}
                size="medium"
                showName={true}
                nameClassName="font-semibold text-gray-900"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{caregiver.email}</p>
          </div>

          {/* Payment Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Structure
            </label>
            <select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="hourly">Hourly Rate (Activity-Based)</option>
              <option value="monthly">Monthly Flat Rate</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.paymentType === 'hourly' 
                ? 'Wages calculated based on logged activity durations'
                : 'Fixed monthly salary regardless of hours worked'}
            </p>
          </div>

          {/* Hourly Rate */}
          {formData.paymentType === 'hourly' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg"
                  placeholder="15.00"
                />
              </div>
            </div>
          )}

          {/* Monthly Rate */}
          {formData.paymentType === 'monthly' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Rate ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthlyRate}
                  onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg"
                  placeholder="3000.00"
                />
              </div>
            </div>
          )}

          {/* Info Alert */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              Changes will be applied immediately and will affect future wage calculations.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaregiverWageEditModal;


import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Filter,
  Edit,
  Save,
  X
} from 'lucide-react';
import { db } from '../backend/config';
import { collection, getDocs, query, where, updateDoc, doc } from 'backend/database';
import { toast } from 'react-toastify';
import WageCalculator from '../utils/wageCalculator';
import UserNameWithAvatar from './UserNameWithAvatar';

/**
 * CaregiverWageManagement Component
 * 
 * Manages caregiver wage rates and calculates earnings
 * Supports both hourly and monthly payment structures
 */

const CaregiverWageManagement = ({ institutionId }) => {
  const [caregivers, setCaregivers] = useState([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [wageCalculation, setWageCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [rateForm, setRateForm] = useState({
    hourlyRate: '',
    monthlyRate: '',
    paymentType: 'hourly'
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCaregivers();
  }, [institutionId]);

  useEffect(() => {
    // Recalculate when date range changes
    if (selectedCaregiver) {
      calculateWages(selectedCaregiver);
    }
  }, [dateRange]);

  const loadCaregivers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading caregivers for institution:', institutionId);
      
      const usersQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', institutionId)
      );

      const snapshot = await getDocs(usersQuery);
      const caregiversData = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const userRoles = Array.isArray(data.roles) ? data.roles : [data.userType || data.type];
        
        if (userRoles.includes('caregiver') || userRoles.includes('doctor') || userRoles.includes('nurse')) {
          caregiversData.push({
            id: docSnap.id,
            name: data.name || data.fullName || data.email,
            email: data.email,
            role: userRoles[0],
            hourlyRate: data.hourlyRate || 15,
            monthlyRate: data.monthlyRate || 0,
            paymentType: data.paymentType || 'hourly',
            ...data
          });
        }
      });

      console.log('✅ Loaded caregivers:', caregiversData.length);
      setCaregivers(caregiversData);
    } catch (error) {
      console.error('Error loading caregivers:', error);
      toast.error('Failed to load caregivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCaregiver = (caregiver) => {
    console.log('👤 Caregiver selected:', caregiver.name);
    setSelectedCaregiver(caregiver);
    setRateForm({
      hourlyRate: caregiver.hourlyRate || 15,
      monthlyRate: caregiver.monthlyRate || 0,
      paymentType: caregiver.paymentType || 'hourly'
    });
    setEditingRate(false);
    calculateWages(caregiver);
  };

  const calculateWages = async (caregiver) => {
    try {
      setCalculating(true);
      console.log('💰 Calculating wages for:', caregiver.name);

      const hourlyRate = parseFloat(caregiver.hourlyRate) || 15;
      const monthlyRate = parseFloat(caregiver.monthlyRate) || 0;
      const paymentType = caregiver.paymentType || 'hourly';

      let calculation;

      if (paymentType === 'hourly') {
        // Calculate based on activity time tracking
        calculation = await WageCalculator.calculateActivityBasedWages(
          caregiver.id,
          new Date(dateRange.startDate),
          new Date(dateRange.endDate),
          hourlyRate
        );
      } else {
        // Calculate monthly flat rate
        const endDate = new Date(dateRange.endDate);
        calculation = await WageCalculator.calculateMonthlyWages(
          caregiver.id,
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          monthlyRate
        );
      }

      console.log('✅ Wage calculation complete:', calculation);
      setWageCalculation(calculation);
      toast.success('Wage calculation completed!');
    } catch (error) {
      console.error('Error calculating wages:', error);
      toast.error('Failed to calculate wages');
      setWageCalculation(null);
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveRate = async () => {
    if (!selectedCaregiver) return;

    try {
      setLoading(true);
      
      const updateData = {
        paymentType: rateForm.paymentType,
        updatedAt: new Date().toISOString()
      };

      if (rateForm.paymentType === 'hourly') {
        updateData.hourlyRate = parseFloat(rateForm.hourlyRate) || 15;
      } else {
        updateData.monthlyRate = parseFloat(rateForm.monthlyRate) || 0;
      }

      await updateDoc(doc(db, 'users', selectedCaregiver.id), updateData);
      
      toast.success('Wage rate updated successfully!');
      setEditingRate(false);
      
      // Reload caregivers and recalculate
      await loadCaregivers();
      
      // Update selected caregiver with new rate
      const updatedCaregiver = { ...selectedCaregiver, ...updateData };
      setSelectedCaregiver(updatedCaregiver);
      await calculateWages(updatedCaregiver);
      
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Failed to update wage rate');
    } finally {
      setLoading(false);
    }
  };

  const exportWageReport = () => {
    if (!wageCalculation || !selectedCaregiver) return;

    const headers = ['Date', 'Activity', 'Client', 'Duration (hours)', 'Rate', 'Amount'];
    const rows = wageCalculation.activityBreakdown?.map(activity => [
      new Date(activity.timestamp).toLocaleDateString(),
      activity.activity,
      activity.client || '-',
      activity.duration.toFixed(2),
      `$${wageCalculation.rate}`,
      `$${(activity.duration * wageCalculation.rate).toFixed(2)}`
    ]) || [];

    // Add summary row
    rows.push([
      '',
      '',
      'TOTAL',
      wageCalculation.hours.total.toFixed(2),
      '',
      `$${wageCalculation.pay.total.toFixed(2)}`
    ]);

    const csvContent = [
      `Wage Report - ${selectedCaregiver.name}`,
      `Period: ${new Date(wageCalculation.period.startDate).toLocaleDateString()} - ${new Date(wageCalculation.period.endDate).toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wage_report_${selectedCaregiver?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Wage report exported!');
  };

  if (loading && caregivers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-600">Loading caregivers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wage Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage caregiver rates and calculate earnings based on logged activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={`${dateRange.startDate},${dateRange.endDate}`}
            onChange={(e) => {
              const [start, end] = e.target.value.split(',');
              setDateRange({ startDate: start, endDate: end });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={`${new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]}`}>
              Last 7 Days
            </option>
            <option value={`${new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]}`}>
              Last 30 Days
            </option>
            <option value={`${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]}`}>
              This Month
            </option>
            <option value={`${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]},${new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]}`}>
              Last Month
            </option>
          </select>
        </div>
      </div>

      {caregivers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No caregivers found</p>
          <p className="text-gray-400 text-sm mt-2">Add caregivers to start managing wages</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Caregivers List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span>Staff Members ({caregivers.length})</span>
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {caregivers.map((caregiver) => (
                <button
                  key={caregiver.id}
                  onClick={() => handleSelectCaregiver(caregiver)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedCaregiver?.id === caregiver.id
                      ? 'bg-purple-50 border-purple-400 shadow-md'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserNameWithAvatar
                        userId={caregiver.id}
                        userName={caregiver.name}
                        userType={caregiver.role}
                        profilePictureUrl={caregiver.profilePictureUrl}
                        size="medium"
                        showName={true}
                        nameClassName="font-medium text-gray-900"
                      />
                      <div className="ml-2">
                        <p className="text-xs text-gray-500 capitalize">{caregiver.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-600">
                        {caregiver.paymentType === 'monthly' 
                          ? `$${caregiver.monthlyRate || 0}/mo`
                          : `$${caregiver.hourlyRate || 15}/hr`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {caregiver.paymentType || 'hourly'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wage Details & Rate Management */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedCaregiver ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                <DollarSign className="h-20 w-20 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a Staff Member
                </h3>
                <p className="text-gray-500">
                  Choose a caregiver, doctor, or nurse from the list to view their wage details and calculate earnings
                </p>
              </div>
            ) : (
              <>
                {/* Rate Management Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <UserNameWithAvatar
                        userId={selectedCaregiver.id}
                        userName={selectedCaregiver.name}
                        userType={selectedCaregiver.role}
                        profilePictureUrl={selectedCaregiver.profilePictureUrl}
                        size="large"
                        showName={true}
                        nameClassName="text-xl font-bold text-gray-900"
                        className="mr-4"
                      />
                      <div>
                        <p className="text-sm text-gray-500 capitalize">{selectedCaregiver.role} • {selectedCaregiver.email}</p>
                      </div>
                    </div>
                    {!editingRate ? (
                      <button
                        onClick={() => setEditingRate(true)}
                        className="flex items-center px-3 py-2 text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Rate
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveRate}
                          disabled={loading}
                          className="flex items-center px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingRate(false);
                            setRateForm({
                              hourlyRate: selectedCaregiver.hourlyRate || 15,
                              monthlyRate: selectedCaregiver.monthlyRate || 0,
                              paymentType: selectedCaregiver.paymentType || 'hourly'
                            });
                          }}
                          className="flex items-center px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rate Form */}
                  <div className="space-y-4">
                    {/* Payment Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Structure
                      </label>
                      <select
                        value={rateForm.paymentType}
                        onChange={(e) => setRateForm({ ...rateForm, paymentType: e.target.value })}
                        disabled={!editingRate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="hourly">Hourly Rate (Activity-Based)</option>
                        <option value="monthly">Monthly Flat Rate</option>
                      </select>
                    </div>

                    {/* Hourly Rate */}
                    {rateForm.paymentType === 'hourly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hourly Rate ($)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rateForm.hourlyRate}
                            onChange={(e) => setRateForm({ ...rateForm, hourlyRate: e.target.value })}
                            disabled={!editingRate}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-700 font-semibold text-lg"
                            placeholder="15.00"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Wages calculated based on logged activity durations
                        </p>
                      </div>
                    )}

                    {/* Monthly Rate */}
                    {rateForm.paymentType === 'monthly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Rate ($)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rateForm.monthlyRate}
                            onChange={(e) => setRateForm({ ...rateForm, monthlyRate: e.target.value })}
                            disabled={!editingRate}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-700 font-semibold text-lg"
                            placeholder="3000.00"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Fixed monthly salary regardless of hours worked
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wage Calculation Results */}
                {calculating ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-gray-600">Calculating wages...</p>
                  </div>
                ) : wageCalculation ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Wage Calculation</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(wageCalculation.period.startDate).toLocaleDateString()} - {new Date(wageCalculation.period.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={exportWageReport}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-700 font-medium">Total Earnings</p>
                        <p className="text-3xl font-bold text-green-900 mt-1">
                          ${wageCalculation.pay.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-700 font-medium">Hours Worked</p>
                        <p className="text-3xl font-bold text-blue-900 mt-1">
                          {wageCalculation.hours.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-700 font-medium">Hourly Rate</p>
                        <p className="text-3xl font-bold text-purple-900 mt-1">
                          ${wageCalculation.rate}
                        </p>
                      </div>
                    </div>

                    {/* Activity Breakdown */}
                    {wageCalculation.activityBreakdown && wageCalculation.activityBreakdown.length > 0 ? (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center justify-between">
                          <span>Activity Breakdown ({wageCalculation.activitiesCount} activities)</span>
                        </h4>
                        <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                          {wageCalculation.activityBreakdown.map((activity, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{activity.activity}</p>
                                <p className="text-xs text-gray-500">
                                  {activity.client} • {new Date(activity.timestamp).toLocaleString()}
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                  {activity.type} Activity
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-gray-900">
                                  ${(activity.duration * wageCalculation.rate).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {activity.duration.toFixed(2)}h × ${wageCalculation.rate}/hr
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No activities logged in this period</p>
                        <p className="text-gray-400 text-sm mt-2">
                          Activities will appear here once the caregiver logs them
                        </p>
                      </div>
                    )}

                    {/* Client Breakdown */}
                    {wageCalculation.clientBreakdown && Object.keys(wageCalculation.clientBreakdown).length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                          Hours by Client
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(wageCalculation.clientBreakdown).map(([clientId, hours]) => (
                            <div
                              key={clientId}
                              className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
                            >
                              <p className="font-medium text-gray-900">Client {clientId.substring(0, 8)}...</p>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{hours.toFixed(2)} hours</p>
                                <p className="text-xs text-gray-500">
                                  ${(hours * wageCalculation.rate).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverWageManagement;

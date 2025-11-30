/**
 * Billing Plan Configuration
 * 
 * Allows admins to configure:
 * - Billing tiers (Basic, Standard, Premium, or custom)
 * - Billing frequencies (weekly, monthly, annual)
 * - Prices and currencies
 * - Tax settings
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  DollarSign,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Crown,
  Star,
  Zap
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getBillingPlans,
  saveBillingPlan,
  deleteBillingPlan,
  getBillingSettings,
  saveBillingSettings,
  togglePlanStatus,
  updatePlanSortOrder,
  SUPPORTED_CURRENCIES,
  BILLING_FREQUENCIES,
  formatCurrency
} from '../api/billingPlansAPI';
import { useUser } from '../contexts/UserContext';

// Tier icons mapping
const TIER_ICONS = {
  basic: Star,
  standard: Zap,
  premium: Crown,
  enterprise: Sparkles
};

const BillingPlanConfiguration = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeTab, setActiveTab] = useState('plans');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Plans state
  const [plans, setPlans] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    currency: 'USD',
    enabledFrequencies: ['monthly', 'annual'],
    defaultFrequency: 'monthly',
    taxRate: 0,
    taxLabel: 'Tax',
    invoicePrefix: 'INV',
    invoiceNotes: '',
    paymentTermsDays: 30,
    lateFeePercentage: 0,
    autoGenerateInvoices: true,
    sendInvoiceReminders: true,
    reminderDays: [7, 3, 1]
  });

  useEffect(() => {
    if (institutionId) {
      loadData();
    }
  }, [institutionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, settingsData] = await Promise.all([
        getBillingPlans(institutionId),
        getBillingSettings(institutionId)
      ]);
      
      // Sort plans by sortOrder
      const sortedPlans = plansData.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setPlans(sortedPlans);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading billing configuration:', error);
      toast.error('Failed to load billing configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await saveBillingSettings(institutionId, settings);
      toast.success('Billing settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlan = async (planData) => {
    try {
      setSaving(true);
      await saveBillingPlan({
        ...planData,
        institutionId
      });
      toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
      setShowPlanModal(false);
      setEditingPlan(null);
      await loadData();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this billing plan? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteBillingPlan(planId);
      toast.success('Plan deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const handleTogglePlanStatus = async (planId, currentStatus) => {
    try {
      await togglePlanStatus(planId, !currentStatus);
      toast.success(`Plan ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadData();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast.error('Failed to update plan status');
    }
  };

  const handleMovePlan = async (planId, direction) => {
    const currentIndex = plans.findIndex(p => p.id === planId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= plans.length) return;
    
    try {
      await updatePlanSortOrder(planId, newIndex);
      await updatePlanSortOrder(plans[newIndex].id, currentIndex);
      await loadData();
    } catch (error) {
      console.error('Error reordering plans:', error);
      toast.error('Failed to reorder plans');
    }
  };

  const handleFrequencyToggle = (frequencyId) => {
    const newFrequencies = settings.enabledFrequencies.includes(frequencyId)
      ? settings.enabledFrequencies.filter(f => f !== frequencyId)
      : [...settings.enabledFrequencies, frequencyId];
    
    // Ensure at least one frequency is enabled
    if (newFrequencies.length === 0) {
      toast.warning('At least one billing frequency must be enabled');
      return;
    }
    
    // Update default frequency if current default is being disabled
    let newDefaultFrequency = settings.defaultFrequency;
    if (!newFrequencies.includes(newDefaultFrequency)) {
      newDefaultFrequency = newFrequencies[0];
    }
    
    setSettings({
      ...settings,
      enabledFrequencies: newFrequencies,
      defaultFrequency: newDefaultFrequency
    });
  };

  const getCurrencySymbol = (code) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
    return currency?.symbol || '$';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">Configure billing plans, pricing, and invoice settings</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'plans', name: 'Billing Plans', icon: DollarSign },
            { id: 'settings', name: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {/* Add Plan Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingPlan(null);
                setShowPlanModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add New Plan
            </button>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const TierIcon = TIER_ICONS[plan.tier] || Star;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${
                    plan.isActive ? 'border-gray-200 hover:border-blue-300' : 'border-gray-100 opacity-60'
                  }`}
                >
                  {/* Plan Header */}
                  <div className={`p-4 ${
                    plan.tier === 'premium' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    plan.tier === 'standard' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                    'bg-gradient-to-r from-gray-500 to-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TierIcon className="h-5 w-5 text-white" />
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMovePlan(plan.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-white/70 hover:text-white disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMovePlan(plan.id, 'down')}
                          disabled={index === plans.length - 1}
                          className="p-1 text-white/70 hover:text-white disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mt-1">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="p-4 bg-gray-50">
                    <div className="space-y-2">
                      {settings.enabledFrequencies.includes('weekly') && plan.weeklyPrice && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Weekly</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(plan.weeklyPrice, settings.currency)}
                          </span>
                        </div>
                      )}
                      {settings.enabledFrequencies.includes('monthly') && plan.monthlyPrice && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Monthly</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(plan.monthlyPrice, settings.currency)}
                          </span>
                        </div>
                      )}
                      {settings.enabledFrequencies.includes('annual') && (plan.annualPrice || plan.yearlyPrice) && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Annual</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(plan.annualPrice || plan.yearlyPrice, settings.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-4 border-t border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Features</h4>
                    <ul className="space-y-1.5">
                      {(plan.features || []).slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {(plan.features || []).length > 4 && (
                        <li className="text-xs text-gray-400">
                          +{plan.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePlanStatus(plan.id, plan.isActive)}
                      className={`flex items-center gap-1.5 text-sm ${
                        plan.isActive ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {plan.isActive ? (
                        <>
                          <ToggleRight className="h-5 w-5" />
                          Active
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5" />
                          Inactive
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setShowPlanModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {plans.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Billing Plans</h3>
              <p className="text-gray-500 mb-4">Create your first billing plan to start charging clients</p>
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setShowPlanModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create First Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-8">
            {/* Currency Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Currency Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} - {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Billing Frequencies */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Billing Frequencies
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Select which billing frequencies you want to offer to clients
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BILLING_FREQUENCIES.map((frequency) => {
                  const isEnabled = settings.enabledFrequencies.includes(frequency.id);
                  const isDefault = settings.defaultFrequency === frequency.id;
                  return (
                    <div
                      key={frequency.id}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        isEnabled
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => handleFrequencyToggle(frequency.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isEnabled ? 'text-blue-700' : 'text-gray-600'}`}>
                          {frequency.label}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isEnabled ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isEnabled && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                      {isEnabled && (
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettings({ ...settings, defaultFrequency: frequency.id });
                            }}
                            className={`text-xs px-2 py-1 rounded ${
                              isDefault
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {isDefault ? 'Default' : 'Set as Default'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tax Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Tax & Invoice Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Label
                  </label>
                  <input
                    type="text"
                    value={settings.taxLabel}
                    onChange={(e) => setSettings({ ...settings, taxLabel: e.target.value })}
                    placeholder="e.g., VAT, GST, Tax"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    placeholder="e.g., INV, BILL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.paymentTermsDays}
                    onChange={(e) => setSettings({ ...settings, paymentTermsDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late Fee (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.lateFeePercentage}
                    onChange={(e) => setSettings({ ...settings, lateFeePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Invoice Notes
                </label>
                <textarea
                  value={settings.invoiceNotes}
                  onChange={(e) => setSettings({ ...settings, invoiceNotes: e.target.value })}
                  placeholder="Notes to include on all invoices..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Toggle Options */}
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoGenerateInvoices}
                    onChange={(e) => setSettings({ ...settings, autoGenerateInvoices: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-generate invoices on billing date</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sendInvoiceReminders}
                    onChange={(e) => setSettings({ ...settings, sendInvoiceReminders: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Send payment reminders before due date</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          settings={settings}
          onClose={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
          }}
          onSave={handleSavePlan}
          saving={saving}
        />
      )}
    </div>
  );
};

// Plan Modal Component
const PlanModal = ({ plan, settings, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    tier: plan?.tier || 'basic',
    description: plan?.description || '',
    weeklyPrice: plan?.weeklyPrice || '',
    monthlyPrice: plan?.monthlyPrice || '',
    annualPrice: plan?.annualPrice || plan?.yearlyPrice || '',
    features: plan?.features || [''],
    isActive: plan?.isActive !== false,
    sortOrder: plan?.sortOrder || 0,
    ...(plan?.id && { id: plan.id })
  });

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures.length > 0 ? newFeatures : [''] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    
    // Check that at least one enabled frequency has a price
    const hasPrice = 
      (settings.enabledFrequencies.includes('weekly') && formData.weeklyPrice) ||
      (settings.enabledFrequencies.includes('monthly') && formData.monthlyPrice) ||
      (settings.enabledFrequencies.includes('annual') && formData.annualPrice);
    
    if (!hasPrice) {
      toast.error('Please set a price for at least one enabled billing frequency');
      return;
    }
    
    // Clean up features (remove empty ones)
    const cleanedFeatures = formData.features.filter(f => f.trim() !== '');
    
    onSave({
      ...formData,
      weeklyPrice: parseFloat(formData.weeklyPrice) || null,
      monthlyPrice: parseFloat(formData.monthlyPrice) || null,
      annualPrice: parseFloat(formData.annualPrice) || null,
      yearlyPrice: parseFloat(formData.annualPrice) || null, // Keep for backward compatibility
      features: cleanedFeatures,
      currency: settings.currency
    });
  };

  const getCurrencySymbol = () => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency);
    return currency?.symbol || '$';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {plan ? 'Edit Billing Plan' : 'Create New Billing Plan'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Configure pricing tiers for your clients</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic, Standard, Premium"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this plan"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Pricing ({settings.currency})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings.enabledFrequencies.includes('weekly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weekly Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {getCurrencySymbol()}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.weeklyPrice}
                      onChange={(e) => setFormData({ ...formData, weeklyPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
              {settings.enabledFrequencies.includes('monthly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {getCurrencySymbol()}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthlyPrice}
                      onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
              {settings.enabledFrequencies.includes('annual') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {getCurrencySymbol()}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.annualPrice}
                      onChange={(e) => setFormData({ ...formData, annualPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Features</h4>
              <button
                type="button"
                onClick={addFeature}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Feature
              </button>
            </div>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder="e.g., 24/7 support"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">
              Plan is active and visible to clients
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {plan ? 'Update Plan' : 'Create Plan'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPlanConfiguration;


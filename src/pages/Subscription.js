import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Check,
  Star,
  Heart,
  Shield,
  Calendar,
  Download,
  Settings,
  Crown,
  Activity,
  Loader2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import {
  getBillingPlans,
  getClientSubscription,
  assignSubscriptionToClient,
  cancelClientSubscription,
  getBillingSettings,
  getPlanPrice,
  formatCurrency
} from '../api/billingPlansAPI';

// Map a plan tier to an icon component
const getPlanIcon = (tier) => {
  switch (tier) {
    case 'basic':
      return Heart;
    case 'premium':
      return Crown;
    case 'elite':
      return Star;
    default:
      return Star;
  }
};

// Normalize an API plan object into the shape the UI expects
const normalizePlan = (plan) => {
  let features = plan.features;
  if (typeof features === 'string') {
    try {
      features = JSON.parse(features);
    } catch (e) {
      features = features.split(',').map((f) => f.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(features)) {
    features = [];
  }

  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    description: plan.description || '',
    currency: plan.currency || 'USD',
    price: {
      monthly: plan.monthlyPrice,
      yearly: plan.yearlyPrice || plan.annualPrice
    },
    features,
    popular: plan.tier === 'premium' || plan.isPopular === true,
    icon: getPlanIcon(plan.tier),
    isActive: plan.isActive !== false
  };
};

const Subscription = () => {
  const { user, userProfile, institutionId } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [billingSettings, setBillingSettings] = useState(null);

  const [billingCycle, setBillingCycle] = useState('monthly');

  const instId = userProfile?.institutionId || institutionId;
  const clientId = user?.uid || userProfile?.id;

  // Fetch subscription (used on mount and after plan changes)
  const fetchSubscription = useCallback(async () => {
    if (!clientId) return;
    try {
      const sub = await getClientSubscription(clientId);
      setSubscription(sub);
      if (sub?.billingCycle) {
        setBillingCycle(sub.billingCycle === 'annual' ? 'yearly' : sub.billingCycle);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      throw err;
    }
  }, [clientId]);

  // Initial data load
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!instId || !clientId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [plansData, subData, settingsData] = await Promise.all([
          getBillingPlans(instId),
          getClientSubscription(clientId),
          getBillingSettings(instId)
        ]);

        if (cancelled) return;

        const normalizedPlans = (plansData || [])
          .filter((p) => p.isActive !== false)
          .map(normalizePlan)
          .sort((a, b) => {
            const order = { basic: 1, standard: 2, premium: 3, elite: 4 };
            return (order[a.tier] || 99) - (order[b.tier] || 99);
          });

        setPlans(normalizedPlans);
        setSubscription(subData);
        setBillingSettings(settingsData);

        if (subData?.billingCycle) {
          setBillingCycle(subData.billingCycle === 'annual' ? 'yearly' : subData.billingCycle);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading subscription data:', err);
          setError(err.message || 'Failed to load subscription data. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [instId, clientId]);

  // Determine the current plan id from the active subscription
  const currentPlanId = subscription?.status === 'active' ? subscription?.planId : null;
  const currentPlanObj = plans.find((p) => p.id === currentPlanId);

  const handlePlanChange = async (planId) => {
    if (!clientId) return;
    setActionLoading(true);
    setError(null);
    try {
      const cycle = billingCycle === 'yearly' ? 'annual' : billingCycle;
      await assignSubscriptionToClient(clientId, planId, cycle);
      await fetchSubscription();
    } catch (err) {
      console.error('Error changing plan:', err);
      setError(err.message || 'Failed to change plan. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel your subscription? This will take effect immediately.'
    );
    if (!confirmCancel) return;

    setActionLoading(true);
    setError(null);
    try {
      await cancelClientSubscription(subscription.id);
      await fetchSubscription();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'Active':
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'Cancelled':
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    if (date.toDate) date = date.toDate();
    if (!(date instanceof Date) || isNaN(date)) return '—';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currencyCode = billingSettings?.currency || subscription?.currency || 'USD';

  // ---------- Loading state ----------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-gray-600">Loading subscription details...</p>
      </div>
    );
  }

  // ---------- Error state ----------
  if (error && plans.length === 0 && !subscription) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <p className="text-lg font-semibold text-gray-900">Something went wrong</p>
        <p className="text-gray-600 text-center max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Inline action error banner */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600">Manage your Care Master subscription and billing</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary" disabled>
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </button>
          <button className="btn btn-primary" disabled>
            <Settings className="h-4 w-4 mr-2" />
            Manage Billing
          </button>
        </div>
      </div>

      {/* Current Subscription */}
      <div className="card">
        <div className="flex items-center mb-6">
          <CreditCard className="h-6 w-6 text-gray-700 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Current Subscription</h2>
        </div>

        {subscription && subscription.status === 'active' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-4">
                  {(() => {
                    const Icon = getPlanIcon(subscription.planTier || subscription.plan?.tier);
                    return <Icon className="h-8 w-8 text-blue-600 mr-3" />;
                  })()}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {subscription.planName || subscription.plan?.name || 'Current'} Plan
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">
                      {formatCurrency(subscription.price, subscription.currency || currencyCode)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cycle:</span>
                    <span className="font-semibold capitalize">
                      {subscription.billingCycle === 'annual' ? 'Yearly' : subscription.billingCycle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next billing:</span>
                    <span className="font-semibold">{formatDate(subscription.nextBillingDate)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-green-50 rounded-lg">
                <div className="flex items-center mb-4">
                  <Activity className="h-8 w-8 text-green-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Usage This Month</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Home visits:</span>
                    <span className="font-semibold">— / Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telemedicine:</span>
                    <span className="font-semibold">— / Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Emergency calls:</span>
                    <span className="font-semibold">— / Unlimited</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-4">
                  <Shield className="h-8 w-8 text-purple-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Benefits</h3>
                </div>
                <div className="space-y-1">
                  {(subscription.plan?.features || currentPlanObj?.features || [])
                    .slice(0, 4)
                    .map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  {(!subscription.plan?.features && !currentPlanObj?.features) && (
                    <p className="text-sm text-gray-500">No benefit details available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-lg">
            <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active Subscription</h3>
            <p className="text-gray-600 mb-4">
              You don't have an active subscription. Choose a plan below to get started.
            </p>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Star className="h-6 w-6 text-gray-700 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Available Plans</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yearly (Save 17%)
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg">
            <Star className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Plans Available</h3>
            <p className="text-gray-600">
              There are no billing plans configured for your institution yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlanId === plan.id;
              const price =
                billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
              const savings =
                billingCycle === 'yearly' && plan.price.monthly && plan.price.yearly
                  ? Math.round(
                      ((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 border-2 rounded-lg transition-all ${
                    plan.popular
                      ? 'border-blue-500 bg-blue-50'
                      : isCurrentPlan
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <Icon
                      className={`h-12 w-12 mx-auto mb-4 ${
                        plan.popular
                          ? 'text-blue-600'
                          : isCurrentPlan
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(price, plan.currency || currencyCode)}
                      </span>
                      <span className="text-gray-600">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    {savings > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        Save {savings}% with yearly billing
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={isCurrentPlan || actionLoading}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${
                      isCurrentPlan
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${actionLoading ? 'opacity-50' : ''}`}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : actionLoading
                      ? 'Processing...'
                      : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 text-gray-700 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          </div>
          <button className="btn btn-primary" disabled>
            <CreditCard className="h-4 w-4 mr-2" />
            Add Payment Method
          </button>
        </div>

        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No payment methods on file</p>
        </div>
      </div>

      {/* Billing History */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-gray-700 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Billing History</h2>
          </div>
          <button className="btn btn-secondary" disabled>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </button>
        </div>

        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No billing history available</p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

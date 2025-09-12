import React, { useState } from 'react';
import { 
  CreditCard, 
  Check, 
  Star, 
  Heart, 
  Shield, 
  Clock, 
  Calendar,
  Download,
  Bell,
  Settings,
  Crown,
  Zap,
  Users,
  Phone,
  Video,
  MapPin,
  Activity
} from 'lucide-react';

const Subscription = () => {
  const [currentPlan, setCurrentPlan] = useState('premium');
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Mock subscription data
  const subscriptionData = {
    currentPlan: 'Premium',
    status: 'Active',
    nextBilling: 'January 15, 2025',
    amount: '$49.99',
    cycle: 'Monthly',
    features: [
      'Unlimited home visits',
      '24/7 emergency support',
      'Telemedicine consultations',
      'Medication management',
      'Caregiver coordination',
      'Health monitoring',
      'Family notifications'
    ]
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: { monthly: 19.99, yearly: 199.99 },
      description: 'Essential care services',
      features: [
        '2 home visits per month',
        'Basic health monitoring',
        'Email support',
        'Medication reminders',
        'Emergency contact'
      ],
      popular: false,
      icon: Heart
    },
    {
      id: 'premium',
      name: 'Premium',
      price: { monthly: 49.99, yearly: 499.99 },
      description: 'Comprehensive care package',
      features: [
        'Unlimited home visits',
        '24/7 emergency support',
        'Telemedicine consultations',
        'Medication management',
        'Caregiver coordination',
        'Health monitoring',
        'Family notifications',
        'Priority support'
      ],
      popular: true,
      icon: Crown
    },
    {
      id: 'elite',
      name: 'Elite',
      price: { monthly: 99.99, yearly: 999.99 },
      description: 'Premium concierge service',
      features: [
        'Everything in Premium',
        'Dedicated care manager',
        'Specialist consultations',
        'Advanced health analytics',
        'Custom care plans',
        'White-glove service',
        'Family dashboard',
        '24/7 concierge support'
      ],
      popular: false,
      icon: Star
    }
  ];

  const paymentMethods = [
    {
      id: 1,
      type: 'Visa',
      last4: '4242',
      expiry: '12/26',
      isDefault: true
    },
    {
      id: 2,
      type: 'Mastercard',
      last4: '5555',
      expiry: '08/25',
      isDefault: false
    }
  ];

  const billingHistory = [
    {
      id: 1,
      date: 'December 15, 2024',
      amount: '$49.99',
      status: 'Paid',
      description: 'Premium Plan - Monthly'
    },
    {
      id: 2,
      date: 'November 15, 2024',
      amount: '$49.99',
      status: 'Paid',
      description: 'Premium Plan - Monthly'
    },
    {
      id: 3,
      date: 'October 15, 2024',
      amount: '$49.99',
      status: 'Paid',
      description: 'Premium Plan - Monthly'
    }
  ];

  const handlePlanChange = (planId) => {
    setCurrentPlan(planId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600">Manage your ElderX subscription and billing</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </button>
          <button className="btn btn-primary">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-4">
              <Crown className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{subscriptionData.currentPlan} Plan</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscriptionData.status)}`}>
                  {subscriptionData.status}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{subscriptionData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cycle:</span>
                <span className="font-semibold">{subscriptionData.cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Next billing:</span>
                <span className="font-semibold">{subscriptionData.nextBilling}</span>
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
                <span className="font-semibold">8 / Unlimited</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Telemedicine:</span>
                <span className="font-semibold">3 / Unlimited</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Emergency calls:</span>
                <span className="font-semibold">1 / Unlimited</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-4">
              <Shield className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Benefits</h3>
            </div>
            <div className="space-y-1">
              {subscriptionData.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const savings = billingCycle === 'yearly' ? Math.round((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12) * 100) : 0;

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
                  <Icon className={`h-12 w-12 mx-auto mb-4 ${
                    plan.popular ? 'text-blue-600' : isCurrentPlan ? 'text-green-600' : 'text-gray-600'
                  }`} />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-gray-900">${price}</span>
                    <span className="text-gray-600">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                  {savings > 0 && (
                    <p className="text-sm text-green-600 font-medium">Save {savings}% with yearly billing</p>
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
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 text-gray-700 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          </div>
          <button className="btn btn-primary">
            <CreditCard className="h-4 w-4 mr-2" />
            Add Payment Method
          </button>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{method.type} •••• {method.last4}</p>
                  <p className="text-sm text-gray-500">Expires {method.expiry}</p>
                </div>
                {method.isDefault && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-gray-700 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Billing History</h2>
          </div>
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingHistory.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {bill.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

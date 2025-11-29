import React from 'react';
import { Check } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: "Basic",
      price: "₦15,000",
      period: "per month",
      features: [
        "2 home visits per month",
        "Basic health monitoring",
        "Emergency support"
      ],
      buttonText: "Choose Basic",
      buttonStyle: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
    },
    {
      name: "Premium",
      price: "₦25,000",
      period: "per month",
      features: [
        "4 home visits per month",
        "Video consultations",
        "Family notifications"
      ],
      buttonText: "Choose Premium",
      buttonStyle: "bg-blue-600 text-white hover:bg-blue-700",
      popular: true
    },
    {
      name: "Family",
      price: "₦40,000",
      period: "per month",
      features: [
        "Unlimited home visits",
        "24/7 emergency support",
        "Specialist consultations"
      ],
      buttonText: "Choose Family",
      buttonStyle: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
    }
  ];

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Affordable Care Plans
          </h1>
          <p className="text-lg text-gray-600">
            Flexible subscription options designed for Nigerian families.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <div key={index} className={`bg-white rounded-xl shadow-lg p-8 relative ${plan.popular ? 'border-2 border-blue-600' : 'border border-gray-200'}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-blue-600">{plan.price}</span>
                  <span className="text-gray-500 ml-2">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${plan.buttonStyle}`}>
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 transition-all">
            View All Plans & Get Started
          </button>
        </div>
      </div>

      {/* MGX Badge */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center">
          <span className="text-sm mr-2">Made by</span>
          <span className="font-bold">MGX</span>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

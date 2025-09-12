import React from 'react';
import { Heart, Shield, Users, Clock } from 'lucide-react';

const HealthcareHero = () => {
  const features = [
    {
      icon: Heart,
      title: 'Health Monitoring',
      description: 'Track vital signs and medication adherence'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data is protected with enterprise-grade security'
    },
    {
      icon: Users,
      title: 'Caregiver Support',
      description: 'Connect with family and healthcare providers'
    },
    {
      icon: Clock,
      title: '24/7 Access',
      description: 'Manage your health anytime, anywhere'
    }
  ];

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 sm:text-5xl md:text-6xl">
            Your Health, Our Priority
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-600">
            ElderX provides comprehensive healthcare management for seniors, 
            connecting you with caregivers and healthcare providers for better health outcomes.
          </p>
          <div className="mt-8 space-y-4">
            <div>
              <a
                href="/signup"
                className="text-blue-500 underline text-lg hover:text-blue-600"
              >
                Get Started
              </a>
            </div>
            <div>
              <a
                href="#services"
                className="text-blue-500 underline text-lg hover:text-blue-600"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 mx-auto mb-4">
                    <Icon className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">{feature.title}</h3>
                  <p className="text-base text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthcareHero;

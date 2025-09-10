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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Your Health, Our Priority
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            ElderX provides comprehensive healthcare management for seniors, 
            connecting you with caregivers and healthcare providers for better health outcomes.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <a
                href="#"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </a>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <a
                href="#"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-base text-gray-500">{feature.description}</p>
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

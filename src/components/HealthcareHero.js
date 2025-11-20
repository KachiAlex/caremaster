import React from 'react';
import { HeartPulse, Shield, Users, Clock } from 'lucide-react';

const HealthcareHero = () => {
  const features = [
    {
      icon: HeartPulse,
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
    <div className="bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
            Your Health,{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Our Priority
            </span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-300">
            UltimateCare provides comprehensive healthcare management, 
            connecting you with caregivers and healthcare providers for better health outcomes.
          </p>
          <div className="mt-8 space-y-4">
            <div>
              <a
                href="/signup"
                className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30"
              >
                Get Started
              </a>
            </div>
            <div>
              <a
                href="#services"
                className="inline-flex items-center px-6 py-3 border border-slate-700 text-slate-300 rounded-lg font-semibold hover:border-emerald-400 hover:text-emerald-300 transition-colors"
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
                <div key={index} className="text-center group">
                  <div className="flex items-center justify-center h-12 w-12 mx-auto mb-4 rounded-full bg-emerald-400/15 text-emerald-300 group-hover:bg-emerald-400/25 transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">{feature.title}</h3>
                  <p className="text-base text-slate-300">{feature.description}</p>
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

import React from 'react';
import { Link } from 'react-router-dom';
import HealthcareHero from '../components/HealthcareHero';
import HealthcareFooter from '../components/HealthcareFooter';
import Header from '../components/Header';

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HealthcareHero />
      
      {/* Services Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
            <p className="mt-4 text-lg text-gray-600">
              Comprehensive healthcare solutions designed for seniors
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Health Records</h3>
              <p className="text-gray-600">Keep track of your medical history, medications, and health metrics in one secure place.</p>
            </div>
            
            <div className="card text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mx-auto mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Medication Reminders</h3>
              <p className="text-gray-600">Never miss a dose with smart reminders and tracking for all your medications.</p>
            </div>
            
            <div className="card text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white mx-auto mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Appointment Scheduling</h3>
              <p className="text-gray-600">Schedule and manage your medical appointments with healthcare providers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
            <p className="mt-4 text-lg text-blue-100">
              Join thousands of seniors who trust ElderX for their healthcare management
            </p>
            <div className="mt-8">
              <Link
                to="/signup"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
              >
                Create Your Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <HealthcareFooter />
    </div>
  );
};

export default Landing;

import React from 'react';
import { Home, Heart, AlertTriangle, Video, Users, Shield } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: Home,
      title: "Home Visits",
      description: "Scheduled and on-demand home visits from qualified nurses and healthcare professionals.",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: Heart,
      title: "Vitals Monitoring",
      description: "Regular monitoring of blood pressure, blood sugar, temperature, and other vital signs.",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: AlertTriangle,
      title: "Emergency Support",
      description: "24/7 emergency response with direct hospital and ambulance dispatch coordination.",
      bgColor: "bg-red-100",
      iconColor: "text-red-600"
    },
    {
      icon: Video,
      title: "Telemedicine",
      description: "Video consultations with doctors and specialists.",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      icon: Users,
      title: "Family Integration",
      description: "Keep family members informed with real-time updates and notifications.",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      icon: Shield,
      title: "Medication Management",
      description: "Medication reminders, administration assistance, and tracking.",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    }
  ];

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Comprehensive Healthcare Services
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Everything you need for quality elderly care, delivered by certified professionals.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className={`w-16 h-16 ${service.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`h-8 w-8 ${service.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {service.description}
                </p>
              </div>
            );
          })}
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

export default Services;

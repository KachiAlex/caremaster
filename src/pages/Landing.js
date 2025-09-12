import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Bell, 
  User, 
  CheckCircle, 
  Shield, 
  Clock, 
  Phone, 
  Video, 
  ArrowRight,
  Star,
  MapPin,
  MessageCircle,
  Stethoscope,
  Activity,
  Users,
  Award,
  Zap
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Heart,
      title: "Health Monitoring",
      description: "Continuous monitoring of vital signs and health metrics"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your health data is protected with enterprise-grade security"
    },
    {
      icon: Users,
      title: "Caregiver Support",
      description: "Professional caregivers available 24/7 for your needs"
    },
    {
      icon: Clock,
      title: "24/7 Access",
      description: "Round-the-clock support and emergency response"
    }
  ];

  const services = [
    {
      icon: Stethoscope,
      title: "Home Visits",
      description: "Scheduled and on-demand home visits from qualified nurses and healthcare professionals.",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      icon: Activity,
      title: "Vitals Monitoring",
      description: "Regular monitoring of blood pressure, blood sugar, temperature, and other vital signs.",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      icon: Bell,
      title: "Emergency Support",
      description: "24/7 emergency response with direct hospital and ambulance dispatch coordination.",
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      icon: Video,
      title: "Telemedicine",
      description: "Video consultations with doctors and specialists.",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: Users,
      title: "Family Integration",
      description: "Keep family members informed with real-time updates and notifications.",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      icon: Shield,
      title: "Medication Management",
      description: "Medication reminders, administration assistance, and tracking.",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    }
  ];

  const testimonials = [
    {
      name: "Mrs. Adunni Okafor",
      location: "Lagos, Nigeria",
      rating: 5,
      text: "ElderCare Nigeria has been a blessing for my family. The caregivers are professional and caring, and the 24/7 support gives us peace of mind."
    },
    {
      name: "Dr. Kemi Adebayo",
      location: "Abuja, Nigeria",
      rating: 5,
      text: "As a healthcare professional, I can confidently recommend ElderCare Nigeria. Their services are top-notch and their technology is cutting-edge."
    },
    {
      name: "Mr. Chinedu Okoro",
      location: "Port Harcourt, Nigeria",
      rating: 5,
      text: "The medication management system has been incredibly helpful. I never miss a dose anymore, and my family is always informed about my health status."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Tagline */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Heart className="h-8 w-8 text-teal-500 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">ElderCare Nigeria</h1>
              </div>
              <p className="ml-4 text-sm text-gray-600 hidden sm:block">Professional Home Healthcare</p>
            </div>

            {/* Right side - Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              NG Proudly Nigerian • NDPR Compliant
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Quality <span className="text-teal-600">Healthcare</span> At Your <span className="text-green-600">Doorstep</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto lg:mx-0">
              ElderCare Nigeria provides compassionate and professional home healthcare services, ensuring comfort and well-being for your loved ones.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                Start Your Care Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="tel:0800-ELDERCARE"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Phone className="mr-2 h-5 w-5 text-blue-600" />
                Call: 0800-ELDERCARE
              </a>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-gray-600">
              <div className="flex items-center justify-center lg:justify-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Licensed Professionals
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <Shield className="h-5 w-5 text-blue-500 mr-2" />
                Secure & Private
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <Clock className="h-5 w-5 text-purple-500 mr-2" />
                24/7 Emergency Support
              </div>
            </div>
          </div>

          {/* Right Content - Chat Widget Mockup */}
          <div className="relative mt-12 lg:mt-0 flex justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
              <div className="flex items-center mb-4">
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1559839734-2b716b1772a1?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="Nurse Fatima Abdullahi"
                />
                <div className="ml-3">
                  <p className="text-lg font-medium text-gray-900">Nurse Fatima Abdullahi</p>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Heart className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-yellow-500">★</span> 4.9 (156 visits)
                  </p>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-green-800">
                  "Hello! I'll be arriving at your location in 15 minutes. Please ensure the gate is open."
                </p>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                <button className="flex items-center text-blue-600 hover:text-blue-800">
                  <MessageCircle className="h-5 w-5 mr-1" />
                  Reply
                </button>
                <button className="flex items-center text-blue-600 hover:text-blue-800">
                  <Video className="h-5 w-5 mr-1" />
                  Video Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose ElderCare Nigeria?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We provide comprehensive healthcare solutions designed specifically for Nigerian families
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Healthcare Services</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need for quality elderly care, delivered by certified professionals.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className={`w-16 h-16 ${service.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`h-8 w-8 ${service.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Clients Say</h2>
            <p className="text-lg text-gray-600">Real stories from families who trust ElderCare Nigeria</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of Nigerian families who trust ElderCare Nigeria for their healthcare needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Your Care Journey
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-blue-600"
            >
              <Award className="mr-2 h-5 w-5" />
              View Our Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Heart className="h-8 w-8 text-teal-500 mr-2" />
                <h3 className="text-xl font-bold text-gray-900">ElderCare Nigeria</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Professional home healthcare services for Nigerian families. 
                Compassionate care, advanced technology, and 24/7 support.
              </p>
              <div className="flex space-x-4">
                <a href="tel:0800-ELDERCARE" className="text-blue-600 hover:text-blue-800">
                  <Phone className="h-5 w-5" />
                </a>
                <a href="mailto:info@eldercare.ng" className="text-blue-600 hover:text-blue-800">
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Services</h4>
              <ul className="space-y-2">
                <li><a href="/services" className="text-gray-600 hover:text-blue-600">Home Visits</a></li>
                <li><a href="/services" className="text-gray-600 hover:text-blue-600">Vitals Monitoring</a></li>
                <li><a href="/services" className="text-gray-600 hover:text-blue-600">Emergency Support</a></li>
                <li><a href="/services" className="text-gray-600 hover:text-blue-600">Telemedicine</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</a></li>
                <li><a href="/about" className="text-gray-600 hover:text-blue-600">About Us</a></li>
                <li><a href="/contact" className="text-gray-600 hover:text-blue-600">Contact</a></li>
                <li><a href="/privacy" className="text-gray-600 hover:text-blue-600">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              &copy; 2024 ElderCare Nigeria. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Made by <a href="https://mgx.dev" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">MGX</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
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
      text: "ElderCare Nigeria has been a blessing for my family. The caregivers are professional and caring, and the 24/7 support gives us peace of mind.",
      photo: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80&v=2",
      age: "72 years old"
    },
    {
      name: "Dr. Kemi Adebayo",
      location: "Abuja, Nigeria",
      rating: 5,
      text: "As a healthcare professional, I can confidently recommend ElderCare Nigeria. Their services are top-notch and their technology is cutting-edge.",
      photo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80&v=2",
      age: "68 years old"
    },
    {
      name: "Mr. Chinedu Okoro",
      location: "Port Harcourt, Nigeria",
      rating: 5,
      text: "The medication management system has been incredibly helpful. I never miss a dose anymore, and my family is always informed about my health status.",
      photo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80&v=3",
      age: "75 years old"
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

            {/* Right side - Empty for clean header */}
            <div className="flex items-center">
              {/* Header actions can be added here if needed */}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover opacity-20"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4?v=2" type="video/mp4" />
            {/* Fallback image */}
            <img
              src="https://images.pexels.com/photos/7551675/pexels-photo-7551675.jpeg?auto=compress&cs=tinysrgb&w=2070"
              alt="African elderly receiving healthcare"
              className="w-full h-full object-cover"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-green-900/50"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left text-white">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
              🇳🇬 Proudly Nigerian • NDPR Compliant
            </span>
            <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl md:text-6xl">
              Quality <span className="text-teal-300">Healthcare</span> At Your <span className="text-green-300">Doorstep</span>
            </h1>
            <p className="mt-6 text-lg text-blue-100 max-w-xl mx-auto lg:mx-0">
              ElderCare Nigeria provides compassionate and professional home healthcare services, ensuring comfort and well-being for your loved ones.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="tel:0800-ELDERCARE"
                className="inline-flex items-center justify-center px-6 py-3 border border-white/30 text-base font-medium rounded-md text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              >
                <Phone className="mr-2 h-5 w-5" />
                Call: 0800-ELDERCARE
              </a>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-blue-100">
              <div className="flex items-center justify-center lg:justify-start">
                <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                Licensed Professionals
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <Shield className="h-5 w-5 text-blue-300 mr-2" />
                Secure & Private
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <Clock className="h-5 w-5 text-purple-300 mr-2" />
                24/7 Emergency Support
              </div>
            </div>
          </div>

          {/* Right Content - Keep only Nurse Fatima widget */}
          <div className="mt-12 lg:mt-0 flex lg:items-start lg:justify-start">
            {/* Floating Chat Widget */}
            <div className="inline-block transform origin-top-left scale-[1.6] md:scale-[1.8] lg:scale-[2] lg:-translate-y-6 transition-transform duration-300 ease-out hover:-rotate-2 hover:shadow-2xl bg-white rounded-lg shadow-xl p-4 w-72 mx-auto lg:mx-0">
              <div className="flex items-center mb-3">
                <img
                  className="h-10 w-10 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80&v=2"
                  alt="Nurse Fatima Abdullahi"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Nurse Fatima Abdullahi</p>
                  <p className="text-xs text-gray-500 flex items-center">
                    <Heart className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-yellow-500">★</span> 4.9 (156 visits)
                  </p>
                </div>
              </div>
              <div className="bg-green-50 p-2 rounded-lg mb-3">
                <p className="text-xs text-green-800">
                  "Hello! I'll be arriving at your location in 15 minutes. Please ensure the gate is open."
                </p>
              </div>
              <div className="flex justify-between items-center">
                <button className="flex items-center text-blue-600 hover:text-blue-800 text-xs">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Reply
                </button>
                <button className="flex items-center text-blue-600 hover:text-blue-800 text-xs">
                  <Video className="h-3 w-3 mr-1" />
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

      {/* Real Stories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Real Stories from Our Community</h2>
            <p className="text-lg text-gray-600">See how ElderCare Nigeria is making a difference in the lives of African families</p>
          </div>
          
          {/* Image Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="relative group">
              <img
                src="https://images.pexels.com/photos/7551649/pexels-photo-7551649.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="African elderly woman receiving home healthcare"
                className="w-full h-64 object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Compassionate Care</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <img
                src={process.env.PUBLIC_URL + '/images/story-care-checkup-1.png'}
                alt="African elderly man with healthcare professional"
                className="w-full h-64 object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Family Connection</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <img
                src="https://images.pexels.com/photos/7551617/pexels-photo-7551617.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="African elderly woman with technology"
                className="w-full h-64 object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Health Monitoring</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <img
                src={process.env.PUBLIC_URL + '/images/story-care-checkup-2.png'}
                alt="African elderly man with family"
                className="w-full h-64 object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <Award className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Trusted Care</p>
                </div>
              </div>
            </div>

            {/* Note: two extra placeholders removed per request */}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <img
                    src={testimonial.photo}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-blue-100"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {testimonial.location}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">{testimonial.age}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Testimonial Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">See ElderCare Nigeria in Action</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Watch real stories from African families who have experienced the difference our care makes
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Video */}
            <div className="relative">
              <div className="relative rounded-lg overflow-hidden shadow-2xl">
                <video
                  className="w-full h-96 object-cover"
                  controls
                  poster="https://images.pexels.com/photos/7551675/pexels-photo-7551675.jpeg?auto=compress&cs=tinysrgb&w=1200"
                >
                  <source src="https://videos.pexels.com/video-files/8611971/8611971-hd_1920_1080_25fps.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-lg font-semibold">Mrs. Adunni's Story</h3>
                  <p className="text-sm opacity-90">Lagos, Nigeria</p>
                </div>
              </div>
            </div>
            
            {/* Video Content */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Compassionate Care</h3>
                  <p className="text-gray-600">
                    Our caregivers provide not just medical care, but emotional support and companionship that makes a real difference in the lives of our patients.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Excellence</h3>
                  <p className="text-gray-600">
                    All our healthcare professionals are licensed, experienced, and trained to provide the highest quality care in the comfort of your home.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Family-Centered Approach</h3>
                  <p className="text-gray-600">
                    We work closely with families to ensure everyone is informed and involved in the care process, creating a supportive network around each patient.
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Video className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </div>
            </div>
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
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
            >
              <Zap className="mr-2 h-5 w-5" />
              Get Started
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
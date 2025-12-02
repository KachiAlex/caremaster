import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Shield, 
  Users, 
  Smartphone,
  BarChart3,
  Clock,
  CheckCircle,
  Star,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Activity,
  Zap,
  Globe,
  Lock,
  TrendingUp,
  Award,
  MessageCircle,
  ChevronRight,
  Menu,
  X,
  Play
} from 'lucide-react';

const NewHomePage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState('caregiver');

  // Auto-scroll stats
  const [statsAnimated, setStatsAnimated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const statsSection = document.getElementById('stats');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
          setStatsAnimated(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = {
    caregiver: {
      title: "Caregiver Management",
      items: [
        { icon: Smartphone, text: "Mobile App for Caregivers", desc: "Clock in/out, GPS tracking, visit documentation" },
        { icon: Calendar, text: "Smart Scheduling", desc: "Automated scheduling with conflict detection" },
        { icon: CheckCircle, text: "Electronic Visit Verification (EVV)", desc: "Automated compliance with government regulations" },
        { icon: Activity, text: "Real-time Care Documentation", desc: "Document care activities instantly from mobile" }
      ]
    },
    client: {
      title: "Client Management",
      items: [
        { icon: Users, text: "Comprehensive Client Profiles", desc: "Complete health history and care plans" },
        { icon: Heart, text: "Care Plan Builder", desc: "Customizable care plans with progress tracking" },
        { icon: MessageCircle, text: "Family Portal", desc: "Keep families informed with real-time updates" },
        { icon: Shield, text: "Medication Management", desc: "Track medications, allergies, and interactions" }
      ]
    },
    operations: {
      title: "Operations & Administration",
      items: [
        { icon: BarChart3, text: "Business Intelligence Dashboard", desc: "Real-time insights into your agency performance" },
        { icon: TrendingUp, text: "Financial Management", desc: "Billing, invoicing, and payroll in one place" },
        { icon: Lock, text: "Compliance & Security", desc: "HIPAA-compliant with enterprise-grade security" },
        { icon: Zap, text: "Workflow Automation", desc: "Automate repetitive tasks and save time" }
      ]
    }
  };

  const stats = [
    { number: "500+", label: "Care Agencies Served", prefix: "" },
    { number: "10,000+", label: "Active Caregivers", prefix: "" },
    { number: "50,000+", label: "Clients Cared For", prefix: "" },
    { number: "99.8%", label: "Uptime Reliability", prefix: "" }
  ];

  const testimonials = [
    {
      quote: "Care Master has transformed how we manage our agency. The mobile app is intuitive, and our caregivers love it. We've seen a 40% increase in caregiver retention since switching.",
      author: "Sarah Johnson",
      role: "CEO, Compassion Home Care",
      location: "Lagos, Nigeria",
      rating: 5
    },
    {
      quote: "The automated scheduling and EVV compliance features alone are worth it. But the business intelligence dashboard has helped us identify growth opportunities we never knew existed.",
      author: "Dr. Michael Chen",
      role: "Owner, Senior Care Plus",
      location: "Abuja, Nigeria",
      rating: 5
    },
    {
      quote: "Finally, a platform that understands the complexities of home care. Custom forms, robust reporting, and exceptional support. Care Master is the total package.",
      author: "Amara Okafor",
      role: "Director, Golden Years Care",
      location: "Port Harcourt, Nigeria",
      rating: 5
    }
  ];

  const trustedBy = [
    "Compassion Home Care",
    "Senior Care Plus",
    "Golden Years Care",
    "Comfort Keepers Nigeria",
    "Elite Elder Care"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Clickable Home Button */}
            <Link to="/" className="flex items-center group cursor-pointer">
              <Heart className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="ml-2 text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Care Master</span>
              <span className="ml-3 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full hidden sm:inline">
                Health Tech
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Features</a>
              <a href="#solutions" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Solutions</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Reviews</a>
              <div className="flex items-center space-x-4 ml-4">
                <a href="tel:+2348000000000" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                  <Phone className="inline h-4 w-4 mr-1" />
                  +234 800 000 0000
                </a>
                <Link
                  to="/institution"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                >
                  Institution Portal
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
                <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg">
                  Schedule Demo
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3">
                <a href="#features" className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md hover:bg-gray-50">Features</a>
                <a href="#solutions" className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md hover:bg-gray-50">Solutions</a>
                <a href="#pricing" className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md hover:bg-gray-50">Pricing</a>
                <a href="#testimonials" className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md hover:bg-gray-50">Reviews</a>
                <Link to="/institution" className="text-blue-600 font-semibold px-3 py-2 rounded-md bg-blue-50">Institution Portal</Link>
                <button className="mt-2 w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Schedule Demo</button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-flex items-center px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-white mb-6">
                <Award className="h-4 w-4 mr-2 text-yellow-300" />
                #1-Rated Home Care Management Platform in Nigeria
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
                The Health Tech Platform Built For 
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 mt-2">
                  Modern Care Agencies
                </span>
              </h1>
              
              <p className="mt-6 text-xl text-blue-100 leading-relaxed">
                Empower your care agency with the most flexible, powerful, and user-friendly platform. 
                Manage caregivers, clients, billing, and operations—all in one place.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <button className="group px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center">
                  Schedule a Demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  to="/institution"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/20 transition-all border-2 border-white/30 flex items-center justify-center"
                >
                  Access Institution Portal
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex items-center gap-8 flex-wrap">
                <div className="flex items-center text-yellow-300">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                  <span className="ml-2 text-white font-semibold">4.9/5 Rating</span>
                </div>
                <div className="text-white/80">
                  <span className="font-semibold text-white">500+</span> Agencies Trust Us
                </div>
              </div>
            </div>

            {/* Right Content - Dashboard Preview */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 transform lg:rotate-2 hover:rotate-0 transition-transform duration-300">
                {/* Mock Dashboard */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                      <span className="ml-3 font-bold text-gray-900">Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full"></div>
                      <div className="w-8 h-8 bg-blue-100 rounded-full"></div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">124</div>
                      <div className="text-xs text-gray-600 mt-1">Active Clients</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">48</div>
                      <div className="text-xs text-gray-600 mt-1">Caregivers</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">₦2.4M</div>
                      <div className="text-xs text-gray-600 mt-1">Revenue</div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-gray-50 rounded-lg p-4 h-32 flex items-end justify-between gap-2">
                    {[40, 60, 45, 75, 55, 85, 70, 90].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" style={{ height: `${height}%` }}></div>
                    ))}
                  </div>

                  {/* Activity List */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 flex-1">Visit completed - John Doe</span>
                      <span className="text-xs text-gray-500">2m ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 flex-1">New client onboarded</span>
                      <span className="text-xs text-gray-500">15m ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Mobile App Preview */}
              <div className="absolute -bottom-6 -left-6 w-32 sm:w-40 bg-white rounded-2xl shadow-xl p-3 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <div className="bg-blue-600 rounded-lg p-3 text-white text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-xs font-semibold">CLOCKED IN</div>
                  <div className="text-lg font-bold">2:30 PM</div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="bg-gray-100 h-2 rounded"></div>
                  <div className="bg-gray-100 h-2 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wide mb-8">
            Trusted by Leading Care Agencies Across Nigeria
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center opacity-60">
            {trustedBy.map((company, index) => (
              <div key={index} className="text-gray-700 font-semibold text-sm text-center">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Card 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative bg-white m-0.5 rounded-2xl p-8 h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Increase Caregiver Retention
                </h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Intuitive mobile app caregivers love</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">User-friendly scheduling and routing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Reliable GPS tracking and EVV</span>
                  </li>
                </ul>
                <a href="#features" className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700">
                  Learn More <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Card 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative bg-white m-0.5 rounded-2xl p-8 h-full">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Full Control of Operations
                </h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Robust security & compliance protocols</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Custom reports & electronic forms</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Streamlined workflows & automation</span>
                  </li>
                </ul>
                <a href="#features" className="inline-flex items-center text-green-600 font-semibold hover:text-green-700">
                  Learn More <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Card 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative bg-white m-0.5 rounded-2xl p-8 h-full">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Scale Your Business
                </h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Increase revenue with better insights</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Customizable reporting and analytics</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">Exceptional customer support 24/7</span>
                  </li>
                </ul>
                <a href="#pricing" className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700">
                  Learn More <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="bg-gradient-to-br from-gray-900 to-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-2 transition-all duration-1000 ${statsAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                  {stat.number}
                </div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Platform Features</span>
            <h2 className="mt-2 text-4xl lg:text-5xl font-extrabold text-gray-900">
              Everything You Need to Run Your Agency
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive tools designed specifically for home care agencies, from caregiver management to financial reporting.
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {Object.keys(features).map((key) => (
              <button
                key={key}
                onClick={() => setActiveFeature(key)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeFeature === key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {features[key].title}
              </button>
            ))}
          </div>

          {/* Feature Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features[activeFeature].items.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-md transition-all duration-300">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.text}</h4>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Hundreds of 5-Star Reviews
            </h2>
            <p className="text-xl text-gray-600">
              Home Care Agencies Love Care Master
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.quote}</p>
                <div className="pt-4 border-t border-gray-200">
                  <p className="font-bold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-blue-600">{testimonial.role}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Our Approach</span>
              <h2 className="mt-2 text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                Customer-First Approach + Innovative Technology = 
                <span className="block text-blue-600 mt-2">Success at Scale</span>
              </h2>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                Because of our unique people-first approach, Care Master is ahead of the curve when meeting the needs of our customers.
              </p>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                We are dedicated to innovation and offering agile and flexible features that are top-rated in the industry, while also providing exceptional customer support so you can focus on what matters most—providing even better care.
              </p>
              <button className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center">
                Learn More About Our Platform
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>

            {/* Right Content - Image Placeholder */}
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Heart className="h-24 w-24 text-blue-600 mx-auto mb-4" />
                    <p className="text-2xl font-bold text-gray-900">Care Management</p>
                    <p className="text-gray-600 mt-2">Powered by Technology</p>
                  </div>
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-4">
                <div className="text-3xl font-bold text-blue-600">98%</div>
                <div className="text-xs text-gray-600">Client Satisfaction</div>
              </div>

              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4">
                <div className="text-3xl font-bold text-green-600">24/7</div>
                <div className="text-xs text-gray-600">Support Available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">
            Ready to Transform Your Care Agency?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            Join hundreds of care agencies already using Care Master to improve operations, increase revenue, and provide better care.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-5 bg-white text-blue-600 font-bold text-lg rounded-lg hover:bg-blue-50 transition-all shadow-2xl hover:shadow-3xl flex items-center justify-center">
              Schedule a Free Demo
              <Play className="ml-3 h-6 w-6" />
            </button>
            <Link
              to="/institution"
              className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-lg hover:bg-white/20 transition-all border-2 border-white/30 flex items-center justify-center"
            >
              Access Your Portal
              <ChevronRight className="ml-3 h-6 w-6" />
            </Link>
          </div>

          <p className="mt-8 text-blue-200 text-sm">
            ✓ No credit card required • ✓ Free 30-day trial • ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="col-span-1">
              <div className="flex items-center mb-4">
                <Heart className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">Care Master</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                The leading Health Tech platform for modern care agencies in Nigeria and beyond.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-bold text-lg mb-4">Platform Features</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Caregiver Management</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Client Management</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Scheduling & Routing</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">EVV Compliance</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Billing & Payroll</a></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="font-bold text-lg mb-4">Solutions</h4>
              <ul className="space-y-2">
                <li><a href="#solutions" className="text-gray-400 hover:text-white transition-colors">For Small Agencies</a></li>
                <li><a href="#solutions" className="text-gray-400 hover:text-white transition-colors">For Enterprise</a></li>
                <li><a href="#solutions" className="text-gray-400 hover:text-white transition-colors">For Franchises</a></li>
                <li><a href="#solutions" className="text-gray-400 hover:text-white transition-colors">Mobile Solutions</a></li>
                <li><a href="#solutions" className="text-gray-400 hover:text-white transition-colors">Custom Integrations</a></li>
              </ul>
            </div>

            {/* Contact & Portal Access */}
            <div>
              <h4 className="font-bold text-lg mb-4">Get Started</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/institution" className="flex items-center text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Institution Portal
                  </Link>
                </li>
                <li>
                  <a href="tel:+2348000000000" className="text-gray-400 hover:text-white transition-colors flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    +234 800 000 0000
                  </a>
                </li>
                <li>
                  <a href="mailto:support@caremaster.com" className="text-gray-400 hover:text-white transition-colors flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    support@caremaster.com
                  </a>
                </li>
                <li className="pt-3">
                  <button className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Schedule a Demo
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Care Master. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">NDPR Compliance</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center z-40">
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
};

export default NewHomePage;


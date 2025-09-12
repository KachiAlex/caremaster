import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Heart, 
  Calendar, 
  AlertTriangle,
  UserCheck,
  Activity,
  Clock,
  DollarSign,
  Target,
  Award,
  MapPin,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    overview: {},
    userMetrics: {},
    caregiverMetrics: {},
    emergencyMetrics: {},
    medicationMetrics: {},
    financialMetrics: {},
    geographicData: {},
    trends: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    users: true,
    caregivers: false,
    emergencies: false,
    medications: false,
    financial: false,
    geographic: false,
    trends: false
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setAnalytics({
          overview: {
            totalUsers: 1247,
            activeCaregivers: 89,
            totalAppointments: 2341,
            emergencyAlerts: 12,
            medicationCompliance: 94.2,
            systemUptime: 99.8,
            userGrowth: 15.3,
            caregiverSatisfaction: 4.7
          },
          userMetrics: {
            totalUsers: 1247,
            newUsersThisMonth: 156,
            activeUsers: 892,
            inactiveUsers: 355,
            userRetention: 87.3,
            averageAge: 72.5,
            genderDistribution: {
              male: 45.2,
              female: 54.8
            },
            locationDistribution: {
              'Lagos': 35.2,
              'Abuja': 22.1,
              'Kano': 15.8,
              'Port Harcourt': 12.4,
              'Ibadan': 8.9,
              'Others': 5.6
            },
            registrationTrend: [
              { month: 'Jan', count: 89 },
              { month: 'Feb', count: 112 },
              { month: 'Mar', count: 98 },
              { month: 'Apr', count: 134 },
              { month: 'May', count: 156 },
              { month: 'Jun', count: 178 }
            ]
          },
          caregiverMetrics: {
            totalCaregivers: 89,
            activeCaregivers: 67,
            pendingCaregivers: 12,
            inactiveCaregivers: 10,
            averageRating: 4.6,
            averageExperience: 4.2,
            topPerformers: [
              { name: 'Tunde Adebayo', rating: 4.9, patients: 8, earnings: 180000 },
              { name: 'Sarah Williams', rating: 4.8, patients: 6, earnings: 165000 },
              { name: 'Grace Okafor', rating: 4.7, patients: 7, earnings: 155000 }
            ],
            performanceDistribution: {
              'Excellent (4.5+)': 45,
              'Good (4.0-4.4)': 32,
              'Average (3.5-3.9)': 8,
              'Below Average (<3.5)': 4
            },
            specializations: {
              'Elderly Care': 67,
              'Dementia Care': 45,
              'Physical Therapy': 38,
              'Medication Management': 52,
              'Post-Surgery Care': 29
            }
          },
          emergencyMetrics: {
            totalEmergencies: 12,
            resolvedEmergencies: 10,
            activeEmergencies: 2,
            averageResponseTime: 8.5,
            emergencyTypes: {
              'Medical Emergency': 5,
              'Fall': 3,
              'Medication Issue': 2,
              'Equipment Malfunction': 1,
              'Other': 1
            },
            responseTimeTrend: [
              { day: 'Mon', time: 7.2 },
              { day: 'Tue', time: 8.1 },
              { day: 'Wed', time: 9.3 },
              { day: 'Thu', time: 6.8 },
              { day: 'Fri', time: 8.9 },
              { day: 'Sat', time: 10.2 },
              { day: 'Sun', time: 9.1 }
            ],
            severityDistribution: {
              'Critical': 2,
              'High': 4,
              'Medium': 5,
              'Low': 1
            }
          },
          medicationMetrics: {
            totalMedications: 2341,
            complianceRate: 94.2,
            missedDoses: 89,
            medicationErrors: 3,
            averageAdherence: 96.1,
            medicationTypes: {
              'Blood Pressure': 456,
              'Diabetes': 389,
              'Heart Medication': 234,
              'Pain Management': 567,
              'Vitamins': 445,
              'Other': 250
            },
            complianceTrend: [
              { week: 'Week 1', rate: 92.1 },
              { week: 'Week 2', rate: 94.3 },
              { week: 'Week 3', rate: 95.8 },
              { week: 'Week 4', rate: 94.2 }
            ]
          },
          financialMetrics: {
            totalRevenue: 12500000,
            monthlyRevenue: 2100000,
            revenueGrowth: 12.5,
            averageTransactionValue: 45000,
            revenueByService: {
              'Caregiver Services': 8500000,
              'Medication Management': 2100000,
              'Emergency Services': 1200000,
              'Consultation': 700000
            },
            paymentMethods: {
              'Bank Transfer': 45.2,
              'Card Payment': 32.1,
              'Mobile Money': 18.7,
              'Cash': 4.0
            },
            monthlyRevenueTrend: [
              { month: 'Jan', revenue: 1800000 },
              { month: 'Feb', revenue: 1950000 },
              { month: 'Mar', revenue: 2100000 },
              { month: 'Apr', revenue: 2050000 },
              { month: 'May', revenue: 2200000 },
              { month: 'Jun', revenue: 2100000 }
            ]
          },
          geographicData: {
            userDistribution: {
              'Lagos': 439,
              'Abuja': 276,
              'Kano': 197,
              'Port Harcourt': 155,
              'Ibadan': 111,
              'Others': 69
            },
            caregiverDistribution: {
              'Lagos': 31,
              'Abuja': 19,
              'Kano': 14,
              'Port Harcourt': 11,
              'Ibadan': 8,
              'Others': 6
            },
            serviceAreas: [
              { city: 'Lagos', coverage: 95, users: 439, caregivers: 31 },
              { city: 'Abuja', coverage: 88, users: 276, caregivers: 19 },
              { city: 'Kano', coverage: 75, users: 197, caregivers: 14 },
              { city: 'Port Harcourt', coverage: 70, users: 155, caregivers: 11 },
              { city: 'Ibadan', coverage: 65, users: 111, caregivers: 8 }
            ]
          },
          trends: {
            userGrowth: [
              { month: 'Jan', growth: 8.2 },
              { month: 'Feb', growth: 12.1 },
              { month: 'Mar', growth: 9.8 },
              { month: 'Apr', growth: 15.3 },
              { month: 'May', growth: 18.7 },
              { month: 'Jun', growth: 15.3 }
            ],
            caregiverGrowth: [
              { month: 'Jan', growth: 5.1 },
              { month: 'Feb', growth: 8.3 },
              { month: 'Mar', growth: 6.7 },
              { month: 'Apr', growth: 11.2 },
              { month: 'May', growth: 13.8 },
              { month: 'Jun', growth: 10.5 }
            ],
            serviceDemand: {
              'Caregiver Services': 78.5,
              'Medication Management': 65.2,
              'Emergency Response': 45.8,
              'Health Monitoring': 52.3,
              'Family Communication': 38.7
            }
          }
        });
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (value, isPositive = true) => {
    if (isPositive) {
      return value > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return value > 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  const getTrendColor = (value, isPositive = true) => {
    if (isPositive) {
      return value > 0 ? 'text-green-600' : 'text-red-600';
    }
    return value > 0 ? 'text-red-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            className="form-input"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button 
            onClick={loadAnalyticsData}
            className="btn btn-primary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.overview.totalUsers)}</p>
              <div className="flex items-center mt-1">
                {getTrendIcon(analytics.overview.userGrowth)}
                <span className={`text-sm ${getTrendColor(analytics.overview.userGrowth)}`}>
                  +{analytics.overview.userGrowth}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Caregivers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.activeCaregivers}</p>
              <div className="flex items-center mt-1">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-600 ml-1">
                  {analytics.overview.caregiverSatisfaction} avg rating
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Heart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Medication Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.medicationCompliance}%</p>
              <div className="flex items-center mt-1">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 ml-1">Above target</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.financialMetrics.monthlyRevenue)}</p>
              <div className="flex items-center mt-1">
                {getTrendIcon(analytics.financialMetrics.revenueGrowth)}
                <span className={`text-sm ${getTrendColor(analytics.financialMetrics.revenueGrowth)}`}>
                  +{analytics.financialMetrics.revenueGrowth}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Analytics Section */}
      <div className="card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('users')}
        >
          <h2 className="text-lg font-semibold text-gray-900">User Analytics</h2>
          {expandedSections.users ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        {expandedSections.users && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">User Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Users</span>
                    <span className="text-sm font-medium text-gray-900">{analytics.userMetrics.activeUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New This Month</span>
                    <span className="text-sm font-medium text-gray-900">{analytics.userMetrics.newUsersThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Retention Rate</span>
                    <span className="text-sm font-medium text-gray-900">{analytics.userMetrics.userRetention}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Age</span>
                    <span className="text-sm font-medium text-gray-900">{analytics.userMetrics.averageAge} years</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Gender Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Male</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{analytics.userMetrics.genderDistribution.male}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Female</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{analytics.userMetrics.genderDistribution.female}%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Top Locations</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.userMetrics.locationDistribution).slice(0, 5).map(([location, percentage]) => (
                    <div key={location} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{location}</span>
                      <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Caregiver Analytics Section */}
      <div className="card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('caregivers')}
        >
          <h2 className="text-lg font-semibold text-gray-900">Caregiver Analytics</h2>
          {expandedSections.caregivers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        {expandedSections.caregivers && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Performance Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.caregiverMetrics.performanceDistribution).map(([rating, count]) => (
                    <div key={rating} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{rating}</span>
                      <span className="text-sm font-medium text-gray-900">{count} caregivers</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Top Performers</h3>
                <div className="space-y-3">
                  {analytics.caregiverMetrics.topPerformers.map((caregiver, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{caregiver.name}</p>
                        <p className="text-xs text-gray-500">{caregiver.patients} patients</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">{caregiver.rating}</span>
                        </div>
                        <p className="text-xs text-gray-500">{formatCurrency(caregiver.earnings)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900">Specializations</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(analytics.caregiverMetrics.specializations).map(([specialization, count]) => (
                  <div key={specialization} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-600">{specialization}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Analytics Section */}
      <div className="card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('emergencies')}
        >
          <h2 className="text-lg font-semibold text-gray-900">Emergency Analytics</h2>
          {expandedSections.emergencies ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        {expandedSections.emergencies && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Emergency Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Emergencies</span>
                    <span className="text-sm font-medium text-gray-900">{analytics.emergencyMetrics.totalEmergencies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolved</span>
                    <span className="text-sm font-medium text-green-600">{analytics.emergencyMetrics.resolvedEmergencies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active</span>
                    <span className="text-sm font-medium text-red-600">{analytics.emergencyMetrics.activeEmergencies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="text-sm font-medium text-gray-900">{analytics.emergencyMetrics.averageResponseTime} min</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Emergency Types</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.emergencyMetrics.emergencyTypes).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{type}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Severity Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.emergencyMetrics.severityDistribution).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{severity}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Analytics Section */}
      <div className="card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('financial')}
        >
          <h2 className="text-lg font-semibold text-gray-900">Financial Analytics</h2>
          {expandedSections.financial ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        {expandedSections.financial && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Revenue by Service</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.financialMetrics.revenueByService).map(([service, revenue]) => (
                    <div key={service} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{service}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Payment Methods</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.financialMetrics.paymentMethods).map(([method, percentage]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{method}</span>
                      <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900">Key Financial Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.financialMetrics.totalRevenue)}</p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.financialMetrics.averageTransactionValue)}</p>
                  <p className="text-sm text-gray-600">Avg Transaction</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">+{analytics.financialMetrics.revenueGrowth}%</p>
                  <p className="text-sm text-gray-600">Growth Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Geographic Analytics Section */}
      <div className="card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('geographic')}
        >
          <h2 className="text-lg font-semibold text-gray-900">Geographic Analytics</h2>
          {expandedSections.geographic ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        {expandedSections.geographic && (
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900">Service Coverage</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caregivers</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.geographicData.serviceAreas.map((area, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{area.city}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.coverage}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.users}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.caregivers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;

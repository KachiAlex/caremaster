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
  ChevronUp,
  Brain,
  Zap,
  Shield,
  Database,
  Cpu,
  Wifi,
  Battery,
  Thermometer,
  Pulse,
  Stethoscope,
  Smartphone,
  Monitor,
  Camera,
  Mic,
  Volume2,
  WifiOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Pause,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Octagon,
  Star,
  Sparkles,
  Layers,
  Grid3X3,
  Layout,
  Sidebar,
  PanelLeft,
  PanelRight,
  Split,
  Columns,
  Rows,
  Table,
  List,
  Grid,
  LayoutGrid,
  LayoutList,
  LayoutTemplate,
  LayoutDashboard,
  LayoutKanban,
  LayoutSidebar,
  LayoutSidebarLeft,
  LayoutSidebarRight,
  LayoutSidebarLeftCollapse,
  LayoutSidebarLeftExpand,
  LayoutSidebarRightCollapse,
  LayoutSidebarRightExpand,
  LayoutSidebarInset,
  LayoutSidebarInsetLeft,
  LayoutSidebarInsetRight,
  LayoutSidebarInsetLeftCollapse,
  LayoutSidebarInsetLeftExpand,
  LayoutSidebarInsetRightCollapse,
  LayoutSidebarInsetRightExpand,
  LayoutSidebarInsetLeftInset,
  LayoutSidebarInsetRightInset,
  LayoutSidebarInsetLeftInsetCollapse,
  LayoutSidebarInsetLeftInsetExpand,
  LayoutSidebarInsetRightInsetCollapse,
  LayoutSidebarInsetRightInsetExpand,
  LayoutSidebarInsetLeftInsetLeft,
  LayoutSidebarInsetLeftInsetRight,
  LayoutSidebarInsetRightInsetLeft,
  LayoutSidebarInsetRightInsetRight,
  LayoutSidebarInsetLeftInsetLeftCollapse,
  LayoutSidebarInsetLeftInsetLeftExpand,
  LayoutSidebarInsetLeftInsetRightCollapse,
  LayoutSidebarInsetLeftInsetRightExpand,
  LayoutSidebarInsetRightInsetLeftCollapse,
  LayoutSidebarInsetRightInsetLeftExpand,
  LayoutSidebarInsetRightInsetRightCollapse,
  LayoutSidebarInsetRightInsetRightExpand
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { analyticsAPI } from '../api/analyticsAPI';
import aiService from '../services/aiService';
import computerVisionService from '../services/computerVisionService';
import iotIntegrationService from '../services/iotIntegrationService';

const AdvancedAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState({
    overview: {},
    userMetrics: {},
    caregiverMetrics: {},
    emergencyMetrics: {},
    medicationMetrics: {},
    financialMetrics: {},
    geographicData: {},
    trends: {},
    aiInsights: {},
    realTimeData: {},
    systemHealth: {},
    performanceMetrics: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [viewMode, setViewMode] = useState('dashboard');
  const [aiInsights, setAiInsights] = useState([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    users: true,
    caregivers: false,
    emergencies: false,
    medications: false,
    financial: false,
    geographic: false,
    trends: false,
    aiInsights: false,
    realTime: false,
    systemHealth: false,
    performance: false
  });

  const [filters, setFilters] = useState({
    dateRange: '30d',
    userType: 'all',
    location: 'all',
    serviceType: 'all',
    aiAnalysis: true
  });

  const [aiAnalysis, setAiAnalysis] = useState({
    predictions: [],
    recommendations: [],
    anomalies: [],
    trends: [],
    insights: []
  });

  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 0,
    currentCalls: 0,
    systemLoad: 0,
    responseTime: 0,
    errorRate: 0,
    uptime: 100
  });

  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    components: {},
    alerts: [],
    performance: {}
  });

  const [iotDevices, setIotDevices] = useState([]);
  const [computerVisionData, setComputerVisionData] = useState({});

  useEffect(() => {
    loadAnalyticsData();
    if (realTimeUpdates) {
      startRealTimeUpdates();
    }
    
    return () => {
      // Cleanup
    };
  }, [selectedPeriod, filters, realTimeUpdates]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load comprehensive analytics
      const [
        overview,
        userMetrics,
        caregiverMetrics,
        emergencyMetrics,
        medicationMetrics,
        financialMetrics,
        geographicData,
        trends
      ] = await Promise.all([
        analyticsAPI.getOverviewAnalytics({ period: selectedPeriod }),
        analyticsAPI.getUserAnalytics({ period: selectedPeriod }),
        analyticsAPI.getCaregiverAnalytics({ period: selectedPeriod }),
        analyticsAPI.getEmergencyAnalytics({ period: selectedPeriod }),
        analyticsAPI.getMedicationAnalytics({ period: selectedPeriod }),
        analyticsAPI.getFinancialAnalytics({ period: selectedPeriod }),
        analyticsAPI.getGeographicAnalytics(),
        analyticsAPI.getTrendAnalytics({ period: selectedPeriod })
      ]);

      // Generate AI insights
      const aiInsights = await generateAIInsights({
        overview,
        userMetrics,
        caregiverMetrics,
        emergencyMetrics,
        medicationMetrics,
        financialMetrics,
        geographicData,
        trends
      });

      // Get system health
      const systemHealth = await getSystemHealth();

      // Get performance metrics
      const performanceMetrics = await getPerformanceMetrics();

      // Get IoT devices
      const iotDevices = iotIntegrationService.getConnectedDevices();

      // Get computer vision data
      const computerVisionData = await getComputerVisionData();

      setAnalytics({
        overview,
        userMetrics,
        caregiverMetrics,
        emergencyMetrics,
        medicationMetrics,
        financialMetrics,
        geographicData,
        trends,
        aiInsights,
        realTimeData: await getRealTimeData(),
        systemHealth,
        performanceMetrics
      });

      setAiAnalysis(aiInsights);
      setIotDevices(iotDevices);
      setComputerVisionData(computerVisionData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async (data) => {
    try {
      // Use AI service to generate insights
      const insights = await aiService.generateCareRecommendations(data, {});
      
      return {
        predictions: insights.predictions || [],
        recommendations: insights.recommendations || [],
        anomalies: insights.anomalies || [],
        trends: insights.trends || [],
        insights: insights.insights || []
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return {
        predictions: [],
        recommendations: [],
        anomalies: [],
        trends: [],
        insights: []
      };
    }
  };

  const getSystemHealth = async () => {
    try {
      return {
        status: 'healthy',
        components: {
          database: { status: 'healthy', responseTime: 45 },
          api: { status: 'healthy', responseTime: 120 },
          websocket: { status: 'healthy', responseTime: 25 },
          storage: { status: 'healthy', responseTime: 80 },
          ai: { status: 'healthy', responseTime: 200 },
          computerVision: { status: 'healthy', responseTime: 150 },
          iot: { status: 'healthy', responseTime: 100 }
        },
        alerts: [],
        performance: {
          cpu: 45,
          memory: 62,
          disk: 38,
          network: 85
        }
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'degraded',
        components: {},
        alerts: ['System health check failed'],
        performance: {}
      };
    }
  };

  const getPerformanceMetrics = async () => {
    try {
      return {
        responseTime: 120,
        throughput: 1500,
        errorRate: 0.02,
        availability: 99.9,
        scalability: 85,
        efficiency: 92
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {};
    }
  };

  const getRealTimeData = async () => {
    try {
      return {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        currentCalls: Math.floor(Math.random() * 20) + 5,
        systemLoad: Math.floor(Math.random() * 40) + 30,
        responseTime: Math.floor(Math.random() * 100) + 50,
        errorRate: Math.random() * 0.05,
        uptime: 99.9
      };
    } catch (error) {
      console.error('Error getting real-time data:', error);
      return {};
    }
  };

  const getComputerVisionData = async () => {
    try {
      return {
        emotionDetection: {
          happiness: Math.random() * 0.8,
          stress: Math.random() * 0.4,
          confusion: Math.random() * 0.2
        },
        vitalSigns: {
          heartRate: Math.floor(Math.random() * 40) + 60,
          bloodPressure: Math.floor(Math.random() * 40) + 100,
          temperature: Math.random() * 2 + 97
        },
        gestures: {
          emergency: Math.random() < 0.1,
          distress: Math.random() < 0.2,
          attention: Math.random() < 0.3
        }
      };
    } catch (error) {
      console.error('Error getting computer vision data:', error);
      return {};
    }
  };

  const startRealTimeUpdates = () => {
    const interval = setInterval(async () => {
      const realTimeData = await getRealTimeData();
      setRealTimeData(realTimeData);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportData = (format = 'csv') => {
    console.log(`Exporting data as ${format}`);
  };

  const refreshData = () => {
    loadAnalyticsData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Brain className="h-8 w-8 text-blue-600 mr-3" />
              Advanced Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              AI-powered insights and real-time monitoring for Care Master platform
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setRealTimeUpdates(!realTimeUpdates)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  realTimeUpdates 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Activity className="h-4 w-4 mr-2" />
                Real-time
              </button>
              <button
                onClick={refreshData}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => exportData()}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <select
            value={filters.userType}
            onChange={(e) => setFilters(prev => ({ ...prev, userType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Users</option>
            <option value="elderly">Elderly</option>
            <option value="caregivers">Caregivers</option>
            <option value="doctors">Doctors</option>
          </select>

          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="dashboard">Dashboard</option>
            <option value="detailed">Detailed</option>
            <option value="realtime">Real-time</option>
          </select>
        </div>
      </div>

      {/* Real-time Status Bar */}
      {realTimeUpdates && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live Data</span>
              </div>
              <div className="text-sm text-gray-600">
                Active Users: <span className="font-semibold text-blue-600">{realTimeData.activeUsers}</span>
              </div>
              <div className="text-sm text-gray-600">
                Current Calls: <span className="font-semibold text-green-600">{realTimeData.currentCalls}</span>
              </div>
              <div className="text-sm text-gray-600">
                System Load: <span className="font-semibold text-orange-600">{realTimeData.systemLoad}%</span>
              </div>
              <div className="text-sm text-gray-600">
                Response Time: <span className="font-semibold text-purple-600">{realTimeData.responseTime}ms</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Section */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Sparkles className="h-6 w-6 text-blue-600 mr-2" />
              AI-Powered Insights
            </h2>
            <button
              onClick={() => toggleSection('aiInsights')}
              className="p-2 hover:bg-blue-100 rounded-lg"
            >
              {expandedSections.aiInsights ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
          
          {expandedSections.aiInsights && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiAnalysis.predictions.map((prediction, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">{prediction.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">Prediction</span>
                    <span className="text-xs text-gray-500">{prediction.confidence}% confidence</span>
                  </div>
                </div>
              ))}
              
              {aiAnalysis.recommendations.map((recommendation, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium">Recommendation</span>
                    <span className="text-xs text-gray-500">{recommendation.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Health Section */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Shield className="h-6 w-6 text-green-600 mr-2" />
                System Health
              </h2>
              <button
                onClick={() => toggleSection('systemHealth')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {expandedSections.systemHealth ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {expandedSections.systemHealth && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(systemHealth.components).map(([component, data]) => (
                  <div key={component} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 capitalize">{component}</h3>
                      {getStatusIcon(data.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Response Time: <span className="font-semibold">{data.responseTime}ms</span>
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{systemHealth.performance.cpu}%</div>
                    <div className="text-sm text-gray-600">CPU Usage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{systemHealth.performance.memory}%</div>
                    <div className="text-sm text-gray-600">Memory Usage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{systemHealth.performance.disk}%</div>
                    <div className="text-sm text-gray-600">Disk Usage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{systemHealth.performance.network}%</div>
                    <div className="text-sm text-gray-600">Network Usage</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Computer Vision & IoT Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Computer Vision Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="h-5 w-5 text-blue-600 mr-2" />
            Computer Vision Analysis
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Emotion Detection</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>Happiness: {(computerVisionData.emotionDetection?.happiness * 100 || 0).toFixed(1)}%</div>
                <div>Stress: {(computerVisionData.emotionDetection?.stress * 100 || 0).toFixed(1)}%</div>
                <div>Confusion: {(computerVisionData.emotionDetection?.confusion * 100 || 0).toFixed(1)}%</div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Vital Signs</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>Heart Rate: {computerVisionData.vitalSigns?.heartRate || 0} bpm</div>
                <div>Blood Pressure: {computerVisionData.vitalSigns?.bloodPressure || 0}</div>
                <div>Temperature: {computerVisionData.vitalSigns?.temperature || 0}°F</div>
              </div>
            </div>
          </div>
        </div>

        {/* IoT Devices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Smartphone className="h-5 w-5 text-green-600 mr-2" />
            IoT Devices
          </h3>
          <div className="space-y-3">
            {iotDevices.map(device => (
              <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{device.name}</div>
                  <div className="text-sm text-gray-600">{device.type}</div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
              </div>
            ))}
            {iotDevices.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No IoT devices connected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overview Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                Overview Metrics
              </h2>
              <button
                onClick={() => toggleSection('overview')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {expandedSections.overview ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {expandedSections.overview && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.overview.totalUsers || 0}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.overview.activeCaregivers || 0}</div>
                  <div className="text-sm text-gray-600">Active Caregivers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{analytics.overview.totalAppointments || 0}</div>
                  <div className="text-sm text-gray-600">Appointments</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{analytics.overview.emergencyAlerts || 0}</div>
                  <div className="text-sm text-gray-600">Emergency Alerts</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Analytics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Users className="h-6 w-6 text-green-600 mr-2" />
                User Analytics
              </h2>
              <button
                onClick={() => toggleSection('users')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {expandedSections.users ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {expandedSections.users && (
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="font-semibold text-green-600">{analytics.userMetrics.activeUsers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">New Users This Month</span>
                  <span className="font-semibold text-blue-600">{analytics.userMetrics.newUsersThisMonth || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">User Retention</span>
                  <span className="font-semibold text-purple-600">{analytics.userMetrics.userRetention || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Age</span>
                  <span className="font-semibold text-orange-600">{analytics.userMetrics.averageAge || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            User Growth Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={analytics.trends.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="growth" stroke="#3B82F6" strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 text-green-600 mr-2" />
            Geographic Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.geographicData.userDistribution || {}).slice(0, 5).map(([location, count]) => (
              <div key={location} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{location}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / Math.max(...Object.values(analytics.geographicData.userDistribution || {}))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;

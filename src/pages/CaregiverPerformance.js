import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Star, 
  Target,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Heart,
  FileText,
  Phone,
  MapPin,
  Filter,
  Download
} from 'lucide-react';

const CaregiverPerformance = () => {
  const [performanceData, setPerformanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('overall');

  useEffect(() => {
    // Simulate loading performance data
    const loadPerformanceData = async () => {
      try {
        setTimeout(() => {
          const mockData = {
            overall: {
              rating: 4.8,
              totalPatients: 12,
              totalTasks: 156,
              completedTasks: 148,
              onTimeRate: 94.9,
              patientSatisfaction: 96.2,
              emergencyResponseTime: 8.5
            },
            weekly: {
              tasksCompleted: 32,
              tasksOnTime: 30,
              patientsServed: 8,
              hoursWorked: 40,
              emergencyResponses: 2,
              patientCalls: 15,
              medicationAdministrations: 24,
              therapySessions: 8
            },
            monthly: {
              tasksCompleted: 148,
              tasksOnTime: 141,
              patientsServed: 12,
              hoursWorked: 160,
              emergencyResponses: 8,
              patientCalls: 65,
              medicationAdministrations: 96,
              therapySessions: 32
            },
            trends: {
              tasksCompleted: [28, 32, 30, 35, 32, 38, 32],
              onTimeRate: [92, 94, 91, 96, 94, 98, 95],
              patientSatisfaction: [94, 95, 93, 97, 96, 98, 96]
            },
            achievements: [
              {
                id: 1,
                title: 'Perfect Week',
                description: 'Completed all tasks on time for 5 consecutive days',
                icon: '🏆',
                earnedDate: '2024-01-20',
                category: 'consistency'
              },
              {
                id: 2,
                title: 'Emergency Response Hero',
                description: 'Responded to emergency calls within 5 minutes',
                icon: '🚨',
                earnedDate: '2024-01-18',
                category: 'emergency'
              },
              {
                id: 3,
                title: 'Patient Favorite',
                description: 'Received 5-star ratings from 10+ patients',
                icon: '⭐',
                earnedDate: '2024-01-15',
                category: 'satisfaction'
              }
            ],
            patientFeedback: [
              {
                id: 1,
                patientName: 'Adunni Okafor',
                rating: 5,
                comment: 'Excellent care and always on time. Very professional and caring.',
                date: '2024-01-20',
                category: 'medication'
              },
              {
                id: 2,
                patientName: 'Grace Johnson',
                rating: 5,
                comment: 'The therapy sessions have been very helpful. Thank you for your patience.',
                date: '2024-01-19',
                category: 'therapy'
              },
              {
                id: 3,
                patientName: 'Michael Adebayo',
                rating: 4,
                comment: 'Good care overall. Sometimes a bit rushed but very knowledgeable.',
                date: '2024-01-18',
                category: 'general'
              }
            ]
          };

          setPerformanceData(mockData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading performance data:', error);
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, []);

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceColor = (value, type) => {
    if (type === 'rate') {
      if (value >= 95) return 'text-green-600';
      if (value >= 85) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-900';
  };

  const currentData = performanceData[selectedPeriod] || {};
  const trends = performanceData.trends || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
              <p className="text-gray-600">Track your care performance and achievements</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="week">This Week</option>
              <option value="monthly">This Month</option>
              <option value="overall">Overall</option>
            </select>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-8 dashboard-full-width">
        {/* Overall Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Rating</p>
                <p className={`text-3xl font-bold ${getRatingColor(performanceData.overall?.rating || 0)}`}>
                  {performanceData.overall?.rating || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Based on patient feedback</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {currentData.tasksCompleted || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {currentData.tasksOnTime || 0} on time ({Math.round(((currentData.tasksOnTime || 0) / (currentData.tasksCompleted || 1)) * 100)}%)
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Patients Served</p>
                <p className="text-3xl font-bold text-gray-900">
                  {currentData.patientsServed || performanceData.overall?.totalPatients || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Active patients</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emergency Response</p>
                <p className="text-3xl font-bold text-gray-900">
                  {performanceData.overall?.emergencyResponseTime || 0}m
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Average response time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Performance Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">On-Time Rate</span>
                    <span className={`text-lg font-semibold ${getPerformanceColor(performanceData.overall?.onTimeRate || 0, 'rate')}`}>
                      {performanceData.overall?.onTimeRate || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${performanceData.overall?.onTimeRate || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Patient Satisfaction</span>
                    <span className={`text-lg font-semibold ${getPerformanceColor(performanceData.overall?.patientSatisfaction || 0, 'rate')}`}>
                      {performanceData.overall?.patientSatisfaction || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${performanceData.overall?.patientSatisfaction || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Hours Worked</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {currentData.hoursWorked || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Emergency Responses</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {currentData.emergencyResponses || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Medication Administration</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentData.medicationAdministrations || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Therapy Sessions</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentData.therapySessions || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Patient Calls</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentData.patientCalls || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Emergency Responses</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentData.emergencyResponses || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
              <div className="space-y-3">
                {performanceData.achievements?.map((achievement) => (
                  <div key={achievement.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{achievement.title}</h4>
                      <p className="text-xs text-gray-600">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(achievement.earnedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient Feedback */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Feedback</h3>
              <div className="space-y-3">
                {performanceData.patientFeedback?.map((feedback) => (
                  <div key={feedback.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{feedback.patientName}</h4>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{feedback.comment}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(feedback.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Goals</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">On-Time Rate</span>
                    <span className="text-sm font-semibold text-blue-900">95%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${performanceData.overall?.onTimeRate || 0}%` }}></div>
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Patient Satisfaction</span>
                    <span className="text-sm font-semibold text-green-900">98%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${performanceData.overall?.patientSatisfaction || 0}%` }}></div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Emergency Response</span>
                    <span className="text-sm font-semibold text-purple-900">&lt;5 min</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverPerformance;

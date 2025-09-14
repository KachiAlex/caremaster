// AI Health Monitor Component - Advanced Predictive Analytics
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Droplets, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Target,
  Clock,
  Users,
  Settings,
  X
} from 'lucide-react';
import aiService from '../services/aiService';
import hapticService from '../services/hapticService';

const AIHealthMonitor = ({ isOpen, onClose, patientData }) => {
  const [vitalSigns, setVitalSigns] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(300000); // 5 minutes
  const [autoAnalysis, setAutoAnalysis] = useState(true);

  useEffect(() => {
    if (isOpen && patientData) {
      loadVitalSigns();
      if (autoAnalysis) {
        startContinuousMonitoring();
      }
    }

    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [isOpen, patientData, autoAnalysis]);

  const loadVitalSigns = async () => {
    try {
      // Simulate loading vital signs data
      const mockVitalSigns = generateMockVitalSigns();
      setVitalSigns(mockVitalSigns);
      
      if (autoAnalysis) {
        await analyzeVitalSigns(mockVitalSigns);
      }
    } catch (error) {
      console.error('Failed to load vital signs:', error);
    }
  };

  const generateMockVitalSigns = () => {
    const now = new Date();
    const vitals = [];
    
    // Generate last 24 hours of data
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      
      vitals.push({
        id: `vital_${i}`,
        timestamp,
        type: 'blood_pressure',
        value: `${120 + Math.random() * 20}/${80 + Math.random() * 10}`,
        unit: 'mmHg'
      });
      
      vitals.push({
        id: `vital_${i}_hr`,
        timestamp,
        type: 'heart_rate',
        value: 70 + Math.random() * 20,
        unit: 'bpm'
      });
      
      vitals.push({
        id: `vital_${i}_temp`,
        timestamp,
        type: 'temperature',
        value: 98.6 + (Math.random() - 0.5) * 2,
        unit: '°F'
      });
      
      vitals.push({
        id: `vital_${i}_o2`,
        timestamp,
        type: 'oxygen_saturation',
        value: 95 + Math.random() * 5,
        unit: '%'
      });
    }
    
    return vitals.sort((a, b) => b.timestamp - a.timestamp);
  };

  const analyzeVitalSigns = async (vitalSignsData) => {
    setIsAnalyzing(true);
    hapticService.buttonPress();
    
    try {
      const analysis = await aiService.analyzeVitalSigns(vitalSignsData, patientData);
      setAiAnalysis(analysis);
      
      // Generate predictions based on analysis
      const predictions = await generateHealthPredictions(analysis, vitalSignsData);
      setPredictions(predictions);
      
      // Check for risk alerts
      const alerts = generateRiskAlerts(analysis);
      setRiskAlerts(alerts);
      
      hapticService.success();
    } catch (error) {
      console.error('Vital signs analysis failed:', error);
      hapticService.error();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateHealthPredictions = async (analysis, vitalSignsData) => {
    try {
      // Use AI service for predictions if available
      const predictions = {
        shortTerm: {
          next24Hours: {
            riskLevel: analysis.riskAssessment.overallRisk,
            predictedVitals: predictNextVitals(vitalSignsData),
            recommendations: analysis.recommendations.filter(r => r.timeframe === 'within_hours')
          }
        },
        mediumTerm: {
          nextWeek: {
            riskLevel: analysis.riskAssessment.overallRisk,
            trends: analysis.analysis.trends,
            recommendations: analysis.recommendations.filter(r => r.timeframe === 'within_days')
          }
        },
        longTerm: {
          nextMonth: {
            riskLevel: 'medium', // Default
            healthOutlook: 'stable',
            recommendations: []
          }
        }
      };
      
      return predictions;
    } catch (error) {
      console.error('Prediction generation failed:', error);
      return null;
    }
  };

  const predictNextVitals = (vitalSignsData) => {
    // Simple trend-based prediction
    const recentVitals = vitalSignsData.slice(0, 6); // Last 6 readings
    const predictions = {};
    
    ['blood_pressure', 'heart_rate', 'temperature', 'oxygen_saturation'].forEach(type => {
      const typeVitals = recentVitals.filter(v => v.type === type);
      if (typeVitals.length > 1) {
        const values = typeVitals.map(v => v.value);
        const trend = values[0] - values[values.length - 1];
        const predicted = values[0] + (trend * 0.5); // Extrapolate trend
        
        predictions[type] = {
          predicted: Math.round(predicted * 100) / 100,
          confidence: 0.7,
          trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
        };
      }
    });
    
    return predictions;
  };

  const generateRiskAlerts = (analysis) => {
    const alerts = [];
    
    if (analysis.analysis.overallStatus === 'critical') {
      alerts.push({
        id: 'critical_alert',
        type: 'critical',
        title: 'Critical Health Status',
        message: 'Immediate medical attention required',
        timestamp: new Date(),
        actions: ['Call Emergency Services', 'Contact Doctor', 'Alert Family']
      });
    }
    
    if (analysis.analysis.abnormalReadings.length > 0) {
      alerts.push({
        id: 'abnormal_readings',
        type: 'warning',
        title: 'Abnormal Vital Signs',
        message: `${analysis.analysis.abnormalReadings.length} abnormal readings detected`,
        timestamp: new Date(),
        actions: ['Monitor Closely', 'Contact Doctor']
      });
    }
    
    if (analysis.emergencyIndicators.length > 0) {
      alerts.push({
        id: 'emergency_indicators',
        type: 'alert',
        title: 'Emergency Indicators',
        message: 'Watch for emergency symptoms',
        timestamp: new Date(),
        actions: ['Prepare Emergency Response', 'Alert Caregivers']
      });
    }
    
    return alerts;
  };

  const startContinuousMonitoring = () => {
    const interval = setInterval(async () => {
      await loadVitalSigns();
    }, monitoringInterval);
    
    setMonitoringInterval(interval);
  };

  const stopContinuousMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  };

  const handleEmergencyAlert = () => {
    hapticService.emergency();
    // Trigger emergency response
    console.log('Emergency alert triggered');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default: return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-pink-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Health Monitor</h2>
              <p className="text-sm opacity-90">Advanced predictive health analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Auto Analysis</label>
                <button
                  onClick={() => setAutoAnalysis(!autoAnalysis)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoAnalysis ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoAnalysis ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Monitoring Interval</label>
                <select
                  value={monitoringInterval}
                  onChange={(e) => setMonitoringInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={900000}>15 minutes</option>
                  <option value={1800000}>30 minutes</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Risk Alerts */}
        {riskAlerts.length > 0 && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="space-y-2">
              {riskAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div className="flex items-center space-x-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <h4 className="font-medium text-red-900">{alert.title}</h4>
                      <p className="text-sm text-red-700">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {alert.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={handleEmergencyAlert}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => analyzeVitalSigns(vitalSigns)}
                disabled={isAnalyzing || vitalSigns.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Health Data'}</span>
              </button>
              
              {aiAnalysis && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Analysis complete!</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Patient:</span>
              <span className="font-medium">{patientData?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Analysis Results */}
            {aiAnalysis && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Health Analysis</h3>
                
                {/* Overall Status */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Overall Health Status</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(aiAnalysis.analysis.overallStatus)}`}>
                      {aiAnalysis.analysis.overallStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Risk Level: <span className={`font-medium ${getRiskColor(aiAnalysis.riskAssessment.overallRisk)}`}>
                      {aiAnalysis.riskAssessment.overallRisk}
                    </span>
                  </p>
                </div>

                {/* Abnormal Readings */}
                {aiAnalysis.analysis.abnormalReadings.length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-900 mb-2">Abnormal Readings</h4>
                    <div className="space-y-2">
                      {aiAnalysis.analysis.abnormalReadings.map((reading, index) => (
                        <div key={index} className="text-sm text-yellow-800">
                          <span className="font-medium">{reading.type}:</span> {reading.value} - {reading.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiAnalysis.recommendations.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">AI Recommendations</h4>
                    <div className="space-y-2">
                      {aiAnalysis.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm text-blue-800">
                          <span className="font-medium">{rec.type}:</span> {rec.description}
                          <span className="ml-2 text-blue-600">({rec.priority} priority)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Health Predictions */}
            {predictions && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Health Predictions</h3>
                
                {/* Short-term Predictions */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Next 24 Hours</h4>
                  <div className="space-y-2">
                    <div className="text-sm text-green-800">
                      <span className="font-medium">Risk Level:</span> {predictions.shortTerm.next24Hours.riskLevel}
                    </div>
                    {predictions.shortTerm.next24Hours.predictedVitals && (
                      <div className="text-sm text-green-800">
                        <span className="font-medium">Predicted Vitals:</span>
                        <div className="ml-4 space-y-1">
                          {Object.entries(predictions.shortTerm.next24Hours.predictedVitals).map(([type, data]) => (
                            <div key={type} className="flex items-center space-x-2">
                              <span>{type}:</span>
                              <span>{data.predicted}</span>
                              <TrendingUp className={`w-3 h-3 ${data.trend === 'increasing' ? 'text-red-500' : data.trend === 'decreasing' ? 'text-green-500' : 'text-gray-500'}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medium-term Predictions */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Next Week</h4>
                  <div className="space-y-2">
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Risk Level:</span> {predictions.mediumTerm.nextWeek.riskLevel}
                    </div>
                    {predictions.mediumTerm.nextWeek.trends.length > 0 && (
                      <div className="text-sm text-blue-800">
                        <span className="font-medium">Trends:</span> {predictions.mediumTerm.nextWeek.trends.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Vital Signs */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Vital Signs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['blood_pressure', 'heart_rate', 'temperature', 'oxygen_saturation'].map((type) => {
                const latestVital = vitalSigns.find(v => v.type === type);
                const Icon = type === 'blood_pressure' ? Activity : 
                            type === 'heart_rate' ? Heart : 
                            type === 'temperature' ? Thermometer : Droplets;
                
                return (
                  <div key={type} className="p-4 bg-white border rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Icon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {latestVital ? latestVital.value : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {latestVital ? latestVital.unit : ''}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {latestVital ? formatTime(latestVital.timestamp) : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHealthMonitor;

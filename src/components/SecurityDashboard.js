import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Eye, Lock, Activity, Users, Clock } from 'lucide-react';
import securityMonitoringService from '../services/securityMonitoringService';
import authSecurityService from '../services/authSecurityService';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const SecurityDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [threats, setThreats] = useState([]);
  const [securityStats, setSecurityStats] = useState({
    totalEvents: 0,
    activeThreats: 0,
    resolvedThreats: 0,
    lastActivity: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
    setupAlertCallback();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadSecurityData, 30000);
    
    return () => {
      clearInterval(interval);
      securityMonitoringService.removeAlertCallback(handleNewAlert);
    };
  }, []);

  const loadSecurityData = () => {
    try {
      const activeAlerts = securityMonitoringService.getActiveAlerts();
      const activeThreats = securityMonitoringService.getActiveThreats();
      
      setAlerts(activeAlerts);
      setThreats(activeThreats);
      
      setSecurityStats({
        totalEvents: activeAlerts.length + activeThreats.length,
        activeThreats: activeThreats.length,
        resolvedThreats: 0, // This would come from a real data source
        lastActivity: new Date().toISOString()
      });
      
      setLoading(false);
    } catch (error) {
      logger.error('Failed to load security data', { error: error.message });
      setLoading(false);
    }
  };

  const setupAlertCallback = () => {
    securityMonitoringService.addAlertCallback(handleNewAlert);
  };

  const handleNewAlert = (alert) => {
    setAlerts(prev => [alert, ...prev]);
    toast.warning(`Security Alert: ${alert.message}`, {
      position: 'top-right',
      autoClose: 10000
    });
  };

  const handleDismissAlert = (alertId) => {
    securityMonitoringService.dismissAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast.success('Alert dismissed');
  };

  const handleResolveThreat = (threatId) => {
    securityMonitoringService.resolveThreat(threatId);
    setThreats(prev => prev.filter(threat => threat.id !== threatId));
    toast.success('Threat resolved');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4" />;
      case 'LOW': return <CheckCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Dashboard</h1>
        <p className="text-gray-600">Monitor security events and threats in real-time</p>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{securityStats.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Threats</p>
              <p className="text-2xl font-bold text-gray-900">{securityStats.activeThreats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{securityStats.resolvedThreats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Activity</p>
              <p className="text-sm font-bold text-gray-900">
                {securityStats.lastActivity ? new Date(securityStats.lastActivity).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Security Alerts</h2>
        </div>
        <div className="p-6">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active security alerts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{alert.type}</h3>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                        {alert.actions && alert.actions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Recommended Actions:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {alert.actions.map((action, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {action}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Threats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Security Threats</h2>
        </div>
        <div className="p-6">
          {threats.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">No active security threats</p>
            </div>
          ) : (
            <div className="space-y-4">
              {threats.map((threat) => (
                <div key={threat.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(threat.severity)}`}>
                        {getSeverityIcon(threat.severity)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{threat.type}</h3>
                        <p className="text-sm text-gray-600 mt-1">{threat.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Detected: {new Date(threat.detectedAt).toLocaleString()}
                        </p>
                        {threat.events && threat.events.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Related Events: {threat.events.length}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveThreat(threat.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Features Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Features Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Data Encryption</span>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Audit Logging</span>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Real-time Monitoring</span>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;

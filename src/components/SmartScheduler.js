// Smart Scheduler Component with AI Optimization
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Zap, 
  TrendingUp, 
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Settings,
  Brain
} from 'lucide-react';
import aiService from '../services/aiService';
import hapticService from '../services/hapticService';

const SmartScheduler = ({ isOpen, onClose, onScheduleUpdate }) => {
  const [schedule, setSchedule] = useState([]);
  const [optimizedSchedule, setOptimizedSchedule] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [constraints, setConstraints] = useState({
    workingHours: { start: '08:00', end: '18:00' },
    breakDuration: 15,
    travelBuffer: 30,
    maxAppointments: 8,
    preferredLocations: []
  });
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('day'); // day, week, month
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      loadSchedule();
    }
  }, [isOpen, selectedDate]);

  const loadSchedule = async () => {
    try {
      // Simulate loading schedule data
      const mockSchedule = generateMockSchedule();
      setSchedule(mockSchedule);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
  };

  const generateMockSchedule = () => {
    const appointments = [];
    const today = new Date(selectedDate);
    
    // Generate mock appointments for the selected date
    for (let i = 0; i < 6; i++) {
      const startHour = 9 + i;
      const appointment = {
        id: `apt_${i}`,
        title: `Patient ${i + 1} - ${['Checkup', 'Consultation', 'Follow-up', 'Medication Review'][i % 4]}`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour + 1, 0),
        patient: `Patient ${i + 1}`,
        location: ['Home Visit', 'Clinic', 'Hospital'][i % 3],
        priority: ['high', 'medium', 'low'][i % 3],
        type: ['medical', 'consultation', 'follow-up'][i % 3],
        travelTime: Math.random() * 30 + 10,
        efficiency: Math.random() * 0.4 + 0.6
      };
      appointments.push(appointment);
    }
    
    return appointments;
  };

  const handleOptimizeSchedule = async () => {
    setIsOptimizing(true);
    hapticService.buttonPress();
    
    try {
      const optimization = await aiService.optimizeSchedule(schedule, constraints);
      
      if (optimization) {
        setOptimizedSchedule(optimization.optimizedSchedule);
        setOptimizationResults(optimization);
        hapticService.success();
      }
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      hapticService.error();
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimization = () => {
    if (optimizedSchedule.length > 0) {
      setSchedule(optimizedSchedule);
      onScheduleUpdate?.(optimizedSchedule);
      hapticService.success();
    }
  };

  const revertOptimization = () => {
    setOptimizedSchedule([]);
    setOptimizationResults(null);
    hapticService.buttonPress();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 0.8) return 'text-green-600';
    if (efficiency >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Smart Scheduler</h2>
              <p className="text-sm opacity-90">AI-powered schedule optimization</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Working Hours</label>
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={constraints.workingHours.start}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      workingHours: { ...prev.workingHours, start: e.target.value }
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="self-center text-gray-500">to</span>
                  <input
                    type="time"
                    value={constraints.workingHours.end}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      workingHours: { ...prev.workingHours, end: e.target.value }
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Break Duration (min)</label>
                <input
                  type="number"
                  value={constraints.breakDuration}
                  onChange={(e) => setConstraints(prev => ({
                    ...prev,
                    breakDuration: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Travel Buffer (min)</label>
                <input
                  type="number"
                  value={constraints.travelBuffer}
                  onChange={(e) => setConstraints(prev => ({
                    ...prev,
                    travelBuffer: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Optimization Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleOptimizeSchedule}
                disabled={isOptimizing || schedule.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>{isOptimizing ? 'Optimizing...' : 'Optimize Schedule'}</span>
              </button>
              
              {optimizationResults && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Optimization complete!</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Optimization Results */}
        {optimizationResults && (
          <div className="p-4 bg-green-50 border-b border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-800">Time Saved</div>
                  <div className="text-lg font-semibold text-green-900">
                    {optimizationResults.improvements.timeSaved} min
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-800">Efficiency</div>
                  <div className="text-lg font-semibold text-green-900">
                    +{Math.round(optimizationResults.improvements.efficiency * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-800">Conflicts</div>
                  <div className="text-lg font-semibold text-green-900">
                    -{optimizationResults.improvements.conflicts}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                onClick={applyOptimization}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Apply Optimization
              </button>
              <button
                onClick={revertOptimization}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Revert
              </button>
            </div>
          </div>
        )}

        {/* Schedule Display */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {(optimizedSchedule.length > 0 ? optimizedSchedule : schedule).map((appointment, index) => (
              <div
                key={appointment.id}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  optimizedSchedule.length > 0 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{appointment.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(appointment.priority)}`}>
                        {appointment.priority}
                      </span>
                      {optimizedSchedule.length > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Optimized
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(appointment.start)} - {formatTime(appointment.end)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{appointment.patient}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{appointment.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <TrendingUp className={`w-4 h-4 ${getEfficiencyColor(appointment.efficiency)}`} />
                        <span className={getEfficiencyColor(appointment.efficiency)}>
                          {Math.round(appointment.efficiency * 100)}% efficient
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <div className="text-sm text-gray-500">
                      Travel: {appointment.travelTime}min
                    </div>
                    {optimizedSchedule.length > 0 && appointment.optimized && (
                      <div className="text-xs text-green-600 font-medium">
                        AI Optimized
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {schedule.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
              <p className="text-gray-500">Add appointments to see AI optimization suggestions.</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {optimizationResults?.recommendations && (
          <div className="p-4 bg-blue-50 border-t border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">AI Recommendations:</h4>
            <ul className="space-y-1">
              {optimizationResults.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                  <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartScheduler;

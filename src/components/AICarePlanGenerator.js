// AI Care Plan Generator Component
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Brain, 
  Target, 
  Calendar, 
  Users, 
  Heart, 
  Pill, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';
import aiService from '../services/aiService';
import hapticService from '../services/hapticService';

const AICarePlanGenerator = ({ isOpen, onClose, patientData }) => {
  const [carePlan, setCarePlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [planType, setPlanType] = useState('comprehensive'); // basic, comprehensive, specialized
  const [timeframe, setTimeframe] = useState('30_days'); // 7_days, 30_days, 90_days
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', priority: 'medium', category: 'health' });

  useEffect(() => {
    if (isOpen && patientData) {
      generateCarePlan();
    }
  }, [isOpen, patientData, planType, timeframe]);

  const generateCarePlan = async () => {
    setIsGenerating(true);
    hapticService.buttonPress();
    
    try {
      // Simulate AI-generated care plan
      const mockCarePlan = await generateMockCarePlan();
      setCarePlan(mockCarePlan);
      hapticService.success();
    } catch (error) {
      console.error('Care plan generation failed:', error);
      hapticService.error();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockCarePlan = async () => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      id: `plan_${Date.now()}`,
      patientId: patientData?.id || 'unknown',
      generatedAt: new Date(),
      type: planType,
      timeframe: timeframe,
      overallGoal: 'Maintain optimal health and quality of life',
      riskAssessment: {
        overallRisk: 'medium',
        riskFactors: ['age', 'chronic_conditions', 'medication_complexity'],
        confidence: 0.85
      },
      goals: [
        {
          id: 'goal_1',
          title: 'Medication Adherence',
          description: 'Take all prescribed medications as directed',
          category: 'medication',
          priority: 'high',
          target: '95% adherence rate',
          timeframe: 'ongoing',
          milestones: [
            { id: 'milestone_1', description: 'Set up medication reminders', completed: false, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_2', description: 'Review medication schedule with doctor', completed: false, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_3', description: 'Achieve 90% adherence for 2 weeks', completed: false, dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) }
          ],
          aiRecommendations: [
            'Use pill organizer for better organization',
            'Set phone reminders for each medication',
            'Keep medication list updated and accessible'
          ]
        },
        {
          id: 'goal_2',
          title: 'Vital Signs Monitoring',
          description: 'Regular monitoring of blood pressure, heart rate, and other vital signs',
          category: 'monitoring',
          priority: 'high',
          target: 'Daily monitoring',
          timeframe: 'ongoing',
          milestones: [
            { id: 'milestone_4', description: 'Set up home monitoring equipment', completed: false, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_5', description: 'Establish monitoring routine', completed: false, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_6', description: 'Record 7 days of consistent monitoring', completed: false, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
          ],
          aiRecommendations: [
            'Monitor at the same time each day',
            'Keep a log of readings and symptoms',
            'Share data with healthcare provider weekly'
          ]
        },
        {
          id: 'goal_3',
          title: 'Physical Activity',
          description: 'Maintain regular physical activity appropriate for age and condition',
          category: 'lifestyle',
          priority: 'medium',
          target: '30 minutes daily',
          timeframe: 'ongoing',
          milestones: [
            { id: 'milestone_7', description: 'Consult with doctor about safe exercises', completed: false, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_8', description: 'Start with 10 minutes daily', completed: false, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_9', description: 'Gradually increase to 30 minutes', completed: false, dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) }
          ],
          aiRecommendations: [
            'Start with low-impact activities like walking',
            'Include balance and flexibility exercises',
            'Listen to your body and rest when needed'
          ]
        },
        {
          id: 'goal_4',
          title: 'Nutrition Management',
          description: 'Follow a balanced diet suitable for health conditions',
          category: 'lifestyle',
          priority: 'medium',
          target: 'Balanced meals daily',
          timeframe: 'ongoing',
          milestones: [
            { id: 'milestone_10', description: 'Consult with nutritionist', completed: false, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_11', description: 'Create meal plan for first week', completed: false, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
            { id: 'milestone_12', description: 'Follow meal plan for 2 weeks', completed: false, dueDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000) }
          ],
          aiRecommendations: [
            'Limit sodium intake for blood pressure management',
            'Include plenty of fruits and vegetables',
            'Stay hydrated throughout the day'
          ]
        }
      ],
      dailyTasks: [
        { id: 'task_1', description: 'Take morning medications', time: '08:00', category: 'medication', priority: 'high' },
        { id: 'task_2', description: 'Check blood pressure', time: '09:00', category: 'monitoring', priority: 'high' },
        { id: 'task_3', description: 'Light exercise or walk', time: '10:00', category: 'lifestyle', priority: 'medium' },
        { id: 'task_4', description: 'Take afternoon medications', time: '14:00', category: 'medication', priority: 'high' },
        { id: 'task_5', description: 'Check heart rate', time: '15:00', category: 'monitoring', priority: 'medium' },
        { id: 'task_6', description: 'Take evening medications', time: '20:00', category: 'medication', priority: 'high' }
      ],
      weeklyTasks: [
        { id: 'weekly_1', description: 'Review medication supply', day: 'Monday', category: 'medication', priority: 'medium' },
        { id: 'weekly_2', description: 'Weigh yourself', day: 'Wednesday', category: 'monitoring', priority: 'medium' },
        { id: 'weekly_3', description: 'Call family member', day: 'Friday', category: 'social', priority: 'low' },
        { id: 'weekly_4', description: 'Plan next week meals', day: 'Sunday', category: 'lifestyle', priority: 'medium' }
      ],
      aiInsights: [
        'Based on your health profile, medication adherence is the highest priority',
        'Regular monitoring will help detect any changes early',
        'Gradual lifestyle changes are more sustainable than drastic changes',
        'Family support can significantly improve outcomes'
      ],
      progressTracking: {
        overallProgress: 0,
        goalProgress: {
          'goal_1': 0,
          'goal_2': 0,
          'goal_3': 0,
          'goal_4': 0
        }
      }
    };
  };

  const addGoal = () => {
    if (newGoal.title.trim()) {
      const goal = {
        id: `goal_${Date.now()}`,
        ...newGoal,
        target: 'To be defined',
        timeframe: 'ongoing',
        milestones: [],
        aiRecommendations: []
      };
      
      setCarePlan(prev => ({
        ...prev,
        goals: [...prev.goals, goal]
      }));
      
      setNewGoal({ title: '', description: '', priority: 'medium', category: 'health' });
      hapticService.buttonPress();
    }
  };

  const updateMilestone = (goalId, milestoneId, completed) => {
    setCarePlan(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === goalId 
          ? {
              ...goal,
              milestones: goal.milestones.map(milestone =>
                milestone.id === milestoneId 
                  ? { ...milestone, completed }
                  : milestone
              )
            }
          : goal
      )
    }));
    hapticService.buttonPress();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medication': return <Pill className="w-4 h-4" />;
      case 'monitoring': return <Activity className="w-4 h-4" />;
      case 'lifestyle': return <Heart className="w-4 h-4" />;
      case 'social': return <Users className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const calculateProgress = (goal) => {
    if (goal.milestones.length === 0) return 0;
    const completed = goal.milestones.filter(m => m.completed).length;
    return Math.round((completed / goal.milestones.length) * 100);
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
              <h2 className="text-lg font-semibold">AI Care Plan Generator</h2>
              <p className="text-sm opacity-90">Intelligent personalized care planning</p>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Plan Type</label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basic">Basic Care Plan</option>
                  <option value="comprehensive">Comprehensive Plan</option>
                  <option value="specialized">Specialized Plan</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7_days">7 Days</option>
                  <option value="30_days">30 Days</option>
                  <option value="90_days">90 Days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Generation Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={generateCarePlan}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Brain className="w-4 h-4" />
                <span>{isGenerating ? 'Generating...' : 'Generate Care Plan'}</span>
              </button>
              
              {carePlan && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Care plan ready!</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Patient:</span>
              <span className="font-medium">{patientData?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Care Plan Content */}
        {carePlan && (
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Overview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Care Plan Overview</h3>
              <p className="text-gray-700 mb-3">{carePlan.overallGoal}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Plan Type:</span>
                  <span className="ml-2 font-medium capitalize">{carePlan.type}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Timeframe:</span>
                  <span className="ml-2 font-medium">{carePlan.timeframe.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Risk Level:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(carePlan.riskAssessment.overallRisk)}`}>
                    {carePlan.riskAssessment.overallRisk}
                  </span>
                </div>
              </div>
            </div>

            {/* Goals */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Care Goals</h3>
                <button
                  onClick={() => setEditingGoal('new')}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Goal</span>
                </button>
              </div>

              {/* Add Goal Form */}
              {editingGoal === 'new' && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Goal Title</label>
                      <input
                        type="text"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Improve mobility"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                      <select
                        value={newGoal.category}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="health">Health</option>
                        <option value="medication">Medication</option>
                        <option value="lifestyle">Lifestyle</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="social">Social</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
                      <select
                        value={newGoal.priority}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                      <input
                        type="text"
                        value={newGoal.description}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the goal"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={addGoal}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Goal
                    </button>
                    <button
                      onClick={() => setEditingGoal(null)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Goals List */}
              <div className="space-y-4">
                {carePlan.goals.map((goal) => (
                  <div key={goal.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(goal.category)}
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                        <div className="text-sm text-gray-500">
                          {calculateProgress(goal)}% complete
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Target: {goal.target}</span>
                        <span>Timeframe: {goal.timeframe}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress(goal)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Milestones */}
                    {goal.milestones.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-2">Milestones</h5>
                        <div className="space-y-2">
                          {goal.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={milestone.completed}
                                onChange={(e) => updateMilestone(goal.id, milestone.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                {milestone.description}
                              </span>
                              <span className="text-xs text-gray-500">
                                Due: {milestone.dueDate.toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {goal.aiRecommendations.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">AI Recommendations</h5>
                        <ul className="space-y-1">
                          {goal.aiRecommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                              <Star className="w-3 h-3 mt-1 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Tasks */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Tasks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {carePlan.dailyTasks.map((task) => (
                  <div key={task.id} className="p-3 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(task.category)}
                        <div>
                          <h4 className="font-medium text-gray-900">{task.description}</h4>
                          <p className="text-sm text-gray-600">{task.time}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            {carePlan.aiInsights.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">AI Insights</h4>
                <ul className="space-y-1">
                  {carePlan.aiInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-green-800 flex items-start space-x-2">
                      <TrendingUp className="w-3 h-3 mt-1 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* No Care Plan State */}
        {!carePlan && !isGenerating && (
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate Care Plan</h3>
              <p className="text-gray-600">Click "Generate Care Plan" to create a personalized care plan</p>
            </div>
          </div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Care Plan</h3>
              <p className="text-gray-600">AI is analyzing patient data and creating personalized recommendations...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICarePlanGenerator;

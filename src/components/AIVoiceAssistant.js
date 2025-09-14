// AI Voice Assistant Component
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Brain, 
  MessageCircle, 
  Settings, 
  X, 
  Sparkles,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import aiService from '../services/aiService';
import hapticService from '../services/hapticService';

const AIVoiceAssistant = ({ isOpen, onClose, onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [aiStatus, setAiStatus] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [assistantMode, setAssistantMode] = useState('general'); // general, medical, scheduling, tasks
  const [aiPersonality, setAiPersonality] = useState('professional'); // professional, friendly, caring
  const [responseSpeed, setResponseSpeed] = useState('normal'); // fast, normal, thorough
  
  const conversationRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize AI service
      const status = aiService.getStatus();
      setAiStatus(status);
      
      // Add welcome message
      if (conversation.length === 0) {
        const welcomeMessage = getWelcomeMessage();
        setConversation([welcomeMessage]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const getWelcomeMessage = () => {
    const messages = {
      general: {
        text: "Hello! I'm your AI assistant for ElderX. I can help you with calls, messages, scheduling, patient care, and more. How can I assist you today?",
        suggestions: [
          "Make a call to John Smith",
          "Check my schedule for today",
          "Send a message to Dr. Johnson",
          "Show me my patients"
        ]
      },
      medical: {
        text: "I'm here to help with medical and care-related tasks. I can assist with patient information, medication schedules, vital signs, and care coordination.",
        suggestions: [
          "Check patient John's vitals",
          "Schedule medication reminder",
          "Update care plan for Sarah",
          "Review medical records"
        ]
      },
      scheduling: {
        text: "I can help optimize your schedule and manage appointments efficiently. I'll consider your workload, travel time, and preferences.",
        suggestions: [
          "Optimize today's schedule",
          "Schedule new appointment",
          "Reschedule with Dr. Smith",
          "Check availability"
        ]
      },
      tasks: {
        text: "I'm ready to help manage your tasks and assignments. I can create, assign, and optimize tasks based on workload and priorities.",
        suggestions: [
          "Show my tasks for today",
          "Assign new task to caregiver",
          "Complete medication task",
          "Optimize task assignments"
        ]
      }
    };

    return {
      role: 'assistant',
      text: messages[assistantMode].text,
      suggestions: messages[assistantMode].suggestions,
      timestamp: Date.now(),
      type: 'welcome'
    };
  };

  const handleStartListening = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
      hapticService.buttonPress();
      
      // Add listening indicator
      setConversation(prev => [...prev, {
        role: 'user',
        text: 'Listening...',
        timestamp: Date.now(),
        type: 'listening'
      }]);
    };

    recognitionRef.current.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      
      // Remove listening indicator and add actual user message
      setConversation(prev => {
        const filtered = prev.filter(msg => msg.type !== 'listening');
        return [...filtered, {
          role: 'user',
          text: transcript,
          timestamp: Date.now(),
          type: 'user_input'
        }];
      });

      setIsListening(false);
      setIsProcessing(true);

      // Process with AI
      await processUserInput(transcript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      hapticService.error();
      
      setConversation(prev => {
        const filtered = prev.filter(msg => msg.type !== 'listening');
        return [...filtered, {
          role: 'assistant',
          text: "I'm sorry, I couldn't understand that. Could you please try again?",
          timestamp: Date.now(),
          type: 'error'
        }];
      });
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processUserInput = async (text) => {
    try {
      // Update AI context
      aiService.updateContext('currentPage', window.location.pathname);
      aiService.updateContext('assistantMode', assistantMode);
      
      // Process with AI service
      const response = await aiService.processVoiceCommand(null, text);
      
      setIsProcessing(false);
      
      // Add AI response to conversation
      setConversation(prev => [...prev, {
        role: 'assistant',
        text: response.text,
        actions: response.actions,
        suggestions: response.suggestions,
        confidence: response.confidence,
        timestamp: Date.now(),
        type: 'ai_response'
      }]);

      // Execute actions if any
      if (response.actions && response.actions.length > 0) {
        executeActions(response.actions);
      }

      hapticService.success();
    } catch (error) {
      console.error('AI processing error:', error);
      setIsProcessing(false);
      
      setConversation(prev => [...prev, {
        role: 'assistant',
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
        type: 'error'
      }]);
      
      hapticService.error();
    }
  };

  const executeActions = (actions) => {
    actions.forEach(action => {
      switch (action) {
        case 'navigate_to_calls':
          onCommand?.('navigate', { page: '/service-provider/calls' });
          break;
        case 'navigate_to_messages':
          onCommand?.('navigate', { page: '/service-provider/messages' });
          break;
        case 'navigate_to_schedule':
          onCommand?.('navigate', { page: '/service-provider/schedule' });
          break;
        case 'navigate_to_patients':
          onCommand?.('navigate', { page: '/service-provider/patients' });
          break;
        case 'navigate_to_tasks':
          onCommand?.('navigate', { page: '/service-provider/tasks' });
          break;
        case 'show_help':
          showHelp();
          break;
        case 'trigger_emergency':
          onCommand?.('emergency', {});
          break;
        default:
          console.log('Unknown action:', action);
      }
    });
  };

  const showHelp = () => {
    const helpMessage = {
      role: 'assistant',
      text: "Here are some things I can help you with:",
      suggestions: [
        "Voice Commands: 'Call John', 'Send message to Sarah', 'Schedule appointment'",
        "Navigation: 'Go to patients', 'Show my schedule', 'Open messages'",
        "Care Tasks: 'Complete medication task', 'Assign new task', 'Check patient vitals'",
        "Emergency: 'Emergency alert', 'Call doctor', 'Urgent help needed'"
      ],
      timestamp: Date.now(),
      type: 'help'
    };
    
    setConversation(prev => [...prev, helpMessage]);
  };

  const handleSuggestionClick = (suggestion) => {
    setConversation(prev => [...prev, {
      role: 'user',
      text: suggestion,
      timestamp: Date.now(),
      type: 'user_input'
    }]);
    
    processUserInput(suggestion);
  };

  const handleModeChange = (mode) => {
    setAssistantMode(mode);
    hapticService.buttonPress();
    
    // Update conversation with mode-specific welcome
    const welcomeMessage = getWelcomeMessage();
    setConversation([welcomeMessage]);
  };

  const clearConversation = () => {
    setConversation([]);
    aiService.reset();
    hapticService.buttonPress();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Assistant</h2>
              <p className="text-sm opacity-90">Powered by advanced AI</p>
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

        {/* Mode Selector */}
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-2">
            {[
              { id: 'general', label: 'General', icon: MessageCircle },
              { id: 'medical', label: 'Medical', icon: Target },
              { id: 'scheduling', label: 'Schedule', icon: TrendingUp },
              { id: 'tasks', label: 'Tasks', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  assistantMode === id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">AI Personality</label>
                <select
                  value={aiPersonality}
                  onChange={(e) => setAiPersonality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="caring">Caring</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Response Speed</label>
                <select
                  value={responseSpeed}
                  onChange={(e) => setResponseSpeed(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="thorough">Thorough</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div 
          ref={conversationRef}
          className="flex-1 p-4 space-y-4 max-h-96 overflow-y-auto"
        >
          {conversation.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm">{message.text}</p>
                
                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Confidence indicator */}
                {message.confidence && (
                  <div className="mt-1 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-xs opacity-75">
                      {Math.round(message.confidence * 100)}% confident
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={clearConversation}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear Chat
              </button>
              
              {/* AI Status */}
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className={`w-2 h-2 rounded-full ${
                  aiStatus.initialized ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>AI {aiStatus.initialized ? 'Ready' : 'Loading'}</span>
              </div>
            </div>
            
            {/* Voice Controls */}
            <div className="flex items-center space-x-3">
              {!isListening ? (
                <button
                  onClick={handleStartListening}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Listening</span>
                </button>
              ) : (
                <button
                  onClick={handleStopListening}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Stop Listening</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIVoiceAssistant;


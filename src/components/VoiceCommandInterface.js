// Voice Command Interface Component
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, X } from 'lucide-react';
import voiceCommandService from '../services/voiceCommandService';
import hapticService from '../services/hapticService';

const VoiceCommandInterface = ({ isOpen, onClose, onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [commands, setCommands] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const transcriptRef = useRef(null);

  useEffect(() => {
    setIsSupported(voiceCommandService.isSupported);
    setCommands(voiceCommandService.getCommands());
    
    // Setup event handlers
    voiceCommandService.onListeningStart = () => {
      setIsListening(true);
      hapticService.buttonPress();
    };
    
    voiceCommandService.onListeningEnd = () => {
      setIsListening(false);
    };
    
    voiceCommandService.onError = (error) => {
      console.error('Voice recognition error:', error);
      setIsListening(false);
      hapticService.error();
    };
    
    voiceCommandService.onUnknownCommand = (transcript) => {
      setTranscript(`Unknown command: "${transcript}"`);
      hapticService.warning();
    };

    // Setup command callbacks
    voiceCommandService.onCallCommand = (params) => {
      onCommand?.('call', params);
      hapticService.callConnected();
    };
    
    voiceCommandService.onEndCallCommand = () => {
      onCommand?.('endCall', {});
      hapticService.callEnded();
    };
    
    voiceCommandService.onAnswerCallCommand = () => {
      onCommand?.('answerCall', {});
      hapticService.callConnected();
    };
    
    voiceCommandService.onRejectCallCommand = () => {
      onCommand?.('rejectCall', {});
      hapticService.callRejected();
    };
    
    voiceCommandService.onSendMessageCommand = (params) => {
      onCommand?.('sendMessage', params);
      hapticService.messageSent();
    };
    
    voiceCommandService.onReadMessagesCommand = () => {
      onCommand?.('readMessages', {});
      hapticService.buttonPress();
    };
    
    voiceCommandService.onNavigationCommand = (params) => {
      onCommand?.('navigate', params);
      hapticService.navigation();
    };
    
    voiceCommandService.onBackCommand = () => {
      onCommand?.('back', {});
      hapticService.navigation();
    };
    
    voiceCommandService.onHomeCommand = () => {
      onCommand?.('home', {});
      hapticService.navigation();
    };
    
    voiceCommandService.onCompleteTaskCommand = (params) => {
      onCommand?.('completeTask', params);
      hapticService.taskComplete();
    };
    
    voiceCommandService.onAssignTaskCommand = (params) => {
      onCommand?.('assignTask', params);
      hapticService.taskAssigned();
    };
    
    voiceCommandService.onEmergencyCommand = () => {
      onCommand?.('emergency', {});
      hapticService.emergency();
    };
    
    voiceCommandService.onMedicationCommand = (params) => {
      onCommand?.('medication', params);
      hapticService.alert();
    };
    
    voiceCommandService.onVitalSignsCommand = () => {
      onCommand?.('vitalSigns', {});
      hapticService.alert();
    };
    
    voiceCommandService.onHelpCommand = () => {
      onCommand?.('help', {});
      hapticService.buttonPress();
    };

    return () => {
      // Cleanup
      voiceCommandService.onListeningStart = null;
      voiceCommandService.onListeningEnd = null;
      voiceCommandService.onError = null;
      voiceCommandService.onUnknownCommand = null;
    };
  }, [onCommand]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleStartListening = () => {
    if (voiceCommandService.startListening()) {
      setTranscript('');
    }
  };

  const handleStopListening = () => {
    voiceCommandService.stopListening();
  };

  const handleToggleListening = () => {
    if (isListening) {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

  const handleContinuousModeChange = (enabled) => {
    setContinuousMode(enabled);
    voiceCommandService.setContinuousMode(enabled);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    voiceCommandService.setLanguage(newLanguage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Voice Commands</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors ${
              isListening 
                ? 'bg-red-100 text-red-600' 
                : 'bg-blue-100 text-blue-600'
            }`}>
              {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
            </div>
            <p className="text-sm text-gray-600">
              {isListening ? 'Listening...' : 'Tap to start voice commands'}
            </p>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Transcript:</div>
              <div 
                ref={transcriptRef}
                className="text-sm text-gray-900 max-h-20 overflow-y-auto"
              >
                {transcript}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleToggleListening}
              disabled={!isSupported}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Continuous Mode</label>
                <button
                  onClick={() => handleContinuousModeChange(!continuousMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    continuousMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      continuousMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Language</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </select>
              </div>
            </div>
          )}

          {/* Commands List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Available Commands:</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {commands.slice(0, 10).map((command, index) => (
                <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-medium">{command.name}</div>
                  <div className="text-gray-500">{command.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Status */}
          {!isSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Voice commands are not supported on this device or browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandInterface;

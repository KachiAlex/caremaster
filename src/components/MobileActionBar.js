// Mobile Action Bar Component
import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Hand, 
  Volume2, 
  VolumeX, 
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';
import hapticService from '../services/hapticService';

const MobileActionBar = ({ 
  onVoiceCommand, 
  onGestureControl, 
  onSettings,
  isOnline,
  isVoiceEnabled = true,
  isGestureEnabled = true,
  isHapticEnabled = true
}) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isGestureActive, setIsGestureActive] = useState(false);

  const handleVoiceToggle = () => {
    setIsVoiceActive(!isVoiceActive);
    if (isHapticEnabled) {
      hapticService.buttonPress();
    }
    onVoiceCommand?.(!isVoiceActive);
  };

  const handleGestureToggle = () => {
    setIsGestureActive(!isGestureActive);
    if (isHapticEnabled) {
      hapticService.buttonPress();
    }
    onGestureControl?.(!isGestureActive);
  };

  const handleSettings = () => {
    if (isHapticEnabled) {
      hapticService.buttonPress();
    }
    onSettings?.();
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-white rounded-full shadow-lg border border-gray-200 p-2">
        <div className="flex items-center space-x-2">
          {/* Voice Command Button */}
          {isVoiceEnabled && (
            <button
              onClick={handleVoiceToggle}
              className={`p-3 rounded-full transition-all duration-200 ${
                isVoiceActive
                  ? 'bg-blue-100 text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title={isVoiceActive ? 'Stop voice commands' : 'Start voice commands'}
            >
              {isVoiceActive ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Gesture Control Button */}
          {isGestureEnabled && (
            <button
              onClick={handleGestureToggle}
              className={`p-3 rounded-full transition-all duration-200 ${
                isGestureActive
                  ? 'bg-green-100 text-green-600 shadow-md'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
              title={isGestureActive ? 'Disable gestures' : 'Enable gestures'}
            >
              <Hand className="w-5 h-5" />
            </button>
          )}

          {/* Connection Status */}
          <div className={`p-3 rounded-full ${
            isOnline 
              ? 'text-green-600 bg-green-50' 
              : 'text-red-600 bg-red-50'
          }`} title={isOnline ? 'Online' : 'Offline'}>
            {isOnline ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={handleSettings}
            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-all duration-200"
            title="Mobile settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileActionBar;

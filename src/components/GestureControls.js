// Gesture Controls Component
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Settings,
  X,
  Hand
} from 'lucide-react';
import gestureService from '../services/gestureService';
import hapticService from '../services/hapticService';

const GestureControls = ({ isOpen, onClose, onGesture }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [gestures, setGestures] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeGestures, setActiveGestures] = useState(new Set());
  const [thresholds, setThresholds] = useState({
    swipe: { minDistance: 50, maxTime: 500, maxAngle: 30 },
    pinch: { minScale: 0.5, maxScale: 3.0 },
    longPress: { duration: 500 },
    doubleTap: { maxTime: 300 }
  });

  useEffect(() => {
    setIsSupported(gestureService.isSupported);
    
    if (gestureService.isSupported) {
      const availableGestures = [
        { name: 'swipe-left', icon: ArrowLeft, description: 'Swipe left to go back' },
        { name: 'swipe-right', icon: ArrowRight, description: 'Swipe right to go forward' },
        { name: 'swipe-up', icon: ArrowUp, description: 'Swipe up to scroll up' },
        { name: 'swipe-down', icon: ArrowDown, description: 'Swipe down to scroll down' },
        { name: 'pinch-in', icon: ZoomOut, description: 'Pinch in to zoom out' },
        { name: 'pinch-out', icon: ZoomIn, description: 'Pinch out to zoom in' },
        { name: 'long-press', icon: Hand, description: 'Long press for context menu' },
        { name: 'double-tap', icon: RotateCcw, description: 'Double tap to refresh' }
      ];
      setGestures(availableGestures);
      
      // Setup gesture event handlers
      gestureService.onSwipeLeft = (data) => {
        hapticService.navigation();
        onGesture?.('swipe-left', data);
      };
      
      gestureService.onSwipeRight = (data) => {
        hapticService.navigation();
        onGesture?.('swipe-right', data);
      };
      
      gestureService.onSwipeUp = (data) => {
        hapticService.buttonPress();
        onGesture?.('swipe-up', data);
      };
      
      gestureService.onSwipeDown = (data) => {
        hapticService.buttonPress();
        onGesture?.('swipe-down', data);
      };
      
      gestureService.onPinchIn = (data) => {
        hapticService.buttonPress();
        onGesture?.('pinch-in', data);
      };
      
      gestureService.onPinchOut = (data) => {
        hapticService.buttonPress();
        onGesture?.('pinch-out', data);
      };
      
      gestureService.onLongPress = (data) => {
        hapticService.alert();
        onGesture?.('long-press', data);
      };
      
      gestureService.onDoubleTap = (data) => {
        hapticService.buttonPress();
        onGesture?.('double-tap', data);
      };
    }

    return () => {
      // Cleanup
      gestureService.onSwipeLeft = null;
      gestureService.onSwipeRight = null;
      gestureService.onSwipeUp = null;
      gestureService.onSwipeDown = null;
      gestureService.onPinchIn = null;
      gestureService.onPinchOut = null;
      gestureService.onLongPress = null;
      gestureService.onDoubleTap = null;
    };
  }, [onGesture]);

  const handleToggleGesture = (gestureName) => {
    const newActiveGestures = new Set(activeGestures);
    
    if (newActiveGestures.has(gestureName)) {
      newActiveGestures.delete(gestureName);
      gestureService.disableGesture(gestureName);
    } else {
      newActiveGestures.add(gestureName);
      gestureService.enableGesture(gestureName);
    }
    
    setActiveGestures(newActiveGestures);
    hapticService.buttonPress();
  };

  const handleThresholdChange = (type, field, value) => {
    const newThresholds = { ...thresholds };
    newThresholds[type] = { ...newThresholds[type], [field]: Number(value) };
    setThresholds(newThresholds);
    gestureService.setThreshold(type, { [field]: Number(value) });
  };

  const testGesture = (gestureName) => {
    hapticService.buttonPress();
    onGesture?.(gestureName, { test: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Gesture Controls</h2>
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
            <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
              isSupported ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <Hand className="w-8 h-8" />
            </div>
            <p className="text-sm text-gray-600">
              {isSupported ? 'Touch gestures enabled' : 'Touch gestures not supported'}
            </p>
          </div>

          {/* Gestures List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Available Gestures:</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gestures.map((gesture, index) => {
                const Icon = gesture.icon;
                const isActive = activeGestures.has(gesture.name);
                
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isActive 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {gesture.name.replace('-', ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {gesture.description}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testGesture(gesture.name)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Test gesture"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => handleToggleGesture(gesture.name)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isActive ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Gesture Sensitivity:</h3>
              
              {/* Swipe Settings */}
              <div className="space-y-2">
                <label className="text-xs text-gray-600">Swipe Distance (pixels)</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={thresholds.swipe.minDistance}
                  onChange={(e) => handleThresholdChange('swipe', 'minDistance', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 text-center">
                  {thresholds.swipe.minDistance}px
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-600">Swipe Time (ms)</label>
                <input
                  type="range"
                  min="200"
                  max="1000"
                  value={thresholds.swipe.maxTime}
                  onChange={(e) => handleThresholdChange('swipe', 'maxTime', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 text-center">
                  {thresholds.swipe.maxTime}ms
                </div>
              </div>
              
              {/* Long Press Settings */}
              <div className="space-y-2">
                <label className="text-xs text-gray-600">Long Press Duration (ms)</label>
                <input
                  type="range"
                  min="300"
                  max="1000"
                  value={thresholds.longPress.duration}
                  onChange={(e) => handleThresholdChange('longPress', 'duration', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 text-center">
                  {thresholds.longPress.duration}ms
                </div>
              </div>
            </div>
          )}

          {/* Support Status */}
          {!isSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Touch gestures are not supported on this device. This feature requires a touch screen.
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Swipe left/right to navigate</li>
              <li>• Swipe up/down to scroll</li>
              <li>• Pinch to zoom in/out</li>
              <li>• Long press for context menu</li>
              <li>• Double tap to refresh</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureControls;
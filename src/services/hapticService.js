// Haptic Feedback Service for ElderX
class HapticService {
  constructor() {
    this.isSupported = 'vibrate' in navigator;
    this.isHapticSupported = 'vibrate' in navigator || 
                            ('navigator' in window && 'vibrate' in navigator);
    this.patterns = {
      // Call patterns
      incomingCall: [200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100],
      callConnected: [100, 50, 100],
      callEnded: [200, 100, 200, 100, 200],
      callRejected: [300, 100, 300],
      
      // Message patterns
      newMessage: [100, 50, 100],
      messageSent: [50],
      
      // Navigation patterns
      buttonPress: [50],
      navigation: [25],
      success: [100, 50, 100],
      error: [200, 100, 200, 100, 200],
      warning: [150, 100, 150, 100, 150],
      
      // Task patterns
      taskComplete: [100, 50, 100, 50, 100],
      taskAssigned: [75, 25, 75],
      
      // Medical patterns
      alert: [300, 200, 300, 200, 300],
      reminder: [100, 100, 100],
      emergency: [500, 250, 500, 250, 500, 250, 500]
    };
    
    this.init();
  }

  init() {
    if (this.isSupported) {
      console.log('Haptic feedback service initialized');
    } else {
      console.log('Haptic feedback not supported on this device');
    }
  }

  // Vibrate with pattern
  vibrate(pattern) {
    if (!this.isSupported) {
      console.log('Vibration not supported');
      return false;
    }

    try {
      if (typeof pattern === 'string' && this.patterns[pattern]) {
        navigator.vibrate(this.patterns[pattern]);
      } else if (Array.isArray(pattern)) {
        navigator.vibrate(pattern);
      } else if (typeof pattern === 'number') {
        navigator.vibrate(pattern);
      }
      
      return true;
    } catch (error) {
      console.error('Vibration failed:', error);
      return false;
    }
  }

  // Call-related haptic feedback
  incomingCall() {
    return this.vibrate('incomingCall');
  }

  callConnected() {
    return this.vibrate('callConnected');
  }

  callEnded() {
    return this.vibrate('callEnded');
  }

  callRejected() {
    return this.vibrate('callRejected');
  }

  // Message-related haptic feedback
  newMessage() {
    return this.vibrate('newMessage');
  }

  messageSent() {
    return this.vibrate('messageSent');
  }

  // Navigation haptic feedback
  buttonPress() {
    return this.vibrate('buttonPress');
  }

  navigation() {
    return this.vibrate('navigation');
  }

  // Status haptic feedback
  success() {
    return this.vibrate('success');
  }

  error() {
    return this.vibrate('error');
  }

  warning() {
    return this.vibrate('warning');
  }

  // Task-related haptic feedback
  taskComplete() {
    return this.vibrate('taskComplete');
  }

  taskAssigned() {
    return this.vibrate('taskAssigned');
  }

  // Medical alert haptic feedback
  alert() {
    return this.vibrate('alert');
  }

  reminder() {
    return this.vibrate('reminder');
  }

  emergency() {
    return this.vibrate('emergency');
  }

  // Custom pattern
  custom(pattern) {
    return this.vibrate(pattern);
  }

  // Stop vibration
  stop() {
    if (this.isSupported) {
      navigator.vibrate(0);
    }
  }

  // Check if haptic feedback is supported
  isHapticSupported() {
    return this.isSupported;
  }

  // Get available patterns
  getPatterns() {
    return Object.keys(this.patterns);
  }

  // Add custom pattern
  addPattern(name, pattern) {
    if (Array.isArray(pattern) && pattern.length > 0) {
      this.patterns[name] = pattern;
      return true;
    }
    return false;
  }

  // Remove custom pattern
  removePattern(name) {
    if (this.patterns[name] && !this.isBuiltInPattern(name)) {
      delete this.patterns[name];
      return true;
    }
    return false;
  }

  // Check if pattern is built-in
  isBuiltInPattern(name) {
    const builtInPatterns = [
      'incomingCall', 'callConnected', 'callEnded', 'callRejected',
      'newMessage', 'messageSent',
      'buttonPress', 'navigation',
      'success', 'error', 'warning',
      'taskComplete', 'taskAssigned',
      'alert', 'reminder', 'emergency'
    ];
    return builtInPatterns.includes(name);
  }

  // Get pattern by name
  getPattern(name) {
    return this.patterns[name] || null;
  }

  // Test haptic feedback
  test() {
    console.log('Testing haptic feedback...');
    this.buttonPress();
    
    setTimeout(() => {
      this.success();
    }, 500);
    
    setTimeout(() => {
      this.error();
    }, 1000);
  }

  // Create haptic button decorator
  createHapticButton(button, pattern = 'buttonPress') {
    if (!button || !this.isSupported) {
      return button;
    }

    const originalOnClick = button.onClick;
    
    button.onClick = (event) => {
      this.vibrate(pattern);
      if (originalOnClick) {
        originalOnClick(event);
      }
    };

    return button;
  }

  // Add haptic feedback to DOM element
  addHapticToElement(element, pattern = 'buttonPress') {
    if (!element || !this.isSupported) {
      return element;
    }

    const addHaptic = () => {
      this.vibrate(pattern);
    };

    // Add touch events for mobile
    element.addEventListener('touchstart', addHaptic, { passive: true });
    
    // Add click events for desktop (if supported)
    element.addEventListener('click', addHaptic);

    return element;
  }

  // Remove haptic feedback from DOM element
  removeHapticFromElement(element) {
    if (!element) {
      return;
    }

    const removeHaptic = () => {
      this.stop();
    };

    element.removeEventListener('touchstart', removeHaptic);
    element.removeEventListener('click', removeHaptic);
  }

  // Haptic feedback for form interactions
  formFeedback(type, element) {
    switch (type) {
      case 'focus':
        this.vibrate(25);
        break;
      case 'blur':
        this.vibrate(15);
        break;
      case 'submit':
        this.success();
        break;
      case 'error':
        this.error();
        break;
      case 'validation':
        this.warning();
        break;
      default:
        this.buttonPress();
    }
  }

  // Context-aware haptic feedback
  contextualFeedback(context, action) {
    const feedbackMap = {
      'call': {
        'start': () => this.callConnected(),
        'end': () => this.callEnded(),
        'reject': () => this.callRejected(),
        'incoming': () => this.incomingCall()
      },
      'message': {
        'send': () => this.messageSent(),
        'receive': () => this.newMessage()
      },
      'navigation': {
        'back': () => this.navigation(),
        'forward': () => this.navigation(),
        'menu': () => this.buttonPress()
      },
      'task': {
        'complete': () => this.taskComplete(),
        'assign': () => this.taskAssigned()
      },
      'medical': {
        'alert': () => this.alert(),
        'reminder': () => this.reminder(),
        'emergency': () => this.emergency()
      }
    };

    if (feedbackMap[context] && feedbackMap[context][action]) {
      return feedbackMap[context][action]();
    }

    return this.buttonPress();
  }

  // Get haptic feedback status
  getStatus() {
    return {
      supported: this.isSupported,
      patterns: Object.keys(this.patterns).length,
      customPatterns: Object.keys(this.patterns).filter(
        pattern => !this.isBuiltInPattern(pattern)
      ).length
    };
  }
}

// Create singleton instance
const hapticService = new HapticService();

export default hapticService;

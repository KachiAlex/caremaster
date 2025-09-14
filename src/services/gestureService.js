// Gesture Service for ElderX Mobile Interface
class GestureService {
  constructor() {
    this.isSupported = 'ontouchstart' in window;
    this.gestures = new Map();
    this.activeGestures = new Map();
    this.thresholds = {
      swipe: {
        minDistance: 50,
        maxTime: 500,
        maxAngle: 30
      },
      pinch: {
        minScale: 0.5,
        maxScale: 3.0
      },
      longPress: {
        duration: 500
      },
      doubleTap: {
        maxTime: 300
      }
    };
    
    this.init();
  }

  init() {
    if (this.isSupported) {
      this.setupEventListeners();
      this.setupDefaultGestures();
      console.log('Gesture service initialized');
    } else {
      console.log('Touch gestures not supported');
    }
  }

  setupEventListeners() {
    // Add event listeners to document
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  setupDefaultGestures() {
    // Swipe gestures
    this.addGesture('swipe-left', {
      type: 'swipe',
      direction: 'left',
      callback: (data) => this.onSwipeLeft?.(data)
    });

    this.addGesture('swipe-right', {
      type: 'swipe',
      direction: 'right',
      callback: (data) => this.onSwipeRight?.(data)
    });

    this.addGesture('swipe-up', {
      type: 'swipe',
      direction: 'up',
      callback: (data) => this.onSwipeUp?.(data)
    });

    this.addGesture('swipe-down', {
      type: 'swipe',
      direction: 'down',
      callback: (data) => this.onSwipeDown?.(data)
    });

    // Pinch gestures
    this.addGesture('pinch-in', {
      type: 'pinch',
      direction: 'in',
      callback: (data) => this.onPinchIn?.(data)
    });

    this.addGesture('pinch-out', {
      type: 'pinch',
      direction: 'out',
      callback: (data) => this.onPinchOut?.(data)
    });

    // Long press
    this.addGesture('long-press', {
      type: 'longPress',
      callback: (data) => this.onLongPress?.(data)
    });

    // Double tap
    this.addGesture('double-tap', {
      type: 'doubleTap',
      callback: (data) => this.onDoubleTap?.(data)
    });
  }

  addGesture(name, config) {
    this.gestures.set(name, {
      ...config,
      name,
      active: false,
      startTime: 0,
      startPosition: null,
      startDistance: 0,
      lastTapTime: 0
    });
  }

  removeGesture(name) {
    return this.gestures.delete(name);
  }

  handleTouchStart(event) {
    const touch = event.touches[0];
    const time = Date.now();
    
    // Initialize gesture tracking
    for (const [name, gesture] of this.gestures) {
      if (gesture.type === 'longPress') {
        gesture.active = true;
        gesture.startTime = time;
        gesture.startPosition = { x: touch.clientX, y: touch.clientY };
        
        // Set timeout for long press
        gesture.timeout = setTimeout(() => {
          if (gesture.active) {
            this.triggerGesture(name, {
              position: gesture.startPosition,
              duration: Date.now() - gesture.startTime
            });
          }
        }, this.thresholds.longPress.duration);
      } else if (gesture.type === 'doubleTap') {
        const timeSinceLastTap = time - gesture.lastTapTime;
        if (timeSinceLastTap < this.thresholds.doubleTap.maxTime) {
          this.triggerGesture(name, {
            position: { x: touch.clientX, y: touch.clientY },
            timeSinceLastTap
          });
        }
        gesture.lastTapTime = time;
      } else if (gesture.type === 'swipe') {
        gesture.active = true;
        gesture.startTime = time;
        gesture.startPosition = { x: touch.clientX, y: touch.clientY };
      } else if (gesture.type === 'pinch') {
        if (event.touches.length === 2) {
          gesture.active = true;
          gesture.startTime = time;
          gesture.startDistance = this.getDistance(
            { x: event.touches[0].clientX, y: event.touches[0].clientY },
            { x: event.touches[1].clientX, y: event.touches[1].clientY }
          );
        }
      }
    }
  }

  handleTouchMove(event) {
    const touch = event.touches[0];
    const time = Date.now();
    
    for (const [name, gesture] of this.gestures) {
      if (!gesture.active) continue;
      
      if (gesture.type === 'longPress') {
        // Check if moved too far from start position
        const distance = this.getDistance(gesture.startPosition, { x: touch.clientX, y: touch.clientY });
        if (distance > 10) {
          gesture.active = false;
          if (gesture.timeout) {
            clearTimeout(gesture.timeout);
          }
        }
      } else if (gesture.type === 'swipe') {
        const distance = this.getDistance(gesture.startPosition, { x: touch.clientX, y: touch.clientY });
        const angle = this.getAngle(gesture.startPosition, { x: touch.clientX, y: touch.clientY });
        
        // Check if gesture meets swipe criteria
        if (distance > this.thresholds.swipe.minDistance && 
            time - gesture.startTime < this.thresholds.swipe.maxTime) {
          
          const direction = this.getSwipeDirection(angle);
          if (direction === gesture.direction) {
            this.triggerGesture(name, {
              startPosition: gesture.startPosition,
              endPosition: { x: touch.clientX, y: touch.clientY },
              distance,
              angle,
              duration: time - gesture.startTime
            });
            gesture.active = false;
          }
        }
      } else if (gesture.type === 'pinch') {
        if (event.touches.length === 2) {
          const currentDistance = this.getDistance(
            { x: event.touches[0].clientX, y: event.touches[0].clientY },
            { x: event.touches[1].clientX, y: event.touches[1].clientY }
          );
          
          const scale = currentDistance / gesture.startDistance;
          
          if ((gesture.direction === 'out' && scale > 1.1) || 
              (gesture.direction === 'in' && scale < 0.9)) {
            this.triggerGesture(name, {
              startDistance: gesture.startDistance,
              currentDistance,
              scale,
              duration: time - gesture.startTime
            });
            gesture.active = false;
          }
        }
      }
    }
  }

  handleTouchEnd(event) {
    const time = Date.now();
    
    for (const [name, gesture] of this.gestures) {
      if (!gesture.active) continue;
      
      if (gesture.type === 'longPress') {
        gesture.active = false;
        if (gesture.timeout) {
          clearTimeout(gesture.timeout);
        }
      } else if (gesture.type === 'swipe') {
        gesture.active = false;
      } else if (gesture.type === 'pinch') {
        gesture.active = false;
      }
    }
  }

  handleTouchCancel(event) {
    // Reset all active gestures
    for (const [name, gesture] of this.gestures) {
      gesture.active = false;
      if (gesture.timeout) {
        clearTimeout(gesture.timeout);
      }
    }
  }

  triggerGesture(name, data) {
    const gesture = this.gestures.get(name);
    if (gesture && gesture.callback) {
      console.log('Triggering gesture:', name, data);
      gesture.callback(data);
    }
  }

  getDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getAngle(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  getSwipeDirection(angle) {
    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= 135 || angle < -135) return 'left';
    if (angle >= -135 && angle < -45) return 'up';
    return null;
  }

  // Add gesture to specific element
  addGestureToElement(element, gestureName, config) {
    if (!element || !this.isSupported) {
      return element;
    }

    const gesture = this.gestures.get(gestureName);
    if (!gesture) {
      console.error('Gesture not found:', gestureName);
      return element;
    }

    // Create element-specific gesture
    const elementGesture = {
      ...gesture,
      element,
      callback: config.callback || gesture.callback
    };

    // Add element-specific event listeners
    element.addEventListener('touchstart', (e) => {
      this.handleElementTouchStart(e, elementGesture);
    }, { passive: false });

    element.addEventListener('touchmove', (e) => {
      this.handleElementTouchMove(e, elementGesture);
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
      this.handleElementTouchEnd(e, elementGesture);
    }, { passive: false });

    return element;
  }

  handleElementTouchStart(event, gesture) {
    if (event.target !== gesture.element && !gesture.element.contains(event.target)) {
      return;
    }

    this.handleTouchStart(event);
  }

  handleElementTouchMove(event, gesture) {
    if (event.target !== gesture.element && !gesture.element.contains(event.target)) {
      return;
    }

    this.handleTouchMove(event);
  }

  handleElementTouchEnd(event, gesture) {
    if (event.target !== gesture.element && !gesture.element.contains(event.target)) {
      return;
    }

    this.handleTouchEnd(event);
  }

  // Set gesture thresholds
  setThreshold(type, value) {
    if (this.thresholds[type]) {
      this.thresholds[type] = { ...this.thresholds[type], ...value };
    }
  }

  // Get gesture status
  getStatus() {
    return {
      supported: this.isSupported,
      gestures: this.gestures.size,
      thresholds: this.thresholds
    };
  }

  // Enable/disable gestures
  enableGesture(name) {
    const gesture = this.gestures.get(name);
    if (gesture) {
      gesture.enabled = true;
    }
  }

  disableGesture(name) {
    const gesture = this.gestures.get(name);
    if (gesture) {
      gesture.enabled = false;
    }
  }

  // Test gestures
  test() {
    if (!this.isSupported) {
      console.log('Touch gestures not supported');
      return;
    }

    console.log('Testing gestures...');
    console.log('Available gestures:', Array.from(this.gestures.keys()));
  }

  // Event handlers
  onSwipeLeft = null;
  onSwipeRight = null;
  onSwipeUp = null;
  onSwipeDown = null;
  onPinchIn = null;
  onPinchOut = null;
  onLongPress = null;
  onDoubleTap = null;
}

// Create singleton instance
const gestureService = new GestureService();

export default gestureService;

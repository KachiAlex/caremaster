// Voice Command Service for ElderX
class VoiceCommandService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.commands = new Map();
    this.continuousMode = false;
    this.language = 'en-US';
    this.grammars = null;
    
    this.init();
  }

  init() {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;
      this.setupRecognition();
      this.setupDefaultCommands();
      console.log('Voice command service initialized');
    } else {
      console.log('Speech recognition not supported');
    }
  }

  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = this.continuousMode;
    this.recognition.interimResults = false;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Voice recognition started');
      this.onListeningStart?.();
    };

    this.recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.toLowerCase().trim();
      const confidence = result[0].confidence;
      
      console.log('Voice command:', transcript, 'Confidence:', confidence);
      this.processCommand(transcript, confidence);
    };

    this.recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      this.isListening = false;
      this.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Voice recognition ended');
      this.onListeningEnd?.();
    };

    this.recognition.onspeechstart = () => {
      console.log('Speech started');
    };

    this.recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    this.recognition.onnomatch = () => {
      console.log('No speech was recognized');
      this.onNoMatch?.();
    };
  }

  setupDefaultCommands() {
    // Call commands
    this.addCommand('call', ['call', 'phone', 'dial'], (params) => {
      this.onCallCommand?.(params);
    });

    this.addCommand('end call', ['end call', 'hang up', 'disconnect'], () => {
      this.onEndCallCommand?.();
    });

    this.addCommand('answer call', ['answer', 'pick up'], () => {
      this.onAnswerCallCommand?.();
    });

    this.addCommand('reject call', ['reject', 'decline'], () => {
      this.onRejectCallCommand?.();
    });

    // Message commands
    this.addCommand('send message', ['send message', 'text', 'message'], (params) => {
      this.onSendMessageCommand?.(params);
    });

    this.addCommand('read messages', ['read messages', 'show messages'], () => {
      this.onReadMessagesCommand?.();
    });

    // Navigation commands
    this.addCommand('go to', ['go to', 'navigate to', 'open'], (params) => {
      this.onNavigationCommand?.(params);
    });

    this.addCommand('back', ['back', 'go back', 'return'], () => {
      this.onBackCommand?.();
    });

    this.addCommand('home', ['home', 'dashboard'], () => {
      this.onHomeCommand?.();
    });

    // Task commands
    this.addCommand('complete task', ['complete task', 'mark done'], (params) => {
      this.onCompleteTaskCommand?.(params);
    });

    this.addCommand('assign task', ['assign task', 'create task'], (params) => {
      this.onAssignTaskCommand?.(params);
    });

    // Medical commands
    this.addCommand('emergency', ['emergency', 'urgent', 'help'], () => {
      this.onEmergencyCommand?.();
    });

    this.addCommand('medication', ['medication', 'medicine', 'drug'], (params) => {
      this.onMedicationCommand?.(params);
    });

    this.addCommand('vital signs', ['vital signs', 'check vitals'], () => {
      this.onVitalSignsCommand?.();
    });

    // System commands
    this.addCommand('stop listening', ['stop listening', 'stop voice'], () => {
      this.stopListening();
    });

    this.addCommand('start listening', ['start listening', 'voice command'], () => {
      this.startListening();
    });

    this.addCommand('help', ['help', 'commands'], () => {
      this.onHelpCommand?.();
    });
  }

  addCommand(name, triggers, callback) {
    this.commands.set(name, {
      triggers,
      callback,
      name
    });
  }

  removeCommand(name) {
    return this.commands.delete(name);
  }

  processCommand(transcript, confidence) {
    if (confidence < 0.5) {
      console.log('Low confidence command ignored:', transcript);
      return;
    }

    let matched = false;
    
    for (const [name, command] of this.commands) {
      for (const trigger of command.triggers) {
        if (transcript.includes(trigger)) {
          matched = true;
          
          // Extract parameters
          const params = this.extractParameters(transcript, trigger);
          
          console.log('Executing command:', name, 'with params:', params);
          command.callback(params);
          break;
        }
      }
      
      if (matched) break;
    }

    if (!matched) {
      console.log('No matching command found for:', transcript);
      this.onUnknownCommand?.(transcript);
    }
  }

  extractParameters(transcript, trigger) {
    const params = {};
    
    // Remove trigger from transcript
    let remaining = transcript.replace(trigger, '').trim();
    
    // Extract common parameters
    if (remaining) {
      params.text = remaining;
      
      // Extract names (capitalized words)
      const names = remaining.match(/\b[A-Z][a-z]+\b/g);
      if (names) {
        params.names = names;
      }
      
      // Extract numbers
      const numbers = remaining.match(/\d+/g);
      if (numbers) {
        params.numbers = numbers.map(Number);
      }
      
      // Extract times
      const timePattern = /\b(\d{1,2}):(\d{2})\b/g;
      const times = [];
      let match;
      while ((match = timePattern.exec(remaining)) !== null) {
        times.push({
          hour: parseInt(match[1]),
          minute: parseInt(match[2])
        });
      }
      if (times.length > 0) {
        params.times = times;
      }
    }
    
    return params;
  }

  startListening() {
    if (!this.isSupported || this.isListening) {
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      return false;
    }
  }

  stopListening() {
    if (this.isListening) {
      this.recognition.stop();
    }
  }

  setContinuousMode(enabled) {
    this.continuousMode = enabled;
    if (this.recognition) {
      this.recognition.continuous = enabled;
    }
  }

  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  setMaxAlternatives(count) {
    if (this.recognition) {
      this.recognition.maxAlternatives = count;
    }
  }

  // Event handlers
  onListeningStart = null;
  onListeningEnd = null;
  onError = null;
  onNoMatch = null;
  onUnknownCommand = null;

  // Command callbacks
  onCallCommand = null;
  onEndCallCommand = null;
  onAnswerCallCommand = null;
  onRejectCallCommand = null;
  onSendMessageCommand = null;
  onReadMessagesCommand = null;
  onNavigationCommand = null;
  onBackCommand = null;
  onHomeCommand = null;
  onCompleteTaskCommand = null;
  onAssignTaskCommand = null;
  onEmergencyCommand = null;
  onMedicationCommand = null;
  onVitalSignsCommand = null;
  onHelpCommand = null;

  // Get available commands
  getCommands() {
    const commands = [];
    for (const [name, command] of this.commands) {
      commands.push({
        name,
        triggers: command.triggers,
        description: this.getCommandDescription(name)
      });
    }
    return commands;
  }

  getCommandDescription(name) {
    const descriptions = {
      'call': 'Initiate a voice or video call',
      'end call': 'End the current call',
      'answer call': 'Answer an incoming call',
      'reject call': 'Reject an incoming call',
      'send message': 'Send a text message',
      'read messages': 'Read recent messages',
      'go to': 'Navigate to a specific page',
      'back': 'Go back to previous page',
      'home': 'Go to dashboard',
      'complete task': 'Mark a task as complete',
      'assign task': 'Assign a new task',
      'emergency': 'Trigger emergency alert',
      'medication': 'Access medication information',
      'vital signs': 'Check patient vital signs',
      'stop listening': 'Stop voice recognition',
      'start listening': 'Start voice recognition',
      'help': 'Show available voice commands'
    };
    
    return descriptions[name] || 'Custom voice command';
  }

  // Get recognition status
  getStatus() {
    return {
      supported: this.isSupported,
      listening: this.isListening,
      continuous: this.continuousMode,
      language: this.language,
      commands: this.commands.size
    };
  }

  // Test voice recognition
  test() {
    if (!this.isSupported) {
      console.log('Voice recognition not supported');
      return;
    }

    console.log('Testing voice recognition...');
    this.startListening();
    
    setTimeout(() => {
      this.stopListening();
    }, 5000);
  }

  // Create voice command button
  createVoiceButton(buttonElement, command) {
    if (!buttonElement || !this.isSupported) {
      return buttonElement;
    }

    const handleClick = () => {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    };

    buttonElement.addEventListener('click', handleClick);
    
    return buttonElement;
  }

  // Add voice command to element
  addVoiceCommand(element, command) {
    if (!element || !this.isSupported) {
      return element;
    }

    const handleClick = () => {
      this.processCommand(command, 1.0);
    };

    element.addEventListener('click', handleClick);
    
    return element;
  }

  // Get recognition capabilities
  getCapabilities() {
    return {
      continuous: true,
      interimResults: true,
      maxAlternatives: 10,
      grammars: false, // Limited support
      languages: [
        'en-US', 'en-GB', 'en-AU', 'en-CA',
        'es-ES', 'es-MX', 'fr-FR', 'fr-CA',
        'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
        'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN'
      ]
    };
  }
}

// Create singleton instance
const voiceCommandService = new VoiceCommandService();

export default voiceCommandService;

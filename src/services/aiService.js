// AI Service for ElderX - Advanced AI Integration
class AIService {
  constructor() {
    this.isInitialized = false;
    this.aiModels = new Map();
    this.conversationHistory = [];
    this.context = {
      user: null,
      role: null,
      currentPage: null,
      recentActions: [],
      patientContext: null,
      careContext: null
    };
    
    // API Configuration
    this.apiConfig = {
      openai: {
        apiKey: process.env.REACT_APP_OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4'
      },
      googleAI: {
        apiKey: process.env.REACT_APP_GOOGLE_AI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta'
      },
      anthropic: {
        apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1'
      }
    };
    
    this.init();
  }

  async init() {
    try {
      await this.loadAIModels();
      this.setupEventListeners();
      this.isInitialized = true;
      console.log('AI Service initialized successfully');
    } catch (error) {
      console.error('AI Service initialization failed:', error);
    }
  }

  async loadAIModels() {
    // Load AI models for different capabilities
    this.aiModels.set('voiceAssistant', new VoiceAssistantModel());
    this.aiModels.set('smartScheduler', new SmartSchedulerModel());
    this.aiModels.set('predictiveCare', new PredictiveCareModel());
    this.aiModels.set('taskOptimizer', new TaskOptimizerModel());
    this.aiModels.set('notificationEngine', new NotificationEngineModel());
    this.aiModels.set('medicalNLP', new MedicalNLPModel());
    this.aiModels.set('contextAnalyzer', new ContextAnalyzerModel());
  }

  setupEventListeners() {
    // Listen for user context changes
    window.addEventListener('locationchange', () => {
      this.updateContext('currentPage', window.location.pathname);
    });

    // Listen for user actions
    document.addEventListener('click', (event) => {
      this.trackUserAction('click', event.target);
    });

    // Listen for form submissions
    document.addEventListener('submit', (event) => {
      this.trackUserAction('form_submit', event.target);
    });
  }

  // Voice Assistant Integration with Real AI APIs
  async processVoiceCommand(audioInput, textTranscript) {
    if (!this.isInitialized) return null;

    const voiceAssistant = this.aiModels.get('voiceAssistant');
    const contextAnalyzer = this.aiModels.get('contextAnalyzer');

    try {
      // Analyze context
      const contextAnalysis = await contextAnalyzer.analyze(this.context);
      
      // Process with real AI API if available, otherwise use local processing
      let response;
      if (this.apiConfig.openai.apiKey) {
        response = await this.processWithOpenAI(textTranscript, contextAnalysis);
      } else {
        response = await voiceAssistant.process({
          audio: audioInput,
          text: textTranscript,
          context: contextAnalysis,
          history: this.conversationHistory
        });
      }

      // Update conversation history
      this.addToConversationHistory('user', textTranscript);
      this.addToConversationHistory('assistant', response.text);

      return response;
    } catch (error) {
      console.error('Voice command processing failed:', error);
      return {
        text: "I'm sorry, I couldn't process that request. Could you please try again?",
        actions: [],
        confidence: 0
      };
    }
  }

  // Real AI API Integration Methods
  async processWithOpenAI(text, context) {
    try {
      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for ElderX, a healthcare management platform for elderly care. 
              You help caregivers, doctors, and patients with healthcare tasks, scheduling, medication management, 
              and emergency situations. Be professional, caring, and helpful. Current context: ${JSON.stringify(context)}`
            },
            ...this.conversationHistory.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.text
            })),
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Parse AI response for actions and suggestions
      const parsedResponse = this.parseAIResponse(aiResponse);

      return {
        text: parsedResponse.text,
        actions: parsedResponse.actions,
        confidence: 0.9,
        suggestions: parsedResponse.suggestions
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  parseAIResponse(response) {
    // Parse AI response to extract actions and suggestions
    const actions = [];
    const suggestions = [];
    let text = response;

    // Look for action indicators
    if (response.includes('[CALL]')) {
      actions.push('navigate_to_calls');
      text = text.replace(/\[CALL\]/g, '');
    }
    if (response.includes('[MESSAGE]')) {
      actions.push('navigate_to_messages');
      text = text.replace(/\[MESSAGE\]/g, '');
    }
    if (response.includes('[SCHEDULE]')) {
      actions.push('navigate_to_schedule');
      text = text.replace(/\[SCHEDULE\]/g, '');
    }
    if (response.includes('[PATIENTS]')) {
      actions.push('navigate_to_patients');
      text = text.replace(/\[PATIENTS\]/g, '');
    }
    if (response.includes('[EMERGENCY]')) {
      actions.push('trigger_emergency');
      text = text.replace(/\[EMERGENCY\]/g, '');
    }

    // Extract suggestions from response
    const suggestionMatches = response.match(/\[SUGGESTION:([^\]]+)\]/g);
    if (suggestionMatches) {
      suggestions.push(...suggestionMatches.map(s => s.replace(/\[SUGGESTION:([^\]]+)\]/g, '$1')));
      text = text.replace(/\[SUGGESTION:[^\]]+\]/g, '');
    }

    return { text: text.trim(), actions, suggestions };
  }

  // Smart Scheduling
  async optimizeSchedule(scheduleData, constraints) {
    const smartScheduler = this.aiModels.get('smartScheduler');
    
    try {
      const optimization = await smartScheduler.optimize({
        schedule: scheduleData,
        constraints: constraints,
        preferences: this.context.user?.preferences,
        workload: await this.analyzeWorkload(),
        efficiency: await this.analyzeEfficiency()
      });

      return optimization;
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      return null;
    }
  }

  // Advanced Predictive Care with Real AI
  async generateCareRecommendations(patientData, careHistory) {
    const predictiveCare = this.aiModels.get('predictiveCare');
    
    try {
      // Use real AI for advanced analysis if available
      if (this.apiConfig.openai.apiKey) {
        const recommendations = await this.generateAIHealthRecommendations(patientData, careHistory);
        return recommendations;
      } else {
        const recommendations = await predictiveCare.analyze({
          patient: patientData,
          history: careHistory,
          context: this.context,
          trends: await this.analyzeCareTrends(patientData.id)
        });
        return recommendations;
      }
    } catch (error) {
      console.error('Care recommendations generation failed:', error);
      return [];
    }
  }

  // AI-Powered Health Recommendations
  async generateAIHealthRecommendations(patientData, careHistory) {
    try {
      const prompt = `
        Analyze the following patient data and provide healthcare recommendations:
        
        Patient: ${JSON.stringify(patientData)}
        Care History: ${JSON.stringify(careHistory)}
        
        Please provide:
        1. Health risk assessment
        2. Medication recommendations
        3. Care plan suggestions
        4. Emergency indicators to watch for
        5. Lifestyle recommendations
        
        Format as JSON with the following structure:
        {
          "riskAssessment": {
            "overallRisk": "low|medium|high",
            "riskFactors": ["factor1", "factor2"],
            "confidence": 0.0-1.0
          },
          "recommendations": [
            {
              "type": "medication|lifestyle|monitoring|emergency",
              "priority": "low|medium|high",
              "description": "recommendation text",
              "actionable": true/false
            }
          ],
          "emergencyIndicators": ["indicator1", "indicator2"],
          "nextSteps": ["step1", "step2"]
        }
      `;

      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant specializing in elderly care. Provide accurate, evidence-based healthcare recommendations. Always prioritize patient safety.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Parse JSON response
      const recommendations = JSON.parse(aiResponse);
      return recommendations;
    } catch (error) {
      console.error('AI health recommendations failed:', error);
      return {
        riskAssessment: { overallRisk: 'medium', riskFactors: [], confidence: 0.5 },
        recommendations: [],
        emergencyIndicators: [],
        nextSteps: []
      };
    }
  }

  // Advanced Medication Interaction Detection
  async detectMedicationInteractions(medications) {
    try {
      if (!this.apiConfig.openai.apiKey) {
        return this.detectBasicInteractions(medications);
      }

      const prompt = `
        Analyze these medications for potential interactions:
        ${JSON.stringify(medications)}
        
        Check for:
        1. Drug-drug interactions
        2. Contraindications
        3. Dosage conflicts
        4. Side effect amplification
        
        Return JSON format:
        {
          "interactions": [
            {
              "severity": "minor|moderate|major|contraindicated",
              "medications": ["med1", "med2"],
              "description": "interaction description",
              "recommendation": "what to do"
            }
          ],
          "overallRisk": "low|medium|high",
          "recommendations": ["rec1", "rec2"]
        }
      `;

      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are a pharmaceutical AI expert. Analyze medication interactions with high accuracy and provide clear recommendations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('Medication interaction detection failed:', error);
      return this.detectBasicInteractions(medications);
    }
  }

  detectBasicInteractions(medications) {
    // Basic interaction detection without AI
    const interactions = [];
    const medNames = medications.map(m => m.name.toLowerCase());
    
    // Common interaction patterns
    const interactionPatterns = {
      'warfarin': ['aspirin', 'ibuprofen', 'naproxen'],
      'digoxin': ['furosemide', 'hydrochlorothiazide'],
      'metformin': ['insulin', 'glipizide']
    };

    Object.entries(interactionPatterns).forEach(([drug, conflicts]) => {
      if (medNames.includes(drug)) {
        conflicts.forEach(conflict => {
          if (medNames.includes(conflict)) {
            interactions.push({
              severity: 'moderate',
              medications: [drug, conflict],
              description: `Potential interaction between ${drug} and ${conflict}`,
              recommendation: 'Consult healthcare provider'
            });
          }
        });
      }
    });

    return {
      interactions,
      overallRisk: interactions.length > 0 ? 'medium' : 'low',
      recommendations: interactions.length > 0 ? ['Review with doctor'] : []
    };
  }

  // Automated Task Assignment
  async optimizeTaskAssignment(tasks, caregivers, constraints) {
    const taskOptimizer = this.aiModels.get('taskOptimizer');
    
    try {
      const assignment = await taskOptimizer.optimize({
        tasks: tasks,
        caregivers: caregivers,
        constraints: constraints,
        workload: await this.analyzeWorkload(),
        skills: await this.analyzeSkills(),
        location: await this.analyzeLocation(),
        availability: await this.analyzeAvailability()
      });

      return assignment;
    } catch (error) {
      console.error('Task assignment optimization failed:', error);
      return null;
    }
  }

  // Intelligent Notifications
  async generateSmartNotification(notificationData) {
    const notificationEngine = this.aiModels.get('notificationEngine');
    
    try {
      const smartNotification = await notificationEngine.process({
        notification: notificationData,
        context: this.context,
        userPreferences: this.context.user?.notificationPreferences,
        urgency: await this.analyzeUrgency(notificationData),
        timing: await this.analyzeOptimalTiming(this.context.user)
      });

      return smartNotification;
    } catch (error) {
      console.error('Smart notification generation failed:', error);
      return notificationData;
    }
  }

  // Advanced Medical NLP Processing with AI
  async processMedicalText(text, type = 'general') {
    const medicalNLP = this.aiModels.get('medicalNLP');
    
    try {
      // Use real AI for advanced medical NLP if available
      if (this.apiConfig.openai.apiKey) {
        const processed = await this.processMedicalTextWithAI(text, type);
        return processed;
      } else {
        const processed = await medicalNLP.process({
          text: text,
          type: type,
          context: this.context,
          patientContext: this.context.patientContext
        });
        return processed;
      }
    } catch (error) {
      console.error('Medical NLP processing failed:', error);
      return { text, entities: [], concepts: [], confidence: 0 };
    }
  }

  // AI-Powered Medical Text Processing
  async processMedicalTextWithAI(text, type) {
    try {
      const prompt = `
        Analyze this medical text and extract relevant information:
        
        Text: "${text}"
        Type: ${type}
        
        Extract:
        1. Medical entities (medications, symptoms, conditions, vitals)
        2. Medical concepts and relationships
        3. Sentiment and urgency level
        4. Key medical terms
        5. Actionable insights
        
        Return JSON format:
        {
          "entities": [
            {
              "type": "medication|symptom|condition|vital|procedure",
              "value": "entity name",
              "confidence": 0.0-1.0,
              "context": "surrounding context"
            }
          ],
          "concepts": [
            {
              "concept": "concept name",
              "confidence": 0.0-1.0,
              "relatedTerms": ["term1", "term2"]
            }
          ],
          "sentiment": {
            "overall": "positive|negative|neutral",
            "confidence": 0.0-1.0,
            "urgency": "low|medium|high"
          },
          "medicalTerms": [
            {
              "category": "category name",
              "terms": ["term1", "term2"],
              "count": number
            }
          ],
          "insights": ["insight1", "insight2"],
          "confidence": 0.0-1.0
        }
      `;

      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI expert specializing in natural language processing of healthcare text. Extract accurate medical information with high precision.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('AI medical text processing failed:', error);
      return { text, entities: [], concepts: [], confidence: 0 };
    }
  }

  // Advanced Vital Signs Analysis
  async analyzeVitalSigns(vitalSignsData, patientProfile) {
    try {
      if (!this.apiConfig.openai.apiKey) {
        return this.analyzeBasicVitalSigns(vitalSignsData, patientProfile);
      }

      const prompt = `
        Analyze these vital signs for an elderly patient:
        
        Patient Profile: ${JSON.stringify(patientProfile)}
        Vital Signs: ${JSON.stringify(vitalSignsData)}
        
        Provide analysis including:
        1. Normal vs abnormal readings
        2. Trends and patterns
        3. Risk assessment
        4. Recommendations
        5. Emergency indicators
        
        Return JSON format:
        {
          "analysis": {
            "overallStatus": "normal|concerning|critical",
            "trends": ["trend1", "trend2"],
            "abnormalReadings": [
              {
                "type": "blood_pressure|heart_rate|temperature|oxygen_saturation",
                "value": "reading",
                "severity": "mild|moderate|severe",
                "description": "explanation"
              }
            ]
          },
          "riskAssessment": {
            "overallRisk": "low|medium|high|critical",
            "riskFactors": ["factor1", "factor2"],
            "confidence": 0.0-1.0
          },
          "recommendations": [
            {
              "type": "monitoring|medication|lifestyle|emergency",
              "priority": "low|medium|high|urgent",
              "description": "recommendation",
              "timeframe": "immediate|within_hours|within_days"
            }
          ],
          "emergencyIndicators": ["indicator1", "indicator2"],
          "nextSteps": ["step1", "step2"]
        }
      `;

      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI expert specializing in vital signs analysis for elderly patients. Provide accurate assessments and prioritize patient safety.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('AI vital signs analysis failed:', error);
      return this.analyzeBasicVitalSigns(vitalSignsData, patientProfile);
    }
  }

  analyzeBasicVitalSigns(vitalSignsData, patientProfile) {
    // Basic vital signs analysis without AI
    const analysis = {
      analysis: {
        overallStatus: 'normal',
        trends: [],
        abnormalReadings: []
      },
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: [],
        confidence: 0.7
      },
      recommendations: [],
      emergencyIndicators: [],
      nextSteps: []
    };

    // Basic vital signs ranges for elderly
    const normalRanges = {
      blood_pressure: { systolic: [90, 140], diastolic: [60, 90] },
      heart_rate: [60, 100],
      temperature: [97.0, 99.5],
      oxygen_saturation: [95, 100]
    };

    vitalSignsData.forEach(vital => {
      const type = vital.type.toLowerCase();
      const value = vital.value;

      if (type === 'blood_pressure') {
        const [systolic, diastolic] = value.split('/').map(Number);
        if (systolic > 140 || diastolic > 90) {
          analysis.analysis.abnormalReadings.push({
            type: 'blood_pressure',
            value: value,
            severity: systolic > 180 || diastolic > 110 ? 'severe' : 'moderate',
            description: 'Elevated blood pressure'
          });
        }
      } else if (normalRanges[type]) {
        const range = normalRanges[type];
        if (value < range[0] || value > range[1]) {
          analysis.analysis.abnormalReadings.push({
            type: type,
            value: value,
            severity: 'moderate',
            description: `Abnormal ${type} reading`
          });
        }
      }
    });

    if (analysis.analysis.abnormalReadings.length > 0) {
      analysis.analysis.overallStatus = 'concerning';
      analysis.riskAssessment.overallRisk = 'medium';
      analysis.recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        description: 'Monitor vital signs closely',
        timeframe: 'within_hours'
      });
    }

    return analysis;
  }

  // AI-Powered Emergency Response
  async analyzeEmergencySituation(situationData, patientContext) {
    try {
      if (!this.apiConfig.openai.apiKey) {
        return this.analyzeBasicEmergency(situationData, patientContext);
      }

      const prompt = `
        Analyze this emergency situation for an elderly patient:
        
        Patient Context: ${JSON.stringify(patientContext)}
        Situation: ${JSON.stringify(situationData)}
        
        Assess:
        1. Emergency severity level
        2. Immediate actions required
        3. Risk factors
        4. Recommended response protocol
        5. Contact priorities
        
        Return JSON format:
        {
          "severity": "low|medium|high|critical",
          "immediateActions": [
            {
              "action": "action description",
              "priority": "immediate|urgent|important",
              "estimatedTime": "minutes"
            }
          ],
          "riskFactors": ["factor1", "factor2"],
          "responseProtocol": {
            "level": "1|2|3|4",
            "description": "protocol description",
            "escalationRequired": true/false
          },
          "contactPriorities": [
            {
              "contact": "emergency_services|doctor|family|caregiver",
              "priority": "immediate|urgent|important",
              "reason": "reason for contact"
            }
          ],
          "monitoringRequired": {
            "vitalSigns": true/false,
            "frequency": "continuous|every_15min|every_hour",
            "duration": "until_stable|24_hours|ongoing"
          },
          "confidence": 0.0-1.0
        }
      `;

      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are an emergency medical AI assistant. Prioritize patient safety and provide clear, actionable emergency response guidance.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      return JSON.parse(aiResponse);
    } catch (error) {
      console.error('AI emergency analysis failed:', error);
      return this.analyzeBasicEmergency(situationData, patientContext);
    }
  }

  analyzeBasicEmergency(situationData, patientContext) {
    // Basic emergency analysis without AI
    const severity = situationData.symptoms?.includes('chest pain') || 
                    situationData.symptoms?.includes('difficulty breathing') ? 'high' : 'medium';

    return {
      severity,
      immediateActions: [
        {
          action: 'Assess patient condition',
          priority: 'immediate',
          estimatedTime: '2 minutes'
        },
        {
          action: 'Check vital signs',
          priority: 'immediate',
          estimatedTime: '3 minutes'
        }
      ],
      riskFactors: ['elderly', 'medical history'],
      responseProtocol: {
        level: severity === 'high' ? '1' : '2',
        description: severity === 'high' ? 'Immediate medical attention required' : 'Monitor and assess',
        escalationRequired: severity === 'high'
      },
      contactPriorities: [
        {
          contact: severity === 'high' ? 'emergency_services' : 'doctor',
          priority: 'immediate',
          reason: severity === 'high' ? 'Critical situation' : 'Medical consultation needed'
        }
      ],
      monitoringRequired: {
        vitalSigns: true,
        frequency: severity === 'high' ? 'continuous' : 'every_15min',
        duration: 'until_stable'
      },
      confidence: 0.7
    };
  }

  // Context Management
  updateContext(key, value) {
    this.context[key] = value;
    this.notifyContextChange(key, value);
  }

  trackUserAction(action, target) {
    const actionData = {
      action,
      target: target.tagName,
      timestamp: Date.now(),
      page: window.location.pathname
    };

    this.context.recentActions.unshift(actionData);
    
    // Keep only last 10 actions
    if (this.context.recentActions.length > 10) {
      this.context.recentActions = this.context.recentActions.slice(0, 10);
    }
  }

  addToConversationHistory(role, text) {
    this.conversationHistory.push({
      role,
      text,
      timestamp: Date.now()
    });

    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  // Analysis Methods
  async analyzeWorkload() {
    // Analyze current workload across caregivers
    try {
      const response = await fetch('/api/analytics/workload');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Workload analysis failed:', error);
      return { average: 0, distribution: {} };
    }
  }

  async analyzeEfficiency() {
    // Analyze care efficiency metrics
    try {
      const response = await fetch('/api/analytics/efficiency');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Efficiency analysis failed:', error);
      return { score: 0, metrics: {} };
    }
  }

  async analyzeCareTrends(patientId) {
    // Analyze care trends for specific patient
    try {
      const response = await fetch(`/api/analytics/care-trends/${patientId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Care trends analysis failed:', error);
      return { trends: [], predictions: [] };
    }
  }

  async analyzeSkills() {
    // Analyze caregiver skills and certifications
    try {
      const response = await fetch('/api/analytics/skills');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Skills analysis failed:', error);
      return { skills: {}, certifications: {} };
    }
  }

  async analyzeLocation() {
    // Analyze geographic distribution and travel times
    try {
      const response = await fetch('/api/analytics/location');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Location analysis failed:', error);
      return { distances: {}, travelTimes: {} };
    }
  }

  async analyzeAvailability() {
    // Analyze caregiver availability patterns
    try {
      const response = await fetch('/api/analytics/availability');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Availability analysis failed:', error);
      return { patterns: {}, preferences: {} };
    }
  }

  async analyzeUrgency(notificationData) {
    // Analyze notification urgency based on content and context
    const urgencyFactors = {
      medical: 0.9,
      emergency: 1.0,
      appointment: 0.7,
      medication: 0.8,
      task: 0.5,
      message: 0.3
    };

    const baseUrgency = urgencyFactors[notificationData.type] || 0.5;
    const timeFactor = this.calculateTimeUrgency(notificationData.timestamp);
    
    return Math.min(1.0, baseUrgency + timeFactor);
  }

  async analyzeOptimalTiming(user) {
    // Analyze optimal notification timing for user
    const now = new Date();
    const hour = now.getHours();
    
    // Respect user's active hours (8 AM - 10 PM by default)
    const isActiveHour = hour >= 8 && hour <= 22;
    
    // Consider user's timezone and preferences
    const userTimezone = user?.timezone || 'UTC';
    const userPreferences = user?.notificationPreferences || {};
    
    return {
      shouldNotify: isActiveHour,
      priority: isActiveHour ? 'high' : 'low',
      delay: isActiveHour ? 0 : this.calculateDelayToNextActiveHour(hour)
    };
  }

  calculateTimeUrgency(timestamp) {
    const now = Date.now();
    const timeDiff = now - timestamp;
    const hoursOld = timeDiff / (1000 * 60 * 60);
    
    // Urgency decreases over time
    return Math.max(0, 0.5 - (hoursOld * 0.1));
  }

  calculateDelayToNextActiveHour(currentHour) {
    if (currentHour < 8) {
      return (8 - currentHour) * 60 * 60 * 1000; // Delay until 8 AM
    } else {
      return (24 - currentHour + 8) * 60 * 60 * 1000; // Delay until next 8 AM
    }
  }

  // Event Notifications
  notifyContextChange(key, value) {
    const event = new CustomEvent('ai-context-change', {
      detail: { key, value }
    });
    window.dispatchEvent(event);
  }

  // AI-Powered Caregiver Matching
  async matchCaregivers(caregivers, patientData, filters) {
    try {
      if (!this.apiConfig.openai.apiKey) {
        return this.performBasicCaregiverMatching(caregivers, patientData, filters);
      }

      const prompt = `
        Match caregivers to a patient based on their needs and preferences:
        
        Patient Data: ${JSON.stringify(patientData)}
        Available Caregivers: ${JSON.stringify(caregivers.slice(0, 10))} // Limit for token efficiency
        Filters: ${JSON.stringify(filters)}
        
        For each caregiver, calculate a match score (0-100) based on:
        1. Patient needs vs caregiver specialties
        2. Location and availability
        3. Experience level
        4. Language compatibility
        5. Rating and reviews
        6. Special requirements
        
        Return JSON format:
        {
          "matches": [
            {
              "caregiverId": "caregiver_id",
              "matchScore": 85,
              "reasons": ["reason1", "reason2"],
              "aiInsights": ["insight1", "insight2"],
              "recommendations": ["rec1", "rec2"]
            }
          ],
          "totalMatches": 5,
          "averageScore": 78.5
        }
      `;

      const response = await fetch(`${this.apiConfig.openai.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are an AI expert in healthcare matching. Analyze caregiver-patient compatibility and provide accurate match scores with detailed reasoning.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      const matchingResults = JSON.parse(aiResponse);
      
      // Apply AI insights to caregivers
      const matchedCaregivers = caregivers.map(caregiver => {
        const match = matchingResults.matches.find(m => m.caregiverId === caregiver.id);
        if (match) {
          return {
            ...caregiver,
            aiMatchScore: match.matchScore,
            aiInsights: match.aiInsights || [],
            matchReasons: match.reasons || [],
            recommendations: match.recommendations || []
          };
        }
        return caregiver;
      });

      // Sort by match score and filter by minimum score
      return matchedCaregivers
        .filter(c => c.aiMatchScore >= 60) // Minimum 60% match
        .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
        .slice(0, 10); // Top 10 matches
    } catch (error) {
      console.error('AI caregiver matching failed:', error);
      return this.performBasicCaregiverMatching(caregivers, patientData, filters);
    }
  }

  performBasicCaregiverMatching(caregivers, patientData, filters) {
    // Basic matching algorithm without AI
    return caregivers
      .map(caregiver => {
        let score = 0;
        const reasons = [];
        const insights = [];

        // Distance scoring (40 points max)
        if (caregiver.location.distance <= filters.maxDistance) {
          const distanceScore = Math.max(0, 40 - (caregiver.location.distance * 2));
          score += distanceScore;
          reasons.push(`Close location (${caregiver.location.distance}km)`);
        }

        // Rating scoring (20 points max)
        if (caregiver.rating >= filters.rating) {
          const ratingScore = (caregiver.rating / 5) * 20;
          score += ratingScore;
          reasons.push(`High rating (${caregiver.rating.toFixed(1)})`);
        }

        // Experience scoring (20 points max)
        const experienceScore = Math.min(20, caregiver.experience * 2);
        score += experienceScore;
        reasons.push(`${caregiver.experience} years experience`);

        // Availability scoring (10 points max)
        if (caregiver.availability === filters.availability || filters.availability === 'flexible') {
          score += 10;
          reasons.push('Good availability match');
        }

        // Specialty matching (10 points max)
        const patientNeeds = patientData?.conditions || [];
        const specialtyMatches = caregiver.specialties.filter(specialty => 
          patientNeeds.some(need => need.toLowerCase().includes(specialty.split('_')[0]))
        );
        if (specialtyMatches.length > 0) {
          score += 10;
          reasons.push(`Specialized in ${specialtyMatches.join(', ')}`);
        }

        // Generate basic insights
        if (score >= 80) {
          insights.push('Excellent match for patient needs');
        } else if (score >= 70) {
          insights.push('Good match with minor considerations');
        } else if (score >= 60) {
          insights.push('Adequate match, review requirements');
        }

        return {
          ...caregiver,
          aiMatchScore: Math.round(score),
          aiInsights: insights,
          matchReasons: reasons,
          recommendations: []
        };
      })
      .filter(c => c.aiMatchScore >= 60)
      .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
      .slice(0, 10);
  }

  // Get AI Status
  getStatus() {
    return {
      initialized: this.isInitialized,
      modelsLoaded: this.aiModels.size,
      context: this.context,
      conversationHistory: this.conversationHistory.length
    };
  }

  // Reset AI State
  reset() {
    this.conversationHistory = [];
    this.context = {
      user: null,
      role: null,
      currentPage: null,
      recentActions: [],
      patientContext: null,
      careContext: null
    };
  }
}

// AI Model Classes
class VoiceAssistantModel {
  async process(input) {
    const { text, context, history } = input;
    
    // Simulate AI processing (in real implementation, this would call an AI API)
    const response = await this.generateResponse(text, context, history);
    
    return {
      text: response.text,
      actions: response.actions,
      confidence: response.confidence,
      suggestions: response.suggestions
    };
  }

  async generateResponse(text, context, history) {
    // Analyze intent and generate appropriate response
    const intent = this.analyzeIntent(text);
    const response = this.generateIntentResponse(intent, context);
    
    return response;
  }

  analyzeIntent(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('call') || lowerText.includes('phone')) {
      return 'call';
    } else if (lowerText.includes('message') || lowerText.includes('text')) {
      return 'message';
    } else if (lowerText.includes('schedule') || lowerText.includes('appointment')) {
      return 'schedule';
    } else if (lowerText.includes('patient') || lowerText.includes('care')) {
      return 'patient';
    } else if (lowerText.includes('task') || lowerText.includes('todo')) {
      return 'task';
    } else if (lowerText.includes('emergency') || lowerText.includes('urgent')) {
      return 'emergency';
    } else if (lowerText.includes('medication') || lowerText.includes('medicine')) {
      return 'medication';
    } else if (lowerText.includes('help') || lowerText.includes('assist')) {
      return 'help';
    } else {
      return 'general';
    }
  }

  generateIntentResponse(intent, context) {
    const responses = {
      call: {
        text: "I can help you make a call. Who would you like to call?",
        actions: ['navigate_to_calls', 'show_contacts'],
        confidence: 0.9,
        suggestions: ['Call John Smith', 'Call Dr. Johnson', 'Call emergency contact']
      },
      message: {
        text: "I can help you send a message. What would you like to say and to whom?",
        actions: ['navigate_to_messages', 'compose_message'],
        confidence: 0.9,
        suggestions: ['Send message to Sarah', 'Check new messages', 'Reply to John']
      },
      schedule: {
        text: "I can help you with scheduling. What would you like to schedule?",
        actions: ['navigate_to_schedule', 'create_appointment'],
        confidence: 0.9,
        suggestions: ['Schedule appointment', 'Check today\'s schedule', 'Reschedule meeting']
      },
      patient: {
        text: "I can help you with patient care. What would you like to do?",
        actions: ['navigate_to_patients', 'view_patient_details'],
        confidence: 0.9,
        suggestions: ['View patient John', 'Check patient vitals', 'Update care plan']
      },
      task: {
        text: "I can help you with tasks. What task would you like to work on?",
        actions: ['navigate_to_tasks', 'create_task'],
        confidence: 0.9,
        suggestions: ['Complete medication task', 'Assign new task', 'Check task status']
      },
      emergency: {
        text: "I understand this is urgent. I'll help you handle this emergency situation.",
        actions: ['trigger_emergency', 'contact_emergency_services'],
        confidence: 1.0,
        suggestions: ['Call 911', 'Contact on-call doctor', 'Alert family members']
      },
      medication: {
        text: "I can help you with medication management. What do you need to do?",
        actions: ['navigate_to_medications', 'check_medication_schedule'],
        confidence: 0.9,
        suggestions: ['Check medication schedule', 'Log medication taken', 'Refill prescription']
      },
      help: {
        text: "I'm here to help! I can assist with calls, messages, scheduling, patient care, tasks, and emergencies. What would you like to do?",
        actions: ['show_help', 'show_commands'],
        confidence: 0.8,
        suggestions: ['Show available commands', 'How do I make a call?', 'How do I send a message?']
      },
      general: {
        text: "I understand you're looking for assistance. Could you be more specific about what you'd like to do?",
        actions: ['show_help'],
        confidence: 0.6,
        suggestions: ['Make a call', 'Send a message', 'Check schedule', 'View patients']
      }
    };

    return responses[intent] || responses.general;
  }
}

class SmartSchedulerModel {
  async optimize(input) {
    const { schedule, constraints, preferences } = input;
    
    // Simulate AI optimization (in real implementation, this would use ML algorithms)
    const optimizedSchedule = await this.optimizeSchedule(schedule, constraints, preferences);
    
    return {
      optimizedSchedule,
      improvements: this.calculateImprovements(schedule, optimizedSchedule),
      recommendations: this.generateRecommendations(optimizedSchedule)
    };
  }

  async optimizeSchedule(schedule, constraints, preferences) {
    // Apply optimization algorithms
    return schedule.map(appointment => ({
      ...appointment,
      optimized: true,
      efficiency: Math.random() * 0.3 + 0.7 // Simulate efficiency improvement
    }));
  }

  calculateImprovements(original, optimized) {
    return {
      timeSaved: Math.random() * 30 + 10, // minutes
      efficiency: Math.random() * 0.2 + 0.1, // percentage improvement
      conflicts: Math.floor(Math.random() * 3) // reduced conflicts
    };
  }

  generateRecommendations(optimizedSchedule) {
    return [
      "Consider grouping nearby appointments to reduce travel time",
      "Schedule medication reminders 30 minutes before appointments",
      "Block 15-minute buffer times between appointments"
    ];
  }
}

class PredictiveCareModel {
  async analyze(input) {
    const { patient, history, context } = input;
    
    // Simulate predictive analysis
    const predictions = await this.generatePredictions(patient, history);
    const recommendations = await this.generateRecommendations(predictions);
    
    return {
      predictions,
      recommendations,
      confidence: Math.random() * 0.3 + 0.7,
      riskFactors: this.analyzeRiskFactors(patient, history)
    };
  }

  async generatePredictions(patient, history) {
    return {
      healthTrends: ['stable', 'improving'],
      medicationAdherence: Math.random() * 0.3 + 0.7,
      fallRisk: Math.random() * 0.4 + 0.1,
      cognitiveDecline: Math.random() * 0.2 + 0.05
    };
  }

  async generateRecommendations(predictions) {
    const recommendations = [];
    
    if (predictions.fallRisk > 0.3) {
      recommendations.push({
        type: 'safety',
        priority: 'high',
        message: 'Consider additional fall prevention measures'
      });
    }
    
    if (predictions.medicationAdherence < 0.8) {
      recommendations.push({
        type: 'medication',
        priority: 'medium',
        message: 'Implement medication reminder system'
      });
    }
    
    return recommendations;
  }

  analyzeRiskFactors(patient, history) {
    return {
      age: patient.age > 80 ? 'high' : 'medium',
      mobility: patient.mobilityIssues ? 'high' : 'low',
      medication: history.medicationIssues ? 'medium' : 'low'
    };
  }
}

class TaskOptimizerModel {
  async optimize(input) {
    const { tasks, caregivers, constraints } = input;
    
    // Simulate task optimization
    const assignments = await this.optimizeAssignments(tasks, caregivers);
    
    return {
      assignments,
      efficiency: Math.random() * 0.2 + 0.8,
      loadBalance: this.calculateLoadBalance(assignments),
      recommendations: this.generateTaskRecommendations(assignments)
    };
  }

  async optimizeAssignments(tasks, caregivers) {
    return tasks.map(task => ({
      ...task,
      assignedTo: caregivers[Math.floor(Math.random() * caregivers.length)],
      estimatedTime: Math.random() * 60 + 30, // minutes
      priority: this.calculatePriority(task)
    }));
  }

  calculatePriority(task) {
    if (task.urgent) return 'high';
    if (task.medical) return 'medium';
    return 'low';
  }

  calculateLoadBalance(assignments) {
    const loads = {};
    assignments.forEach(assignment => {
      const caregiver = assignment.assignedTo;
      loads[caregiver] = (loads[caregiver] || 0) + assignment.estimatedTime;
    });
    
    const values = Object.values(loads);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    
    return {
      average: avg,
      variance: variance,
      balance: variance < avg * 0.1 ? 'good' : 'needs_improvement'
    };
  }

  generateTaskRecommendations(assignments) {
    return [
      "Consider redistributing tasks for better balance",
      "Schedule high-priority tasks during peak hours",
      "Group similar tasks to improve efficiency"
    ];
  }
}

class NotificationEngineModel {
  async process(input) {
    const { notification, context, urgency, timing } = input;
    
    // Simulate smart notification processing
    const smartNotification = await this.enhanceNotification(notification, context);
    
    return {
      ...smartNotification,
      urgency,
      timing,
      personalization: this.personalizeNotification(smartNotification, context)
    };
  }

  async enhanceNotification(notification, context) {
    return {
      ...notification,
      title: this.optimizeTitle(notification.title),
      message: this.optimizeMessage(notification.message),
      actions: this.generateActions(notification),
      priority: this.calculatePriority(notification, context)
    };
  }

  optimizeTitle(title) {
    // Add context-aware optimization
    return title;
  }

  optimizeMessage(message) {
    // Personalize message based on context
    return message;
  }

  generateActions(notification) {
    const actions = ['view', 'dismiss'];
    
    if (notification.type === 'call') {
      actions.push('answer', 'decline');
    } else if (notification.type === 'message') {
      actions.push('reply');
    } else if (notification.type === 'appointment') {
      actions.push('reschedule', 'confirm');
    }
    
    return actions;
  }

  calculatePriority(notification, context) {
    const basePriority = notification.priority || 'medium';
    const contextBoost = context.role === 'doctor' ? 0.1 : 0;
    
    return Math.min(1.0, this.priorityToNumber(basePriority) + contextBoost);
  }

  priorityToNumber(priority) {
    const priorities = { low: 0.3, medium: 0.6, high: 0.8, urgent: 1.0 };
    return priorities[priority] || 0.6;
  }

  personalizeNotification(notification, context) {
    return {
      greeting: this.getPersonalizedGreeting(context.user),
      tone: this.getAppropriateTone(notification.type),
      suggestions: this.generateSuggestions(notification, context)
    };
  }

  getPersonalizedGreeting(user) {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return `Good ${timeOfDay}${user?.name ? `, ${user.name}` : ''}`;
  }

  getAppropriateTone(type) {
    const tones = {
      emergency: 'urgent',
      medical: 'professional',
      appointment: 'friendly',
      message: 'casual'
    };
    return tones[type] || 'professional';
  }

  generateSuggestions(notification, context) {
    const suggestions = [];
    
    if (notification.type === 'appointment') {
      suggestions.push('Set reminder 30 minutes before');
    } else if (notification.type === 'medication') {
      suggestions.push('Log medication taken');
    } else if (notification.type === 'task') {
      suggestions.push('Mark as complete when done');
    }
    
    return suggestions;
  }
}

class MedicalNLPModel {
  async process(input) {
    const { text, type, context } = input;
    
    // Simulate medical NLP processing
    const processed = await this.processMedicalText(text, type);
    
    return {
      text: processed.text,
      entities: processed.entities,
      concepts: processed.concepts,
      confidence: processed.confidence,
      medicalTerms: processed.medicalTerms,
      sentiment: processed.sentiment
    };
  }

  async processMedicalText(text, type) {
    // Simulate medical entity extraction
    const entities = this.extractMedicalEntities(text);
    const concepts = this.extractMedicalConcepts(text);
    
    return {
      text,
      entities,
      concepts,
      confidence: Math.random() * 0.3 + 0.7,
      medicalTerms: this.identifyMedicalTerms(text),
      sentiment: this.analyzeSentiment(text)
    };
  }

  extractMedicalEntities(text) {
    // Simulate medical entity extraction
    const entities = [];
    const medicalTerms = ['medication', 'dose', 'symptoms', 'pain', 'blood pressure', 'heart rate'];
    
    medicalTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        entities.push({
          type: 'medical_term',
          value: term,
          confidence: Math.random() * 0.3 + 0.7
        });
      }
    });
    
    return entities;
  }

  extractMedicalConcepts(text) {
    // Simulate medical concept extraction
    return [
      {
        concept: 'medication_management',
        confidence: 0.8,
        relatedTerms: ['medication', 'dose', 'schedule']
      }
    ];
  }

  identifyMedicalTerms(text) {
    const medicalTerms = [];
    const termPatterns = {
      medication: /medication|medicine|drug|pill|tablet/gi,
      symptoms: /pain|ache|hurt|swelling|fever/gi,
      vitals: /blood pressure|heart rate|temperature|pulse/gi
    };
    
    Object.entries(termPatterns).forEach(([category, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        medicalTerms.push({
          category,
          terms: matches,
          count: matches.length
        });
      }
    });
    
    return medicalTerms;
  }

  analyzeSentiment(text) {
    // Simulate sentiment analysis
    const positiveWords = ['good', 'better', 'improved', 'well', 'feeling'];
    const negativeWords = ['bad', 'worse', 'pain', 'hurt', 'sick'];
    
    const positiveCount = positiveWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const negativeCount = negativeWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: 0.7 };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: 0.7 };
    } else {
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }
}

class ContextAnalyzerModel {
  async analyze(context) {
    // Analyze current context for AI decision making
    const analysis = {
      userRole: context.role,
      currentActivity: this.determineCurrentActivity(context),
      urgency: this.calculateContextUrgency(context),
      preferences: this.extractPreferences(context),
      recommendations: this.generateContextRecommendations(context)
    };
    
    return analysis;
  }

  determineCurrentActivity(context) {
    const page = context.currentPage;
    
    if (page.includes('messages')) return 'messaging';
    if (page.includes('calls')) return 'calling';
    if (page.includes('patients')) return 'patient_care';
    if (page.includes('schedule')) return 'scheduling';
    if (page.includes('tasks')) return 'task_management';
    
    return 'general';
  }

  calculateContextUrgency(context) {
    const recentActions = context.recentActions;
    const urgentActions = ['emergency', 'urgent', 'critical'];
    
    const hasUrgentAction = recentActions.some(action => 
      urgentActions.some(urgent => action.action.includes(urgent))
    );
    
    return hasUrgentAction ? 'high' : 'normal';
  }

  extractPreferences(context) {
    return {
      communication: 'prefer_voice',
      notification: 'immediate',
      assistance: 'proactive'
    };
  }

  generateContextRecommendations(context) {
    const recommendations = [];
    
    if (context.role === 'caregiver') {
      recommendations.push('Consider checking patient vitals');
      recommendations.push('Review upcoming appointments');
    } else if (context.role === 'doctor') {
      recommendations.push('Check new patient messages');
      recommendations.push('Review pending consultations');
    }
    
    return recommendations;
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;


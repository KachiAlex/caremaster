// IoT Integration Service for ElderX
import aiService from './aiService';

class IoTIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.devices = new Map();
    this.connections = new Map();
    this.dataStreams = new Map();
    this.eventListeners = new Map();
    
    // IoT Device Types
    this.deviceTypes = {
      WEARABLE: 'wearable',
      SMART_HOME: 'smart_home',
      MEDICAL_DEVICE: 'medical_device',
      SENSOR: 'sensor',
      CAMERA: 'camera',
      SPEAKER: 'speaker',
      DISPLAY: 'display'
    };

    // Supported Protocols
    this.protocols = {
      MQTT: 'mqtt',
      HTTP: 'http',
      WEBSOCKET: 'websocket',
      BLUETOOTH: 'bluetooth',
      WIFI: 'wifi',
      ZIGBEE: 'zigbee',
      ZWAVE: 'zwave'
    };

    // Configuration
    this.config = {
      mqttBroker: process.env.REACT_APP_MQTT_BROKER || 'ws://localhost:9001',
      apiEndpoint: process.env.REACT_APP_IOT_API_ENDPOINT || 'http://localhost:3001/api/iot',
      enableRealTime: true,
      enableDataAnalysis: true,
      enablePredictiveMaintenance: true,
      enableAutomation: true
    };

    this.init();
  }

  async init() {
    try {
      await this.initializeConnections();
      this.setupEventListeners();
      this.isInitialized = true;
      console.log('IoT Integration Service initialized');
    } catch (error) {
      console.error('Failed to initialize IoT Integration Service:', error);
    }
  }

  async initializeConnections() {
    try {
      // Initialize MQTT connection
      if (this.config.mqttBroker) {
        await this.initializeMQTT();
      }

      // Initialize WebSocket connections
      await this.initializeWebSockets();

      // Initialize Bluetooth connections
      await this.initializeBluetooth();

      console.log('IoT connections initialized');
    } catch (error) {
      console.error('Failed to initialize IoT connections:', error);
    }
  }

  setupEventListeners() {
    // Listen for device events
    window.addEventListener('device-connected', (event) => {
      this.handleDeviceConnected(event.detail);
    });

    window.addEventListener('device-disconnected', (event) => {
      this.handleDeviceDisconnected(event.detail);
    });

    window.addEventListener('device-data', (event) => {
      this.handleDeviceData(event.detail);
    });
  }

  // Initialize MQTT connection
  async initializeMQTT() {
    try {
      // Simulate MQTT connection
      const mqttConnection = {
        id: 'mqtt-main',
        type: this.protocols.MQTT,
        connected: true,
        broker: this.config.mqttBroker,
        topics: [
          'elderx/devices/+',
          'elderx/sensors/+',
          'elderx/medical/+',
          'elderx/wearables/+'
        ]
      };

      this.connections.set('mqtt-main', mqttConnection);
      console.log('MQTT connection initialized');
    } catch (error) {
      console.error('Failed to initialize MQTT:', error);
    }
  }

  // Initialize WebSocket connections
  async initializeWebSockets() {
    try {
      // Simulate WebSocket connections for different device types
      const wsConnections = [
        {
          id: 'ws-smart-home',
          type: this.protocols.WEBSOCKET,
          connected: true,
          endpoint: `${this.config.apiEndpoint}/smart-home`,
          devices: []
        },
        {
          id: 'ws-medical',
          type: this.protocols.WEBSOCKET,
          connected: true,
          endpoint: `${this.config.apiEndpoint}/medical`,
          devices: []
        },
        {
          id: 'ws-wearables',
          type: this.protocols.WEBSOCKET,
          connected: true,
          endpoint: `${this.config.apiEndpoint}/wearables`,
          devices: []
        }
      ];

      wsConnections.forEach(connection => {
        this.connections.set(connection.id, connection);
      });

      console.log('WebSocket connections initialized');
    } catch (error) {
      console.error('Failed to initialize WebSockets:', error);
    }
  }

  // Initialize Bluetooth connections
  async initializeBluetooth() {
    try {
      if ('bluetooth' in navigator) {
        const bluetoothConnection = {
          id: 'bluetooth-main',
          type: this.protocols.BLUETOOTH,
          connected: false,
          devices: []
        };

        this.connections.set('bluetooth-main', bluetoothConnection);
        console.log('Bluetooth connection initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
    }
  }

  // Connect to IoT device
  async connectDevice(deviceConfig) {
    try {
      const device = {
        id: deviceConfig.id || `device-${Date.now()}`,
        name: deviceConfig.name,
        type: deviceConfig.type,
        protocol: deviceConfig.protocol,
        connection: deviceConfig.connection,
        status: 'connecting',
        lastSeen: new Date(),
        data: {},
        capabilities: deviceConfig.capabilities || []
      };

      // Establish connection based on protocol
      switch (device.protocol) {
        case this.protocols.MQTT:
          await this.connectMQTTDevice(device);
          break;
        case this.protocols.WEBSOCKET:
          await this.connectWebSocketDevice(device);
          break;
        case this.protocols.BLUETOOTH:
          await this.connectBluetoothDevice(device);
          break;
        case this.protocols.HTTP:
          await this.connectHTTPDevice(device);
          break;
        default:
          throw new Error(`Unsupported protocol: ${device.protocol}`);
      }

      this.devices.set(device.id, device);
      this.triggerEvent('device-connected', device);
      
      console.log(`Device connected: ${device.name}`);
      return device;
    } catch (error) {
      console.error('Failed to connect device:', error);
      throw error;
    }
  }

  // Connect MQTT device
  async connectMQTTDevice(device) {
    try {
      // Simulate MQTT device connection
      device.status = 'connected';
      device.connection = {
        broker: this.config.mqttBroker,
        topic: `elderx/devices/${device.id}`,
        qos: 1
      };

      // Start data stream
      this.startDataStream(device);
    } catch (error) {
      console.error('Failed to connect MQTT device:', error);
      throw error;
    }
  }

  // Connect WebSocket device
  async connectWebSocketDevice(device) {
    try {
      // Simulate WebSocket device connection
      device.status = 'connected';
      device.connection = {
        endpoint: `${this.config.apiEndpoint}/devices/${device.id}`,
        protocol: 'ws'
      };

      // Start data stream
      this.startDataStream(device);
    } catch (error) {
      console.error('Failed to connect WebSocket device:', error);
      throw error;
    }
  }

  // Connect Bluetooth device
  async connectBluetoothDevice(device) {
    try {
      if (!('bluetooth' in navigator)) {
        throw new Error('Bluetooth not supported');
      }

      // Simulate Bluetooth device connection
      device.status = 'connected';
      device.connection = {
        service: device.service || 'generic-access',
        characteristic: device.characteristic || 'device-name'
      };

      // Start data stream
      this.startDataStream(device);
    } catch (error) {
      console.error('Failed to connect Bluetooth device:', error);
      throw error;
    }
  }

  // Connect HTTP device
  async connectHTTPDevice(device) {
    try {
      // Simulate HTTP device connection
      device.status = 'connected';
      device.connection = {
        endpoint: `${this.config.apiEndpoint}/devices/${device.id}`,
        method: 'GET',
        interval: 5000
      };

      // Start data stream
      this.startDataStream(device);
    } catch (error) {
      console.error('Failed to connect HTTP device:', error);
      throw error;
    }
  }

  // Start data stream for device
  startDataStream(device) {
    const streamId = `stream-${device.id}`;
    
    const dataStream = {
      id: streamId,
      deviceId: device.id,
      active: true,
      interval: device.connection.interval || 1000,
      data: [],
      lastUpdate: new Date()
    };

    this.dataStreams.set(streamId, dataStream);

    // Simulate data stream
    const streamInterval = setInterval(() => {
      if (!dataStream.active) {
        clearInterval(streamInterval);
        return;
      }

      // Generate simulated data based on device type
      const data = this.generateDeviceData(device);
      this.handleDeviceData({ deviceId: device.id, data });
    }, dataStream.interval);

    console.log(`Data stream started for device: ${device.name}`);
  }

  // Generate simulated device data
  generateDeviceData(device) {
    const baseData = {
      timestamp: new Date(),
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type
    };

    switch (device.type) {
      case this.deviceTypes.WEARABLE:
        return {
          ...baseData,
          heartRate: Math.floor(Math.random() * 40) + 60,
          steps: Math.floor(Math.random() * 1000) + 100,
          calories: Math.floor(Math.random() * 50) + 10,
          sleep: Math.floor(Math.random() * 8) + 4,
          battery: Math.floor(Math.random() * 100)
        };

      case this.deviceTypes.SMART_HOME:
        return {
          ...baseData,
          temperature: Math.random() * 10 + 20,
          humidity: Math.random() * 100,
          light: Math.random() * 1000,
          motion: Math.random() < 0.3,
          doorOpen: Math.random() < 0.1,
          windowOpen: Math.random() < 0.2
        };

      case this.deviceTypes.MEDICAL_DEVICE:
        return {
          ...baseData,
          bloodPressure: Math.floor(Math.random() * 40) + 100,
          bloodSugar: Math.floor(Math.random() * 200) + 80,
          oxygenSaturation: Math.random() * 5 + 95,
          temperature: Math.random() * 2 + 97,
          weight: Math.random() * 50 + 60
        };

      case this.deviceTypes.SENSOR:
        return {
          ...baseData,
          value: Math.random() * 100,
          unit: 'units',
          threshold: 50,
          alert: Math.random() < 0.1
        };

      default:
        return {
          ...baseData,
          value: Math.random() * 100,
          status: 'active'
        };
    }
  }

  // Handle device data
  async handleDeviceData(eventData) {
    try {
      const { deviceId, data } = eventData;
      const device = this.devices.get(deviceId);
      
      if (!device) {
        console.warn(`Device not found: ${deviceId}`);
        return;
      }

      // Update device data
      device.data = data;
      device.lastSeen = new Date();

      // Store data in stream
      const streamId = `stream-${deviceId}`;
      const stream = this.dataStreams.get(streamId);
      if (stream) {
        stream.data.push(data);
        stream.lastUpdate = new Date();
        
        // Keep only last 1000 data points
        if (stream.data.length > 1000) {
          stream.data = stream.data.slice(-1000);
        }
      }

      // Analyze data with AI if enabled
      if (this.config.enableDataAnalysis) {
        await this.analyzeDeviceData(device, data);
      }

      // Check for alerts
      await this.checkDeviceAlerts(device, data);

      // Trigger data event
      this.triggerEvent('device-data', { device, data });
    } catch (error) {
      console.error('Failed to handle device data:', error);
    }
  }

  // Analyze device data with AI
  async analyzeDeviceData(device, data) {
    try {
      const analysis = await aiService.analyzeVitalSigns([data], {
        age: 75,
        conditions: ['hypertension', 'diabetes']
      });

      if (analysis) {
        device.aiAnalysis = analysis;
        this.triggerEvent('ai-analysis', { device, analysis });
      }
    } catch (error) {
      console.error('Failed to analyze device data:', error);
    }
  }

  // Check for device alerts
  async checkDeviceAlerts(device, data) {
    try {
      const alerts = [];

      // Check for abnormal values based on device type
      switch (device.type) {
        case this.deviceTypes.WEARABLE:
          if (data.heartRate > 100 || data.heartRate < 60) {
            alerts.push({
              type: 'vital-signs',
              severity: 'high',
              message: `Abnormal heart rate: ${data.heartRate} bpm`,
              device: device.name
            });
          }
          break;

        case this.deviceTypes.SMART_HOME:
          if (data.temperature > 30 || data.temperature < 15) {
            alerts.push({
              type: 'environment',
              severity: 'medium',
              message: `Extreme temperature: ${data.temperature}°C`,
              device: device.name
            });
          }
          break;

        case this.deviceTypes.MEDICAL_DEVICE:
          if (data.bloodPressure > 140 || data.bloodPressure < 90) {
            alerts.push({
              type: 'medical',
              severity: 'critical',
              message: `Abnormal blood pressure: ${data.bloodPressure}`,
              device: device.name
            });
          }
          break;
      }

      // Check for device offline
      const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();
      if (timeSinceLastSeen > 300000) { // 5 minutes
        alerts.push({
          type: 'device',
          severity: 'medium',
          message: `Device offline: ${device.name}`,
          device: device.name
        });
      }

      // Trigger alerts if any
      if (alerts.length > 0) {
        this.triggerEvent('device-alerts', { device, alerts });
      }
    } catch (error) {
      console.error('Failed to check device alerts:', error);
    }
  }

  // Disconnect device
  async disconnectDevice(deviceId) {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      // Stop data stream
      const streamId = `stream-${deviceId}`;
      const stream = this.dataStreams.get(streamId);
      if (stream) {
        stream.active = false;
        this.dataStreams.delete(streamId);
      }

      // Update device status
      device.status = 'disconnected';
      device.lastSeen = new Date();

      this.triggerEvent('device-disconnected', device);
      console.log(`Device disconnected: ${device.name}`);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      throw error;
    }
  }

  // Get device data
  getDeviceData(deviceId, timeRange = null) {
    const streamId = `stream-${deviceId}`;
    const stream = this.dataStreams.get(streamId);
    
    if (!stream) {
      return [];
    }

    let data = stream.data;
    
    if (timeRange) {
      const startTime = new Date(Date.now() - timeRange);
      data = data.filter(item => new Date(item.timestamp) >= startTime);
    }

    return data;
  }

  // Get all devices
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  // Get connected devices
  getConnectedDevices() {
    return Array.from(this.devices.values()).filter(device => device.status === 'connected');
  }

  // Get devices by type
  getDevicesByType(type) {
    return Array.from(this.devices.values()).filter(device => device.type === type);
  }

  // Send command to device
  async sendDeviceCommand(deviceId, command) {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      // Simulate command sending
      const result = {
        deviceId,
        command,
        timestamp: new Date(),
        status: 'sent',
        response: 'Command executed successfully'
      };

      this.triggerEvent('device-command', result);
      return result;
    } catch (error) {
      console.error('Failed to send device command:', error);
      throw error;
    }
  }

  // Get device analytics
  async getDeviceAnalytics(deviceId, timeRange = '24h') {
    try {
      const data = this.getDeviceData(deviceId, timeRange);
      
      if (data.length === 0) {
        return null;
      }

      // Calculate analytics
      const analytics = {
        deviceId,
        timeRange,
        dataPoints: data.length,
        average: this.calculateAverage(data),
        min: this.calculateMin(data),
        max: this.calculateMax(data),
        trends: this.calculateTrends(data),
        anomalies: this.detectAnomalies(data)
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get device analytics:', error);
      return null;
    }
  }

  // Calculate average value
  calculateAverage(data) {
    if (data.length === 0) return 0;
    
    const values = data.map(item => {
      // Get numeric value from data
      return item.heartRate || item.temperature || item.value || 0;
    });
    
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  // Calculate minimum value
  calculateMin(data) {
    if (data.length === 0) return 0;
    
    const values = data.map(item => {
      return item.heartRate || item.temperature || item.value || 0;
    });
    
    return Math.min(...values);
  }

  // Calculate maximum value
  calculateMax(data) {
    if (data.length === 0) return 0;
    
    const values = data.map(item => {
      return item.heartRate || item.temperature || item.value || 0;
    });
    
    return Math.max(...values);
  }

  // Calculate trends
  calculateTrends(data) {
    if (data.length < 2) return 'stable';
    
    const values = data.map(item => {
      return item.heartRate || item.temperature || item.value || 0;
    });
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  // Detect anomalies
  detectAnomalies(data) {
    if (data.length < 3) return [];
    
    const values = data.map(item => {
      return item.heartRate || item.temperature || item.value || 0;
    });
    
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const anomalies = [];
    values.forEach((value, index) => {
      if (Math.abs(value - mean) > 2 * stdDev) {
        anomalies.push({
          index,
          value,
          timestamp: data[index].timestamp,
          severity: Math.abs(value - mean) > 3 * stdDev ? 'high' : 'medium'
        });
      }
    });
    
    return anomalies;
  }

  // Event handlers
  handleDeviceConnected(device) {
    console.log(`Device connected: ${device.name}`);
  }

  handleDeviceDisconnected(device) {
    console.log(`Device disconnected: ${device.name}`);
  }

  // Event system
  triggerEvent(eventName, data) {
    const event = new CustomEvent(`iot-${eventName}`, { detail: data });
    window.dispatchEvent(event);
  }

  // Cleanup
  async destroy() {
    try {
      // Disconnect all devices
      for (const device of this.devices.values()) {
        await this.disconnectDevice(device.id);
      }

      // Clear all data
      this.devices.clear();
      this.connections.clear();
      this.dataStreams.clear();
      
      this.isInitialized = false;
      console.log('IoT Integration Service destroyed');
    } catch (error) {
      console.error('Failed to destroy IoT Integration Service:', error);
    }
  }
}

// Create singleton instance
const iotIntegrationService = new IoTIntegrationService();

export default iotIntegrationService;

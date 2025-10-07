"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHealthRecommendations = exports.processAIVoiceCommand = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
// Process AI voice command
const processAIVoiceCommand = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { command, userId, context: commandContext } = data;
        // Check permissions
        if (context.auth.uid !== userId && context.auth.token.role !== 'caregiver' && context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
        }
        // Get user profile for context
        const userDoc = await getDb().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        // Process the voice command using AI
        const aiResponse = await processVoiceCommandWithAI(command, userData, commandContext);
        // Log the voice command
        await getDb().collection('voiceCommands').add({
            userId,
            command,
            response: aiResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            processedBy: 'ai'
        });
        // Log the event
        await getDb().collection('auditLogs').add({
            userId: context.auth.uid,
            action: 'VOICE_COMMAND_PROCESSED',
            details: {
                targetUserId: userId,
                command,
                response: aiResponse
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip
        });
        return {
            success: true,
            response: aiResponse,
            message: 'Voice command processed successfully'
        };
    }
    catch (error) {
        console.error('Error processing voice command:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process voice command');
    }
};
exports.processAIVoiceCommand = processAIVoiceCommand;
// Generate health recommendations
const generateHealthRecommendations = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, healthData } = data;
        // Check permissions
        if (context.auth.uid !== userId && context.auth.token.role !== 'caregiver' && context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
        }
        // Get user profile and health data
        const userDoc = await getDb().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        // Get recent vital signs if not provided
        let vitalSigns = healthData === null || healthData === void 0 ? void 0 : healthData.vitalSigns;
        if (!vitalSigns) {
            const vitalSignsSnapshot = await getDb().collection('vitalSigns')
                .where('userId', '==', userId)
                .orderBy('recordedAt', 'desc')
                .limit(10)
                .get();
            vitalSigns = vitalSignsSnapshot.docs.map(doc => doc.data());
        }
        // Get current medications if not provided
        let medications = healthData === null || healthData === void 0 ? void 0 : healthData.medications;
        if (!medications) {
            const medicationsSnapshot = await getDb().collection('medications')
                .where('userId', '==', userId)
                .where('isActive', '==', true)
                .get();
            medications = medicationsSnapshot.docs.map(doc => doc.data());
        }
        // Generate AI recommendations
        const recommendations = await generateAIHealthRecommendations(userData, vitalSigns, medications, healthData === null || healthData === void 0 ? void 0 : healthData.symptoms, healthData === null || healthData === void 0 ? void 0 : healthData.recentActivities);
        // Store recommendations
        await getDb().collection('healthRecommendations').add({
            userId,
            recommendations,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            generatedBy: 'ai',
            healthData: {
                vitalSignsCount: (vitalSigns === null || vitalSigns === void 0 ? void 0 : vitalSigns.length) || 0,
                medicationsCount: (medications === null || medications === void 0 ? void 0 : medications.length) || 0,
                symptoms: (healthData === null || healthData === void 0 ? void 0 : healthData.symptoms) || [],
                recentActivities: (healthData === null || healthData === void 0 ? void 0 : healthData.recentActivities) || []
            }
        });
        // Log the event
        await getDb().collection('auditLogs').add({
            userId: context.auth.uid,
            action: 'HEALTH_RECOMMENDATIONS_GENERATED',
            details: {
                targetUserId: userId,
                recommendationsCount: recommendations.length
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip
        });
        return {
            success: true,
            recommendations,
            message: 'Health recommendations generated successfully'
        };
    }
    catch (error) {
        console.error('Error generating health recommendations:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to generate health recommendations');
    }
};
exports.generateHealthRecommendations = generateHealthRecommendations;
// Helper function to process voice command with AI
async function processVoiceCommandWithAI(command, userData, context) {
    try {
        // This would integrate with your AI service (OpenAI, Google AI, etc.)
        // For now, we'll provide a basic response structure
        const lowerCommand = command.toLowerCase();
        // Basic command processing
        if (lowerCommand.includes('medication') || lowerCommand.includes('medicine')) {
            return {
                action: 'medication_reminder',
                message: 'I can help you with medication reminders. Would you like to check your next dose?',
                suggestions: [
                    'Check next medication',
                    'Log medication taken',
                    'Set medication reminder'
                ]
            };
        }
        if (lowerCommand.includes('emergency') || lowerCommand.includes('help')) {
            return {
                action: 'emergency_alert',
                message: 'I can help you with emergency situations. Would you like me to contact your emergency contacts?',
                suggestions: [
                    'Contact emergency services',
                    'Notify family members',
                    'Contact caregiver'
                ]
            };
        }
        if (lowerCommand.includes('appointment') || lowerCommand.includes('doctor')) {
            return {
                action: 'appointment_management',
                message: 'I can help you manage your appointments. What would you like to do?',
                suggestions: [
                    'Check upcoming appointments',
                    'Schedule new appointment',
                    'Reschedule appointment'
                ]
            };
        }
        if (lowerCommand.includes('health') || lowerCommand.includes('vital')) {
            return {
                action: 'health_monitoring',
                message: 'I can help you monitor your health. Would you like to check your vital signs?',
                suggestions: [
                    'Check vital signs',
                    'Log new vital signs',
                    'View health trends'
                ]
            };
        }
        // Default response
        return {
            action: 'general_assistance',
            message: 'I\'m here to help you with your health and care needs. How can I assist you today?',
            suggestions: [
                'Medication reminders',
                'Health monitoring',
                'Emergency assistance',
                'Appointment management'
            ]
        };
    }
    catch (error) {
        console.error('Error processing voice command with AI:', error);
        return {
            action: 'error',
            message: 'I\'m sorry, I couldn\'t process that command. Please try again.',
            suggestions: ['Try rephrasing your request', 'Contact support if the issue persists']
        };
    }
}
// Helper function to generate AI health recommendations
async function generateAIHealthRecommendations(userData, vitalSigns, medications, symptoms, recentActivities) {
    try {
        const recommendations = [];
        // Analyze vital signs
        if (vitalSigns && vitalSigns.length > 0) {
            const latestVitals = vitalSigns[0];
            // Blood pressure recommendations
            if (latestVitals.type === 'blood_pressure') {
                const systolic = latestVitals.value;
                if (systolic > 140) {
                    recommendations.push({
                        type: 'health_warning',
                        category: 'blood_pressure',
                        title: 'High Blood Pressure Detected',
                        message: 'Your blood pressure is elevated. Consider consulting your doctor.',
                        priority: 'high',
                        action: 'consult_doctor'
                    });
                }
            }
            // Heart rate recommendations
            if (latestVitals.type === 'heart_rate') {
                const heartRate = latestVitals.value;
                if (heartRate > 100) {
                    recommendations.push({
                        type: 'health_warning',
                        category: 'heart_rate',
                        title: 'Elevated Heart Rate',
                        message: 'Your heart rate is higher than normal. Consider resting and monitoring.',
                        priority: 'medium',
                        action: 'rest_and_monitor'
                    });
                }
            }
        }
        // Medication adherence recommendations
        if (medications && medications.length > 0) {
            recommendations.push({
                type: 'medication_reminder',
                category: 'adherence',
                title: 'Medication Adherence',
                message: 'Remember to take your medications as prescribed by your doctor.',
                priority: 'medium',
                action: 'check_medications'
            });
        }
        // Lifestyle recommendations
        recommendations.push({
            type: 'lifestyle',
            category: 'general_health',
            title: 'Stay Active',
            message: 'Regular physical activity is important for your health. Consider light exercises.',
            priority: 'low',
            action: 'exercise_reminder'
        });
        recommendations.push({
            type: 'lifestyle',
            category: 'nutrition',
            title: 'Healthy Eating',
            message: 'Maintain a balanced diet with plenty of fruits and vegetables.',
            priority: 'low',
            action: 'nutrition_reminder'
        });
        return recommendations;
    }
    catch (error) {
        console.error('Error generating AI health recommendations:', error);
        return [{
                type: 'error',
                category: 'system',
                title: 'Recommendation Error',
                message: 'Unable to generate recommendations at this time. Please try again later.',
                priority: 'low',
                action: 'retry'
            }];
    }
}
//# sourceMappingURL=aiProcessing.js.map
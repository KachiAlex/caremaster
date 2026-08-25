/**
 * Queue Analytics API
 * 
 * Advanced analytics for queue management:
 * - Wait time trends
 * - Throughput analysis
 * - Peak hours identification
 * - Department performance
 * - Client flow analytics
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';

const QUEUE_COLLECTION = 'queues';

/**
 * Get queue analytics for a date range
 */
export const getQueueAnalytics = async (institutionId, department, startDate, endDate) => {
  try {
    const queueRef = collection(db, QUEUE_COLLECTION);
    const q = query(
      queueRef,
      where('institutionId', '==', institutionId),
      where('department', '==', department),
      where('addedAt', '>=', Timestamp.fromDate(startDate)),
      where('addedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('addedAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const queues = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      queues.push({
        id: doc.id,
        ...data,
        addedAt: data.addedAt?.toDate?.() || new Date(data.addedAt),
        calledAt: data.calledAt?.toDate?.() || data.calledAt,
        completedAt: data.completedAt?.toDate?.() || data.completedAt
      });
    });

    // Calculate analytics
    const analytics = {
      totalPatients: queues.length,
      completed: queues.filter(q => q.status === 'completed').length,
      averageWaitTime: 0,
      averageServiceTime: 0,
      peakHours: {},
      hourlyDistribution: {},
      waitTimeDistribution: {
        '0-15min': 0,
        '15-30min': 0,
        '30-60min': 0,
        '60+min': 0
      },
      throughput: {
        perHour: 0,
        perDay: 0
      },
      trends: {
        waitTimeTrend: [],
        throughputTrend: []
      }
    };

    const waitTimes = [];
    const serviceTimes = [];

    queues.forEach(queue => {
      // Calculate wait time
      if (queue.calledAt) {
        const calledAt = queue.calledAt instanceof Date ? queue.calledAt : new Date(queue.calledAt);
        const waitTime = (calledAt - queue.addedAt) / 1000 / 60; // minutes
        waitTimes.push(waitTime);

        // Categorize wait time
        if (waitTime < 15) analytics.waitTimeDistribution['0-15min']++;
        else if (waitTime < 30) analytics.waitTimeDistribution['15-30min']++;
        else if (waitTime < 60) analytics.waitTimeDistribution['30-60min']++;
        else analytics.waitTimeDistribution['60+min']++;

        // Track by hour
        const hour = queue.addedAt.getHours();
        if (!analytics.hourlyDistribution[hour]) {
          analytics.hourlyDistribution[hour] = { total: 0, waitTime: 0, count: 0 };
        }
        analytics.hourlyDistribution[hour].total++;
        analytics.hourlyDistribution[hour].waitTime += waitTime;
        analytics.hourlyDistribution[hour].count++;
      }

      // Calculate service time
      if (queue.completedAt && queue.calledAt) {
        const calledAt = queue.calledAt instanceof Date ? queue.calledAt : new Date(queue.calledAt);
        const completedAt = queue.completedAt instanceof Date ? queue.completedAt : new Date(queue.completedAt);
        const serviceTime = (completedAt - calledAt) / 1000 / 60; // minutes
        serviceTimes.push(serviceTime);
      }
    });

    // Calculate averages
    if (waitTimes.length > 0) {
      analytics.averageWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    }

    if (serviceTimes.length > 0) {
      analytics.averageServiceTime = serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length;
    }

    // Identify peak hours
    Object.keys(analytics.hourlyDistribution).forEach(hour => {
      const data = analytics.hourlyDistribution[hour];
      const avgWait = data.count > 0 ? data.waitTime / data.count : 0;
      analytics.hourlyDistribution[hour].averageWaitTime = avgWait;
      
      if (data.total > 5) { // Peak if more than 5 clients
        analytics.peakHours[hour] = {
          patientCount: data.total,
          averageWaitTime: avgWait
        };
      }
    });

    // Calculate throughput
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      analytics.throughput.perDay = analytics.completed / daysDiff;
      analytics.throughput.perHour = analytics.throughput.perDay / 8; // Assuming 8-hour day
    }

    // Calculate trends (daily)
    const dailyData = {};
    queues.forEach(queue => {
      const date = queue.addedAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, completed: 0, waitTimes: [] };
      }
      dailyData[date].total++;
      if (queue.status === 'completed') dailyData[date].completed++;
      if (queue.calledAt) {
        const calledAt = queue.calledAt instanceof Date ? queue.calledAt : new Date(queue.calledAt);
        const waitTime = (calledAt - queue.addedAt) / 1000 / 60;
        dailyData[date].waitTimes.push(waitTime);
      }
    });

    Object.keys(dailyData).sort().forEach(date => {
      const data = dailyData[date];
      analytics.trends.throughputTrend.push({
        date,
        count: data.completed
      });
      if (data.waitTimes.length > 0) {
        analytics.trends.waitTimeTrend.push({
          date,
          averageWaitTime: data.waitTimes.reduce((a, b) => a + b, 0) / data.waitTimes.length
        });
      }
    });

    return analytics;
  } catch (error) {
    console.error('Error getting queue analytics:', error);
    throw error;
  }
};

/**
 * Get queue position for a Client with real-time updates
 */
export const getPatientQueuePosition = async (clientId, institutionId, department) => {
  try {
    const { getQueueByDepartment } = await import('./queueAPI');
    const waitingQueues = await getQueueByDepartment(institutionId, department, {
      status: 'waiting'
    });

    const patientQueue = waitingQueues.find(q => q.clientId === clientId);
    if (!patientQueue) {
      return null;
    }

    const position = waitingQueues.filter(q => 
      q.queueNumber < patientQueue.queueNumber
    ).length + 1;

    // Estimate wait time based on average service time
    const { getQueueStats } = await import('./queueAPI');
    const stats = await getQueueStats(institutionId, department);
    const estimatedWaitTime = stats.averageServiceTime 
      ? (position - 1) * stats.averageServiceTime 
      : (position - 1) * 15; // Default 15 minutes per Client

    return {
      queueNumber: patientQueue.queueNumber,
      position,
      estimatedWaitTime: Math.round(estimatedWaitTime),
      department
    };
  } catch (error) {
    console.error('Error getting Client queue position:', error);
    throw error;
  }
};

/**
 * Get department performance comparison
 */
export const getDepartmentPerformance = async (institutionId, startDate, endDate) => {
  try {
    const departments = ['gp', 'specialist', 'lab', 'pharmacy', 'billing', 'radiology', 'triage'];
    const performance = {};

    for (const dept of departments) {
      try {
        const analytics = await getQueueAnalytics(institutionId, dept, startDate, endDate);
        performance[dept] = {
          totalPatients: analytics.totalPatients,
          averageWaitTime: analytics.averageWaitTime,
          averageServiceTime: analytics.averageServiceTime,
          throughput: analytics.throughput.perDay,
          completionRate: analytics.totalPatients > 0 
            ? (analytics.completed / analytics.totalPatients) * 100 
            : 0
        };
      } catch (error) {
        console.warn(`Error getting analytics for ${dept}:`, error);
        performance[dept] = null;
      }
    }

    return performance;
  } catch (error) {
    console.error('Error getting department performance:', error);
    throw error;
  }
};

export default {
  getQueueAnalytics,
  getPatientQueuePosition,
  getDepartmentPerformance
};


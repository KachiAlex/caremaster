import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  where,
  orderBy,
  limit,
  startAt,
  endAt,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export const analyticsAPI = {
  // Get overview analytics
  getOverviewAnalytics: async (dateRange = {}) => {
    try {
      const overview = {
        totalUsers: 0,
        activeCaregivers: 0,
        totalAppointments: 0,
        emergencyAlerts: 0,
        medicationCompliance: 0,
        systemUptime: 99.8,
        userGrowth: 0,
        caregiverSatisfaction: 0
      };

      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      overview.totalUsers = usersSnapshot.size;

      // Get active caregivers
      const caregiversQuery = query(
        collection(db, 'caregivers'),
        where('status', '==', 'active')
      );
      const caregiversSnapshot = await getDocs(caregiversQuery);
      overview.activeCaregivers = caregiversSnapshot.size;

      // Get total appointments
      const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
      overview.totalAppointments = appointmentsSnapshot.size;

      // Get emergency alerts
      const emergencyQuery = query(
        collection(db, 'emergencies'),
        where('status', '==', 'active')
      );
      const emergencySnapshot = await getDocs(emergencyQuery);
      overview.emergencyAlerts = emergencySnapshot.size;

      // Calculate medication compliance
      const medicationLogsSnapshot = await getDocs(collection(db, 'medicationLogs'));
      const totalLogs = medicationLogsSnapshot.size;
      const completedLogs = medicationLogsSnapshot.docs.filter(doc => 
        doc.data().status === 'taken'
      ).length;
      overview.medicationCompliance = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;

      // Calculate user growth (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );
      const recentUsersSnapshot = await getDocs(recentUsersQuery);

      const previousUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(sixtyDaysAgo)),
        where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      );
      const previousUsersSnapshot = await getDocs(previousUsersQuery);

      const recentCount = recentUsersSnapshot.size;
      const previousCount = previousUsersSnapshot.size;
      overview.userGrowth = previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0;

      // Calculate average caregiver satisfaction
      const caregiverRatings = [];
      caregiversSnapshot.forEach(doc => {
        const rating = doc.data().rating;
        if (rating > 0) {
          caregiverRatings.push(rating);
        }
      });
      overview.caregiverSatisfaction = caregiverRatings.length > 0 
        ? caregiverRatings.reduce((sum, rating) => sum + rating, 0) / caregiverRatings.length 
        : 0;

      return overview;
    } catch (error) {
      console.error('Error fetching overview analytics:', error);
      throw error;
    }
  },

  // Get user analytics
  getUserAnalytics: async (dateRange = {}) => {
    try {
      const userAnalytics = {
        totalUsers: 0,
        newUsersThisMonth: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        userRetention: 0,
        averageAge: 0,
        genderDistribution: {},
        locationDistribution: {},
        registrationTrend: []
      };

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      userAnalytics.totalUsers = usersSnapshot.size;

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
      );
      const newUsersSnapshot = await getDocs(newUsersQuery);
      userAnalytics.newUsersThisMonth = newUsersSnapshot.size;

      // Calculate active vs inactive users
      let activeCount = 0;
      let inactiveCount = 0;
      let totalAge = 0;
      let ageCount = 0;
      const genderCounts = { male: 0, female: 0, other: 0 };
      const locationCounts = {};

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        
        // Check if user is active (has recent activity)
        const lastActive = userData.lastActive?.toDate();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (lastActive && lastActive > sevenDaysAgo) {
          activeCount++;
        } else {
          inactiveCount++;
        }

        // Calculate average age
        if (userData.age) {
          totalAge += userData.age;
          ageCount++;
        }

        // Count gender distribution
        const gender = userData.gender?.toLowerCase() || 'other';
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;

        // Count location distribution
        const location = userData.location || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      userAnalytics.activeUsers = activeCount;
      userAnalytics.inactiveUsers = inactiveCount;
      userAnalytics.averageAge = ageCount > 0 ? totalAge / ageCount : 0;
      userAnalytics.userRetention = userAnalytics.totalUsers > 0 ? (activeCount / userAnalytics.totalUsers) * 100 : 0;

      // Convert gender counts to percentages
      const totalGenderCount = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
      userAnalytics.genderDistribution = {
        male: totalGenderCount > 0 ? (genderCounts.male / totalGenderCount) * 100 : 0,
        female: totalGenderCount > 0 ? (genderCounts.female / totalGenderCount) * 100 : 0,
        other: totalGenderCount > 0 ? (genderCounts.other / totalGenderCount) * 100 : 0
      };

      // Convert location counts to percentages
      const totalLocationCount = Object.values(locationCounts).reduce((sum, count) => sum + count, 0);
      userAnalytics.locationDistribution = {};
      Object.entries(locationCounts).forEach(([location, count]) => {
        userAnalytics.locationDistribution[location] = totalLocationCount > 0 ? (count / totalLocationCount) * 100 : 0;
      });

      // Get registration trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const registrationTrendQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('createdAt', 'asc')
      );
      const registrationTrendSnapshot = await getDocs(registrationTrendQuery);

      // Group by month
      const monthlyCounts = {};
      registrationTrendSnapshot.forEach(doc => {
        const createdAt = doc.data().createdAt?.toDate();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
        }
      });

      // Convert to array format
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      userAnalytics.registrationTrend = Object.entries(monthlyCounts).map(([monthKey, count]) => {
        const [year, month] = monthKey.split('-');
        return {
          month: monthNames[parseInt(month) - 1],
          count: count
        };
      });

      return userAnalytics;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  },

  // Get caregiver analytics
  getCaregiverAnalytics: async (dateRange = {}) => {
    try {
      const caregiverAnalytics = {
        totalCaregivers: 0,
        activeCaregivers: 0,
        pendingCaregivers: 0,
        inactiveCaregivers: 0,
        averageRating: 0,
        averageExperience: 0,
        topPerformers: [],
        performanceDistribution: {},
        specializations: {}
      };

      // Get all caregivers
      const caregiversSnapshot = await getDocs(collection(db, 'caregivers'));
      caregiverAnalytics.totalCaregivers = caregiversSnapshot.size;

      let activeCount = 0;
      let pendingCount = 0;
      let inactiveCount = 0;
      let totalRating = 0;
      let ratingCount = 0;
      let totalExperience = 0;
      let experienceCount = 0;
      const performanceCounts = { excellent: 0, good: 0, average: 0, belowAverage: 0 };
      const specializationCounts = {};
      const topPerformers = [];

      caregiversSnapshot.forEach(doc => {
        const caregiverData = doc.data();
        
        // Count by status
        switch (caregiverData.status) {
          case 'active':
            activeCount++;
            break;
          case 'pending':
            pendingCount++;
            break;
          case 'inactive':
            inactiveCount++;
            break;
        }

        // Calculate average rating
        if (caregiverData.rating > 0) {
          totalRating += caregiverData.rating;
          ratingCount++;
        }

        // Calculate average experience
        if (caregiverData.experience) {
          const experienceYears = parseFloat(caregiverData.experience.replace(/\D/g, ''));
          if (!isNaN(experienceYears)) {
            totalExperience += experienceYears;
            experienceCount++;
          }
        }

        // Categorize performance
        if (caregiverData.rating >= 4.5) {
          performanceCounts.excellent++;
        } else if (caregiverData.rating >= 4.0) {
          performanceCounts.good++;
        } else if (caregiverData.rating >= 3.5) {
          performanceCounts.average++;
        } else if (caregiverData.rating > 0) {
          performanceCounts.belowAverage++;
        }

        // Count specializations
        if (caregiverData.specializations) {
          caregiverData.specializations.forEach(spec => {
            specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;
          });
        }

        // Collect top performers
        if (caregiverData.rating >= 4.5 && caregiverData.status === 'active') {
          topPerformers.push({
            id: doc.id,
            name: caregiverData.name,
            rating: caregiverData.rating,
            patients: caregiverData.currentPatients || 0,
            earnings: caregiverData.earnings?.thisMonth || 0
          });
        }
      });

      caregiverAnalytics.activeCaregivers = activeCount;
      caregiverAnalytics.pendingCaregivers = pendingCount;
      caregiverAnalytics.inactiveCaregivers = inactiveCount;
      caregiverAnalytics.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
      caregiverAnalytics.averageExperience = experienceCount > 0 ? totalExperience / experienceCount : 0;

      // Sort and limit top performers
      caregiverAnalytics.topPerformers = topPerformers
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);

      // Format performance distribution
      caregiverAnalytics.performanceDistribution = {
        'Excellent (4.5+)': performanceCounts.excellent,
        'Good (4.0-4.4)': performanceCounts.good,
        'Average (3.5-3.9)': performanceCounts.average,
        'Below Average (<3.5)': performanceCounts.belowAverage
      };

      caregiverAnalytics.specializations = specializationCounts;

      return caregiverAnalytics;
    } catch (error) {
      console.error('Error fetching caregiver analytics:', error);
      throw error;
    }
  },

  // Get emergency analytics
  getEmergencyAnalytics: async (dateRange = {}) => {
    try {
      const emergencyAnalytics = {
        totalEmergencies: 0,
        resolvedEmergencies: 0,
        activeEmergencies: 0,
        averageResponseTime: 0,
        emergencyTypes: {},
        responseTimeTrend: [],
        severityDistribution: {}
      };

      // Get all emergencies
      const emergenciesSnapshot = await getDocs(collection(db, 'emergencies'));
      emergencyAnalytics.totalEmergencies = emergenciesSnapshot.size;

      let resolvedCount = 0;
      let activeCount = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;
      const typeCounts = {};
      const severityCounts = {};

      emergenciesSnapshot.forEach(doc => {
        const emergencyData = doc.data();
        
        // Count by status
        if (emergencyData.status === 'resolved') {
          resolvedCount++;
        } else if (emergencyData.status === 'active') {
          activeCount++;
        }

        // Calculate response time
        if (emergencyData.responseTime) {
          totalResponseTime += emergencyData.responseTime;
          responseTimeCount++;
        }

        // Count emergency types
        const type = emergencyData.type || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;

        // Count severity
        const severity = emergencyData.severity || 'Medium';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });

      emergencyAnalytics.resolvedEmergencies = resolvedCount;
      emergencyAnalytics.activeEmergencies = activeCount;
      emergencyAnalytics.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
      emergencyAnalytics.emergencyTypes = typeCounts;
      emergencyAnalytics.severityDistribution = severityCounts;

      // Get response time trend (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentEmergenciesQuery = query(
        collection(db, 'emergencies'),
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('createdAt', 'asc')
      );
      const recentEmergenciesSnapshot = await getDocs(recentEmergenciesQuery);

      // Group by day
      const dailyResponseTimes = {};
      recentEmergenciesSnapshot.forEach(doc => {
        const emergencyData = doc.data();
        const createdAt = emergencyData.createdAt?.toDate();
        if (createdAt && emergencyData.responseTime) {
          const dayKey = createdAt.toLocaleDateString('en-US', { weekday: 'short' });
          if (!dailyResponseTimes[dayKey]) {
            dailyResponseTimes[dayKey] = { total: 0, count: 0 };
          }
          dailyResponseTimes[dayKey].total += emergencyData.responseTime;
          dailyResponseTimes[dayKey].count += 1;
        }
      });

      // Convert to array format
      emergencyAnalytics.responseTimeTrend = Object.entries(dailyResponseTimes).map(([day, data]) => ({
        day: day,
        time: data.count > 0 ? data.total / data.count : 0
      }));

      return emergencyAnalytics;
    } catch (error) {
      console.error('Error fetching emergency analytics:', error);
      throw error;
    }
  },

  // Get medication analytics
  getMedicationAnalytics: async (dateRange = {}) => {
    try {
      const medicationAnalytics = {
        totalMedications: 0,
        complianceRate: 0,
        missedDoses: 0,
        medicationErrors: 0,
        averageAdherence: 0,
        medicationTypes: {},
        complianceTrend: []
      };

      // Get all medications
      const medicationsSnapshot = await getDocs(collection(db, 'medications'));
      medicationAnalytics.totalMedications = medicationsSnapshot.size;

      // Get medication logs
      const medicationLogsSnapshot = await getDocs(collection(db, 'medicationLogs'));
      
      let totalLogs = 0;
      let takenLogs = 0;
      let missedLogs = 0;
      let errorLogs = 0;
      const typeCounts = {};

      medicationLogsSnapshot.forEach(doc => {
        const logData = doc.data();
        totalLogs++;

        // Count by status
        switch (logData.status) {
          case 'taken':
            takenLogs++;
            break;
          case 'missed':
            missedLogs++;
            break;
          case 'error':
            errorLogs++;
            break;
        }

        // Count medication types
        if (logData.medicationType) {
          typeCounts[logData.medicationType] = (typeCounts[logData.medicationType] || 0) + 1;
        }
      });

      medicationAnalytics.complianceRate = totalLogs > 0 ? (takenLogs / totalLogs) * 100 : 0;
      medicationAnalytics.missedDoses = missedLogs;
      medicationAnalytics.medicationErrors = errorLogs;
      medicationAnalytics.averageAdherence = medicationAnalytics.complianceRate;
      medicationAnalytics.medicationTypes = typeCounts;

      // Get compliance trend (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const recentLogsQuery = query(
        collection(db, 'medicationLogs'),
        where('scheduledTime', '>=', Timestamp.fromDate(fourWeeksAgo)),
        orderBy('scheduledTime', 'asc')
      );
      const recentLogsSnapshot = await getDocs(recentLogsQuery);

      // Group by week
      const weeklyCompliance = {};
      recentLogsSnapshot.forEach(doc => {
        const logData = doc.data();
        const scheduledTime = logData.scheduledTime?.toDate();
        if (scheduledTime) {
          const weekNumber = Math.ceil((new Date() - scheduledTime) / (7 * 24 * 60 * 60 * 1000));
          const weekKey = `Week ${weekNumber}`;
          
          if (!weeklyCompliance[weekKey]) {
            weeklyCompliance[weekKey] = { total: 0, taken: 0 };
          }
          weeklyCompliance[weekKey].total++;
          if (logData.status === 'taken') {
            weeklyCompliance[weekKey].taken++;
          }
        }
      });

      // Convert to array format
      medicationAnalytics.complianceTrend = Object.entries(weeklyCompliance).map(([week, data]) => ({
        week: week,
        rate: data.total > 0 ? (data.taken / data.total) * 100 : 0
      }));

      return medicationAnalytics;
    } catch (error) {
      console.error('Error fetching medication analytics:', error);
      throw error;
    }
  },

  // Get financial analytics
  getFinancialAnalytics: async (dateRange = {}) => {
    try {
      const financialAnalytics = {
        totalRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        averageTransactionValue: 0,
        revenueByService: {},
        paymentMethods: {},
        monthlyRevenueTrend: []
      };

      // Get all transactions
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      
      let totalRevenue = 0;
      let transactionCount = 0;
      const serviceRevenue = {};
      const paymentMethodCounts = {};
      const monthlyRevenue = {};

      transactionsSnapshot.forEach(doc => {
        const transactionData = doc.data();
        const amount = transactionData.amount || 0;
        totalRevenue += amount;
        transactionCount++;

        // Count by service
        const service = transactionData.service || 'Other';
        serviceRevenue[service] = (serviceRevenue[service] || 0) + amount;

        // Count payment methods
        const paymentMethod = transactionData.paymentMethod || 'Unknown';
        paymentMethodCounts[paymentMethod] = (paymentMethodCounts[paymentMethod] || 0) + 1;

        // Group by month
        const createdAt = transactionData.createdAt?.toDate();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amount;
        }
      });

      financialAnalytics.totalRevenue = totalRevenue;
      financialAnalytics.averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
      financialAnalytics.revenueByService = serviceRevenue;

      // Calculate payment method percentages
      const totalPaymentCount = Object.values(paymentMethodCounts).reduce((sum, count) => sum + count, 0);
      financialAnalytics.paymentMethods = {};
      Object.entries(paymentMethodCounts).forEach(([method, count]) => {
        financialAnalytics.paymentMethods[method] = totalPaymentCount > 0 ? (count / totalPaymentCount) * 100 : 0;
      });

      // Get current month revenue
      const currentMonth = new Date();
      const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      financialAnalytics.monthlyRevenue = monthlyRevenue[currentMonthKey] || 0;

      // Calculate revenue growth (current month vs previous month)
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
      const previousMonthRevenue = monthlyRevenue[previousMonthKey] || 0;
      
      financialAnalytics.revenueGrowth = previousMonthRevenue > 0 
        ? ((financialAnalytics.monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;

      // Convert monthly revenue to array format
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      financialAnalytics.monthlyRevenueTrend = Object.entries(monthlyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Last 6 months
        .map(([monthKey, revenue]) => {
          const [year, month] = monthKey.split('-');
          return {
            month: monthNames[parseInt(month) - 1],
            revenue: revenue
          };
        });

      return financialAnalytics;
    } catch (error) {
      console.error('Error fetching financial analytics:', error);
      throw error;
    }
  },

  // Get geographic analytics
  getGeographicAnalytics: async () => {
    try {
      const geographicAnalytics = {
        userDistribution: {},
        caregiverDistribution: {},
        serviceAreas: []
      };

      // Get user distribution
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userLocationCounts = {};
      
      usersSnapshot.forEach(doc => {
        const location = doc.data().location || 'Unknown';
        userLocationCounts[location] = (userLocationCounts[location] || 0) + 1;
      });

      geographicAnalytics.userDistribution = userLocationCounts;

      // Get caregiver distribution
      const caregiversSnapshot = await getDocs(collection(db, 'caregivers'));
      const caregiverLocationCounts = {};
      
      caregiversSnapshot.forEach(doc => {
        const location = doc.data().location || 'Unknown';
        caregiverLocationCounts[location] = (caregiverLocationCounts[location] || 0) + 1;
      });

      geographicAnalytics.caregiverDistribution = caregiverLocationCounts;

      // Calculate service areas with coverage
      const allLocations = new Set([
        ...Object.keys(userLocationCounts),
        ...Object.keys(caregiverLocationCounts)
      ]);

      geographicAnalytics.serviceAreas = Array.from(allLocations).map(location => {
        const userCount = userLocationCounts[location] || 0;
        const caregiverCount = caregiverLocationCounts[location] || 0;
        
        // Calculate coverage based on caregiver-to-user ratio
        const coverage = userCount > 0 ? Math.min((caregiverCount / userCount) * 100, 100) : 0;
        
        return {
          city: location,
          coverage: Math.round(coverage),
          users: userCount,
          caregivers: caregiverCount
        };
      }).sort((a, b) => b.users - a.users);

      return geographicAnalytics;
    } catch (error) {
      console.error('Error fetching geographic analytics:', error);
      throw error;
    }
  },

  // Get trend analytics
  getTrendAnalytics: async (dateRange = {}) => {
    try {
      const trendAnalytics = {
        userGrowth: [],
        caregiverGrowth: [],
        serviceDemand: {}
      };

      // Get user growth trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const userGrowthQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('createdAt', 'asc')
      );
      const userGrowthSnapshot = await getDocs(userGrowthQuery);

      // Group by month and calculate growth
      const monthlyUserCounts = {};
      userGrowthSnapshot.forEach(doc => {
        const createdAt = doc.data().createdAt?.toDate();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          monthlyUserCounts[monthKey] = (monthlyUserCounts[monthKey] || 0) + 1;
        }
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sortedMonths = Object.keys(monthlyUserCounts).sort();
      
      trendAnalytics.userGrowth = sortedMonths.map((monthKey, index) => {
        const [year, month] = monthKey.split('-');
        const currentCount = monthlyUserCounts[monthKey];
        const previousCount = index > 0 ? monthlyUserCounts[sortedMonths[index - 1]] : 0;
        const growth = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
        
        return {
          month: monthNames[parseInt(month) - 1],
          growth: Math.round(growth * 10) / 10
        };
      });

      // Get caregiver growth trend
      const caregiverGrowthQuery = query(
        collection(db, 'caregivers'),
        where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('createdAt', 'asc')
      );
      const caregiverGrowthSnapshot = await getDocs(caregiverGrowthQuery);

      const monthlyCaregiverCounts = {};
      caregiverGrowthSnapshot.forEach(doc => {
        const createdAt = doc.data().createdAt?.toDate();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          monthlyCaregiverCounts[monthKey] = (monthlyCaregiverCounts[monthKey] || 0) + 1;
        }
      });

      const sortedCaregiverMonths = Object.keys(monthlyCaregiverCounts).sort();
      trendAnalytics.caregiverGrowth = sortedCaregiverMonths.map((monthKey, index) => {
        const [year, month] = monthKey.split('-');
        const currentCount = monthlyCaregiverCounts[monthKey];
        const previousCount = index > 0 ? monthlyCaregiverCounts[sortedCaregiverMonths[index - 1]] : 0;
        const growth = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
        
        return {
          month: monthNames[parseInt(month) - 1],
          growth: Math.round(growth * 10) / 10
        };
      });

      // Calculate service demand based on appointment types
      const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
      const serviceCounts = {};
      const totalAppointments = appointmentsSnapshot.size;

      appointmentsSnapshot.forEach(doc => {
        const appointmentData = doc.data();
        const serviceType = appointmentData.serviceType || 'General Consultation';
        serviceCounts[serviceType] = (serviceCounts[serviceType] || 0) + 1;
      });

      // Convert to percentages
      trendAnalytics.serviceDemand = {};
      Object.entries(serviceCounts).forEach(([service, count]) => {
        trendAnalytics.serviceDemand[service] = totalAppointments > 0 ? (count / totalAppointments) * 100 : 0;
      });

      return trendAnalytics;
    } catch (error) {
      console.error('Error fetching trend analytics:', error);
      throw error;
    }
  },

  // Get comprehensive analytics
  getAllAnalytics: async (dateRange = {}) => {
    try {
      const [
        overview,
        userAnalytics,
        caregiverAnalytics,
        emergencyAnalytics,
        medicationAnalytics,
        financialAnalytics,
        geographicAnalytics,
        trendAnalytics
      ] = await Promise.all([
        analyticsAPI.getOverviewAnalytics(dateRange),
        analyticsAPI.getUserAnalytics(dateRange),
        analyticsAPI.getCaregiverAnalytics(dateRange),
        analyticsAPI.getEmergencyAnalytics(dateRange),
        analyticsAPI.getMedicationAnalytics(dateRange),
        analyticsAPI.getFinancialAnalytics(dateRange),
        analyticsAPI.getGeographicAnalytics(),
        analyticsAPI.getTrendAnalytics(dateRange)
      ]);

      return {
        overview,
        userMetrics: userAnalytics,
        caregiverMetrics: caregiverAnalytics,
        emergencyMetrics: emergencyAnalytics,
        medicationMetrics: medicationAnalytics,
        financialMetrics: financialAnalytics,
        geographicData: geographicAnalytics,
        trends: trendAnalytics
      };
    } catch (error) {
      console.error('Error fetching all analytics:', error);
      throw error;
    }
  }
};

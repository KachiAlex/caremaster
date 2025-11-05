# 🎯 Caregiver Wage Calculation System

## Overview

This document describes the comprehensive wage calculation system for Care Master, which automatically tracks caregiver work hours and calculates earnings based on hourly or monthly rates.

---

## 📊 **Wage Structure Options**

### **Option 1: Hourly Rate (Activity-Based Tracking) ⭐ RECOMMENDED**

**How It Works:**
- Each ADL activity has an estimated duration (e.g., bathing = 30 min, meal prep = 1 hour)
- System automatically logs time when caregiver completes activities
- Total hours calculated by summing all activity durations
- Wages = Total Hours × Hourly Rate

**Advantages:**
- ✅ Accurate tracking based on actual work performed
- ✅ Automatic time calculation from ADL logs
- ✅ Fair payment for work done
- ✅ Easy to audit and verify
- ✅ Works well with multiple clients

**Example:**
```
Caregiver: Jane Smith
Hourly Rate: $20/hour
Date: Oct 21, 2025

Activities Logged:
- Bathing (Client A)          0.5 hours  → $10.00
- Meal Preparation (Client A) 1.0 hours  → $20.00
- Medication Setup (Client B) 0.25 hours → $5.00
- Light Housekeeping (Client B) 1.0 hours → $20.00
- Transportation (Client C)   2.0 hours  → $40.00
────────────────────────────────────────────────
TOTAL:                        4.75 hours → $95.00
```

---

### **Option 2: Hourly Rate (Clock-In/Clock-Out)**

**How It Works:**
- Caregiver clocks in at start of shift
- Clocks out at end of shift
- System calculates exact hours worked
- Supports overtime (1.5x after 40 hours/week)

**Advantages:**
- ✅ Most accurate for shift-based work
- ✅ Automatic overtime calculation
- ✅ Simple for caregivers to use
- ✅ Standard industry practice

**Example:**
```
Week of Oct 15-21, 2025
Standard Rate: $18/hour
Overtime Rate: $27/hour (1.5x)

Monday:    Clock In: 8:00 AM  | Clock Out: 4:00 PM  = 8 hours
Tuesday:   Clock In: 8:00 AM  | Clock Out: 4:00 PM  = 8 hours
Wednesday: Clock In: 8:00 AM  | Clock Out: 4:00 PM  = 8 hours
Thursday:  Clock In: 8:00 AM  | Clock Out: 4:00 PM  = 8 hours
Friday:    Clock In: 8:00 AM  | Clock Out: 4:00 PM  = 8 hours
Saturday:  Clock In: 9:00 AM  | Clock Out: 3:00 PM  = 6 hours
────────────────────────────────────────────────────────────
Regular Hours (40):  40 hours × $18 = $720.00
Overtime Hours (6):   6 hours × $27 = $162.00
────────────────────────────────────────────────────────────
TOTAL:               46 hours → $882.00
```

---

### **Option 3: Monthly Flat Rate**

**How It Works:**
- Caregiver receives fixed monthly salary
- Attendance tracked for accountability
- Payment prorated based on days worked (optional)

**Advantages:**
- ✅ Predictable payroll costs
- ✅ Simple accounting
- ✅ Good for full-time staff
- ✅ Reduces administrative overhead

**Example:**
```
Caregiver: John Doe
Monthly Rate: $3,000/month
Month: October 2025
Days in Month: 31
Days Worked: 28

Option A (Full Payment):
  Total Payment: $3,000.00

Option B (Prorated):
  Per Day Rate: $3,000 ÷ 31 = $96.77/day
  Payment: 28 days × $96.77 = $2,709.68
```

---

## 🔧 **Activity Duration Estimates**

### **Personal Care**
| Activity | Duration | Hourly Cost @ $20/hr |
|----------|----------|----------------------|
| Bathing | 30 min (0.5h) | $10.00 |
| Dressing | 15 min (0.25h) | $5.00 |
| Grooming | 15 min (0.25h) | $5.00 |
| Hair Care | 15 min (0.25h) | $5.00 |

### **Nutrition & Feeding**
| Activity | Duration | Hourly Cost @ $20/hr |
|----------|----------|----------------------|
| Meal Preparation | 60 min (1.0h) | $20.00 |
| Feeding/Assist Eating | 30 min (0.5h) | $10.00 |
| Special Diet Prep | 60 min (1.0h) | $20.00 |

### **Mobility & Transfers**
| Activity | Duration | Hourly Cost @ $20/hr |
|----------|----------|----------------------|
| Walking Assistance | 15 min (0.25h) | $5.00 |
| Exercise Assistance | 30 min (0.5h) | $10.00 |
| Transfers | 10 min (0.15h) | $3.00 |

### **Household Tasks**
| Activity | Duration | Hourly Cost @ $20/hr |
|----------|----------|----------------------|
| Light Housekeeping | 60 min (1.0h) | $20.00 |
| Laundry | 60 min (1.0h) | $20.00 |
| Meal Cleanup | 30 min (0.5h) | $10.00 |

### **Transportation**
| Activity | Duration | Hourly Cost @ $20/hr |
|----------|----------|----------------------|
| Doctor Appointments | 120 min (2.0h) | $40.00 |
| Errands | 90 min (1.5h) | $30.00 |

### **Social & Companionship**
| Activity | Duration | Hourly Cost @ $20/hr |
|----------|----------|----------------------|
| Companionship | 60 min (1.0h) | $20.00 |
| Games/Activities | 60 min (1.0h) | $20.00 |
| Respite Care | 240 min (4.0h) | $80.00 |

---

## 📝 **Data Captured for Each Activity Log**

### **Comprehensive Logging Fields:**

```javascript
{
  // Client Information
  clientId: "abc123",
  clientName: "John Doe",
  
  // Activity Information
  activityId: "bathing",
  activityName: "Bathing",
  activityCategory: "personal-care",
  status: "completed",
  notes: "Client bathed independently with minimal assistance",
  
  // Caregiver Information (Complete Attribution)
  caregiverId: "caregiver123",
  caregiverName: "Jane Smith",
  caregiverEmail: "jane.smith@Care Master.com",
  caregiverRole: "caregiver",
  caregiverPhone: "+1234567890",
  
  // Timestamp Information (For Accurate Time Tracking)
  loggedAt: "2025-10-21T14:30:00.000Z",       // ISO 8601 format
  loggedDate: "2025-10-21",                    // YYYY-MM-DD
  loggedTime: "14:30:00",                      // HH:MM:SS
  dayOfWeek: "Monday",                         // Day name
  weekNumber: 42,                              // ISO week number
  month: 10,                                   // Month number
  year: 2025,                                  // Year
  
  // Duration Tracking
  duration: 0.5,                               // Hours
  durationUnit: "hours",
  
  // Additional Metadata
  institutionId: "inst456",
  logSource: "adl_logger",
  deviceInfo: {
    userAgent: "Mozilla/5.0...",
    platform: "Win32",
    timestamp: "2025-10-21T14:30:00.000Z"
  },
  
  // Firestore Timestamps
  timestamp: Timestamp,                        // Firestore server timestamp
  createdAt: Timestamp                         // Firestore server timestamp
}
```

---

## 🎯 **Wage Calculation Formulas**

### **1. Activity-Based Hourly Calculation**

```javascript
// For each activity log
activityCost = duration (hours) × hourlyRate

// Total for period
totalHours = sum of all activity durations
totalWages = totalHours × hourlyRate

// Example:
Activities = [
  { duration: 0.5, rate: 20 },  // $10
  { duration: 1.0, rate: 20 },  // $20
  { duration: 0.25, rate: 20 }  // $5
]
totalWages = (0.5 + 1.0 + 0.25) × 20 = $35.00
```

### **2. Clock-Based Hourly Calculation with Overtime**

```javascript
// Calculate hours per week
regularHoursPerWeek = 40
overtimeRate = 1.5 × hourlyRate

if (weeklyHours <= regularHoursPerWeek) {
  regularPay = weeklyHours × hourlyRate
  overtimePay = 0
} else {
  regularPay = regularHoursPerWeek × hourlyRate
  overtimeHours = weeklyHours - regularHoursPerWeek
  overtimePay = overtimeHours × hourlyRate × 1.5
}

totalPay = regularPay + overtimePay

// Example:
weeklyHours = 46
hourlyRate = 18
regularPay = 40 × 18 = $720
overtimePay = 6 × 18 × 1.5 = $162
totalPay = $882
```

### **3. Monthly Rate Calculation**

```javascript
// Full payment (no prorating)
monthlyWage = fixedMonthlyRate

// Prorated payment (based on attendance)
daysWorked = count of days with clock-ins
daysInMonth = total days in month
dailyRate = monthlyRate / daysInMonth
proratedWage = daysWorked × dailyRate

// Example:
monthlyRate = 3000
daysInMonth = 31
daysWorked = 28
proratedWage = 28 × (3000 / 31) = $2,709.68
```

---

## 🔄 **Recommended Implementation Flow**

### **Phase 1: Activity-Based Tracking (Current)**
1. ✅ ADL Logger automatically tracks activity durations
2. ✅ Each activity has predefined duration estimate
3. ✅ Complete caregiver details captured
4. ✅ Timestamps logged for every activity
5. ✅ Data stored in `adlLogs` collection

### **Phase 2: Wage Calculation (Add to Admin Dashboard)**
1. Admin sets hourly/monthly rate for each caregiver
2. System calculates wages for selected date range
3. Breakdown shows:
   - Total hours worked
   - Hours per client
   - Activity-by-activity breakdown
   - Total earnings
4. Export to CSV for payroll processing

### **Phase 3: Clock-In/Clock-Out (Optional Enhancement)**
1. Add clock-in button to caregiver dashboard
2. Track start/end times for shifts
3. Calculate exact shift durations
4. Support break deductions
5. Automatic overtime calculation

### **Phase 4: Payroll Integration (Future)**
1. Mark wages as "pending", "approved", "paid"
2. Track payment history
3. Generate payroll reports
4. Export to accounting software

---

## 💰 **Suggested Hourly Rates by Role**

| Role | Suggested Range | Notes |
|------|----------------|-------|
| Caregiver (Entry) | $15-$18/hour | Basic ADLs, no medical |
| Caregiver (Experienced) | $18-$22/hour | 2+ years experience |
| Certified Nursing Assistant (CNA) | $20-$25/hour | Medical knowledge |
| Licensed Practical Nurse (LPN) | $25-$30/hour | Can administer meds |
| Registered Nurse (RN) | $35-$45/hour | Advanced medical care |
| Doctor (Consultation) | $75-$150/hour | Medical oversight |

---

## 📊 **Reports Available**

### **1. Individual Caregiver Wage Report**
- Total hours worked
- Total earnings
- Activity breakdown
- Client breakdown
- Daily/weekly summary

### **2. Institution-Wide Payroll Report**
- All caregivers' earnings
- Total payroll cost
- Hours by department/role
- Overtime summary

### **3. Client Cost Report**
- Total cost per client
- Hours of care received
- Breakdown by activity type
- Cost per service

---

## ✅ **Benefits of This System**

1. **Accurate Tracking**
   - No manual time sheets needed
   - Automatic duration calculation
   - Complete audit trail

2. **Fair Payment**
   - Pay based on actual work performed
   - Transparent breakdown for caregivers
   - Easy to dispute resolution

3. **Easy Administration**
   - Automatic calculations
   - Export to payroll systems
   - Compliance reporting

4. **Cost Control**
   - Track costs per client
   - Identify inefficiencies
   - Budget planning

5. **Compliance**
   - Overtime tracking
   - Labor law compliance
   - Complete documentation

---

## 🚀 **Next Steps**

1. ✅ **Activity logging with duration** - IMPLEMENTED
2. ✅ **Complete caregiver attribution** - IMPLEMENTED
3. ✅ **Timestamp tracking** - IMPLEMENTED
4. 🔄 **Add wage management to admin dashboard** - IN PROGRESS
5. ⏳ **Clock-in/clock-out system** - PLANNED
6. ⏳ **Payroll export** - PLANNED

---

**All activity logs now include:**
- ✅ Complete caregiver details (name, email, phone, role)
- ✅ Precise timestamps (date, time, day, week, month, year)
- ✅ Duration estimates for wage calculation
- ✅ Client attribution
- ✅ Activity categorization
- ✅ Status tracking (completed, skipped, issue)
- ✅ Notes and metadata

**Ready for automatic wage calculation!** 💰


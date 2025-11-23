# Hospital Patient Flow Structure

## Complete Patient Journey from Arrival to Discharge

### 1. **Patient Arrival & Registration** (Receptionist)
- Patient arrives at hospital
- Receptionist registers patient (if new) or retrieves existing record
- Receptionist adds patient to **Triage/Vitals Queue**
- Patient receives queue number
- SMS/WhatsApp notification sent: "You are number X in the queue"

### 2. **Vitals Check** (Nurse/Triage Staff)
- Nurse sees patient in **Triage/Vitals Queue**
- Nurse calls patient: "Number X, please come to vitals station"
- Nurse records vital signs (BP, temperature, heart rate, etc.)
- Nurse assesses urgency/priority
- Nurse refers patient to appropriate department:
  - **GP Queue** (general consultation)
  - **Specialist Queue** (if specific specialist needed)
  - **Emergency Queue** (if urgent)
  - **Lab Queue** (if vitals indicate immediate testing needed)

### 3. **Doctor Consultation** (Doctor)
- Doctor sees patient in their queue (GP or Specialist)
- Doctor calls patient: "Number X, Dr. [Name] is ready"
- Doctor conducts consultation
- Doctor may:
  - **Order Lab Tests** → Patient added to Lab Queue
  - **Prescribe Medication** → Patient added to Pharmacy Queue
  - **Order Imaging** → Patient added to Radiology Queue
  - **Discharge** → Patient goes to Billing Queue
  - **Admit** → Patient goes to Admission Queue

### 4. **Laboratory Tests** (Lab Technician)
- Lab tech sees patient in **Lab Queue**
- Lab tech calls patient: "Number X, please come to lab"
- Lab tech collects samples/conducts tests
- Results uploaded to patient record
- Patient automatically returns to **Doctor Queue** for results review
  OR
- Patient goes directly to **Pharmacy Queue** if doctor pre-approved

### 5. **Pharmacy** (Pharmacist)
- Pharmacist sees patient in **Pharmacy Queue**
- Pharmacist calls patient: "Number X, your prescription is ready"
- Pharmacist dispenses medication
- Patient goes to **Billing Queue**

### 6. **Radiology/Imaging** (Radiology Staff)
- Radiology staff sees patient in **Radiology Queue**
- Staff calls patient: "Number X, please come for imaging"
- Imaging completed
- Results uploaded
- Patient returns to **Doctor Queue** for review
  OR
- Patient goes to **Pharmacy Queue** if medication needed

### 7. **Billing & Payment** (Billing Staff)
- Billing staff sees patient in **Billing Queue**
- Staff calls patient: "Number X, please come for billing"
- Bill generated automatically (from all services used)
- Payment processed
- Receipt generated
- Patient discharged

### 8. **Discharge**
- Patient receives discharge summary
- Follow-up appointment scheduled (if needed)
- Patient leaves hospital

---

## Queue Management Structure

### **Queue Types:**
1. **Triage/Vitals Queue** - Initial assessment
2. **GP Queue** - General practitioners
3. **Specialist Queue** - Specialists (can be subdivided by specialty)
4. **Lab Queue** - Laboratory tests
5. **Pharmacy Queue** - Medication pickup
6. **Radiology Queue** - Imaging/X-rays
7. **Billing Queue** - Payment processing
8. **Emergency Queue** - Urgent cases (highest priority)

### **Staff Roles & Their Queues:**

| Staff Role | Sees These Queues | Can Perform Actions |
|------------|------------------|-------------------|
| **Receptionist** | All queues (overview) | Add patient to Triage queue, View all queues |
| **Nurse/Triage** | Triage/Vitals Queue | Check vitals, Refer to doctor/lab/emergency |
| **GP Doctor** | GP Queue | Consult, Order tests, Prescribe, Refer to specialist |
| **Specialist Doctor** | Specialist Queue | Consult, Order tests, Prescribe |
| **Lab Technician** | Lab Queue | Conduct tests, Upload results |
| **Pharmacist** | Pharmacy Queue | Dispense medication |
| **Radiology Staff** | Radiology Queue | Conduct imaging, Upload results |
| **Billing Staff** | Billing Queue | Generate bill, Process payment |
| **Admin** | All queues | Monitor, Manage, Override |

---

## Key Features Needed:

1. **Queue Transfer/Referral System**
   - Staff can transfer patient to next queue
   - Automatic notifications sent
   - Queue history tracked

2. **Priority Management**
   - Emergency cases jump to front
   - Elderly/VIP priority
   - Urgent vitals trigger priority

3. **Real-time Updates**
   - All staff see live queue updates
   - Patients see their position via SMS/app

4. **Queue History**
   - Track patient journey through all queues
   - Analytics on wait times per department

5. **Integration Points**
   - Queue → Consultation → SOAP Notes
   - Queue → Lab Test → Results
   - Queue → Prescription → Pharmacy
   - All services → Auto-billing

---

## Implementation Priority:

1. ✅ **Queue API** (Already built)
2. ⏳ **Queue Transfer/Referral System** (Need to add)
3. ⏳ **Role-based Queue Views** (Need to add)
4. ⏳ **Patient Registration → Queue Flow** (Need to add)
5. ⏳ **Queue History Tracking** (Need to add)
6. ⏳ **Staff-specific Dashboards** (Need to create)


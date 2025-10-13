# Pharmacy Management System

## Overview
The Pharmacy Management System is an integrated module within the ElderX institution dashboard that allows pharmacists to manage prescriptions, track inventory, generate invoices, and maintain medication dispensing records.

## Features

### 1. **Prescription Management**
- View all prescriptions assigned to pharmacy clients
- Mark medications as available or unavailable
- Set pricing for each medication
- Track prescription fulfillment status
- Search and filter prescriptions

### 2. **Inventory Management**
- Track medication stock levels
- Monitor expiry dates
- Set reorder levels
- Low stock alerts
- Expiring medication warnings

### 3. **Invoice Generation**
- Create itemized invoices for prescribed medications
- Apply discounts and taxes
- Support multiple payment methods (Cash, Card, Bank Transfer, Insurance, Wallet)
- Print and download invoices
- Track invoice payment status

### 4. **Statistics & Analytics**
- Total prescriptions handled
- Pending vs filled prescriptions
- Revenue tracking
- Low stock alerts
- Expiring medication alerts

## Firestore Collections

### 1. `medications` Collection (Extended)
This existing collection has been extended with pharmacy-related fields:

```javascript
{
  id: string,
  patientId: string,
  name: string,
  dosage: string,
  frequency: string,
  instructions: string,
  startDate: Timestamp,
  endDate: Timestamp,
  status: string, // active, inactive
  prescribedBy: string, // Doctor's name
  institutionId: string,
  
  // New pharmacy fields
  pharmacyStatus: string, // pending, partially_filled, filled, unavailable
  pharmacyData: {
    available: boolean,
    price: number,
    stockQuantity: number,
    dispensedQuantity: number,
    notes: string,
    updatedAt: Timestamp,
    updatedBy: string // Pharmacist UID
  },
  invoiceId: string, // Reference to pharmacy invoice
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. `pharmacyInvoices` Collection (New)
Stores all pharmacy invoices:

```javascript
{
  id: string,
  invoiceNumber: string, // Auto-generated (e.g., INV-12345678)
  clientId: string,
  clientName: string,
  institutionId: string,
  pharmacistId: string,
  pharmacistName: string,
  
  items: [
    {
      medicationId: string,
      name: string,
      dosage: string,
      frequency: string,
      quantity: number,
      unitPrice: number,
      totalPrice: number,
      available: boolean
    }
  ],
  
  subtotal: number,
  tax: number, // Percentage
  discount: number, // Percentage
  total: number,
  
  status: string, // pending, paid, cancelled
  paymentMethod: string, // cash, card, bank_transfer, insurance, wallet
  transactionId: string, // If paid via wallet/card
  paidAt: Timestamp,
  
  notes: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3. `pharmacyInventory` Collection (New)
Tracks pharmacy medication inventory:

```javascript
{
  id: string,
  institutionId: string,
  name: string,
  genericName: string,
  brandName: string,
  category: string, // antibiotic, painkiller, antihypertensive, etc.
  form: string, // tablet, capsule, syrup, injection, cream, etc.
  strength: string, // e.g., "500mg", "10ml"
  
  quantity: number,
  unit: string, // tablets, bottles, vials, etc.
  reorderLevel: number, // Alert when stock falls below this
  unitCost: number,
  sellingPrice: number,
  
  supplier: string,
  supplierContact: string,
  batchNumber: string,
  manufactureDate: Date,
  expiryDate: Date,
  
  location: string, // Shelf/storage location
  notes: string,
  
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastRestocked: Timestamp
}
```

## Workflow

### Standard Pharmacy Workflow:

1. **Doctor prescribes medication** → Creates entry in `medications` collection
2. **Pharmacist selects client** → Views prescriptions for that client
3. **Check availability** → Mark each medication as available/unavailable
4. **Set pricing** → Input price for available medications
5. **Generate invoice** → Select medications and create invoice
6. **Payment processing** → Mark invoice as paid when payment received
7. **Dispense medication** → Update prescription status to "filled"

### Prescription Status Flow:
- `pending` → Initial state when doctor prescribes
- `partially_filled` → Some medications dispensed, others pending
- `filled` → All medications dispensed
- `unavailable` → Medication not in stock

### Invoice Status Flow:
- `pending` → Invoice generated, awaiting payment
- `paid` → Payment received
- `cancelled` → Invoice cancelled

## API Methods

### Prescription Management
```javascript
// Get prescriptions for a client
pharmacyAPI.getPrescriptionsByClient(clientId, { status: 'pending', limit: 50 })

// Get all prescriptions for institution
pharmacyAPI.getAllPrescriptions(institutionId, { status: 'pending' })

// Update prescription pharmacy data
pharmacyAPI.updatePrescriptionPharmacy(prescriptionId, {
  available: true,
  price: 5000,
  stockQuantity: 100,
  status: 'filled',
  notes: 'Dispensed'
})
```

### Invoice Management
```javascript
// Create invoice
pharmacyAPI.createPharmacyInvoice({
  clientId: 'client123',
  clientName: 'John Doe',
  institutionId: 'inst123',
  pharmacistId: 'pharm123',
  pharmacistName: 'Jane Pharmacist',
  items: [...],
  subtotal: 15000,
  tax: 7.5,
  discount: 0,
  total: 16125,
  paymentMethod: 'cash',
  notes: 'Cash payment'
})

// Get invoices
pharmacyAPI.getInvoicesByClient(clientId)
pharmacyAPI.getAllInvoices(institutionId, { status: 'pending' })

// Update invoice status
pharmacyAPI.updateInvoiceStatus(invoiceId, 'paid', {
  paymentMethod: 'card',
  transactionId: 'txn123'
})
```

### Inventory Management
```javascript
// Get inventory
pharmacyAPI.getInventoryItems(institutionId)

// Add/Update inventory
pharmacyAPI.updateInventoryItem(itemId, {
  name: 'Paracetamol',
  genericName: 'Acetaminophen',
  quantity: 500,
  sellingPrice: 50,
  expiryDate: new Date('2025-12-31')
})

// Search inventory
pharmacyAPI.searchInventory('paracetamol', institutionId)
```

### Statistics
```javascript
// Get pharmacy stats
pharmacyAPI.getPharmacyStats(institutionId)
// Returns: {
//   totalPrescriptions, pendingPrescriptions, filledPrescriptions,
//   totalRevenue, pendingInvoices, paidInvoices,
//   lowStockItems, expiringSoon
// }
```

## Component Usage

### PharmacyTab Component
```jsx
<PharmacyTab
  user={user}
  userProfile={userProfile}
  institutionId={institutionId}
  assignedClients={assignedClients}
/>
```

### PharmacyInvoiceGenerator Component
```jsx
<PharmacyInvoiceGenerator
  client={selectedClient}
  prescriptions={selectedPrescriptions}
  institutionId={institutionId}
  pharmacistId={user.uid}
  pharmacistName={userProfile.name}
  onClose={handleClose}
/>
```

## Security & Access Control

### Firestore Rules
Add the following rules to `firestore.rules`:

```javascript
// Pharmacy Invoices
match /pharmacyInvoices/{invoiceId} {
  allow read: if request.auth != null && (
    resource.data.clientId == request.auth.uid ||
    resource.data.pharmacistId == request.auth.uid ||
    resource.data.institutionId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.institutionId
  );
  
  allow create: if request.auth != null && 
    request.resource.data.pharmacistId == request.auth.uid;
  
  allow update: if request.auth != null && (
    resource.data.pharmacistId == request.auth.uid ||
    resource.data.institutionId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.institutionId
  );
}

// Pharmacy Inventory
match /pharmacyInventory/{itemId} {
  allow read: if request.auth != null;
  
  allow write: if request.auth != null && 
    resource.data.institutionId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.institutionId;
}

// Medications - Update pharmacy fields
match /medications/{medicationId} {
  allow update: if request.auth != null && (
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['pharmacyData', 'pharmacyStatus', 'updatedAt', 'invoiceId'])
  );
}
```

## Future Enhancements

### Recommended Features:
1. **Drug Interaction Checker** - Warn pharmacist of potential drug interactions
2. **Barcode Scanning** - Scan medication barcodes for quick inventory updates
3. **Automated Reordering** - Auto-generate purchase orders when stock is low
4. **Expiry Notifications** - Email/SMS alerts for expiring medications
5. **Batch Tracking** - Complete batch/lot number tracking for recalls
6. **Insurance Integration** - Direct billing to insurance companies
7. **E-Prescription** - Digital prescription verification
8. **Medication Counseling Notes** - Record counseling provided to patients
9. **Prescription Refills** - Track and manage refill requests
10. **Analytics Dashboard** - Advanced reporting and insights

### Integration Points:
- **Wallet System** - Direct payment through ElderX wallet
- **Messaging** - Chat with doctors for prescription clarification
- **Notifications** - Alert clients when prescriptions are ready
- **Care Logs** - Auto-log medication dispensing in care records

## Usage Instructions

### For Pharmacists:

1. **Access Pharmacy Tab**
   - Login to institution dashboard
   - Click on "Pharmacy" in the sidebar

2. **View Prescriptions**
   - Select a client from the dropdown
   - View all prescriptions for that client
   - Filter by status (pending, filled, etc.)

3. **Mark Availability & Set Price**
   - Click "Edit" on a prescription
   - Mark as Available (✓) or Unavailable (✗)
   - If available, enter stock quantity and price
   - Select prescription status
   - Click "Save"

4. **Generate Invoice**
   - Select prescriptions using checkboxes
   - Click "Generate Invoice" button
   - Review invoice details
   - Adjust quantities/prices if needed
   - Add discount or tax if applicable
   - Select payment method
   - Add notes if needed
   - Click "Save Invoice"

5. **Print/Download Invoice**
   - Use "Print" button for physical copy
   - Use "Download PDF" for digital copy (coming soon)

### For Administrators:

1. **Setup Inventory**
   - Add medications to inventory database
   - Set reorder levels
   - Configure expiry alerts

2. **Monitor Statistics**
   - View pharmacy dashboard
   - Track revenue and prescriptions
   - Monitor low stock items

3. **Access Control**
   - Assign pharmacy role to users
   - Configure permissions
   - Monitor activity logs

## Troubleshooting

### Common Issues:

1. **Prescriptions not showing**
   - Verify client is assigned to pharmacy
   - Check if prescriptions have institutionId set
   - Ensure proper Firestore permissions

2. **Invoice generation fails**
   - Verify all selected prescriptions have prices
   - Check network connection
   - Review browser console for errors

3. **Stock alerts not working**
   - Verify inventory items have reorderLevel set
   - Check notification settings
   - Ensure statistics are being calculated

## Support
For technical support or feature requests, contact the development team or create an issue in the project repository.


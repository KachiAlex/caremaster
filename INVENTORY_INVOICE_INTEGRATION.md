# Inventory & Invoice Integration Guide
## ElderX Healthcare Platform

**Date:** December 2, 2025  
**Status:** ✅ Implemented & Integrated  
**Component:** `InventoryBillingTab.js`

---

## Overview

The Inventory & Invoice system provides a complete solution for managing inventory items with cost/selling price tracking and creating invoices that automatically pull prices from the inventory database.

### Key Features
- ✅ Simple inventory management with detailed item tracking
- ✅ Separate cost price and selling price per item
- ✅ Supplier tracking and date/time stamps
- ✅ Invoice creation with dropdown selection from inventory
- ✅ Automatic price population from inventory (uses selling price)
- ✅ Stock level monitoring with low stock alerts
- ✅ Professional invoice generation and PDF export

---

## Inventory Management

### Inventory Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Name** | Text | Yes | Item name (e.g., "Adult Diapers") |
| **Description** | Text | No | Detailed item description |
| **Category** | Dropdown | Yes | Medical, Personal Care, Nutrition, Mobility, Safety, Other |
| **Cost Price** | Number | Yes | Purchase/acquisition price (₦) |
| **Selling Price** | Number | Yes | Price used for invoicing (₦) |
| **Quantity** | Number | Yes | Current stock quantity |
| **Unit** | Dropdown | Yes | Piece, Box, Pack, Bottle, Tube, Roll, Bag |
| **SKU** | Text | No | Stock Keeping Unit identifier |
| **Supplier** | Text | No | Supplier name |
| **Min Stock** | Number | No | Minimum stock alert threshold (default: 10) |
| **Created At** | Timestamp | Auto | Date and time item was added |

### Inventory Table Display

The inventory table shows:
1. **Item** - Name, description, and SKU
2. **Supplier** - Supplier name
3. **Stock** - Current quantity with low stock warnings
4. **Cost Price** - Purchase/acquisition price
5. **Selling Price** - Price for invoicing (highlighted in green)
6. **Total Value** - Calculated as (quantity × selling price)
7. **Date Created** - When the item was added
8. **Actions** - Edit and delete buttons

### Stock Alerts
- Items with quantity ≤ min stock are highlighted in orange
- Alert icon (⚠️) shown for low stock items
- Stock count badge in dashboard shows low stock count

---

## Invoice Creation Workflow

### Step 1: Select Client
Choose the client from the dropdown list of all active clients.

### Step 2: Add Items from Inventory
- Click the "**+ Add Item from Inventory**" dropdown
- Select items from the inventory
- **Price is automatically populated** from the **selling price** field
- Items show: `Item Name - ₦Price (X units available)`
- Only items with `quantity > 0` are available

### Step 3: Adjust Quantities
- Default quantity is 1
- Adjust quantities in the invoice items table
- Total automatically recalculates

### Step 4: Set Payment Terms
- Due Date (required)
- Payment Terms: Immediate, Net 7, Net 30, Net 60 days
- Add optional notes

### Step 5: Create Invoice
- System generates invoice number
- Calculates subtotal, tax (7.5%), and total
- Saves invoice with "pending" status

---

## Technical Implementation

### Cost Price vs Selling Price

```javascript
// Inventory Item Structure
{
  name: 'Adult Diapers',
  description: 'Extra absorbent adult diapers',
  category: 'personal care',
  costPrice: 5000,        // ₦5,000 (what you paid)
  sellingPrice: 7500,     // ₦7,500 (what you charge)
  quantity: 50,
  unit: 'pack',
  supplier: 'Medical Supplies Ltd',
  sku: 'SKU-001',
  minStock: 10,
  createdAt: '2025-12-02T08:00:00Z'
}
```

### Invoice Item Integration

```javascript
// When adding item to invoice
const addItemToInvoice = (item) => {
  setInvoiceFormData(prev => ({
    ...prev,
    items: [...prev.items, {
      inventoryId: item.id,
      name: item.name,
      description: item.description,
      unitPrice: item.sellingPrice || item.unitPrice || 0,  // Uses selling price
      quantity: 1,
      unit: item.unit
    }]
  }));
};
```

### Profit Margin Calculation

```javascript
// Profit per item
const profitMargin = sellingPrice - costPrice;
const profitPercentage = ((sellingPrice - costPrice) / costPrice) * 100;

// Example:
// Cost Price: ₦5,000
// Selling Price: ₦7,500
// Profit: ₦2,500 (50%)
```

---

## Usage Examples

### Example 1: Adding an Inventory Item

1. Click **"Add Item"** button
2. Fill in the form:
   - **Name:** Wheelchair - Standard
   - **Description:** Standard manual wheelchair with adjustable footrests
   - **Category:** Mobility
   - **Cost Price:** ₦45,000
   - **Selling Price:** ₦65,000
   - **Quantity:** 5
   - **Unit:** Piece
   - **Supplier:** MediQuip Supplies
   - **SKU:** CHAIR-STD-001
   - **Min Stock:** 2
3. Click **"Add Item"**
4. Item appears in inventory table with all details

### Example 2: Creating an Invoice

1. Switch to **"Invoices & Billing"** tab
2. Click **"Create Invoice"** button
3. **Select Client:** John Doe
4. Click **"+ Add Item from Inventory"** dropdown
5. Select **"Wheelchair - Standard - ₦65,000 (5 piece available)"**
6. Item added with:
   - Name: Wheelchair - Standard
   - Unit Price: ₦65,000 (from selling price)
   - Quantity: 1 (adjustable)
7. Adjust quantity to 2
8. Total shows: ₦130,000 + ₦9,750 tax = ₦139,750
9. Set due date and payment terms
10. Click **"Create Invoice"**

### Example 3: Invoice Display

The generated invoice shows:
```
Item                          Qty    Unit Price      Total
────────────────────────────────────────────────────────
Wheelchair - Standard          2     ₦65,000     ₦130,000

Subtotal:                                        ₦130,000
Tax (7.5%):                                        ₦9,750
Total Amount:                                    ₦139,750
```

---

## API Integration

### Inventory API Endpoints

```javascript
// Create inventory item
await inventoryAPI.createItem({
  name: 'Item Name',
  description: 'Item description',
  category: 'medical',
  costPrice: 1000,
  sellingPrice: 1500,
  quantity: 100,
  unit: 'piece',
  supplier: 'Supplier Name',
  sku: 'SKU-001',
  minStock: 10,
  institutionId: 'institution-123'
});

// Update inventory item
await inventoryAPI.updateItem(itemId, {
  sellingPrice: 1600,  // Update selling price
  quantity: 150         // Update stock
});

// Get inventory items
const items = await inventoryAPI.getItemsByInstitution(institutionId);
```

### Invoice API Endpoints

```javascript
// Create invoice (items from inventory)
await invoiceAPI.createInvoice({
  clientId: 'client-123',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  items: [
    {
      inventoryId: 'inv-item-123',
      name: 'Wheelchair - Standard',
      unitPrice: 65000,  // From inventory.sellingPrice
      quantity: 2,
      unit: 'piece'
    }
  ],
  subtotal: 130000,
  tax: 9750,
  totalAmount: 139750,
  dueDate: new Date('2025-12-15'),
  paymentTerms: 'net30',
  notes: 'Delivery included',
  institutionId: 'institution-123'
});
```

---

## Benefits of This Integration

### 1. Centralized Pricing
- ✅ Single source of truth for prices
- ✅ Update price once in inventory, affects all future invoices
- ✅ Prevents pricing errors and inconsistencies

### 2. Profit Tracking
- ✅ Track cost price vs selling price
- ✅ Calculate profit margins per item
- ✅ Revenue analysis and reporting

### 3. Stock Management
- ✅ Real-time stock visibility
- ✅ Low stock alerts
- ✅ Prevents over-selling (only shows in-stock items)

### 4. Efficiency
- ✅ Fast invoice creation (dropdown selection)
- ✅ No manual price entry (reduces errors)
- ✅ Automatic calculations

### 5. Audit Trail
- ✅ Track when items were added
- ✅ Track supplier information
- ✅ Historical pricing data

---

## Dashboard Statistics

The inventory dashboard shows:

1. **Total Items** - Count of all inventory items
2. **Low Stock** - Count of items at or below minimum stock
3. **Pending Invoices** - Count of unpaid invoices
4. **Revenue (Paid)** - Total amount from paid invoices

---

## Invoice Management Features

### Invoice Statuses
- **Pending** - Invoice created, awaiting payment
- **Paid** - Payment received
- **Cancelled** - Invoice cancelled

### Invoice Actions
- **View** - View full invoice details
- **Download/Print** - Generate PDF for printing or sending
- **Mark as Paid** - Update status with payment details
- **Mark as Cancelled** - Cancel invoice

### Invoice Details Include
- Invoice number (auto-generated)
- Client information
- Line items with quantities and prices
- Subtotal, tax, total
- Payment terms and due date
- Status and payment information
- Notes

---

## Best Practices

### 1. Inventory Management
- ✅ Set realistic min stock levels to avoid stockouts
- ✅ Keep cost prices updated for accurate profit tracking
- ✅ Use descriptive names and SKUs for easy identification
- ✅ Track supplier information for reordering

### 2. Pricing Strategy
- ✅ Set selling prices with adequate profit margin
- ✅ Update prices in inventory rather than manually in invoices
- ✅ Review cost vs selling prices regularly

### 3. Invoice Creation
- ✅ Verify client information before creating invoice
- ✅ Check stock availability before adding items
- ✅ Set appropriate payment terms
- ✅ Add notes for special instructions

### 4. Stock Monitoring
- ✅ Monitor low stock alerts regularly
- ✅ Reorder before stock reaches zero
- ✅ Adjust min stock levels based on demand

---

## Future Enhancements (Optional)

### 1. Advanced Features
- [ ] Batch import/export of inventory items
- [ ] Barcode scanning for item management
- [ ] Automated reordering when stock is low
- [ ] Multiple price tiers (retail, wholesale, VIP)
- [ ] Inventory valuation reports

### 2. Invoice Features
- [ ] Recurring invoices for regular clients
- [ ] Payment reminders for overdue invoices
- [ ] Online payment integration
- [ ] Invoice templates customization
- [ ] Multi-currency support

### 3. Analytics
- [ ] Profit margin analysis
- [ ] Best-selling items report
- [ ] Revenue trends and forecasting
- [ ] Stock turnover analysis
- [ ] Supplier performance tracking

---

## Firestore Database Structure

### Inventory Collection
```javascript
inventory/
  {itemId}/
    name: "Wheelchair - Standard"
    description: "Standard manual wheelchair..."
    category: "mobility"
    costPrice: 45000
    sellingPrice: 65000
    quantity: 5
    unit: "piece"
    supplier: "MediQuip Supplies"
    sku: "CHAIR-STD-001"
    minStock: 2
    institutionId: "institution-123"
    status: "active"
    createdAt: timestamp
    updatedAt: timestamp
```

### Invoices Collection
```javascript
invoices/
  {invoiceId}/
    invoiceNumber: "INV-2025-001"
    clientId: "client-123"
    clientName: "John Doe"
    clientEmail: "john@example.com"
    items: [
      {
        inventoryId: "inv-item-123"
        name: "Wheelchair - Standard"
        unitPrice: 65000      // From inventory.sellingPrice
        quantity: 2
        unit: "piece"
        totalPrice: 130000
      }
    ]
    subtotal: 130000
    taxAmount: 9750
    totalAmount: 139750
    status: "pending"
    paymentTerms: "net30"
    dueDate: timestamp
    notes: "Delivery included"
    institutionId: "institution-123"
    createdAt: timestamp
    updatedAt: timestamp
```

---

## User Interface Screenshots

### Inventory Tab
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Search inventory...]                          [🔄] [+ Add Item]             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Item          │ Supplier    │ Stock │ Cost Price │ Selling Price │ Total   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Wheelchair    │ MediQuip    │ 5 pc  │ ₦45,000   │ ₦65,000       │ ₦325,000│
│ Standard      │ Supplies    │       │            │                │         │
│ SKU: CHAIR... │             │       │            │                │         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Adult Diapers │ Medical     │ 8 pk ⚠│ ₦5,000    │ ₦7,500        │ ₦60,000 │
│ Extra absorbent│ Supplies Ltd│      │            │                │         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Invoice Creation Modal
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Create New Invoice                                                     [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Select Client *                                                              │
│ [John Doe                          ▼]                                        │
│                                                                              │
│ Invoice Items                     [+ Add Item from Inventory            ▼]  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Item            │ Unit Price │ Qty │ Total      │ Action              │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ Wheelchair...   │ ₦65,000   │ [2] │ ₦130,000   │ [🗑]                │ │
│ │ Adult Diapers   │ ₦7,500    │ [3] │ ₦22,500    │ [🗑]                │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │                 Subtotal:                      │ ₦152,500           │ │
│ │                 Tax (7.5%):                    │ ₦11,438            │ │
│ │                 Total:                         │ ₦163,938           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Due Date *          Payment Terms                                            │
│ [2025-12-15]        [Net 30 Days         ▼]                                 │
│                                                                              │
│ Notes                                                                        │
│ [Optional notes for client...]                                              │
│                                                                              │
│                                              [Cancel] [Create Invoice]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Code Examples

### Adding an Item to Inventory

```javascript
const newItem = {
  name: 'Wheelchair - Standard',
  description: 'Standard manual wheelchair with adjustable footrests',
  category: 'mobility',
  costPrice: 45000,      // What you paid
  sellingPrice: 65000,   // What you charge
  quantity: 5,
  unit: 'piece',
  supplier: 'MediQuip Supplies',
  sku: 'CHAIR-STD-001',
  minStock: 2
};

await inventoryAPI.createItem({
  ...newItem,
  institutionId
});
```

### Creating an Invoice from Inventory

```javascript
// 1. User selects item from dropdown
// 2. System automatically adds with selling price

const invoiceData = {
  clientId: 'client-123',
  items: [
    {
      inventoryId: 'inv-123',
      name: 'Wheelchair - Standard',
      unitPrice: 65000,  // Automatically from inventory.sellingPrice
      quantity: 2,
      unit: 'piece'
    }
  ],
  dueDate: '2025-12-15',
  paymentTerms: 'net30',
  notes: 'Delivery included'
};

await invoiceAPI.createInvoice({
  ...invoiceData,
  institutionId
});
```

---

## Security & Validation

### Input Validation
- ✅ Required fields enforced
- ✅ Numeric validation for prices and quantities
- ✅ Minimum values enforced (prices ≥ 0)
- ✅ Date validation (due date cannot be in past)

### Access Control
- ✅ Institution-specific data isolation
- ✅ Only items from same institution shown
- ✅ Only clients from same institution available

### Data Integrity
- ✅ Stock levels validated before invoicing
- ✅ Automatic timestamps (createdAt, updatedAt)
- ✅ Invoice numbers auto-generated
- ✅ Totals auto-calculated (prevents manipulation)

---

## Reporting & Analytics

### Available Reports

1. **Inventory Value Report**
   - Total inventory value (by cost price)
   - Total inventory value (by selling price)
   - Potential profit

2. **Low Stock Report**
   - Items at or below min stock
   - Recommended reorder quantities

3. **Invoice Summary**
   - Total pending invoices
   - Total paid invoices
   - Revenue by period

4. **Profit Analysis**
   - Profit per item sold
   - Overall profit margins
   - Best performing items

---

## Troubleshooting

### Issue: Item not appearing in invoice dropdown
**Solution:** 
- Check if item quantity > 0
- Verify item has a selling price set
- Ensure item belongs to the same institution

### Issue: Wrong price showing in invoice
**Solution:**
- Check inventory item's selling price field
- Update selling price in inventory, not invoice
- Refresh inventory data

### Issue: Low stock alert not showing
**Solution:**
- Verify min stock is set correctly
- Check if quantity ≤ min stock
- Refresh inventory data

---

## Keyboard Shortcuts (Future Enhancement)

- `Ctrl + N` - Add new inventory item
- `Ctrl + I` - Create new invoice
- `Ctrl + F` - Focus search
- `Ctrl + R` - Refresh data

---

## Conclusion

The Inventory & Invoice integration provides a complete solution for:
- ✅ Managing inventory with cost and selling prices
- ✅ Creating invoices from inventory items
- ✅ Tracking profit margins
- ✅ Monitoring stock levels
- ✅ Professional invoice generation

This system ensures pricing consistency, reduces errors, and provides valuable business insights through profit margin tracking.

---

**Last Updated:** December 2, 2025  
**Component:** `src/components/InventoryBillingTab.js`  
**API:** `src/api/inventoryAPI.js`  
**Related:** Enhanced Inventory Management, Invoice Management


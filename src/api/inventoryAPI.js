/**
 * Inventory & Billing API
 * Manages inventory items, supplies, invoices, and billing for institutions
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const INVENTORY_COLLECTION = 'inventory';
const INVOICES_COLLECTION = 'invoices';
const SUPPLIES_COLLECTION = 'clientSupplies';

// ========== INVENTORY MANAGEMENT ==========

export const inventoryAPI = {
  // Create new inventory item
  createItem: async (itemData) => {
    try {
      const item = {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      };

      const docRef = await addDoc(collection(db, INVENTORY_COLLECTION), item);
      console.log('✅ Inventory item created:', docRef.id);
      
      return {
        id: docRef.id,
        ...item
      };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  },

  // Get all inventory items for an institution
  getItemsByInstitution: async (institutionId) => {
    try {
      const q = query(
        collection(db, INVENTORY_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const items = [];
      
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`📦 Fetched ${items.length} inventory items`);
      return items;
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },

  // Update inventory item
  updateItem: async (itemId, updates) => {
    try {
      const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Inventory item updated:', itemId);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  // Delete inventory item
  deleteItem: async (itemId) => {
    try {
      await deleteDoc(doc(db, INVENTORY_COLLECTION, itemId));
      console.log('✅ Inventory item deleted:', itemId);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },

  // Update stock quantity
  updateStock: async (itemId, quantity, operation = 'add') => {
    try {
      const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Inventory item not found');
      }

      const currentStock = itemDoc.data().quantity || 0;
      const newQuantity = operation === 'add' 
        ? currentStock + quantity 
        : currentStock - quantity;

      await updateDoc(itemRef, {
        quantity: Math.max(0, newQuantity),
        lastRestocked: operation === 'add' ? serverTimestamp() : itemDoc.data().lastRestocked,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Stock updated for ${itemId}: ${currentStock} → ${newQuantity}`);
      return newQuantity;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  },

  // Get low stock items
  getLowStockItems: async (institutionId, threshold = 10) => {
    try {
      const q = query(
        collection(db, INVENTORY_COLLECTION),
        where('institutionId', '==', institutionId),
        where('quantity', '<=', threshold),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      const items = [];
      
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`⚠️ Found ${items.length} low stock items`);
      return items;
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  }
};

// ========== INVOICE MANAGEMENT ==========

export const invoiceAPI = {
  // Create new invoice
  createInvoice: async (invoiceData) => {
    try {
      const invoice = {
        ...invoiceData,
        invoiceNumber: await generateInvoiceNumber(invoiceData.institutionId),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paidAt: null
      };

      const docRef = await addDoc(collection(db, INVOICES_COLLECTION), invoice);
      console.log('✅ Invoice created:', docRef.id);
      
      // Update inventory stock for each item
      if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
          if (item.inventoryId) {
            await inventoryAPI.updateStock(item.inventoryId, item.quantity, 'subtract');
          }
        }
      }

      return {
        id: docRef.id,
        ...invoice
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  // Get all invoices for an institution
  getInvoicesByInstitution: async (institutionId) => {
    try {
      const q = query(
        collection(db, INVOICES_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const invoices = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          paidAt: data.paidAt?.toDate(),
          dueDate: data.dueDate?.toDate()
        });
      });

      console.log(`📄 Fetched ${invoices.length} invoices`);
      return invoices;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  // Get invoices by client
  getInvoicesByClient: async (clientId) => {
    try {
      const q = query(
        collection(db, INVOICES_COLLECTION),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const invoices = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          paidAt: data.paidAt?.toDate(),
          dueDate: data.dueDate?.toDate()
        });
      });

      return invoices;
    } catch (error) {
      console.error('Error fetching client invoices:', error);
      throw error;
    }
  },

  // Update invoice status
  updateInvoiceStatus: async (invoiceId, status, paymentDetails = null) => {
    try {
      const updates = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === 'paid' && paymentDetails) {
        updates.paidAt = serverTimestamp();
        updates.paymentMethod = paymentDetails.method;
        updates.paymentReference = paymentDetails.reference;
      }

      await updateDoc(doc(db, INVOICES_COLLECTION, invoiceId), updates);
      console.log('✅ Invoice status updated:', invoiceId, status);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  },

  // Delete invoice
  deleteInvoice: async (invoiceId) => {
    try {
      await deleteDoc(doc(db, INVOICES_COLLECTION, invoiceId));
      console.log('✅ Invoice deleted:', invoiceId);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },

  // Get invoice statistics
  getInvoiceStats: async (institutionId) => {
    try {
      const invoices = await invoiceAPI.getInvoicesByInstitution(institutionId);
      
      const stats = {
        total: invoices.length,
        pending: 0,
        paid: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };

      const now = new Date();

      invoices.forEach(invoice => {
        const amount = invoice.totalAmount || 0;
        stats.totalAmount += amount;

        if (invoice.status === 'paid') {
          stats.paid++;
          stats.paidAmount += amount;
        } else if (invoice.status === 'pending') {
          stats.pending++;
          stats.pendingAmount += amount;
          
          if (invoice.dueDate && invoice.dueDate < now) {
            stats.overdue++;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error calculating invoice stats:', error);
      throw error;
    }
  }
};

// ========== HELPER FUNCTIONS ==========

// Generate unique invoice number
async function generateInvoiceNumber(institutionId) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Query existing invoices for this month to get next number
  const q = query(
    collection(db, INVOICES_COLLECTION),
    where('institutionId', '==', institutionId)
  );
  
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1;
  
  return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
}

// Calculate invoice totals
export function calculateInvoiceTotals(items) {
  let subtotal = 0;
  
  items.forEach(item => {
    subtotal += (item.unitPrice || 0) * (item.quantity || 0);
  });
  
  const tax = subtotal * 0.075; // 7.5% VAT (adjust as needed)
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total
  };
}

export default {
  inventory: inventoryAPI,
  invoice: invoiceAPI,
  calculateInvoiceTotals
};


/**
 * Enhanced Inventory Management API
 * 
 * Features:
 * - Supplier management
 * - Purchase orders
 * - Goods received notes (GRN)
 * - Expiry date tracking
 * - Automatic reorder levels
 * - Stock audit trail
 * - Consumables tracking
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'backend/database';
import { notificationsAPI } from './notificationsAPI';
import { db } from '../backend/config';

const SUPPLIERS_COLLECTION = 'suppliers';
const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';
const GOODS_RECEIVED_COLLECTION = 'goodsReceived';
const INVENTORY_COLLECTION = 'inventory';
const STOCK_AUDIT_COLLECTION = 'stockAudit';

// ========== SUPPLIER MANAGEMENT ==========

export const supplierAPI = {
  /**
   * Create a new supplier
   */
  createSupplier: async (supplierData) => {
    try {
      const supplier = {
        ...supplierData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      };

      const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), supplier);
      return {
        id: docRef.id,
        ...supplier
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  /**
   * Get all suppliers for an institution
   */
  getSuppliersByInstitution: async (institutionId) => {
    try {
      const q = query(
        collection(db, SUPPLIERS_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      const suppliers = [];
      snapshot.forEach((doc) => {
        suppliers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return suppliers;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  /**
   * Update supplier
   */
  updateSupplier: async (supplierId, updates) => {
    try {
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
      await updateDoc(supplierRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },

  /**
   * Delete supplier
   */
  deleteSupplier: async (supplierId) => {
    try {
      await deleteDoc(doc(db, SUPPLIERS_COLLECTION, supplierId));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }
};

// ========== PURCHASE ORDER MANAGEMENT ==========

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ORDERED: 'ordered',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled'
};

export const purchaseOrderAPI = {
  /**
   * Create a new purchase order
   */
  createPurchaseOrder: async (poData) => {
    try {
      const po = {
        ...poData,
        poNumber: await generatePONumber(poData.institutionId),
        status: PURCHASE_ORDER_STATUS.DRAFT,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalAmount: calculatePOTotal(poData.items || [])
      };

      const docRef = await addDoc(collection(db, PURCHASE_ORDERS_COLLECTION), po);
      return {
        id: docRef.id,
        ...po
      };
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  /**
   * Get purchase orders by institution
   */
  getPurchaseOrdersByInstitution: async (institutionId, filters = {}) => {
    try {
      let q = query(
        collection(db, PURCHASE_ORDERS_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      const snapshot = await getDocs(q);
      const orders = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          expectedDeliveryDate: data.expectedDeliveryDate?.toDate?.() || data.expectedDeliveryDate
        });
      });

      return orders;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  /**
   * Update purchase order status
   */
  updatePurchaseOrderStatus: async (poId, status, updates = {}) => {
    try {
      const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
      await updateDoc(poRef, {
        status,
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  /**
   * Approve purchase order
   */
  approvePurchaseOrder: async (poId, approvedBy) => {
    try {
      await purchaseOrderAPI.updatePurchaseOrderStatus(
        poId,
        PURCHASE_ORDER_STATUS.APPROVED,
        { approvedBy, approvedAt: serverTimestamp() }
      );
    } catch (error) {
      console.error('Error approving purchase order:', error);
      throw error;
    }
  }
};

// ========== GOODS RECEIVED NOTES (GRN) ==========

export const GRN_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

export const grnAPI = {
  /**
   * Create a goods received note
   */
  createGRN: async (grnData) => {
    try {
      const grn = {
        ...grnData,
        grnNumber: await generateGRNNumber(grnData.institutionId),
        status: GRN_STATUS.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, GOODS_RECEIVED_COLLECTION), grn);

      // Update inventory stock
      if (grn.items && Array.isArray(grn.items)) {
        const batch = writeBatch(db);
        
        for (const item of grn.items) {
          if (item.inventoryId) {
            const inventoryRef = doc(db, INVENTORY_COLLECTION, item.inventoryId);
            const inventoryDoc = await getDoc(inventoryRef);
            
            if (inventoryDoc.exists()) {
              const currentStock = inventoryDoc.data().quantity || 0;
              const newStock = currentStock + (item.quantityReceived || 0);
              
              batch.update(inventoryRef, {
                quantity: newStock,
                lastRestocked: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              // Log stock audit
              await logStockAudit({
                inventoryId: item.inventoryId,
                institutionId: grnData.institutionId,
                type: 'received',
                quantity: item.quantityReceived,
                previousStock: currentStock,
                newStock: newStock,
                reference: docRef.id,
                referenceType: 'grn',
                notes: `Received from PO ${grnData.purchaseOrderId}`
              });
            }
          } else if (item.createNew) {
            // Create new inventory item
            const newItem = {
              institutionId: grnData.institutionId,
              name: item.name,
              category: item.category || 'medical',
              unitPrice: item.unitPrice || 0,
              quantity: item.quantityReceived || 0,
              unit: item.unit || 'piece',
              description: item.description || '',
              supplierId: grnData.supplierId,
              reorderLevel: item.reorderLevel || 10,
              expiryDate: item.expiryDate || null,
              batchNumber: item.batchNumber || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              status: 'active'
            };

            const { id: newItemId } = await addDoc(collection(db, INVENTORY_COLLECTION), newItem);

            // Log stock audit
            await logStockAudit({
              inventoryId: newItemId,
              institutionId: grnData.institutionId,
              type: 'created',
              quantity: item.quantityReceived,
              previousStock: 0,
              newStock: item.quantityReceived,
              reference: docRef.id,
              referenceType: 'grn',
              notes: `New item created from GRN`
            });
          }
        }

        await batch.commit();
      }

      // Update purchase order status
      if (grnData.purchaseOrderId) {
        const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, grnData.purchaseOrderId);
        const poDoc = await getDoc(poRef);
        
        if (poDoc.exists()) {
          const poData = poDoc.data();
          const totalOrdered = poData.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const totalReceived = grnData.items?.reduce((sum, item) => sum + (item.quantityReceived || 0), 0) || 0;
          
          let newStatus = PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED;
          if (totalReceived >= totalOrdered) {
            newStatus = PURCHASE_ORDER_STATUS.RECEIVED;
          }

          await updateDoc(poRef, {
            status: newStatus,
            receivedQuantity: totalReceived,
            updatedAt: serverTimestamp()
          });
        }
      }

      return {
        id: docRef.id,
        ...grn
      };
    } catch (error) {
      console.error('Error creating GRN:', error);
      throw error;
    }
  },

  /**
   * Get GRNs by institution
   */
  getGRNsByInstitution: async (institutionId) => {
    try {
      const q = query(
        collection(db, GOODS_RECEIVED_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const grns = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        grns.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          receivedDate: data.receivedDate?.toDate?.() || data.receivedDate
        });
      });

      return grns;
    } catch (error) {
      console.error('Error fetching GRNs:', error);
      throw error;
    }
  }
};

// ========== EXPIRY MANAGEMENT ==========

export const expiryAPI = {
  /**
   * Get items expiring soon
   */
  getExpiringItems: async (institutionId, daysAhead = 30) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

      const q = query(
        collection(db, INVENTORY_COLLECTION),
        where('institutionId', '==', institutionId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      const expiringItems = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.expiryDate) {
          const expiryDate = data.expiryDate?.toDate?.() || new Date(data.expiryDate);
          if (expiryDate <= cutoffDate && expiryDate >= new Date()) {
            const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            expiringItems.push({
              id: doc.id,
              ...data,
              expiryDate,
              daysUntilExpiry
            });
          }
        }
      });

      return expiringItems.sort((a, b) => a.expiryDate - b.expiryDate);
    } catch (error) {
      console.error('Error fetching expiring items:', error);
      throw error;
    }
  },

  /**
   * Get expired items
   */
  getExpiredItems: async (institutionId) => {
    try {
      const q = query(
        collection(db, INVENTORY_COLLECTION),
        where('institutionId', '==', institutionId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      const expiredItems = [];
      const now = new Date();

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.expiryDate) {
          const expiryDate = data.expiryDate?.toDate?.() || new Date(data.expiryDate);
          if (expiryDate < now) {
            expiredItems.push({
              id: doc.id,
              ...data,
              expiryDate
            });
          }
        }
      });

      return expiredItems;
    } catch (error) {
      console.error('Error fetching expired items:', error);
      throw error;
    }
  }
};

// ========== REORDER LEVELS & ALERTS ==========

export const reorderAPI = {
  /**
   * Check reorder levels and send alerts
   */
  checkReorderLevels: async (institutionId) => {
    try {
      const { inventoryAPI } = await import('./inventoryAPI');
      const items = await inventoryAPI.getItemsByInstitution(institutionId);
      
      const lowStockItems = items.filter(item => {
        const currentStock = item.quantity || 0;
        const reorderLevel = item.reorderLevel || item.minStock || 10;
        return currentStock <= reorderLevel && item.status === 'active';
      });

      // Send notifications for low stock items
      for (const item of lowStockItems) {
        try {
          await notificationsAPI.createNotification({
            userId: institutionId,
            type: 'inventory_alert',
            title: 'Low Stock Alert',
            message: `${item.name} is below reorder level. Current: ${item.quantity}, Reorder Level: ${item.reorderLevel || item.minStock}`,
            priority: 'medium',
            data: {
              inventoryId: item.id,
              itemName: item.name,
              currentStock: item.quantity,
              reorderLevel: item.reorderLevel || item.minStock
            }
          });
        } catch (notifError) {
          console.warn('Failed to send reorder notification:', notifError);
        }
      }

      return lowStockItems;
    } catch (error) {
      console.error('Error checking reorder levels:', error);
      throw error;
    }
  }
};

// ========== STOCK AUDIT TRAIL ==========

export const logStockAudit = async (auditData) => {
  try {
    const audit = {
      ...auditData,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, STOCK_AUDIT_COLLECTION), audit);
  } catch (error) {
    console.error('Error logging stock audit:', error);
    // Don't throw - audit logging shouldn't break main operations
  }
};

export const getStockAuditTrail = async (institutionId, inventoryId = null, limit = 100) => {
  try {
    let q = query(
      collection(db, STOCK_AUDIT_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('timestamp', 'desc')
    );

    if (inventoryId) {
      q = query(q, where('inventoryId', '==', inventoryId));
    }

    const snapshot = await getDocs(q);
    const audits = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      audits.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      });
    });

    return audits.slice(0, limit);
  } catch (error) {
    console.error('Error fetching stock audit trail:', error);
    throw error;
  }
};

// ========== HELPER FUNCTIONS ==========

async function generatePONumber(institutionId) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const q = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    where('institutionId', '==', institutionId)
  );
  
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1;
  
  return `PO-${year}${month}-${String(count).padStart(4, '0')}`;
}

async function generateGRNNumber(institutionId) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const q = query(
    collection(db, GOODS_RECEIVED_COLLECTION),
    where('institutionId', '==', institutionId)
  );
  
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1;
  
  return `GRN-${year}${month}-${String(count).padStart(4, '0')}`;
}

function calculatePOTotal(items) {
  return items.reduce((total, item) => {
    return total + ((item.unitPrice || 0) * (item.quantity || 0));
  }, 0);
}

export default {
  supplier: supplierAPI,
  purchaseOrder: purchaseOrderAPI,
  grn: grnAPI,
  expiry: expiryAPI,
  reorder: reorderAPI,
  logStockAudit,
  getStockAuditTrail,
  PURCHASE_ORDER_STATUS,
  GRN_STATUS
};


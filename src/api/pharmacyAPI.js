import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  getDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export const pharmacyAPI = {
  // Get prescriptions assigned to pharmacy for a specific client
  getPrescriptionsByClient: async (clientId, filters = {}) => {
    try {
      let prescriptionsQuery = query(
        collection(db, 'medications'),
        where('patientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        prescriptionsQuery = query(prescriptionsQuery, where('pharmacyStatus', '==', filters.status));
      }

      if (filters.limit) {
        prescriptionsQuery = query(prescriptionsQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(prescriptionsQuery);
      const prescriptions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        prescriptions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          pharmacyStatus: data.pharmacyStatus || 'pending', // pending, partially_filled, filled, unavailable
          pharmacyData: data.pharmacyData || {
            available: null,
            price: null,
            stockQuantity: null,
            dispensedQuantity: null,
            notes: ''
          }
        });
      });

      return prescriptions;
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      throw error;
    }
  },

  // Get all prescriptions for pharmacy (all clients)
  getAllPrescriptions: async (institutionId, filters = {}) => {
    try {
      let prescriptionsQuery = query(
        collection(db, 'medications'),
        orderBy('createdAt', 'desc')
      );

      if (institutionId) {
        prescriptionsQuery = query(prescriptionsQuery, where('institutionId', '==', institutionId));
      }

      if (filters.status) {
        prescriptionsQuery = query(prescriptionsQuery, where('pharmacyStatus', '==', filters.status));
      }

      if (filters.limit) {
        prescriptionsQuery = query(prescriptionsQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(prescriptionsQuery);
      const prescriptions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        prescriptions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          pharmacyStatus: data.pharmacyStatus || 'pending',
          pharmacyData: data.pharmacyData || {
            available: null,
            price: null,
            stockQuantity: null,
            dispensedQuantity: null,
            notes: ''
          }
        });
      });

      return prescriptions;
    } catch (error) {
      console.error('Error fetching all prescriptions:', error);
      throw error;
    }
  },

  // Update prescription pharmacy information
  updatePrescriptionPharmacy: async (prescriptionId, pharmacyData) => {
    try {
      const prescriptionRef = doc(db, 'medications', prescriptionId);
      
      const updateData = {
        pharmacyData: {
          available: pharmacyData.available,
          price: pharmacyData.price || null,
          stockQuantity: pharmacyData.stockQuantity || null,
          dispensedQuantity: pharmacyData.dispensedQuantity || null,
          notes: pharmacyData.notes || '',
          updatedAt: serverTimestamp(),
          updatedBy: pharmacyData.pharmacistId || null
        },
        pharmacyStatus: pharmacyData.status || 'pending',
        updatedAt: serverTimestamp()
      };

      await updateDoc(prescriptionRef, updateData);
      return { success: true, id: prescriptionId };
    } catch (error) {
      console.error('Error updating prescription pharmacy data:', error);
      throw error;
    }
  },

  // Create pharmacy invoice
  createPharmacyInvoice: async (invoiceData) => {
    try {
      const invoice = {
        clientId: invoiceData.clientId,
        clientName: invoiceData.clientName,
        institutionId: invoiceData.institutionId,
        pharmacistId: invoiceData.pharmacistId,
        pharmacistName: invoiceData.pharmacistName,
        items: invoiceData.items || [], // Array of {medicationId, name, quantity, unitPrice, totalPrice, available}
        subtotal: invoiceData.subtotal || 0,
        tax: invoiceData.tax || 0,
        discount: invoiceData.discount || 0,
        total: invoiceData.total || 0,
        status: invoiceData.status || 'pending', // pending, paid, cancelled
        paymentMethod: invoiceData.paymentMethod || null,
        notes: invoiceData.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const invoiceRef = await addDoc(collection(db, 'pharmacyInvoices'), invoice);
      
      // Update each prescription with invoice reference
      for (const item of invoiceData.items) {
        if (item.medicationId) {
          await updateDoc(doc(db, 'medications', item.medicationId), {
            invoiceId: invoiceRef.id,
            'pharmacyData.invoiced': true,
            'pharmacyData.invoiceDate': serverTimestamp()
          });
        }
      }

      return { 
        success: true, 
        id: invoiceRef.id,
        invoiceNumber: `INV-${invoiceRef.id.substring(0, 8).toUpperCase()}`
      };
    } catch (error) {
      console.error('Error creating pharmacy invoice:', error);
      throw error;
    }
  },

  // Get invoices for a client
  getInvoicesByClient: async (clientId) => {
    try {
      const invoicesQuery = query(
        collection(db, 'pharmacyInvoices'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(invoicesQuery);
      const invoices = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          invoiceNumber: `INV-${doc.id.substring(0, 8).toUpperCase()}`,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        });
      });

      return invoices;
    } catch (error) {
      console.error('Error fetching client invoices:', error);
      throw error;
    }
  },

  // Get all pharmacy invoices
  getAllInvoices: async (institutionId, filters = {}) => {
    try {
      let invoicesQuery = query(
        collection(db, 'pharmacyInvoices'),
        orderBy('createdAt', 'desc')
      );

      if (institutionId) {
        invoicesQuery = query(invoicesQuery, where('institutionId', '==', institutionId));
      }

      if (filters.status) {
        invoicesQuery = query(invoicesQuery, where('status', '==', filters.status));
      }

      if (filters.limit) {
        invoicesQuery = query(invoicesQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(invoicesQuery);
      const invoices = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          invoiceNumber: `INV-${doc.id.substring(0, 8).toUpperCase()}`,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        });
      });

      return invoices;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  // Update invoice status (e.g., mark as paid)
  updateInvoiceStatus: async (invoiceId, status, paymentData = {}) => {
    try {
      const invoiceRef = doc(db, 'pharmacyInvoices', invoiceId);
      
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };

      if (paymentData.paymentMethod) {
        updateData.paymentMethod = paymentData.paymentMethod;
      }
      if (paymentData.transactionId) {
        updateData.transactionId = paymentData.transactionId;
      }
      if (status === 'paid') {
        updateData.paidAt = serverTimestamp();
      }

      await updateDoc(invoiceRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  },

  // Inventory Management
  getInventoryItems: async (institutionId) => {
    try {
      let inventoryQuery = query(
        collection(db, 'pharmacyInventory'),
        orderBy('name', 'asc')
      );

      if (institutionId) {
        inventoryQuery = query(inventoryQuery, where('institutionId', '==', institutionId));
      }

      const snapshot = await getDocs(inventoryQuery);
      const items = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          expiryDate: data.expiryDate?.toDate()
        });
      });

      return items;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },

  // Add or update inventory item
  updateInventoryItem: async (itemId, itemData) => {
    try {
      if (itemId) {
        // Update existing item
        const itemRef = doc(db, 'pharmacyInventory', itemId);
        await updateDoc(itemRef, {
          ...itemData,
          updatedAt: serverTimestamp()
        });
        return { success: true, id: itemId };
      } else {
        // Create new item
        const newItem = {
          ...itemData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const itemRef = await addDoc(collection(db, 'pharmacyInventory'), newItem);
        return { success: true, id: itemRef.id };
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  // Search inventory by drug name
  searchInventory: async (searchTerm, institutionId) => {
    try {
      const inventoryQuery = query(
        collection(db, 'pharmacyInventory'),
        where('institutionId', '==', institutionId)
      );

      const snapshot = await getDocs(inventoryQuery);
      const items = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const name = (data.name || '').toLowerCase();
        const genericName = (data.genericName || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        if (name.includes(search) || genericName.includes(search)) {
          items.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            expiryDate: data.expiryDate?.toDate()
          });
        }
      });

      return items;
    } catch (error) {
      console.error('Error searching inventory:', error);
      throw error;
    }
  },

  // Subscribe to prescriptions in real-time
  subscribeToPrescriptions: (clientId, callback) => {
    const prescriptionsQuery = query(
      collection(db, 'medications'),
      where('patientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(prescriptionsQuery, (snapshot) => {
      const prescriptions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        prescriptions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          pharmacyStatus: data.pharmacyStatus || 'pending',
          pharmacyData: data.pharmacyData || {
            available: null,
            price: null,
            stockQuantity: null,
            dispensedQuantity: null,
            notes: ''
          }
        });
      });
      callback(prescriptions);
    });
  },

  // Get pharmacy statistics
  getPharmacyStats: async (institutionId) => {
    try {
      const stats = {
        totalPrescriptions: 0,
        pendingPrescriptions: 0,
        filledPrescriptions: 0,
        totalRevenue: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        lowStockItems: 0,
        expiringSoon: 0
      };

      // Get prescriptions stats
      const prescriptionsQuery = query(
        collection(db, 'medications'),
        where('institutionId', '==', institutionId)
      );
      const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
      
      stats.totalPrescriptions = prescriptionsSnapshot.size;
      prescriptionsSnapshot.forEach((doc) => {
        const status = doc.data().pharmacyStatus || 'pending';
        if (status === 'pending') stats.pendingPrescriptions++;
        if (status === 'filled') stats.filledPrescriptions++;
      });

      // Get invoice stats
      const invoicesQuery = query(
        collection(db, 'pharmacyInvoices'),
        where('institutionId', '==', institutionId)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.status || 'pending';
        if (status === 'pending') stats.pendingInvoices++;
        if (status === 'paid') {
          stats.paidInvoices++;
          stats.totalRevenue += data.total || 0;
        }
      });

      // Get inventory stats
      const inventoryQuery = query(
        collection(db, 'pharmacyInventory'),
        where('institutionId', '==', institutionId)
      );
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      inventorySnapshot.forEach((doc) => {
        const data = doc.data();
        const quantity = data.quantity || 0;
        const reorderLevel = data.reorderLevel || 10;
        
        if (quantity <= reorderLevel) {
          stats.lowStockItems++;
        }

        if (data.expiryDate) {
          const expiryDate = data.expiryDate.toDate();
          if (expiryDate <= thirtyDaysFromNow) {
            stats.expiringSoon++;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching pharmacy stats:', error);
      throw error;
    }
  }
};

export default pharmacyAPI;


import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import cacheManager, { cachedFetch } from '../utils/cacheManager';

const INSTITUTIONS_COLLECTION = 'institutions';

/**
 * Get institution by ID
 * @param {string} institutionId - The institution document ID
 * @returns {Promise<Object|null>} Institution data object or null if not found
 * @throws {Error} If there's an error fetching the institution
 */
export const getInstitution = async (institutionId) => {
  const cacheKey = `institution_${institutionId}`;
  
  return cachedFetch(
    cacheKey,
    async () => {
      try {
        console.log('🏥 Fetching institution:', institutionId);
        
        const institutionRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
        const institutionSnap = await getDoc(institutionRef);
        
        if (institutionSnap.exists()) {
          const institutionData = institutionSnap.data();
          console.log('✅ Institution found:', institutionData.name);
          return { id: institutionSnap.id, ...institutionData };
        } else {
          console.warn('⚠️ Institution not found:', institutionId);
          return null;
        }
      } catch (error) {
        console.error('❌ Error fetching institution:', error);
        throw error;
      }
    },
    5 * 60 * 1000 // Cache for 5 minutes
  );
};

/**
 * Update institution data
 * @param {string} institutionId - The institution document ID
 * @param {Object} updates - Object containing fields to update
 * @param {string|null} userId - Optional user ID to track who made the update
 * @returns {Promise<Object>} Success object with { success: true }
 * @throws {Error} If there's an error updating the institution
 */
export const updateInstitution = async (institutionId, updates, userId = null) => {
  try {
    console.log('🏥 Updating institution:', institutionId);
    
    const institutionRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    // Add user ID if provided
    if (userId) {
      updateData.lastModifiedBy = userId;
    }
    
    await updateDoc(institutionRef, updateData);
    
    console.log('✅ Institution updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating institution:', error);
    throw error;
  }
};

// Update institution custom links
export const updateInstitutionLinks = async (institutionId, updates) => {
  try {
    console.log('🔗 Updating institution links:', institutionId, updates);
    
    const institutionRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
    
    // Validate updates
    const allowedFields = ['customSlug', 'customDomain'];
    const filteredUpdates = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    // Add timestamp
    filteredUpdates.updatedAt = serverTimestamp();
    
    await updateDoc(institutionRef, filteredUpdates);
    
    console.log('✅ Institution links updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating institution links:', error);
    throw error;
  }
};

// Check if custom slug is available
export const checkSlugAvailability = async (slug, excludeInstitutionId = null) => {
  try {
    console.log('🔍 Checking slug availability:', slug);
    
    // Import query functions dynamically to avoid circular imports
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const institutionsRef = collection(db, INSTITUTIONS_COLLECTION);
    const slugQuery = query(
      institutionsRef,
      where('customSlug', '==', slug)
    );
    
    const querySnapshot = await getDocs(slugQuery);
    
    // Check if any institution (other than current) uses this slug
    let isAvailable = true;
    querySnapshot.forEach((doc) => {
      if (doc.id !== excludeInstitutionId) {
        isAvailable = false;
      }
    });
    
    console.log('✅ Slug availability check:', { slug, isAvailable });
    return { isAvailable };
  } catch (error) {
    console.error('❌ Error checking slug availability:', error);
    throw error;
  }
};

// Generate institution URLs
export const generateInstitutionUrls = (institution) => {
  const baseUrl = window.location.origin;
  
  if (!institution) {
    return {
      landing: baseUrl,
      admin: `${baseUrl}/admin`,
      caregiver: `${baseUrl}/caregiver`,
      pharmacist: `${baseUrl}/pharmacist`
    };
  }
  
  const { customDomain, customSlug, id } = institution;
  
  if (customDomain) {
    // Custom domain
    return {
      landing: `https://${customDomain}`,
      admin: `https://${customDomain}/admin`,
      caregiver: `https://${customDomain}/caregiver`,
      pharmacist: `https://${customDomain}/pharmacist`
    };
  } else if (customSlug) {
    // Custom slug
    return {
      landing: `${baseUrl}/institution/${customSlug}`,
      admin: `${baseUrl}/institution/${customSlug}/admin`,
      caregiver: `${baseUrl}/institution/${customSlug}/caregiver`,
      pharmacist: `${baseUrl}/institution/${customSlug}/pharmacist`
    };
  } else {
    // Default institution ID
    return {
      landing: `${baseUrl}/institution/login?institution=${id}`,
      admin: `${baseUrl}/institution/login?institution=${id}&role=admin`,
      caregiver: `${baseUrl}/institution/login?institution=${id}&role=caregiver`,
      pharmacist: `${baseUrl}/institution/login?institution=${id}&role=pharmacist`
    };
  }
};

// Get institution by custom slug
export const getInstitutionBySlug = async (slug) => {
  try {
    console.log('🔍 Finding institution by slug:', slug);
    
    const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
    
    const institutionsRef = collection(db, INSTITUTIONS_COLLECTION);
    const slugQuery = query(
      institutionsRef,
      where('customSlug', '==', slug),
      limit(1)
    );
    
    const querySnapshot = await getDocs(slugQuery);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const institutionData = doc.data();
      console.log('✅ Institution found by slug:', institutionData.name);
      return { id: doc.id, ...institutionData };
    } else {
      console.warn('⚠️ No institution found with slug:', slug);
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding institution by slug:', error);
    throw error;
  }
};

// Get institution by custom domain
export const getInstitutionByDomain = async (domain) => {
  try {
    console.log('🔍 Finding institution by domain:', domain);
    
    const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
    
    const institutionsRef = collection(db, INSTITUTIONS_COLLECTION);
    const domainQuery = query(
      institutionsRef,
      where('customDomain', '==', domain),
      limit(1)
    );
    
    const querySnapshot = await getDocs(domainQuery);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const institutionData = doc.data();
      console.log('✅ Institution found by domain:', institutionData.name);
      return { id: doc.id, ...institutionData };
    } else {
      console.warn('⚠️ No institution found with domain:', domain);
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding institution by domain:', error);
    throw error;
  }
};

// Institution API object
export const institutionAPI = {
  getInstitution,
  updateInstitution,
  updateInstitutionLinks,
  checkSlugAvailability,
  generateInstitutionUrls,
  getInstitutionBySlug,
  getInstitutionByDomain
};

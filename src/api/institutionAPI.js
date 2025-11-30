import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const INSTITUTIONS_COLLECTION = 'institutions';

// Get institution by ID
export const getInstitution = async (institutionId) => {
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

// Get institution settings
export const getInstitutionSettings = async (institutionId) => {
  try {
    const institution = await getInstitution(institutionId);
    if (!institution) {
      return null;
    }

    // Return settings in the format expected by InstitutionSettings component
    return {
      name: institution.name || '',
      description: institution.description || '',
      address: institution.address || '',
      city: institution.city || '',
      state: institution.state || '',
      country: institution.country || 'Nigeria',
      postalCode: institution.postalCode || '',
      phone: institution.phone || '',
      email: institution.email || '',
      website: institution.website || '',
      licenseNumber: institution.licenseNumber || '',
      establishedDate: institution.establishedDate || '',
      specialties: institution.specialties || [],
      maxUsers: institution.maxUsers || 100,
      features: institution.features || {
        telemedicine: true,
        aiAnalysis: true,
        emergencyAlerts: true,
        mobileApp: true,
        apiAccess: false
      },
      branding: institution.branding || {
        logo: null,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981'
      }
    };
  } catch (error) {
    console.error('Error fetching institution settings:', error);
    throw error;
  }
};

// Update institution settings
export const updateInstitutionSettings = async (institutionId, settings) => {
  try {
    console.log('💾 Updating institution settings:', institutionId);
    
    const institutionRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
    
    // Prepare update data
    const updateData = {
      name: settings.name,
      description: settings.description,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      country: settings.country,
      postalCode: settings.postalCode,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      licenseNumber: settings.licenseNumber,
      establishedDate: settings.establishedDate,
      specialties: settings.specialties || [],
      maxUsers: settings.maxUsers || 100,
      features: settings.features || {},
      branding: settings.branding || {},
      updatedAt: serverTimestamp()
    };

    await updateDoc(institutionRef, updateData);
    
    console.log('✅ Institution settings updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating institution settings:', error);
    throw error;
  }
};

// Institution API object
export const institutionAPI = {
  getInstitution,
  updateInstitutionLinks,
  checkSlugAvailability,
  generateInstitutionUrls,
  getInstitutionBySlug,
  getInstitutionByDomain,
  getInstitutionSettings,
  updateInstitutionSettings
};

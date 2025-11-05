import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { toast } from 'react-toastify';

/**
 * Upload a profile picture to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user ID for the file path
 * @param {string} userType - The type of user (client, caregiver, admin, etc.)
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export const uploadProfilePicture = async (file, userId, userType = 'user') => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile_${timestamp}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `profile-pictures/${userType}/${userId}/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

/**
 * Delete a profile picture from Firebase Storage
 * @param {string} imageUrl - The URL of the image to delete
 * @returns {Promise<void>}
 */
export const deleteProfilePicture = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract the file path from the URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    
    if (pathMatch) {
      const filePath = decodeURIComponent(pathMatch[1]);
      const imageRef = ref(storage, filePath);
      await deleteObject(imageRef);
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    // Don't throw error for deletion failures
  }
};

/**
 * Generate a default profile picture based on user's name
 * @param {string} name - The user's name
 * @param {string} userType - The type of user
 * @returns {string} - A data URL for the default avatar
 */
export const generateDefaultAvatar = (name, userType = 'user') => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  // Set background color based on user type
  const colors = {
    admin: '#dc2626',      // Red
    caregiver: '#7c3aed',  // Purple
    client: '#059669',     // Green
    doctor: '#2563eb',     // Blue
    nurse: '#16a34a',      // Green
    pharmacist: '#d97706', // Amber
    default: '#6b7280'     // Gray
  };
  
  const backgroundColor = colors[userType] || colors.default;
  
  // Draw background circle
  ctx.fillStyle = backgroundColor;
  ctx.beginPath();
  ctx.arc(100, 100, 100, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw initials
  const initials = name
    ?.split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 100, 100);
  
  return canvas.toDataURL();
};

/**
 * Resize image file to optimize for profile pictures
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - JPEG quality (0.1 to 1.0)
 * @returns {Promise<File>} - The resized image file
 */
export const resizeImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!file) {
    return { isValid: false, error: 'Please select a file' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Please select a valid image file (JPEG, PNG, or WebP)' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size must be less than 5MB' };
  }
  
  return { isValid: true, error: null };
};

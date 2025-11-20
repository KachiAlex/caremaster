/**
 * Image Optimization Utility
 * Provides functions for optimizing images before upload
 */

/**
 * Compress an image file
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1920)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1920)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 2)
 * @returns {Promise<File>} Compressed image file
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.8,
      maxSizeMB = 2
    } = options;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
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
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Check if compressed size is acceptable
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB > maxSizeMB) {
              // Try again with lower quality
              canvas.toBlob(
                (smallerBlob) => {
                  if (!smallerBlob) {
                    reject(new Error('Failed to compress image'));
                    return;
                  }
                  const compressedFile = new File(
                    [smallerBlob],
                    file.name,
                    { type: file.type, lastModified: Date.now() }
                  );
                  resolve(compressedFile);
                },
                file.type,
                Math.max(0.1, quality - 0.2)
              );
            } else {
              const compressedFile = new File(
                [blob],
                file.name,
                { type: file.type, lastModified: Date.now() }
              );
              resolve(compressedFile);
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * Get image dimensions
 * @param {File} file - The image file
 * @returns {Promise<Object>} Object with width and height
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {Array<string>} options.allowedTypes - Allowed MIME types (default: ['image/jpeg', 'image/png', 'image/webp'])
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 5)
 * @returns {Object} Validation result with isValid and error message
 */
export const validateImage = (file, options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSizeMB = 5
  } = options;

  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File is not an image' };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Image type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      isValid: false,
      error: `Image size exceeds maximum of ${maxSizeMB}MB`
    };
  }

  return { isValid: true, error: null };
};

/**
 * Create a thumbnail from an image
 * @param {File} file - The image file
 * @param {number} size - Thumbnail size in pixels (default: 200)
 * @returns {Promise<string>} Data URL of the thumbnail
 */
export const createThumbnail = (file, size = 200) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate thumbnail dimensions maintaining aspect ratio
        if (width > height) {
          if (width > size) {
            height = (height * size) / width;
            width = size;
          }
        } else {
          if (height > size) {
            width = (width * size) / height;
            height = size;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};


import React, { useState } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import { uploadProfilePicture, deleteProfilePicture, generateDefaultAvatar, resizeImage, validateImageFile } from '../utils/profilePictureUpload';
import { toast } from 'react-toastify';

const ProfilePicture = ({ 
  userId, 
  userType = 'user', 
  currentImageUrl, 
  userName, 
  onImageChange, 
  onImageRemove,
  size = 'medium',
  editable = false,
  showUploadButton = true,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const sizes = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-12 h-12 text-sm',
    large: 'w-16 h-16 text-base',
    xlarge: 'w-24 h-24 text-lg',
    xxlarge: 'w-32 h-32 text-xl'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
    xlarge: 'w-6 h-6',
    xxlarge: 'w-8 h-8'
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    
    try {
      // Resize image for optimization
      const resizedFile = await resizeImage(file);
      
      // Upload to Firebase Storage
      const imageUrl = await uploadProfilePicture(resizedFile, userId, userType);
      
      // Call the callback with the new image URL
      if (onImageChange) {
        onImageChange(imageUrl);
      }
      
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Delete from Firebase Storage
      await deleteProfilePicture(currentImageUrl);
      
      // Call the callback to remove the image
      if (onImageRemove) {
        onImageRemove();
      }
      
      toast.success('Profile picture removed successfully!');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validation = validateImageFile(file);
      
      if (validation.isValid) {
        // Simulate file input change
        const event = {
          target: {
            files: [file],
            value: ''
          }
        };
        handleFileSelect(event);
      } else {
        toast.error(validation.error);
      }
    }
  };

  const getDisplayImage = () => {
    if (previewUrl) return previewUrl;
    if (currentImageUrl) return currentImageUrl;
    return generateDefaultAvatar(userName, userType);
  };

  const getInitials = () => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Profile Picture Display */}
      <div className={`${sizes[size]} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center relative group`}>
        {getDisplayImage().startsWith('data:') || getDisplayImage().startsWith('http') ? (
          <img
            src={getDisplayImage()}
            alt={`${userName || 'User'}'s profile`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback Avatar */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
          {getInitials()}
        </div>
        
        {/* Upload Overlay */}
        {editable && showUploadButton && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
            <div className="flex flex-col items-center space-y-1">
              <Camera className={`${iconSizes[size]} text-white`} />
              <span className="text-xs text-white">Change</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Controls */}
      {editable && showUploadButton && (
        <div className="absolute -bottom-1 -right-1">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploading}
            />
            <button
              className={`${sizes[size === 'small' ? 'small' : 'medium']} bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg border-2 border-white`}
              disabled={uploading}
              title="Upload profile picture"
            >
              {uploading ? (
                <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-3 h-3"></div>
              ) : (
                <Upload className={`${iconSizes[size === 'small' ? 'small' : 'medium']}`} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Remove Button */}
      {editable && currentImageUrl && (
        <button
          onClick={handleRemoveImage}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg border border-white"
          title="Remove profile picture"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Drag and Drop Area (for larger sizes) */}
      {editable && (size === 'large' || size === 'xlarge' || size === 'xxlarge') && (
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-transparent hover:border-blue-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          title="Drag and drop image here"
        />
      )}
    </div>
  );
};

export default ProfilePicture;

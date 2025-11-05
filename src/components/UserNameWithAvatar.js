import React from 'react';
import ProfilePicture from './ProfilePicture';

/**
 * UserNameWithAvatar Component
 * 
 * A reusable component that displays a user's name with their miniature profile picture
 * Used throughout the application wherever user names are displayed
 */

const UserNameWithAvatar = ({ 
  userId, 
  userName, 
  userType = 'user', 
  profilePictureUrl,
  size = 'small',
  showName = true,
  className = '',
  nameClassName = '',
  onClick = null
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(userId, userName, userType);
    }
  };

  return (
    <div 
      className={`flex items-center ${onClick ? 'cursor-pointer hover:bg-gray-50 rounded-lg p-1' : ''} ${className}`}
      onClick={handleClick}
    >
      <ProfilePicture
        userId={userId}
        userType={userType}
        currentImageUrl={profilePictureUrl}
        userName={userName}
        size={size}
        editable={false}
        showUploadButton={false}
        className="mr-2"
      />
      {showName && (
        <span className={`text-sm font-medium text-gray-900 ${nameClassName}`}>
          {userName || 'Unknown User'}
        </span>
      )}
    </div>
  );
};

export default UserNameWithAvatar;

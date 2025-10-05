import React from 'react';
import './Avatar.scss';

const Avatar = ({ 
  src, 
  alt, 
  size = 'medium', 
  status,
  className = '',
  fallback,
  onClick
}) => {
  const avatarClasses = `avatar avatar--${size} ${onClick ? 'avatar--clickable' : ''} ${className}`;
  
  const renderFallback = () => {
    if (fallback) return fallback;
    if (alt) return alt.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <div className={avatarClasses} onClick={onClick}>
      <div className="avatar__image">
        {src ? (
          <img src={src} alt={alt} onError={(e) => e.target.style.display = 'none'} />
        ) : (
          <span className="avatar__fallback">{renderFallback()}</span>
        )}
      </div>
      {status && <span className={`avatar__status avatar__status--${status}`} />}
    </div>
  );
};

// Compound components
Avatar.Group = ({ children, max = 3, className = '' }) => {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const extraCount = avatars.length - max;

  return (
    <div className={`avatar-group ${className}`}>
      {visibleAvatars.map((avatar, index) => 
        React.cloneElement(avatar, { 
          key: index, 
          className: `${avatar.props.className || ''} avatar-group__item`.trim()
        })
      )}
      {extraCount > 0 && (
        <div className="avatar avatar--medium avatar-group__item">
          <span className="avatar__fallback">+{extraCount}</span>
        </div>
      )}
    </div>
  );
};

export default Avatar;
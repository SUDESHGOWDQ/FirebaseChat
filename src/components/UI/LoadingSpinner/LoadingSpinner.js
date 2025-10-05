import React from 'react';
import './LoadingSpinner.scss';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary',
  className = '',
  text
}) => {
  const spinnerClasses = `loading-spinner loading-spinner--${size} loading-spinner--${color} ${className}`;

  return (
    <div className="loading-container">
      <div className={spinnerClasses} />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

// Compound components for different loading states
LoadingSpinner.Overlay = ({ children, loading, ...props }) => {
  if (!loading) return children;

  return (
    <div className="loading-overlay">
      {children}
      <div className="loading-overlay__spinner">
        <LoadingSpinner {...props} />
      </div>
    </div>
  );
};

LoadingSpinner.Page = ({ text = "Loading...", ...props }) => (
  <div className="loading-page">
    <LoadingSpinner text={text} {...props} />
  </div>
);

LoadingSpinner.Inline = ({ ...props }) => (
  <LoadingSpinner size="small" {...props} />
);

export default LoadingSpinner;
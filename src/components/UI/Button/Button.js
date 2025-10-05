import React from 'react';
import './Button.scss';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  icon,
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  const getButtonClasses = () => {
    const baseClasses = 'btn';
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const disabledClass = disabled || loading ? 'btn--disabled' : '';
    const loadingClass = loading ? 'btn--loading' : '';
    
    return [baseClasses, variantClass, sizeClass, disabledClass, loadingClass, className]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <button
      type={type}
      className={getButtonClasses()}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn__spinner" />}
      {icon && !loading && <span className="btn__icon">{icon}</span>}
      <span className="btn__text">{children}</span>
    </button>
  );
};

// Compound components for specific use cases
Button.Icon = ({ children, onClick, disabled, className = '', ...props }) => (
  <button
    type="button"
    className={`btn-icon ${disabled ? 'btn-icon--disabled' : ''} ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

Button.Back = ({ onClick, className = '', ...props }) => (
  <Button.Icon
    className={`btn-back ${className}`}
    onClick={onClick}
    {...props}
  >
    ←
  </Button.Icon>
);

export default Button;
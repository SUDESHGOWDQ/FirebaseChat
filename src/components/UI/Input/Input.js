import React from 'react';
import './Input.scss';

const Input = ({ 
  label,
  error,
  icon,
  className = '',
  containerClassName = '',
  ...props 
}) => {
  const inputClasses = `input ${error ? 'input--error' : ''} ${className}`;
  const containerClasses = `input-container ${containerClassName}`;

  return (
    <div className={containerClasses}>
      {label && (
        <label className="input__label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="input__wrapper">
        {icon && <span className="input__icon">{icon}</span>}
        <input
          className={inputClasses}
          {...props}
        />
      </div>
      {error && <span className="input__error">{error}</span>}
    </div>
  );
};

// Compound components
Input.Search = ({ placeholder = "Search...", ...props }) => (
  <Input
    type="search"
    placeholder={placeholder}
    icon="🔍"
    {...props}
  />
);

Input.Password = ({ ...props }) => (
  <Input
    type="password"
    {...props}
  />
);

Input.Email = ({ ...props }) => (
  <Input
    type="email"
    {...props}
  />
);

export default Input;
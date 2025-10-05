import React from 'react';
import './Card.scss';

const Card = ({ 
  children, 
  className = '',
  padding = 'medium',
  hover = false,
  ...props 
}) => {
  const cardClasses = `card card--${padding} ${hover ? 'card--hover' : ''} ${className}`;

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

// Compound components
Card.Header = ({ children, className = '' }) => (
  <div className={`card__header ${className}`}>
    {children}
  </div>
);

Card.Body = ({ children, className = '' }) => (
  <div className={`card__body ${className}`}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`card__footer ${className}`}>
    {children}
  </div>
);

Card.Title = ({ children, className = '' }) => (
  <h3 className={`card__title ${className}`}>
    {children}
  </h3>
);

Card.Subtitle = ({ children, className = '' }) => (
  <p className={`card__subtitle ${className}`}>
    {children}
  </p>
);

export default Card;
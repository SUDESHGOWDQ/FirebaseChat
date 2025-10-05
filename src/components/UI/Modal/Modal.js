import React from 'react';
import './Modal.scss';

const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  size = 'medium',
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalClasses = `modal modal--${size} ${className}`;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={modalClasses}>
        {showCloseButton && (
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

// Compound components
Modal.Header = ({ children, className = '' }) => (
  <div className={`modal__header ${className}`}>
    {children}
  </div>
);

Modal.Body = ({ children, className = '' }) => (
  <div className={`modal__body ${className}`}>
    {children}
  </div>
);

Modal.Footer = ({ children, className = '' }) => (
  <div className={`modal__footer ${className}`}>
    {children}
  </div>
);

Modal.Title = ({ children, className = '' }) => (
  <h2 className={`modal__title ${className}`}>
    {children}
  </h2>
);

export default Modal;
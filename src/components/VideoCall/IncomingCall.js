import React, { useState, useEffect } from 'react';
import { FaPhone, FaPhoneSlash, FaVideo, FaUser, FaMicrophone } from 'react-icons/fa';
import './IncomingCall.scss';

const IncomingCall = ({ caller, onAccept, onDecline, callType = 'video' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Add a small delay for smooth animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setIsVisible(false);
    setTimeout(onAccept, 300); // Wait for animation to complete
  };

  const handleDecline = () => {
    setIsVisible(false);
    setTimeout(onDecline, 300); // Wait for animation to complete
  };

  return (
    <div className={`incoming-call-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="incoming-call-container">
        {/* Background blur effect */}
        <div className="call-background"></div>
        
        {/* Call content */}
        <div className="call-content">
          {/* Caller avatar */}
          <div className="caller-avatar">
            {caller.photoURL ? (
              <img src={caller.photoURL} alt={caller.displayName} />
            ) : (
              <div className="default-avatar">
                <FaUser />
              </div>
            )}
          </div>

          {/* Call info */}
          <div className="call-info">
            <h2 className="caller-name">{caller.displayName || 'Unknown Caller'}</h2>
            <p className="call-type">
              {callType === 'voice' ? (
                <>
                  <FaMicrophone className="call-icon" />
                  Incoming voice call
                </>
              ) : (
                <>
                  <FaVideo className="call-icon" />
                  Incoming video call
                </>
              )}
            </p>
          </div>

          {/* Call actions */}
          <div className="call-actions">
            <button 
              className="call-btn decline-btn"
              onClick={handleDecline}
              aria-label="Decline call"
            >
              <FaPhoneSlash />
            </button>
            
            <button 
              className="call-btn accept-btn"
              onClick={handleAccept}
              aria-label="Accept call"
            >
              <FaPhone />
            </button>
          </div>

          {/* Animated rings */}
          <div className="call-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;
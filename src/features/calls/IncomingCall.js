import React from 'react';
import { useCall } from '../../contexts/CallContext';
import { Button, Avatar } from '../../components/UI';
import { FaPhone, FaPhoneSlash, FaVideo, FaMicrophone } from 'react-icons/fa';
import './IncomingCall.scss';

const IncomingCall = () => {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useCall();

  if (!incomingCall) return null;

  const { caller, type: callType } = incomingCall;

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call">
        <div className="incoming-call__content">
          <Avatar
            src={caller.photoURL}
            alt={caller.displayName}
            size="extra-large"
            className="incoming-call__avatar"
          />
          
          <div className="incoming-call__info">
            <h2 className="incoming-call__name">
              {caller.displayName || 'Unknown Caller'}
            </h2>
            <p className="incoming-call__type">
              {callType === 'voice' ? (
                <>
                  <FaMicrophone className="incoming-call__icon" />
                  Incoming voice call
                </>
              ) : (
                <>
                  <FaVideo className="incoming-call__icon" />
                  Incoming video call
                </>
              )}
            </p>
          </div>

          <div className="incoming-call__actions">
            <Button.Icon
              onClick={declineIncomingCall}
              className="incoming-call__btn incoming-call__btn--decline"
              title="Decline call"
            >
              <FaPhoneSlash />
            </Button.Icon>

            <Button.Icon
              onClick={acceptIncomingCall}
              className="incoming-call__btn incoming-call__btn--accept"
              title="Accept call"
            >
              <FaPhone />
            </Button.Icon>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;
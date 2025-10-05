import React from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useCall } from '../../contexts/CallContext';
import { Button } from '../../components/UI';
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';
import './CallInterface.scss';

const CallInterface = ({ friendId, friendName, callType = 'video' }) => {
  const {
    localVideoRef,
    remoteVideoRef,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    endCall: endWebRTCCall
  } = useWebRTC();

  const { activeCall, endCall } = useCall();

  const handleEndCall = () => {
    endWebRTCCall();
    endCall();
  };

  if (!activeCall) return null;

  return (
    <div className={`call-interface call-interface--${callType}`}>
      {callType === 'video' ? (
        <div className="call-interface__video">
          <div className="call-interface__remote">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="call-interface__remote-video"
            />
            {activeCall.status === 'connecting' && (
              <div className="call-interface__status">
                <p>Connecting to {friendName}...</p>
              </div>
            )}
          </div>
          
          <div className="call-interface__local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="call-interface__local-video"
            />
          </div>
        </div>
      ) : (
        <div className="call-interface__voice">
          <div className="call-interface__avatar">
            <img 
              src={activeCall.friendData?.photoURL || '/default-avatar.png'} 
              alt={friendName}
            />
          </div>
          <div className="call-interface__info">
            <h2>{friendName}</h2>
            <p className="call-interface__status">
              {activeCall.status === 'connecting' && 'Connecting...'}
              {activeCall.status === 'ringing' && 'Calling...'}
              {activeCall.status === 'active' && 'In call'}
            </p>
          </div>
        </div>
      )}

      <div className="call-interface__controls">
        <Button.Icon
          onClick={toggleAudio}
          className={`call-control ${!isAudioEnabled ? 'call-control--disabled' : ''}`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </Button.Icon>

        {callType === 'video' && (
          <Button.Icon
            onClick={toggleVideo}
            className={`call-control ${!isVideoEnabled ? 'call-control--disabled' : ''}`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
          </Button.Icon>
        )}

        <Button.Icon
          onClick={handleEndCall}
          className="call-control call-control--end"
          title="End call"
        >
          <FaPhoneSlash />
        </Button.Icon>
      </div>
    </div>
  );
};

export default CallInterface;
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot
} from 'firebase/firestore';
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaUsers, FaUser } from 'react-icons/fa';
import './GroupVideoCall.scss';

const GroupVideoCall = ({ group, onEndCall }) => {
  const [callId, setCallId] = useState(null);
  const [callState, setCallState] = useState('connecting');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const currentUser = auth.currentUser;

  // Initialize local stream
  useEffect(() => {
    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        streamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create call document
        const callDoc = await addDoc(collection(db, 'groupCalls'), {
          groupId: group.id,
          initiator: currentUser.uid,
          participants: [{
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Unknown',
            userPhoto: currentUser.photoURL || '',
            joinedAt: new Date()
          }],
          status: 'active',
          createdAt: new Date()
        });

        setCallId(callDoc.id);
        setCallState('active');
      } catch (error) {
        console.error('Error initializing call:', error);
        setError('Failed to access camera/microphone');
        setCallState('error');
      }
    };

    initializeCall();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [group.id, currentUser.uid, currentUser.displayName, currentUser.photoURL]);

  // Listen for participants
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = onSnapshot(doc(db, 'groupCalls', callId), (doc) => {
      if (doc.exists()) {
        const callData = doc.data();
        setParticipants(callData.participants || []);
        
        if (callData.status === 'ended') {
          onEndCall();
        }
      }
    });

    return () => unsubscribe();
  }, [callId, onEndCall]);

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    try {
      // Clean up local stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // End the call
      if (callId) {
        await updateDoc(doc(db, 'groupCalls', callId), {
          status: 'ended',
          endedAt: new Date()
        });
      }

      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
      onEndCall();
    }
  };

  if (callState === 'connecting') {
    return (
      <div className="group-video-call loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Connecting to group call...</h3>
          <p>Setting up your camera and microphone</p>
        </div>
      </div>
    );
  }

  if (callState === 'error' || error) {
    return (
      <div className="group-video-call error">
        <div className="error-content">
          <h3>Call Error</h3>
          <p>{error || 'Something went wrong with the call'}</p>
          <button onClick={onEndCall} className="end-call-btn">
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-video-call">
      <div className="call-header">
        <div className="call-info">
          <h3>{group.name}</h3>
          <span className="participant-count">
            <FaUsers />
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`video-element ${!isVideoEnabled ? 'video-disabled' : ''}`}
          />
          <div className="video-overlay">
            <span className="participant-name">You</span>
            {!isAudioEnabled && <FaMicrophoneSlash className="muted-indicator" />}
          </div>
          {!isVideoEnabled && (
            <div className="video-placeholder">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="You"
                  className="avatar-placeholder"
                />
              ) : (
                <div className="avatar-placeholder-icon">
                  <FaUser />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Other participants */}
        {participants
          .filter(p => p.userId !== currentUser.uid)
          .map(participant => (
            <div key={participant.userId} className="video-container remote">
              <div className="video-element">
                <div className="video-placeholder">
                  <img 
                    src={participant.userPhoto || '/default-avatar.png'} 
                    alt={participant.userName}
                    className="avatar-placeholder"
                  />
                </div>
              </div>
              <div className="video-overlay">
                <span className="participant-name">{participant.userName}</span>
              </div>
            </div>
          ))
        }
      </div>

      <div className="call-controls">
        <button 
          onClick={toggleAudio}
          className={`control-btn audio-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button 
          onClick={toggleVideo}
          className={`control-btn video-btn ${!isVideoEnabled ? 'disabled' : ''}`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>

        <button 
          onClick={endCall}
          className="control-btn end-call-btn"
          title="Leave call"
        >
          <FaPhoneSlash />
        </button>
      </div>
    </div>
  );
};

export default GroupVideoCall;
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc
} from 'firebase/firestore';
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaUser } from 'react-icons/fa';
import Peer from 'simple-peer';
import './VoiceCall.scss';

const VoiceCall = ({ friendId, friendName, onEndCall, callId: initialCallId, callerInfo }) => {
  const [callId, setCallId] = useState(initialCallId);
  const [callState, setCallState] = useState('connecting'); // connecting, ringing, active, ended
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [peer, setPeer] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  const streamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const currentUser = auth.currentUser;

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start call duration timer
  const startDurationTimer = () => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);
  };

  // Stop call duration timer
  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // Get user media (audio only)
  const getUserMedia = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support voice calling');
      }

      const constraints = {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      
      let errorMessage = 'Failed to access microphone. ';
      
      switch (error.name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage += 'Microphone is already in use by another application.';
          break;
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage += 'Permission denied. Please allow microphone access and refresh the page.';
          break;
        case 'TypeError':
          errorMessage += 'Your browser does not support voice calling.';
          break;
        default:
          errorMessage += 'Please check your microphone is connected and try again.';
      }
      
      setError(errorMessage);
      throw error;
    }
  };

  // Create peer connection
  const createPeerConnection = (isInitiator = false, stream) => {
    const peerInstance = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          // Google STUN servers (most reliable)
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          
          // Additional STUN servers
          { urls: 'stun:stun.nextcloud.com:443' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          
          // TURN servers for NAT traversal
          {
            urls: ['turn:relay1.expressturn.com:3478'],
            username: 'ef4IKQP8S8EMBZV36Q',
            credential: 'dM6wXUz1a1n9d8Qd'
          },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      }
    });

    peerInstance.on('signal', async (signalData) => {
      try {
        if (!callId) {
          const callDocRef = await addDoc(collection(db, 'calls'), {
            caller: currentUser.uid,
            callee: friendId,
            signal: signalData,
            status: 'ringing',
            type: 'voice',
            createdAt: new Date(),
            timeout: new Date(Date.now() + 60000) // 1 minute timeout
          });
          setCallId(callDocRef.id);
          setCallState('ringing');
        } else {
          await updateDoc(doc(db, 'calls', callId), {
            answer: signalData,
            status: 'active',
            answeredAt: new Date()
          });
          setCallState('active');
          startDurationTimer();
        }
      } catch (error) {
        console.error('Error handling signal:', error);
        setError('Failed to establish connection. Please try again.');
      }
    });

    peerInstance.on('stream', (incomingStream) => {
      console.log('Received remote audio stream');
      
      // Clean up previous audio element
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
      
      // Create and setup new audio element
      const audio = new Audio();
      audio.srcObject = incomingStream;
      audio.autoplay = true;
      audio.volume = 1.0;
      
      // Store reference for cleanup
      remoteAudioRef.current = audio;

      
      // Handle autoplay issues
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Remote audio started playing');
          })
          .catch((error) => {
            console.log('Audio autoplay failed, trying alternative approach:', error);
            
            // For autoplay issues, try a different approach
            audio.muted = true;
            audio.play().then(() => {
              console.log('Playing muted, will unmute after user interaction');
              
              // Unmute after a brief delay (browser security allows this)
              setTimeout(() => {
                audio.muted = false;
                console.log('Audio unmuted');
              }, 500);
            }).catch(e => {
              console.error('Even muted audio play failed:', e);
              // Last resort: create a user-initiated play button
              setError('Click anywhere to enable audio playback');
              const enableAudio = () => {
                audio.play();
                document.removeEventListener('click', enableAudio);
                setError(null);
              };
              document.addEventListener('click', enableAudio, { once: true });
            });
          });
      }
    });

    peerInstance.on('error', (err) => {
      console.error('Peer connection error:', err);
      
      let errorMessage = 'Connection failed. Please try again.';
      
      if (err.message && err.message.includes('Connection failed')) {
        errorMessage = 'Unable to establish connection. This may be due to network restrictions.';
      } else if (err.message && err.message.includes('ICE')) {
        errorMessage = 'Network connection issue. Please check your internet connection.';
      }
      
      setError(errorMessage);
      setCallState('ended');
    });

    peerInstance.on('close', () => {
      console.log('Peer connection closed');
      endCall();
    });

    // Connection timeout
    const connectionTimeout = setTimeout(() => {
      if (callState === 'connecting' || callState === 'ringing') {
        setError('Connection timeout. Please check your network and try again.');
        setCallState('ended');
        if (peerInstance && !peerInstance.destroyed) {
          peerInstance.destroy();
        }
      }
    }, 30000);

    // Monitor connection states
    if (peerInstance._pc) {
      peerInstance._pc.oniceconnectionstatechange = () => {
        const iceState = peerInstance._pc.iceConnectionState;
        console.log('ICE connection state:', iceState);
        
        switch (iceState) {
          case 'checking':
            setCallState('connecting');
            break;
          case 'connected':
          case 'completed':
            clearTimeout(connectionTimeout);
            setError(null);
            setCallState('active');
            if (!callStartTimeRef.current) {
              startDurationTimer();
            }
            break;
          case 'disconnected':
            setError('Connection interrupted. Attempting to reconnect...');
            setTimeout(() => {
              if (peerInstance._pc && peerInstance._pc.iceConnectionState === 'disconnected') {
                setError('Connection lost. Please try calling again.');
                setCallState('ended');
              }
            }, 10000);
            break;
          case 'failed':
            setError('Connection failed due to network issues.');
            setCallState('ended');
            break;
          case 'closed':
            setCallState('ended');
            break;
          default:
            break;
        }
      };
    }

    return peerInstance;
  };

  // End the call
  const endCall = async () => {
    try {
      stopDurationTimer();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (peer) {
        peer.destroy();
      }

      if (callId) {
        await updateDoc(doc(db, 'calls', callId), {
          status: 'ended',
          endedAt: new Date(),
          duration: callDuration
        });
      }

      setCallState('ended');
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Create a new call
  const createCall = async () => {
    try {
      const stream = await getUserMedia();
      const peerInstance = createPeerConnection(true, stream);
      setPeer(peerInstance);
    } catch (error) {
      console.error('Error creating call:', error);
      setError('Failed to create call');
    }
  };

  // Answer an incoming call
  const answerCall = async (incomingCallId) => {
    try {
      const stream = await getUserMedia();
      const callDoc = await getDoc(doc(db, 'calls', incomingCallId));
      const callData = callDoc.data();

      if (!callData?.signal) {
        throw new Error('Invalid call data');
      }

      const peerInstance = createPeerConnection(false, stream);
      setPeer(peerInstance);
      
      peerInstance.signal(callData.signal);
      setCallId(incomingCallId);
      startDurationTimer();
    } catch (error) {
      console.error('Error answering call:', error);
      setError('Failed to answer call');
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Setup call
  useEffect(() => {
    let callUnsubscribe;

    const setupCall = async () => {
      try {
        if (!initialCallId) {
          await createCall();
        } else {
          await answerCall(initialCallId);
        }

        if (callId || initialCallId) {
          const docId = callId || initialCallId;
          callUnsubscribe = onSnapshot(doc(db, 'calls', docId), (doc) => {
            const data = doc.data();
            if (data?.status === 'ended') {
              endCall();
            }
          });
        }
      } catch (error) {
        console.error('Error setting up call:', error);
        setError('Failed to setup call');
      }
    };

    setupCall();

    return () => {
      stopDurationTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        peer.destroy();
      }
      if (callUnsubscribe) {
        callUnsubscribe();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for call answers
  useEffect(() => {
    let callListener;
    
    if (callId && !initialCallId) {
      callListener = onSnapshot(doc(db, 'calls', callId), (doc) => {
        const data = doc.data();
        if (data?.answer && peer) {
          peer.signal(data.answer);
          startDurationTimer();
        }
        if (data?.status === 'ended') {
          endCall();
        }
      });
    }

    return () => {
      if (callListener) {
        callListener();
      }
    };
  }, [callId, peer, initialCallId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="voice-call-error">
        <div className="error-content">
          <h3>Call Error</h3>
          <p>{error}</p>
          
          {error.includes('Permission denied') && (
            <div className="permission-help">
              <p>To enable voice calling:</p>
              <ol>
                <li>Click the microphone icon in your browser's address bar</li>
                <li>Select "Allow" for microphone</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
          
          <button onClick={onEndCall} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-call-container">
      <div className="voice-call-content">
        {/* Caller avatar */}
        <div className="caller-avatar">
          {callerInfo?.photoURL ? (
            <img src={callerInfo.photoURL} alt={friendName} />
          ) : (
            <div className="default-avatar">
              <FaUser />
            </div>
          )}
        </div>

        {/* Call info */}
        <div className="call-info">
          <h2 className="caller-name">{friendName || callerInfo?.displayName || 'Unknown'}</h2>
          
          {callState === 'ringing' && <p className="call-status">Calling...</p>}
          {callState === 'connecting' && <p className="call-status">Connecting...</p>}
          {callState === 'active' && (
            <p className="call-duration">{formatDuration(callDuration)}</p>
          )}
        </div>

        {/* Audio visualization (optional) */}
        {callState === 'active' && (
          <div className="audio-visualizer">
            <div className="wave wave-1"></div>
            <div className="wave wave-2"></div>
            <div className="wave wave-3"></div>
            <div className="wave wave-4"></div>
            <div className="wave wave-5"></div>
          </div>
        )}

        {/* Call controls */}
        <div className="voice-call-controls">
          <button
            onClick={toggleAudio}
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>

          <button
            onClick={endCall}
            className="control-btn end-call"
            title="End call"
          >
            <FaPhoneSlash />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCall;
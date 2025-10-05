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
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';
import Peer from 'simple-peer';
import './VideoCall.scss';

const VideoCall = ({ friendId, friendName, onEndCall, callId: initialCallId, callerInfo }) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [callId, setCallId] = useState(initialCallId);
  const [callState, setCallState] = useState('connecting'); // connecting, ringing, active, ended
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [peer, setPeer] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const currentUser = auth.currentUser;

  // Enhanced video configuration for autoplay
  const setupVideoElement = (videoElement, stream, isRemote = false) => {
    if (!videoElement || !stream) return;
    
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = !isRemote; // Local video is muted, remote is not
    
    // Force play for better browser compatibility
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Video started playing successfully');
        })
        .catch((error) => {
          console.log('Video autoplay failed:', error);
          
          // Create user-friendly error messages
          if (error.name === 'NotAllowedError') {
            setError('Video autoplay blocked. Please click anywhere to enable video.');
            // Add click handler to enable video on user interaction
            const enableVideo = () => {
              videoElement.play();
              document.removeEventListener('click', enableVideo);
            };
            document.addEventListener('click', enableVideo);
          } else if (isRemote) {
            // Try playing muted as fallback for remote video
            videoElement.muted = true;
            videoElement.play().then(() => {
              console.log('Remote video started playing muted as fallback');
              // Show unmute button to user
              setTimeout(() => {
                videoElement.muted = false;
              }, 1000);
            }).catch(e => console.log('Muted play also failed:', e));
          }
        });
    }
  };

  // Get user media with enhanced error handling
  const getUserMedia = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support video calling');
      }

      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Setup local video immediately
      if (localVideoRef.current) {
        setupVideoElement(localVideoRef.current, stream, false);
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing user media:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to access camera and microphone. ';
      
      switch (error.name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage += 'No camera or microphone found. Please connect a device and try again.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage += 'Camera or microphone is already in use by another application.';
          break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
          errorMessage += 'Camera or microphone does not meet requirements. Trying with lower quality...';
          // Try with fallback constraints
          return await getUserMediaFallback();
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage += 'Permission denied. Please allow camera and microphone access and refresh the page.';
          break;
        case 'TypeError':
          errorMessage += 'Your browser does not support video calling.';
          break;
        default:
          errorMessage += 'Please check your camera and microphone are connected and try again.';
      }
      
      setError(errorMessage);
      throw error;
    }
  };

  // Fallback getUserMedia with lower constraints
  const getUserMediaFallback = async () => {
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true
      });
      
      streamRef.current = fallbackStream;
      
      if (localVideoRef.current) {
        setupVideoElement(localVideoRef.current, fallbackStream, false);
      }
      
      return fallbackStream;
    } catch (fallbackError) {
      console.error('Fallback getUserMedia also failed:', fallbackError);
      
      // Try audio only as last resort
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        
        streamRef.current = audioOnlyStream;
        setError('Video unavailable. Using audio only mode.');
        
        return audioOnlyStream;
      } catch (audioError) {
        setError('Unable to access any media devices. Please check permissions and device availability.');
        throw audioError;
      }
    }
  };

  // Create peer connection using simple-peer
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
          
          // Additional STUN servers for better connectivity
          { urls: 'stun:stun.nextcloud.com:443' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          
          // Free TURN servers (consider replacing with your own for production)
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
          // Create new call document
          const callDocRef = await addDoc(collection(db, 'calls'), {
            caller: currentUser.uid,
            callee: friendId,
            signal: signalData,
            status: 'ringing',
            type: 'video',
            createdAt: new Date(),
            timeout: new Date(Date.now() + 60000) // 1 minute timeout
          });
          setCallId(callDocRef.id);
          setCallState('ringing');
        } else {
          // Answer existing call
          await updateDoc(doc(db, 'calls', callId), {
            answer: signalData,
            status: 'active',
            answeredAt: new Date()
          });
          setCallState('active');
        }
      } catch (error) {
        console.error('Error handling signal:', error);
        setError('Failed to establish connection. Please try again.');
      }
    });

    peerInstance.on('stream', (incomingStream) => {
      console.log('Received remote stream');
      setRemoteStream(incomingStream);
      
      // Setup remote video with autoplay
      if (remoteVideoRef.current) {
        setupVideoElement(remoteVideoRef.current, incomingStream, true);
      }
      
      // Also handle audio properly for remote stream
      const audioTracks = incomingStream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log('Remote audio track received');
      }
    });

    peerInstance.on('error', (err) => {
      console.error('Peer connection error:', err);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Connection failed. Please try again.';
      
      if (err.message && err.message.includes('Connection failed')) {
        errorMessage = 'Unable to establish connection. This may be due to network restrictions or firewall settings.';
      } else if (err.message && err.message.includes('ICE')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (err.message && err.message.includes('DTLS')) {
        errorMessage = 'Secure connection failed. Please refresh the page and try again.';
      }
      
      setError(errorMessage);
      setCallState('ended');
    });

    peerInstance.on('close', () => {
      console.log('Peer connection closed');
      endCall();
    });

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (callState === 'connecting' || callState === 'ringing') {
        console.warn('Connection timeout - destroying peer');
        setError('Connection timeout. Please check your network and try again.');
        setCallState('ended');
        if (peerInstance && !peerInstance.destroyed) {
          peerInstance.destroy();
        }
      }
    }, 30000); // 30 second timeout

    // Clear timeout when connection is established
    peerInstance.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('Peer connection established');
      setCallState('active');
    });

    // Monitor ICE connection state for better debugging
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
            break;
          case 'disconnected':
            console.warn('ICE connection disconnected, attempting to reconnect...');
            setError('Connection interrupted. Attempting to reconnect...');
            // Don't end call immediately, give it time to reconnect
            setTimeout(() => {
              if (peerInstance._pc && peerInstance._pc.iceConnectionState === 'disconnected') {
                setError('Connection lost. Please try calling again.');
                setCallState('ended');
              }
            }, 10000); // Wait 10 seconds before giving up
            break;
          case 'failed':
            console.error('ICE connection failed');
            setError('Connection failed due to network issues. Please check your internet connection and try again.');
            setCallState('ended');
            break;
          case 'closed':
            setCallState('ended');
            break;
          default:
            break;
        }
      };

      // Monitor connection state changes
      peerInstance._pc.onconnectionstatechange = () => {
        const connectionState = peerInstance._pc.connectionState;
        console.log('Connection state:', connectionState);
        
        switch (connectionState) {
          case 'connecting':
            setCallState('connecting');
            break;
          case 'connected':
            setCallState('active');
            setError(null);
            clearTimeout(connectionTimeout);
            break;
          case 'disconnected':
            setError('Connection interrupted. Attempting to reconnect...');
            break;
          case 'failed':
            setError('Connection failed. Please check your network and try again.');
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
      // Stop local stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close peer connection
      if (peer) {
        peer.destroy();
      }

      // Update call status in Firestore
      if (callId) {
        await updateDoc(doc(db, 'calls', callId), {
          status: 'ended',
          endedAt: new Date()
        });
      }

      setCallState('ended');
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
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

  // Toggle video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Setup call based on props
  useEffect(() => {
    let callUnsubscribe;
    let isMounted = true;

    // Create a new call
    const createCall = async () => {
      try {
        const stream = await getUserMedia();
        const peerInstance = createPeerConnection(true, stream);
        setPeer(peerInstance);

        // The listener will be set up in another useEffect once callId is available
        return null;
      } catch (error) {
        console.error('Error creating call:', error);
        if (isMounted) {
          setError('Failed to create call');
        }
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
        
        // Signal to the caller
        peerInstance.signal(callData.signal);

        setCallId(incomingCallId);
      } catch (error) {
        console.error('Error answering call:', error);
        if (isMounted) {
          setError('Failed to answer call');
        }
      }
    };

    const setupCall = async () => {
      try {
        if (!isMounted) return;
        
        if (!initialCallId) {
          // Create new call
          await createCall();
        } else {
          // Answer incoming call
          await answerCall(initialCallId);
        }
      } catch (error) {
        console.error('Error setting up call:', error);
        if (isMounted) {
          setError('Failed to setup call. Please check your internet connection and try again.');
        }
      }
    };

    // Listen for call updates
    if (initialCallId) {
      callUnsubscribe = onSnapshot(doc(db, 'calls', initialCallId), (doc) => {
        if (!isMounted) return;
        const data = doc.data();
        if (data?.status === 'ended') {
          endCall();
        }
      });
    }

    setupCall();

    return () => {
      isMounted = false;
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
      if (callUnsubscribe) {
        callUnsubscribe();
      }
    };
  }, [initialCallId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up listener for newly created calls
  useEffect(() => {
    let callListener;
    
    if (callId && !initialCallId) {
      // This is for calls we initiated - listen for answers
      callListener = onSnapshot(doc(db, 'calls', callId), (doc) => {
        const data = doc.data();
        if (data?.answer && peer) {
          peer.signal(data.answer);
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
      <div className="video-call-error">
        <div className="error-content">
          <h3>Call Error</h3>
          <p>{error}</p>
          
          {/* Retry button for certain types of errors */}
          {error.includes('autoplay') && (
            <button 
              onClick={() => {
                setError(null);
                // Try to reinitialize
                if (localVideoRef.current && streamRef.current) {
                  setupVideoElement(localVideoRef.current, streamRef.current, false);
                }
                if (remoteVideoRef.current && remoteStream) {
                  setupVideoElement(remoteVideoRef.current, remoteStream, true);
                }
              }} 
              className="btn btn-secondary retry-btn"
            >
              Try Again
            </button>
          )}
          
          {error.includes('Permission denied') && (
            <div className="permission-help">
              <p>To enable video calling:</p>
              <ol>
                <li>Click the camera icon in your browser's address bar</li>
                <li>Select "Allow" for camera and microphone</li>
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
    <div className="video-call-container">
      <div className="video-streams">
        <div className="remote-video-container">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
          {callState === 'ringing' && (
            <div className="call-status">
              <div className="caller-info">
                {callerInfo?.photoURL && (
                  <img src={callerInfo.photoURL} alt={friendName} className="caller-avatar" />
                )}
                <h3>Calling {friendName || callerInfo?.displayName || 'Unknown'}...</h3>
                <p>Waiting for answer</p>
              </div>
            </div>
          )}
          {callState === 'connecting' && (
            <div className="call-status">
              <div className="caller-info">
                {callerInfo?.photoURL && (
                  <img src={callerInfo.photoURL} alt={friendName} className="caller-avatar" />
                )}
                <h3>Connecting to {friendName || callerInfo?.displayName || 'Unknown'}...</h3>
              </div>
            </div>
          )}
          {!remoteStream && callState === 'active' && (
            <div className="call-status">
              <div className="caller-info">
                {callerInfo?.photoURL && (
                  <img src={callerInfo.photoURL} alt={friendName} className="caller-avatar" />
                )}
                <h3>Waiting for {friendName || callerInfo?.displayName || 'Unknown'}'s video...</h3>
              </div>
            </div>
          )}
        </div>

        <div className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
        </div>
      </div>

      <div className="call-controls">
        <button
          onClick={toggleAudio}
          className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
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
  );
};

export default VideoCall;
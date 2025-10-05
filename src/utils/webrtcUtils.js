// WebRTC utility functions for better connection handling
import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Peer from 'simple-peer';

// Enhanced ICE server configuration
export const getICEServers = () => {
  return [
    // Google STUN servers (most reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional STUN servers for redundancy
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
  ];
};

// Test WebRTC support
export const testWebRTCSupport = () => {
  const errors = [];
  
  if (!navigator.mediaDevices) {
    errors.push('MediaDevices API not supported');
  }
  
  if (!navigator.mediaDevices?.getUserMedia) {
    errors.push('getUserMedia not supported');
  }
  
  if (!window.RTCPeerConnection) {
    errors.push('RTCPeerConnection not supported');
  }
  
  if (!window.RTCSessionDescription) {
    errors.push('RTCSessionDescription not supported');
  }
  
  if (!window.RTCIceCandidate) {
    errors.push('RTCIceCandidate not supported');
  }
  
  return {
    supported: errors.length === 0,
    errors
  };
};

// Test microphone access
export const testMicrophoneAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error.name,
      message: getMicrophoneErrorMessage(error)
    };
  }
};

// Test camera access
export const testCameraAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error.name,
      message: getCameraErrorMessage(error)
    };
  }
};

// Get user-friendly error messages for microphone issues
export const getMicrophoneErrorMessage = (error) => {
  switch (error.name) {
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone found. Please connect a microphone and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Microphone is already in use by another application.';
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone access denied. Please allow microphone access and refresh the page.';
    case 'TypeError':
      return 'Your browser does not support voice calling.';
    default:
      return 'Please check your microphone is connected and try again.';
  }
};

// Get user-friendly error messages for camera issues
export const getCameraErrorMessage = (error) => {
  switch (error.name) {
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found. Please connect a camera and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is already in use by another application.';
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera access denied. Please allow camera access and refresh the page.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Camera does not meet requirements. Trying with lower quality...';
    case 'TypeError':
      return 'Your browser does not support video calling.';
    default:
      return 'Please check your camera is connected and try again.';
  }
};

// Enhanced getUserMedia with fallback options
export const getEnhancedUserMedia = async (constraints) => {
  try {
    // Try with original constraints
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.warn('getUserMedia failed with original constraints:', error);
    
    // If video failed, try with lower quality
    if (constraints.video && error.name === 'OverconstrainedError') {
      try {
        const fallbackConstraints = {
          ...constraints,
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        return stream;
      } catch (fallbackError) {
        console.warn('getUserMedia failed with fallback constraints:', fallbackError);
      }
    }
    
    // If both video and audio failed, try audio only
    if (constraints.video && constraints.audio) {
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: constraints.audio
        });
        console.log('Using audio-only mode');
        return audioOnlyStream;
      } catch (audioError) {
        console.error('Audio-only also failed:', audioError);
      }
    }
    
    // Re-throw the original error if all fallbacks failed
    throw error;
  }
};

// Create peer with enhanced configuration and error handling
export const createEnhancedPeer = (isInitiator, stream, onSignal, onStream, onError, onConnect, onClose) => {
  const peer = new Peer({
    initiator: isInitiator,
    trickle: false,
    stream: stream,
    config: {
      iceServers: getICEServers(),
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    }
  });

  // Set up event handlers
  peer.on('signal', onSignal);
  peer.on('stream', onStream);
  peer.on('error', onError);
  peer.on('connect', onConnect);
  peer.on('close', onClose);

  // Enhanced connection monitoring
  if (peer._pc) {
    peer._pc.oniceconnectionstatechange = () => {
      const iceState = peer._pc.iceConnectionState;
      console.log('ICE connection state:', iceState);
      
      switch (iceState) {
        case 'checking':
          console.log('Checking ICE connectivity...');
          break;
        case 'connected':
        case 'completed':
          console.log('ICE connection established');
          onConnect?.();
          break;
        case 'disconnected':
          console.warn('ICE connection disconnected');
          break;
        case 'failed':
          console.error('ICE connection failed');
          onError?.(new Error('ICE connection failed'));
          break;
        case 'closed':
          console.log('ICE connection closed');
          onClose?.();
          break;
        default:
          break;
      }
    };

    peer._pc.onconnectionstatechange = () => {
      const connectionState = peer._pc.connectionState;
      console.log('Connection state:', connectionState);
      
      switch (connectionState) {
        case 'connecting':
          console.log('Peer connection connecting...');
          break;
        case 'connected':
          console.log('Peer connection established');
          onConnect?.();
          break;
        case 'disconnected':
          console.warn('Peer connection disconnected');
          break;
        case 'failed':
          console.error('Peer connection failed');
          onError?.(new Error('Peer connection failed'));
          break;
        case 'closed':
          console.log('Peer connection closed');
          onClose?.();
          break;
        default:
          break;
      }
    };
  }

  return peer;
};

// Call management utilities
export const createCall = async (callerId, calleeId, signalData, callType = 'video') => {
  try {
    const callDoc = await addDoc(collection(db, 'calls'), {
      caller: callerId,
      callee: calleeId,
      signal: signalData,
      status: 'ringing',
      type: callType,
      createdAt: new Date(),
      timeout: new Date(Date.now() + 60000) // 1 minute timeout
    });
    return callDoc.id;
  } catch (error) {
    console.error('Error creating call:', error);
    throw error;
  }
};

export const answerCall = async (callId, answerSignal) => {
  try {
    await updateDoc(doc(db, 'calls', callId), {
      answer: answerSignal,
      status: 'active',
      answeredAt: new Date()
    });
  } catch (error) {
    console.error('Error answering call:', error);
    throw error;
  }
};

export const endCall = async (callId) => {
  try {
    await updateDoc(doc(db, 'calls', callId), {
      status: 'ended',
      endedAt: new Date()
    });
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
};

// Listen for call updates
export const listenForCallUpdates = (callId, onUpdate) => {
  return onSnapshot(doc(db, 'calls', callId), (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data());
    }
  });
};

// Connection timeout utility
export const createConnectionTimeout = (timeoutMs, onTimeout) => {
  return setTimeout(() => {
    console.warn(`Connection timeout after ${timeoutMs}ms`);
    onTimeout();
  }, timeoutMs);
};

// Diagnose connection issues
export const diagnoseConnection = async () => {
  const diagnosis = {
    webrtcSupport: testWebRTCSupport(),
    microphoneAccess: await testMicrophoneAccess(),
    cameraAccess: await testCameraAccess(),
    networkConnectivity: navigator.onLine,
    recommendations: []
  };

  // Generate recommendations
  if (!diagnosis.webrtcSupport.supported) {
    diagnosis.recommendations.push('Update your browser to a version that supports WebRTC');
  }
  
  if (!diagnosis.microphoneAccess.success) {
    diagnosis.recommendations.push('Allow microphone access in browser settings');
  }
  
  if (!diagnosis.cameraAccess.success) {
    diagnosis.recommendations.push('Allow camera access in browser settings');
  }
  
  if (!diagnosis.networkConnectivity) {
    diagnosis.recommendations.push('Check your internet connection');
  }

  return diagnosis;
};
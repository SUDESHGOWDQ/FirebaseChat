import { useState, useRef, useCallback } from 'react';
import Peer from 'simple-peer';

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const getUserMedia = useCallback(async (constraints = { video: true, audio: true }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (err) {
      setError('Failed to access camera/microphone');
      console.error('Error getting user media:', err);
      throw err;
    }
  }, []);

  const createPeer = useCallback((initiator, stream, onSignal, onConnect, onData) => {
    try {
      const peerInstance = new Peer({
        initiator,
        trickle: false,
        stream
      });

      peerInstance.on('signal', onSignal);
      peerInstance.on('connect', onConnect);
      peerInstance.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
      
      if (onData) {
        peerInstance.on('data', onData);
      }

      peerInstance.on('error', (err) => {
        console.error('Peer error:', err);
        setError('Connection error');
      });

      setPeer(peerInstance);
      return peerInstance;
    } catch (err) {
      setError('Failed to create peer connection');
      console.error('Error creating peer:', err);
      throw err;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const endCall = useCallback(() => {
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setError(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
  }, [peer, localStream]);

  return {
    localStream,
    remoteStream,
    peer,
    isAudioEnabled,
    isVideoEnabled,
    error,
    localVideoRef,
    remoteVideoRef,
    getUserMedia,
    createPeer,
    toggleAudio,
    toggleVideo,
    endCall
  };
};
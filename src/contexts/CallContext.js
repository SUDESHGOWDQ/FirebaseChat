import React, { createContext, useContext, useState, useCallback } from 'react';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);

  const startCall = useCallback((callData) => {
    setActiveCall({
      ...callData,
      startTime: new Date(),
      status: 'connecting'
    });
  }, []);

  const endCall = useCallback(() => {
    if (activeCall) {
      const callRecord = {
        ...activeCall,
        endTime: new Date(),
        duration: new Date() - activeCall.startTime,
        status: 'ended'
      };
      
      setCallHistory(prev => [callRecord, ...prev.slice(0, 49)]); // Keep last 50 calls
    }
    
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  const acceptIncomingCall = useCallback(() => {
    if (incomingCall) {
      setActiveCall({
        ...incomingCall,
        startTime: new Date(),
        status: 'active'
      });
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const declineIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const updateCallStatus = useCallback((status) => {
    setActiveCall(prev => prev ? { ...prev, status } : null);
  }, []);

  const value = {
    activeCall,
    incomingCall,
    callHistory,
    startCall,
    endCall,
    acceptIncomingCall,
    declineIncomingCall,
    updateCallStatus,
    setIncomingCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
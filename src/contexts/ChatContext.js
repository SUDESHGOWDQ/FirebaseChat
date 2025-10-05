import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [activeChats, setActiveChats] = useState(new Map());
  const [unreadCounts, setUnreadCounts] = useState(new Map());

  const addChat = useCallback((chatId, chatData) => {
    setActiveChats(prev => new Map(prev.set(chatId, chatData)));
  }, []);

  const removeChat = useCallback((chatId) => {
    setActiveChats(prev => {
      const newChats = new Map(prev);
      newChats.delete(chatId);
      return newChats;
    });
    setUnreadCounts(prev => {
      const newCounts = new Map(prev);
      newCounts.delete(chatId);
      return newCounts;
    });
  }, []);

  const updateUnreadCount = useCallback((chatId, count) => {
    setUnreadCounts(prev => new Map(prev.set(chatId, count)));
  }, []);

  const clearUnreadCount = useCallback((chatId) => {
    setUnreadCounts(prev => {
      const newCounts = new Map(prev);
      newCounts.delete(chatId);
      return newCounts;
    });
  }, []);

  const getTotalUnreadCount = useCallback(() => {
    return Array.from(unreadCounts.values()).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);

  const value = {
    activeChats,
    unreadCounts,
    addChat,
    removeChat,
    updateUnreadCount,
    clearUnreadCount,
    getTotalUnreadCount
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
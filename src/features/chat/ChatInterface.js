import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useCall } from '../../contexts/CallContext';
import { Button, Input, Avatar, LoadingSpinner } from '../../components/UI';
import { CallInterface, IncomingCall } from '../calls';
import { formatTime } from '../../utils/helpers';
import { FaArrowLeft, FaPaperPlane, FaVideo, FaPhone } from 'react-icons/fa';
import './ChatInterface.scss';

const ChatInterface = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { messages, friend, loading, sending, sendMessage } = useChat(friendId);
  const { activeCall, startCall } = useCall();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartVideoCall = () => {
    startCall({
      type: 'video',
      friendId,
      friendData: friend
    });
  };

  const handleStartVoiceCall = () => {
    startCall({
      type: 'voice',
      friendId,
      friendData: friend
    });
  };

  if (loading) {
    return <LoadingSpinner.Page text="Loading chat..." />;
  }

  if (!friend) {
    return (
      <div className="chat-error">
        <h3>Chat not found</h3>
        <Button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
      <IncomingCall />
      
      {activeCall && (
        <CallInterface
          friendId={friendId}
          friendName={friend.displayName}
          callType={activeCall.type}
        />
      )}

      <div className="chat-interface">
        <div className="chat-interface__header">
          <div className="chat-interface__header-left">
            <Button.Back onClick={() => navigate('/dashboard')} />
            
            <div className="chat-interface__friend-info">
              <Avatar
                src={friend.photoURL}
                alt={friend.displayName}
                size="medium"
                status={friend.isOnline ? 'online' : 'offline'}
              />
              <div className="chat-interface__friend-details">
                <h3>{friend.displayName}</h3>
                <span className={`chat-interface__status ${friend.isOnline ? 'online' : 'offline'}`}>
                  {friend.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="chat-interface__header-right">
            <Button.Icon
              onClick={handleStartVoiceCall}
              disabled={!friend.isOnline || activeCall}
              title="Start voice call"
            >
              <FaPhone />
            </Button.Icon>
            
            <Button.Icon
              onClick={handleStartVideoCall}
              disabled={!friend.isOnline || activeCall}
              title="Start video call"
            >
              <FaVideo />
            </Button.Icon>
          </div>
        </div>

        <div className="chat-interface__messages">
          {messages.length === 0 ? (
            <div className="chat-interface__empty">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${
                  message.senderId === friendId ? 'chat-message--received' : 'chat-message--sent'
                }`}
              >
                <div className="chat-message__bubble">
                  <p className="chat-message__text">{message.text}</p>
                  <span className="chat-message__time">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-interface__input">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="chat-interface__input-field"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            loading={sending}
            icon={<FaPaperPlane />}
            className="chat-interface__send-btn"
          >
            Send
          </Button>
        </form>
      </div>
    </>
  );
};

export default ChatInterface;
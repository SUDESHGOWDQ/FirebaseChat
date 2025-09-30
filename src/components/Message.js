import React from "react";

const Message = ({ message, isOwn }) => {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="message-media">
            {message.text && <div className="message-text">{message.text}</div>}
            <img 
              src={message.imageUrl} 
              alt="Shared content" 
              className="message-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="image-error" style={{ display: 'none' }}>
              Image could not be loaded
            </div>
          </div>
        );
      
      case 'voice':
        return (
          <div className="message-media">
            <div className="voice-message">
              <span className="voice-icon">🎵</span>
              <audio controls className="voice-audio">
                <source src={message.audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        );
      
      default:
        return <div className="message-text">{message.text}</div>;
    }
  };

  return (
    <div className={`message ${isOwn ? "message-own" : "message-other"}`}>
      <div className="message-content">
        <div className="message-header">
          <img src={message.photoURL} alt={message.displayName} className="message-avatar" />
          <span className="message-author">{message.displayName}</span>
        </div>
        {renderMessageContent()}
        {message.createdAt && (
          <div className="message-timestamp">
            {new Date(message.createdAt.seconds * 1000).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
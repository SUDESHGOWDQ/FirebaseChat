import React from "react";

const Message = ({ message, isOwn }) => {
  return (
    <div className={`message ${isOwn ? "message-own" : "message-other"}`}>
      <div className="message-content">
        <div className="message-header">
          <img src={message.photoURL} alt={message.displayName} className="message-avatar" />
          <span className="message-author">{message.displayName}</span>
        </div>
        <div className="message-text">{message.text}</div>
      </div>
    </div>
  );
};

export default Message;
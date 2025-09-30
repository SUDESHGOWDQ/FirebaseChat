import React, { useState } from "react";

const MessageInput = ({ onSendMessage, user }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSendMessage({
      text: message,
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });

    setMessage("");
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="message-input"
      />
      <button type="submit" className="send-btn">
        Send
      </button>
    </form>
  );
};

export default MessageInput;
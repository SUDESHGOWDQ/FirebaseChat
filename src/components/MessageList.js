import React, { useEffect, useRef } from "react";
import Message from "./Message";

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="messages-container">
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isOwn={message.uid === currentUser?.uid}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
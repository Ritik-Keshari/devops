import React from "react";

const MessageBubble = ({ message, me }) => {
  return (
    <div className={`bubble-row ${me ? "me" : "them"}`}>
      <div className={`bubble ${me ? "bubble-me" : "bubble-them"}`}>
        <div className="bubble-text">{message.content}</div>
        <div className="bubble-time">{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default MessageBubble;

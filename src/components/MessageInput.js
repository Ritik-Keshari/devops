import React, { useState } from "react";
import "../styles/chat.css"; // already imported in parent UI

const MessageInput = ({ onSend }) => {
  const [message, setMessage] = useState("");

  const sendMessage = () => {
    if (message.trim().length === 0) return;
    onSend(message);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="wa-input-bar">
      <input
        className="wa-input"
        type="text"
        placeholder="Type a message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button className="wa-send" onClick={sendMessage}>
        Send
      </button>
    </div>
  );
};

export default MessageInput;

import React, { useEffect, useRef, useState } from "react";
import { sendPrivateMessage } from "../ws/websocket";
import MessageBubble from "./MessageBubble";

const ChatPanel = ({ currentUser, selectedUser, messages, updateLocalMessages, onVideoCall }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;

    const msg = {
      sender: currentUser.username,
      receiver: selectedUser,
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    updateLocalMessages(prev => ({
      ...prev,
      [selectedUser]: [...(prev[selectedUser] || []), msg]
    }));

    sendPrivateMessage(msg);
    setInput("");
  };

  if (!selectedUser) {
    return (
      <main className="wa-panel empty">
        <h2>Select a user to start chatting</h2>
      </main>
    );
  }

  return (
    <main className="wa-panel">
      <div className="wa-header">
        <div className="wa-header-left">
          <div className="wa-avatar">{selectedUser[0].toUpperCase()}</div>
          <div className="wa-header-name">{selectedUser}</div>
        </div>

        {/* 🔥 VIDEO CALL BUTTON */}
        <div className="wa-header-right">
          <button
            className="wa-video-call-btn"
            onClick={() => onVideoCall(selectedUser)}
            title="Start Video Call"
            style={{
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer"
            }}
          >
            📹
          </button>
        </div>
      </div>

      <div className="wa-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} me={m.sender === currentUser.username} />
        ))}
      </div>

      <div className="wa-input-bar">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Message ${selectedUser}`}
        />
        <button className="wa-send" onClick={sendMessage}>Send</button>
      </div>
    </main>
  );
};

export default ChatPanel;

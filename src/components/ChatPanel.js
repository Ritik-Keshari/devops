import React, { useEffect, useRef, useState } from "react";
import { sendPrivateMessage } from "../ws/websocket";
import MessageBubble from "./MessageBubble";
import { uploadFileToBackend } from "../utils/fileUpload";

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
      receiver: selectedUser.username,
      content: input.trim(),
      type: "TEXT",
      timestamp: new Date().toISOString()
    };

    updateLocalMessages(prev => ({
      ...prev,
      [selectedUser.username]: [...(prev[selectedUser.username] || []), msg]
    }));

    sendPrivateMessage(msg);
    setInput("");
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = await uploadFileToBackend(file);

    const msg = {
      sender: currentUser.username,
      receiver: selectedUser.username,
      content: fileUrl,
      type: file.type.startsWith("image") ? "IMAGE" : "FILE",
      timestamp: new Date().toISOString(),
    };

    updateLocalMessages(prev => ({
      ...prev,
      [selectedUser.username]: [...(prev[selectedUser.username] || []), msg]
    }));

    sendPrivateMessage(msg);
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
          <img
            src={selectedUser.profileImageUrl || "/default-avatar.png"}
            alt=""
            className="wa-avatar-img"
            width={40}
            height={40}
          />
          <div className="wa-header-name">{selectedUser.username}</div>
        </div>

        <div className="wa-header-right">
          <button className="wa-video-call-btn" onClick={() => onVideoCall(selectedUser.username)}>
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

        <button
          type="button"
          className="file-upload-btn"
          onClick={() => document.getElementById("fileInputHidden").click()}
        >
          📎
        </button>

        <input
          id="fileInputHidden"
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Message ${selectedUser.username}`}
        />

        <button className="wa-send" onClick={sendMessage}>
          Send
        </button>
      </div>
    </main>
  );
};

export default ChatPanel;

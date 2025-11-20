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
      receiver: selectedUser.username,   // ⭐ always object
      content: input.trim(),
      type: "TEXT",
      timestamp: new Date().toISOString()
    };

    // Update local UI
    updateLocalMessages(prev => ({
      ...prev,
      [selectedUser.username]: [...(prev[selectedUser.username] || []), msg]
    }));

    sendPrivateMessage(msg);
    setInput("");
  };

  // ⭐ FILE UPLOAD HANDLER
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("FILE SELECTED:", file);

    const fileUrl = await uploadFileToBackend(file);
    console.log("UPLOAD URL:", fileUrl);

    if (!fileUrl) {
      alert("File upload failed");
      return;
    }

    const msg = {
      sender: currentUser.username,
      receiver: selectedUser.username,  // ⭐ object only
      content: fileUrl,
      type: file.type.startsWith("image") ? "IMAGE" : "FILE",
      timestamp: new Date().toISOString(),
    };

    // Send via WebSocket
    sendPrivateMessage(msg);

    // Local UI update
    updateLocalMessages(prev => ({
      ...prev,
      [selectedUser.username]: [...(prev[selectedUser.username] || []), msg]
    }));
  };

  // No user selected
  if (!selectedUser) {
    return (
      <main className="wa-panel empty">
        <h2>Select a user to start chatting</h2>
      </main>
    );
  }

  // ⭐ Profile picture logic
  const profilePic = selectedUser.profileImageUrl || "/default-avatar.png";
  const selectedName = selectedUser.username;

  return (
    <main className="wa-panel">

      {/* HEADER */}
      <div className="wa-header">
        <div className="wa-header-left">

          {/* ⭐ PROFILE IMAGE */}
          <img
            src={profilePic}
            alt=""
            className="wa-avatar-img"
            style={{ width: 40, height: 40 }}
          />

          <div className="wa-header-name">{selectedName}</div>
        </div>

        <div className="wa-header-right">
          <button
            className="wa-video-call-btn"
            onClick={() => onVideoCall(selectedName)}
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

      {/* CHAT MESSAGES */}
      <div className="wa-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} me={m.sender === currentUser.username} />
        ))}
      </div>

      {/* INPUT BAR */}
      <div className="wa-input-bar">

        {/* 📎 FILE UPLOAD BUTTON */}
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
          placeholder={`Message ${selectedName}`}
        />

        <button className="wa-send" type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </main>
  );
};

export default ChatPanel;

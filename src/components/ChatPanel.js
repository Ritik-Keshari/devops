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

  // ⭐ FILE SELECT HANDLER (UPLOAD + SEND)
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("FILE SELECTED:", file);

    // Upload to backend → Azure URL returned
    const fileUrl = await uploadFileToBackend(file);
    console.log("UPLOAD URL:", fileUrl);

    if (!fileUrl) {
      alert("File upload failed");
      return;
    }

    // Now send message with file URL
    sendPrivateMessage({
      sender: currentUser.username,
      receiver: selectedUser,
      content: fileUrl,
      type: file.type.startsWith("image") ? "IMAGE" : "FILE",
      timestamp: new Date().toISOString(),
    });

    // Update local UI chat
    updateLocalMessages(prev => ({
      ...prev,
      [selectedUser]: [
        ...(prev[selectedUser] || []),
        {
          sender: currentUser.username,
          receiver: selectedUser,
          content: fileUrl,
          type: file.type.startsWith("image") ? "IMAGE" : "FILE",
          timestamp: new Date().toISOString(),
        }
      ]
    }));
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

      {/* ⭐ FIXED INPUT BAR AND FILE BUTTON */}
      <div className="wa-input-bar">

        {/* 📎 FIXED FILE UPLOAD BUTTON */}
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
          placeholder={`Message ${selectedUser}`}
        />

        <button className="wa-send" type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </main>
  );
};

export default ChatPanel;

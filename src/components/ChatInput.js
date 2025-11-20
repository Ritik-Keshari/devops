import React, { useState } from "react";
import { sendPrivateMessage } from "../websocket/websocket";
import { uploadFileToBackend } from "../utils/fileUpload";

export default function ChatInput({ sender, receiver }) {
  const [message, setMessage] = useState("");

  const onSend = async () => {
    if (!message.trim()) return;

    sendPrivateMessage({
      sender,
      receiver,
      content: message,
      type: "TEXT",
    });

    setMessage("");
  };

  const onFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("FILE SELECTED:", file);

    const fileUrl = await uploadFileToBackend(file);

    sendPrivateMessage({
      sender,
      receiver,
      content: fileUrl,
      type: file.type.startsWith("image") ? "IMAGE" : "FILE",
    });
  };

  return (
    <div className="chat-input-container">

      {/* FILE UPLOAD BUTTON (FIXED) */}
      <button
        type="button"
        className="file-upload-btn"
        onClick={() => document.getElementById("fileInput").click()}
      >
        📎
      </button>

      <input
        id="fileInput"
        type="file"
        style={{ display: "none" }}
        onChange={onFileSelect}
      />

      <input
        className="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message…"
      />

      <button className="send-btn" onClick={onSend}>Send</button>
    </div>
  );
}

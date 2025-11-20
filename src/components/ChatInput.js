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

    // Upload file → get Azure Blob URL
    const fileUrl = await uploadFileToBackend(file);

    // Send message containing file URL
    sendPrivateMessage({
      sender,
      receiver,
      content: fileUrl,
      type: file.type.startsWith("image") ? "IMAGE" : "FILE",
    });
  };

  return (
    <div className="chat-input-container">
      {/* File Upload Button */}
      <label className="file-upload-btn">
        📎
        <input type="file" hidden onChange={onFileSelect} />
      </label>

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

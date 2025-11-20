import React, { useState } from "react";
import { sendPrivateMessage } from "../websocket/websocket";
import { uploadFileToBackend } from "../utils/fileUpload";

export default function ChatInput({ sender, receiver }) {
  const [message, setMessage] = useState("");

  const onSend = () => {
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
    console.log("FILE SELECTED:", file);

    if (!file) return;

    const fileUrl = await uploadFileToBackend(file);
    console.log("UPLOAD URL:", fileUrl);

    sendPrivateMessage({
      sender,
      receiver,
      content: fileUrl,
      type: file.type.startsWith("image") ? "IMAGE" : "FILE",
    });
  };

  return (
    <div className="chat-input-container">

      {/* FIXED FILE UPLOAD BUTTON */}
      <button
        type="button"
        className="file-upload-btn"
        onClick={() => document.getElementById("hiddenFileInput").click()}
      >
        📎
      </button>

      <input
        id="hiddenFileInput"
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

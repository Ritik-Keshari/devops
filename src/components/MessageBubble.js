import React from "react";

// Extract filename from URL
const getFileName = (url) => {
  try {
    return url.split("/").pop().split("?")[0];
  } catch {
    return "File";
  }
};

const MessageBubble = ({ message, me }) => {
  const isImage = message.type === "IMAGE";
  const isFile = message.type === "FILE";

  return (
    <div className={`bubble-row ${me ? "me" : "them"}`}>
      <div className={`bubble ${me ? "bubble-me" : "bubble-them"}`}>

        {/* ⭐ IMAGE MESSAGE */}
        {isImage && (
          <img
            src={message.content}
            alt="Image"
            style={{ maxWidth: "200px", borderRadius: "10px" }}
          />
        )}

        {/* ⭐ FILE MESSAGE */}
        {isFile && (
          <a
            href={message.content}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#0645AD",
              textDecoration: "underline",
              wordBreak: "break-all"
            }}
          >
            📄 {getFileName(message.content)}
          </a>
        )}

        {/* ⭐ TEXT MESSAGE */}
        {!isImage && !isFile && (
          <div className="bubble-text">{message.content}</div>
        )}

        <div className="bubble-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

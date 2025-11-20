export default function ChatBubble({ msg, isSender }) {
  if (msg.type === "IMAGE") {
    return (
      <div className={`bubble ${isSender ? "sender" : "receiver"}`}>
        <img
          src={msg.content}
          alt="sent"
          className="chat-image"
          style={{ maxWidth: "200px", borderRadius: "8px" }}
        />
      </div>
    );
  }

  if (msg.type === "FILE") {
    return (
      <div className={`bubble ${isSender ? "sender" : "receiver"}`}>
        <a href={msg.content} target="_blank" rel="noreferrer">
          📄 Download File
        </a>
      </div>
    );
  }

  // TEXT
  return (
    <div className={`bubble ${isSender ? "sender" : "receiver"}`}>
      {msg.content}
    </div>
  );
}

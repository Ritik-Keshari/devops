import React, { useState, useEffect, useRef } from "react";
import { chatWithAI } from "../Services/aiService";

function AIChatBox({ messages, setMessages }) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null); // Ref to the end of chat

  // Auto-scroll whenever messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    try {
      const aiResponse = await chatWithAI(input);
      setMessages([...updatedMessages, { sender: "ai", text: aiResponse }]);
    } catch (error) {
      setMessages([...updatedMessages, { sender: "ai", text: "⚠️ AI service unavailable." }]);
    }
  };

  return (
    <div style={{ padding: "10px", height: "calc(100% - 30px)", overflowY: "auto" }}>
      {messages.map((msg, idx) => (
        <div key={idx} style={{ marginBottom: "8px" }}>
          <b>{msg.sender === "ai" ? "AI:" : "You:"}</b> {msg.text}
        </div>
      ))}
      <div ref={chatEndRef} /> {/* Scroll target */}

      <div style={{ display: "flex", marginTop: "10px" }}>
        <input
          style={{ flex: 1, padding: "5px" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} style={{ marginLeft: "5px" }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default AIChatBox;

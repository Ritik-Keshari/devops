import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import Login from "./components/Login";
import Register from "./components/Register";
import AIChatBox from "./components/AIChatBox";
import VideoCall from "./components/VideoCall";
import { connectWebSocket } from "./ws/websocket";
import Config from "./config";
import "./styles/chat.css";

function App() {
  const [screen, setScreen] = useState("LOGIN");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [messageStore, setMessageStore] = useState({});
  const [aiMessages, setAiMessages] = useState([]);

  const [showVideoCall, setShowVideoCall] = useState(null); // <-- 🔥 target user for video call
  const videoCallRef = useRef(null);

  const wsConnected = useRef(false);

  // WebSocket connection
  useEffect(() => {
    if (!currentUser || wsConnected.current) return;

    wsConnected.current = true;

    connectWebSocket(currentUser.username, (msg) => {
      setMessageStore((prev) => {
        const chatId =
          msg.sender === currentUser.username ? msg.receiver : msg.sender;

        return {
          ...prev,
          [chatId]: [...(prev[chatId] || []), msg],
        };
      });
    });

    // 🔥 GLOBAL VIDEO CALL SIGNAL HANDLER
    window.onCallSignal = (signal) => {
      console.log("APP RECEIVED SIGNAL:", signal);

      // If incoming call
      if (signal.type === "offer") {
        setShowVideoCall(signal.from); // Open VideoCall UI
      }

      // Forward to VideoCall component
      if (videoCallRef.current?.handleSignal) {
        videoCallRef.current.handleSignal(signal);
      }
    };

    return () => {
      wsConnected.current = false;
      if (window.stompClient) window.stompClient.deactivate();
    };
  }, [currentUser]);

  // Load user list
  useEffect(() => {
    if (screen === "CHAT") {
      fetch(Config.USER_LIST)
        .then((res) => res.json())
        .then((data) => setUsers(data || []));
    }
  }, [screen]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setScreen("CHAT");
  };

  const handleRegister = (user) => {
    setCurrentUser(user);
    setScreen("CHAT");
  };

  const handleLogout = () => {
    wsConnected.current = false;
    setCurrentUser(null);
    setSelectedUser(null);
    setScreen("LOGIN");
    if (window.stompClient) window.stompClient.deactivate();
  };

  // Screens
  if (screen === "LOGIN") {
    return (
      <Login
        onLogin={handleLogin}
        onSwitch={() => setScreen("REGISTER")}
      />
    );
  }

  if (screen === "REGISTER") {
    return (
      <Register
        onRegister={handleRegister}
        onSwitch={() => setScreen("LOGIN")}
      />
    );
  }

  return (
    <div className="wa-app">
      <Sidebar
        users={users}
        currentUser={currentUser}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onLogout={handleLogout}
        onVideoCall={(user) => setShowVideoCall(user)} // 🔥 Add Call Button in sidebar if needed
      />

      <AIChatBox messages={aiMessages} setMessages={setAiMessages} />

      <ChatPanel
        currentUser={currentUser}
        selectedUser={selectedUser}
        messages={messageStore[selectedUser] || []}
        updateLocalMessages={setMessageStore}
        onVideoCall={() => setShowVideoCall(selectedUser)} // 🔥 Add Call button in chat panel
      />

      {/* 🔥 VIDEO CALL PANEL */}
      {showVideoCall && (
        <div className="video-call-wrapper">
          <VideoCall
            ref={videoCallRef}
            currentUser={currentUser}
            targetUser={showVideoCall}
            onClose={() => setShowVideoCall(null)}
          />
        </div>
      )}
    </div>
  );
}

export default App;

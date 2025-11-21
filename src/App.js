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

  const [showVideoCall, setShowVideoCall] = useState(null);
  const videoCallRef = useRef(null);

  const wsConnected = useRef(false);

  // ----------------------------------------------------
  // 🔥 WEBSOCKET CONNECTION
  // ----------------------------------------------------
  useEffect(() => {
    if (!currentUser || wsConnected.current) return;

    wsConnected.current = true;

    connectWebSocket(currentUser.username, (msg) => {
      console.log("WS RECEIVED:", msg);

      setMessageStore((prev) => {
        const chatId =
          msg.sender === currentUser.username ? msg.receiver : msg.sender;

        return {
          ...prev,
          [chatId]: [...(prev[chatId] || []), msg],
        };
      });
    });

    // 🔥 VIDEO SIGNALS
    window.onCallSignal = (signal) => {
      if (signal.type === "offer") {
        setShowVideoCall(signal.from);
      }

      if (videoCallRef.current?.handleSignal) {
        videoCallRef.current.handleSignal(signal);
      }
    };

    return () => {
      wsConnected.current = false;
      if (window.stompClient) window.stompClient.deactivate();
    };
  }, [currentUser]);

  // ----------------------------------------------------
  // 🔥 LOAD USER LIST
  // ----------------------------------------------------
  useEffect(() => {
    if (screen === "CHAT") {
      fetch(Config.USER_LIST)
        .then((res) => res.json())
        .then((data) => setUsers(data || []));
    }
  }, [screen]);

  // AUTH HANDLERS --------------------------------------
  const handleLogin = (user) => {
    setCurrentUser({
      ...user,
      profileImageUrl: user.profileImageUrl || "/default-avatar.png",
    });
    setScreen("CHAT");
  };

  const handleRegister = (user) => {
    setCurrentUser({
      ...user,
      profileImageUrl: user.profileImageUrl || "/default-avatar.png",
    });
    setScreen("CHAT");
  };

  const handleLogout = () => {
    wsConnected.current = false;
    setCurrentUser(null);
    setSelectedUser(null);
    setScreen("LOGIN");
    if (window.stompClient) window.stompClient.deactivate();
  };

  // LOGIN / REGISTER SCREEN HANDLING -------------------
  if (screen === "LOGIN") {
    return <Login onLogin={handleLogin} onSwitch={() => setScreen("REGISTER")} />;
  }

  if (screen === "REGISTER") {
    return <Register onRegister={handleRegister} onSwitch={() => setScreen("LOGIN")} />;
  }

  // MAIN CHAT SCREEN -----------------------------------
  return (
    <div className="wa-app">

      {/* LEFT SIDEBAR */}
      <Sidebar
        users={users}
        currentUser={currentUser}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onLogout={handleLogout}
        onVideoCall={(user) => setShowVideoCall(user)}
        setCurrentUser={setCurrentUser}
      />

      {/* CHAT PANEL */}
      <ChatPanel
        currentUser={currentUser}
        selectedUser={selectedUser}
        allMessages={messageStore}
        messages={messageStore[selectedUser?.username] || []}  // ⭐ FIXED
        updateLocalMessages={setMessageStore}
        onVideoCall={() => setShowVideoCall(selectedUser?.username)}
      />

      {/* AI CHAT SIDE PANEL */}
      <AIChatBox messages={aiMessages} setMessages={setAiMessages} />

      {/* VIDEO CALL POPUP */}
      {showVideoCall && (
        <div className="video-call-wrapper active">
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

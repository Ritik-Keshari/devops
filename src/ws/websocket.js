import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Config from "../config";

let stompClient = null;

export const connectWebSocket = (username, onMessageReceived) => {
  console.log("connectWebSocket CALLED:", username);

  // Avoid duplicate WS
  if (stompClient && stompClient.connected) {
    console.log("WS already active – skipping");
    return;
  }

  const socket = new SockJS(Config.WS);   // ⭐ FIXED (no query params)

  stompClient = new Client({
    webSocketFactory: () => socket,

    connectHeaders: {                     // ⭐ FIXED (pass username correctly)
      username: username
    },

    reconnectDelay: 5000,                 // auto reconnect

    onConnect: () => {
      console.log("WebSocket connected as:", username);

      // ⭐ NORMAL PRIVATE MESSAGES
      stompClient.subscribe(`/user/queue/messages`, (message) => {
        const msg = JSON.parse(message.body);
        onMessageReceived(msg);
      });

      // ⭐ VIDEO CALL SIGNALING
      stompClient.subscribe(`/user/queue/call`, (message) => {
        const signal = JSON.parse(message.body);
        console.log("CALL SIGNAL RECEIVED:", signal);

        if (window.onCallSignal) {
          window.onCallSignal(signal);
        }
      });
    },

    // On STOMP protocol error
    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers["message"]);
      console.error("Details:", frame.body);
    },

    // WebSocket closing
    onWebSocketClose: () => {
      console.warn("WebSocket closed");
    },

    onWebSocketError: () => {
      console.error("WebSocket error");
    }
  });

  stompClient.activate();
  window.stompClient = stompClient;
};


// =============================
// ⭐ SEND PRIVATE MESSAGE
// =============================
export const sendPrivateMessage = (message) => {
  if (!stompClient || !stompClient.connected) {
    console.warn("WS not connected");
    return;
  }

  stompClient.publish({
    destination: "/app/chat.private",
    body: JSON.stringify(message)
  });
};


// =============================
// ⭐ SEND VIDEO CALL SIGNAL
// =============================
export const sendCallSignal = (signal) => {
  if (!stompClient || !stompClient.connected) {
    console.warn("WS not connected for call signal");
    return;
  }

  stompClient.publish({
    destination: "/app/call",
    body: JSON.stringify(signal)
  });
};

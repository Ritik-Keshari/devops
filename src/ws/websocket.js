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

  // ⭐ FIX: Pass username inside WebSocket URL (this is what makes backend detect it)
  const socket = new SockJS(`${Config.WS}?username=${username}`);

  stompClient = new Client({
    webSocketFactory: () => socket,

    // Still sending headers (no harm)
    connectHeaders: {
      username: username
    },

    reconnectDelay: 5000,

    onConnect: () => {
      console.log("WebSocket connected as:", username);

      // ⭐ PRIVATE CHAT MESSAGES
      stompClient.subscribe(`/user/queue/messages`, (message) => {
        const msg = JSON.parse(message.body);
        onMessageReceived(msg);
      });

      // ⭐ VIDEO CALL SIGNALS
      stompClient.subscribe(`/user/queue/call`, (message) => {
        const signal = JSON.parse(message.body);
        console.log("CALL SIGNAL RECEIVED:", signal);

        if (window.onCallSignal) {
          window.onCallSignal(signal);
        }
      });
    },

    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers["message"]);
      console.error("Details:", frame.body);
    },

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

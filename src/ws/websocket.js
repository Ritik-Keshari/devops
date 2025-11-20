import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Config from "../config";

let stompClient = null;

export const connectWebSocket = (username, onMessageReceived) => {
  console.log("connectWebSocket CALLED:", username);

  // Prevent duplicate connections
  if (stompClient && stompClient.connected) {
    console.log("WS already active → skipping");
    return;
  }

  const socket = new SockJS(`${Config.WS}?username=${username}`);

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,  // auto-reconnect every 5 sec

    onConnect: () => {
      console.log("WebSocket connected as:", username);

      // NORMAL CHAT
      stompClient.subscribe("/user/queue/messages", (message) => {
        const msg = JSON.parse(message.body);
        onMessageReceived(msg);
      });

      // VIDEO CALL SIGNALING
      stompClient.subscribe("/user/queue/call", (message) => {
        const signal = JSON.parse(message.body);
        console.log("CALL SIGNAL RECEIVED:", signal);

        if (window.onCallSignal) {
          window.onCallSignal(signal);
        }
      });
    },

    // STOMP-level errors
    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers['message']);
      console.error("Details:", frame.body);
    },

    // WebSocket closed
    onWebSocketClose: () => {
      console.warn("WebSocket closed");
    },

    // WS errors
    onWebSocketError: () => {
      console.error("WebSocket error");
    }
  });

  stompClient.activate();
  window.stompClient = stompClient;
};

// CLEANER WAY TO SEND CHAT MESSAGES
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

// CLEANER WAY TO SEND VIDEO CALL SIGNALS
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

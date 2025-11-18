import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Config from "../config";

let stompClient = null;

export const connectWebSocket = (username, onMessageReceived) => {
  console.log("connectWebSocket CALLED:", username);

  if (stompClient !== null) {
    console.log("WS already active → skipping");
    return;
  }

  console.log("Connecting WS to:", Config.WS);

  const socket = new SockJS(`${Config.WS}?username=${username}`);

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,

    onConnect: () => {
      console.log("WebSocket connected as:", username);

      stompClient.subscribe("/user/queue/messages", (message) => {
        const msg = JSON.parse(message.body);
        onMessageReceived(msg);
      });
    }
  });

  stompClient.activate();

  // Expose globally for debugging
  window.stompClient = stompClient;
};

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

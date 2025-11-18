import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';

const API_URL = "http://192.168.31.23:3000/chat";
//const API_URL = 'http://localhost:8080';
const WS_URL = 'http://192.168.31.23:8080/ws';



export const api = axios.create({
  baseURL: API_URL,
});

let stompClient = null;

export const connectWebSocket = (onMessageReceived) => {
  const socket = new SockJS(WS_URL);
  stompClient = new Client({
    webSocketFactory: () => socket,
    onConnect: () => {
      stompClient.subscribe('/topic/messages', (message) => {
        onMessageReceived(JSON.parse(message.body));
      });
    },
  });

  stompClient.activate();
};

export const sendMessageWS = (message) => {
  if (stompClient && stompClient.connected) {
    stompClient.publish({ destination: '/app/chat', body: JSON.stringify(message) });
  }
};

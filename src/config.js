const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org/api";

export default {
  BACKEND,
  LOGIN: `${BACKEND}/user/login`,
  REGISTER: `${BACKEND}/user/register`,
  USER_LIST: `${BACKEND}/user/list`,
  WS: `wss://afser.duckdns.org/ws`,  // websocket via Nginx SSL
  AI_CHAT: `${BACKEND}/ai/chat`
};

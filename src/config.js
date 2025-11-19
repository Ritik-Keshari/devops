const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org/api";

const config = {
  BACKEND,

  // USER CONTROLLER
  LOGIN: `${BACKEND}/user/login`,
  REGISTER: `${BACKEND}/user/register`,
  USER_LIST: `${BACKEND}/user/list`,

  // WEBSOCKET (FIXED)
  WS: `https://afser.duckdns.org/ws`,

  // AI CONTROLLER
  AI_CHAT: `${BACKEND}/ai/chat`
};

export default config;

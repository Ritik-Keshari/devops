const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org";

const config = {
  BACKEND,

  // USER CONTROLLER
  LOGIN: `${BACKEND}/api/user/login`,
  REGISTER: `${BACKEND}/api/user/register`,
  USER_LIST: `${BACKEND}/api/user/list`,

  // WEBSOCKET (MUST use wss://)
  WS: "wss://afser.duckdns.org/ws",

  // AI CONTROLLER
  AI_CHAT: `${BACKEND}/api/ai/chat`,
};

export default config;

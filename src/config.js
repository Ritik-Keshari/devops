const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org";

const config = {
  BACKEND,

  // USER CONTROLLER
  LOGIN: `${BACKEND}/user/login`,
  REGISTER: `${BACKEND}/user/register`,
  USER_LIST: `${BACKEND}/user/list`,

  // WEBSOCKET
  WS: "https://afser.duckdns.org/ws",

  // AI CONTROLLER (corrected)
  AI_CHAT: `${BACKEND}/api/ai/chat`,
};

export default config;

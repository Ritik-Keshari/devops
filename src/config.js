const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org";

const config = {
  BACKEND,

  // USER CONTROLLER (FIXED)
  LOGIN: `${BACKEND}/api/user/login`,
  REGISTER: `${BACKEND}/api/user/register`,
  USER_LIST: `${BACKEND}/api/user/list`,

  // WEBSOCKET
  WS: "https://afser.duckdns.org/ws",

  // AI CONTROLLER
  AI_CHAT: `${BACKEND}/api/ai/chat`,
  UPLOAD_PROFILE: `${BACKEND}/api/user/upload-profile`,

};

export default config;
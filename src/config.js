const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org/"; 
// you can put your default local IP OR empty

export default {
  BACKEND,
  LOGIN: `${BACKEND}/user/login`,
  REGISTER: `${BACKEND}/user/register`,
  USER_LIST: `${BACKEND}/user/list`,
  WS: `${BACKEND}/ws`,
  AI_CHAT: `${BACKEND}/api/ai/chat`
};

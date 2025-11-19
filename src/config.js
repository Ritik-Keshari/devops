const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://afser.duckdns.org:8080";

export default {
  BACKEND,
  LOGIN: `${BACKEND}/user/login`,
  REGISTER: `${BACKEND}/user/register`,
  USER_LIST: `${BACKEND}/user/list`,
  WS: `${BACKEND}/ws`,
  AI_CHAT: `${BACKEND}/api/ai/chat`
};

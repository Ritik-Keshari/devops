const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://afser.duckdns.org/api";

const config = {
  BACKEND,
  LOGIN: `${BACKEND}/user/login`,
  REGISTER: `${BACKEND}/user/register`,
  USER_LIST: `${BACKEND}/user/list`,
  WS: `wss://afser.duckdns.org/ws`,
  AI_CHAT: `${BACKEND}/ai/chat`
};

export default config;

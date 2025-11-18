import axios from "axios";
import Config from "../config";

export const chatWithAI = async (message) => {
  try {
    const response = await axios.post(
      Config.AI_CHAT,      // ⭐ Uses config.js, no hardcoding
      { message },         // Send as JSON: { message: "..." }
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;   // clean text from backend

  } catch (error) {
    console.error("AI API error:", error.response || error.message);
    return "⚠️ AI service is currently unavailable.";
  }
};

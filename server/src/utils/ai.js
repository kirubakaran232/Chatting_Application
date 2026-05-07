import OpenAI from "openai";
import { env } from "../config/env.js";

const client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

async function aiText(system, user) {
  if (!client) return "AI is not configured. Add OPENAI_API_KEY on the server.";
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.3
  });
  return response.choices[0]?.message?.content || "";
}

export const ai = {
  summarize: (messages) =>
    aiText("Summarize this chat into concise bullets with decisions and next steps.", messages),
  suggestReply: (context) =>
    aiText("Suggest three short, natural replies for this conversation.", context),
  translate: (text, language) =>
    aiText(`Translate the message to ${language}. Return only the translation.`, text),
  spamScore: async (text) => {
    const result = await aiText("Rate spam from 0 to 1. Return only a number.", text);
    return Math.max(0, Math.min(1, Number.parseFloat(result) || 0));
  }
};

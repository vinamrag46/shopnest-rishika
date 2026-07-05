/**
 * geminiService.js
 * ----------------------------------------------------------------------
 * Isolates all communication with the Gemini API. This is the ONLY file
 * that knows about Gemini's request/response shape — if you ever swap
 * providers (OpenAI, Claude, etc.), this is the only file you'd rewrite.
 * The API key lives only here, read from an environment variable, and
 * is never sent to the browser.
 * ----------------------------------------------------------------------
 */

const { SYSTEM_PROMPT } = require("../config/prompt");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn(
    "[geminiService] WARNING: GEMINI_API_KEY is not set. Requests will fail until it's configured in .env"
  );
}

/**
 * Sends the conversation history to Gemini and returns the model's reply text.
 * @param {Array<{role: string, parts: {text: string}[]}>} history - full chat history
 * @returns {Promise<string>} the assistant's reply text
 */
async function generateReply(history) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: history,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    throw new Error("Gemini API returned no candidates/text in response");
  }

  return reply;
}

module.exports = { generateReply };

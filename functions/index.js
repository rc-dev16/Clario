/**
 * Gemini proxy: calls Generative Language API with GOOGLE_API_KEY from Secret Manager.
 * The API key never reaches the client.
 *
 * Setup:
 *   firebase functions:secrets:set GOOGLE_API_KEY
 *   (enter your Gemini API key when prompted)
 *   firebase deploy --only functions
 *
 * In production, leave VITE_GOOGLE_API_KEY unset so the app uses this callable.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GOOGLE_API_KEY = defineSecret("GOOGLE_API_KEY");

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-2.5-pro",
];

const MAX_429_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function fetchGemini(apiKey, body, model, retryCount = 0) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && retryCount < MAX_429_RETRIES) {
    const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
    await new Promise((r) => setTimeout(r, delay));
    return fetchGemini(apiKey, body, model, retryCount + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new HttpsError("internal", "Gemini API error: " + res.status, {
      status: res.status,
      body: (err || "").slice(0, 200),
    });
  }
  return await res.json();
}

async function fetchGeminiWithFallback(apiKey, body) {
  let lastErr;
  for (const model of MODELS_TO_TRY) {
    try {
      return await fetchGemini(apiKey, body, model);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

exports.geminiGenerateContent = onCall(
  { secrets: [GOOGLE_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to use this feature.");
    }
    const { contents, generationConfig } = request.data || {};
    if (!Array.isArray(contents) || contents.length === 0) {
      throw new HttpsError("invalid-argument", "contents array is required");
    }
    const apiKey = GOOGLE_API_KEY.value();
    const body = {
      contents,
      generationConfig:
        generationConfig && Object.keys(generationConfig).length > 0
          ? generationConfig
          : {
              temperature: 0.2,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
    };
    return await fetchGeminiWithFallback(apiKey, body);
  }
);

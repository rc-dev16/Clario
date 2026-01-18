/**
 * Single point for Gemini generateContent calls.
 * - If VITE_GOOGLE_API_KEY is set: calls Gemini directly (dev/legacy). Key is in the client.
 * - If not set: uses Firebase callable geminiGenerateContent. Key stays on the server.
 *
 * For production: leave VITE_GOOGLE_API_KEY unset, set GOOGLE_API_KEY in Firebase Secret
 * Manager, and deploy the `geminiGenerateContent` function.
 */

import axios from 'axios';
// @ts-expect-error firebase-config is JS
import app from '../../firebase-config.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-pro',
];

const defaultGenerationConfig = {
  temperature: 0.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4096,
  responseMimeType: 'application/json' as const,
};

export interface CallGeminiArgs {
  contents: { parts: { text: string }[] }[];
  generationConfig?: Partial<typeof defaultGenerationConfig>;
}

/** Returns { data } in the same shape as an axios response for Gemini. */
export async function callGemini(args: CallGeminiArgs): Promise<{ data: unknown }> {
  const { contents, generationConfig } = args;
  const config = { ...defaultGenerationConfig, ...generationConfig };

  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  if (apiKey) {
    let lastErr: unknown;
    for (const model of MODELS_TO_TRY) {
      try {
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { contents, generationConfig: config },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        return { data: res.data };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  const functions = getFunctions(app);
  const fn = httpsCallable<
    { contents: CallGeminiArgs['contents']; generationConfig: typeof config },
    unknown
  >(functions, 'geminiGenerateContent');
  const result = await fn({ contents, generationConfig: config });
  return { data: result.data };
}

#!/usr/bin/env node
/**
 * Validates VITE_GOOGLE_API_KEY by calling the Gemini list-models endpoint.
 * Uses .env when run locally; in CI use env VITE_GOOGLE_API_KEY from secrets.
 *
 * Usage:
 *   Local:  node scripts/check-gemini-key.mjs
 *   CI:     VITE_GOOGLE_API_KEY=xxx node scripts/check-gemini-key.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env if present (local dev)
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  try {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^VITE_GOOGLE_API_KEY=(.+)$/);
      if (m) {
        process.env.VITE_GOOGLE_API_KEY = m[1].replace(/^["']|["']$/g, '').trim();
        break;
      }
    }
  } catch (_) {}
}

const key = process.env.VITE_GOOGLE_API_KEY;
if (!key || key === '') {
  console.error('VITE_GOOGLE_API_KEY is not set. Add it to .env (local) or GitHub Secrets (CI).');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
let res;
try {
  res = await fetch(url);
} catch (e) {
  console.error('Gemini API request failed:', e.message);
  process.exit(1);
}

if (res.ok) {
  console.log('Gemini API key is valid.');
  process.exit(0);
}

const body = await res.text();
console.error(`Gemini API key check failed: HTTP ${res.status}`);
if (res.status === 400) console.error('Key may be missing or malformed.');
if (res.status === 403) console.error('Key invalid or Generative Language API not enabled. Enable it at: https://aistudio.google.com/');
if (res.status === 404) console.error('Endpoint or project may be wrong.');
if (body) console.error('Response:', body.slice(0, 200));
process.exit(1);

# Cloud Functions – Gemini proxy

The `geminiGenerateContent` callable keeps your **Gemini API key on the server**. The key is never sent to the browser, so it does not appear in the Network tab or in the client bundle.

## Setup

1. **Set the secret** (one-time):

   ```bash
   firebase functions:secrets:set GOOGLE_API_KEY
   ```
   Enter your Gemini API key when prompted. Or non-interactively:

   ```bash
   echo -n "YOUR_GEMINI_API_KEY" | firebase functions:secrets:set GOOGLE_API_KEY
   ```

2. **Install and deploy**:

   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

3. **In production**:  
   Do **not** set `VITE_GOOGLE_API_KEY` in your build. The app will use this callable and the key stays server-side.

4. **For local dev** you can either:
   - Use the Functions emulator and set `GOOGLE_API_KEY` in the emulator, or  
   - Set `VITE_GOOGLE_API_KEY` in `.env` to call Gemini directly (key is then in the client; only for dev).

## Auth

The callable requires the user to be signed in (`request.auth`). Unauthenticated requests receive `unauthenticated`.

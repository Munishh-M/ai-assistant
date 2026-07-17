# DIY AI Assistant

A minimal, self-hosted AI chat assistant. Node/Express backend + plain HTML/CSS/JS
frontend. Works with **any OpenAI-compatible API** — plug in a free key from an
open-source model provider and you're running your own "Claude-style" chat app.

## 1. Install

```bash
npm install
```

## 2. Get a free API key (pick one)

| Provider | Free tier? | Sign up |
|---|---|---|
| **Groq** (recommended — fast, free, Llama 3.3 / Mixtral) | Yes | https://console.groq.com/keys |
| **OpenRouter** (many open models, some free) | Yes | https://openrouter.ai/keys |
| **Together AI** | Yes | https://api.together.ai/settings/api-keys |
| **Ollama** (run models locally, no key needed) | N/A, free & local | https://ollama.com |

## 3. Configure

```bash
cp .env.example .env
```

Open `.env` and set `API_BASE_URL`, `API_KEY`, and `MODEL` for whichever
provider you picked (the example file has the values pre-filled for each —
just uncomment the block you want and paste in your key).

## 4. Run

```bash
npm start
```

Open **http://localhost:3000** — you'll see a terminal-style chat UI.

## How it works

```
Browser (public/) --> POST /api/chat --> server.js --> Provider's API
                                             |
                                    your API key lives
                                     here, server-side
```

- `public/index.html` / `style.css` / `script.js` — the chat interface. It
  keeps the full conversation in memory and posts it to `/api/chat` on every
  turn.
- `server.js` — a thin proxy. It adds a system prompt, forwards your messages
  to whichever `API_BASE_URL` you configured, and returns the reply. Your key
  never touches the browser.

## Customizing

- **Change personality**: edit `SYSTEM_PROMPT` in `server.js`.
- **Change model**: edit `MODEL` in `.env`.
- **Add streaming**: set `stream: true` in the request body in `server.js`
  and switch the response handling to read the SSE stream chunk-by-chunk.
- **Add memory/persistence**: currently history lives only in the browser tab
  (lost on refresh). Swap in a database (SQLite, etc.) if you want it to
  survive reloads.

## Troubleshooting

- **"No API key configured"** — you haven't filled in `.env`, or forgot to
  restart the server after editing it.
- **401 / 403 from upstream** — key is invalid or wasn't copied fully.
- **404 on model** — the `MODEL` name doesn't match what your provider
  offers; check their docs for exact model IDs.

# DIY AI Assistant

A self-hosted AI chat assistant with login/signup. Node/Express backend + plain
HTML/CSS/JS frontend, MongoDB for user accounts. Works with **any
OpenAI-compatible API** — plug in a free key from an open-source model
provider and you're running your own "Claude-style" chat app, protected
behind your own login screen.

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

## 3. Set up MongoDB (for user accounts)

Same as your other projects — see
https://www.mongodb.com/cloud/atlas/register for a free M0 cluster. If you
hit the `querySrv ECONNREFUSED` DNS error, use the **Standard connection
string** (starts with `mongodb://`, not `mongodb+srv://`) instead.

## 4. Configure

```bash
cp .env.example .env
```

Fill in:
- `API_BASE_URL`, `API_KEY`, `MODEL` — for whichever provider you picked
- `MONGODB_URI` — your connection string
- `JWT_SECRET` — any long random string (this signs login tokens). Generate
  one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 5. Run

```bash
npm start
```

Open **http://localhost:3000** — you'll land on a login/signup screen first.
Sign up with any email/password to create an account, then you're into the
chat.

## How it works

```
Browser --> /api/auth/signup or /api/auth/login --> server.js --> MongoDB
              (creates account / verifies password, returns a JWT)

Browser --> POST /api/chat (with JWT) --> server.js checks the JWT
                                              |
                                    valid? --> forwards to your AI provider
                                    invalid/missing? --> 401, back to login
```

- `public/` — the login screen and chat interface. The JWT is stored in the
  browser's `localStorage` after login and sent with every chat request.
- `models/User.js` — stores each user's email and a bcrypt-hashed password
  (never the plain password itself).
- `routes/auth.js` — signup and login endpoints; issue a JWT valid for 7 days.
- `middleware/auth.js` — checks that JWT on every `/api/chat` request before
  letting it through.
- `server.js` — same AI-proxy logic as before, now behind the login wall.

## Customizing

- **Change personality**: edit `SYSTEM_PROMPT` in `server.js`.
- **Change model**: edit `MODEL` in `.env`.
- **Add streaming**: set `stream: true` in the request body in `server.js`
  and switch the response handling to read the SSE stream chunk-by-chunk.
- **Save chat history per user**: currently conversations still live only in
  the browser tab (lost on refresh/logout). Since you already have user
  accounts now, the natural next step is a `Conversation` model tied to
  `req.userId` so history persists in MongoDB too.

## Troubleshooting

- **"No API key configured"** — you haven't filled in `.env`, or forgot to
  restart the server after editing it.
- **"Server is not configured (missing JWT_SECRET)"** — add `JWT_SECRET` to
  `.env` and restart.
- **401 / 403 from upstream** — your AI provider's key is invalid or wasn't
  copied fully.
- **404 on model** — the `MODEL` name doesn't match what your provider
  offers; check their docs for exact model IDs.
- **Stuck on login screen / "session expired"** — your JWT may have expired
  (7-day limit) or `JWT_SECRET` changed since you logged in; just log in
  again.

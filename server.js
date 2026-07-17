// server.js — Backend for the AI assistant
// Talks to ANY OpenAI-compatible API (Groq, OpenRouter, Together AI, Ollama, etc.)
// Keeps your API key on the server, never exposed to the browser.

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const {
  API_BASE_URL = 'https://api.groq.com/openai/v1',
  API_KEY = '',
  MODEL = 'llama-3.3-70b-versatile',
  TAVILY_API_KEY = '',
  PORT = 3000,
} = process.env;

const SYSTEM_PROMPT =
  'You are a helpful, friendly AI assistant. Keep answers clear and concise unless asked for more detail. ' +
  'When "Web search results" are provided below, treat them as more current and trustworthy than your own ' +
  'training knowledge for facts, current events, prices, people in roles, and anything that changes over time. ' +
  'If the search results conflict with what you learned during training, trust the search results. ' +
  'If no search results are provided, or they are not relevant, just answer normally.';

// Runs a live web search via Tavily and returns a short text block to inject as context.
// Returns '' if no key is configured or the search fails — the assistant just answers without it.
async function webSearch(query) {
  if (!TAVILY_API_KEY) return '';

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!res.ok) return '';
    const data = await res.json();

    const parts = [];
    if (data.answer) parts.push(`Quick answer: ${data.answer}`);
    for (const r of data.results || []) {
      parts.push(`- ${r.title}: ${r.content?.slice(0, 300)} (source: ${r.url})`);
    }
    return parts.join('\n');
  } catch (err) {
    console.error('Web search failed:', err.message);
    return '';
  }
}

// Simple heuristic: only bother searching when the message looks like it needs
// current/factual info. Keeps things fast for casual chat like "hi" or "thanks".
function looksLikeItNeedsSearch(text) {
  const t = text.toLowerCase();
  const triggers = [
    'current', 'latest', 'today', 'now', 'recent', 'news', 'who is',
    'what is the', 'price of', 'when did', 'when is', 'score', 'weather',
    'cm ', 'chief minister', 'president', 'prime minister', 'ceo',
    'election', '2025', '2026',
  ];
  return triggers.some((k) => t.includes(k));
}

// POST /api/chat  { messages: [{role, content}, ...] }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (!API_KEY) {
      return res.status(500).json({
        error:
          'No API key configured. Add your key to the .env file (see .env.example).',
      });
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    let systemContent = SYSTEM_PROMPT;

    if (lastUserMsg && looksLikeItNeedsSearch(lastUserMsg.content)) {
      const results = await webSearch(lastUserMsg.content);
      if (results) {
        systemContent += `\n\nWeb search results for "${lastUserMsg.content}":\n${results}`;
      }
    }

    const upstream = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemContent }, ...messages],
        temperature: 0.7,
        stream: false,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Upstream API error:', data);
      return res.status(upstream.status).json({
        error: data.error?.message || 'Upstream API request failed',
      });
    }

    const reply = data.choices?.[0]?.message?.content ?? '(no response)';
    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ AI assistant running at http://localhost:${PORT}`);
  console.log(`   Using model "${MODEL}" via ${API_BASE_URL}`);
  if (!API_KEY) {
    console.log('⚠️  No API_KEY set yet — copy .env.example to .env and add one.');
  }
});
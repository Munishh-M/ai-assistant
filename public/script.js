const chat = document.getElementById('chat');
const composer = document.getElementById('composer');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Full conversation history sent to the API each turn
let history = [];

// Auto-grow the textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
});

// Enter to send, Shift+Enter for newline
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

function addMessage(role, text, extraClass = '') {
  const el = document.createElement('div');
  el.className = `msg ${role} ${extraClass}`.trim();
  el.innerHTML = `<div class="msg-role">${role.toUpperCase()}</div><div class="msg-body">${escapeHtml(text)}</div>`;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function sendMessage(text) {
  history.push({ role: 'user', content: text });
  addMessage('user', text);

  const thinkingEl = addMessage('assistant', '', 'thinking');
  thinkingEl.querySelector('.msg-body').classList.add('thinking');

  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();

    thinkingEl.remove();

    if (!res.ok) {
      addMessage('error', data.error || 'Request failed.');
      setStatus(false);
      return;
    }

    addMessage('assistant', data.reply);
    history.push({ role: 'assistant', content: data.reply });
    setStatus(true);
  } catch (err) {
    thinkingEl.remove();
    addMessage('error', 'Could not reach the server. Is it running?');
    setStatus(false);
  } finally {
    sendBtn.disabled = false;
  }
}

function setStatus(ok) {
  statusDot.className = `dot ${ok ? 'ok' : 'err'}`;
  statusText.textContent = ok ? 'connected' : 'connection issue';
}

composer.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  sendMessage(text);
});

// Ping the server once on load so the status dot reflects config, not just network
(async function checkConnection() {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(true);
      statusText.textContent = 'ready';
    } else {
      setStatus(false);
      statusText.textContent = data.error?.includes('API key')
        ? 'no API key set'
        : 'connection issue';
    }
  } catch {
    setStatus(false);
    statusText.textContent = 'server offline';
  }
})();
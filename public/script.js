// ---- Elements ----
const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const logoutBtn = document.getElementById('logoutBtn');

const chat = document.getElementById('chat');
const composer = document.getElementById('composer');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Full conversation history sent to the API each turn
let history = [];
let authMode = 'login'; // or 'signup'

// ---- Token storage ----
// This is a real app running on your own server (not a browser-only
// artifact), so localStorage is the right place to keep the login token.
function getToken() {
  return localStorage.getItem('token');
}
function setToken(token) {
  localStorage.setItem('token', token);
}
function clearToken() {
  localStorage.removeItem('token');
}

// ---- Auth screen tabs ----
tabLogin.addEventListener('click', () => switchAuthMode('login'));
tabSignup.addEventListener('click', () => switchAuthMode('signup'));

function switchAuthMode(mode) {
  authMode = mode;
  authError.textContent = '';
  tabLogin.classList.toggle('active', mode === 'login');
  tabSignup.classList.toggle('active', mode === 'signup');
  authSubmit.textContent = mode === 'login' ? 'LOG IN' : 'SIGN UP';
  authPassword.setAttribute(
    'autocomplete',
    mode === 'login' ? 'current-password' : 'new-password'
  );
}

// ---- Auth form submit (handles both login and signup) ----
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  authSubmit.disabled = true;

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      authError.textContent = data.error || 'Something went wrong.';
      return;
    }

    setToken(data.token);
    showChatScreen();
  } catch {
    authError.textContent = 'Could not reach the server. Is it running?';
  } finally {
    authSubmit.disabled = false;
  }
});

// ---- Logout ----
logoutBtn.addEventListener('click', () => {
  clearToken();
  history = [];
  chat.innerHTML = `
    <div class="msg assistant">
      <div class="msg-role">ASSISTANT</div>
      <div class="msg-body">Hey — My name is Munish. I'm your assistant. Ask me anything to get started.</div>
    </div>`;
  showAuthScreen();
});

function showAuthScreen() {
  authScreen.style.display = 'flex';
  chatScreen.style.display = 'none';
  authEmail.value = '';
  authPassword.value = '';
  authEmail.focus();
}

function showChatScreen() {
  authScreen.style.display = 'none';
  chatScreen.style.display = 'flex';
  input.focus();
  checkConnection();
}

// ---- Chat UI (same as before, now sends the auth token) ----
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
});

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();

    thinkingEl.remove();

    if (res.status === 401) {
      // Session expired or invalid — send back to login
      clearToken();
      addMessage('error', data.error || 'Please log in again.');
      setTimeout(showAuthScreen, 1200);
      return;
    }

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

// Ping the server's health check so the status dot reflects config, not just network
async function checkConnection() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.ok && data.hasApiKey) {
      setStatus(true);
      statusText.textContent = 'ready';
    } else {
      setStatus(false);
      statusText.textContent = !data.hasApiKey ? 'no API key set' : 'connection issue';
    }
  } catch {
    setStatus(false);
    statusText.textContent = 'server offline';
  }
}

// ---- On page load: skip straight to chat if already logged in ----
if (getToken()) {
  showChatScreen();
} else {
  showAuthScreen();
}

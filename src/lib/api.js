// Telegram Web API client (GramJS / MTProto backend)
// Default: same-origin '' so requests hit the Vite dev proxy (see vite.config.js),
// which forwards /api to the real backend — sidestepping the CORS allowlist.
// Override with VITE_API_BASE to call the backend directly.
const BASE = import.meta.env.VITE_API_BASE ?? '';

const SESSION_KEY = 'tg_session';
const USER_KEY = 'tg_user';

export const auth = {
  get session() {
    return localStorage.getItem(SESSION_KEY) || '';
  },
  set session(v) {
    if (v) localStorage.setItem(SESSION_KEY, v);
    else localStorage.removeItem(SESSION_KEY);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  set user(u) {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request(path, { method = 'GET', body, headers = {}, raw } = {}) {
  const opts = { method, headers: { ...headers } };
  if (auth.session) opts.headers['x-tg-session'] = auth.session;

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, opts);
  if (raw) return res;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) || `Xatolik (${res.status})`;
    const err = new Error(Array.isArray(msg) ? msg.join(', ') : msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const fileUrl = (chatId, messageId) =>
  `${BASE}/api/tg/messages/${encodeURIComponent(chatId)}/${messageId}/file`;

export const api = {
  base: BASE,
  health: () => request('/api/health'),

  // --- Auth ---
  sendCode: (phone, apiId, apiHash) =>
    request('/api/tg/auth/send-code', {
      method: 'POST',
      body: { phone, ...(apiId ? { apiId: Number(apiId) } : {}), ...(apiHash ? { apiHash } : {}) },
    }),
  signIn: (loginId, code, password) =>
    request('/api/tg/auth/sign-in', {
      method: 'POST',
      body: { loginId, ...(code ? { code } : {}), ...(password ? { password } : {}) },
    }),
  me: () => request('/api/tg/auth/me'),
  logout: () => request('/api/tg/auth/logout', { method: 'POST' }),

  // --- Dialogs ---
  dialogs: (limit = 50) => request(`/api/tg/dialogs?limit=${limit}`),

  // --- Messages ---
  messages: (chatId, { limit = 30, offsetId } = {}) => {
    const q = new URLSearchParams({ limit });
    if (offsetId) q.set('offsetId', offsetId);
    return request(`/api/tg/messages/${encodeURIComponent(chatId)}?${q}`);
  },
  sendMessage: (chatId, text, replyTo) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}`, {
      method: 'POST',
      body: { text, ...(replyTo ? { replyTo } : {}) },
    }),
  sendMedia: (chatId, file, { caption, voice, videoNote } = {}) => {
    const fd = new FormData();
    fd.append('media', file);
    if (caption) fd.append('caption', caption);
    if (voice) fd.append('voice', 'true');
    if (videoNote) fd.append('videoNote', 'true');
    return request(`/api/tg/messages/${encodeURIComponent(chatId)}/media`, {
      method: 'POST',
      body: fd,
    });
  },
  deleteMessages: (chatId, messageIds, revoke = true) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
      body: { messageIds, revoke },
    }),
  editMessage: (chatId, messageId, text) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/${messageId}`, {
      method: 'PUT',
      body: { text },
    }),
  react: (chatId, messageId, emoji) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/${messageId}/react`, {
      method: 'POST',
      body: { emoji },
    }),
  pin: (chatId, messageId, unpin = false) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/${messageId}/pin`, {
      method: 'POST',
      body: { unpin },
    }),
  markRead: (chatId) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/read`, { method: 'POST' }),
  typing: (chatId) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/typing`, { method: 'POST' }),
  forward: (chatId, toChatId, messageIds) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/forward`, {
      method: 'POST',
      body: { toChatId, messageIds },
    }),
  searchInChat: (chatId, q) =>
    request(`/api/tg/messages/${encodeURIComponent(chatId)}/search?q=${encodeURIComponent(q)}`),

  // --- Contacts & search ---
  search: (q) => request(`/api/tg/search?q=${encodeURIComponent(q)}`),
  contacts: () => request('/api/tg/contacts'),
  members: (chatId) => request(`/api/tg/chats/${encodeURIComponent(chatId)}/members`),
  entity: (chatId) => request(`/api/tg/entity/${encodeURIComponent(chatId)}`),
};

export default api;

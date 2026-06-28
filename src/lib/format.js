// Defensive normalizers — GramJS serializations vary, so we probe several keys.

const pick = (obj, keys, def) => {
  for (const k of keys) {
    const v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), obj);
    if (v !== undefined && v !== null) return v;
  }
  return def;
};

const toNum = (v) => {
  if (v == null) return undefined;
  if (typeof v === 'object') {
    if ('value' in v) return Number(v.value);
    return Number(v.toString?.() ?? v);
  }
  return Number(v);
};

export function dialogId(d) {
  const raw =
    pick(d, ['id', 'chatId', 'entity.id', 'peer.id', 'entityId', 'inputEntity.userId']) ?? '';
  if (raw && typeof raw === 'object') return String(raw.value ?? raw.toString());
  return String(raw);
}

export function normalizeDialog(d) {
  const entity = d.entity || d.chat || d.user || d;
  const isUser = pick(d, ['isUser']) ?? entity?.className === 'User' ?? !!entity?.firstName;
  const isChannel = pick(d, ['isChannel']) ?? entity?.className === 'Channel';
  const isGroup =
    pick(d, ['isGroup']) ??
    (entity?.className === 'Chat' || (isChannel && entity?.megagroup));

  const name =
    pick(d, ['name', 'title', 'entity.title']) ||
    [pick(entity, ['firstName']), pick(entity, ['lastName'])].filter(Boolean).join(' ') ||
    pick(entity, ['username']) ||
    'Hidden';

  const lastMsg = d.message || d.lastMessage || d.topMessage || {};
  const text =
    typeof lastMsg === 'string'
      ? lastMsg
      : pick(lastMsg, ['message', 'text', 'caption'], '') ||
        (lastMsg?.media ? 'Media' : '');

  return {
    id: dialogId(d),
    name,
    username: pick(entity, ['username']),
    isUser,
    isGroup,
    isChannel,
    verified: !!pick(entity, ['verified']),
    text,
    date: toNum(pick(d, ['date', 'message.date', 'lastMessage.date'])),
    unreadCount: toNum(pick(d, ['unreadCount', 'unread_count'], 0)) || 0,
    pinned: !!pick(d, ['pinned']),
    muted: !!pick(d, ['muted', 'isMuted']),
    out: !!pick(lastMsg, ['out']),
    raw: d,
  };
}

export function normalizeMessage(m) {
  const media = m.media || m.document || m.photo || null;
  let mediaType = null;
  if (media) {
    const cn = media.className || '';
    if (m.photo || cn.includes('Photo') || media.photo) mediaType = 'photo';
    else if (m.voice || media.voice) mediaType = 'voice';
    else if (cn.includes('Document') || media.document || m.document) mediaType = 'document';
    else mediaType = 'media';
  }
  return {
    id: toNum(pick(m, ['id', 'messageId'])),
    text: pick(m, ['message', 'text', 'caption'], ''),
    out: !!pick(m, ['out', 'isOutgoing']),
    date: toNum(pick(m, ['date'])),
    editDate: toNum(pick(m, ['editDate', 'edit_date'])),
    senderId: String(pick(m, ['senderId', 'fromId.userId', 'fromId', 'peerId.userId'], '') ?? ''),
    senderName: pick(m, ['senderName', 'sender.firstName', 'postAuthor']),
    replyTo: toNum(pick(m, ['replyTo.replyToMsgId', 'replyToMsgId', 'replyTo'])),
    media: mediaType,
    fileName: pick(media || {}, ['attributes.0.fileName', 'fileName']),
    reactions: pick(m, ['reactions.results', 'reactions'], null),
    pinned: !!pick(m, ['pinned']),
    views: toNum(pick(m, ['views'])),
    raw: m,
  };
}

const COLORS = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];
export function avatarColor(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDialogTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diff = (now - d) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function fmtDayDivider(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Bugun';
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Kecha';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long' });
}

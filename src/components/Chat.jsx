import { useEffect, useRef, useState, useCallback } from 'react';
import api, { fileUrl } from '../lib/api';
import {
  normalizeMessage,
  fmtTime,
  fmtDayDivider,
} from '../lib/format';
import Avatar from './Avatar';
import Icon from './Icons';

export default function Chat({ dialog, me, onBack, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null); // {x,y,msg}
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const taRef = useRef(null);
  const typingRef = useRef(0);
  const atBottomRef = useRef(true);

  const chatId = dialog.id;

  const scrollToBottom = (smooth) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  const load = useCallback(
    async (initial) => {
      try {
        const res = await api.messages(chatId, { limit: 40 });
        const raw = Array.isArray(res) ? res : res.messages || res.items || [];
        const list = raw.map(normalizeMessage).sort((a, b) => (a.date || 0) - (b.date || 0));
        setMessages((prev) => {
          // only update if changed (avoid jitter during polling)
          if (
            prev.length === list.length &&
            prev[prev.length - 1]?.id === list[list.length - 1]?.id
          ) {
            return prev;
          }
          return list;
        });
        if (initial) {
          api.markRead(chatId).catch(() => {});
        }
      } catch {
        /* ignore poll errors */
      } finally {
        if (initial) setLoading(false);
      }
    },
    [chatId]
  );

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setReplyTo(null);
    setEditing(null);
    load(true);
    const t = setInterval(() => load(false), 3000);
    return () => clearInterval(t);
  }, [chatId, load]);

  useEffect(() => {
    if (atBottomRef.current) scrollToBottom(false);
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const sendTyping = () => {
    const now = Date.now();
    if (now - typingRef.current > 4000) {
      typingRef.current = now;
      api.typing(chatId).catch(() => {});
    }
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      if (editing) {
        await api.editMessage(chatId, editing.id, body);
        setEditing(null);
      } else {
        await api.sendMessage(chatId, body, replyTo?.id);
        setReplyTo(null);
      }
      atBottomRef.current = true;
      await load(false);
      onSent?.();
    } catch (err) {
      setText(body);
      alert('Yuborilmadi: ' + err.message);
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSending(true);
    try {
      await api.sendMedia(chatId, file, { caption: text.trim() || undefined });
      setText('');
      atBottomRef.current = true;
      await load(false);
      onSent?.();
    } catch (err) {
      alert('Media yuborilmadi: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const openMenu = (e, msg) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const act = async (type, msg) => {
    setMenu(null);
    try {
      if (type === 'reply') {
        setReplyTo(msg);
        taRef.current?.focus();
      } else if (type === 'copy') {
        await navigator.clipboard.writeText(msg.text || '');
      } else if (type === 'edit') {
        setEditing(msg);
        setText(msg.text || '');
        taRef.current?.focus();
      } else if (type === 'delete') {
        await api.deleteMessages(chatId, [msg.id], true);
        await load(false);
      } else if (type === 'pin') {
        await api.pin(chatId, msg.id, msg.pinned);
        await load(false);
      } else if (type === 'react') {
        await api.react(chatId, msg.id, '👍');
        await load(false);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  let lastDay = '';

  return (
    <>
      <div className="chat-header">
        <button className="icon-btn" onClick={onBack} title="Orqaga">
          <Icon name="back" />
        </button>
        <Avatar id={chatId} name={dialog.name} size="sm" />
        <div className="ch-info">
          <div className="ch-name">{dialog.name}</div>
          <div className="ch-status">
            {dialog.isUser ? 'oxirgi faollik yaqinda' : dialog.username ? '@' + dialog.username : 'guruh'}
          </div>
        </div>
        <button className="icon-btn"><Icon name="search" /></button>
        <button className="icon-btn"><Icon name="more" /></button>
      </div>

      <div className="messages" ref={listRef} onScroll={onScroll}>
        {loading ? (
          <div className="center-loader"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-chat"><span>Hali xabarlar yo'q. Birinchi bo'lib yozing!</span></div>
        ) : (
          messages.map((m, i) => {
            const day = fmtDayDivider(m.date);
            const showDay = day !== lastDay;
            lastDay = day;
            const prev = messages[i - 1];
            const grouped =
              prev && prev.out === m.out && prev.senderId === m.senderId && !showDay;
            return (
              <div key={m.id || i}>
                {showDay && <div className="day-divider">{day}</div>}
                <Bubble
                  m={m}
                  chatId={chatId}
                  grouped={grouped}
                  showSender={!m.out && !dialog.isUser && !grouped}
                  onContext={openMenu}
                />
              </div>
            );
          })
        )}
      </div>

      {(replyTo || editing) && (
        <div className="reply-bar">
          <Icon name={editing ? 'edit' : 'reply'} size={20} />
          <div className="rb-body">
            <div style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 13 }}>
              {editing ? 'Tahrirlash' : 'Javob: ' + (replyTo.out ? 'Siz' : dialog.name)}
            </div>
            <div className="rq-text">{(editing || replyTo).text || 'Media'}</div>
          </div>
          <button
            className="icon-btn"
            onClick={() => {
              setReplyTo(null);
              setEditing(null);
              if (editing) setText('');
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      )}

      <div className="composer">
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={onPickFile}
        />
        <div className="composer-box">
          <button
            className="icon-btn"
            style={{ marginRight: 4 }}
            onClick={() => fileRef.current?.click()}
            title="Biriktirish"
          >
            <Icon name="attach" />
          </button>
          <textarea
            ref={taRef}
            rows={1}
            placeholder="Message"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              sendTyping();
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        <button className="send-btn" onClick={handleSend} disabled={sending}>
          {sending ? <div className="spinner" /> : <Icon name="send" />}
        </button>
      </div>

      {menu && (
        <div
          className="context-menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 190),
            top: Math.min(menu.y, window.innerHeight - 280),
          }}
        >
          <button onClick={() => act('reply', menu.msg)}><Icon name="reply" size={18} /> Javob berish</button>
          <button onClick={() => act('react', menu.msg)}><Icon name="smile" size={18} /> 👍 Reaksiya</button>
          {menu.msg.text && (
            <button onClick={() => act('copy', menu.msg)}><Icon name="copy" size={18} /> Nusxa olish</button>
          )}
          {menu.msg.out && menu.msg.text && (
            <button onClick={() => act('edit', menu.msg)}><Icon name="edit" size={18} /> Tahrirlash</button>
          )}
          <button onClick={() => act('pin', menu.msg)}><Icon name="pin" size={18} /> {menu.msg.pinned ? 'Pindan olish' : 'Pin qilish'}</button>
          <button className="danger" onClick={() => act('delete', menu.msg)}><Icon name="trash" size={18} /> O'chirish</button>
        </div>
      )}
    </>
  );
}

function Bubble({ m, chatId, grouped, showSender, onContext }) {
  return (
    <div
      className={`msg-row ${m.out ? 'out' : 'in'} ${grouped ? 'grouped' : ''}`}
      onContextMenu={(e) => onContext(e, m)}
    >
      <div className="bubble">
        {showSender && (
          <div className="msg-sender" style={{ color: '#6cb1ff' }}>
            {m.senderName || 'User'}
          </div>
        )}
        {m.media === 'photo' && (
          <img
            className="msg-media-img"
            src={fileUrl(chatId, m.id)}
            alt=""
            loading="lazy"
            onError={(e) => (e.target.style.display = 'none')}
          />
        )}
        {(m.media === 'document' || m.media === 'media' || m.media === 'voice') && (
          <a
            className="msg-doc"
            href={fileUrl(chatId, m.id)}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <span className="doc-ico"><Icon name="doc" size={20} /></span>
            <div>
              <div style={{ fontWeight: 500 }}>{m.fileName || (m.media === 'voice' ? 'Ovozli xabar' : 'Fayl')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Yuklab olish</div>
            </div>
          </a>
        )}
        {m.text && <span>{m.text}</span>}
        <span className="msg-meta">
          {m.editDate && <span>tahrirlangan</span>}
          {fmtTime(m.date)}
          {m.out && <span className="tick"><Icon name="checks" size={15} /></span>}
        </span>
        {Array.isArray(m.reactions) && m.reactions.length > 0 && (
          <div className="reactions">
            {m.reactions.map((r, i) => (
              <span className="reaction" key={i}>
                {(r.reaction?.emoticon || r.emoji || '👍')} {r.count || ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { normalizeDialog, fmtDialogTime } from '../lib/format';
import Avatar from './Avatar';
import Icon from './Icons';

export default function Sidebar({ activeId, onSelect, onMenu, refreshKey }) {
  const [dialogs, setDialogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searchRes, setSearchRes] = useState(null);
  const searchTimer = useRef();

  const load = async () => {
    try {
      const res = await api.dialogs(50);
      const list = Array.isArray(res) ? res : res.dialogs || res.items || [];
      setDialogs(list.map(normalizeDialog));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // light polling for new chats
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchRes(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.search(query.trim());
        const users = (res.users || []).map(normalizeDialog);
        const chats = (res.chats || []).map(normalizeDialog);
        setSearchRes([...users, ...chats]);
      } catch {
        setSearchRes([]);
      }
    }, 400);
  }, [query]);

  const localFiltered = query.trim()
    ? dialogs.filter((d) =>
        d.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : dialogs;

  const list = query.trim()
    ? dedupe([...localFiltered, ...(searchRes || [])])
    : dialogs;

  return (
    <>
      <div className="sb-header">
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          title="Menyu"
        >
          <Icon name="menu" />
        </button>
        <div className={`search-wrap ${focused ? 'focused' : ''}`}>
          <Icon name="search" size={20} />
          <input
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>
      </div>

      <div className="dialog-list">
        {loading && (
          <div className="center-loader" style={{ height: 120 }}>
            <div className="spinner" />
          </div>
        )}
        {error && !loading && (
          <div style={{ padding: 20, color: 'var(--text-secondary)' }}>
            {error}
          </div>
        )}
        {!loading &&
          list.map((d) => (
            <div
              key={d.id + (d.username || '')}
              className={`dialog ${activeId === d.id ? 'active' : ''}`}
              onClick={() => onSelect(d)}
            >
              <Avatar id={d.id} name={d.name} />
              <div className="d-body">
                <div className="d-row">
                  <div className="d-name">
                    {d.name}
                    {d.verified && <span style={{ color: '#3390ec' }}>✓</span>}
                  </div>
                  <div className="d-time">{fmtDialogTime(d.date)}</div>
                </div>
                <div className="d-row">
                  <div className="d-text">
                    {d.out ? 'Siz: ' : ''}
                    {d.text || (d.username ? '@' + d.username : '')}
                  </div>
                  {d.unreadCount > 0 && (
                    <div className={`badge ${d.muted ? 'muted' : ''}`}>
                      {d.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        {!loading && list.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Suhbatlar topilmadi
          </div>
        )}
      </div>
    </>
  );
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

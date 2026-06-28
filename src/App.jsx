import { useEffect, useState } from 'react';
import api, { auth } from './lib/api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Avatar from './components/Avatar';
import Icon from './components/Icons';

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(auth.user);
  const [active, setActive] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!auth.session) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((u) => {
        const real = u?.user || u;
        if (real) {
          setUser(real);
          auth.user = real;
        }
      })
      .catch((err) => {
        if (err.status === 401) {
          auth.clear();
          setUser(null);
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showMenu]);

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    auth.clear();
    setUser(null);
    setActive(null);
    setShowMenu(false);
  };

  if (!ready) {
    return (
      <div className="login">
        <div className="spinner" />
      </div>
    );
  }

  if (!auth.session) {
    return <Login onDone={(u) => setUser(u)} />;
  }

  return (
    <div className="app">
      <div className={`sidebar ${active ? 'hidden-mobile' : ''}`}>
        <Sidebar
          activeId={active?.id}
          onSelect={setActive}
          onMenu={() => setShowMenu((v) => !v)}
          refreshKey={refreshKey}
        />
        {showMenu && (
          <div
            className="context-menu"
            style={{ left: 12, top: 56, minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
              <Avatar id={user?.id} name={user?.firstName || user?.username || 'Me'} size="sm" />
              <div>
                <div style={{ fontWeight: 500 }}>
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Foydalanuvchi'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {user?.phone ? '+' + user.phone : user?.username ? '@' + user.username : ''}
                </div>
              </div>
            </div>
            <button className="danger" onClick={logout}>
              <Icon name="logout" size={18} /> Chiqish
            </button>
          </div>
        )}
      </div>

      <div className={`chat-area ${active ? '' : 'hidden-mobile'}`}>
        {active ? (
          <Chat
            dialog={active}
            me={user}
            onBack={() => setActive(null)}
            onSent={() => setRefreshKey((k) => k + 1)}
          />
        ) : (
          <div className="empty-chat">
            <span>Suhbatni tanlang yoki yangi yozishni boshlang</span>
          </div>
        )}
      </div>
    </div>
  );
}

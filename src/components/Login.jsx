import { useState } from 'react';
import api, { auth } from '../lib/api';

export default function Login({ onDone }) {
  const [step, setStep] = useState('phone'); // phone | code | password
  const [phone, setPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Backend has no TG_API_ID/HASH set, so the client provides them (my.telegram.org).
  const [apiId, setApiId] = useState(localStorage.getItem('tg_api_id') || '');
  const [apiHash, setApiHash] = useState(localStorage.getItem('tg_api_hash') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const submitPhone = async (e) => {
    e.preventDefault();
    setError('');
    if (!apiId.trim() || !apiHash.trim()) {
      setShowAdvanced(true);
      setError('API ID va API Hash kerak (my.telegram.org dan oling).');
      return;
    }
    setBusy(true);
    try {
      localStorage.setItem('tg_api_id', apiId.trim());
      localStorage.setItem('tg_api_hash', apiHash.trim());
      const res = await api.sendCode(phone.trim(), apiId.trim(), apiHash.trim());
      setLoginId(res.loginId);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = (res) => {
    auth.session = res.session;
    auth.user = res.user || null;
    onDone(res.user || null);
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.signIn(loginId, code.trim());
      if (res.needPassword) {
        setStep('password');
      } else if (res.session) {
        finish(res);
      } else {
        setError("Noma'lum javob");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.signIn(loginId, code.trim(), password);
      if (res.session) finish(res);
      else setError("Parol noto'g'ri");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logo">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="#fff">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
          </svg>
        </div>

        {step === 'phone' && (
          <form onSubmit={submitPhone}>
            <h1>Telegram</h1>
            <p className="subtitle">
              Telefon raqamingizni xalqaro formatda kiriting.
            </p>
            <div className="field">
              <label>Telefon raqam</label>
              <input
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
              />
            </div>

            {showAdvanced ? (
              <>
                <div className="field">
                  <label>API ID</label>
                  <input
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    placeholder="1234567"
                    inputMode="numeric"
                  />
                </div>
                <div className="field">
                  <label>API Hash</label>
                  <input
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    placeholder="abcdef0123456789abcdef0123456789"
                  />
                </div>
              </>
            ) : (
              <div
                className="btn-link"
                style={{ textAlign: 'left', marginTop: 0, marginBottom: 12 }}
                onClick={() => setShowAdvanced(true)}
              >
                API ID / Hash kiritish ⚙️
              </div>
            )}

            <div className="error-text">{error}</div>
            <button className="btn-primary" disabled={busy || !phone.trim()}>
              {busy ? 'Yuborilmoqda…' : 'Keyingi'}
            </button>
            {showAdvanced && (
              <p
                className="subtitle"
                style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}
              >
                API ID va Hash ni{' '}
                <a href="https://my.telegram.org" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                  my.telegram.org
                </a>{' '}
                → API development tools dan oling.
              </p>
            )}
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode}>
            <h1>{phone}</h1>
            <p className="subtitle">
              Telegram ilovangizga yuborilgan kodni kiriting.
            </p>
            <div className="field">
              <label>Kod</label>
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
                inputMode="numeric"
              />
            </div>
            <div className="error-text">{error}</div>
            <button className="btn-primary" disabled={busy || !code.trim()}>
              {busy ? 'Tekshirilmoqda…' : 'Kirish'}
            </button>
            <div
              className="btn-link"
              onClick={() => {
                setStep('phone');
                setError('');
                setCode('');
              }}
            >
              ← Raqamni o'zgartirish
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitPassword}>
            <h1>Ikki bosqichli himoya</h1>
            <p className="subtitle">Hisobingiz paroli bilan tasdiqlang.</p>
            <div className="field">
              <label>Parol</label>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="error-text">{error}</div>
            <button className="btn-primary" disabled={busy || !password}>
              {busy ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

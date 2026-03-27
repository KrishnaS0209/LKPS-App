import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { db, setSession, showToast } = useApp();
  const [role, setRole] = useState('admin');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const signin = async () => {
    if (!user || !pass) { setErr('Enter username and password'); return; }
    setLoading(true); setErr('');
    await new Promise(r => setTimeout(r, 300));
    if (role === 'admin') {
      const a = db.admins.find(x => x.username === user && x.password === pass);
      if (!a) { setErr('Invalid username or password'); setLoading(false); return; }
      setSession({ user: a, role: 'admin' });
      showToast(`Welcome, ${a.name}!`);
    } else {
      const t = db.teachers.find(x => x.puser === user && x.ppass === pass);
      if (!t) { setErr('Invalid teacher credentials'); setLoading(false); return; }
      setSession({ user: { ...t }, role: 'teacher' });
      showToast(`Welcome, ${t.fn}!`);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🏫</div>
          <div>
            <div className="login-logo-name">LKPS</div>
            <div className="login-logo-sub">Lord Krishna Public School</div>
          </div>
        </div>
        <div className="login-tabs">
          <button className={`login-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => { setRole('admin'); setErr(''); }}>🛡 Admin</button>
          <button className={`login-tab ${role === 'teacher' ? 'active' : ''}`} onClick={() => { setRole('teacher'); setErr(''); }}>👩‍🏫 Teacher</button>
        </div>
        {err && <div className="login-error">{err}</div>}
        <div className="login-field">
          <label>Username</label>
          <div className="login-input-wrap">
            <span className="login-input-icon">👤</span>
            <input className="login-input" value={user} onChange={e => setUser(e.target.value)} placeholder="Enter username" autoComplete="off"
              onKeyDown={e => e.key === 'Enter' && document.getElementById('lp').focus()} />
          </div>
        </div>
        <div className="login-field">
          <label>Password</label>
          <div className="login-input-wrap">
            <span className="login-input-icon">🔒</span>
            <input id="lp" className="login-input" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter password"
              onKeyDown={e => e.key === 'Enter' && signin()} />
          </div>
        </div>
        <button className="login-btn" onClick={signin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <div className="login-hint">
          {role === 'admin' ? <>Default: <b>admin</b> / <b>admin123</b></> : 'Use credentials set by your admin'}
        </div>
      </div>
    </div>
  );
}

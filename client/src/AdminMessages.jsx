import React, { useState, useEffect } from 'react';
import { getMessages, updateMessage, deleteMessage } from './storage';

export default function AdminMessages({ activeSessionId }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread | resolved

  const load = () => {
    if (!activeSessionId) return;
    setLoading(true);
    getMessages(activeSessionId)
      .then(setMsgs)
      .catch(() => setMsgs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeSessionId]); // eslint-disable-line

  const markStatus = async (id, status) => {
    try {
      const updated = await updateMessage(activeSessionId, id, { status });
      setMsgs(prev => prev.map(m => m._id === id ? updated : m));
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(activeSessionId, id);
      setMsgs(prev => prev.filter(m => m._id !== id));
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const filtered = filter === 'all' ? msgs : msgs.filter(m => m.status === filter);
  const unreadCount = msgs.filter(m => m.status === 'unread').length;

  const typeIcon = { message: 'mail', certificate: 'description', request: 'assignment' };
  const statusColor = { unread: { bg: '#dbeafe', c: '#1960a3' }, read: { bg: '#f1f5f9', c: '#64748b' }, resolved: { bg: '#dcfce7', c: '#059669' } };

  return (
    <div className="admin-messages-page">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Communication</div>
        <div className="admin-messages-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', margin: 0 }}>Parent Messages</h1>
          {unreadCount > 0 && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#dbeafe', color: '#1960a3', fontSize: 12, fontWeight: 800 }}>{unreadCount} unread</span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="admin-messages-filterbar" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ v: 'all', label: 'All' }, { v: 'unread', label: 'Unread' }, { v: 'read', label: 'Read' }, { v: 'resolved', label: 'Resolved' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 150ms',
              background: filter === f.v ? '#1960a3' : '#fff', color: filter === f.v ? '#fff' : '#64748b',
              boxShadow: filter === f.v ? '0 2px 8px rgba(25,96,163,0.3)' : '0 1px 4px rgba(0,0,0,0.06)' }}>
            {f.label}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: '60px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1', display: 'block', marginBottom: 12 }}>mail</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No messages</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Parent messages and requests will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(m => {
            const sc = statusColor[m.status] || statusColor.unread;
            const icon = typeIcon[m.type] || 'mail';
            return (
              <div key={m._id} className="admin-message-card" style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', borderLeft: m.status === 'unread' ? '4px solid #1960a3' : '4px solid transparent' }}>
                <div className="admin-message-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1960a3' }}>{icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{m.subject}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.c, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{m.status}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'capitalize' }}>{m.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      From: <strong style={{ color: '#1e293b' }}>{m.studentName || 'Parent'}</strong> · Class {m.cls || '—'}
                    </div>
                    {m.body && <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, lineHeight: 1.5 }}>{m.body}</div>}
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {/* Actions */}
                  <div className="admin-message-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {m.status === 'unread' && (
                      <button onClick={() => markStatus(m._id, 'read')} title="Mark as read"
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Mark Read
                      </button>
                    )}
                    {m.status !== 'resolved' && (
                      <button onClick={() => markStatus(m._id, 'resolved')} title="Mark resolved"
                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Resolve
                      </button>
                    )}
                    <button onClick={() => del(m._id)} title="Delete"
                      style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

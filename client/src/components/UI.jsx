import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// ── Toast ──────────────────────────────────────────────────────────
export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const bg = toast.type === 'ok' ? '#3fb950' : toast.type === 'err' ? '#f85149' : '#388bfd';
  const icon = toast.type === 'ok' ? '✓' : toast.type === 'err' ? '✗' : 'ℹ';
  return (
    <div className="toast" key={toast.id} style={{ background: bg }}>
      {icon} {toast.msg}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, large }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${large ? 'modal-lg' : ''}`}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t, i) => (
        <button key={i} className={`tab ${active === i ? 'active' : ''}`} onClick={() => onChange(i)}>{t}</button>
      ))}
    </div>
  );
}

// ── FormGroup ──────────────────────────────────────────────────────
export function FG({ label, children, span }) {
  return (
    <div className="form-group" style={span ? { gridColumn: '1 / -1' } : {}}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────
export function Input({ ...props }) {
  return <input className="form-control" {...props} />;
}
export function Select({ children, ...props }) {
  return <select className="form-control" {...props}>{children}</select>;
}

// ── Search ─────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-wrap">
      <span className="search-icon">🔍</span>
      <input className="search-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────
export function StatCard({ icon, value, label, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `var(--${color}l)` }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── NoData ─────────────────────────────────────────────────────────
export function NoData({ icon = '📭', message }) {
  return (
    <div className="no-data">
      <div className="no-data-icon">{icon}</div>
      {message}
    </div>
  );
}

// ── Confirm ────────────────────────────────────────────────────────
export function useConfirm() {
  return (msg) => window.confirm(msg);
}

// ── PhotoZone ──────────────────────────────────────────────────────
export function PhotoZone({ photo, onChange, onClear }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
      <div className="photo-zone" onClick={() => document.getElementById('_phf').click()}>
        {photo ? <img src={photo} alt="photo" /> : <>
          <span style={{ fontSize: 20, zIndex: 1 }}>📷</span>
          <span style={{ fontSize: '9.5px', color: 'var(--sk)', fontWeight: 600, zIndex: 1 }}>Photo</span>
        </>}
      </div>
      <div>
        <input type="file" id="_phf" accept="image/*" style={{ display: 'none' }} onChange={e => {
          const f = e.target.files[0]; if (!f) return;
          if (f.size > 3 * 1024 * 1024) { alert('Max 3MB'); return; }
          const r = new FileReader(); r.onload = x => onChange(x.target.result); r.readAsDataURL(f);
          e.target.value = '';
        }} />
        <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 5 }}>JPG/PNG max 3MB</div>
        {photo && <button className="btn btn-danger btn-sm" onClick={onClear}>✕ Remove</button>}
      </div>
    </div>
  );
}

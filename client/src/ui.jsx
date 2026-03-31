import React, { useState, useEffect, useRef } from 'react';

// ── Toast ──────────────────────────────────────────────────────────
let _toastFn = null;
export function Toast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    _toastFn = (m, t = 'ok') => {
      setMsg({ m, t, id: Date.now() });
      setTimeout(() => setMsg(null), 3200);
    };
    return () => { _toastFn = null; };
  }, []);
  if (!msg) return null;
  const cfg = {
    ok:   { cls: 'bg-emerald-600', icon: '✓' },
    err:  { cls: 'bg-[#ba1a1a]',   icon: '✗' },
    info: { cls: 'bg-[#002045]',   icon: 'ℹ' },
  };
  const c = cfg[msg.t] || cfg.info;
  return (
    <div key={msg.id}
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-[0_20px_50px_rgba(24,28,30,0.18)] ${c.cls}`}>
      <span className="text-base">{c.icon}</span>
      {msg.m}
    </div>
  );
}
export const toast = (m, t) => _toastFn?.(m, t);

// ── Badge ──────────────────────────────────────────────────────────
export function Badge({ children, color = 'blue' }) {
  const map = {
    blue:   { dot: 'bg-[#1960a3]',   pill: 'bg-[#7db6ff]/20 text-[#00477f]' },
    green:  { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700' },
    red:    { dot: 'bg-[#ba1a1a]',   pill: 'bg-[#ffdad6] text-[#ba1a1a]' },
    yellow: { dot: 'bg-[#cb9524]',   pill: 'bg-[#ffdeaa]/50 text-[#5f4100]' },
    purple: { dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700' },
    gray:   { dot: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600' },
  };
  const c = map[color] || map.blue;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`}></span>
      {children}
    </span>
  );
}

// ── Button ─────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'default', size = 'md', disabled, style: sx }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  const vars = {
    default: 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
    primary: 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-container active:scale-95',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    danger:  'bg-error-container text-error hover:bg-error/20',
  };
  return (
    <button onClick={onClick} disabled={disabled} style={sx}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all cursor-pointer border-0 outline-none ${sz} ${vars[variant] || vars.default} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
}

// ── Card ───────────────────────────────────────────────────────────
export function Card({ children, style: sx, className = '' }) {
  return (
    <div className={`bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm mb-4 ${className}`} style={sx}>
      {children}
    </div>
  );
}
export function CardHead({ title, children }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-surface-container-low">
      <div className="text-base font-bold text-primary font-headline">{title}</div>
      <div className="flex gap-2 items-center flex-wrap">{children}</div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className={`bg-surface-container-lowest rounded-2xl p-7 shadow-[0_20px_60px_rgba(24,28,30,0.12)] ${wide ? 'w-[760px]' : 'w-[560px]'} max-w-[96vw] max-h-[90vh] overflow-y-auto`}>
        <div className="text-lg font-bold text-primary font-headline mb-5">{title}</div>
        {children}
      </div>
    </div>
  );
}
export function ModalFooter({ children }) {
  return (
    <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-surface-container-low">
      {children}
    </div>
  );
}

// ── Form helpers ───────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</label>}
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 bg-surface-container-low border-0 rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all';

export function Input({ value, onChange, placeholder, type = 'text', style: sx, ...rest }) {
  return (
    <input className={inputCls} style={sx} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} {...rest} />
  );
}
export function Select({ value, onChange, children, style: sx, ...rest }) {
  return (
    <select className={inputCls + ' cursor-pointer'} style={sx}
      value={value} onChange={e => onChange(e.target.value)} {...rest}>
      {children}
    </select>
  );
}
export function Grid({ cols = 2, children, style: sx }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, ...sx }}>
      {children}
    </div>
  );
}
export function Span({ children }) {
  return <div style={{ gridColumn: '1 / -1' }}>{children}</div>;
}
export function SecLabel({ children }) {
  return (
    <div style={{ gridColumn: '1 / -1' }}
      className="text-[10px] font-black text-primary uppercase tracking-widest pt-3 pb-2 border-b border-primary/10">
      {children}
    </div>
  );
}

// ── Search ─────────────────────────────────────────────────────────
export function Search({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
      <input className="pl-9 pr-3 py-2 bg-surface-container-low border-0 rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest w-52 transition-all"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────
const AVC = ['#002045','#1960a3','#ba1a1a','#cb9524','#7c3aed','#0891b2'];
export function Avatar({ name, idx = 0 }) {
  const bg = AVC[Math.abs(idx) % AVC.length];
  const ini = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span style={{ background: bg }}
      className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mr-2.5">
      {ini}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────
export function Stat({ icon, value, label, sub, color = '#002045' }) {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: color }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
        style={{ background: color + '18' }}>
        {icon}
      </div>
      <div className="text-2xl font-black text-primary tracking-tight leading-none font-headline">{value}</div>
      <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mt-2">{label}</div>
      {sub && <div className="text-[11px] text-outline mt-1">{sub}</div>}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl w-fit mx-4 my-3">
      {tabs.map((t, i) => (
        <button key={i} onClick={() => onChange(i)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all border-0 cursor-pointer
            ${active === i ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface bg-transparent'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Photo upload zone ──────────────────────────────────────────────
export function PhotoZone({ photo, onUpload, onClear }) {
  const ref = useRef();
  return (
    <div className="flex items-center gap-4">
      <div onClick={() => ref.current.click()}
        className="w-20 h-20 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer bg-primary/5 flex-shrink-0 overflow-hidden relative hover:border-primary/60 transition-colors">
        {photo
          ? <img src={photo} alt="p" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-primary text-2xl">photo_camera</span>
              <span className="text-[9px] text-primary font-bold">Photo</span>
            </div>
        }
      </div>
      <div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => {
          const f = e.target.files[0]; if (!f) return;
          if (f.size > 3 * 1024 * 1024) { toast('Max 3MB', 'err'); return; }
          const r = new FileReader(); r.onload = x => onUpload(x.target.result); r.readAsDataURL(f);
          e.target.value = '';
        }} />
        <div className="text-xs text-on-surface-variant mb-2">JPG/PNG max 3MB</div>
        {photo && <Btn variant="danger" size="sm" onClick={onClear}>✕ Remove</Btn>}
      </div>
    </div>
  );
}

// ── No data placeholder ────────────────────────────────────────────
export function NoData({ icon = '📋', text = 'No data yet' }) {
  return (
    <div className="text-center py-14 text-outline">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm font-medium">{text}</div>
    </div>
  );
}

// ── Table wrapper ──────────────────────────────────────────────────
export function TblWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>;
}

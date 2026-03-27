import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import { loadDB, exportJSON, importJSON, exportCSV, uid, paidTotal, grade, gradeColor } from './db';
import { Toast, toast, Badge, Btn, Card, CardHead, Modal, ModalFooter, Field, Input, Select, Grid, Span, SecLabel, Search, Avatar, Stat, Tabs, PhotoZone, NoData, TblWrap } from './ui.jsx';
import { buildCard, printCard, printClassCards, printTC, printCC, buildTC, buildCC } from './print.js';
import {
  apiLogin, apiTeacherLogin, apiParentLogin, clearToken, getToken,
  getSessions, createSession, updateSession, deleteSession,
  loadSessionData, saveSessionData, initShadow,
  getAdmins, createAdmin, updateAdmin, removeAdmin,
  getMessages, sendMessage, updateMessage, deleteMessage,
} from './storage';
import ParentPortal from './ParentPortal';
import AdminMessages from './AdminMessages';
import ReportCardStudio from './ReportCardStudio';
import { getApiBase } from './apiBase';

const LOGO_SRC = process.env.PUBLIC_URL + '/logo.png';
const API_BASE = getApiBase();

export default function App() {
  const [db, setDB] = useState(null);
  const [session, setSession] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [page, setPage] = useState('dash');
  const [loading, setLoading] = useState(true);

  // On mount — check if token + session already stored (stay logged in)
  useEffect(() => {
    const token = getToken();
    const savedUser = (() => { try { return JSON.parse(localStorage.getItem('lkps_user')); } catch { return null; } })();
    const savedSessId = localStorage.getItem('lkps_active_session');
    if (token && savedUser && savedSessId) {
      const role = savedUser.role === 'teacher' ? 'teacher' : savedUser.role === 'parent' ? 'parent' : 'admin';
      setSession({ user: savedUser, role });
      setActiveSessionId(savedSessId);
    }
    setLoading(false);
  }, []);

  // Load session data from API when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) return;
    setDB(null);
    loadSessionData(activeSessionId).then(raw => {
      const defaults = loadDB();
      const merged = raw ? { ...defaults, ...raw } : defaults;
      initShadow(activeSessionId, merged);
      setDB(merged);
    }).catch(() => setDB(loadDB()));
  }, [activeSessionId]);

  const save = useCallback((newDB) => {
    setDB(newDB);
    if (activeSessionId) saveSessionData(activeSessionId, newDB);
  }, [activeSessionId]);

  const handleLogin = (authSession, sessId) => {
    setSession(authSession);
    setActiveSessionId(sessId);
    localStorage.setItem('lkps_user', JSON.stringify(authSession.user));
    localStorage.setItem('lkps_active_session', sessId);
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('lkps_user');
    localStorage.removeItem('lkps_active_session');
    setSession(null);
    setActiveSessionId(null);
    setDB(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-on-surface-variant bg-surface text-sm font-medium">Loading…</div>;

  if (!session || !activeSessionId) {
    return <LoginFlow onLogin={handleLogin} skipAuth={session} authSession={session} />;
  }
  if (!db) return <div className="flex items-center justify-center h-screen text-on-surface-variant bg-surface text-sm font-medium">Loading session…</div>;
  if (session.role === 'teacher') return <TeacherPortal db={db} save={save} teacher={session.user} onLogout={handleLogout} />;
  if (session.role === 'parent') return <ParentPortal db={db} student={session.user} activeSessionId={activeSessionId} onLogout={handleLogout} />;
  return <AdminApp db={db} save={save} page={page} setPage={setPage} user={session.user}
    setUser={u => { setSession(s => ({...s, user: u})); localStorage.setItem('lkps_user', JSON.stringify(u)); }}
    activeSessionId={activeSessionId}
    onSwitchSession={() => { setActiveSessionId(null); localStorage.removeItem('lkps_active_session'); }}
    onLogout={handleLogout} />;
}

// ── LoginFlow — handles auth → session picker ─────────────────────
function LoginFlow({ onLogin, skipAuth, authSession: initialAuth }) {
  const [step, setStep] = useState(skipAuth ? 'session' : 'auth');
  const [authSession, setAuthSession] = useState(initialAuth || null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [authDB, setAuthDB] = useState(loadDB());

  const fetchSessions = () => {
    setSessionsLoading(true);
    getSessions()
      .then(list => setSessions(list))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  };

  // Fetch on step change to 'session'
  useEffect(() => {
    if (step === 'session') fetchSessions();
  }, [step]); // eslint-disable-line

  // Also fetch immediately on mount if skipAuth (already logged in, just picking session)
  useEffect(() => {
    if (skipAuth) fetchSessions();
  }, []); // eslint-disable-line

  const handleAuth = (sess) => {
    // Parent login: sess.role === 'parent' — go directly to their session
    if (sess.role === 'parent') {
      onLogin(sess, sess.user.sessionId);
      return;
    }
    setAuthSession(sess);
    setStep('session');
  };

  const handlePickSession = (sessId) => {
    onLogin(authSession, sessId);
  };

  const handleCreateSession = async (name, year, carryOver) => {
    const id = 'sess_' + uid();
    const lastSess = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    const carryFrom = lastSess ? { sessionId: lastSess.sid || lastSess.id, ...carryOver } : undefined;
    try {
      await createSession(id, name, year, carryFrom);
      const updated = await getSessions();
      setSessions(updated);
      onLogin(authSession, id);
    } catch (err) {
      toast('Failed to create session: ' + err.message, 'err');
    }
  };

  if (step === 'auth') return <Login db={authDB} onLogin={handleAuth} />;
  if (sessionsLoading && sessions.length === 0) {
    return <div className="flex items-center justify-center h-screen bg-surface text-sm text-on-surface-variant">Loading sessions…</div>;
  }
  return <SessionPicker sessions={sessions} authSession={authSession} onPick={handlePickSession} onCreate={handleCreateSession} onSignOut={()=>setStep('auth')} onRefresh={fetchSessions} />;
}

// ── SessionPicker ─────────────────────────────────────────────────
const CARRY_OPTIONS = [
  { k:'classes',    icon:'class',         label:'Classes',       desc:'Class list & sections' },
  { k:'teachers',   icon:'person_book',   label:'Teachers',      desc:'Staff directory' },
  { k:'tt',         icon:'calendar_today',label:'Timetable',     desc:'Period schedule' },
  { k:'slots',      icon:'schedule',      label:'Time Slots',    desc:'Period timings' },
  { k:'feeStruct',  icon:'payments',      label:'Fee Structure', desc:'Monthly fee & charges' },
  { k:'settings',   icon:'settings',      label:'School Settings',desc:'School info & config' },
  { k:'events',     icon:'event',         label:'Calendar Events',desc:'Holidays & events' },
];

function SessionPicker({ sessions: initSessions, authSession, onPick, onCreate, onSignOut, onRefresh }) {
  const [sessions, setSessions] = useState(initSessions);
  const [sessionStats, setSessionStats] = useState({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [mounted, setMounted] = useState(false);
  const [hovIdx, setHovIdx] = useState(null);
  const [carry, setCarry] = useState({ classes:false, teachers:false, tt:false, slots:false, feeStruct:false, settings:false, events:false });
  // edit state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState('');
  // delete confirm state
  const [delId, setDelId] = useState(null);
  const [delConfirm, setDelConfirm] = useState('');
  const [delErr, setDelErr] = useState('');
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  // Sync when parent updates sessions list
  useEffect(() => { setSessions(initSessions); }, [initSessions]);

  // Load lightweight stats per session
  useEffect(() => {
    const token = sessionStorage.getItem('lkps_token');
    initSessions.forEach(s => {
      const sid = s.sid || s.id;
      Promise.all([
        fetch(`${API_BASE}/sessions/${sid}/students`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/sessions/${sid}/payments`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()).catch(() => []),
      ]).then(([students, pays]) => {
        setSessionStats(prev => ({
          ...prev,
          [sid]: {
            stuCount: Array.isArray(students) ? students.length : 0,
            col: Array.isArray(pays) ? pays.reduce((sum, p) => sum + (p.amt || 0), 0) : 0,
          }
        }));
      });
    });
  }, [initSessions]);

  const hasPrev = sessions.length > 0;
  const allSelected = CARRY_OPTIONS.every(o => carry[o.k]);
  const toggleCarry = k => setCarry(c => ({ ...c, [k]: !c[k] }));
  const toggleAll = () => {
    const val = !allSelected;
    setCarry(Object.fromEntries(CARRY_OPTIONS.map(o => [o.k, val])));
  };

  const resetCreate = () => {
    setCreating(false); setNameErr(''); setNewName(''); setNewYear('');
    setCarry({ classes:false, teachers:false, tt:false, slots:false, feeStruct:false, settings:false, events:false });
  };

  const doCreate = () => {
    if (!newName.trim()) { setNameErr('Session name required'); return; }
    if (!newYear.trim()) { setNameErr('Academic year required'); return; }
    onCreate(newName.trim(), newYear.trim(), carry);
  };

  const startEdit = (s, e) => { e.stopPropagation(); setEditId(s.sid || s.id); setEditName(s.name); setEditYear(s.year); };
  const cancelEdit = () => { setEditId(null); setEditName(''); setEditYear(''); };
  const doEdit = async (e) => {
    e.stopPropagation();
    if (!editName.trim() || !editYear.trim()) return;
    try {
      await updateSession(editId, editName.trim(), editYear.trim());
      if (onRefresh) onRefresh();
    } catch (err) { toast('Update failed: ' + err.message, 'err'); }
    cancelEdit();
  };

  const startDelete = (s, e) => { e.stopPropagation(); setDelId(s.sid || s.id); setDelConfirm(''); setDelErr(''); };
  const cancelDelete = () => { setDelId(null); setDelConfirm(''); setDelErr(''); };
  const doDelete = async () => {
    if (delConfirm.trim().toUpperCase() !== 'YES') { setDelErr('Type YES to confirm'); return; }
    try {
      await deleteSession(delId);
      if (onRefresh) onRefresh();
    } catch (err) { toast('Delete failed: ' + err.message, 'err'); }
    cancelDelete();
  };

  const anim = (delay=0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : 'translateY(20px)',
    transition: `opacity 550ms ${delay}ms cubic-bezier(0.4,0,0.2,1), transform 550ms ${delay}ms cubic-bezier(0.4,0,0.2,1)`,
  });

  return (
    <div className="sp-root" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'linear-gradient(145deg,#001530 0%,#002045 50%,#0a3060 100%)',position:'relative',overflow:'hidden',fontFamily:'Inter,sans-serif'}}>
      <style>{`
        @keyframes sp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes sp-pulse{0%,100%{opacity:0.4}50%{opacity:0.9}}
        @keyframes sp-slidein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes sp-spin{to{transform:rotate(360deg)}}
        .sp-sess{transition:all 200ms!important}
        .sp-sess:hover .sp-actions{opacity:1!important}
        .sp-sess:hover{border-color:#60a5fa!important;background:rgba(255,255,255,0.08)!important;transform:translateY(-3px)!important;box-shadow:0 12px 32px rgba(0,0,0,0.3)!important}
        .sp-create:hover{border-color:#60a5fa!important;color:#60a5fa!important;background:rgba(96,165,250,0.08)!important}
        .sp-input:focus{border-color:#60a5fa!important;box-shadow:0 0 0 3px rgba(96,165,250,0.15)!important;background:rgba(255,255,255,0.08)!important}
        .sp-input{transition:border-color 200ms,box-shadow 200ms,background 200ms}
        .sp-icon-btn{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 150ms;color:rgba(255,255,255,0.5)}
        .sp-icon-btn:hover{background:rgba(255,255,255,0.14)!important;color:#fff!important}
        .sp-icon-btn.del:hover{background:rgba(239,68,68,0.2)!important;border-color:rgba(239,68,68,0.4)!important;color:#fca5a5!important}
        .sp-icon-btn.edit:hover{background:rgba(96,165,250,0.15)!important;border-color:rgba(96,165,250,0.4)!important;color:#60a5fa!important}
        .sp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
        @keyframes sp-modal{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:none}}
        @media (max-width: 768px){
          .sp-root{padding:14px 10px!important}
          .sp-wrap{max-width:100%!important}
          .sp-head h2{font-size:30px!important}
          .sp-grid-2{grid-template-columns:1fr!important}
          .sp-actions{opacity:1!important}
          .sp-cta-row{flex-direction:column!important}
        }
      `}</style>

      {/* Background grid */}
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',backgroundSize:'52px 52px',pointerEvents:'none'}}/>
      {/* Orbs */}
      {[{w:400,h:400,top:'-120px',right:'-100px',dur:'20s',delay:'0s'},{w:250,h:250,bottom:'-80px',left:'-60px',dur:'16s',delay:'4s'},{w:120,h:120,top:'40%',left:'10%',dur:'12s',delay:'2s'}].map((o,i)=>(
        <div key={i} style={{position:'absolute',width:o.w,height:o.h,top:o.top,right:o.right,bottom:o.bottom,left:o.left,borderRadius:'50%',background:'rgba(255,255,255,0.04)',filter:'blur(1px)',animation:`sp-float ${o.dur} ${o.delay} ease-in-out infinite`,pointerEvents:'none'}}/>
      ))}

      <div className="sp-wrap" style={{width:'100%',maxWidth:540,position:'relative',zIndex:1}}>

        {/* Header */}
        <div className="sp-head" style={{...anim(0),textAlign:'center',marginBottom:40}}>
          {/* School name badge — no logo box */}
          <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 22px',borderRadius:50,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',backdropFilter:'blur(12px)',marginBottom:28,boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
            <span className="material-symbols-outlined" style={{fontSize:16,color:'#60a5fa'}}>school</span>
            <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',letterSpacing:'0.12em',textTransform:'uppercase'}}>LORD KRISHNA PUBLIC SCHOOL</span>
          </div>

          {/* Big greeting */}
          <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.38)',letterSpacing:'0.06em',marginBottom:10}}>
            Welcome back, <span style={{color:'#60a5fa',fontWeight:800}}>{authSession?.user?.name||'Admin'}</span>
          </div>
          <h2 style={{fontSize:38,fontWeight:900,color:'#fff',fontFamily:'Manrope,sans-serif',letterSpacing:'-0.03em',margin:'0 0 10px',lineHeight:1.05}}>
            Select Academic<br/>
            <span style={{background:'linear-gradient(90deg,#60a5fa,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Session</span>
          </h2>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.38)',margin:0}}>Choose a session to continue or start a new one</p>
          {/* Sign out */}
          <button onClick={onSignOut}
            style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:18,padding:'7px 18px',borderRadius:20,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 150ms',backdropFilter:'blur(8px)'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.12)';e.currentTarget.style.borderColor='rgba(239,68,68,0.35)';e.currentTarget.style.color='#fca5a5';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';e.currentTarget.style.color='rgba(255,255,255,0.5)';}}>
            <span className="material-symbols-outlined" style={{fontSize:14}}>logout</span>
            Sign Out
          </button>
        </div>

        {/* Session cards */}
        <div style={{...anim(80),display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
          {sessions.map((s,i)=>{
            const key = s.sid || s.id;
            const stats = sessionStats[key] || {};
            const stuCount = stats.stuCount || 0;
            const col = stats.col || 0;
            const isLatest = i===sessions.length-1;
            const isHov = hovIdx===i;
            const isEditing = editId===key;
            return (
              <div key={key} style={{position:'relative'}}>
                {isEditing ? (
                  /* ── Inline edit form ── */
                  <div style={{padding:'16px 18px',borderRadius:16,border:'1.5px solid rgba(96,165,250,0.5)',background:'rgba(96,165,250,0.08)',backdropFilter:'blur(8px)',animation:'sp-slidein 200ms ease'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Edit Session</div>
                    <div className="sp-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                      {[{label:'Session Name',val:editName,set:setEditName},{label:'Academic Year',val:editYear,set:setEditYear}].map(f=>(
                        <div key={f.label}>
                          <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>{f.label}</div>
                          <input value={f.val} onChange={e=>f.set(e.target.value)} className="sp-input"
                            style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.06)',fontSize:12,fontWeight:600,color:'#fff',outline:'none',boxSizing:'border-box'}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={cancelEdit} style={{flex:1,padding:'9px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.55)',fontWeight:700,fontSize:11,cursor:'pointer'}}>Cancel</button>
                      <button onClick={doEdit} style={{flex:2,padding:'9px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1960a3,#60a5fa)',color:'#fff',fontWeight:800,fontSize:11,cursor:'pointer'}}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal card ── */
                  <div className="sp-sess" role="button" tabIndex={0}
                    onClick={()=>onPick(s.sid || s.id)}
                    onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&onPick(s.sid || s.id)}
                    onMouseEnter={()=>setHovIdx(i)} onMouseLeave={()=>setHovIdx(null)}
                    style={{display:'flex',alignItems:'center',gap:16,padding:'16px 18px',borderRadius:16,border:`1.5px solid ${isLatest?'rgba(96,165,250,0.5)':'rgba(255,255,255,0.1)'}`,background:isLatest?'rgba(96,165,250,0.1)':'rgba(255,255,255,0.05)',cursor:'pointer',textAlign:'left',backdropFilter:'blur(8px)',boxShadow:isLatest?'0 4px 20px rgba(0,0,0,0.2)':'none',width:'100%',boxSizing:'border-box'}}>
                    <div style={{width:44,height:44,borderRadius:12,background:isLatest?'linear-gradient(135deg,#1960a3,#60a5fa)':'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:isLatest?'0 4px 12px rgba(25,96,163,0.4)':'none'}}>
                      <span className="material-symbols-outlined" style={{fontSize:20,color:'#fff'}}>school</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                        <span style={{fontSize:14,fontWeight:800,color:'#fff',fontFamily:'Manrope,sans-serif'}}>{s.name}</span>
                        {isLatest&&<span style={{fontSize:9,fontWeight:700,color:'#60a5fa',background:'rgba(96,165,250,0.15)',padding:'2px 9px',borderRadius:20,textTransform:'uppercase',letterSpacing:'0.07em',border:'1px solid rgba(96,165,250,0.3)'}}>Latest</span>}
                      </div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',display:'flex',gap:10}}>
                        <span>{stuCount} student{stuCount!==1?'s':''}</span>
                        <span>·</span>
                        <span>₹{col.toLocaleString('en-IN')} collected</span>
                      </div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.28)',marginTop:2}}>Created {new Date(s.created).toLocaleDateString('en-IN')}</div>
                    </div>
                    {/* Action buttons — visible on hover */}
                    <div className="sp-actions" style={{display:'flex',gap:6,opacity:0,transition:'opacity 150ms',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button className="sp-icon-btn edit" title="Edit" onClick={e=>startEdit(s,e)}>
                        <span className="material-symbols-outlined" style={{fontSize:15}}>edit</span>
                      </button>
                      {sessions.length > 1 && (
                        <button className="sp-icon-btn del" title="Delete" onClick={e=>startDelete(s,e)}>
                          <span className="material-symbols-outlined" style={{fontSize:15}}>delete</span>
                        </button>
                      )}
                    </div>
                    <span className="material-symbols-outlined" style={{fontSize:18,color:isLatest?'#60a5fa':'rgba(255,255,255,0.35)',flexShrink:0,transition:'transform 200ms',transform:isHov?'translateX(4px)':'translateX(0)',marginLeft:4}}>arrow_forward</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Delete confirmation modal */}
        {delId && (
          <div className="sp-overlay" onClick={cancelDelete}>
            <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:380,borderRadius:18,border:'1.5px solid rgba(239,68,68,0.4)',background:'linear-gradient(145deg,#1a0a0a,#2a0f0f)',padding:'28px 26px',animation:'sp-modal 220ms ease',boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                <div style={{width:42,height:42,borderRadius:12,background:'rgba(239,68,68,0.2)',border:'1.5px solid rgba(239,68,68,0.4)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span className="material-symbols-outlined" style={{fontSize:22,color:'#f87171'}}>delete_forever</span>
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:'#fff',fontFamily:'Manrope,sans-serif'}}>Delete Session</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:2}}>"{sessions.find(s=>s.id===delId)?.name}"</div>
                </div>
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.6,marginBottom:18}}>
                This will permanently delete the session and <span style={{color:'#fca5a5',fontWeight:700}}>all its data</span> including students, payments, attendance and exams. This cannot be undone.
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>Type <span style={{color:'#f87171',fontFamily:'monospace',fontSize:12}}>YES</span> to confirm</div>
                <input value={delConfirm} onChange={e=>{setDelConfirm(e.target.value);setDelErr('');}}
                  placeholder="YES"
                  className="sp-input"
                  style={{width:'100%',padding:'11px 14px',borderRadius:10,border:`1.5px solid ${delErr?'rgba(239,68,68,0.6)':'rgba(255,255,255,0.15)'}`,background:'rgba(255,255,255,0.06)',fontSize:14,fontWeight:700,color:'#fff',outline:'none',boxSizing:'border-box',letterSpacing:'0.05em'}}/>
                {delErr&&<div style={{fontSize:11,color:'#fca5a5',marginTop:6}}>{delErr}</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={cancelDelete} style={{flex:1,padding:'11px',borderRadius:10,border:'1.5px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.6)',fontWeight:700,fontSize:12,cursor:'pointer'}}>Cancel</button>
                <button onClick={doDelete} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#b91c1c,#ef4444)',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer',boxShadow:'0 4px 16px rgba(185,28,28,0.4)'}}>Delete Session</button>
              </div>
            </div>
          </div>
        )}

        {/* Create new */}
        <div style={anim(160)}>
          {!creating ? (
            <button className="sp-create"
              onClick={()=>setCreating(true)}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'15px',borderRadius:14,border:'1.5px dashed rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.5)',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 180ms',boxSizing:'border-box'}}>
              <span className="material-symbols-outlined" style={{fontSize:18}}>add_circle</span>
              Create New Session
            </button>
          ) : (
            <div style={{borderRadius:16,border:'1.5px solid rgba(96,165,250,0.4)',background:'rgba(255,255,255,0.06)',backdropFilter:'blur(12px)',animation:'sp-slidein 300ms ease',overflow:'hidden'}}>
              {/* Form header */}
              <div style={{padding:'18px 22px 0',borderBottom:'1px solid rgba(255,255,255,0.08)',paddingBottom:16,marginBottom:0}}>
                <div style={{fontSize:15,fontWeight:800,color:'#fff',fontFamily:'Manrope,sans-serif',marginBottom:4}}>New Academic Session</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.38)'}}>Configure what to carry over from the previous session</div>
              </div>

              <div style={{padding:'18px 22px'}}>
                {nameErr&&<div style={{fontSize:11,color:'#fca5a5',background:'rgba(239,68,68,0.15)',padding:'9px 12px',borderRadius:9,marginBottom:14,border:'1px solid rgba(239,68,68,0.3)'}}>{nameErr}</div>}

                {/* Name + Year inputs */}
                <div className="sp-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                  {[{label:'Session Name',val:newName,set:v=>{setNewName(v);setNameErr('');},ph:'e.g. 2026-2027'},{label:'Academic Year',val:newYear,set:v=>{setNewYear(v);setNameErr('');},ph:'e.g. 2026-2027'}].map(f=>(
                    <div key={f.label}>
                      <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{f.label}</div>
                      <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        className="sp-input"
                        style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.06)',fontSize:13,fontWeight:600,color:'#fff',outline:'none',boxSizing:'border-box'}}/>
                    </div>
                  ))}
                </div>

                {/* Carry-over section — only if there are previous sessions */}
                {hasPrev && (
                  <div style={{marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Carry Over from Previous Session</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2}}>Select what to import into the new session</div>
                      </div>
                      <button onClick={toggleAll}
                        style={{fontSize:10,fontWeight:700,color:allSelected?'#fbbf24':'#60a5fa',background:allSelected?'rgba(251,191,36,0.1)':'rgba(96,165,250,0.1)',border:`1px solid ${allSelected?'rgba(251,191,36,0.3)':'rgba(96,165,250,0.3)'}`,borderRadius:20,padding:'4px 12px',cursor:'pointer',transition:'all 150ms',whiteSpace:'nowrap'}}>
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="sp-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {CARRY_OPTIONS.map(opt=>{
                        const on = carry[opt.k];
                        return (
                          <button key={opt.k} onClick={()=>toggleCarry(opt.k)}
                            style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:11,border:`1.5px solid ${on?'rgba(96,165,250,0.6)':'rgba(255,255,255,0.1)'}`,background:on?'rgba(96,165,250,0.12)':'rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left',transition:'all 150ms'}}>
                            <div style={{width:30,height:30,borderRadius:8,background:on?'linear-gradient(135deg,#1960a3,#60a5fa)':'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 150ms'}}>
                              <span className="material-symbols-outlined" style={{fontSize:15,color:on?'#fff':'rgba(255,255,255,0.4)'}}>{opt.icon}</span>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:700,color:on?'#fff':'rgba(255,255,255,0.6)',lineHeight:1.2}}>{opt.label}</div>
                              <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{opt.desc}</div>
                            </div>
                            <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${on?'#60a5fa':'rgba(255,255,255,0.2)'}`,background:on?'#60a5fa':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 150ms'}}>
                              {on&&<span className="material-symbols-outlined" style={{fontSize:11,color:'#fff',fontVariationSettings:"'FILL' 1"}}>check</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Always-fresh note */}
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12,padding:'9px 12px',borderRadius:9,background:'rgba(251,191,36,0.07)',border:'1px solid rgba(251,191,36,0.2)'}}>
                      <span className="material-symbols-outlined" style={{fontSize:14,color:'#fbbf24',flexShrink:0}}>info</span>
                      <span style={{fontSize:10,color:'rgba(251,191,36,0.8)',lineHeight:1.4}}>Always fresh: Students, attendance, payments, exams &amp; marks are never carried over</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="sp-cta-row" style={{display:'flex',gap:8}}>
                  <button onClick={resetCreate}
                    style={{flex:1,padding:'11px',borderRadius:10,border:'1.5px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.6)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 150ms'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                    Cancel
                  </button>
                  <button onClick={doCreate}
                    style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1960a3,#60a5fa)',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer',boxShadow:'0 4px 16px rgba(25,96,163,0.4)',transition:'all 150ms'}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(25,96,163,0.5)';}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 16px rgba(25,96,163,0.4)';}}>
                    Create &amp; Enter Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function Login({ db, onLogin }) {
  const [role, setRole] = useState('admin');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const signin = async () => {
    if (!u || !p) { setErr('Enter username and password'); return; }
    setLoading(true); setErr('');
    try {
      if (role === 'admin') {
        const user = await apiLogin(u, p);
        onLogin({ user, role: 'admin' });
      } else if (role === 'teacher') {
        const sessions = await getSessions();
        if (!sessions.length) { setErr('No sessions found. Create a session first.'); setLoading(false); return; }
        const user = await apiTeacherLogin(u, p, sessions[0].sid || sessions[0].id);
        onLogin({ user, role: 'teacher' });
      } else {
        const user = await apiParentLogin(u, p);
        onLogin({ user: { ...user, role: 'parent' }, role: 'parent' });
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        setErr('Cannot reach server. Make sure the backend is running on port 5001.');
      } else {
        setErr(msg || 'Invalid credentials');
      }
    }
    setLoading(false);
  };

  const FEATURES = [
    { icon:'group',          label:'Students',   desc:'Directory & enrollment',  color:'#60a5fa' },
    { icon:'payments',       label:'Finance',    desc:'Fee collection & ledger', color:'#34d399' },
    { icon:'fact_check',     label:'Attendance', desc:'Daily roll & reports',    color:'#f472b6' },
    { icon:'quiz',           label:'Exams',      desc:'Marks & report cards',    color:'#a78bfa' },
    { icon:'schedule',       label:'Timetable',  desc:'Periods & time slots',    color:'#fb923c' },
    { icon:'calendar_month', label:'Calendar',   desc:'Holidays & events',       color:'#38bdf8' },
  ];

  const ORBS = [
    {w:320,h:320,top:'-80px',left:'-80px',color:'rgba(255,255,255,0.04)',delay:'0s',dur:'18s'},
    {w:200,h:200,top:'40%',right:'-60px',color:'rgba(255,255,255,0.06)',delay:'3s',dur:'14s'},
    {w:140,h:140,bottom:'80px',left:'30%',color:'rgba(255,255,255,0.05)',delay:'6s',dur:'20s'},
    {w:80,h:80,top:'20%',left:'55%',color:'rgba(255,255,255,0.08)',delay:'1s',dur:'10s'},
  ];

  const anim = (delay=0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : 'translateY(18px)',
    transition: `opacity 600ms ${delay}ms cubic-bezier(0.4,0,0.2,1), transform 600ms ${delay}ms cubic-bezier(0.4,0,0.2,1)`,
  });

  return (
    <div className="lp-root" style={{minHeight:'100vh',display:'flex',background:'var(--bg)',fontFamily:'Inter,sans-serif'}}>
      <style>{`
        @keyframes lp-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.04)}}
        @keyframes lp-spin{to{transform:rotate(360deg)}}
        @keyframes lp-pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes lp-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
        @keyframes lp-slidein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .lp-input:focus{border-color:#1960a3!important;box-shadow:0 0 0 3px rgba(25,96,163,0.12)!important;background:#fff!important}
        .lp-input{transition:border-color 200ms,box-shadow 200ms,background 200ms}
        .lp-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(0,32,69,0.38)!important}
        .lp-btn:active:not(:disabled){transform:scale(0.98)}
        .lp-feature:hover{background:rgba(255,255,255,0.11)!important;transform:translateY(-2px)}
        .lp-sess:hover{border-color:#1960a3!important;box-shadow:0 6px 20px rgba(25,96,163,0.14)!important;transform:translateY(-2px)}
        @media (max-width: 1024px){
          .lp-left{display:none!important}
          .lp-panel{max-width:none!important;width:100%!important}
        }
        @media (max-width: 768px){
          .lp-backrow{padding:14px 16px 0!important}
          .lp-center{padding:14px 16px 20px!important}
          .lp-role-grid{grid-template-columns:1fr!important}
          .lp-footer{padding:10px 12px!important}
        }
      `}</style>

      {/* Left hero */}
      <div className="hidden lg:flex lp-left" style={{flex:1,background:'linear-gradient(145deg,#001530 0%,#002045 50%,#0a3060 100%)',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',padding:'48px 56px'}}>
        {ORBS.map((o,i)=>(
          <div key={i} style={{position:'absolute',width:o.w,height:o.h,top:o.top,left:o.left,right:o.right,bottom:o.bottom,borderRadius:'50%',background:o.color,animation:`lp-float ${o.dur} ${o.delay} ease-in-out infinite`,pointerEvents:'none'}}/>
        ))}
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',backgroundSize:'52px 52px',pointerEvents:'none'}}/>

        <div style={{...anim(0),position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:12,marginBottom:60}}>
          <div style={{width:46,height:46,borderRadius:14,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
            <img src={LOGO_SRC} alt="LKPS" style={{width:32,height:32,objectFit:'contain'}} onError={e=>e.target.style.display='none'}/>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.38)',letterSpacing:'0.25em',textTransform:'uppercase'}}>Academic Archive</div>
            <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{db.settings.school||'LORD KRISHNA PUBLIC SCHOOL'}</div>
          </div>
        </div>

        <div style={{position:'relative',zIndex:1,flex:1}}>
          <div style={{...anim(80),fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:14}}>School Management System</div>
          <h1 style={{...anim(160),fontSize:50,fontWeight:900,color:'#fff',lineHeight:1.06,letterSpacing:'-0.03em',margin:'0 0 18px',fontFamily:'Manrope,sans-serif'}}>
            Lord Krishna<br/>
            <span style={{background:'linear-gradient(90deg,#60a5fa,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Public School</span>
          </h1>
          <p style={{...anim(240),fontSize:14,color:'rgba(255,255,255,0.48)',lineHeight:1.75,maxWidth:340,margin:'0 0 44px'}}>
            Centralized oversight of academics, finance, attendance, and institutional records.
          </p>
          <div style={{...anim(300),display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,maxWidth:400}}>
            {FEATURES.map(f=>(
              <div key={f.label} className="lp-feature"
                style={{background:'rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.07)',transition:'all 200ms',cursor:'default'}}>
                <div style={{width:28,height:28,borderRadius:8,background:f.color+'20',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                  <span className="material-symbols-outlined" style={{fontSize:15,color:f.color}}>{f.icon}</span>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:2}}>{f.label}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.38)'}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{...anim(380),position:'relative',zIndex:1,paddingTop:22,borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.22)',fontWeight:600}}>{db.settings.year||'2025-2026'} Academic Session</span>
          <div style={{display:'flex',gap:6}}>
            {['#60a5fa','#a78bfa','#34d399'].map((c,i)=>(
              <div key={i} style={{width:6,height:6,borderRadius:'50%',background:c,animation:`lp-pulse 2s ${i*0.4}s ease-in-out infinite`}}/>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="lp-panel" style={{width:'100%',maxWidth:520,flexShrink:0,display:'flex',flexDirection:'column',background:'linear-gradient(160deg,#f0f4ff 0%,#ffffff 60%)',boxShadow:'-4px 0 40px rgba(0,32,69,0.1)',position:'relative',overflow:'hidden'}}>

        {/* Top color bar */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#1960a3,#60a5fa,#a78bfa)',zIndex:3}}/>
        {/* Bg orbs */}
        <div style={{position:'absolute',top:-80,right:-80,width:280,height:280,borderRadius:'50%',background:'rgba(25,96,163,0.05)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-60,left:-60,width:200,height:200,borderRadius:'50%',background:'rgba(167,139,250,0.06)',pointerEvents:'none'}}/>

        {/* Back button row */}
        <div className="lp-backrow" style={{...anim(0),padding:'28px 36px 0',position:'relative',zIndex:2}}>
          <button onClick={() => window.location.href = '/'}
            style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 16px 8px 8px',borderRadius:24,border:'1.5px solid rgba(25,96,163,0.18)',background:'rgba(25,96,163,0.06)',color:'#1960a3',fontSize:12,fontWeight:700,cursor:'pointer',transition:'all 200ms',fontFamily:'inherit'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(25,96,163,0.12)';e.currentTarget.style.borderColor='rgba(25,96,163,0.4)';e.currentTarget.style.transform='translateX(-2px)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(25,96,163,0.06)';e.currentTarget.style.borderColor='rgba(25,96,163,0.18)';e.currentTarget.style.transform='none';}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(25,96,163,0.3)'}}>
              <span className="material-symbols-outlined" style={{fontSize:14,color:'#fff'}}>arrow_back</span>
            </div>
            Back to School Website
          </button>
        </div>

        {/* Centered form */}
        <div className="lp-center" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 40px 32px',position:'relative',zIndex:2}}>
          <div style={{width:'100%',maxWidth:380}}>

            {/* Logo + heading */}
            <div style={{...anim(80),marginBottom:30,textAlign:'center'}}>
              <div style={{width:64,height:64,borderRadius:20,background:'linear-gradient(135deg,#002045,#1960a3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 10px 28px rgba(25,96,163,0.32)'}}>
                <span className="material-symbols-outlined" style={{fontSize:30,color:'#fff',fontVariationSettings:"'FILL' 1"}}>school</span>
              </div>
              <h2 style={{fontSize:26,fontWeight:900,color:'#0f172a',letterSpacing:'-0.02em',margin:'0 0 5px',fontFamily:'Manrope,sans-serif'}}>Welcome Back</h2>
              <p style={{fontSize:13,color:'#64748b',margin:0}}>Sign in to access the school portal</p>
            </div>

            {/* Role cards */}
            <div className="lp-role-grid" style={{...anim(140),display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:26}}>
              {[
                {id:'admin',  icon:'admin_panel_settings', label:'Admin',   color:'#1960a3', grad:'linear-gradient(135deg,#1960a3,#3b82f6)'},
                {id:'teacher',icon:'school',               label:'Teacher', color:'#059669', grad:'linear-gradient(135deg,#059669,#10b981)'},
                {id:'parent', icon:'family_restroom',      label:'Parent',  color:'#7c3aed', grad:'linear-gradient(135deg,#7c3aed,#8b5cf6)'},
              ].map(r=>(
                <button key={r.id} onClick={()=>{setRole(r.id);setErr('');setU('');setP('');}}
                  style={{padding:'14px 8px',borderRadius:16,border:`2px solid ${role===r.id ? r.color : '#e2e8f0'}`,
                    background: role===r.id ? r.grad : '#fff',
                    boxShadow: role===r.id ? `0 6px 20px ${r.color}35` : '0 1px 4px rgba(0,0,0,0.05)',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',
                    transition:'all 220ms',fontFamily:'inherit',
                    transform: role===r.id ? 'translateY(-2px)' : 'none',
                  }}>
                  <div style={{width:38,height:38,borderRadius:12,background: role===r.id ? 'rgba(255,255,255,0.22)' : r.color+'12',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 200ms'}}>
                    <span className="material-symbols-outlined" style={{fontSize:22,color: role===r.id ? '#fff' : r.color,fontVariationSettings: role===r.id ? "'FILL' 1" : "'FILL' 0"}}>{r.icon}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color: role===r.id ? '#fff' : '#64748b',letterSpacing:'0.01em'}}>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Error */}
            {err&&(
              <div style={{display:'flex',alignItems:'center',gap:8,background:'#fef2f2',color:'#dc2626',borderRadius:12,padding:'11px 14px',fontSize:12,fontWeight:600,marginBottom:16,border:'1px solid #fecaca',animation:'lp-shake 400ms ease,lp-slidein 300ms ease'}}>
                <span className="material-symbols-outlined" style={{fontSize:16,flexShrink:0}}>error</span>{err}
              </div>
            )}

            {/* Inputs */}
            <div style={{...anim(200),display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569',marginBottom:7,letterSpacing:'0.01em'}}>{role==='admin'?'Username':role==='teacher'?'Teacher Username':'Parent Username'}</label>
                <div style={{position:'relative'}}>
                  <span className="material-symbols-outlined" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'#94a3b8',pointerEvents:'none'}}>person</span>
                  <input value={u} onChange={e=>setU(e.target.value)} placeholder={role==='admin'?'admin':role==='teacher'?'teacher.username':'parent.username'}
                    autoComplete="off" onKeyDown={e=>e.key==='Enter'&&document.getElementById('lp-pw').focus()}
                    className="lp-input"
                    style={{width:'100%',paddingLeft:42,paddingRight:14,paddingTop:12,paddingBottom:12,borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#0f172a',outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569',marginBottom:7,letterSpacing:'0.01em'}}>Password</label>
                <div style={{position:'relative'}}>
                  <span className="material-symbols-outlined" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'#94a3b8',pointerEvents:'none'}}>lock</span>
                  <input id="lp-pw" value={p} onChange={e=>setP(e.target.value)} type={showPw?'text':'password'} placeholder="••••••••"
                    onKeyDown={e=>e.key==='Enter'&&signin()}
                    className="lp-input"
                    style={{width:'100%',paddingLeft:42,paddingRight:44,paddingTop:12,paddingBottom:12,borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#0f172a',outline:'none',boxSizing:'border-box'}}/>
                  <button onClick={()=>setShowPw(v=>!v)} tabIndex={-1}
                    style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:2,display:'flex',alignItems:'center'}}>
                    <span className="material-symbols-outlined" style={{fontSize:18}}>{showPw?'visibility_off':'visibility'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sign in */}
            <div style={anim(260)}>
              <button onClick={signin} disabled={loading} className="lp-btn"
                style={{width:'100%',padding:'14px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#002045 0%,#1960a3 100%)',color:'#fff',fontWeight:800,fontSize:14,cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 20px rgba(0,32,69,0.28)',transition:'all 200ms',fontFamily:'Manrope,sans-serif',opacity:loading?0.8:1}}>
                {loading
                  ?<><span className="material-symbols-outlined" style={{fontSize:18,animation:'lp-spin 700ms linear infinite'}}>progress_activity</span>Signing in…</>
                  :<><span className="material-symbols-outlined" style={{fontSize:18}}>login</span>Sign In</>}
              </button>
            </div>



          </div>
        </div>

        {/* Footer */}
        <div className="lp-footer" style={{padding:'14px 36px',borderTop:'1px solid #f1f5f9',textAlign:'center',position:'relative',zIndex:2}}>
          <span style={{fontSize:11,color:'#cbd5e1'}}>© 2026 Lord Krishna Public School, Mathura</span>
        </div>
      </div>
      <Toast />
    </div>
  );
}const NAV = [
  { sec:'Main', items:[{ id:'dash', icon:'dashboard', label:'Dashboard' }] },
  { sec:'People', items:[{ id:'adm', icon:'how_to_reg', label:'New Admissions' }, { id:'stu', icon:'group', label:'Students' }, { id:'tea', icon:'record_voice_over', label:'Teachers' }] },
  { sec:'Academics', items:[{ id:'cls', icon:'class', label:'Classes' }, { id:'tt', icon:'schedule', label:'Timetable' }, { id:'att', icon:'fact_check', label:'Attendance' }, { id:'exam', icon:'quiz', label:'Exams & Grades' }, { id:'cal', icon:'calendar_month', label:'Academic Calendar' }] },
  { sec:'Finance', items:[{ id:'fee', icon:'payments', label:'Finance' }] },
  { sec:'Tools', items:[{ id:'docs', icon:'description', label:'Documents' }, { id:'rep', icon:'summarize', label:'Reports' }, { id:'set', icon:'settings', label:'Settings' }] },
  { sec:'Communication', items:[{ id:'notices', icon:'campaign', label:'Notice Board' }, { id:'msg', icon:'mail', label:'Messages' }] },
];

// ── Indian Holidays Dataset (2024-2027) ──────────────────────────
const INDIA_HOLIDAYS = [
  // 2024
  {dt:'2024-01-14',title:'Makar Sankranti / Pongal',type:'holiday',note:'Harvest festival'},
  {dt:'2024-01-22',title:'Ram Mandir Pran Pratishtha',type:'holiday',note:'Ayodhya consecration'},
  {dt:'2024-01-26',title:'Republic Day',type:'holiday',note:'National Holiday'},
  {dt:'2024-02-14',title:'Valentine\'s Day',type:'event',note:''},
  {dt:'2024-03-08',title:'Maha Shivaratri',type:'holiday',note:'Hindu festival'},
  {dt:'2024-03-25',title:'Holi',type:'holiday',note:'Festival of colours'},
  {dt:'2024-03-29',title:'Good Friday',type:'holiday',note:'Christian holiday'},
  {dt:'2024-04-09',title:'Ugadi / Gudi Padwa',type:'holiday',note:'New Year festival'},
  {dt:'2024-04-11',title:'Id-ul-Fitr (Eid)',type:'holiday',note:'End of Ramadan'},
  {dt:'2024-04-14',title:'Dr. Ambedkar Jayanti',type:'holiday',note:'National holiday'},
  {dt:'2024-04-17',title:'Ram Navami',type:'holiday',note:'Hindu festival'},
  {dt:'2024-04-21',title:'Mahavir Jayanti',type:'holiday',note:'Jain festival'},
  {dt:'2024-05-23',title:'Buddha Purnima',type:'holiday',note:'Buddhist festival'},
  {dt:'2024-06-17',title:'Eid ul-Adha (Bakrid)',type:'holiday',note:'Islamic festival'},
  {dt:'2024-07-17',title:'Muharram',type:'holiday',note:'Islamic New Year'},
  {dt:'2024-08-15',title:'Independence Day',type:'holiday',note:'National Holiday'},
  {dt:'2024-08-26',title:'Janmashtami',type:'holiday',note:'Krishna\'s birthday'},
  {dt:'2024-09-07',title:'Ganesh Chaturthi',type:'holiday',note:'Hindu festival'},
  {dt:'2024-09-16',title:'Milad-un-Nabi',type:'holiday',note:'Prophet\'s birthday'},
  {dt:'2024-10-02',title:'Gandhi Jayanti',type:'holiday',note:'National Holiday'},
  {dt:'2024-10-02',title:'Navratri begins',type:'event',note:'9-day festival'},
  {dt:'2024-10-12',title:'Dussehra (Vijayadashami)',type:'holiday',note:'Hindu festival'},
  {dt:'2024-10-31',title:'Halloween',type:'event',note:''},
  {dt:'2024-11-01',title:'Diwali',type:'holiday',note:'Festival of lights'},
  {dt:'2024-11-02',title:'Govardhan Puja',type:'holiday',note:'Hindu festival'},
  {dt:'2024-11-03',title:'Bhai Dooj',type:'holiday',note:'Hindu festival'},
  {dt:'2024-11-15',title:'Guru Nanak Jayanti',type:'holiday',note:'Sikh festival'},
  {dt:'2024-12-25',title:'Christmas Day',type:'holiday',note:'Christian holiday'},
  {dt:'2024-12-31',title:'New Year\'s Eve',type:'event',note:''},
  // 2025
  {dt:'2025-01-01',title:'New Year\'s Day',type:'holiday',note:''},
  {dt:'2025-01-14',title:'Makar Sankranti / Pongal',type:'holiday',note:'Harvest festival'},
  {dt:'2025-01-23',title:'Netaji Subhas Chandra Bose Jayanti',type:'holiday',note:''},
  {dt:'2025-01-26',title:'Republic Day',type:'holiday',note:'National Holiday'},
  {dt:'2025-02-02',title:'Basant Panchami',type:'holiday',note:'Saraswati Puja'},
  {dt:'2025-02-12',title:'Maha Shivaratri',type:'holiday',note:'Hindu festival'},
  {dt:'2025-02-14',title:'Valentine\'s Day',type:'event',note:''},
  {dt:'2025-02-26',title:'Holi (Holika Dahan)',type:'holiday',note:'Eve of Holi'},
  {dt:'2025-03-14',title:'Holi',type:'holiday',note:'Festival of colours'},
  {dt:'2025-03-30',title:'Ugadi / Gudi Padwa',type:'holiday',note:'New Year festival'},
  {dt:'2025-03-31',title:'Id-ul-Fitr (Eid)',type:'holiday',note:'End of Ramadan'},
  {dt:'2025-04-06',title:'Ram Navami',type:'holiday',note:'Hindu festival'},
  {dt:'2025-04-10',title:'Mahavir Jayanti',type:'holiday',note:'Jain festival'},
  {dt:'2025-04-14',title:'Dr. Ambedkar Jayanti',type:'holiday',note:'National holiday'},
  {dt:'2025-04-14',title:'Baisakhi / Tamil New Year',type:'holiday',note:'Harvest festival'},
  {dt:'2025-04-18',title:'Good Friday',type:'holiday',note:'Christian holiday'},
  {dt:'2025-04-20',title:'Easter Sunday',type:'holiday',note:'Christian holiday'},
  {dt:'2025-05-12',title:'Buddha Purnima',type:'holiday',note:'Buddhist festival'},
  {dt:'2025-06-07',title:'Eid ul-Adha (Bakrid)',type:'holiday',note:'Islamic festival'},
  {dt:'2025-06-27',title:'Muharram',type:'holiday',note:'Islamic New Year'},
  {dt:'2025-07-10',title:'Guru Purnima',type:'event',note:''},
  {dt:'2025-08-09',title:'Raksha Bandhan',type:'holiday',note:'Hindu festival'},
  {dt:'2025-08-15',title:'Independence Day',type:'holiday',note:'National Holiday'},
  {dt:'2025-08-16',title:'Janmashtami',type:'holiday',note:'Krishna\'s birthday'},
  {dt:'2025-08-27',title:'Ganesh Chaturthi',type:'holiday',note:'Hindu festival'},
  {dt:'2025-09-05',title:'Milad-un-Nabi',type:'holiday',note:'Prophet\'s birthday'},
  {dt:'2025-09-05',title:'Teachers\' Day',type:'event',note:'Dr. Radhakrishnan\'s birthday'},
  {dt:'2025-10-02',title:'Gandhi Jayanti',type:'holiday',note:'National Holiday'},
  {dt:'2025-10-02',title:'Navratri begins',type:'event',note:'9-day festival'},
  {dt:'2025-10-02',title:'Dussehra (Vijayadashami)',type:'holiday',note:'Hindu festival'},
  {dt:'2025-10-20',title:'Diwali',type:'holiday',note:'Festival of lights'},
  {dt:'2025-10-21',title:'Govardhan Puja',type:'holiday',note:'Hindu festival'},
  {dt:'2025-10-22',title:'Bhai Dooj',type:'holiday',note:'Hindu festival'},
  {dt:'2025-10-31',title:'Halloween',type:'event',note:''},
  {dt:'2025-11-05',title:'Guru Nanak Jayanti',type:'holiday',note:'Sikh festival'},
  {dt:'2025-11-14',title:'Children\'s Day',type:'event',note:'Nehru\'s birthday'},
  {dt:'2025-12-25',title:'Christmas Day',type:'holiday',note:'Christian holiday'},
  {dt:'2025-12-31',title:'New Year\'s Eve',type:'event',note:''},
  // 2026
  {dt:'2026-01-01',title:'New Year\'s Day',type:'holiday',note:''},
  {dt:'2026-01-14',title:'Makar Sankranti / Pongal',type:'holiday',note:'Harvest festival'},
  {dt:'2026-01-26',title:'Republic Day',type:'holiday',note:'National Holiday'},
  {dt:'2026-02-01',title:'Maha Shivaratri',type:'holiday',note:'Hindu festival'},
  {dt:'2026-02-14',title:'Valentine\'s Day',type:'event',note:''},
  {dt:'2026-03-03',title:'Holi',type:'holiday',note:'Festival of colours'},
  {dt:'2026-03-19',title:'Ugadi / Gudi Padwa',type:'holiday',note:'New Year festival'},
  {dt:'2026-03-20',title:'Id-ul-Fitr (Eid)',type:'holiday',note:'End of Ramadan'},
  {dt:'2026-03-26',title:'Ram Navami',type:'holiday',note:'Hindu festival'},
  {dt:'2026-03-31',title:'Mahavir Jayanti',type:'holiday',note:'Jain festival'},
  {dt:'2026-04-03',title:'Good Friday',type:'holiday',note:'Christian holiday'},
  {dt:'2026-04-05',title:'Easter Sunday',type:'holiday',note:'Christian holiday'},
  {dt:'2026-04-14',title:'Dr. Ambedkar Jayanti',type:'holiday',note:'National holiday'},
  {dt:'2026-04-14',title:'Baisakhi',type:'holiday',note:'Harvest festival'},
  {dt:'2026-05-01',title:'Buddha Purnima',type:'holiday',note:'Buddhist festival'},
  {dt:'2026-05-27',title:'Eid ul-Adha (Bakrid)',type:'holiday',note:'Islamic festival'},
  {dt:'2026-08-15',title:'Independence Day',type:'holiday',note:'National Holiday'},
  {dt:'2026-09-05',title:'Teachers\' Day',type:'event',note:'Dr. Radhakrishnan\'s birthday'},
  {dt:'2026-10-02',title:'Gandhi Jayanti',type:'holiday',note:'National Holiday'},
  {dt:'2026-11-08',title:'Diwali',type:'holiday',note:'Festival of lights'},
  {dt:'2026-11-14',title:'Children\'s Day',type:'event',note:'Nehru\'s birthday'},
  {dt:'2026-12-25',title:'Christmas Day',type:'holiday',note:'Christian holiday'},
  // 2027
  {dt:'2027-01-01',title:'New Year\'s Day',type:'holiday',note:''},
  {dt:'2027-01-26',title:'Republic Day',type:'holiday',note:'National Holiday'},
  {dt:'2027-08-15',title:'Independence Day',type:'holiday',note:'National Holiday'},
  {dt:'2027-10-02',title:'Gandhi Jayanti',type:'holiday',note:'National Holiday'},
  {dt:'2027-12-25',title:'Christmas Day',type:'holiday',note:'Christian holiday'},
];

function AcademicCalendar({ db, save }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evForm, setEvForm] = useState({ title:'', dt:'', type:'academic', note:'' });
  const [selectedDay, setSelectedDay] = useState(null); // { d, evs }
  const ef = k => v => setEvForm(f => ({...f, [k]: v}));

  const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WDAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const today = now.getDate(), todayM = now.getMonth(), todayY = now.getFullYear();

  // Merge: built-in holidays + db.events + db.exams
  const allEvents = [
    ...INDIA_HOLIDAYS.map(h => ({ ...h, id: 'IH_'+h.dt+'_'+h.title.slice(0,8) })),
    ...(db.events||[]),
    ...db.exams.filter(e => e.dt).map(e => ({
      id: e.id, title: e.name+(e.su?' – '+e.su:''), dt: e.dt, type:'exam', cls: e.cls,
      note: e.cls ? 'Class: '+e.cls : ''
    })),
  ];

  const saveEvent = () => {
    if (!evForm.title?.trim() || !evForm.dt) { toast('Title and date required','err'); return; }
    save({...db, events:[...(db.events||[]), { id:'EV'+uid(), ...evForm }]});
    setEvForm({ title:'', dt:'', type:'academic', note:'' });
    setShowAddEvent(false);
    toast('Event added');
  };
  const delEvent = id => { save({...db, events:(db.events||[]).filter(e=>e.id!==id)}); };

  // Grid
  const offset      = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

  const monthEvents = allEvents.filter(e => {
    const d = new Date(e.dt);
    return d.getFullYear()===viewYear && d.getMonth()===viewMonth;
  });
  const eventsByDay = {};
  monthEvents.forEach(e => {
    const d = new Date(e.dt).getDate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const upcoming = allEvents
    .filter(e => new Date(e.dt) >= new Date(now.toDateString()))
    .sort((a,b) => new Date(a.dt)-new Date(b.dt))
    .slice(0,8);

  const isToday = d => d===today && viewMonth===todayM && viewYear===todayY;

  const typeStyle = type => {
    if (type==='exam')    return { bg:'bg-error-container/30',       text:'text-on-error-container',    dot:'bg-error',     label:'Examination',    icon:'quiz' };
    if (type==='holiday') return { bg:'bg-[#ffdeaa]/50',             text:'text-[#5f4100]',             dot:'bg-[#f8bc4b]', label:'Holiday',        icon:'celebration' };
    if (type==='event')   return { bg:'bg-secondary-container/20',   text:'text-on-secondary-container',dot:'bg-secondary', label:'Event',          icon:'event' };
    return                       { bg:'bg-primary/5',                text:'text-primary',               dot:'bg-primary',   label:'Academic',       icon:'school' };
  };

  const fmtDate = dt => {
    const d = new Date(dt);
    return { day:d.getDate(), mon:MONTHS_S[d.getMonth()], dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] };
  };

  const openDay = (d, evs) => {
    const dtStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    setEvForm(f => ({...f, dt: dtStr}));
    setSelectedDay({ d, evs, dtStr });
  };


  return (
    <div className="space-y-0 -m-6">
      {/* Header */}
      <div className="px-10 pt-10 pb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-primary font-bold tracking-[0.15em] text-xs uppercase mb-2">Institutional Planning</p>
          <h1 className="text-5xl font-extrabold text-on-surface tracking-tight leading-none mb-2 font-headline">{MONTHS[viewMonth]} {viewYear}</h1>
          <p className="text-on-surface-variant text-base">Academic events, examinations, and public holidays at a glance.</p>
        </div>
        <div className="flex flex-col gap-3 items-end">
          {/* Year stepper */}
          <div className="flex items-center gap-2 bg-surface-container rounded-xl p-1 shadow-sm">
            <button onClick={() => setViewYear(y=>y-1)} className="px-3 py-2 rounded-lg text-slate-500 hover:text-primary hover:bg-surface-container-lowest transition-all border-0 bg-transparent cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="px-3 text-sm font-black text-primary min-w-[52px] text-center">{viewYear}</span>
            <button onClick={() => setViewYear(y=>y+1)} className="px-3 py-2 rounded-lg text-slate-500 hover:text-primary hover:bg-surface-container-lowest transition-all border-0 bg-transparent cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          {/* Month pills */}
          <div className="flex flex-wrap gap-1 justify-end max-w-sm">
            {MONTHS_S.map((m,i) => (
              <button key={i} onClick={() => setViewMonth(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer
                  ${viewMonth===i ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary'}`}>
                {m}
              </button>
            ))}
            <button onClick={() => { setViewMonth(todayM); setViewYear(todayY); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high text-primary hover:bg-surface-container-lowest transition-all border-0 cursor-pointer">
              Today
            </button>
          </div>
          <button onClick={() => { setEvForm({title:'',dt:'',type:'academic',note:''}); setShowAddEvent(true); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all border-0 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Event
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="px-10 pb-10 grid grid-cols-12 gap-8">

        {/* Main Calendar */}
        <div className="col-span-12 xl:col-span-9 bg-surface-container-low rounded-3xl p-8 shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-4">
            {WDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-black tracking-widest text-on-surface-variant uppercase py-1">{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Prev month filler */}
            {Array.from({length:offset}).map((_,i) => (
              <div key={'p'+i} className="aspect-square p-2 rounded-2xl opacity-20 bg-surface-container-high/50 flex flex-col">
                <span className="text-xs font-bold text-slate-400">{daysInPrev-offset+i+1}</span>
              </div>
            ))}
            {/* Current month */}
            {Array.from({length:daysInMonth}).map((_,i) => {
              const d = i+1;
              const evs = eventsByDay[d] || [];
              const isWknd = [0,6].includes(new Date(viewYear,viewMonth,d).getDay());
              const todayCell = isToday(d);
              const domEv = evs[0];
              const ts = domEv ? typeStyle(domEv.type) : null;
              return (
                <div key={d}
                  onClick={() => openDay(d, evs)}
                  className={`aspect-square p-2.5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md
                    ${todayCell ? 'bg-primary-container ring-4 ring-primary/15 shadow-lg' :
                      ts ? ts.bg :
                      isWknd ? 'bg-surface-container' :
                      'bg-surface-container-lowest shadow-sm hover:ring-2 hover:ring-primary/10'}`}>
                  <span className={`text-sm font-black leading-none
                    ${todayCell ? 'text-white' : ts ? ts.text : isWknd ? 'text-slate-400' : 'text-on-surface'}`}>
                    {String(d).padStart(2,'0')}
                  </span>
                  <div className="space-y-0.5">
                    {todayCell && <span className="block text-[8px] font-bold uppercase tracking-widest text-white/70">Today</span>}
                    {evs.slice(0,1).map(ev => (
                      <span key={ev.id} className={`block text-[8px] font-bold leading-tight truncate ${todayCell?'text-white/90':ts?.text}`}>
                        {ev.title}
                      </span>
                    ))}
                    {evs.length>1 && (
                      <span className={`block text-[8px] font-bold ${todayCell?'text-white/60':ts?.text+' opacity-60'}`}>
                        +{evs.length-1} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-5">

          {/* Day Detail Panel — shown when a date is clicked */}
          {selectedDay ? (
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border-l-4 border-primary">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{MONTHS[viewMonth]} {viewYear}</p>
                  <p className="text-3xl font-extrabold text-primary font-headline">{String(selectedDay.d).padStart(2,'0')}</p>
                  <p className="text-xs text-on-surface-variant font-medium">
                    {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(viewYear,viewMonth,selectedDay.d).getDay()]}
                  </p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors border-0 bg-transparent cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              {selectedDay.evs.length ? (
                <div className="space-y-3">
                  {selectedDay.evs.map(ev => {
                    const ts = typeStyle(ev.type);
                    return (
                      <div key={ev.id} className={`p-3 rounded-xl ${ts.bg}`}>
                        <div className="flex items-start gap-2">
                          <span className={`material-symbols-outlined text-[16px] mt-0.5 ${ts.text}`}>{ts.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-tight ${ts.text}`}>{ev.title}</p>
                            {ev.note && <p className="text-[10px] text-on-surface-variant mt-0.5">{ev.note}</p>}
                            {ev.cls && <p className="text-[10px] text-on-surface-variant">Class: {ev.cls}</p>}
                            <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${ts.bg} ${ts.text} border border-current/20`}>{ts.label}</span>
                          </div>
                          {!ev.id?.startsWith('IH_') && ev.type!=='exam' && (
                            <button onClick={() => { delEvent(ev.id); setSelectedDay(s=>({...s,evs:s.evs.filter(e=>e.id!==ev.id)})); }}
                              className="p-1 rounded hover:bg-error-container text-on-surface-variant hover:text-on-error-container transition-colors border-0 bg-transparent cursor-pointer flex-shrink-0">
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant opacity-30 block mb-1">event_available</span>
                  <p className="text-xs text-on-surface-variant">No events on this day</p>
                </div>
              )}
              <button onClick={() => { setEvForm(f=>({...f,dt:selectedDay.dtStr})); setShowAddEvent(true); }}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors border-0 cursor-pointer">
                <span className="material-symbols-outlined text-[14px]">add</span>
                Add event on this day
              </button>
            </div>
          ) : (
            /* Legend — shown when no day selected */
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-5">Calendar Key</h3>
              <div className="space-y-3 mb-5">
                {[{type:'academic',label:'Academic Events'},{type:'exam',label:'Examinations'},{type:'holiday',label:'Public Holidays'},{type:'event',label:'Events & Festivals'}].map(({type,label}) => {
                  const ts = typeStyle(type);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${ts.bg} border-2 ${ts.text} border-current`}></div>
                      <span className="text-sm font-medium text-on-surface">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-surface-container-high pt-4">
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[12px]">touch_app</span>
                  Click any date to see details
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-[12px]">public</span>
                  Indian public holidays included
                </div>
              </div>
            </div>
          )}

          {/* This Month summary */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">This Month</h3>
            <div className="space-y-2">
              {['holiday','exam','event','academic'].map(t => {
                const cnt = monthEvents.filter(e=>e.type===t).length;
                if (!cnt) return null;
                const ts = typeStyle(t);
                return (
                  <div key={t} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${ts.dot}`}></div>
                      <span className="text-on-surface-variant">{ts.label}</span>
                    </div>
                    <span className="font-bold text-primary">{cnt}</span>
                  </div>
                );
              })}
              {!monthEvents.length && <p className="text-xs text-on-surface-variant">No events this month</p>}
            </div>
          </div>

          {/* Upcoming */}
          <div className="flex-1">
            <h3 className="text-lg font-extrabold font-headline text-on-surface mb-4">Upcoming</h3>
            <div className="space-y-3">
              {upcoming.map(ev => {
                const {day,mon,dow} = fmtDate(ev.dt);
                const ts = typeStyle(ev.type);
                return (
                  <div key={ev.id+ev.dt}
                    onClick={() => { const d=new Date(ev.dt); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); openDay(d.getDate(), allEvents.filter(e=>e.dt===ev.dt)); }}
                    className="bg-surface-container-lowest p-4 rounded-2xl flex gap-3 items-start shadow-sm hover:translate-x-1 transition-transform cursor-pointer group">
                    <div className={`flex flex-col items-center justify-center min-w-[46px] py-2 rounded-xl bg-surface-container-low group-hover:${ts.bg} transition-colors`}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{mon}</span>
                      <span className="text-xl font-black text-primary leading-none">{day}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{dow}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface leading-tight mb-1 truncate">{ev.title}</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${ts.dot}`}></div>
                        <span className="text-[10px] text-on-surface-variant font-medium">{ts.label}{ev.cls?' • '+ev.cls:''}</span>
                      </div>
                      {ev.note && <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">{ev.note}</p>}
                    </div>
                  </div>
                );
              })}
              {!upcoming.length && (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">event_available</span>
                  <p className="text-xs font-medium">No upcoming events</p>
                </div>
              )}
            </div>

            {/* Add Event CTA */}
            <div className="mt-6 p-6 bg-gradient-to-br from-primary to-primary-container rounded-3xl text-white relative overflow-hidden cursor-pointer group"
              onClick={() => { setEvForm({title:'',dt:'',type:'academic',note:''}); setShowAddEvent(true); }}>
              <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                <span className="material-symbols-outlined text-[100px]">event</span>
              </div>
              <h4 className="text-base font-bold mb-1 relative z-10">Add Custom Event</h4>
              <p className="text-xs opacity-75 mb-4 relative z-10 leading-relaxed">Schedule holidays, parent meetings, or academic milestones.</p>
              <button className="bg-white text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-transform relative z-10 border-0 cursor-pointer">
                Launch Scheduler
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal open={showAddEvent} onClose={() => setShowAddEvent(false)} title="Add Academic Event">
        <Grid>
          <Span><Field label="Event Title *"><Input value={evForm.title} onChange={ef('title')} placeholder="Annual Sports Day"/></Field></Span>
          <Field label="Date *"><Input type="date" value={evForm.dt} onChange={ef('dt')}/></Field>
          <Field label="Type">
            <Select value={evForm.type} onChange={ef('type')}>
              <option value="academic">Academic</option>
              <option value="exam">Examination</option>
              <option value="holiday">Holiday</option>
              <option value="event">Event / Festival</option>
            </Select>
          </Field>
          <Span><Field label="Note"><Input value={evForm.note} onChange={ef('note')} placeholder="Optional details..."/></Field></Span>
        </Grid>
        <ModalFooter>
          <Btn onClick={() => setShowAddEvent(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={saveEvent}>Add Event</Btn>
        </ModalFooter>
      </Modal>
    </div>
  );
}


function SidebarCalendar({ db, setPage }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const today = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const DAYS = ['S','M','T','W','T','F','S'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Exams on each date this month
  const examDates = new Set(
    db.exams
      .filter(e => e.dt && new Date(e.dt).getFullYear() === viewYear && new Date(e.dt).getMonth() === viewMonth)
      .map(e => new Date(e.dt).getDate())
  );

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = d => d === today && viewMonth === todayMonth && viewYear === todayYear;
  const hasExam = d => examDates.has(d);

  return (
    <div className="mx-3 mb-3 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container-high">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors border-0 bg-transparent cursor-pointer">
          <span className="material-symbols-outlined text-[14px] text-slate-500">chevron_left</span>
        </button>
        <button onClick={() => { setViewMonth(todayMonth); setViewYear(todayYear); }}
          className="text-xs font-black text-primary tracking-wide border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity">
          {MONTHS[viewMonth]} {viewYear}
        </button>
        <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors border-0 bg-transparent cursor-pointer">
          <span className="material-symbols-outlined text-[14px] text-slate-500">chevron_right</span>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-black text-slate-400 uppercase py-0.5">{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => (
          <div key={i} className="flex items-center justify-center">
            {d ? (
              <div className={`relative w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold cursor-pointer transition-all
                ${isToday(d) ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'hover:bg-surface-container text-on-surface'}`}
                onClick={() => hasExam(d) && setPage('exam')}>
                {d}
                {hasExam(d) && !isToday(d) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error"></span>
                )}
                {hasExam(d) && isToday(d) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"></span>
                )}
              </div>
            ) : <div className="w-7 h-7" />}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-error"></div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Exam</span>
        </div>
      </div>
    </div>
  );
}

const Sidebar = React.memo(function Sidebar({ page, setPage, user, onLogout, isMobile = false, mobileOpen = false, onMobileClose = () => {} }) {
  const ref = React.useRef(null);
  const open = React.useRef(false);

  const expand = () => {
    if (isMobile) return;
    if (open.current) return;
    open.current = true;
    const el = ref.current; if (!el) return;
    el.style.width = '230px';
    el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='1'; n.style.maxWidth='180px'; });
    el.querySelectorAll('.sb-sec').forEach(n => { n.style.opacity='1'; n.style.maxHeight='24px'; });
    el.querySelectorAll('.sb-btn').forEach(n => { n.style.justifyContent='flex-start'; n.style.padding='10px 12px'; });
    el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='1'; n.style.maxWidth='160px'; });
    el.querySelectorAll('.sb-active-pill').forEach(n => { n.style.opacity='1'; });
  };

  const collapse = () => {
    if (isMobile) return;
    if (!open.current) return;
    open.current = false;
    const el = ref.current; if (!el) return;
    el.style.width = '60px';
    el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='0'; n.style.maxWidth='0'; });
    el.querySelectorAll('.sb-sec').forEach(n => { n.style.opacity='0'; n.style.maxHeight='0'; });
    el.querySelectorAll('.sb-btn').forEach(n => { n.style.justifyContent='center'; n.style.padding='10px 0'; });
    el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='0'; n.style.maxWidth='0'; });
    el.querySelectorAll('.sb-active-pill').forEach(n => { n.style.opacity='0'; });
  };

  // section accent colors
  const secColor = { Main:'#63b3ff', People:'#86efac', Academics:'#fbbf24', Finance:'#f9a8d4', Tools:'#c4b5fd' };

  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    if (isMobile) {
      // On mobile, drawer is fully expanded when opened.
      el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity = '1'; n.style.maxWidth = '180px'; });
      el.querySelectorAll('.sb-sec').forEach(n => { n.style.opacity = '1'; n.style.maxHeight = '24px'; });
      el.querySelectorAll('.sb-btn').forEach(n => { n.style.justifyContent = 'flex-start'; n.style.padding = '10px 12px'; });
      el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity = '1'; n.style.maxWidth = '160px'; });
      el.querySelectorAll('.sb-active-pill').forEach(n => { n.style.opacity = '1'; });
      open.current = true;
      return;
    }
    // Reset desktop default collapsed state.
    collapse();
  }, [isMobile]);

  return (
    <aside ref={ref} onMouseEnter={isMobile ? undefined : expand} onMouseLeave={isMobile ? undefined : collapse}
      style={{
        width: isMobile ? 230 : 60, flexShrink:0, zIndex: isMobile ? 1200 : 50, overflow:'hidden',
        display:'flex', flexDirection:'column',
        position: isMobile ? 'fixed' : 'relative',
        left: 0, top: isMobile ? 0 : undefined, bottom: isMobile ? 0 : undefined,
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
        transition: isMobile ? 'transform 220ms ease' : 'width 260ms cubic-bezier(0.4,0,0.2,1)',
        backgroundColor:'#1a3a5c',
        backgroundImage:`
          radial-gradient(ellipse at 0% 0%, rgba(99,179,255,0.12) 0%, transparent 60%),
          radial-gradient(ellipse at 100% 100%, rgba(99,102,241,0.1) 0%, transparent 60%),
          url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")
        `,
        backgroundSize:'auto,auto,24px 24px',
        boxShadow:'4px 0 20px rgba(0,20,60,0.18)',
      }}>

      {/* Logo row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,height:64,flexShrink:0,
        padding:'0 13px',
        borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <img src={LOGO_SRC} alt="LKPS" style={{width:34,height:34,minWidth:34,maxWidth:34,objectFit:'contain',flexShrink:0,flexGrow:0,
          filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.4))'}}
          onError={e=>e.target.style.display='none'}/>
        <div className="sb-label" style={{opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 220ms,max-width 260ms',whiteSpace:'nowrap',flexShrink:0}}>
          <div style={{color:'#fff',fontWeight:900,fontSize:15,fontFamily:'Manrope,sans-serif',letterSpacing:'0.06em'}}>LKPS</div>
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',marginTop:1}}>Admin Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'8px 6px 0',scrollbarWidth:'none'}}>
        <style>{`aside::-webkit-scrollbar{display:none}`}</style>
        {NAV.map((g,gi) => (
          <div key={g.sec} style={{marginBottom:4}}>
            {/* section label */}
            <div className="sb-sec" style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'8px 10px 4px',
              opacity:0,maxHeight:0,overflow:'hidden',
              transition:'opacity 200ms,max-height 240ms',
            }}>
              <div style={{height:1,width:10,background:secColor[g.sec]||'rgba(255,255,255,0.2)',borderRadius:1,flexShrink:0}}/>
              <span style={{color:secColor[g.sec]||'rgba(255,255,255,0.3)',fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.12em',whiteSpace:'nowrap'}}>{g.sec}</span>
            </div>

            {g.items.map(it => {
              const active = page === it.id;
              return (
                <button key={it.id} onClick={() => { setPage(it.id); if (isMobile) onMobileClose(); }}
                  title={it.label}
                  className="sb-btn"
                  style={{
                    position:'relative',display:'flex',alignItems:'center',width:'100%',
                    border:'none',borderRadius:10,cursor:'pointer',marginBottom:2,
                    padding:'10px 0',justifyContent:'center',gap:0,
                    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontSize:13,fontWeight:600,fontFamily:'Manrope,sans-serif',
                    transition:'background 180ms,color 180ms,transform 120ms',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
                    minHeight:40,
                  }}
                  onMouseEnter={e => { if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.85)'; e.currentTarget.style.transform='translateX(2px)'; }}}
                  onMouseLeave={e => { if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.5)'; e.currentTarget.style.transform='translateX(0)'; }}}
                >
                  {/* active left bar — absolutely positioned, never affects flex centering */}
                  {active && <div style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:'0 3px 3px 0',background:secColor[g.sec]||'#63b3ff',boxShadow:`0 0 8px ${secColor[g.sec]||'#63b3ff'}88`,pointerEvents:'none'}}/>}
                  {/* icon in a fixed 44px centered slot — always stays centered when collapsed */}
                  <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:44,minWidth:44,flexShrink:0,flexGrow:0}}>
                    <span className="material-symbols-outlined" style={{
                      fontSize:20,lineHeight:1,
                      color: active ? (secColor[g.sec]||'#63b3ff') : 'inherit',
                      filter: active ? `drop-shadow(0 0 4px ${secColor[g.sec]||'#63b3ff'}88)` : 'none',
                      transition:'color 180ms,filter 180ms',
                    }}>{it.icon}</span>
                  </span>
                  {/* label */}
                  <span className="sb-label" style={{whiteSpace:'nowrap',opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 240ms',textAlign:'left',flex:1}}>{it.label}</span>
                  {/* active pill badge */}
                  <span className="sb-active-pill" style={{
                    display: active ? 'block' : 'none',
                    marginRight:10,
                    width:6,height:6,borderRadius:'50%',flexShrink:0,
                    background:secColor[g.sec]||'#63b3ff',
                    boxShadow:`0 0 6px ${secColor[g.sec]||'#63b3ff'}`,
                    opacity:0,transition:'opacity 200ms',
                  }}/>
                </button>
              );
            })}

            {/* section divider */}
            {gi < NAV.length-1 && (
              <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'6px 8px'}}/>
            )}
          </div>
        ))}
      </nav>

    </aside>
  );
});

function GlobalSearch({ db, setPage }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = React.useMemo(() => {
    if (!q.trim() || !db) return [];
    const lq = q.toLowerCase();
    const out = [];

    // Students
    (db.students || []).filter(s =>
      `${s.fn||''} ${s.ln||''}`.toLowerCase().includes(lq) ||
      (s.cls||'').toLowerCase().includes(lq) ||
      (s.ph||'').includes(lq)
    ).slice(0,5).forEach(s => out.push({
      type:'student', icon:'person', label:`${s.fn||''} ${s.ln||''}`.trim()||'—', sub: s.cls||'—', page:'stu'
    }));

    // Teachers
    (db.teachers || []).filter(t =>
      `${t.fn||''} ${t.ln||''}`.toLowerCase().includes(lq) ||
      (t.su||'').toLowerCase().includes(lq)
    ).slice(0,3).forEach(t => out.push({
      type:'teacher', icon:'record_voice_over', label:`${t.fn||''} ${t.ln||''}`.trim()||'—', sub: t.su||'Teacher', page:'tea'
    }));

    // Pages
    const pages = [
      {id:'dash',label:'Dashboard',icon:'dashboard'},
      {id:'stu',label:'Students',icon:'person'},
      {id:'tea',label:'Teachers',icon:'record_voice_over'},
      {id:'cls',label:'Classes',icon:'class'},
      {id:'tt',label:'Timetable',icon:'schedule'},
      {id:'att',label:'Attendance',icon:'fact_check'},
      {id:'exam',label:'Exams',icon:'quiz'},
      {id:'fee',label:'Finance',icon:'payments'},
      {id:'docs',label:'Documents',icon:'description'},
      {id:'rep',label:'Reports',icon:'summarize'},
      {id:'set',label:'Settings',icon:'settings'},
      {id:'cal',label:'Calendar',icon:'calendar_month'},
    ];
    pages.filter(p => p.label.toLowerCase().includes(lq)).forEach(p => out.push({
      type:'page', icon:p.icon, label:p.label, sub:'Page', page:p.id
    }));

    return out.slice(0, 8);
  }, [q, db]);

  const go = (item) => { setPage(item.page); setQ(''); setOpen(false); };

  const typeColor = { student:'#1960a3', teacher:'#059669', page:'#cb9524' };

  return (
    <div className="gs-root" ref={ref} style={{position:'relative'}}>
      <div className="gs-box" style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderRadius:24,width:240,
        background: open ? '#f0f6ff' : '#f4f7fb',
        border: open ? '1.5px solid #1960a3' : '1.5px solid #e2e8f0',
        transition:'all 200ms'}}>
        <span className="material-symbols-outlined" style={{fontSize:16,color:'#94a3b8',flexShrink:0}}>search</span>
        <input
          style={{background:'transparent',border:'none',outline:'none',fontSize:13,color:'#1e293b',width:'100%',fontFamily:'inherit'}}
          className="gs-input"
          placeholder="Search…"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key==='Escape') { setQ(''); setOpen(false); } }}
        />
        {q && <button onClick={()=>{setQ('');setOpen(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',color:'#94a3b8'}}>
          <span className="material-symbols-outlined" style={{fontSize:14}}>close</span>
        </button>}
      </div>

      {open && results.length > 0 && (
        <div className="gs-results" style={{position:'absolute',top:'calc(100% + 8px)',left:0,width:300,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,32,69,0.14)',border:'1px solid #e0e3e5',zIndex:999,overflow:'hidden',animation:'srch-in 150ms ease'}}>
          <style>{`@keyframes srch-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}} .gs-input::placeholder{color:#94a3b8}`}</style>
          {results.map((r,i) => (
            <button key={i} onClick={()=>go(r)}
              style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background 120ms'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f7fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{width:30,height:30,borderRadius:8,background:typeColor[r.type]+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span className="material-symbols-outlined" style={{fontSize:15,color:typeColor[r.type]}}>{r.icon}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'#181c1e',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.label}</div>
                <div style={{fontSize:10,color:'#74777f'}}>{r.sub}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,color:typeColor[r.type],background:typeColor[r.type]+'15',padding:'2px 7px',borderRadius:20,textTransform:'uppercase',flexShrink:0}}>{r.type}</span>
            </button>
          ))}
        </div>
      )}
      {open && q && results.length === 0 && (
        <div className="gs-results" style={{position:'absolute',top:'calc(100% + 8px)',left:0,width:280,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,32,69,0.14)',border:'1px solid #e0e3e5',zIndex:999,padding:'16px',textAlign:'center'}}>
          <span className="material-symbols-outlined" style={{fontSize:24,color:'#c4c6cf'}}>search_off</span>
          <div style={{fontSize:12,color:'#74777f',marginTop:6}}>No results for "{q}"</div>
        </div>
      )}
    </div>
  );
}

function SchoolBadge() {
  const [hov, setHov] = useState(false);
  const [shine, setShine] = useState(false);
  useEffect(()=>{ const t = setTimeout(()=>setShine(true), 500); return ()=>clearTimeout(t); },[]);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:'inline-flex',alignItems:'center',position:'relative',overflow:'hidden',cursor:'default',padding:'4px 2px'}}>
      {/* Shimmer on mount */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        background:'linear-gradient(105deg,transparent 35%,rgba(25,96,163,0.1) 50%,transparent 65%)',
        transform: shine ? 'translateX(220%)' : 'translateX(-220%)',
        transition: shine ? 'transform 700ms ease' : 'none'}}/>
      <span style={{fontSize:18,fontWeight:600,fontFamily:'Manrope,sans-serif',color:'#002045',
        textTransform:'uppercase',position:'relative',zIndex:1,
        transform: hov ? 'translateY(-1px)' : 'translateY(0)',
        opacity: hov ? 0.75 : 1,
        transition:'transform 250ms cubic-bezier(0.4,0,0.2,1), opacity 250ms, letter-spacing 250ms',
        letterSpacing: hov ? '0.28em' : '0.22em',
        textShadow:'none'}}>
        Lord Krishna Public School
      </span>
    </div>
  );
}

function NotificationBell({ db, setPage }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const [pendingAdm, setPendingAdm] = useState(0);
  const ref = React.useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Poll pending admissions count every 30s
  useEffect(() => {
    const fetchAdm = async () => {
      try {
        const token = sessionStorage.getItem('lkps_token') || '';
        const r = await fetch(`${API_BASE}/admissions`, { headers: { Authorization: 'Bearer ' + token } });
        const data = await r.json();
        if (Array.isArray(data)) setPendingAdm(data.filter(a => a.status === 'Pending').length);
      } catch { /* silent */ }
    };
    fetchAdm();
    const interval = setInterval(fetchAdm, 30000);
    return () => clearInterval(interval);
  }, []);

  const allNotes = React.useMemo(() => {
    if (!db) return [];
    const list = [];
    const today = new Date();

    // New admission enquiries pending
    if (pendingAdm > 0) list.push({
      id:'adm', icon:'how_to_reg', color:'#1960a3', bg:'#dbeafe',
      title:`${pendingAdm} new admission enquir${pendingAdm > 1 ? 'ies' : 'y'} pending`,
      sub: 'Tap to review and follow up',
      page:'adm',
    });

    // Fee overdue — students with pending balance
    const overdue = (db.students||[]).filter(s => {
      const paid = (db.pays||[]).filter(p=>p.sid===s.id).reduce((a,p)=>a+p.amt,0);
      return paid < (s.fee||0);
    });
    if (overdue.length > 0) list.push({
      id:'fee', icon:'payments', color:'#ef4444', bg:'#fee2e2',
      title:`${overdue.length} student${overdue.length>1?'s':''} have pending fees`,
      sub: overdue.slice(0,2).map(s=>`${s.fn||''} ${s.ln||''}`.trim()).join(', ') + (overdue.length>2?` +${overdue.length-2} more`:''),
      page:'fee',
    });

    // Upcoming exams in next 7 days
    const upcoming = (db.exams||[]).filter(e => {
      if (!e.st || e.st !== 'Upcoming') return false;
      if (!e.dt) return true;
      const d = new Date(e.dt);
      const diff = (d - today) / 86400000;
      return diff >= 0 && diff <= 7;
    });
    if (upcoming.length > 0) list.push({
      id:'exam', icon:'quiz', color:'#f59e0b', bg:'#fef3c7',
      title:`${upcoming.length} upcoming exam${upcoming.length>1?'s':''}`,
      sub: upcoming.slice(0,2).map(e=>e.name||e.title||'Exam').join(', '),
      page:'exam',
    });

    // Low attendance — classes below 75%
    const lowAtt = (db.classes||[]).filter(c => {
      const stuIds = (db.students||[]).filter(s=>s.cls===c.name).map(s=>s.id);
      if (!stuIds.length) return false;
      let p=0,t=0;
      Object.values(db.att||{}).forEach(day => stuIds.forEach(sid => {
        if (day[sid]!==undefined) { t++; if(day[sid]==='P'||day[sid]==='L') p++; }
      }));
      return t > 0 && (p/t)*100 < 75;
    });
    if (lowAtt.length > 0) list.push({
      id:'att', icon:'warning', color:'#8b5cf6', bg:'#ede9fe',
      title:`${lowAtt.length} class${lowAtt.length>1?'es':''} below 75% attendance`,
      sub: lowAtt.map(c=>c.name).join(', '),
      page:'att',
    });

    // No students enrolled
    if ((db.students||[]).length === 0) list.push({
      id:'nostu', icon:'group_add', color:'#1960a3', bg:'#dbeafe',
      title:'No students enrolled yet',
      sub:'Add students to get started',
      page:'stu',
    });

    return list;
  }, [db, pendingAdm]);

  const notes = allNotes.filter(n => !dismissed.includes(n.id));
  const count = notes.length;

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={() => setOpen(o=>!o)}
        style={{position:'relative',color: open?'#1960a3':'#64748b',border:0,background: open?'#eef4ff':'transparent',cursor:'pointer',display:'flex',alignItems:'center',borderRadius:8,padding:6,transition:'all 150ms'}}
        onMouseEnter={e=>{e.currentTarget.style.color='#1960a3';e.currentTarget.style.background='#eef4ff';}}
        onMouseLeave={e=>{if(!open){e.currentTarget.style.color='#64748b';e.currentTarget.style.background='transparent';}}}>
        <span className="material-symbols-outlined">notifications</span>
        {count > 0 && (
          <span style={{position:'absolute',top:4,right:4,width:16,height:16,borderRadius:'50%',background:'#ef4444',color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',lineHeight:1}}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 10px)',right:0,width:320,background:'#fff',borderRadius:16,boxShadow:'0 8px 32px rgba(0,32,69,0.14)',border:'1px solid #e8edf5',zIndex:999,overflow:'hidden',animation:'pop-in 150ms ease'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px 10px',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif'}}>Notifications</div>
            {count > 0 && <span style={{fontSize:10,fontWeight:700,color:'#ef4444',background:'#fee2e2',padding:'2px 8px',borderRadius:20}}>{count} alert{count>1?'s':''}</span>}
          </div>

          {/* List */}
          {count === 0 ? (
            <div style={{padding:'28px 16px',textAlign:'center'}}>
              <span className="material-symbols-outlined" style={{fontSize:32,color:'#cbd5e1'}}>notifications_none</span>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:8}}>All clear — no alerts</div>
            </div>
          ) : (
            <div style={{maxHeight:320,overflowY:'auto'}}>
              {notes.map(n => (
                <div key={n.id} style={{display:'flex',alignItems:'center',borderBottom:'1px solid #f8fafc'}}>
                  <button onClick={()=>{setPage(n.page);setOpen(false);}}
                    style={{display:'flex',alignItems:'flex-start',gap:12,flex:1,padding:'12px 16px',border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background 120ms'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{width:34,height:34,borderRadius:10,background:n.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                      <span className="material-symbols-outlined" style={{fontSize:17,color:n.color}}>{n.icon}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#1e293b',lineHeight:1.4}}>{n.title}</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.sub}</div>
                    </div>
                    <span className="material-symbols-outlined" style={{fontSize:14,color:'#cbd5e1',flexShrink:0,marginTop:2}}>chevron_right</span>
                  </button>
                  <button onClick={e=>{e.stopPropagation();setDismissed(d=>[...d,n.id]);}}
                    title="Dismiss"
                    style={{padding:'0 12px',height:'100%',border:'none',background:'transparent',cursor:'pointer',color:'#cbd5e1',display:'flex',alignItems:'center',flexShrink:0,transition:'color 120ms'}}
                    onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e=>e.currentTarget.style.color='#cbd5e1'}>
                    <span className="material-symbols-outlined" style={{fontSize:16}}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {count > 0 && (
            <div style={{padding:'10px 16px',borderTop:'1px solid #f1f5f9',textAlign:'center'}}>
              <button onClick={()=>{setDismissed(notes.map(n=>n.id));setOpen(false);}} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Dismiss all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminPopover({ user, setPage, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const initials = (user.name||'Admin').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={() => setOpen(o => !o)}
        style={{display:'flex',alignItems:'center',gap:10,background:'transparent',border:'none',cursor:'pointer',padding:'4px 6px',borderRadius:10,transition:'background 150ms'}}
        onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#fff',boxShadow:'0 2px 8px rgba(25,96,163,0.25)',flexShrink:0,overflow:'hidden'}}>
          {user.pic ? <img src={user.pic} alt={user.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials}
        </div>
        <div style={{textAlign:'left'}}>
          <p style={{fontSize:12,fontWeight:700,color:'#1e293b',margin:0,lineHeight:1.3}}>{user.name||'Admin'}</p>
          <p style={{fontSize:10,color:'#94a3b8',margin:0}}>{user.role||'Administrator'}</p>
        </div>
        <span className="material-symbols-outlined" style={{fontSize:16,color:'#94a3b8',marginLeft:2,transition:'transform 200ms',transform:open?'rotate(180deg)':'rotate(0deg)'}}>expand_more</span>
      </button>

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 10px)',right:0,width:260,background:'#fff',borderRadius:16,boxShadow:'0 8px 32px rgba(0,32,69,0.14)',border:'1px solid #e8edf5',zIndex:999,overflow:'hidden',animation:'pop-in 150ms ease'}}>
          <style>{`@keyframes pop-in{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:none}}`}</style>
          {/* Profile header */}
          <div style={{padding:'20px 20px 16px',background:'linear-gradient(135deg,#eef4ff,#f5f0ff)',borderBottom:'1px solid #e8edf5'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff',boxShadow:'0 4px 12px rgba(25,96,163,0.3)',flexShrink:0,overflow:'hidden'}}>
                {user.pic ? <img src={user.pic} alt={user.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials}
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif'}}>{user.name||'Admin'}</div>
                <div style={{fontSize:11,color:'#64748b',marginTop:2}}>@{user.username||'admin'}</div>
                <span style={{display:'inline-block',marginTop:5,fontSize:10,fontWeight:700,color:'#1960a3',background:'#dbeafe',padding:'2px 10px',borderRadius:20,letterSpacing:'0.04em'}}>{user.role||'Administrator'}</span>
              </div>
            </div>
          </div>
          {/* Info rows */}
          <div style={{padding:'12px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
              <span className="material-symbols-outlined" style={{fontSize:16,color:'#94a3b8'}}>badge</span>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Username</div>
                <div style={{fontSize:13,color:'#1e293b',fontWeight:600}}>@{user.username||'admin'}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0'}}>
              <span className="material-symbols-outlined" style={{fontSize:16,color:'#94a3b8'}}>manage_accounts</span>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Role</div>
                <div style={{fontSize:13,color:'#1e293b',fontWeight:600}}>{user.role||'Administrator'}</div>
              </div>
            </div>
          </div>
          {/* Action */}
          <div style={{padding:'0 12px 12px'}}>
            <button onClick={()=>{setOpen(false);onLogout();}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'10px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#ef4444,#dc2626)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 12px rgba(239,68,68,0.25)',transition:'opacity 150ms'}}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.9'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              <span className="material-symbols-outlined" style={{fontSize:16}}>logout</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminApp({ db, save, page, setPage, user, setUser, onLogout, onSwitchSession, activeSessionId }) {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  React.useEffect(() => {
    if (isMobile) setMobileNavOpen(false);
  }, [page, isMobile]);

  const pages = {
    dash:<Dashboard db={db} save={save} setPage={setPage}/>,
    adm:<NewAdmissions />,
    stu:<Students db={db} save={save} setPage={setPage}/>,
    tea:<Teachers db={db} save={save}/>,
    cls:<Classes db={db} save={save}/>,
    tt:<Timetable db={db} save={save}/>,
    att:<Attendance db={db} save={save}/>,
    exam:<Exams db={db} save={save}/>,
    cal:<AcademicCalendar db={db} save={save}/>,
    fee:<Fees db={db} save={save}/>,
    docs:<Documents db={db} save={save}/>,
    rep:<Reports db={db} save={save} activeSessionId={activeSessionId}/>,
    set:<Settings db={db} save={save} user={user} setUser={setUser}/>,
    msg:<AdminMessages activeSessionId={activeSessionId}/>,
    notices:<NoticeBoard />,
  };

  return (
    <div className="app-shell" style={{display:'flex',height:'100vh',background:'#f7fafc'}}>
      <Sidebar
        page={page}
        setPage={setPage}
        user={user}
        onLogout={onLogout}
        isMobile={isMobile}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {isMobile && mobileNavOpen && (
        <div
          className="app-sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1100 }}
        />
      )}
      <div className="app-content" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Top header */}
        <header className="app-header" style={{
          height:64, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 32px', position:'relative', overflow:'visible',
          background:'#ffffff',
          borderBottom:'1px solid #e8edf5',
          boxShadow:'0 2px 12px rgba(0,31,77,0.07)',
          zIndex:100,
        }}>
          {/* Left — school name + aesthetic accent */}
          <div className="app-header-left"
            onClick={() => setPage('dash')}
            style={{display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1,cursor:'pointer'}}
            title="Go to Dashboard"
          >
            <button
              className="app-menu-btn"
              onClick={(e) => { e.stopPropagation(); setMobileNavOpen(v => !v); }}
              style={{ display:'none', border:0, background:'transparent', cursor:'pointer', color:'#1960a3', padding:4 }}
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined" style={{fontSize:22}}>menu</span>
            </button>
            <SchoolBadge />
            {/* thin vertical divider + "Est. 2009" tag */}
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:1,height:28,background:'linear-gradient(180deg,transparent,#c7d9f5,transparent)'}}/>
              <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
                <span style={{fontSize:9,fontWeight:800,color:'#1960a3',letterSpacing:'0.14em',textTransform:'uppercase'}}>Est.</span>
                <span style={{fontSize:13,fontWeight:900,color:'#002045',fontFamily:'Manrope,sans-serif',letterSpacing:'0.04em'}}>2009</span>
              </div>
            </div>
          </div>
          {/* Right — search + actions */}
          <div className="app-header-right" style={{display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1}}>
            <GlobalSearch db={db} setPage={setPage} />
            <button onClick={onSwitchSession}
              style={{background:'#eef4ff',color:'#1960a3',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,border:'1px solid #c7d9f5',letterSpacing:'0.04em',cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'all 150ms'}}
              onMouseEnter={e=>{e.currentTarget.style.background='#dbeafe';e.currentTarget.style.borderColor='#93c5fd';}}
              onMouseLeave={e=>{e.currentTarget.style.background='#eef4ff';e.currentTarget.style.borderColor='#c7d9f5';}}>
              <span className="material-symbols-outlined" style={{fontSize:13}}>swap_horiz</span>
              {db.settings.year||'2025-26'}
            </button>
            <NotificationBell db={db} setPage={setPage} />
            <button onClick={() => window.print()} style={{color:'#64748b',border:0,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',borderRadius:8,padding:6,transition:'all 150ms'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#1960a3';e.currentTarget.style.background='#eef4ff';}}
              onMouseLeave={e=>{e.currentTarget.style.color='#64748b';e.currentTarget.style.background='transparent';}}>
              <span className="material-symbols-outlined">print</span>
            </button>
            <div style={{width:1,height:32,background:'#e2e8f0'}}/>
            <AdminPopover user={user} setPage={setPage} onLogout={onLogout} />
          </div>
        </header>
        <div className="app-main flex-1 overflow-y-auto p-6" style={{
          backgroundColor:'#f0f4ff',
          backgroundImage:`
            radial-gradient(ellipse at 0% 0%, rgba(25,96,163,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 100% 100%, rgba(99,102,241,0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 100% 0%, rgba(16,185,129,0.05) 0%, transparent 45%),
            url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%231960a3' fill-opacity='0.07'/%3E%3C/svg%3E")
          `,
          backgroundSize:'auto,auto,auto,32px 32px',
        }}>
          {pages[page] || <div className="text-on-surface-variant">Page not found</div>}
        </div>
      </div>
      <Toast />
    </div>
  );
}

function useCountUp(target, duration=1200) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (!target) { setVal(0); return; }
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return val;
}

function StatCard({ icon, label, value, prefix='', suffix='', accent, sub, onClick, delay=0 }) {
  const [hov, setHov] = React.useState(false);
  const [vis, setVis] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const count = useCountUp(vis ? value : 0);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? accent + '18' : 'var(--s1)',
        border: `1.5px solid ${hov ? accent + '60' : 'var(--br)'}`,
        borderRadius: 16,
        padding: '22px 24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 220ms cubic-bezier(0.4,0,0.2,1)',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hov ? `0 12px 32px ${accent}22` : '0 1px 4px rgba(0,0,0,0.06)',
        opacity: vis ? 1 : 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* glow blob */}
      <div style={{position:'absolute',top:-30,right:-30,width:100,height:100,borderRadius:'50%',background:accent+'22',filter:'blur(24px)',transition:'opacity 220ms',opacity:hov?1:0,pointerEvents:'none'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:12,background:accent+'18',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 220ms',transform:hov?'scale(1.12)':'scale(1)'}}>
          <span className="material-symbols-outlined" style={{fontSize:20,color:accent}}>{icon}</span>
        </div>
        {sub && <span style={{fontSize:10,fontWeight:700,color:accent,background:accent+'15',padding:'3px 8px',borderRadius:20}}>{sub}</span>}
      </div>
      <div style={{fontSize:11,color:'var(--di)',fontWeight:600,marginBottom:4,letterSpacing:'0.02em'}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:'var(--tx)',fontFamily:'Manrope,sans-serif',letterSpacing:'-0.02em'}}>
        {prefix}{typeof value === 'number' ? count.toLocaleString('en-IN') : value}{suffix}
      </div>
    </div>
  );
}

function FeeChart({ pays, year }) {
  const [vis, setVis] = React.useState(false);
  const [hov, setHov] = React.useState(null);
  React.useEffect(() => { const t = setTimeout(() => setVis(true), 300); return () => clearTimeout(t); }, []);

  // Academic year: Apr YYYY – Mar YYYY+1
  const startYear = year ? parseInt(year.split('-')[0]) : new Date().getFullYear();
  const AY_MONTHS = [
    {label:'Apr', m:3, y:startYear},
    {label:'May', m:4, y:startYear},
    {label:'Jun', m:5, y:startYear},
    {label:'Jul', m:6, y:startYear},
    {label:'Aug', m:7, y:startYear},
    {label:'Sep', m:8, y:startYear},
    {label:'Oct', m:9, y:startYear},
    {label:'Nov', m:10,y:startYear},
    {label:'Dec', m:11,y:startYear},
    {label:'Jan', m:0, y:startYear+1},
    {label:'Feb', m:1, y:startYear+1},
    {label:'Mar', m:2, y:startYear+1},
  ];

  // Sum payments per month
  const totals = AY_MONTHS.map(({m, y}) => {
    return pays.filter(p => {
      if (!p.dt) return false;
      const d = new Date(p.dt);
      return d.getMonth() === m && d.getFullYear() === y;
    }).reduce((s, p) => s + (p.amt || 0), 0);
  });

  const maxVal = Math.max(...totals, 1);
  const now = new Date();
  const currentMonthIdx = AY_MONTHS.findIndex(({m,y}) => now.getMonth()===m && now.getFullYear()===y);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {/* Y-axis hint */}
      <div style={{display:'flex',alignItems:'flex-end',gap:4,height:120}}>
        {/* Y labels */}
        <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',height:'100%',paddingBottom:20,marginRight:4}}>
          {[maxVal, Math.round(maxVal/2), 0].map((v, i) => (
            <span key={i} style={{fontSize:9,color:'#9aa0a6',fontWeight:600,whiteSpace:'nowrap'}}>
              {v===0?'₹0':v>=1000?'₹'+(v/1000).toFixed(v%1000===0?0:1)+'k':'₹'+v}
            </span>
          ))}
        </div>
        {/* Bars */}
        <div style={{flex:1,display:'flex',alignItems:'flex-end',gap:5,height:'100%'}}>
          {AY_MONTHS.map(({label}, i) => {
            const amt = totals[i];
            const pct = maxVal > 0 ? (amt / maxVal) * 100 : 0;
            const isCurrent = i === currentMonthIdx;
            const isFuture = currentMonthIdx >= 0 && i > currentMonthIdx;
            const isHov = hov === i;
            const barColor = isFuture ? 'var(--br)' : isHov ? '#1960a3' : isCurrent ? '#1960a3' : '#1960a388';
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,height:'100%',justifyContent:'flex-end',position:'relative'}}
                onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
                {/* Tooltip */}
                {isHov && (
                  <div style={{position:'absolute',bottom:'calc(100% - 16px)',left:'50%',transform:'translateX(-50%)',background:'var(--bl)',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 8px',borderRadius:6,whiteSpace:'nowrap',zIndex:10,pointerEvents:'none',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
                    {label}: ₹{amt.toLocaleString('en-IN')}
                    <div style={{position:'absolute',bottom:-4,left:'50%',transform:'translateX(-50%)',width:0,height:0,borderLeft:'4px solid transparent',borderRight:'4px solid transparent',borderTop:'4px solid #002045'}}/>
                  </div>
                )}
                <div style={{width:'100%',borderRadius:'4px 4px 0 0',background:barColor,height:vis?(isFuture?'4px':Math.max(pct,amt>0?3:0)+'%'):'0%',transition:`height ${350+i*40}ms cubic-bezier(0.4,0,0.2,1)`,minHeight:isFuture?4:0}}/>
                <span style={{fontSize:8,color:isCurrent?'var(--sc)':'var(--di)',fontWeight:isCurrent?800:600}}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Summary row */}
      <div style={{display:'flex',gap:16,paddingTop:4,borderTop:'1px solid var(--br)'}}>
        <span style={{fontSize:10,color:'var(--di)'}}>
          Total collected: <strong style={{color:'var(--bl)'}}>₹{pays.reduce((s,p)=>s+(p.amt||0),0).toLocaleString('en-IN')}</strong>
        </span>
        <span style={{fontSize:10,color:'var(--di)'}}>
          Peak month: <strong style={{color:'#1960a3'}}>{AY_MONTHS[totals.indexOf(maxVal)]?.label} — ₹{maxVal.toLocaleString('en-IN')}</strong>
        </span>
        <span style={{fontSize:10,color:'var(--di)'}}>
          Active months: <strong style={{color:'var(--bl)'}}>{totals.filter(v=>v>0).length}</strong>
        </span>
      </div>
    </div>
  );
}

// ── Dashboard sub-components (must be outside Dashboard to obey Rules of Hooks) ──

function QuickStatItem({ item, setPage }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onClick={() => setPage(item.page)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? item.color + '12' : 'var(--s1)', border: `1.5px solid ${hov ? item.color + '50' : 'var(--br)'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all 180ms', display: 'flex', alignItems: 'center', gap: 12, boxShadow: hov ? `0 4px 16px ${item.color}18` : 'none', transform: hov ? 'translateX(2px)' : 'translateX(0)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: item.color }}>{item.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', fontFamily: 'Manrope,sans-serif', lineHeight: 1 }}>{item.val}</div>
        <div style={{ fontSize: 10, color: 'var(--di)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: item.color + '80', flexShrink: 0, transition: 'transform 180ms', transform: hov ? 'translateX(2px)' : 'translateX(0)' }}>arrow_forward</span>
    </div>
  );
}

function StuFeeRow({ s, pays, setPage }) {
  const [hov, setHov] = React.useState(false);
  const paid = paidTotal(pays, s.id);
  const fst = paid >= s.fee && s.fee > 0 ? 'Paid' : s.fst;
  const stColor = fst === 'Paid' ? { bg: 'var(--gnl)', tx: 'var(--gn)' } : fst === 'Overdue' ? { bg: 'var(--rdl)', tx: 'var(--rd)' } : { bg: 'var(--ywl)', tx: 'var(--yw)' };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 16px', alignItems: 'center', padding: '8px 6px', borderRadius: 9, background: hov ? 'var(--s2)' : 'transparent', transition: 'background 150ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
          {(s.fn[0] || '') + (s.ln[0] || '')}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{s.fn} {s.ln}</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--di)' }}>{s.cls || '—'}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>₹{(s.fee || 0).toLocaleString('en-IN')}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: stColor.tx, background: stColor.bg, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{fst}</span>
    </div>
  );
}

function ExamItem({ e, i }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: hov ? 'var(--bll)' : 'var(--bg)', border: '1.5px solid', borderColor: hov ? 'var(--scl)' : 'var(--br)', transition: 'all 160ms' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#1960a318', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#1960a3' }}>quiz</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bl)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name || e.sub || 'Exam'}</div>
        <div style={{ fontSize: 10, color: 'var(--di)' }}>{e.cls || 'All'} · {e.dt || 'TBD'}</div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--sc)', background: 'var(--scl)', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>Upcoming</span>
    </div>
  );
}

function ClassRow({ c }) {
  const [hov, setHov] = React.useState(false);
  const bc = c.pct === null ? '#9aa0a6' : c.pct >= 90 ? '#059669' : c.pct >= 75 ? '#cb9524' : '#ba1a1a';
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px 80px', gap: '0 12px', alignItems: 'center', padding: '8px 6px', borderRadius: 9, background: hov ? 'var(--s2)' : 'transparent', transition: 'background 150ms' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bl)' }}>{c.name}</div>
        <div style={{ fontSize: 10, color: 'var(--di)' }}>{c.teacher ? c.teacher.fn + ' ' + c.teacher.ln : 'No teacher'}</div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{c.count}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: bc }}>{c.pct !== null ? c.pct + '%' : '—'}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)' }}>₹{c.collected.toLocaleString('en-IN')}</span>
    </div>
  );
}

function PayRow({ p, students }) {
  const [hov, setHov] = React.useState(false);
  const stu = students.find(s => s.id === p.sid);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: hov ? 'var(--s2)' : 'transparent', transition: 'background 150ms' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
        {stu ? (stu.fn[0] || '') + (stu.ln[0] || '') : '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stu ? stu.fn + ' ' + stu.ln : 'Unknown'}</div>
        <div style={{ fontSize: 10, color: 'var(--di)' }}>{p.dt} · {p.mn || p.ty || 'Fee'}</div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', flexShrink: 0 }}>₹{(p.amt || 0).toLocaleString('en-IN')}</span>
    </div>
  );
}

function TeacherCard({ t, photos, students }) {
  const [hov, setHov] = React.useState(false);
  const photo = (photos || {})[t.id];
  const stuCount = students.filter(s => s.cls === t.cls).length;
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${hov ? 'var(--scl)' : 'var(--br)'}`, background: hov ? 'var(--bll)' : 'var(--s1)', transition: 'all 160ms' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
        {photo ? <img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (t.fn[0] || '') + (t.ln[0] || '')}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.fn} {t.ln}</div>
        <div style={{ fontSize: 10, color: 'var(--di)' }}>{t.cls || '—'} · {stuCount} students</div>
      </div>
    </div>
  );
}

function AttClassCard({ c }) {
  const [hov, setHov] = React.useState(false);
  const barColor = c.pct === null ? 'var(--br)' : c.pct >= 90 ? '#059669' : c.pct >= 75 ? '#cb9524' : '#ba1a1a';
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${hov ? barColor + '60' : 'var(--br)'}`, background: hov ? barColor + '08' : 'var(--s1)', transition: 'all 180ms' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--bl)' }}>{c.name}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{c.pct !== null ? c.pct + '%' : '—'}</span>
      </div>
      <div style={{ height: 6, background: 'var(--br)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: (c.pct || 0) + '%', background: barColor, borderRadius: 3, transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--di)', marginTop: 6 }}>{c.stuCount} student{c.stuCount !== 1 ? 's' : ''}</div>
    </div>
  );
}

// Scroll-reveal hook — re-triggers every time element enters/leaves viewport
function useReveal(threshold = 0.12) {
  const ref = React.useRef(null);
  const [vis, setVis] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { setVis(e.isIntersecting); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

// Animated reveal wrapper
function Reveal({ children, delay = 0, dir = 'up' }) {
  const [ref, vis] = useReveal();
  const tx = dir === 'up' ? 'translateY(28px)' : dir === 'left' ? 'translateX(-28px)' : dir === 'right' ? 'translateX(28px)' : 'translateY(0)';
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translate(0)' : tx, transition: `opacity 500ms ${delay}ms cubic-bezier(0.4,0,0.2,1), transform 500ms ${delay}ms cubic-bezier(0.4,0,0.2,1)` }}>
      {children}
    </div>
  );
}

function Dashboard({ db, save, setPage }) {
  const col = db.pays.reduce((s, p) => s + p.amt, 0);
  const totalFee = db.students.reduce((s, x) => s + (x.fee || 0), 0);
  const pen = db.students.reduce((s, x) => {
    const paid = paidTotal(db.pays, x.id);
    const bal = Math.max(0, (x.fee || 0) - paid);
    return s + bal;
  }, 0);
  const penStu = db.students.filter(s => {
    const paid = paidTotal(db.pays, s.id);
    return paid < (s.fee || 0);
  }).slice(0, 5);
  const colPct = totalFee > 0 ? Math.round(col / totalFee * 100) : 0;

  // Extra computed data
  const fullyPaid = db.students.filter(s => paidTotal(db.pays, s.id) >= s.fee && s.fee > 0).length;
  const totalStudents = db.students.length;
  const upcomingExams = db.exams.filter(e => e.st === 'Upcoming');
  const recentPays = [...db.pays].sort((a,b) => new Date(b.dt) - new Date(a.dt)).slice(0, 6);

  // Attendance overall
  let attPresent = 0, attTotal = 0;
  Object.values(db.att).forEach(day => Object.values(day).forEach(v => { attTotal++; if (v === 'P' || v === 'L') attPresent++; }));
  const attPct = attTotal > 0 ? Math.round(attPresent / attTotal * 100) : null;

  // Class-wise data
  const classData = db.classes.map(c => {
    const stuIds = db.students.filter(s => s.cls === c.name).map(s => s.id);
    let p = 0, t = 0;
    Object.values(db.att).forEach(day => stuIds.forEach(sid => { if (day[sid] !== undefined) { t++; if (day[sid] === 'P' || day[sid] === 'L') p++; } }));
    const pct = t > 0 ? Math.round(p / t * 100) : null;
    const teacher = db.teachers.find(x => x.cls === c.name);
    const collected = stuIds.reduce((s, sid) => s + paidTotal(db.pays, sid), 0);
    return { name: c.name, count: stuIds.length, pct, teacher, collected };
  });

  // Gender split
  const male = db.students.filter(s => s.gn === 'Male').length;
  const female = db.students.filter(s => s.gn === 'Female').length;
  const other = db.students.filter(s => s.gn !== 'Male' && s.gn !== 'Female').length;

  return (
    <div style={{width:'100%'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:24}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'#1960a3',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>Academic Session {db.settings.year||'2025-26'}</div>
          <h2 style={{fontSize:28,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif',letterSpacing:'-0.02em',margin:0}}>Dashboard</h2>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setPage('rep')} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,border:'1.5px solid var(--br)',background:'var(--s1)',color:'var(--bl)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 150ms'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--sc)';e.currentTarget.style.color='var(--sc)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--br)';e.currentTarget.style.color='var(--bl)';}}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>download</span> Export
          </button>
          <button onClick={()=>setPage('stu')} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:10,border:'none',background:'var(--bl)',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',boxShadow:'0 4px 14px rgba(0,32,69,0.25)',transition:'all 150ms'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--sc)';e.currentTarget.style.boxShadow='0 6px 20px rgba(25,96,163,0.35)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--bl)';e.currentTarget.style.boxShadow='0 4px 14px rgba(0,32,69,0.25)';}}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>add</span> New Admission
          </button>
        </div>
      </div>

      {/* Row 1 — 6 stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:16}}>
        {[
          {icon:'school',label:'Students',value:totalStudents,accent:'#1960a3',sub:'Enrolled',page:'stu',delay:0},
          {icon:'record_voice_over',label:'Teachers',value:db.teachers.length,accent:'#059669',sub:'Faculty',page:'tea',delay:60},
          {icon:'class',label:'Classes',value:db.classes.length,accent:'#7c3aed',sub:'Active',page:'cls',delay:120},
          {icon:'payments',label:'Collected',value:col,prefix:'₹',accent:'#cb9524',sub:colPct+'%',page:'fee',delay:180},
          {icon:'warning',label:'Outstanding',value:pen,prefix:'₹',accent:'#ba1a1a',sub:'Pending',page:'fee',delay:240},
          {icon:'how_to_reg',label:'Fully Paid',value:fullyPaid,accent:'#059669',sub:'Students',page:'fee',delay:300},
        ].map(c => <StatCard key={c.label} {...c} onClick={()=>setPage(c.page)}/>)}
      </div>

      {/* Row 2 — Fee chart full width */}
      <Reveal delay={0}>
        <div style={{background:'var(--s1)',borderRadius:16,padding:'22px 26px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Fee Collection Trends</div>
              <div style={{fontSize:11,color:'var(--di)',marginTop:2}}>All 12 months — {db.settings.year||'2025-26'}</div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'var(--di)'}}>
                <span style={{width:8,height:8,borderRadius:2,background:'#1960a3',display:'inline-block'}}/>Collected
              </span>
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'var(--di)'}}>
                <span style={{width:8,height:8,borderRadius:2,background:'var(--br)',display:'inline-block'}}/>Upcoming
              </span>
            </div>
          </div>
          <FeeChart pays={db.pays} year={db.settings.year}/>
        </div>
      </Reveal>

      {/* Row 3 — Attendance | Demographics | Upcoming Exams */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>
        <Reveal delay={0} dir="up">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Attendance Overview</span>
              <button onClick={()=>setPage('att')} style={{fontSize:11,fontWeight:700,color:'#1960a3',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                View <span className="material-symbols-outlined" style={{fontSize:13}}>arrow_forward</span>
              </button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14}}>
              <div style={{position:'relative',width:72,height:72,flexShrink:0}}>
                <svg width="72" height="72" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="36" cy="36" r="28" fill="none" stroke="var(--s2)" strokeWidth="8"/>
                  <circle cx="36" cy="36" r="28" fill="none" stroke={attPct===null?'var(--br)':attPct>=90?'#059669':attPct>=75?'#cb9524':'#ba1a1a'} strokeWidth="8"
                    strokeDasharray={`${2*Math.PI*28}`}
                    strokeDashoffset={`${2*Math.PI*28*(1-(attPct||0)/100)}`}
                    strokeLinecap="round"
                    style={{transition:'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'var(--bl)'}}>{attPct!==null?attPct+'%':'—'}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--di)',marginBottom:4}}>Overall attendance rate</div>
                <div style={{fontSize:11,color:'var(--mu)'}}>{attPresent} present / {attTotal} records</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {classData.slice(0,4).map(c=>{
                const bc=c.pct===null?'var(--br)':c.pct>=90?'#059669':c.pct>=75?'#cb9524':'#ba1a1a';
                return (
                  <div key={c.name}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,fontWeight:600,color:'var(--mu)',marginBottom:3}}>
                      <span>{c.name}</span><span style={{color:bc}}>{c.pct!==null?c.pct+'%':'No data'}</span>
                    </div>
                    <div style={{height:5,background:'var(--s2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:(c.pct||0)+'%',background:bc,borderRadius:3,transition:'width 800ms cubic-bezier(0.4,0,0.2,1)'}}/>
                    </div>
                  </div>
                );
              })}
              {classData.length===0&&<div style={{fontSize:11,color:'var(--di)',textAlign:'center',padding:'8px 0'}}>No classes yet</div>}
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} dir="up">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif',marginBottom:14}}>Student Demographics</div>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
              <div style={{position:'relative',width:72,height:72,flexShrink:0}}>
                <svg width="72" height="72">
                  {totalStudents>0?(() => {
                    const r=28,cx=36,cy=36,circ=2*Math.PI*r;
                    const slices=[{val:male,color:'#1960a3'},{val:female,color:'#e91e8c'},{val:other,color:'#cb9524'}];
                    let offset=0;
                    return slices.map((sl,i)=>{
                      const pct=sl.val/totalStudents,dash=circ*pct;
                      const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={sl.color} strokeWidth="8"
                        strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset}
                        style={{transform:'rotate(-90deg)',transformOrigin:'36px 36px'}}/>;
                      offset+=dash; return el;
                    });
                  })():<circle cx="36" cy="36" r="28" fill="none" stroke="var(--br)" strokeWidth="8"/>}
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'var(--bl)'}}>{totalStudents}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[{label:'Male',val:male,color:'#1960a3'},{label:'Female',val:female,color:'#e91e8c'},{label:'Other',val:other,color:'#cb9524'}].map(g=>(
                  <div key={g.label} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:8,height:8,borderRadius:2,background:g.color,flexShrink:0,display:'inline-block'}}/>
                    <span style={{fontSize:11,color:'var(--mu)',fontWeight:600}}>{g.label}</span>
                    <span style={{fontSize:11,color:'var(--di)',marginLeft:'auto'}}>{g.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--mu)',marginBottom:8}}>Fee Status</div>
            {[
              {label:'Fully Paid',val:fullyPaid,color:'#059669',bg:'#d1fae5'},
              {label:'Pending',val:db.students.filter(s=>s.fst==='Pending'&&paidTotal(db.pays,s.id)<s.fee).length,color:'#cb9524',bg:'#ffdeaa'},
              {label:'Overdue',val:penStu.length,color:'#ba1a1a',bg:'#ffdad6'},
            ].map(f=>(
              <div key={f.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 10px',borderRadius:8,background:f.bg,marginBottom:5}}>
                <span style={{fontSize:11,fontWeight:600,color:f.color}}>{f.label}</span>
                <span style={{fontSize:12,fontWeight:800,color:f.color}}>{f.val}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160} dir="up">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Upcoming Exams</span>
              <button onClick={()=>setPage('exam')} style={{fontSize:11,fontWeight:700,color:'#1960a3',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                All <span className="material-symbols-outlined" style={{fontSize:13}}>arrow_forward</span>
              </button>
            </div>
            {upcomingExams.length===0?(
              <div style={{textAlign:'center',padding:'24px 0',color:'var(--di)',fontSize:12}}>No upcoming exams</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {upcomingExams.slice(0,5).map((e,i)=>(
                  <ExamItem key={e.id||i} e={e} i={i}/>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Row 4 — Class breakdown | Recent payments */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <Reveal delay={0} dir="left">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Class Breakdown</span>
              <button onClick={()=>setPage('cls')} style={{fontSize:11,fontWeight:700,color:'#1960a3',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                Manage <span className="material-symbols-outlined" style={{fontSize:13}}>arrow_forward</span>
              </button>
            </div>
            {classData.length===0?(
              <div style={{textAlign:'center',padding:'20px 0',color:'var(--di)',fontSize:12}}>No classes configured</div>
            ):(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 50px 60px 80px',gap:'0 12px',paddingBottom:8,borderBottom:'1px solid var(--br)',marginBottom:4}}>
                  {['Class','Students','Attendance','Collected'].map(h=>(
                    <span key={h} style={{fontSize:9,fontWeight:800,color:'var(--di)',textTransform:'uppercase',letterSpacing:'0.07em'}}>{h}</span>
                  ))}
                </div>
                {classData.map((c)=>(
                  <ClassRow key={c.name} c={c}/>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={80} dir="right">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Recent Payments</span>
              <button onClick={()=>setPage('fee')} style={{fontSize:11,fontWeight:700,color:'#1960a3',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                Ledger <span className="material-symbols-outlined" style={{fontSize:13}}>arrow_forward</span>
              </button>
            </div>
            {recentPays.length===0?(
              <div style={{textAlign:'center',padding:'20px 0',color:'var(--di)',fontSize:12}}>No payments recorded yet</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {recentPays.map((p,i)=>(
                  <PayRow key={p.rc||i} p={p} students={db.students}/>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Row 5 — Alerts | Faculty overview */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16,marginBottom:8}}>
        <Reveal delay={0} dir="up">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <span className="material-symbols-outlined" style={{fontSize:16,color:'#ba1a1a'}}>notification_important</span>
              <span style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Alerts</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {penStu.length>0?(
                <div style={{padding:'10px 12px',background:'var(--rdl)',borderRadius:9,borderLeft:'3px solid var(--rd)',cursor:'pointer'}} onClick={()=>setPage('fee')}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--rd)',marginBottom:2}}>Fee Deadline Approaching</div>
                  <div style={{fontSize:10,color:'var(--mu)'}}>{penStu.length} student{penStu.length>1?'s':''} with pending fees</div>
                </div>
              ):(
                <div style={{padding:'10px 12px',background:'var(--gnl)',borderRadius:9,borderLeft:'3px solid var(--gn)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--gn)',marginBottom:2}}>All Clear</div>
                  <div style={{fontSize:10,color:'var(--mu)'}}>No pending fee alerts</div>
                </div>
              )}
              {upcomingExams.length>0&&(
                <div style={{padding:'10px 12px',background:'var(--scl)',borderRadius:9,borderLeft:'3px solid var(--sc)',cursor:'pointer'}} onClick={()=>setPage('exam')}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--sc)',marginBottom:2}}>{upcomingExams.length} Exam{upcomingExams.length>1?'s':''} Upcoming</div>
                  <div style={{fontSize:10,color:'var(--mu)'}}>Next: {upcomingExams[0].name||upcomingExams[0].sub||'Exam'}</div>
                </div>
              )}
              <div style={{padding:'10px 12px',background:'var(--s2)',borderRadius:9,cursor:'pointer'}} onClick={()=>setPage('cls')}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--bl)',marginBottom:2}}>{db.classes.length} Active Classes</div>
                <div style={{fontSize:10,color:'var(--mu)'}}>{db.students.length} students enrolled</div>
              </div>
              {attPct!==null&&attPct<75&&(
                <div style={{padding:'10px 12px',background:'var(--rdl)',borderRadius:9,borderLeft:'3px solid var(--rd)',cursor:'pointer'}} onClick={()=>setPage('att')}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--rd)',marginBottom:2}}>Low Attendance: {attPct}%</div>
                  <div style={{fontSize:10,color:'var(--mu)'}}>Overall attendance below 75%</div>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} dir="up">
          <div style={{background:'var(--s1)',borderRadius:16,padding:'20px 22px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Faculty Overview</span>
              <button onClick={()=>setPage('tea')} style={{fontSize:11,fontWeight:700,color:'#1960a3',border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                All Teachers <span className="material-symbols-outlined" style={{fontSize:13}}>arrow_forward</span>
              </button>
            </div>
            {db.teachers.length===0?(
              <div style={{textAlign:'center',padding:'20px 0',color:'var(--di)',fontSize:12}}>No teachers added yet</div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
                {db.teachers.slice(0,6).map((t)=>(
                  <TeacherCard key={t.id} t={t} photos={db.tphotos} students={db.students}/>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function NewAdmissions() {
  const [admissions, setAdmissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [noteModal, setNoteModal] = React.useState(null);
  const API = `${API_BASE}/admissions`;

  const token = () => sessionStorage.getItem('lkps_token') || '';

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(API, { headers: { Authorization: 'Bearer ' + token() } });
      const data = await r.json();
      setAdmissions(Array.isArray(data) ? data : []);
    } catch { toast('Failed to load admissions', 'err'); }
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ status }) });
      setAdmissions(a => a.map(x => x._id === id ? { ...x, status } : x));
      toast('Status updated');
    } catch { toast('Update failed', 'err'); }
  };

  const saveNote = async () => {
    try {
      await fetch(`${API}/${noteModal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ note: noteModal.note }) });
      setAdmissions(a => a.map(x => x._id === noteModal.id ? { ...x, note: noteModal.note } : x));
      toast('Note saved'); setNoteModal(null);
    } catch { toast('Save failed', 'err'); }
  };

  const del = async (id) => {
    if (!window.confirm('Remove this enquiry?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token() } });
      setAdmissions(a => a.filter(x => x._id !== id));
      toast('Removed');
    } catch { toast('Delete failed', 'err'); }
  };

  const STATUS_COLORS = { Pending: '#f59e0b', Contacted: '#3b82f6', Enrolled: '#10b981', Rejected: '#ef4444' };
  const STATUS_BG     = { Pending: '#fef3c7', Contacted: '#dbeafe', Enrolled: '#d1fae5', Rejected: '#fee2e2' };

  const counts = { Pending: 0, Contacted: 0, Enrolled: 0, Rejected: 0 };
  admissions.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(counts).map(([s, n]) => (
          <div key={s} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e8edf5', boxShadow: '0 2px 12px rgba(0,32,69,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_COLORS[s], fontFamily: 'Manrope,sans-serif' }}>{n}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">New Admission Enquiries ({admissions.length})</div>
          <button className="btn" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span> Refresh
          </button>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="no-data"><span className="material-symbols-outlined no-data-icon">hourglass_top</span>Loading…</div>
          ) : admissions.length === 0 ? (
            <div className="no-data"><span className="material-symbols-outlined no-data-icon">inbox</span>No enquiries yet</div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Note</th><th>Received</th><th>Actions</th></tr></thead>
              <tbody>
                {admissions.map((a, i) => (
                  <tr key={a._id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{a.name}</td>
                    <td>
                      <a href={`tel:${a.phone}`} style={{ color: '#1960a3', textDecoration: 'none', fontWeight: 600 }}>{a.phone}</a>
                    </td>
                    <td style={{ color: '#64748b' }}>{a.email || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td>
                      <select value={a.status} onChange={e => updateStatus(a._id, e.target.value)}
                        style={{ padding: '4px 10px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', background: STATUS_BG[a.status], color: STATUS_COLORS[a.status], fontFamily: 'inherit' }}>
                        {['Pending', 'Contacted', 'Enrolled', 'Rejected'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ maxWidth: 180, color: '#475569', fontSize: 12 }}>
                      {a.note ? <span title={a.note}>{a.note.length > 40 ? a.note.slice(0, 40) + '…' : a.note}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => setNoteModal({ id: a._id, note: a.note || '' })}
                          title="Add note" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit_note</span>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => del(a._id)}
                          title="Delete" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="overlay" onClick={() => setNoteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add / Edit Note</div>
            <textarea value={noteModal.note} onChange={e => setNoteModal(n => ({ ...n, note: e.target.value }))}
              placeholder="Write a note about this enquiry…"
              style={{ width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
            <div className="modal-footer">
              <button className="btn" onClick={() => setNoteModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNote}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NoticeBoard ───────────────────────────────────────────────────
const NOTICE_TAGS = ['General', 'Event', 'Important', 'Holiday', 'Admission'];
const TAG_COLORS  = { Event:'#1d4ed8', Important:'#dc2626', Holiday:'#059669', Admission:'#7c3aed', General:'#475569' };
const TAG_BG      = { Event:'#dbeafe', Important:'#fee2e2', Holiday:'#d1fae5', Admission:'#ede9fe', General:'#f1f5f9' };

function NoticeBoard() {
  const [notices, setNotices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null); // null | { mode:'add'|'edit', data }
  const [form, setForm] = React.useState({ title:'', body:'', tag:'General', pinned:false, active:true });
  const [saving, setSaving] = React.useState(false);
  const API = `${API_BASE}/notices`;
  const token = () => sessionStorage.getItem('lkps_token') || '';

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(API, { headers: { Authorization: 'Bearer ' + token() } });
      const data = await r.json();
      setNotices(Array.isArray(data) ? data : []);
    } catch { toast('Failed to load notices', 'err'); }
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ title:'', body:'', tag:'General', pinned:false, active:true });
    setModal({ mode:'add' });
  };

  const openEdit = (n) => {
    setForm({ title:n.title, body:n.body||'', tag:n.tag, pinned:n.pinned, active:n.active });
    setModal({ mode:'edit', id:n._id });
  };

  const saveNotice = async () => {
    if (!form.title.trim()) return toast('Title is required', 'err');
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const r = await fetch(API, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() }, body:JSON.stringify(form) });
        const n = await r.json();
        if (!r.ok) { toast(n.error || 'Failed to publish', 'err'); setSaving(false); return; }
        setNotices(prev => [n, ...prev]);
        toast('Notice published');
      } else {
        const r = await fetch(`${API}/${modal.id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() }, body:JSON.stringify(form) });
        const n = await r.json();
        if (!r.ok) { toast(n.error || 'Failed to update', 'err'); setSaving(false); return; }
        setNotices(prev => prev.map(x => x._id === modal.id ? n : x));
        toast('Notice updated');
      }
      setModal(null);
    } catch (e) { toast('Save failed: ' + e.message, 'err'); }
    setSaving(false);
  };

  const toggleActive = async (n) => {
    try {
      const r = await fetch(`${API}/${n._id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token() }, body:JSON.stringify({ active:!n.active }) });
      const updated = await r.json();
      setNotices(prev => prev.map(x => x._id === n._id ? updated : x));
    } catch { toast('Update failed', 'err'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await fetch(`${API}/${id}`, { method:'DELETE', headers:{ Authorization:'Bearer '+token() } });
      setNotices(prev => prev.filter(x => x._id !== id));
      toast('Deleted');
    } catch { toast('Delete failed', 'err'); }
  };

  const active = notices.filter(n => n.active).length;
  const pinned = notices.filter(n => n.pinned).length;

  return (
    <div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Notices', value:notices.length, color:'#1960a3', icon:'campaign' },
          { label:'Active (Visible)', value:active, color:'#059669', icon:'visibility' },
          { label:'Pinned', value:pinned, color:'#f59e0b', icon:'push_pin' },
        ].map(c => (
          <div key={c.label} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #e8edf5', boxShadow:'0 2px 12px rgba(0,32,69,0.06)', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:c.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span className="material-symbols-outlined" style={{ fontSize:22, color:c.color }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize:26, fontWeight:900, color:c.color, fontFamily:'Manrope,sans-serif', lineHeight:1 }}>{c.value}</div>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginTop:3 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Notice Board ({notices.length})</div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn" onClick={load} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span className="material-symbols-outlined" style={{ fontSize:15 }}>refresh</span> Refresh
            </button>
            <button className="btn btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span className="material-symbols-outlined" style={{ fontSize:15 }}>add</span> New Notice
            </button>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="no-data"><span className="material-symbols-outlined no-data-icon">hourglass_top</span>Loading…</div>
          ) : notices.length === 0 ? (
            <div className="no-data"><span className="material-symbols-outlined no-data-icon">campaign</span>No notices yet. Create one!</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Tag</th><th>Body</th><th>Pinned</th><th>Status</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notices.map(n => (
                  <tr key={n._id}>
                    <td style={{ fontWeight:700, maxWidth:220 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {n.pinned && <span className="material-symbols-outlined" style={{ fontSize:14, color:'#f59e0b' }}>push_pin</span>}
                        {n.title}
                      </div>
                    </td>
                    <td>
                      <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.06em', background:TAG_BG[n.tag]||'#f1f5f9', color:TAG_COLORS[n.tag]||'#475569' }}>{n.tag}</span>
                    </td>
                    <td style={{ color:'#64748b', fontSize:12, maxWidth:200 }}>
                      {n.body ? (n.body.length > 60 ? n.body.slice(0,60)+'…' : n.body) : <span style={{ color:'#cbd5e1' }}>—</span>}
                    </td>
                    <td>
                      <button onClick={() => { fetch(`${API}/${n._id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({pinned:!n.pinned})}).then(r=>r.json()).then(u=>setNotices(p=>p.map(x=>x._id===n._id?u:x))); }}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:18, color:n.pinned?'#f59e0b':'#cbd5e1' }}>push_pin</span>
                      </button>
                    </td>
                    <td>
                      <button onClick={() => toggleActive(n)}
                        style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, border:'none', fontWeight:700, fontSize:11, cursor:'pointer', background:n.active?'#d1fae5':'#f1f5f9', color:n.active?'#059669':'#94a3b8' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:13 }}>{n.active?'visibility':'visibility_off'}</span>
                        {n.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td style={{ color:'#94a3b8', fontSize:12, whiteSpace:'nowrap' }}>
                      {new Date(n.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(n)} style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:13 }}>edit</span>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => del(n._id)} style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:13 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal.mode === 'add' ? 'New Notice' : 'Edit Notice'}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label>Title *</label>
                <input className="form-control" placeholder="Notice title" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Body / Description</label>
                <textarea className="form-control" placeholder="Optional details…" rows={3} value={form.body} onChange={e => setForm(f=>({...f,body:e.target.value}))} style={{ resize:'vertical' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label>Tag</label>
                  <select className="form-control" value={form.tag} onChange={e => setForm(f=>({...f,tag:e.target.value}))}>
                    {NOTICE_TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ justifyContent:'flex-end' }}>
                  <label>Options</label>
                  <div style={{ display:'flex', gap:16, alignItems:'center', paddingTop:6 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, fontWeight:600, color:'#334155', textTransform:'none', letterSpacing:'normal' }}>
                      <input type="checkbox" checked={form.pinned} onChange={e => setForm(f=>({...f,pinned:e.target.checked}))} /> Pinned
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, fontWeight:600, color:'#334155', textTransform:'none', letterSpacing:'normal' }}>
                      <input type="checkbox" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} /> Active
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNotice} disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Publish Notice' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Students({ db, save, setPage }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = React.useRef(null);
  const [filterCls, setFilterCls] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const classes = db.classes.map(c => c.name);

  // close dropdown on outside click
  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // live suggestions from search query
  const suggestions = React.useMemo(() => {
    if (!search.trim()) return [];
    const lq = search.toLowerCase();
    return db.students.filter(s =>
      `${s.fn||''} ${s.ln||''}`.toLowerCase().includes(lq) ||
      (s.cls||'').toLowerCase().includes(lq) ||
      (s.admno||'').toLowerCase().includes(lq) ||
      (s.roll||'').toLowerCase().includes(lq) ||
      (s.fphone||s.ph||'').includes(lq) ||
      (s.father||'').toLowerCase().includes(lq)
    ).slice(0, 8);
  }, [search, db.students]);

  const openAdd = () => { setForm({fn:'',ln:'',cls:'',fst:'Pending',mf:0,fextras:[],gn:'Male'}); setPhoto(null); setEditId(null); setOpen(true); };
  const openEdit = (s) => { setForm({...s}); setPhoto(db.photos[s.id]||null); setEditId(s.id); setOpen(true); };
  const saveStu = () => {
    if (!form.fn?.trim() || !form.ln?.trim()) { toast('Name required', 'err'); return; }
    const id = editId || 'S' + uid();
    const mf = parseFloat(form.mf) || 0;
    const fextras = form.fextras || [];
    const extrasSum = fextras.reduce((s, e) => s + (parseFloat(e.amt) || 0), 0);
    const fee = mf * 12 + extrasSum;
    const s = { ...form, id, father:form.fa||form.father||'', mother:form.ma||form.mother||'', fphone:form.fp||form.fphone||'', blood:form.bl||form.blood||'', roll:form.ro||form.roll||'', admno:form.an||form.admno||'', aadhar:form.aa||form.aadhar||'', city:form.cy||form.city||'', caste:form.ca||form.caste||'', fst:form.fst||'Pending', mf, fextras, fee };
    const newStudents = editId ? db.students.map(x => x.id===id ? s : x) : [...db.students, s];
    const newPhotos = { ...db.photos };
    if (photo) newPhotos[id] = photo; else if (editId) delete newPhotos[id];
    save({ ...db, students: newStudents, photos: newPhotos });
    setOpen(false); toast(editId ? 'Student updated' : 'Student added');
  };
  const delStu = (id) => { if (!window.confirm('Delete student?')) return; save({ ...db, students: db.students.filter(s=>s.id!==id), photos: Object.fromEntries(Object.entries(db.photos).filter(([k])=>k!==id)) }); toast('Deleted','err'); };

  const filtered = db.students.filter(s => {
    const txt = (s.fn+' '+s.ln+' '+s.cls+' '+(s.father||'')+' '+(s.fphone||'')+' '+(s.admno||'')).toLowerCase();
    const matchSearch = !search || txt.includes(search.toLowerCase());
    const matchCls = !filterCls || s.cls === filterCls;
    const matchStatus = !filterStatus || s.fst === filterStatus;
    return matchSearch && matchCls && matchStatus;
  });

  // Real-time outstanding from actual payments
  const outstanding = db.students.reduce((sum, s) => {
    const paid = paidTotal(db.pays, s.id);
    return sum + Math.max(0, (s.fee || 0) - paid);
  }, 0);

  const feeStatusCls = (fst) => {
    if (fst === 'Paid') return 'bg-secondary-container text-on-secondary-container';
    if (fst === 'Overdue') return 'bg-error-container text-on-error-container';
    return 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
  };

  return (
    <div>
      {/* Hero Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight mb-2 font-headline">Student Directory</h1>
          <p className="text-on-surface-variant font-medium">
            {db.students.length} active enrollment{db.students.length !== 1 ? 's' : ''} · {db.settings.year || '2025-26'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAdd} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform border-0 cursor-pointer font-sans">
            <span className="material-symbols-outlined text-sm">add</span> Enroll New Student
          </button>
          <button onClick={() => setPage && setPage('rep')} className="px-5 py-2.5 bg-surface-container-highest text-primary rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors border-0 cursor-pointer font-sans">
            <span className="material-symbols-outlined text-sm">download</span> Export Data
          </button>
        </div>
      </div>

      {/* Filter Bar + Outstanding Bento */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:20,marginBottom:28}}>
        {/* Search + filters */}
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',padding:'16px 20px',display:'flex',flexWrap:'wrap',gap:16,alignItems:'flex-end',boxShadow:'0 2px 8px rgba(0,32,69,0.05)'}}>
          {/* Search with live dropdown */}
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em'}}>Search</label>
            <div ref={searchRef} style={{position:'relative',display:'flex',alignItems:'center'}}>
              <span className="material-symbols-outlined" style={{position:'absolute',left:10,fontSize:16,color:'#94a3b8',pointerEvents:'none',zIndex:1}}>search</span>
              <input
                style={{paddingLeft:34,paddingRight:search?32:12,paddingTop:8,paddingBottom:8,borderRadius:24,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#1e293b',outline:'none',width:260,transition:'all 200ms',fontFamily:'inherit'}}
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
                onFocus={e=>{e.target.style.borderColor='#1960a3';e.target.style.background='#f0f6ff';setSearchOpen(true);}}
                onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.background='#f8fafc';}}
                onKeyDown={e => { if(e.key==='Escape'){setSearch('');setSearchOpen(false);} }}
                placeholder="Name, roll, phone, class…"
              />
              {search && (
                <button onClick={()=>{setSearch('');setSearchOpen(false);}} style={{position:'absolute',right:8,background:'none',border:'none',cursor:'pointer',padding:2,display:'flex',color:'#94a3b8',zIndex:1}}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>close</span>
                </button>
              )}
              {/* Live dropdown */}
              {searchOpen && search && (
                <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,width:320,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,32,69,0.14)',border:'1px solid #e8edf5',zIndex:999,overflow:'hidden'}}>
                  {suggestions.length > 0 ? suggestions.map((s,i) => {
                    const paid = paidTotal(db.pays, s.id);
                    const bal = Math.max(0,(s.fee||0)-paid);
                    const photo = db.photos[s.id];
                    return (
                      <button key={s.id} onMouseDown={()=>{ setSearch(`${s.fn} ${s.ln}`); setSearchOpen(false); }}
                        style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background 120ms',borderBottom:'1px solid #f8fafc'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#f0f6ff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        {/* avatar */}
                        <div style={{width:34,height:34,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,color:'#fff'}}>
                          {photo ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : `${(s.fn||'')[0]||''}${(s.ln||'')[0]||''}`.toUpperCase()}
                        </div>
                        {/* info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.fn} {s.ln}</div>
                          <div style={{fontSize:11,color:'#94a3b8'}}>{s.cls||'—'} {s.roll?`· Roll ${s.roll}`:''} {s.admno?`· ${s.admno}`:''}</div>
                        </div>
                        {/* fee badge */}
                        <span style={{fontSize:10,fontWeight:700,flexShrink:0,padding:'3px 8px',borderRadius:20,
                          background: bal===0?'#d1fae5':s.fst==='Overdue'?'#fee2e2':'#fef3c7',
                          color: bal===0?'#059669':s.fst==='Overdue'?'#ef4444':'#d97706'}}>
                          {bal===0?'Paid':'₹'+bal.toLocaleString('en-IN')}
                        </span>
                      </button>
                    );
                  }) : (
                    <div style={{padding:'20px 16px',textAlign:'center'}}>
                      <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#eef4ff,#dbeafe)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                        <span className="material-symbols-outlined" style={{fontSize:22,color:'#1960a3',fontVariationSettings:"'FILL' 0,'wght' 300"}}>person_search</span>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginBottom:2}}>No students match</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>"{search}"</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Class filter */}
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em'}}>Class</label>
            <select value={filterCls} onChange={e=>setFilterCls(e.target.value)}
              style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#1e293b',outline:'none',minWidth:130,cursor:'pointer',fontFamily:'inherit'}}>
              <option value="">All Classes</option>
              {classes.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          {/* Fee status filter */}
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em'}}>Fee Status</label>
            <div style={{display:'flex',gap:6}}>
              {['','Paid','Pending','Overdue'].map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s)}
                  style={{padding:'7px 14px',borderRadius:20,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 150ms',
                    background: filterStatus===s ? '#1960a3' : '#f1f5f9',
                    color: filterStatus===s ? '#fff' : '#64748b',
                    boxShadow: filterStatus===s ? '0 2px 8px rgba(25,96,163,0.25)' : 'none',
                  }}>
                  {s||'All'}
                </button>
              ))}
            </div>
          </div>
          {/* Result count */}
          {(search||filterCls||filterStatus) && (
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:12,color:'#64748b'}}>{filtered.length} result{filtered.length!==1?'s':''}</span>
              <button onClick={()=>{setSearch('');setFilterCls('');setFilterStatus('');}}
                style={{fontSize:11,color:'#ef4444',background:'#fee2e2',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontWeight:600}}>
                Clear
              </button>
            </div>
          )}
        </div>
        {/* Outstanding card */}
        <div style={{background:'linear-gradient(135deg,#1960a3,#002045)',borderRadius:16,padding:'16px 20px',display:'flex',flexDirection:'column',justifyContent:'center',minWidth:180,boxShadow:'0 4px 16px rgba(25,96,163,0.25)'}}>
          <p style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Outstanding</p>
          <h3 style={{fontSize:22,fontWeight:800,color:'#fff',fontFamily:'Manrope,sans-serif',margin:0}}>₹{outstanding.toLocaleString('en-IN')}</h3>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:4}}>{db.students.filter(s=>paidTotal(db.pays,s.id)<(s.fee||0)).length} pending</p>
        </div>
      </div>

      {/* Table */}
      {db.students.length === 0 ? (
        <div style={{background:'#fff',borderRadius:24,padding:'72px 24px',textAlign:'center',boxShadow:'0 1px 8px rgba(0,31,77,0.06)'}}>
          <div style={{width:96,height:96,borderRadius:28,background:'linear-gradient(135deg,#eef4ff 0%,#dbeafe 100%)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 4px 24px rgba(25,96,163,0.13)'}}>
            <span className="material-symbols-outlined" style={{fontSize:48,color:'#1960a3',fontVariationSettings:"'FILL' 0,'wght' 300"}}>group</span>
          </div>
          <div style={{fontSize:20,fontWeight:800,color:'#1e293b',marginBottom:8,fontFamily:'Manrope,sans-serif'}}>No students enrolled yet</div>
          <div style={{fontSize:14,color:'#94a3b8',marginBottom:24}}>Add your first student to get started</div>
          <button onClick={openAdd} style={{padding:'11px 28px',background:'linear-gradient(135deg,#1960a3,#6366f1)',color:'#fff',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(25,96,163,0.3)',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:8}}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>person_add</span>
            Enroll First Student
          </button>
        </div>
      ) : (
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
        <TblWrap>
          <table>
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4">Roll No</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Parent's Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Fee Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const photo = db.photos[s.id];
                const paid = paidTotal(db.pays, s.id);
                const fst = paid >= s.fee && s.fee > 0 ? 'Paid' : s.fst;
                return (
                  <tr key={s.id} className="group hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-5">
                      <span className="font-bold text-primary">#{s.roll || s.admno || (i+1)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-surface-container-low">
                          {photo
                            ? <img src={photo} alt={s.fn} className="w-full h-full object-cover" />
                            : <Avatar name={s.fn+' '+s.ln} idx={i} />
                          }
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{s.fn} {s.ln}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase font-medium">{s.admno ? 'ADM: '+s.admno : s.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-surface-container text-on-surface text-xs font-bold rounded-md">{s.cls || '—'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-on-surface">{s.father || '—'}</p>
                      {s.mother && <p className="text-[10px] text-on-surface-variant">{s.mother}</p>}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-on-surface">{s.fphone || s.ph || '—'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-full tracking-wider ${feeStatusCls(fst)}`}>
                        {fst} {s.fee > 0 ? '(₹'+paid.toLocaleString('en-IN')+'/'+s.fee.toLocaleString('en-IN')+')' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} title="Edit"
                          className="p-2 hover:bg-primary-container hover:text-on-primary rounded-lg transition-all text-primary border-0 bg-transparent cursor-pointer">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => setPage && setPage('docs')} title="Generate ID"
                          className="p-2 hover:bg-primary-container hover:text-on-primary rounded-lg transition-all text-primary border-0 bg-transparent cursor-pointer">
                          <span className="material-symbols-outlined text-lg">badge</span>
                        </button>
                        <button onClick={() => delStu(s.id)} title="Delete"
                          className="p-2 hover:bg-error-container hover:text-error rounded-lg transition-all text-outline border-0 bg-transparent cursor-pointer">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={7} style={{padding:'48px 24px',textAlign:'center'}}>
                  <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:12}}>
                    <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#eef4ff 0%,#dbeafe 100%)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(25,96,163,0.12)'}}>
                      <span className="material-symbols-outlined" style={{fontSize:34,color:'#1960a3',fontVariationSettings:"'FILL' 0,'wght' 300"}}>person_search</span>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:4}}>No students found</div>
                      <div style={{fontSize:12,color:'#94a3b8'}}>Try adjusting your search or filters</div>
                    </div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </TblWrap>
        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low/20 flex items-center justify-between border-t border-surface-container-low">
          <p className="text-xs text-on-surface-variant font-medium">
            Showing <span className="text-primary font-bold">{filtered.length}</span> of {db.students.length} records
          </p>
          <button onClick={openAdd} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline border-0 bg-transparent cursor-pointer">
            <span className="material-symbols-outlined text-sm">person_add</span> Add Student
          </button>
        </div>
      </div>
      )}

      {/* Insight Footer */}
      <div className="mt-6 grid grid-cols-3 gap-5">
        {[
          { icon: 'trending_up', label: 'Total Enrolled', value: db.students.length + ' students' },
          { icon: 'payments', label: 'Fee Collected', value: '₹' + db.pays.reduce((s,p)=>s+p.amt,0).toLocaleString('en-IN') },
          { icon: 'how_to_reg', label: 'Fully Paid', value: db.students.filter(s => paidTotal(db.pays,s.id) >= s.fee && s.fee > 0).length + ' students' },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-surface-container-low p-5 rounded-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">{label}</p>
              <h4 className="text-xl font-extrabold text-primary font-headline">{value}</h4>
            </div>
            <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-8xl text-primary/5 group-hover:scale-110 transition-transform duration-500">{icon}</span>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={(editId?'Edit':'Add') + ' Student'} wide>
        <div className="mb-4">
          <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 pb-2" style={{borderBottom:'1px solid rgba(0,32,69,0.1)'}}>Student Photo (for ID Card)</div>
          <PhotoZone photo={photo} onUpload={setPhoto} onClear={()=>setPhoto(null)} />
        </div>
        <Grid cols={2}>
          <SecLabel>Personal</SecLabel>
          <Field label="First Name *"><Input value={form.fn||''} onChange={v=>setForm(f=>({...f,fn:v}))} placeholder="Aryan"/></Field>
          <Field label="Last Name *"><Input value={form.ln||''} onChange={v=>setForm(f=>({...f,ln:v}))} placeholder="Sharma"/></Field>
          <Field label="Date of Birth"><Input type="date" value={form.dob||''} onChange={v=>setForm(f=>({...f,dob:v}))}/></Field>
          <Field label="Gender"><Select value={form.gn||'Male'} onChange={v=>setForm(f=>({...f,gn:v}))}><option>Male</option><option>Female</option><option>Other</option></Select></Field>
          <Field label="Blood Group"><Select value={form.bl||''} onChange={v=>setForm(f=>({...f,bl:v,blood:v}))}><option value="">—</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b}>{b}</option>)}</Select></Field>
          <Field label="Caste"><Select value={form.ca||''} onChange={v=>setForm(f=>({...f,ca:v}))}><option value="">—</option>{['General','OBC','SC','ST','EWS'].map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Aadhaar"><Input value={form.aa||''} onChange={v=>setForm(f=>({...f,aa:v}))} placeholder="XXXX XXXX XXXX"/></Field>
          <Field label="Religion"><Input value={form.re||''} onChange={v=>setForm(f=>({...f,re:v}))}/></Field>
          <SecLabel>Academic</SecLabel>
          <Field label="Class *"><Select value={form.cls||''} onChange={v=>setForm(f=>({...f,cls:v}))}><option value="">—</option>{classes.map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Roll No."><Input value={form.ro||''} onChange={v=>setForm(f=>({...f,ro:v}))} placeholder="2401"/></Field>
          <Field label="Admission No."><Input value={form.an||''} onChange={v=>setForm(f=>({...f,an:v,admno:v}))} placeholder="ADM-001"/></Field>
          <Field label="Admission Date"><Input type="date" value={form.ad||''} onChange={v=>setForm(f=>({...f,ad:v}))}/></Field>
          <Field label="Previous School"><Input value={form.ps||''} onChange={v=>setForm(f=>({...f,ps:v}))}/></Field>
          <Field label="Email"><Input type="email" value={form.em||''} onChange={v=>setForm(f=>({...f,em:v}))}/></Field>
          <SecLabel>Father</SecLabel>
          <Field label="Father Name"><Input value={form.fa||''} onChange={v=>setForm(f=>({...f,fa:v,father:v}))} placeholder="Ramesh Sharma"/></Field>
          <Field label="Occupation"><Input value={form.fo||''} onChange={v=>setForm(f=>({...f,fo:v}))}/></Field>
          <Field label="Father Phone"><Input value={form.fp||''} onChange={v=>setForm(f=>({...f,fp:v,fphone:v}))} placeholder="98100-XXXXX"/></Field>
          <Field label="Father Aadhaar"><Input value={form.faa||''} onChange={v=>setForm(f=>({...f,faa:v}))}/></Field>
          <SecLabel>Mother</SecLabel>
          <Field label="Mother Name"><Input value={form.ma||''} onChange={v=>setForm(f=>({...f,ma:v,mother:v}))} placeholder="Sunita Sharma"/></Field>
          <Field label="Occupation"><Input value={form.mo||''} onChange={v=>setForm(f=>({...f,mo:v}))}/></Field>
          <Field label="Mother Phone"><Input value={form.mp||''} onChange={v=>setForm(f=>({...f,mp:v}))}/></Field>
          <Field label="Mother Aadhaar"><Input value={form.maa||''} onChange={v=>setForm(f=>({...f,maa:v}))}/></Field>
          <SecLabel>Address</SecLabel>
          <Field label="Phone"><Input value={form.ph||''} onChange={v=>setForm(f=>({...f,ph:v}))}/></Field>
          <Span><Field label="Address"><Input value={form.addr||''} onChange={v=>setForm(f=>({...f,addr:v}))}/></Field></Span>
          <Field label="City"><Input value={form.cy||''} onChange={v=>setForm(f=>({...f,cy:v,city:v}))}/></Field>
          <Field label="PIN"><Input value={form.pin||''} onChange={v=>setForm(f=>({...f,pin:v}))}/></Field>
          <SecLabel>Fees</SecLabel>
          <Field label="Monthly Fee ₹ *">
            <Input type="number" value={form.mf||''} onChange={v=>{
              const mf=parseFloat(v)||0;
              const extrasSum=(form.fextras||[]).reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
              setForm(f=>({...f,mf:v,fee:mf*12+extrasSum}));
            }} placeholder="500"/>
          </Field>
          <Field label="Annual Fee ₹ (auto)">
            <div className="px-3 py-2 bg-surface-container rounded-lg text-sm font-bold text-primary">
              ₹{((parseFloat(form.mf)||0)*12 + (form.fextras||[]).reduce((s,e)=>s+(parseFloat(e.amt)||0),0)).toLocaleString('en-IN')}
              <span className="text-[10px] font-normal text-on-surface-variant ml-2">= ₹{(parseFloat(form.mf)||0).toLocaleString('en-IN')} × 12{(form.fextras||[]).length?' + extras':''}</span>
            </div>
          </Field>
          <Span>
            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 mt-1">Other Charges (added to annual fee)</div>
            {(form.fextras||[]).map((ex,i)=>{
              const isEditing = form._editExIdx === i;
              return (
                <div key={i} className="flex items-center gap-2 mb-2">
                  {isEditing ? (
                    <>
                      <input autoFocus value={form._editExLabel||''} onChange={e=>setForm(f=>({...f,_editExLabel:e.target.value}))}
                        className="flex-1 px-3 py-2 bg-white border border-primary/30 rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"/>
                      <input type="number" value={form._editExAmt||''} onChange={e=>setForm(f=>({...f,_editExAmt:e.target.value}))}
                        className="w-28 px-3 py-2 bg-white border border-primary/30 rounded-lg text-sm font-bold text-primary text-right focus:outline-none focus:ring-2 focus:ring-primary/20"/>
                      <button type="button" onClick={()=>{
                        if(!form._editExLabel?.trim()||!parseFloat(form._editExAmt)){toast('Enter name and amount','err');return;}
                        const next=(form.fextras||[]).map((e,j)=>j===i?{label:form._editExLabel.trim(),amt:form._editExAmt}:e);
                        const extrasSum=next.reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
                        setForm(f=>({...f,fextras:next,fee:(parseFloat(f.mf)||0)*12+extrasSum,_editExIdx:null,_editExLabel:'',_editExAmt:''}));
                      }} className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center border-0 cursor-pointer hover:opacity-80 transition-all">✓</button>
                      <button type="button" onClick={()=>setForm(f=>({...f,_editExIdx:null}))}
                        className="w-7 h-7 rounded-lg bg-surface-container text-outline text-xs font-bold flex items-center justify-center border-0 cursor-pointer hover:bg-surface-container-high transition-all">✕</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 px-3 py-2 bg-surface-container-low rounded-lg text-sm text-on-surface">{ex.label}</div>
                      <div className="w-28 px-3 py-2 bg-surface-container-low rounded-lg text-sm font-bold text-primary text-right">₹{(parseFloat(ex.amt)||0).toLocaleString('en-IN')}</div>
                      <button type="button" onClick={()=>setForm(f=>({...f,_editExIdx:i,_editExLabel:ex.label,_editExAmt:String(ex.amt)}))}
                        className="w-7 h-7 rounded-lg bg-surface-container text-primary text-xs font-bold flex items-center justify-center border-0 cursor-pointer hover:bg-primary-container transition-all">✎</button>
                      <button type="button" onClick={()=>{
                        const next=(form.fextras||[]).filter((_,j)=>j!==i);
                        const extrasSum=next.reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
                        setForm(f=>({...f,fextras:next,fee:(parseFloat(f.mf)||0)*12+extrasSum}));
                      }} className="w-7 h-7 rounded-lg bg-error-container text-error text-xs font-bold flex items-center justify-center border-0 cursor-pointer hover:bg-error hover:text-white transition-all">✕</button>
                    </>
                  )}
                </div>
              );
            })}
            <FeeExtraRow onAdd={(label,amt)=>{
              const next=[...(form.fextras||[]),{label,amt}];
              const extrasSum=next.reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
              setForm(f=>({...f,fextras:next,fee:(parseFloat(f.mf)||0)*12+extrasSum}));
            }}/>
          </Span>
          <Field label="Fee Status"><Select value={form.fst||'Pending'} onChange={v=>setForm(f=>({...f,fst:v}))}><option>Pending</option><option>Paid</option><option>Overdue</option></Select></Field>
          <Field label="Concession %"><Input type="number" value={form.co||''} onChange={v=>setForm(f=>({...f,co:v}))} placeholder="0"/></Field>
          <SecLabel>Medical</SecLabel>
          <Field label="Condition"><Input value={form.mc||''} onChange={v=>setForm(f=>({...f,mc:v}))} placeholder="None"/></Field>
          <Field label="Allergies"><Input value={form.al||''} onChange={v=>setForm(f=>({...f,al:v}))} placeholder="None"/></Field>
          <SecLabel>Parent Portal Access</SecLabel>
          <Field label="Username"><Input value={form.puser||''} onChange={v=>setForm(f=>({...f,puser:v}))} placeholder="Leave blank = no access"/></Field>
          <Field label="Password"><Input type="password" value={form.ppass||''} onChange={v=>setForm(f=>({...f,ppass:v}))} placeholder="Min 6 chars"/></Field>
        </Grid>
        <ModalFooter><Btn onClick={()=>setOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={saveStu}>Save Student</Btn></ModalFooter>
      </Modal>
    </div>
  );
}

// Subject pill colour cycling
const SUBJ_PILLS = [
  'bg-secondary-container/20 text-secondary',
  'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'bg-primary-container text-on-primary',
  'bg-surface-container text-on-surface-variant',
  'bg-error-container/40 text-error',
];

function FeeExtraRow({ onAdd }) {
  const [label, setLabel] = useState('');
  const [amt, setAmt] = useState('');
  return (
    <div className="flex gap-2 mt-1">
      <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Charge name (e.g. Sports Fee)"
        className="flex-1 px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"/>
      <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="₹"
        className="w-24 px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"/>
      <button type="button" onClick={()=>{
        if(!label.trim()||!parseFloat(amt)){toast('Enter name and amount','err');return;}
        onAdd(label.trim(), amt); setLabel(''); setAmt('');
      }} className="px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold border-0 cursor-pointer hover:opacity-90 transition-all">+ Add</button>
    </div>
  );
}

function Teachers({ db, save }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = React.useRef(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [tphoto, setTphoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const classes = db.classes.map(c => c.name);
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const suggestions = React.useMemo(() => {
    if (!search.trim()) return [];
    const lq = search.toLowerCase();
    return db.teachers.filter(t =>
      `${t.fn||''} ${t.ln||''}`.toLowerCase().includes(lq) ||
      (t.su||'').toLowerCase().includes(lq) ||
      (t.empId||'').toLowerCase().includes(lq) ||
      (t.cls||'').toLowerCase().includes(lq) ||
      (t.ph||'').includes(lq)
    ).slice(0, 8);
  }, [search, db.teachers]);

  const openAdd = () => { setForm({ status:'Active' }); setTphoto(null); setEditId(null); setOpen(true); };
  const openEdit = t => { setForm({ ...t }); setTphoto((db.tphotos||{})[t.id]||null); setEditId(t.id); setOpen(true); };
  const saveTea = () => {
    if (!form.fn?.trim() || !form.ln?.trim()) { toast('Name required','err'); return; }
    const id = editId || 'T'+uid();
    const t = { ...form, id, ppass: form.ppass || (editId ? db.teachers.find(x=>x.id===id)?.ppass : '') };
    const newT = editId ? db.teachers.map(x=>x.id===id?t:x) : [...db.teachers, t];
    const newTP = { ...(db.tphotos||{}) };
    if (tphoto) newTP[id] = tphoto; else if (editId) delete newTP[id];
    save({ ...db, teachers: newT, tphotos: newTP }); setOpen(false); toast(editId?'Updated':'Teacher added');
  };
  const delTea = id => { if (!window.confirm('Delete?')) return;
    const newTP = { ...(db.tphotos||{}) }; delete newTP[id];
    save({ ...db, teachers: db.teachers.filter(t=>t.id!==id), tphotos: newTP }); toast('Deleted','err');
  };

  const filtered = db.teachers.filter(t => {
    const txt = (t.fn+' '+t.ln+' '+(t.su||'')+' '+(t.empId||'')).toLowerCase();
    return txt.includes(search.toLowerCase()) && (!filterStatus || t.status === filterStatus);
  });

  const statusDot = s => s === 'Active' ? 'bg-emerald-500' : s === 'On Leave' ? 'bg-amber-500' : 'bg-error';
  const statusLabel = s => s === 'Active' ? 'Active' : s === 'On Leave' ? 'On Leave' : s || 'Active';

  // Card background accent colours cycling
  const ACCENTS = ['bg-secondary/5','bg-tertiary-fixed/10','bg-primary/5','bg-secondary/5','bg-primary/5','bg-tertiary-fixed/10'];

  return (
    <div>
      {/* Hero Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight mb-2 font-headline">Faculty Directory</h1>
          <p className="text-on-surface-variant">
            {db.teachers.length} faculty member{db.teachers.length !== 1 ? 's' : ''} · {db.settings.year || '2025-26'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAdd}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all font-semibold text-sm border-0 cursor-pointer font-sans">
            <span className="material-symbols-outlined text-sm">add</span> New Faculty
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container transition-all font-semibold text-sm text-primary bg-transparent cursor-pointer font-sans">
            <span className="material-symbols-outlined text-sm">export_notes</span> Export List
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{display:'flex',gap:12,marginBottom:32,flexWrap:'wrap',alignItems:'center'}}>
        {/* Search with live dropdown */}
        <div ref={searchRef} style={{position:'relative'}}>
          <span className="material-symbols-outlined" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'#94a3b8',pointerEvents:'none',zIndex:1}}>search</span>
          <input
            style={{paddingLeft:36,paddingRight:search?32:16,paddingTop:9,paddingBottom:9,borderRadius:24,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#1e293b',outline:'none',width:280,transition:'all 200ms',fontFamily:'inherit'}}
            value={search}
            onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={e => { e.target.style.borderColor='#1960a3'; e.target.style.background='#f0f6ff'; setSearchOpen(true); }}
            onBlur={e => { e.target.style.borderColor='#e2e8f0'; e.target.style.background='#f8fafc'; }}
            onKeyDown={e => { if(e.key==='Escape'){setSearch('');setSearchOpen(false);} }}
            placeholder="Search by name, subject, class…"
          />
          {search && (
            <button onClick={()=>{setSearch('');setSearchOpen(false);}} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:2,display:'flex',color:'#94a3b8',zIndex:1}}>
              <span className="material-symbols-outlined" style={{fontSize:14}}>close</span>
            </button>
          )}
          {/* Live dropdown */}
          {searchOpen && search && (
            <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,width:340,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,32,69,0.14)',border:'1px solid #e8edf5',zIndex:999,overflow:'hidden'}}>
              {suggestions.length > 0 ? suggestions.map((t,i) => {
                const photo = (db.tphotos||{})[t.id];
                const ini = `${(t.fn||'')[0]||''}${(t.ln||'')[0]||''}`.toUpperCase();
                const statusColor = t.status==='Active'?'#059669':t.status==='On Leave'?'#d97706':'#ef4444';
                const statusBg = t.status==='Active'?'#d1fae5':t.status==='On Leave'?'#fef3c7':'#fee2e2';
                return (
                  <button key={t.id} onMouseDown={()=>{ setSearch(`${t.fn} ${t.ln}`); setSearchOpen(false); }}
                    style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background 120ms',borderBottom:'1px solid #f8fafc'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0f6ff'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {/* avatar */}
                    <div style={{width:36,height:36,borderRadius:10,flexShrink:0,overflow:'hidden',background:'linear-gradient(135deg,#059669,#0891b2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,color:'#fff'}}>
                      {photo ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ini}
                    </div>
                    {/* info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.fn} {t.ln}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>{t.su||'—'}{t.cls?` · ${t.cls}`:''}{t.empId?` · ${t.empId}`:''}</div>
                    </div>
                    {/* status badge */}
                    <span style={{fontSize:10,fontWeight:700,flexShrink:0,padding:'3px 8px',borderRadius:20,background:statusBg,color:statusColor}}>
                      {t.status||'Active'}
                    </span>
                  </button>
                );
              }) : (
                <div style={{padding:'20px 16px',textAlign:'center'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#ecfdf5,#d1fae5)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                    <span className="material-symbols-outlined" style={{fontSize:22,color:'#059669',fontVariationSettings:"'FILL' 0,'wght' 300"}}>manage_search</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginBottom:2}}>No faculty match</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>"{search}"</div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Status filter pills */}
        {['','Active','On Leave','Resigned'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{padding:'8px 18px',borderRadius:24,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 150ms',
              background: filterStatus===s ? '#1960a3' : '#f1f5f9',
              color: filterStatus===s ? '#fff' : '#64748b',
              boxShadow: filterStatus===s ? '0 2px 8px rgba(25,96,163,0.25)' : 'none',
            }}>
            {s||'All Faculty'}
          </button>
        ))}
        {/* result count */}
        {(search||filterStatus) && (
          <span style={{fontSize:12,color:'#64748b',marginLeft:4}}>
            {filtered.length} result{filtered.length!==1?'s':''}
            <button onClick={()=>{setSearch('');setFilterStatus('');}} style={{marginLeft:8,fontSize:11,color:'#ef4444',background:'#fee2e2',border:'none',borderRadius:8,padding:'3px 8px',cursor:'pointer',fontWeight:600}}>Clear</button>
          </span>
        )}
      </div>

      {/* Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {filtered.map((t, i) => {
            const name = t.fn + ' ' + t.ln;
            const ini = name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
            const pillCls = SUBJ_PILLS[i % SUBJ_PILLS.length];
            const accentCls = ACCENTS[i % ACCENTS.length];
            const classTaught = db.students.filter(s => s.cls === t.cls).length;
            return (
              <div key={t.id} className="group bg-surface-container-lowest p-7 rounded-3xl shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
                {/* Decorative circle */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${accentCls} rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110`}></div>

                {/* Top row: avatar + name + subject pill */}
                <div className="flex items-start justify-between relative mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex-shrink-0 overflow-hidden shadow-sm">
                      {(db.tphotos||{})[t.id]
                        ? <img src={(db.tphotos||{})[t.id]} alt={t.fn} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary bg-primary/8">{ini}</div>
                      }
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-headline text-primary leading-tight">{name}</h3>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wide mt-0.5">
                        {t.qual || (t.cls ? 'Class Teacher · '+t.cls : 'Faculty')}
                      </p>
                    </div>
                  </div>
                  {t.su && (
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest flex-shrink-0 ${pillCls}`}>
                      {t.su}
                    </span>
                  )}
                </div>

                {/* Contact info */}
                <div className="space-y-2.5 mb-5">
                  {t.em && (
                    <div className="flex items-center gap-2.5 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[16px]">alternate_email</span>
                      <span className="truncate">{t.em}</span>
                    </div>
                  )}
                  {(t.ph || t.empId) && (
                    <div className="flex items-center gap-2.5 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[16px]">{t.ph ? 'call' : 'badge'}</span>
                      <span>{t.ph || 'ID: '+t.empId}</span>
                    </div>
                  )}
                  {t.sal > 0 && (
                    <div className="flex items-center gap-2.5 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[16px]">payments</span>
                      <span>₹{Number(t.sal).toLocaleString('en-IN')}/mo</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-surface-container-high flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-tighter text-outline font-bold mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusDot(t.status)}`}></span>
                      <span className="text-xs font-bold text-primary">{statusLabel(t.status)}{t.cls ? ' · '+t.cls : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(t)} title="Edit"
                      className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary hover:text-white transition-all text-on-surface-variant border-0 cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => delTea(t.id)} title="Delete"
                      className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-error-container hover:text-error transition-all text-on-surface-variant border-0 cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{background:'#fff',borderRadius:24,padding:'56px 24px',textAlign:'center',marginBottom:40,boxShadow:'0 1px 8px rgba(0,31,77,0.06)'}}>
          <div style={{width:88,height:88,borderRadius:24,background:'linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 4px 20px rgba(5,150,105,0.15)'}}>
            <span className="material-symbols-outlined" style={{fontSize:42,color:'#059669',fontVariationSettings:"'FILL' 0,'wght' 300"}}>groups</span>
          </div>
          <div style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:6,fontFamily:'Manrope,sans-serif'}}>No faculty found</div>
          <div style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>
            {search || filterStatus ? 'Try adjusting your search or filters' : 'Add your first teacher to get started'}
          </div>
          <button onClick={openAdd} style={{padding:'10px 24px',background:'linear-gradient(135deg,#059669,#0891b2)',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 12px rgba(5,150,105,0.3)',fontFamily:'inherit'}}>
            <span style={{display:'flex',alignItems:'center',gap:6}}>
              <span className="material-symbols-outlined" style={{fontSize:16}}>person_add</span>
              Add First Teacher
            </span>
          </button>
        </div>
      )}

      {/* Summary table */}
      {db.teachers.length > 0 && (
        <div>
          <h2 className="text-2xl font-extrabold font-headline text-primary tracking-tight mb-5">All Faculty</h2>
          <div className="bg-surface-container-low rounded-3xl p-1 overflow-hidden">
            <TblWrap>
              <table>
                <thead>
                  <tr>
                    <th className="px-6 py-5">Faculty Name</th>
                    <th className="px-6 py-5">Emp ID</th>
                    <th className="px-6 py-5">Subject</th>
                    <th className="px-6 py-5">Class</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5">Portal</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.teachers.map((t, i) => (
                    <tr key={t.id} className="hover:bg-surface-container-high transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
                            {(db.tphotos||{})[t.id]
                              ? <img src={(db.tphotos||{})[t.id]} alt={t.fn} className="w-full h-full object-cover" />
                              : <Avatar name={t.fn+' '+t.ln} idx={i+3} />
                            }
                          </div>
                          <div>
                            <div className="font-bold text-primary">{t.fn} {t.ln}</div>
                            <div className="text-[10px] text-outline">{t.em||''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant">{t.empId||'—'}</td>
                      <td className="px-6 py-5 text-on-surface-variant">{t.su||'—'}</td>
                      <td className="px-6 py-5 text-on-surface-variant">{t.cls||'—'}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                          t.status==='Active' ? 'bg-secondary-container/30 text-secondary' :
                          t.status==='On Leave' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' :
                          'bg-error-container text-error'}`}>
                          {t.status||'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {t.puser ? <Badge color="blue">{t.puser}</Badge> : <span className="text-outline text-xs">—</span>}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button onClick={() => openEdit(t)}
                          className="p-2 rounded-lg text-outline hover:text-primary transition-all border-0 bg-transparent cursor-pointer">
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TblWrap>
          </div>
        </div>
      )}

      <Modal open={open} onClose={()=>setOpen(false)} title={(editId?'Edit':'Add') + ' Teacher'}>
        <div className="mb-5">
          <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 pb-2" style={{borderBottom:'1px solid rgba(0,32,69,0.1)'}}>Profile Photo</div>
          <PhotoZone photo={tphoto} onUpload={setTphoto} onClear={()=>setTphoto(null)} />
        </div>
        <Grid><SecLabel>Details</SecLabel>
          <Field label="First Name *"><Input value={form.fn||''} onChange={sf('fn')}/></Field>
          <Field label="Last Name *"><Input value={form.ln||''} onChange={sf('ln')}/></Field>
          <Field label="Emp ID"><Input value={form.empId||''} onChange={sf('empId')} placeholder="T001"/></Field>
          <Field label="Subject"><Input value={form.su||''} onChange={sf('su')} placeholder="Mathematics"/></Field>
          <Field label="Class Teacher"><Select value={form.cls||''} onChange={sf('cls')}><option value="">—</option>{classes.map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Qualification"><Input value={form.qual||''} onChange={sf('qual')} placeholder="M.Sc, B.Ed"/></Field>
          <Field label="Phone"><Input value={form.ph||''} onChange={sf('ph')}/></Field>
          <Field label="Email"><Input type="email" value={form.em||''} onChange={sf('em')}/></Field>
          <Field label="Salary ₹/mo"><Input type="number" value={form.sal||''} onChange={sf('sal')}/></Field>
          <Field label="Joining Date"><Input type="date" value={form.doj||''} onChange={sf('doj')}/></Field>
          <Field label="Status"><Select value={form.status||'Active'} onChange={sf('status')}><option>Active</option><option>On Leave</option><option>Resigned</option></Select></Field>
          <Field label="Blood Group"><Select value={form.blood||''} onChange={sf('blood')}><option value="">—</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b}>{b}</option>)}</Select></Field>
          <SecLabel>Portal Access</SecLabel>
          <Field label="Username"><Input value={form.puser||''} onChange={sf('puser')} placeholder="Leave blank = no access"/></Field>
          <Field label="Password"><Input type="password" value={form.ppass||''} onChange={sf('ppass')} placeholder="Min 6 chars"/></Field>
        </Grid>
        <ModalFooter><Btn onClick={()=>setOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={saveTea}>Save</Btn></ModalFooter>
      </Modal>
    </div>
  );
}

function Classes({ db, save }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionMenu, setActionMenu] = useState(null); // student id with open menu
  const [perfModal, setPerfModal] = useState(null);   // { student }
  const [perfForm, setPerfForm] = useState({});
  const sf = k => v => setForm(f=>({...f,[k]:v}));

  const openAdd = () => { setForm({}); setEditId(null); setOpen(true); };
  const openEdit = (c) => { setForm({...c}); setEditId(c.id); setOpen(true); };

  const DEFAULT_CLASSES = [
    { name:'Playgroup', subs:'Hindi, English, Mathematics, Rhymes' },
    { name:'Nursery',   subs:'Hindi, English, Mathematics, Rhymes' },
    { name:'L.K.G.',    subs:'Hindi, English, Mathematics, Rhymes' },
    { name:'U.K.G.',    subs:'Hindi, English, Mathematics, Rhymes' },
    { name:'1st',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'2nd',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'3rd',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'4th',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'5th',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'6th',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'7th',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
    { name:'8th',       subs:'English, Hindi, Mathematics, Science, S.St., Computer' },
  ];

  const addDefaultClasses = () => {
    const existing = new Set(db.classes.map(c => c.name));
    const toAdd = DEFAULT_CLASSES.filter(c => !existing.has(c.name))
      .map(c => ({ id: 'C' + uid(), ...c }));
    if (!toAdd.length) { toast('All default classes already exist'); return; }
    save({ ...db, classes: [...db.classes, ...toAdd] });
    toast(`Added ${toAdd.length} default class${toAdd.length > 1 ? 'es' : ''}`);
  };

  // Auto-fill subjects when class name is typed
  const autoSubjects = (name) => {
    const lower = name.toLowerCase().trim();
    const earlyClasses = ['playgroup','nursery','l.k.g.','lkg','u.k.g.','ukg'];
    if (earlyClasses.some(n => lower === n || lower.replace(/\./g,'') === n.replace(/\./g,'')))
      return 'Hindi, English, Mathematics, Rhymes';
    const match = lower.match(/^(\d+)(st|nd|rd|th)?$/);
    if (match && parseInt(match[1]) >= 1 && parseInt(match[1]) <= 8)
      return 'English, Hindi, Mathematics, Science, S.St., Computer';
    return null;
  };

  const saveCls = () => {
    if (!form.name?.trim()) { toast('Name required','err'); return; }
    if (editId) {
      const updated = { ...form, id: editId };
      save({ ...db, classes: db.classes.map(c => c.id === editId ? updated : c) });
      setSelected(updated);
      toast('Class updated');
    } else {
      save({ ...db, classes:[...db.classes, { id:'C'+uid(), ...form }] });
      toast('Class added');
    }
    setForm({}); setEditId(null); setOpen(false);
  };
  const delCls = (id) => {
    if (!window.confirm('Delete this class?')) return;
    save({ ...db, classes:db.classes.filter(c=>c.id!==id) });
    if (selected?.id === id) setSelected(null);
    toast('Class removed','err');
  };

  const totalStudents = db.students.length;
  const totalTeachers = db.teachers.length;

  // Auto-select first class
  const activeClass = selected || db.classes[0] || null;
  const activeStudents = activeClass ? db.students.filter(s => s.cls === activeClass.name) : [];
  const activeTeacher = activeClass ? db.teachers.find(t => t.cls === activeClass.name) : null;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-extrabold text-primary tracking-tight font-headline mb-2">Class Management</h2>
          <p className="text-on-surface-variant font-medium">Coordinate class rosters, faculty assignments, and administrative settings.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={addDefaultClasses}
            className="flex items-center gap-2 bg-surface-container-lowest text-primary px-5 py-3 rounded-xl font-bold shadow-sm border border-outline-variant hover:-translate-y-0.5 transition-all cursor-pointer text-sm">
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            Add Default Classes
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold shadow-xl shadow-primary/10 hover:-translate-y-0.5 transition-all border-0 cursor-pointer font-sans text-sm">
            <span className="material-symbols-outlined text-lg">add</span>
            Create New Class
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Classes</p>
          <p className="text-3xl font-extrabold text-primary font-headline">{db.classes.length}</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Students</p>
          <p className="text-3xl font-extrabold text-primary font-headline">{totalStudents}</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-on-tertiary-container">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Teachers</p>
          <p className="text-3xl font-extrabold text-primary font-headline">{totalTeachers}</p>
        </div>
      </div>

      {!db.classes.length ? (
        <div className="bg-surface-container-lowest rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-4 block">class</span>
          <p className="text-lg font-bold text-primary font-headline mb-1">No classes yet</p>
          <p className="text-sm text-on-surface-variant mb-6">Create your first class to get started.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={addDefaultClasses}
              className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl font-bold text-sm shadow-sm border-0 cursor-pointer font-sans">
              <span className="material-symbols-outlined text-lg">auto_awesome</span> Add Default Classes
            </button>
            <button onClick={() => { setForm({}); setOpen(true); }}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 border-0 cursor-pointer font-sans">
              <span className="material-symbols-outlined text-lg">add</span> Create New Class
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Class List */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Active Classes</h3>
            {db.classes.map((c, i) => {
              const sc = db.students.filter(s => s.cls === c.name).length;
              const tea = db.teachers.find(t => t.cls === c.name);
              const isActive = activeClass?.id === c.id;
              return (
                <div key={c.id} onClick={() => setSelected(c)}
                  className={`group relative p-6 rounded-2xl cursor-pointer transition-all ${isActive
                    ? 'bg-surface-container-lowest shadow-sm border-l-4 border-primary'
                    : 'bg-surface-container-low hover:bg-surface-container-lowest border-l-4 border-transparent'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={`text-2xl font-black font-headline transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>{c.name}</h4>
                      <p className="text-sm text-on-surface-variant">{c.room ? `Room ${c.room}` : 'No room assigned'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-slate-500'}`}>
                      {c.stream || 'General'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-on-primary flex-shrink-0">
                      {tea ? (tea.fn[0]||'') + (tea.ln[0]||'') : '?'}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Class Teacher</p>
                      <p className="text-sm font-bold text-primary">{tea ? tea.fn + ' ' + tea.ln : 'Not assigned'}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-slate-500">Students</p>
                      <p className="text-sm font-bold text-primary">{sc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Detail Panel */}
          {activeClass && (
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
              {/* Detail Header */}
              <div className="p-8 bg-primary text-on-primary rounded-t-3xl">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-blue-300 text-xs font-bold uppercase tracking-[0.2em] mb-2 block">Viewing Details</span>
                    <h3 className="text-5xl font-black font-headline leading-tight">{activeClass.name}</h3>
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-300 text-sm">groups</span>
                        <span className="text-sm font-medium">{activeStudents.length} Students</span>
                      </div>
                      {activeClass.room && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-300 text-sm">meeting_room</span>
                          <span className="text-sm font-medium">Room {activeClass.room}</span>
                        </div>
                      )}
                      {activeClass.stream && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-300 text-sm">school</span>
                          <span className="text-sm font-medium">{activeClass.stream}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(activeClass); }}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border-0 cursor-pointer text-on-primary">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => delCls(activeClass.id)}
                      className="p-3 bg-white/10 hover:bg-error/30 rounded-xl transition-colors border-0 cursor-pointer text-on-primary">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              {activeClass.subs && (
                <div className="px-8 pt-6 pb-4 border-b border-surface-container-high bg-surface-container-lowest">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {activeClass.subs.split(',').map(s => s.trim()).filter(Boolean).map(sub => (
                      <span key={sub} className="bg-primary/8 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/15">{sub}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Roster */}
              <div className="flex-1 overflow-y-auto p-8 bg-surface" onClick={() => setActionMenu(null)}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Student Roster</p>
                {activeStudents.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant text-sm">No students enrolled in this class.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em] border-b border-surface-container">
                        <th className="py-4 font-semibold px-2">Roll No.</th>
                        <th className="py-4 font-semibold px-4">Student Name</th>
                        <th className="py-4 font-semibold px-4">Attendance</th>
                        <th className="py-4 font-semibold px-4">Performance</th>
                        <th className="py-4 font-semibold text-right px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {activeStudents.map((s, idx) => {
                        // Real-time attendance from db.att
                        let present = 0, total = 0;
                        Object.values(db.att).forEach(day => {
                          if (day[s.id] !== undefined) {
                            total++;
                            if (day[s.id] === 'P' || day[s.id] === 'L') present++;
                          }
                        });
                        const attPct = total > 0 ? Math.round(present / total * 100) : null;
                        const attBarColor = attPct === null ? 'bg-surface-container' : attPct >= 90 ? 'bg-secondary' : attPct >= 75 ? 'bg-on-tertiary-container' : 'bg-error';
                        const attTextColor = attPct === null ? 'text-outline' : attPct >= 90 ? 'text-secondary' : attPct >= 75 ? 'text-on-tertiary-fixed-variant' : 'text-error';

                        // Performance: use stored override or derive from attendance
                        const perf = s.perf || (attPct === null ? null : attPct >= 90 ? 'Exceeds' : attPct >= 75 ? 'Meeting' : 'At Risk');
                        const perfStyle = perf === 'Exceeds' ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : perf === 'Meeting' ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : perf === 'At Risk' ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container text-outline';

                        return (
                          <tr key={s.id} className="group hover:bg-surface-container-low transition-colors">
                            <td className="py-5 font-headline font-bold text-primary px-2 text-sm">{s.roll || (idx + 1)}</td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">
                                  {(s.fn[0]||'') + (s.ln[0]||'')}
                                </div>
                                <span className="font-semibold text-primary text-sm">{s.fn} {s.ln}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${attBarColor}`} style={{width: attPct !== null ? attPct + '%' : '0%'}}></div>
                                </div>
                                <span className={`text-[10px] font-bold ${attTextColor}`}>{attPct !== null ? attPct + '%' : '—'}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              {perf ? (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${perfStyle}`}>{perf}</span>
                              ) : (
                                <span className="text-[10px] text-outline">No data</span>
                              )}
                            </td>
                            <td className="py-5 text-right px-2 relative">
                              <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === s.id ? null : s.id); }}
                                className="text-slate-400 hover:text-primary border-0 bg-transparent cursor-pointer p-1 rounded transition-colors">
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>
                              {actionMenu === s.id && (
                                <div className="absolute right-2 top-10 z-50 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container-high w-44 py-1 text-left" onClick={e => e.stopPropagation()}>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-outline px-4 pt-2 pb-1">Set Performance</p>
                                  {['Exceeds','Meeting','At Risk'].map(p => (
                                    <button key={p} onClick={() => {
                                      const updated = db.students.map(x => x.id === s.id ? {...x, perf: p} : x);
                                      save({...db, students: updated});
                                      setActionMenu(null);
                                      toast('Performance updated');
                                    }} className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-low transition-colors border-0 bg-transparent cursor-pointer ${perf === p ? 'text-primary' : 'text-on-surface'}`}>
                                      {p === 'Exceeds' ? '⭐ Exceeds' : p === 'Meeting' ? '✓ Meeting' : '⚠ At Risk'}
                                    </button>
                                  ))}
                                  <div className="border-t border-surface-container-high my-1"></div>
                                  <button onClick={() => {
                                    const updated = db.students.map(x => x.id === s.id ? {...x, perf: undefined} : x);
                                    save({...db, students: updated});
                                    setActionMenu(null);
                                    toast('Reset to auto');
                                  }} className="w-full text-left px-4 py-2 text-xs font-semibold text-outline hover:bg-surface-container-low transition-colors border-0 bg-transparent cursor-pointer">
                                    ↺ Reset to Auto
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? 'Edit Class' : 'Create New Class'}>
        <Grid>
          <Field label="Class Name *"><Input value={form.name||''} onChange={v => {
            sf('name')(v);
            if (!editId && !form.subs) {
              const auto = autoSubjects(v);
              if (auto) setForm(f => ({...f, name: v, subs: auto}));
            }
          }} placeholder="e.g. L.K.G. or 5th"/></Field>
          <Field label="Stream"><Input value={form.stream||''} onChange={sf('stream')} placeholder="Science"/></Field>
          <Field label="Room"><Input value={form.room||''} onChange={sf('room')} placeholder="104"/></Field>
          <Field label="Strength"><Input type="number" value={form.str||''} onChange={sf('str')} placeholder="45"/></Field>
          <Span><Field label="Subjects (comma separated)"><Input value={form.subs||''} onChange={sf('subs')} placeholder="Maths, Science, English, Hindi, SST"/></Field></Span>
        </Grid>
        <ModalFooter><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={saveCls}>Save</Btn></ModalFooter>
      </Modal>
    </div>
  );
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TTC_COLORS = [
  {bg:'rgba(0,32,69,0.08)',fg:'#002045',ring:'rgba(0,32,69,0.25)'},
  {bg:'rgba(25,96,163,0.10)',fg:'#1960a3',ring:'rgba(25,96,163,0.25)'},
  {bg:'rgba(5,150,105,0.10)',fg:'#059669',ring:'rgba(5,150,105,0.25)'},
  {bg:'rgba(180,83,9,0.10)',fg:'#b45309',ring:'rgba(180,83,9,0.25)'},
  {bg:'rgba(124,58,237,0.10)',fg:'#7c3aed',ring:'rgba(124,58,237,0.25)'},
  {bg:'rgba(8,145,178,0.10)',fg:'#0891b2',ring:'rgba(8,145,178,0.25)'},
  {bg:'rgba(186,26,26,0.10)',fg:'#ba1a1a',ring:'rgba(186,26,26,0.25)'},
];

function Timetable({ db, save }) {
  const [cls, setCls] = useState('');
  const [open, setOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [form, setForm] = useState({ ty:'subject', day:'Monday' });
  const [editId, setEditId] = useState(null);
  const [slForm, setSlForm] = useState({l:'',s:'',e:''});
  const sf = k => v => setForm(f=>({...f,[k]:v}));
  const classes = db.classes.map(c=>c.name);
  const pers = db.tt.filter(p=>p.cls===cls);
  const scm = {};let ci=0;
  pers.forEach(p=>{ if(p.su&&!scm[p.su]){scm[p.su]=ci%TTC_COLORS.length;ci++;} });

  const savePer = () => {
    if (!form.cls) { toast('Select class','err'); return; }
    if (form.ty==='subject' && !form.su?.trim()) { toast('Subject required','err'); return; }
    if (!form.sid) { toast('Select slot','err'); return; }
    const id = editId || 'P'+uid();
    const newTT = db.tt.filter(p=>!(p.cls===form.cls&&p.day===form.day&&p.sid===form.sid&&(!editId||p.id!==editId)));
    newTT.push({ id, cls:form.cls, day:form.day, sid:form.sid, ty:form.ty, su:form.ty==='subject'?form.su:form.ty, tea:form.tea||'', rm:form.rm||'' });
    save({ ...db, tt:newTT });
    if(form.cls!==cls) setCls(form.cls);
    setOpen(false); setEditId(null); toast('Saved');
  };
  const delPer = () => {
    if (!editId) return;
    save({...db, tt: db.tt.filter(p=>p.id!==editId)});
    setOpen(false); setEditId(null); toast('Period removed','err');
  };
  const editPer = (p) => { setForm({...p}); setEditId(p.id); setOpen(true); };
  const qper = (day,sid) => { setForm({ty:'subject',day,sid,cls}); setEditId(null); setOpen(true); };
  const clearTT = () => { if(!cls){toast('Select class','err');return;} if(!window.confirm('Clear all periods for this class?'))return; save({...db,tt:db.tt.filter(p=>p.cls!==cls)}); toast('Cleared','err'); };

  const addSlot = () => {
    if(!slForm.l||!slForm.s||!slForm.e){toast('Fill all fields','err');return;}
    save({...db,slots:[...db.slots,{id:'SL'+uid(),l:slForm.l,s:slForm.s,e:slForm.e}]});
    setSlForm({l:'',s:'',e:''});
  };
  const saveEditSlot = () => {
    if(!editSlot||!editSlot.l||!editSlot.s||!editSlot.e){toast('Fill all fields','err');return;}
    save({...db,slots:db.slots.map(sl=>sl.id===editSlot.id?editSlot:sl)});
    setEditSlot(null); toast('Slot updated');
  };
  const delSlot = (id) => save({...db,slots:db.slots.filter(sl=>sl.id!==id)});
  const resetSlots = () => { if(!window.confirm('Reset to defaults?'))return; save({...db,slots:[{id:'1',l:'Period 1',s:'08:00',e:'08:45'},{id:'2',l:'Period 2',s:'08:45',e:'09:30'},{id:'3',l:'Break',s:'09:30',e:'10:00'},{id:'4',l:'Period 3',s:'10:00',e:'10:45'},{id:'5',l:'Period 4',s:'10:45',e:'11:30'},{id:'6',l:'Lunch',s:'11:30',e:'12:15'},{id:'7',l:'Period 5',s:'12:15',e:'13:00'},{id:'8',l:'Period 6',s:'13:00',e:'13:45'}]}); };

  const isBreakSlot = (sl) => /break|lunch|recess|assembly/i.test(sl.l);
  const activeClass = db.classes.find(c=>c.name===cls);
  const stuCount = cls ? db.students.filter(s=>s.cls===cls).length : 0;
  const subCount = Object.keys(scm).length;
  const upcomingExam = db.exams.find(e=>e.st==='Upcoming'&&(!e.cls||e.cls===cls));
  const inCls = 'px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all';

  return (
    <div>
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight mb-2">Class Timetable</h1>
          <p className="text-on-surface-variant font-medium">Academic Session {db.settings.year||'2025-26'}</p>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Class</label>
            <select value={cls} onChange={e=>setCls(e.target.value)}
              className="bg-surface-container-lowest border-0 rounded-xl px-4 py-2.5 font-semibold text-primary shadow-sm ring-1 ring-outline-variant/20 focus:ring-primary focus:outline-none transition-all text-sm cursor-pointer">
              <option value="">Select Class</option>
              {classes.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{setForm({ty:'subject',day:'Monday',cls});setEditId(null);setOpen(true);}}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:-translate-y-0.5 transition-all border-0 cursor-pointer shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-sm">add</span> Add Period
            </button>
            <button onClick={()=>setSlotsOpen(true)}
              className="bg-surface-container-lowest text-primary px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-low transition-all border-0 cursor-pointer shadow-sm ring-1 ring-outline-variant/20">
              <span className="material-symbols-outlined text-sm">schedule</span> Time Slots
            </button>
            {cls && <button onClick={clearTT}
              className="bg-error-container text-error px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-error/15 transition-all border-0 cursor-pointer">
              <span className="material-symbols-outlined text-sm">delete_sweep</span> Clear
            </button>}
          </div>
        </div>
      </section>

      {/* Hero Focus Card */}
      {cls && (
        <div className="mb-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-8 text-on-primary shadow-xl shadow-primary/20">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <span className="material-symbols-outlined text-5xl">schedule</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 mb-1 block">Class Overview</span>
                  <h2 className="text-3xl font-extrabold font-headline mt-1">{cls}</h2>
                  <p className="text-blue-200 font-medium mt-1">
                    {activeClass?.stream||'General'}{activeClass?.room ? ` • Room ${activeClass.room}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-2xl font-black font-headline">{stuCount}</p>
                  <p className="text-xs text-blue-300 font-medium">Students</p>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="text-center">
                  <p className="text-2xl font-black font-headline">{pers.length}</p>
                  <p className="text-xs text-blue-300 font-medium">Periods</p>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="text-center">
                  <p className="text-2xl font-black font-headline">{subCount}</p>
                  <p className="text-xs text-blue-300 font-medium">Subjects</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      {!cls ? (
        <div className="bg-surface-container-lowest rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-4 block">schedule</span>
          <p className="text-lg font-bold text-primary font-headline mb-1">Select a class to view timetable</p>
          <p className="text-sm text-on-surface-variant">Choose a class from the dropdown above.</p>
        </div>
      ) : !db.slots.length ? (
        <div className="bg-surface-container-lowest rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-4 block">timer</span>
          <p className="text-lg font-bold text-primary font-headline mb-1">No time slots configured</p>
          <button onClick={resetSlots} className="mt-4 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm border-0 cursor-pointer">Load Default Slots</button>
        </div>
      ) : (
        <div className="rounded-3xl overflow-hidden shadow-sm border border-outline-variant/10 bg-surface-container-low mb-10">
          <div style={{display:'grid', gridTemplateColumns:'100px repeat(6,1fr)'}}>
            <div className="h-20 flex items-center justify-center bg-surface-container text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
              Periods
            </div>
            {DAYS.map(day=>(
              <div key={day} className="h-20 flex flex-col items-center justify-center border-b border-outline-variant/20 bg-surface-container-lowest">
                <span className="text-xs font-bold text-on-surface-variant">{day.slice(0,3).toUpperCase()}</span>
              </div>
            ))}
            {db.slots.map(sl=>{
              const isBreak = isBreakSlot(sl);
              return (
                <React.Fragment key={sl.id}>
                  <div className={`flex flex-col items-center justify-center border-b border-outline-variant/10 px-2 py-3 ${isBreak?'bg-tertiary-fixed/10':'bg-surface-container/30'}`}>
                    <span className={`font-bold text-xs ${isBreak?'text-on-tertiary-fixed-variant italic':'text-primary'}`}>{sl.l}</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">{sl.s}–{sl.e}</span>
                  </div>
                  {DAYS.map(day=>{
                    const p=pers.find(x=>x.day===day&&x.sid===sl.id);
                    if(isBreak&&!p){
                      return <div key={day} className="border-b border-outline-variant/10 bg-tertiary-fixed/5 p-2 flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-on-tertiary-fixed-variant tracking-widest opacity-40">{sl.l}</span>
                      </div>;
                    }
                    if(p){
                      const isSpecial=p.ty==='break'||p.ty==='assembly'||p.ty==='free';
                      const col=isSpecial?null:TTC_COLORS[scm[p.su]??0];
                      const lb=p.ty==='break'?'Break':p.ty==='assembly'?'Assembly':p.ty==='free'?'Free Period':p.su||'—';
                      return <div key={day} className="border-b border-outline-variant/10 bg-surface-container-lowest p-2">
                        <div onClick={()=>editPer(p)} className="h-[80px] rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:ring-2 hover:ring-primary/20"
                          style={col?{background:col.bg,color:col.fg}:{background:'rgba(241,244,246,0.8)',color:'var(--di)'}}>
                          <p className="text-xs font-bold leading-tight">{lb}</p>
                          {p.tea&&<p className="text-[10px] opacity-70">{p.tea.split(' ').slice(-1)[0]}</p>}
                          {p.rm&&<p className="text-[10px] opacity-50">Rm {p.rm}</p>}
                        </div>
                      </div>;
                    }
                    return <div key={day} className="border-b border-outline-variant/10 bg-surface-container-lowest p-2">
                      <div onClick={()=>qper(day,sl.id)} className="h-[80px] rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center cursor-pointer hover:border-primary/30 transition-all group">
                        <span className="material-symbols-outlined text-outline-variant/50 group-hover:text-primary/40 text-xl transition-colors">add</span>
                      </div>
                    </div>;
                  })}
                </React.Fragment>
              );
            })}
          </div>
          {Object.keys(scm).length>0&&(
            <div className="flex gap-4 flex-wrap px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/10">
              {Object.keys(scm).map(su=>{
                const col=TTC_COLORS[scm[su]];
                return <div key={su} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <div className="w-3 h-3 rounded" style={{background:col.bg,border:'1.5px solid '+col.fg}}></div>{su}
                </div>;
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer Stats */}
      {cls&&(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Class Overview</p>
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-black text-primary font-headline">{stuCount}</p><p className="text-xs text-on-surface-variant">Students Enrolled</p></div>
              <div className="h-10 w-px bg-outline-variant/30"></div>
              <div><p className="text-2xl font-black text-primary font-headline">{subCount}</p><p className="text-xs text-on-surface-variant">Subjects Weekly</p></div>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-primary-container text-on-primary-container h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined">event_note</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Upcoming Exam</p>
              <p className="text-xs text-on-surface-variant">{upcomingExam?upcomingExam.name+(upcomingExam.dt?' — '+upcomingExam.dt:''):'No upcoming exams'}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-tertiary-fixed text-on-tertiary-fixed h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Timetable Status</p>
              <p className="text-xs text-on-surface-variant">{pers.length} periods configured for {cls}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Period Modal */}
      <Modal open={open} onClose={()=>{setOpen(false);setEditId(null);}} title={editId?'Edit Period':'Add Period'}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Class *"><Select value={form.cls||''} onChange={sf('cls')}><option value="">—</option>{classes.map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Day *"><Select value={form.day||'Monday'} onChange={sf('day')}>{DAYS.map(d=><option key={d}>{d}</option>)}</Select></Field>
          <Field label="Time Slot *"><Select value={form.sid||''} onChange={sf('sid')}><option value="">—</option>{db.slots.map(sl=><option key={sl.id} value={sl.id}>{sl.l} ({sl.s}–{sl.e})</option>)}</Select></Field>
          <Field label="Type"><Select value={form.ty||'subject'} onChange={sf('ty')}><option value="subject">Subject</option><option value="break">Break</option><option value="assembly">Assembly</option><option value="free">Free Period</option></Select></Field>
          {(form.ty==='subject'||!form.ty)&&<>
            <Field label="Subject *"><Input value={form.su||''} onChange={sf('su')} placeholder="Mathematics"/></Field>
            <Field label="Teacher"><Select value={form.tea||''} onChange={sf('tea')}><option value="">—</option>{db.teachers.map(t=><option key={t.id} value={t.fn+' '+t.ln}>{t.fn} {t.ln}{t.su?' ('+t.su+')':''}</option>)}</Select></Field>
          </>}
          <Field label="Room"><Input value={form.rm||''} onChange={sf('rm')} placeholder="Room 101"/></Field>
        </div>
        <ModalFooter>
          {editId&&<Btn variant="danger" onClick={delPer}>Delete</Btn>}
          <Btn onClick={()=>{setOpen(false);setEditId(null);}}>Cancel</Btn>
          <Btn variant="primary" onClick={savePer}>Save</Btn>
        </ModalFooter>
      </Modal>

      {/* Time Slots Modal */}
      <Modal open={slotsOpen} onClose={()=>{setSlotsOpen(false);setEditSlot(null);}} title="Manage Time Slots">
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {db.slots.map(sl=>(
            <div key={sl.id}>
              {editSlot?.id===sl.id?(
                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-xl ring-1 ring-primary/20">
                  <input value={editSlot.l} onChange={e=>setEditSlot(s=>({...s,l:e.target.value}))} placeholder="Label" className={inCls+' flex-1 min-w-0'}/>
                  <input type="time" value={editSlot.s} onChange={e=>setEditSlot(s=>({...s,s:e.target.value}))} className={inCls+' w-28'}/>
                  <input type="time" value={editSlot.e} onChange={e=>setEditSlot(s=>({...s,e:e.target.value}))} className={inCls+' w-28'}/>
                  <button onClick={saveEditSlot} className="px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold border-0 cursor-pointer flex-shrink-0">Save</button>
                  <button onClick={()=>setEditSlot(null)} className="px-3 py-2 bg-surface-container text-on-surface rounded-lg text-xs font-bold border-0 cursor-pointer flex-shrink-0">✕</button>
                </div>
              ):(
                <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                  <div className="flex-1">
                    <span className="font-semibold text-on-surface text-sm">{sl.l}</span>
                    <span className="text-on-surface-variant text-xs ml-2">{sl.s}–{sl.e}</span>
                  </div>
                  <button onClick={()=>setEditSlot({...sl})} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg border-0 bg-transparent cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={()=>delSlot(sl.id)} className="p-1.5 text-error hover:bg-error-container rounded-lg border-0 bg-transparent cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {!db.slots.length&&<p className="text-sm text-on-surface-variant text-center py-4">No slots yet.</p>}
        </div>
        <div className="border-t border-surface-container-high pt-4 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Add New Slot</p>
          <div className="flex gap-2 flex-wrap">
            <input value={slForm.l} onChange={e=>setSlForm(f=>({...f,l:e.target.value}))} placeholder="Label (e.g. Period 1)" className={inCls+' flex-1 min-w-[120px]'}/>
            <input type="time" value={slForm.s} onChange={e=>setSlForm(f=>({...f,s:e.target.value}))} className={inCls+' w-28'}/>
            <input type="time" value={slForm.e} onChange={e=>setSlForm(f=>({...f,e:e.target.value}))} className={inCls+' w-28'}/>
            <button onClick={addSlot} className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold border-0 cursor-pointer flex-shrink-0">Add</button>
          </div>
        </div>
        <ModalFooter>
          <Btn onClick={resetSlots}>Reset Defaults</Btn>
          <Btn variant="primary" onClick={()=>{setSlotsOpen(false);setEditSlot(null);}}>Done</Btn>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function Attendance({ db, save }) {
  const [tab, setTab] = useState(0); // 0=daily entry, 1=history/report
  const [cls, setCls] = useState('');
  const [dt, setDt] = useState(new Date().toISOString().split('T')[0]);
  const [attMap, setAttMap] = useState({});
  const [repCls, setRepCls] = useState('');
  const classes = db.classes.map(c => c.name);
  const students = db.students.filter(s => s.cls === cls);
  const saved = (db.att[dt] || {});

  useEffect(() => {
    const m = {};
    students.forEach(s => { m[s.id] = saved[s.id] || 'P'; });
    setAttMap(m);
  }, [cls, dt]);

  const saveAtt = () => {
    if (!cls || !dt) { toast('Select class and date', 'err'); return; }
    save({ ...db, att: { ...db.att, [dt]: { ...db.att[dt], ...attMap } } });
    toast('Attendance saved');
  };
  const allP = () => { const m = {}; students.forEach(s => { m[s.id] = 'P'; }); setAttMap(m); };

  const present = Object.values(attMap).filter(v => v === 'P').length;
  const absent  = Object.values(attMap).filter(v => v === 'A').length;
  const late    = Object.values(attMap).filter(v => v === 'L').length;
  const total   = students.length;
  const pct     = total > 0 ? ((present + late) / total * 100).toFixed(1) : '0.0';

  const inCls = 'w-full bg-surface-container-lowest border-0 rounded-lg py-3 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary/10 focus:outline-none text-sm';

  return (
    <div>
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Student Records</p>
          <h1 className="text-4xl font-extrabold text-primary font-headline tracking-tight">Daily Roll Call</h1>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-xl">
          <button onClick={() => setTab(0)}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all border-0 cursor-pointer ${tab === 0 ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary bg-transparent'}`}>
            Daily Entry
          </button>
          <button onClick={() => setTab(1)}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all border-0 cursor-pointer ${tab === 1 ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary bg-transparent'}`}>
            History
          </button>
        </div>
      </section>

      {tab === 0 ? (
        <>
          {/* Filters + Stats */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            {/* Filter Panel */}
            <div className="lg:col-span-4">
              <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Select Academic Grade</label>
                  <div className="relative">
                    <select value={cls} onChange={e => setCls(e.target.value)} className={inCls + ' appearance-none pr-10'}>
                      <option value="">— Select Class —</option>
                      {classes.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">expand_more</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Select Date</label>
                  <div className="relative">
                    <input type="date" value={dt} onChange={e => setDt(e.target.value)} className={inCls + ' pr-10'} />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">calendar_today</span>
                  </div>
                </div>
                {cls && (
                  <div className="pt-4 border-t border-outline-variant/20 flex items-start gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
                    <p className="text-xs leading-relaxed italic">
                      {students.length} students in {cls}. Mark attendance for {new Date(dt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Bento */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between group hover:bg-primary transition-colors duration-300 cursor-default">
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-3 rounded-full w-fit group-hover:bg-white/20 group-hover:text-white">groups</span>
                <div className="mt-8">
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest group-hover:text-white/70">Total Students</p>
                  <p className="text-3xl font-extrabold font-headline mt-1 text-primary group-hover:text-white">{total}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between group hover:bg-secondary-container transition-colors duration-300 cursor-default">
                <span className="material-symbols-outlined text-on-secondary-container bg-secondary-fixed p-3 rounded-full w-fit group-hover:bg-white/20">check_circle</span>
                <div className="mt-8">
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest group-hover:text-on-secondary-container/70">Present</p>
                  <p className="text-3xl font-extrabold font-headline mt-1 text-secondary group-hover:text-on-secondary-container">{String(present).padStart(2,'0')}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between group hover:bg-error-container transition-colors duration-300 cursor-default">
                <span className="material-symbols-outlined text-on-error-container bg-error-container p-3 rounded-full w-fit group-hover:bg-white/20">cancel</span>
                <div className="mt-8">
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest group-hover:text-on-error-container/70">Absent</p>
                  <p className="text-3xl font-extrabold font-headline mt-1 text-error group-hover:text-on-error-container">{String(absent).padStart(2,'0')}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between group hover:bg-primary-container transition-colors duration-300 cursor-default">
                <span className="material-symbols-outlined text-on-primary-fixed bg-primary-fixed p-3 rounded-full w-fit group-hover:bg-white/20 group-hover:text-white">analytics</span>
                <div className="mt-8">
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest group-hover:text-white/70">Attendance %</p>
                  <p className="text-3xl font-extrabold font-headline mt-1 text-primary group-hover:text-white">{pct}%</p>
                </div>
              </div>
            </div>
          </section>

          {/* Attendance Table */}
          <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
            <div className="p-8 flex items-center justify-between border-b border-surface-container-high">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-extrabold font-headline text-primary">Student Registry</h3>
                {cls && <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold tracking-widest uppercase rounded-full">{cls}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={allP}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors rounded-lg border-0 bg-transparent cursor-pointer">
                  <span className="material-symbols-outlined text-lg">done_all</span> All Present
                </button>
                <button onClick={saveAtt}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all border-0 cursor-pointer text-sm">
                  Submit Attendance
                </button>
              </div>
            </div>

            {!cls || !dt ? (
              <div className="p-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline mb-4 block">fact_check</span>
                <p className="text-lg font-bold text-primary font-headline mb-1">Select a class and date</p>
                <p className="text-sm text-on-surface-variant">Use the filters on the left to get started.</p>
              </div>
            ) : !students.length ? (
              <div className="p-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline mb-4 block">group_off</span>
                <p className="text-lg font-bold text-primary font-headline mb-1">No students in this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Roll No.</th>
                      <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Student Identity</th>
                      <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Gender / Class</th>
                      <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                      <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {students.map((s, idx) => {
                      const val = attMap[s.id] || 'P';
                      const photo = db.photos?.[s.id];
                      return (
                        <tr key={s.id} className="hover:bg-surface-container-low transition-colors duration-200">
                          <td className="px-8 py-6 font-headline font-bold text-on-surface">{s.roll || String(idx + 1).padStart(3, '0')}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-primary text-sm">
                                {photo
                                  ? <img src={photo} alt={s.fn} className="w-full h-full object-cover" />
                                  : (s.fn[0] || '') + (s.ln[0] || '')}
                              </div>
                              <div>
                                <p className="font-headline font-bold text-primary">{s.fn} {s.ln}</p>
                                <p className="text-xs text-on-surface-variant">{s.admno ? `Adm: ${s.admno}` : s.cls}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-on-surface-variant text-sm font-medium">{s.gn || 'Male'} / {s.cls}</td>
                          <td className="px-8 py-6">
                            <div className="flex gap-2">
                              {[['P','Present','bg-secondary-container text-on-secondary-container border-secondary'],
                                ['A','Absent','bg-error-container text-on-error-container border-error'],
                                ['L','Late','bg-tertiary-fixed text-on-tertiary-fixed-variant border-on-tertiary-container']
                              ].map(([v, label, activeStyle]) => (
                                <label key={v} className="relative flex items-center justify-center cursor-pointer">
                                  <input type="radio" name={`att-${s.id}`} value={v} checked={val === v}
                                    onChange={() => setAttMap(m => ({ ...m, [s.id]: v }))} className="peer hidden" />
                                  <span className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all select-none
                                    ${val === v ? activeStyle : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                                    {label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <input
                              className={`bg-transparent border-b border-transparent focus:border-primary/30 focus:ring-0 text-sm py-1 w-full transition-all outline-none ${val === 'A' ? 'text-error font-medium' : 'text-on-surface'}`}
                              placeholder="Add note..."
                              defaultValue=""
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {students.length > 0 && (
              <div className="p-8 border-t border-surface-container-high bg-surface-container-low/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-on-surface-variant">
                    Showing {students.length} student{students.length !== 1 ? 's' : ''} in {cls || '—'}
                  </p>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <span className="text-secondary">P: {present}</span>
                    <span className="text-error">A: {absent}</span>
                    <span className="text-on-tertiary-fixed-variant">L: {late}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Footer Insight */}
          {cls && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 mt-8 border-t border-outline-variant/30">
              <div className="space-y-4">
                <h4 className="font-headline font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">trending_up</span> Attendance Insight
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Today's attendance for <span className="text-primary font-bold">{cls}</span> is{' '}
                  <span className={`font-bold ${parseFloat(pct) >= 90 ? 'text-secondary' : parseFloat(pct) >= 75 ? 'text-on-tertiary-fixed-variant' : 'text-error'}`}>{pct}%</span>.{' '}
                  {absent > 0 ? `${absent} student${absent > 1 ? 's are' : ' is'} absent today.` : 'Full attendance today.'}
                </p>
              </div>
              <div className="flex items-center justify-end gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Session</p>
                  <p className="font-headline font-bold text-primary">{db.settings.year || '2025-26'}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-on-primary font-bold text-lg">
                  {pct}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        /* History / Report Tab */
        <div>
          <div className="flex items-center gap-4 mb-8">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Class</label>
              <select value={repCls} onChange={e => setRepCls(e.target.value)}
                className="bg-surface-container-lowest border-0 rounded-xl px-4 py-2.5 font-semibold text-primary shadow-sm ring-1 ring-outline-variant/20 focus:ring-primary focus:outline-none text-sm cursor-pointer">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {!repCls ? (
            <div className="bg-surface-container-lowest rounded-2xl p-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">history</span>
              <p className="text-lg font-bold text-primary font-headline mb-1">Select a class to view history</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
              <div className="p-8 border-b border-surface-container-high flex items-center gap-4">
                <h3 className="text-2xl font-extrabold font-headline text-primary">Attendance Report</h3>
                <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold tracking-widest uppercase rounded-full">{repCls}</span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Student</th>
                    <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Present</th>
                    <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Absent</th>
                    <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Late</th>
                    <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {db.students.filter(s => s.cls === repCls).map(s => {
                    let p = 0, a = 0, l = 0;
                    Object.values(db.att).forEach(d => {
                      const v = d[s.id];
                      if (v === 'P') p++;
                      else if (v === 'L') l++;
                      else if (v === 'A') a++;
                    });
                    const tot = p + a + l;
                    const pct = tot > 0 ? Math.round((p + l) / tot * 100) : 0;
                    const barColor = pct >= 90 ? 'bg-secondary' : pct >= 75 ? 'bg-on-tertiary-container' : 'bg-error';
                    const textColor = pct >= 90 ? 'text-secondary' : pct >= 75 ? 'text-on-tertiary-fixed-variant' : 'text-error';
                    return (
                      <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">
                              {(s.fn[0] || '') + (s.ln[0] || '')}
                            </div>
                            <span className="font-semibold text-primary">{s.fn} {s.ln}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-secondary font-bold">{p}</td>
                        <td className="px-8 py-5 text-error font-bold">{a}</td>
                        <td className="px-8 py-5 text-on-tertiary-fixed-variant font-bold">{l}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: pct + '%' }}></div>
                            </div>
                            <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Exams({ db, save }) {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({max:100,st:'Upcoming'});
  const [mkExam, setMkExam] = useState('');
  const [mkCls, setMkCls] = useState('');
  const [rcCls, setRcCls] = useState('');
  const [filterCls, setFilterCls] = useState('');
  const [filterSu, setFilterSu] = useState('');
  const [editId, setEditId] = useState(null);
  const sf = k => v => setForm(f => ({...f, [k]: v}));
  const classes = db.classes.map(c => c.name);
  const subjects = [...new Set([
    ...db.classes.flatMap(c => (c.subs||'').split(',').map(s => s.trim()).filter(Boolean)),
    ...db.exams.map(e => e.su).filter(Boolean),
  ])].sort();

  const openEdit = e => { setForm({...e}); setEditId(e.id); setOpen(true); };
  const openAdd = () => { setForm({max:100, st:'Upcoming'}); setEditId(null); setOpen(true); };

  const saveExam = () => {
    if (!form.name?.trim()) { toast('Name required', 'err'); return; }
    if (editId) {
      save({...db, exams: db.exams.map(e => e.id === editId ? {...e, ...form, max: parseInt(form.max)||100} : e)});
      toast('Exam updated');
    } else {
      save({...db, exams: [...db.exams, {id: 'E'+uid(), ...form, max: parseInt(form.max)||100}]});
      toast('Exam added');
    }
    setForm({max:100, st:'Upcoming'}); setEditId(null); setOpen(false);
  };
  const delExam = id => { if (!window.confirm('Delete?')) return; save({...db, exams: db.exams.filter(e => e.id !== id)}); };
  const setMark = (key, sid, val) => {
    const nm = {...db.marks};
    if (val === '' || val === null || val === undefined) {
      // Remove mark entry if cleared
      if (nm[key]) { const k2 = {...nm[key]}; delete k2[sid]; nm[key] = k2; }
    } else {
      nm[key] = {...(nm[key]||{}), [sid]: parseFloat(val)};
    }
    save({...db, marks: nm});
  };
  const getAttStats = sid => { let p=0,t=0; Object.values(db.att).forEach(d => { if (d[sid]!==undefined){t++;if(d[sid]==='P'||d[sid]==='L')p++;}}); return {p,t}; };
  const genRC = () => {
    if (!rcCls) return;
    const sts = db.students.filter(s => s.cls === rcCls);
    if (!sts.length) { toast('No students', 'err'); return; }
    const school = db.settings.school || 'LORD KRISHNA PUBLIC SCHOOL';
    const yr     = db.settings.year   || '2025-2026';
    const addr   = db.settings.addr   || '';
    const prin   = db.settings.prin   || '';
    const phone  = db.settings.phone  || '';

    // 8-point grading scale
    const grade8 = pct => {
      if (pct >= 91) return 'A1';
      if (pct >= 81) return 'A2';
      if (pct >= 71) return 'B1';
      if (pct >= 61) return 'B2';
      if (pct >= 51) return 'C1';
      if (pct >= 41) return 'C2';
      if (pct >= 33) return 'D';
      return 'E';
    };

    // Subjects for this class
    const clsObj = db.classes.find(c => c.name === rcCls);
    const subjects = clsObj ? (clsObj.subs || '').split(',').map(s => s.trim()).filter(Boolean) : [];

    // Exams grouped by term
    const clsExams = db.exams.filter(e => !e.cls || e.cls === rcCls);
    const t1Exams = clsExams.filter(e => e.term === 'Term1');
    const t2Exams = clsExams.filter(e => e.term === 'Term2');

    // Helper: get marks for a student in an exam
    const getMark = (examId, sid) => {
      const key = examId + '_' + rcCls;
      const v = (db.marks[key] || {})[sid];
      return v !== undefined ? v : null;
    };

    // For each subject, find matching exams by subject name
    const getSubjectExams = (su, termExams) => termExams.filter(e => e.su === su);

    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',Arial,sans-serif;background:#e8edf2;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{width:210mm;min-height:297mm;margin:0 auto 20px;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,0.15);position:relative;overflow:hidden;page-break-after:always}
      .page::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(180deg,#1a3a8f 0%,#2563eb 40%,#0ea5e9 100%)}
      .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(59,130,246,0.04);pointer-events:none;white-space:nowrap;z-index:0;letter-spacing:4px;text-transform:uppercase}
      .hdr{background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#0369a1 100%);padding:20px 28px 16px 34px;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden}
      .hdr::after{content:'';position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.06)}
      .hdr-logo{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .hdr-logo span{font-size:24px;font-weight:900;color:#fff;font-family:serif}
      .hdr-text{flex:1;text-align:center}
      .hdr-school{font-size:19px;font-weight:900;color:#fff;letter-spacing:1.5px;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,0.3)}
      .hdr-addr{font-size:10px;color:rgba(255,255,255,0.72);margin-top:3px}
      .hdr-title{display:inline-block;margin-top:9px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:3px 18px;font-size:12px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase}
      .hdr-badge{flex-shrink:0;text-align:center}
      .hdr-badge-cls{background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.32);border-radius:10px;padding:6px 14px}
      .hdr-badge-cls .lbl{font-size:9px;color:rgba(255,255,255,0.68);text-transform:uppercase;letter-spacing:0.8px;font-weight:600}
      .hdr-badge-cls .val{font-size:17px;font-weight:900;color:#fff;line-height:1.1}
      .hdr-badge-yr{font-size:10px;color:rgba(255,255,255,0.62);margin-top:5px}
      .info-strip{background:#f0f6ff;border-bottom:2px solid #dbeafe;padding:11px 28px 11px 34px;display:grid;grid-template-columns:1fr 1fr;gap:0 40px}
      .info-row{display:flex;align-items:baseline;padding:3.5px 0;border-bottom:1px dashed #dbeafe}
      .info-row:last-child{border-bottom:none}
      .info-lbl{font-size:10.5px;font-weight:700;color:#1e40af;min-width:115px;flex-shrink:0}
      .info-val{font-size:11px;color:#1a1a2e;font-weight:500}
      .tbl-wrap{padding-left:6px}
      .marks-tbl{width:100%;border-collapse:collapse;font-size:10.5px}
      .marks-tbl th,.marks-tbl td{border:1px solid #bfdbfe;text-align:center;padding:5px 3px;line-height:1.2}
      .th-area{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font-weight:800;font-size:11px;text-align:left;padding-left:10px}
      .th-term{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;font-weight:800;font-size:11.5px}
      .th-overall{background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#fff;font-weight:800;font-size:11px}
      .th-sub{background:#dbeafe;color:#1e3a8a;font-weight:700;font-size:9.5px}
      .th-max{background:#fce7f3;color:#9d174d;font-weight:800;font-size:10px}
      .td-subj{text-align:left;padding-left:10px;font-weight:700;color:#1e3a8a;background:#f0f6ff;font-size:11px}
      .td-total{background:#dbeafe;font-weight:800;color:#1e3a8a}
      .td-grand{background:#dcfce7;font-weight:900;color:#166534;font-size:12px}
      .td-rank{font-weight:700;color:#7c3aed}
      tr:nth-child(even) td:not(.td-subj):not(.td-total):not(.td-grand){background:#f8faff}
      .g-a1{color:#166534;background:#dcfce7;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-a2{color:#065f46;background:#d1fae5;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-b1{color:#1e40af;background:#dbeafe;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-b2{color:#1d4ed8;background:#eff6ff;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-c1{color:#92400e;background:#fef3c7;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-c2{color:#b45309;background:#fffbeb;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-d{color:#c2410c;background:#ffedd5;border-radius:4px;padding:1px 5px;font-weight:900}
      .g-e{color:#991b1b;background:#fee2e2;border-radius:4px;padding:1px 5px;font-weight:900}
      .grade-note{background:#f8faff;border-top:1px solid #bfdbfe;border-bottom:1px solid #bfdbfe;padding:5px 28px 5px 34px;font-size:9px;color:#374151;font-style:italic;line-height:1.5}
      .totals-bar{background:linear-gradient(90deg,#f0f6ff,#e0f2fe);border-bottom:1px solid #bfdbfe;padding:9px 28px 9px 34px;display:flex;align-items:center;gap:20px}
      .tot-item{display:flex;align-items:center;gap:10px}
      .tot-lbl{font-size:11px;font-weight:700;color:#1e40af}
      .tot-val{background:#fff;border:2px solid #3b82f6;border-radius:8px;padding:3px 14px;font-size:13px;font-weight:900;color:#1e3a8a;box-shadow:0 2px 6px rgba(59,130,246,0.12)}
      .perf-bar-wrap{flex:1;margin-left:8px}
      .perf-bar-bg{height:8px;background:#dbeafe;border-radius:4px;overflow:hidden}
      .perf-bar-fill{height:100%;border-radius:4px}
      .perf-pct-lbl{font-size:9px;color:#6b7280;margin-top:2px;text-align:right}
      .co-wrap{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #bfdbfe}
      .co-half:first-child{border-right:1px solid #bfdbfe}
      .co-tbl{width:100%;border-collapse:collapse;font-size:10.5px}
      .co-hdr-main{background:linear-gradient(90deg,#1d4ed8,#3b82f6);color:#fff;font-weight:800;font-size:11px;padding:6px 8px;text-align:center}
      .co-hdr-sub{background:#dbeafe;color:#1e3a8a;font-weight:700;font-size:10px;padding:4px 6px;border:1px solid #bfdbfe;text-align:center}
      .co-tbl td{border:1px solid #dbeafe;padding:4px 7px}
      .co-act{text-align:left;color:#1a1a2e}
      .co-g{text-align:center;font-weight:800;color:#1e40af}
      .footer{padding:9px 28px 12px 34px}
      .footer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
      .att-badge{display:inline-flex;align-items:center;gap:6px;background:#f0f6ff;border:1px solid #bfdbfe;border-radius:6px;padding:4px 12px;font-weight:700;color:#1e40af;font-size:11px}
      .remark-badge{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:4px 12px;font-weight:700;font-size:11px}
      .remark-good{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
      .remark-ok{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
      .remark-poor{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
      .promo{font-size:11px;color:#374151;margin-bottom:8px;font-style:italic}
      .sig-row{display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #e5e7eb;margin-top:4px}
      .sig-item{text-align:center;min-width:110px}
      .sig-line{border-top:1.5px solid #374151;margin-top:26px;padding-top:4px;font-size:10px;color:#374151;font-weight:600}
      @media print{@page{size:A4;margin:6mm}body{background:#fff}.page{box-shadow:none;margin:0;page-break-after:always}}
    `;

    const gradeClass = g => ({'A1':'g-a1','A2':'g-a2','B1':'g-b1','B2':'g-b2','C1':'g-c1','C2':'g-c2','D':'g-d','E':'g-e'}[g]||'');
    const perfColor  = pct => pct>=75?'#22c55e':pct>=50?'#f59e0b':'#ef4444';

    const CO_ACTIVITIES = ['General Knowledge','Art Education','Health & Physical Education','Scientific Skills','Thinking Skills','Moral Education','Yoga / P.T.','Sports'];
    const DISCIPLINE = ['Regularity & Punctuality','Sincerity','Behavior & Values','Respectfulness for Rules & Regulations','Attitude Towards Teachers','Attitude Towards School-Mates','Attitude Towards Society','Attitude Towards Nation'];

    const w = window.open('', '_blank');
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report Cards — ${rcCls}</title><style>${css}</style></head><body>`;

    sts.forEach(s => {
      const { p: ap, t: at } = getAttStats(s.id);

      // Build subject rows
      // For each subject, compute T1 and T2 component marks
      // We use exam names to detect components: Per.Test, Note Book, SEA, Half Yearly, Yearly Exam
      // If no structured exams, fall back to showing all exams as rows

      // Compute per-subject totals for T1 and T2
      const subjectRows = subjects.map(su => {
        const t1 = getSubjectExams(su, t1Exams);
        const t2 = getSubjectExams(su, t2Exams);

        // Try to find component exams by name keywords
        const findComp = (exams, keywords) => {
          const e = exams.find(ex => keywords.some(k => ex.name.toLowerCase().includes(k)));
          return e ? getMark(e.id, s.id) : null;
        };

        // T1 components
        const t1_pt  = findComp(t1, ['per.test','periodic','per test','pt']);
        const t1_nb  = findComp(t1, ['note','notebook','note book']);
        const t1_sea = findComp(t1, ['sea','sub enrich','enrichment']);
        const t1_hy  = findComp(t1, ['half','half yearly','hy']);
        // T1 total from exam or sum
        const t1Total = t1.length === 1 ? getMark(t1[0].id, s.id) :
          (t1_pt !== null || t1_nb !== null || t1_sea !== null || t1_hy !== null)
            ? (t1_pt||0) + (t1_nb||0) + (t1_sea||0) + (t1_hy||0) : null;

        // T2 components
        const t2_pt  = findComp(t2, ['per.test','periodic','per test','pt']);
        const t2_nb  = findComp(t2, ['note','notebook','note book']);
        const t2_sea = findComp(t2, ['sea','sub enrich','enrichment']);
        const t2_ye  = findComp(t2, ['yearly','annual','year exam','ye']);
        const t2Total = t2.length === 1 ? getMark(t2[0].id, s.id) :
          (t2_pt !== null || t2_nb !== null || t2_sea !== null || t2_ye !== null)
            ? (t2_pt||0) + (t2_nb||0) + (t2_sea||0) + (t2_ye||0) : null;

        // Grand total = T1 half + T2 half (50 each)
        const t1Max = t1.reduce((s, e) => s + (e.max || 0), 0) || 100;
        const t2Max = t2.reduce((s, e) => s + (e.max || 0), 0) || 100;
        const t1Half = t1Total !== null ? Math.round(t1Total / t1Max * 50) : null;
        const t2Half = t2Total !== null ? Math.round(t2Total / t2Max * 50) : null;
        const grand = (t1Half !== null && t2Half !== null) ? t1Half + t2Half : null;
        const grandPct = grand !== null ? Math.round(grand / 100 * 100) : null;

        return { su, t1_pt, t1_nb, t1_sea, t1_hy, t1Total, t2_pt, t2_nb, t2_sea, t2_ye, t2Total, t1Half, t2Half, grand, grandPct };
      });

      const validRows = subjectRows.filter(r => r.grand !== null);
      const overallTotal = validRows.reduce((s, r) => s + (r.grand || 0), 0);
      const overallMax = validRows.length * 100;
      const overallPct = overallMax > 0 ? Math.round(overallTotal / overallMax * 100) : 0;

      // Rank among class
      const classStudents = db.students.filter(st => st.cls === rcCls);
      const classScores = classStudents.map(st => {
        return subjects.reduce((sum, su) => {
          const t1 = getSubjectExams(su, t1Exams);
          const t2 = getSubjectExams(su, t2Exams);
          const t1Total = t1.length === 1 ? getMark(t1[0].id, st.id) : null;
          const t2Total = t2.length === 1 ? getMark(t2[0].id, st.id) : null;
          const t1Max = t1.reduce((s, e) => s + (e.max || 0), 0) || 100;
          const t2Max = t2.reduce((s, e) => s + (e.max || 0), 0) || 100;
          const t1H = t1Total !== null ? Math.round(t1Total / t1Max * 50) : 0;
          const t2H = t2Total !== null ? Math.round(t2Total / t2Max * 50) : 0;
          return sum + t1H + t2H;
        }, 0);
      }).sort((a, b) => b - a);
      const rank = classScores.indexOf(overallTotal) + 1;

      const fmt = v => v !== null && v !== undefined ? v : '—';
      const gBadge = g => g !== '—' ? `<span class="${gradeClass(g)}">${g}</span>` : '—';

      // Build subject table rows
      const subRows = subjectRows.map(r => {
        const g = r.grandPct !== null ? grade8(r.grandPct) : '—';
        return `<tr>
          <td class="td-subj">${r.su}</td>
          <td>${fmt(r.t1_pt)}</td><td>${fmt(r.t1_nb)}</td><td>${fmt(r.t1_sea)}</td><td>${fmt(r.t1_hy)}</td>
          <td class="td-total">${fmt(r.t1Total)}</td>
          <td>${fmt(r.t2_pt)}</td><td>${fmt(r.t2_nb)}</td><td>${fmt(r.t2_sea)}</td><td>${fmt(r.t2_ye)}</td>
          <td class="td-total">${fmt(r.t2Total)}</td>
          <td class="td-grand">${fmt(r.grand)}</td>
          <td style="font-weight:900;font-size:11px">${gBadge(g)}</td>
          <td class="td-rank">${rank > 0 && r.grand !== null ? rank : '—'}</td>
        </tr>`;
      }).join('');

      // Co-scholastic & discipline tables
      const coRows   = CO_ACTIVITIES.map(a => `<tr><td class="co-act">${a}</td><td class="co-g">A2</td><td class="co-g">A1</td></tr>`).join('');
      const discRows = DISCIPLINE.map(d => `<tr><td class="co-act" style="font-size:10px">${d}</td><td class="co-g">A2</td><td class="co-g">A1</td></tr>`).join('');

      const remarkCls  = overallPct>=75?'remark-good':overallPct>=50?'remark-ok':'remark-poor';
      const remarkText = overallPct>=75?'Good!':overallPct>=50?'Satisfactory':'Needs Improvement';
      const barColor   = perfColor(overallPct);

      html += `
      <div class="page">
        <div class="watermark">${school}</div>

        <div class="hdr">
          <div class="hdr-logo"><span>${school.charAt(0)}</span></div>
          <div class="hdr-text">
            <div class="hdr-school">${school}</div>
            <div class="hdr-addr">${addr}${phone ? ' &nbsp;|&nbsp; Ph: ' + phone : ''}</div>
            <div class="hdr-title">Report Card</div>
          </div>
          <div class="hdr-badge">
            <div class="hdr-badge-cls"><div class="lbl">Class</div><div class="val">${rcCls}</div></div>
            <div class="hdr-badge-yr">Session: ${yr}</div>
          </div>
        </div>

        <div class="info-strip">
          <div>
            <div class="info-row"><span class="info-lbl">Student's Name</span><span class="info-val">${s.fn} ${s.ln}</span></div>
            <div class="info-row"><span class="info-lbl">Father's Name</span><span class="info-val">${s.father || '—'}</span></div>
            <div class="info-row"><span class="info-lbl">Mother's Name</span><span class="info-val">${s.mother || '—'}</span></div>
            <div class="info-row"><span class="info-lbl">Date of Birth</span><span class="info-val">${s.dob || '—'}</span></div>
            <div class="info-row"><span class="info-lbl">Address</span><span class="info-val">${s.addr || addr || '—'}</span></div>
          </div>
          <div>
            <div class="info-row"><span class="info-lbl">Roll No.</span><span class="info-val">${s.roll || '—'}</span></div>
            <div class="info-row"><span class="info-lbl">Admission No.</span><span class="info-val">${s.admNo || '—'}</span></div>
            <div class="info-row"><span class="info-lbl">Gender</span><span class="info-val">${s.gn || '—'}</span></div>
            <div class="info-row"><span class="info-lbl">Blood Group</span><span class="info-val">${s.blood || '—'}</span></div>
          </div>
        </div>

        <div class="tbl-wrap">
          <table class="marks-tbl">
            <thead>
              <tr>
                <th rowspan="3" class="th-area" style="width:88px">Scholastic<br/>Area</th>
                <th colspan="5" class="th-term">Term 1 &nbsp;(100 Marks)</th>
                <th colspan="5" class="th-term">Term 2 &nbsp;(100 Marks)</th>
                <th colspan="3" class="th-overall">Overall</th>
              </tr>
              <tr>
                <th colspan="5" class="th-sub" style="font-size:8.5px;color:#6b7280">Per.Test + Notebook + SEA + Half Yearly</th>
                <th colspan="5" class="th-sub" style="font-size:8.5px;color:#6b7280">Per.Test + Notebook + SEA + Yearly Exam</th>
                <th colspan="3" class="th-sub">Term 1 (50) + Term 2 (50)</th>
              </tr>
              <tr class="th-sub">
                <th>Per.<br/>Test</th><th>Note<br/>Book</th><th>SEA</th><th>Half<br/>Yearly</th><th>Total</th>
                <th>Per.<br/>Test</th><th>Note<br/>Book</th><th>SEA</th><th>Yearly<br/>Exam</th><th>Total</th>
                <th>Grand<br/>Total</th><th>Grade</th><th>Rank</th>
              </tr>
              <tr class="th-max">
                <td class="td-subj" style="font-size:10px">Subjects</td>
                <td>10</td><td>5</td><td>5</td><td>80</td><td>100</td>
                <td>10</td><td>5</td><td>5</td><td>80</td><td>100</td>
                <td>100</td><td></td><td></td>
              </tr>
            </thead>
            <tbody>${subRows || '<tr><td colspan="14" style="text-align:center;padding:12px;color:#9ca3af;font-style:italic">No marks entered</td></tr>'}</tbody>
          </table>
        </div>

        <div class="grade-note">
          <strong>8-Point Grading Scale:</strong>&nbsp;
          A1 (91–100%) &nbsp;A2 (81–90%) &nbsp;B1 (71–80%) &nbsp;B2 (61–70%) &nbsp;C1 (51–60%) &nbsp;C2 (41–50%) &nbsp;D (33–40%) &nbsp;E (≤32%)
          &nbsp;&nbsp;<strong>*SEA</strong> = Sub Enrichment Activity
        </div>

        <div class="totals-bar">
          <div class="tot-item"><span class="tot-lbl">Overall Marks</span><span class="tot-val">${overallTotal} / ${overallMax}</span></div>
          <div class="tot-item"><span class="tot-lbl">Percentage</span><span class="tot-val">${overallPct}%</span></div>
          <div class="perf-bar-wrap">
            <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${overallPct}%;background:${barColor}"></div></div>
            <div class="perf-pct-lbl">${overallPct}% — ${remarkText}</div>
          </div>
        </div>
        <div class="co-wrap">
          <div class="co-half">
            <table class="co-tbl">
              <thead>
                <tr><td colspan="3" class="co-hdr-main">Co-Scholastic Areas</td></tr>
                <tr><th class="co-hdr-sub" style="text-align:left;padding-left:8px">Activity</th><th class="co-hdr-sub">T1</th><th class="co-hdr-sub">T2</th></tr>
              </thead>
              <tbody>${coRows}</tbody>
            </table>
          </div>
          <div class="co-half">
            <table class="co-tbl">
              <thead>
                <tr><td colspan="3" class="co-hdr-main">Discipline</td></tr>
                <tr><th class="co-hdr-sub" style="text-align:left;padding-left:8px">Element</th><th class="co-hdr-sub">T1</th><th class="co-hdr-sub">T2</th></tr>
              </thead>
              <tbody>${discRows}</tbody>
            </table>
          </div>
        </div>

        <div class="footer">
          <div class="footer-top">
            <span class="att-badge">&#128197; Attendance : ${ap} / ${at} days</span>
            <span class="remark-badge ${remarkCls}">Remarks : ${remarkText}</span>
          </div>
          <div class="promo">${overallPct >= 33 ? `&#10022; Congratulations! Promoted to Class ${rcCls}.` : '&#9888; Result: Detained — Please contact the school.'}</div>
          <div class="sig-row">
            <div class="sig-item"><div class="sig-line">Date : ${new Date().toLocaleDateString('en-IN')}</div></div>
            <div class="sig-item"><div class="sig-line">Class Teacher</div></div>
            <div class="sig-item"><div class="sig-line">Principal${prin ? ' (' + prin + ')' : ''}</div></div>
            <div class="sig-item"><div class="sig-line">Parent / Guardian</div></div>
          </div>
        </div>
      </div>`;
    });

    html += `<script>window.onload=()=>window.print()<\/script></body></html>`;
    w.document.write(html);
    w.document.close();
    toast('Report cards generated');
  };

  // Filtered exams for schedule tab
  const filteredExams = db.exams.filter(e =>
    (!filterCls || e.cls === filterCls) &&
    (!filterSu || e.su === filterSu)
  );

  // Validation badge for grade entry
  const valBadge = (m, max) => {
    if (m === '' || m === undefined || m === null) return { label: 'Pending Input', cls: 'bg-surface-container-high text-on-surface-variant', icon: null };
    const pct = (parseFloat(m) / max) * 100;
    if (pct < 35) return { label: 'Below Threshold', cls: 'bg-error-container text-on-error-container', icon: 'warning' };
    return { label: 'Grade Calculated', cls: 'bg-secondary-container text-on-secondary-container', icon: 'check_circle' };
  };

  // Tick every 30s so status updates automatically as time passes
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const effectiveStatus = e => {
    const now = new Date();
    if (e.dt && e.startTime && e.endTime) {
      const start = new Date(e.dt + 'T' + e.startTime);
      const end   = new Date(e.dt + 'T' + e.endTime);
      if (!isNaN(start) && !isNaN(end)) {
        if (now >= start && now <= end) return 'Ongoing';
        if (now > end) return 'Completed';
        return 'Upcoming';
      }
    } else if (e.dt && e.endTime) {
      const end = new Date(e.dt + 'T' + e.endTime);
      if (!isNaN(end)) return now > end ? 'Completed' : 'Upcoming';
    } else if (e.dt) {
      const day = new Date(e.dt); day.setHours(23,59,59);
      return day < now ? 'Completed' : 'Upcoming';
    }
    return e.st || 'Upcoming';
  };

  const statusPill = st => {
    if (st === 'Completed') return 'bg-green-100 text-green-800';
    if (st === 'Ongoing')   return 'bg-blue-100 text-blue-800 animate-pulse';
    if (st === 'Upcoming')  return 'bg-[#ffdeaa] text-[#5f4100]';
    return 'bg-secondary-container text-on-secondary-container';
  };

  const dayName = dt => { if (!dt) return ''; const d = new Date(dt); return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]; };
  const dtParts = dt => { if (!dt) return {day:'—',mon:'—'}; const d = new Date(dt); return {day:d.getDate(), mon:d.toLocaleString('default',{month:'short'})}; };
  const fmtTime = t => { if (!t) return null; const [h,m] = t.split(':'); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; };

  return (
    <div className="space-y-0">
      {/* Page Header */}
      <div className="px-10 pt-10 pb-6 space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Academic Session {db.settings.year||'2025-2026'}</p>
        <h1 className="text-5xl font-extrabold text-primary tracking-tight leading-none">Master Exam Schedule</h1>
        <p className="text-slate-500 text-lg font-body max-w-2xl">Centralized oversight of all scheduled assessments. Manage exams and enter student marks.</p>
      </div>

      {/* Tab switcher */}
      <div className="px-10 pb-0">
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
          {['Schedule','Grade Entry Portal'].map((t,i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab===i ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SCHEDULE TAB */}
      {tab === 0 && (
        <div className="px-10 py-8 space-y-8">
          {/* Filter & Action Bar */}
          <div className="flex flex-col md:flex-row gap-6 items-end justify-between bg-surface-container-low p-8 rounded-2xl">
            <div className="flex flex-wrap gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant tracking-wider uppercase">Filter by Class</label>
                <select value={filterCls} onChange={e => setFilterCls(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm min-w-[160px] focus:ring-2 focus:ring-primary shadow-sm text-on-surface">
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant tracking-wider uppercase">Filter by Subject</label>
                <select value={filterSu} onChange={e => setFilterSu(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm min-w-[180px] focus:ring-2 focus:ring-primary shadow-sm text-on-surface">
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0">
              <span className="material-symbols-outlined text-lg">add_task</span>
              <span>Schedule New Exam</span>
            </button>
          </div>

          {/* Exam Table */}
          <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-surface-container-high">
                    <th className="py-5 px-8 text-on-surface-variant font-label text-xs uppercase tracking-[0.1em]">Date &amp; Time</th>
                    <th className="py-5 px-6 text-on-surface-variant font-label text-xs uppercase tracking-[0.1em]">Class</th>
                    <th className="py-5 px-6 text-on-surface-variant font-label text-xs uppercase tracking-[0.1em]">Subject</th>
                    <th className="py-5 px-6 text-on-surface-variant font-label text-xs uppercase tracking-[0.1em]">Max Marks</th>
                    <th className="py-5 px-8 text-right text-on-surface-variant font-label text-xs uppercase tracking-[0.1em]">Status</th>
                    <th className="py-5 px-6 text-on-surface-variant font-label text-xs uppercase tracking-[0.1em]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExams.map(e => {
                    const {day, mon} = dtParts(e.dt);
                    const st = effectiveStatus(e);
                    return (
                      <tr key={e.id} className="hover:bg-surface-container-low transition-colors group">
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-container flex flex-col items-center justify-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{mon}</span>
                              <span className="text-lg font-black text-primary leading-none">{day}</span>
                            </div>
                            <div>
                              <p className="font-bold text-primary">{dayName(e.dt)||'—'}</p>
                              {e.startTime || e.endTime
                                ? <p className="text-xs text-slate-500">{fmtTime(e.startTime)||'?'} – {fmtTime(e.endTime)||'?'}</p>
                                : <p className="text-xs text-slate-500">{e.dt||'No date set'}</p>
                              }
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">{e.cls||'All'}</span>
                        </td>
                        <td className="py-5 px-6">
                          <p className="font-bold text-primary">{e.name}</p>
                          <p className="text-xs text-slate-500">{e.su||'—'}</p>
                        </td>
                        <td className="py-5 px-6">
                          <p className="font-bold text-primary">{e.max}</p>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusPill(st)}`}>{st}</span>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary-container transition-colors">
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onClick={() => delExam(e.id)} className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-on-error-container transition-colors">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredExams.length && (
                    <tr><td colSpan={6} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">event_note</span>
                      No exams scheduled
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-4">
            <div className="lg:col-span-2 bg-primary-container p-8 rounded-[2rem] text-white flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Schedule Summary</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-80">Total Exams</span>
                    <span className="text-lg font-bold">{db.exams.length}</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full transition-all" style={{width: db.exams.length ? Math.round(db.exams.filter(e=>effectiveStatus(e)==='Completed').length/db.exams.length*100)+'%' : '0%'}}></div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>{db.exams.filter(e=>effectiveStatus(e)==='Completed').length} Completed</span>
                    <span>{db.exams.filter(e=>effectiveStatus(e)==='Upcoming').length} Upcoming</span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setTab(1); setMkCls(''); setMkExam(''); }}
                className="mt-8 w-full bg-white text-primary py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.02]">
                <span className="material-symbols-outlined">grade</span>
                Go to Grade Entry Portal
              </button>
            </div>
            <div className="bg-surface-container-low p-8 rounded-[2rem] flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Report Cards</p>
                <p className="text-2xl font-black text-primary">{classes.length} Classes</p>
                <p className="text-sm text-on-surface-variant">Generate printable report cards for any class</p>
                <select value={rcCls} onChange={e => setRcCls(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm mt-2 text-on-surface">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={genRC}
                className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all">
                <span className="material-symbols-outlined text-sm">description</span>
                Generate Report Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRADE ENTRY PORTAL TAB */}
      {tab === 1 && (
        <div className="px-10 py-8 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <nav className="flex items-center gap-2 text-xs font-bold tracking-widest text-on-surface-variant mb-3 uppercase">
                <span>{db.settings.year||'2025-2026'}</span>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span className="text-primary">Grade Entry Portal</span>
              </nav>
              <h2 className="text-4xl font-extrabold tracking-tight text-primary italic">Grade Entry Portal</h2>
              <p className="text-on-surface-variant font-medium text-base mt-1">
                {mkCls ? `${mkCls} • ${mkExam ? (db.exams.find(e=>e.id===mkExam)?.name||'') : 'Select Exam'}` : 'Select class and exam to begin'}
              </p>
            </div>
            <div className="flex gap-6 items-end">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Students</p>
                <p className="text-primary font-bold">{mkCls ? db.students.filter(s=>s.cls===mkCls).length : 0} Enrolled</p>
              </div>
            </div>
          </div>

          {/* Exam + Class selectors */}
          <div className="flex flex-wrap gap-4 items-end bg-surface-container-low p-6 rounded-2xl">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface-variant tracking-wider uppercase">Select Exam</label>
              <select value={mkExam} onChange={e => setMkExam(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm min-w-[200px] focus:ring-2 focus:ring-primary shadow-sm text-on-surface">
                <option value="">Choose Exam</option>
                {db.exams.map(e => <option key={e.id} value={e.id}>{e.name}{e.su?' – '+e.su:''}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface-variant tracking-wider uppercase">Select Class</label>
              <select value={mkCls} onChange={e => setMkCls(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm min-w-[140px] focus:ring-2 focus:ring-primary shadow-sm text-on-surface">
                <option value="">Choose Class</option>
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {mkExam && mkCls ? (() => {
            const ex = db.exams.find(e => e.id === mkExam);
            const sts = db.students.filter(s => s.cls === mkCls);
            const key = mkExam + '_' + mkCls;
            const sv = db.marks[key] || {};
            return (
              <div className="grid grid-cols-12 gap-6">
                {/* Sidebar */}
                <aside className="col-span-12 lg:col-span-3 space-y-6">
                  <div className="bg-surface-container-low rounded-xl p-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">Grading Schema</h4>
                    <ul className="space-y-4">
                      <li className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Max Marks</span>
                        <span className="font-bold text-primary">{ex.max}</span>
                      </li>
                      <li className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Pass Mark</span>
                        <span className="font-bold text-primary">{Math.ceil(ex.max * 0.35)}</span>
                      </li>
                      <li className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Distinction</span>
                        <span className="font-bold text-primary">{Math.ceil(ex.max * 0.75)}+</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-secondary-container/10 border border-secondary-container/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="material-symbols-outlined text-secondary" style={{fontVariationSettings:"'FILL' 1"}}>info</span>
                      <h4 className="text-sm font-bold text-secondary">Manual Adjustments</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-on-secondary-container font-medium">Use the ledger below for individual corrections. Changes are autosaved.</p>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-6 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3">Class Stats</h4>
                    {(() => {
                      const entered = sts.filter(s => sv[s.id] !== undefined).length;
                      const below = sts.filter(s => sv[s.id] !== undefined && (sv[s.id]/ex.max)*100 < 35).length;
                      return (<>
                        <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Marks Entered</span><span className="font-bold text-primary">{entered}/{sts.length}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Below Threshold</span><span className="font-bold text-error">{below}</span></div>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2"><div className="bg-primary h-full rounded-full transition-all" style={{width: sts.length ? (entered/sts.length*100)+'%':'0%'}}></div></div>
                      </>);
                    })()}
                  </div>
                </aside>

                {/* Main Ledger */}
                <div className="col-span-12 lg:col-span-9 bg-white rounded-xl overflow-hidden shadow-sm border border-surface-container">
                  <div className="p-6 border-b border-surface-container flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-primary">Student Performance Ledger</h2>
                    <span className="text-sm text-on-surface-variant">{ex.name} • Max {ex.max}</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Roll No. &amp; Student</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Marks /{ex.max}</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">%</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {sts.map((s, i) => {
                        const m = sv[s.id] !== undefined ? sv[s.id] : '';
                        const pct = m !== '' ? Math.round((parseFloat(m)/ex.max)*100) : null;
                        const vb = valBadge(m, ex.max);
                        const isBelowThreshold = m !== '' && pct < 35;
                        return (
                          <tr key={s.id} className="hover:bg-surface-container-low transition-colors duration-200">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-on-surface-variant w-6">{String(i+1).padStart(2,'0')}</span>
                                <div>
                                  <p className="font-bold text-primary">{s.fn} {s.ln}</p>
                                  <p className="text-[10px] text-on-surface-variant font-medium">{s.roll||s.admno||s.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <input type="number" min="0" max={ex.max}
                                key={s.id + '_' + key}
                                defaultValue={m}
                                onBlur={ev => setMark(key, s.id, ev.target.value)}
                                placeholder="—"
                                className={`w-20 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-sm font-bold text-center py-2 ${isBelowThreshold ? 'ring-2 ring-error-container' : ''}`}/>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`text-lg font-extrabold ${m===''?'text-outline-variant':isBelowThreshold?'text-error':'text-primary'}`}>
                                {m !== '' ? pct+'%' : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${vb.cls}`}>
                                {vb.icon && <span className="material-symbols-outlined text-xs" style={{fontVariationSettings:"'FILL' 1"}}>{vb.icon}</span>}
                                {vb.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-6 bg-surface-container-low flex justify-between items-center">
                    <p className="text-sm text-on-surface-variant font-medium">{sts.length} student entries</p>
                    <button onClick={() => toast('Marks saved')}
                      className="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                      Save &amp; Finalize Marks
                    </button>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-30">grade</span>
              <p className="font-medium">Select an exam and class to view the performance ledger</p>
            </div>
          )}
        </div>
      )}

      {/* Add Exam Modal */}
      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? 'Edit Exam' : 'Schedule New Exam'}>
        <Grid>
          <Span><Field label="Name *"><Input value={form.name||''} onChange={sf('name')} placeholder="Unit Test 1"/></Field></Span>
          <Field label="Class"><Select value={form.cls||''} onChange={sf('cls')}><option value="">All</option>{classes.map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Subject"><Select value={form.su||''} onChange={sf('su')}><option value="">— Select Subject —</option>{subjects.map(s=><option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={form.dt||''} onChange={sf('dt')}/></Field>
          <Field label="Start Time"><Input type="time" value={form.startTime||''} onChange={sf('startTime')}/></Field>
          <Field label="End Time"><Input type="time" value={form.endTime||''} onChange={sf('endTime')}/></Field>
          <Field label="Max Marks"><Input type="number" value={form.max||100} onChange={sf('max')} placeholder="100"/></Field>
          <Field label="Term"><Select value={form.term||''} onChange={sf('term')}><option value="">— None —</option><option value="Term1">Term 1</option><option value="Term2">Term 2</option></Select></Field>
        </Grid>
        <ModalFooter><Btn onClick={() => { setOpen(false); setEditId(null); }}>Cancel</Btn><Btn variant="primary" onClick={saveExam}>{editId ? 'Update' : 'Save'}</Btn></ModalFooter>
      </Modal>
    </div>
  );
}

function Fees({ db, save }) {
  // ── Smart overdue logic ──────────────────────────────────────────
  // Academic year starts April. Month index: Apr=0, May=1, ... Mar=11
  const now = new Date();
  const ayStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)   // Apr this year
    : new Date(now.getFullYear() - 1, 3, 1); // Apr last year
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const monthsElapsed = Math.max(1, Math.floor((now - ayStart) / msPerMonth));

  // Per-student computed rows
  const feeRows = db.students.map(s => {
    const paid = paidTotal(db.pays, s.id);
    const monthly = s.mf > 0 ? s.mf : (s.fee > 0 ? s.fee / 12 : 0);
    const expectedPaid = Math.min(s.fee, monthsElapsed * monthly);
    const overdue = paid < expectedPaid;
    const overdueAmt = overdue ? Math.round(expectedPaid - paid) : 0;
    const overdueMonths = overdue ? Math.ceil((expectedPaid - paid) / (monthly || 1)) : 0;
    const fullyPaid = paid >= s.fee && s.fee > 0;
    return { ...s, _paid: paid, _monthly: monthly, _expectedPaid: expectedPaid, _overdue: overdue, _overdueAmt: overdueAmt, _overdueMonths: overdueMonths, _fullyPaid: fullyPaid };
  });

  const overdueRows = feeRows.filter(s => s._overdue && !s._fullyPaid);
  const totalCollected = feeRows.reduce((s, r) => s + r._paid, 0);
  const totalFee = feeRows.reduce((s, r) => s + r.fee, 0);
  const totalPending = overdueRows.reduce((s, r) => s + r._overdueAmt, 0);
  const collectionRate = totalFee > 0 ? Math.round(totalCollected / totalFee * 100) : 0;

  // ── Collect Fee state ────────────────────────────────────────────
  const [selClass, setSelClass] = useState('');
  const [selStu, setSelStu] = useState('');
  const [pyAmt, setPyAmt] = useState('');
  const [pyDt, setPyDt] = useState(new Date().toISOString().split('T')[0]);
  const [pyMd, setPyMd] = useState('Cash');
  const [pyMn, setPyMn] = useState('');
  const [pyRef, setPyRef] = useState('');
  const [pyTy, setPyTy] = useState('Monthly Tuition');
  const [pyNote, setPyNote] = useState('');
  const [pyExtras, setPyExtras] = useState([]); // selected fextras indices
  const [pyNewExLabel, setPyNewExLabel] = useState('');
  const [pyNewExAmt, setPyNewExAmt] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showRec, setShowRec] = useState(false);
  const [tab, setTab] = useState(0);
  const [ledStu, setLedStu] = useState('');
  const [histStu, setHistStu] = useState('');

  const classes = [...new Set(db.students.map(s => s.cls))].sort();
  const classStudents = selClass ? feeRows.filter(s => s.cls === selClass) : [];
  const piStu = feeRows.find(s => s.id === selStu);
  const piBal = piStu ? Math.max(0, piStu.fee - piStu._paid) : 0;
  const piPct = piStu && piStu.fee > 0 ? Math.min(100, Math.round(piStu._paid / piStu.fee * 100)) : 0;
  const extrasTotal = (piStu?.fextras||[]).filter((_,i)=>pyExtras.includes(i)).reduce((s,e)=>s+(parseFloat(e.amt)||0),0);

  // Months already paid by this student (from pays records)
  const ALL_MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];
  const paidMonths = new Set(selStu ? db.pays.filter(p => p.sid === selStu && p.mn).map(p => p.mn) : []);
  const availableMonths = ALL_MONTHS.filter(m => !paidMonths.has(m));

  // Other charges defined on the student (fextras)
  const stuExtras = piStu?.fextras || [];
  const pyTotalAmt = (parseFloat(pyAmt) || 0);
  const pyPreview = piStu && ((parseFloat(pyAmt) || 0) > 0 || extrasTotal > 0) ? Math.max(0, piStu.fee - piStu._paid - (parseFloat(pyAmt) || 0) - extrasTotal) : null;

  // History tab computed
  const filteredPays = histStu ? [...db.pays].filter(p => p.sid === histStu).reverse() : [...db.pays].reverse();
  const histStudent = histStu ? db.students.find(x => x.id === histStu) : null;
  const histTotal = filteredPays.reduce((s, p) => s + p.amt, 0);
  const recPay = () => {
    if (!selStu || !pyDt) { toast('Student and date required', 'err'); return; }
    if (!pyMn && pyExtras.length === 0) { toast('Select a month or at least one charge', 'err'); return; }
    const s = db.students.find(x => x.id === selStu); if (!s) return;
    const selectedCharges = (piStu?.fextras||[]).filter((_,i) => pyExtras.includes(i));
    const tuition = pyMn ? (parseFloat(pyAmt) || 0) : 0;
    const total = tuition + extrasTotal;
    if (total <= 0) { toast('Amount must be greater than 0', 'err'); return; }
    const pp = paidTotal(db.pays, selStu), bb = Math.max(0, s.fee - pp), ba = Math.max(0, bb - total);
    const rc = 'RCP-' + new Date().getFullYear() + '-' + String(db.pays.length + 1).padStart(4, '0');
    // For extras-only payments, set mn to the charge labels
    const mnLabel = pyMn || selectedCharges.map(e => e.label).join(', ');
    const pay = { id: 'PAY' + uid(), dt: pyDt, sid: selStu, nm: s.fn + ' ' + s.ln, cls: s.cls, fee: s.fee, amt: total, totalAmt: total, tuition, extras: selectedCharges, md: pyMd, ref: pyRef, mn: mnLabel, ty: pyTy, note: pyNote, rc, bb, ba };
    save({ ...db, pays: [...db.pays, pay] });
    setReceipt({ pay, s }); setShowRec(true);
    setPyAmt(''); setPyRef(''); setPyNote(''); setPyMn(''); setPyExtras([]);
    toast('Recorded! ' + rc);
  };

  const printRec = () => {
    if (!receipt) return; const { pay, s } = receipt; const sch = db.settings.school || 'LKPS', full = pay.ba === 0;
    const css = 'body{font-family:Arial,sans-serif;padding:28px;max-width:390px;margin:0 auto;color:#181c1e}.sch{font-size:17px;font-weight:700;text-align:center}.ttl{font-size:12px;font-weight:600;color:#002045;text-align:center;margin:7px 0;text-transform:uppercase}.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e0e3e5;font-size:12.5px}.lbl{color:#43474e}.val{font-weight:600}.tot{background:#d1fae5;border-radius:6px;padding:10px 12px;display:flex;justify-content:space-between;margin-top:9px}.bal{border-radius:6px;padding:8px 12px;display:flex;justify-content:space-between;margin-top:7px;background:' + (full ? '#d1fae5' : '#ffdad6') + '}.note{font-size:10.5px;color:#74777f;margin-top:8px;text-align:center}@media print{@page{margin:8px}}';
    const w = window.open('', '_blank', 'width=480,height=680');
    const extrasRows = (pay.extras||[]).map(e=>'<div class="row"><span class="lbl">'+e.label+'</span><span class="val">₹'+(parseFloat(e.amt)||0).toLocaleString('en-IN')+'</span></div>').join('');
    const tuitionRow = pay.tuition > 0 ? '<div class="row"><span class="lbl">Tuition ('+( pay.mn||pay.ty||'Fee')+')</span><span class="val">₹'+pay.tuition.toLocaleString('en-IN')+'</span></div>' : '';
    const displayTotal = (pay.totalAmt || pay.amt || 0);
    w.document.write('<!DOCTYPE html><html><head><style>' + css + '</style></head><body><div class="sch">' + sch + '</div>' + (db.settings.addr ? '<div style="font-size:11px;color:#43474e;text-align:center">' + db.settings.addr + '</div>' : '') + '<div class="ttl">Fee Payment Receipt</div><div class="row"><span class="lbl">Receipt</span><span class="val" style="color:#002045">' + pay.rc + '</span></div><div class="row"><span class="lbl">Date</span><span class="val">' + pay.dt + '</span></div><div class="row"><span class="lbl">Student</span><span class="val">' + s.fn + ' ' + s.ln + '</span></div><div class="row"><span class="lbl">Adm No.</span><span class="val">' + (s.admno||'—') + '</span></div><div class="row"><span class="lbl">Class/Roll</span><span class="val">' + s.cls + '/' + s.roll + '</span></div><div class="row"><span class="lbl">Father</span><span class="val">' + (s.father || '—') + '</span></div><div class="row"><span class="lbl">Method</span><span class="val">' + pay.md + (pay.ref ? ' (' + pay.ref + ')' : '') + '</span></div><div class="row"><span class="lbl">Annual Fee Bal Before</span><span class="val" style="color:#ba1a1a">₹' + pay.bb.toLocaleString('en-IN') + '</span></div>' + tuitionRow + extrasRows + '<div class="tot"><span style="font-size:13px;font-weight:600;color:#059669">Total Received</span><span style="font-size:17px;font-weight:700;color:#059669">₹' + displayTotal.toLocaleString('en-IN') + '</span></div><div class="bal"><span style="font-size:13px;font-weight:600;color:' + (full ? '#059669' : '#ba1a1a') + '">Annual Fee Balance</span><span style="font-size:15px;font-weight:700;color:' + (full ? '#059669' : '#ba1a1a') + '">₹' + pay.ba.toLocaleString('en-IN') + '</span></div><div class="note">Computer generated receipt.</div><script>window.onload=()=>window.print()<\/script></body></html>');
    w.document.close();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-4xl font-extrabold text-primary tracking-tight" style={{fontFamily:'Manrope,sans-serif'}}>Fees Management Portal</h2>
        <p className="text-on-surface-variant mt-1 font-medium tracking-wide text-sm">Real-time oversight of institutional cash flow and student liabilities.</p>
      </div>

      {/* Financial Summary Card — full width */}
      <div className="bg-surface-container-lowest rounded-2xl p-8 relative overflow-hidden group border border-surface-container-high">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"/>
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-1">Total Academic Collection</p>
              <h3 className="text-5xl font-extrabold text-primary tracking-tighter" style={{fontFamily:'Manrope,sans-serif'}}>₹{totalCollected.toLocaleString('en-IN')}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-1">Total Outstanding</p>
              <h3 className="text-3xl font-extrabold text-error tracking-tight" style={{fontFamily:'Manrope,sans-serif'}}>₹{totalPending.toLocaleString('en-IN')}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-1">Collection Rate</p>
              <h3 className="text-3xl font-extrabold tracking-tight" style={{fontFamily:'Manrope,sans-serif',color:'#059669'}}>{collectionRate}%</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase text-on-surface-variant px-1">
              <span>Collected ({collectionRate}%)</span>
              <span>Remaining ({100 - collectionRate}%)</span>
            </div>
            <div className="h-3 w-full bg-surface-container-low rounded-full flex overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{width: collectionRate + '%'}}/>
              <div className="h-full bg-error-container" style={{width: (100 - collectionRate) + '%'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Collect Fee Panel — full width below summary */}
      <div className="bg-primary-container rounded-2xl p-8 shadow-xl">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white" style={{fontFamily:'Manrope,sans-serif'}}>
          💳 Collect Fee
        </h3>
        <div className="grid grid-cols-12 gap-6">
          {/* Left col: Class + Student selectors + Student card */}
          <div className="col-span-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Step 1 — Select Class</label>
              <select value={selClass} onChange={e=>{setSelClass(e.target.value);setSelStu('');}}
                className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/30 appearance-none">
                <option value="" className="text-primary">— Class —</option>
                {classes.map(c=><option key={c} value={c} className="text-primary">{c}</option>)}
              </select>
            </div>
            {selClass && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Step 2 — Select Student</label>
                <select value={selStu} onChange={e=>{setSelStu(e.target.value);setPyExtras([]);setPyNewExLabel('');setPyNewExAmt('');}}
                  className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/30 appearance-none">
                  <option value="" className="text-primary">— Student —</option>
                  {classStudents.map(s=><option key={s.id} value={s.id} className="text-primary">{s.fn} {s.ln} (Roll: {s.roll})</option>)}
                </select>
              </div>
            )}
            {/* Student Detail Card */}
            {piStu ? (
              <div className="bg-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-extrabold text-base flex-shrink-0">
                    {piStu.fn?.[0]}{piStu.ln?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-extrabold text-white leading-tight">{piStu.fn} {piStu.ln}</div>
                    <div className="text-[11px] text-on-primary-container mt-0.5">Class {piStu.cls} · Roll {piStu.roll}</div>
                    {piStu.admno && <div className="text-[11px] text-on-primary-container">Adm No: {piStu.admno}</div>}
                    {piStu.father && <div className="text-[11px] text-on-primary-container">Father: {piStu.father}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Annual Fee','text-white',piStu.fee],['Paid','text-emerald-300',piStu._paid],['Balance','text-red-300',piBal]].map(([l,c,v])=>(
                    <div key={l} className="text-center bg-white/10 rounded-xl py-3">
                      <div className="text-[9px] text-on-primary-container uppercase tracking-wide mb-1">{l}</div>
                      <div className={'text-sm font-extrabold '+c}>₹{v.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-on-primary-container mb-1">
                    <span>Fee collected</span><span className="font-bold text-white">{piPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{width:piPct+'%'}}/>
                  </div>
                </div>
                {piStu._overdue && !piStu._fullyPaid && (
                  <div className="text-[11px] text-red-300 font-semibold bg-red-500/10 rounded-lg px-3 py-2">⚠ Overdue ~{piStu._overdueMonths} month{piStu._overdueMonths!==1?'s':''} · ₹{piStu._overdueAmt.toLocaleString('en-IN')} pending</div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 border border-white/10" style={{minHeight:'160px'}}>
                <div className="text-3xl opacity-30">🎓</div>
                <p className="text-[11px] text-on-primary-container">Select a class and student to begin</p>
              </div>
            )}
          </div>

          {/* Middle col: Month + Other Charges */}
          <div className="col-span-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Step 3 — Fee Month</label>
              <select value={pyMn} onChange={e=>{
                const val = e.target.value;
                setPyMn(val);
                if(piStu && val && piStu.mf > 0) setPyAmt(String(piStu.mf));
              }}
                className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/30 appearance-none">
                <option value="" className="text-primary">— Select Month (optional) —</option>
                {availableMonths.map(m=><option key={m} className="text-primary">{m}</option>)}
                {availableMonths.length === 0 && <option disabled className="text-primary">All months paid ✓</option>}
              </select>
              {paidMonths.size > 0 && (
                <div className="text-[10px] text-on-primary-container mt-1.5 leading-relaxed">Already paid: {[...paidMonths].join(', ')}</div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Other Charges</label>
              {(piStu?.fextras||[]).length > 0 ? (
                <div className="space-y-2 mb-3">
                  {(piStu.fextras||[]).map((ex, i) => {
                    const selected = pyExtras.includes(i);
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <button type="button"
                          onClick={()=>setPyExtras(selected ? pyExtras.filter(x=>x!==i) : [...pyExtras, i])}
                          className={'flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer '+(selected?'bg-emerald-500/30 text-white ring-1 ring-emerald-400':'bg-white/10 text-white/70 hover:bg-white/20')}>
                          <span className="flex items-center gap-2.5">
                            <span className={'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold '+(selected?'bg-emerald-400 text-white':'bg-white/20 text-white/40')}>{selected?'✓':''}</span>
                            {ex.label}
                          </span>
                          <span className={selected?'text-emerald-300 font-bold':'text-white/50'}>₹{(parseFloat(ex.amt)||0).toLocaleString('en-IN')}</span>
                        </button>
                        <button type="button" title="Edit" onClick={()=>{
                          const newLabel = window.prompt('Edit charge name:', ex.label);
                          if(newLabel === null) return;
                          const newAmt = window.prompt('Edit amount (₹):', ex.amt);
                          if(newAmt === null || !parseFloat(newAmt)) return;
                          const updatedStudents = db.students.map(x => {
                            if(x.id !== selStu) return x;
                            const fextras = (x.fextras||[]).map((e,j)=>j===i?{label:newLabel.trim(),amt:newAmt}:e);
                            const extrasSum = fextras.reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
                            return {...x, fextras, fee:(x.mf||0)*12+extrasSum};
                          });
                          save({...db, students: updatedStudents});
                        }} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs flex items-center justify-center transition-all border-0 cursor-pointer flex-shrink-0">✎</button>
                        <button type="button" title="Delete" onClick={()=>{
                          if(!window.confirm('Remove "'+ex.label+'" from this student\'s charges?')) return;
                          const updatedStudents = db.students.map(x => {
                            if(x.id !== selStu) return x;
                            const fextras = (x.fextras||[]).filter((_,j)=>j!==i);
                            const extrasSum = fextras.reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
                            return {...x, fextras, fee:(x.mf||0)*12+extrasSum};
                          });
                          save({...db, students: updatedStudents});
                          setPyExtras(pyExtras.filter(x=>x!==i).map(x=>x>i?x-1:x));
                        }} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/60 hover:text-red-300 text-xs flex items-center justify-center transition-all border-0 cursor-pointer flex-shrink-0">✕</button>
                      </div>
                    );
                  })}
                </div>
              ) : piStu ? (
                <p className="text-[11px] text-on-primary-container mb-2">No charges defined. Add one below.</p>
              ) : null}
              <div className="flex gap-2">
                <input value={pyNewExLabel} onChange={e=>setPyNewExLabel(e.target.value)} placeholder="Charge name"
                  className="flex-1 bg-white/10 border-none rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30"/>
                <input type="number" value={pyNewExAmt} onChange={e=>setPyNewExAmt(e.target.value)} placeholder="₹"
                  className="w-20 bg-white/10 border-none rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30"/>
                <button type="button" onClick={()=>{
                  if(!pyNewExLabel.trim()||!parseFloat(pyNewExAmt)){toast('Enter name and amount','err');return;}
                  const newEx = {label:pyNewExLabel.trim(), amt:pyNewExAmt};
                  const updatedStudents = db.students.map(x => {
                    if(x.id !== selStu) return x;
                    const fextras = [...(x.fextras||[]), newEx];
                    const extrasSum = fextras.reduce((s,e)=>s+(parseFloat(e.amt)||0),0);
                    return {...x, fextras, fee:(x.mf||0)*12+extrasSum};
                  });
                  save({...db, students: updatedStudents});
                  const newIdx = (piStu?.fextras||[]).length;
                  setPyExtras([...pyExtras, newIdx]);
                  setPyNewExLabel(''); setPyNewExAmt('');
                  toast('Charge added');
                }} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-lg flex items-center justify-center transition-all flex-shrink-0 border-0 cursor-pointer">+</button>
              </div>
            </div>
          </div>

          {/* Right col: Payment details + total + submit */}
          <div className="col-span-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Payment Mode</label>
                <select value={pyMd} onChange={e=>setPyMd(e.target.value)}
                  className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/30 appearance-none">
                  {['Cash','UPI','Online','Cheque','DD'].map(m=><option key={m} className="text-primary">{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Monthly Fee (₹){pyMn ? ' *' : ''}</label>
                <input type="number" value={pyAmt} onChange={e=>setPyAmt(e.target.value)}
                  placeholder={pyMn ? String(piStu?.mf||0) : 'Select month first'}
                  disabled={!pyMn}
                  className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 disabled:opacity-40 disabled:cursor-not-allowed"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-primary-container mb-1.5">Payment Date</label>
              <input type="date" value={pyDt} onChange={e=>setPyDt(e.target.value)}
                className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/30"/>
            </div>
            <div className="bg-white/10 rounded-2xl px-5 py-4 space-y-2">
              {pyMn && parseFloat(pyAmt) > 0 && (
                <div className="flex justify-between text-sm text-on-primary-container">
                  <span>Monthly fee ({pyMn})</span>
                  <span className="font-bold text-white">₹{(parseFloat(pyAmt)||0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(piStu?.fextras||[]).filter((_,i)=>pyExtras.includes(i)).map((ex,i)=>(
                <div key={i} className="flex justify-between text-sm text-on-primary-container">
                  <span>{ex.label}</span>
                  <span className="font-bold text-emerald-300">₹{(parseFloat(ex.amt)||0).toLocaleString('en-IN')}</span>
                </div>
              ))}
              {(parseFloat(pyAmt) > 0 || extrasTotal > 0) ? (
                <div className="flex justify-between text-base pt-2" style={{borderTop:'1px solid rgba(255,255,255,0.15)'}}>
                  <span className="font-extrabold text-white uppercase tracking-wide">Total</span>
                  <span className="font-extrabold text-white text-lg">₹{((parseFloat(pyAmt)||0)+extrasTotal).toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <p className="text-[11px] text-on-primary-container text-center py-2">Select month or charges to see total</p>
              )}
            </div>
            {pyPreview !== null && (
              <div className="text-[12px] text-emerald-300 font-semibold bg-emerald-500/10 rounded-xl px-4 py-2.5">
                After payment: Annual balance = ₹{pyPreview.toLocaleString('en-IN')}
              </div>
            )}
            <button onClick={recPay} disabled={!selStu || (!pyMn && pyExtras.length === 0)}
              className="w-full bg-secondary-container hover:bg-white text-primary font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed">
              Record Transaction →
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Overdue / History / Ledger */}
      <div>
        <div className="flex gap-1 mb-4 bg-surface-container-low rounded-xl p-1 w-fit">
          {['Overdue Accounts','Payment History','Student Ledger'].map((t,i)=>(
            <button key={t} onClick={()=>setTab(i)}
              className={'px-4 py-2 rounded-lg text-xs font-bold transition-all '+(tab===i?'bg-white text-primary shadow-sm':'text-on-surface-variant hover:text-primary')}>
              {t}
            </button>
          ))}
        </div>

        {/* Overdue Accounts Table */}
        {tab===0 && (
          <div className="bg-surface-container-low rounded-2xl p-1">
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
              <div className="px-6 py-5 flex justify-between items-center border-b border-surface-container-low">
                <div>
                  <h3 className="text-xl font-bold text-primary" style={{fontFamily:'Manrope,sans-serif'}}>Overdue Accounts</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Students with fee overdue by at least 1 month</p>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">{overdueRows.length} student{overdueRows.length!==1?'s':''} overdue</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low/30">
                    <tr>
                      {['Student Name','Class','Status','Months Overdue','Amount Due','Actions'].map(h=>(
                        <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {overdueRows.map(s=>(
                      <tr key={s.id} className="group hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm flex-shrink-0">
                              {s.fn?.[0]}{s.ln?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">{s.fn} {s.ln}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium">{s.admno||s.roll||'—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-on-surface">{s.cls}</td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-error-container text-error uppercase tracking-wide">
                            Overdue
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-error">{s._overdueMonths} mo.</td>
                        <td className="px-6 py-5 text-sm font-extrabold text-primary">₹{s._overdueAmt.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-5">
                          <button onClick={()=>{setSelClass(s.cls);setSelStu(s.id);}}
                            className="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                            💳 Collect Fee
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!overdueRows.length && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                        <div className="text-3xl mb-2">✅</div>No overdue accounts — all students are up to date!
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payment History */}
        {tab===1 && (() => {
          const filteredPays = histStu
            ? [...db.pays].filter(p => p.sid === histStu).reverse()
            : [...db.pays].reverse();
          const histStudent = histStu ? db.students.find(x => x.id === histStu) : null;
          const histTotal = filteredPays.reduce((s, p) => s + p.amt, 0);
          return (
            <div>
              {/* Student filter bar */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 bg-surface-container-low rounded-xl p-1">
                  <button onClick={()=>setHistStu('')}
                    className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all '+(histStu===''?'bg-white text-primary shadow-sm':'text-on-surface-variant hover:text-primary')}>
                    All Students
                  </button>
                </div>
                <Select value={histStu} onChange={setHistStu} style={{width:240}}>
                  <option value="">— Filter by Student —</option>
                  {db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
                </Select>
                {histStudent && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
                    <div className="w-6 h-6 rounded-md bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-[10px]">
                      {histStudent.fn?.[0]}{histStudent.ln?.[0]}
                    </div>
                    <span className="text-xs font-bold text-primary">{histStudent.fn} {histStudent.ln}</span>
                    <span className="text-[10px] text-on-surface-variant">· {filteredPays.length} txn{filteredPays.length!==1?'s':''} · ₹{histTotal.toLocaleString('en-IN')}</span>
                    <button onClick={()=>setHistStu('')} className="text-outline hover:text-error text-xs ml-1">✕</button>
                  </div>
                )}
                {!histStudent && db.pays.length > 0 && (
                  <span className="text-xs text-on-surface-variant">{filteredPays.length} transaction{filteredPays.length!==1?'s':''} · ₹{histTotal.toLocaleString('en-IN')} total</span>
                )}
              </div>
              <TblWrap>
                <table>
                  <thead><tr>
                    <th>Date</th><th>Receipt</th><th>Student</th><th>Class</th><th>Month</th><th>Type</th><th>Amount</th><th>Method</th><th>Balance After</th><th></th>
                  </tr></thead>
                  <tbody>
                    {filteredPays.map(p=>(
                      <tr key={p.id}>
                        <td className="whitespace-nowrap">{p.dt}</td>
                        <td><Badge color="blue">{p.rc}</Badge></td>
                        <td className="font-medium">{p.nm}</td>
                        <td><Badge color="blue">{p.cls}</Badge></td>
                        <td className="text-on-surface-variant">{p.mn||'—'}</td>
                        <td className="text-on-surface-variant">{p.ty||'—'}</td>
                        <td className="font-bold text-emerald-600">₹{(p.totalAmt||p.amt||0).toLocaleString('en-IN')}</td>
                        <td>{p.md}</td>
                        <td className={'font-semibold '+(p.ba===0?'text-emerald-600':'text-error')}>₹{(p.ba||0).toLocaleString('en-IN')}</td>
                        <td><Btn size="sm" onClick={()=>{const s=db.students.find(x=>x.id===p.sid);if(s){setReceipt({pay:p,s});setShowRec(true);}}}>Receipt</Btn></td>
                      </tr>
                    ))}
                    {!filteredPays.length && <tr><td colSpan={10}><NoData text={histStu?'No payments for this student':'No payments recorded'}/></td></tr>}
                  </tbody>
                </table>
              </TblWrap>
            </div>
          );
        })()}

        {/* Student Ledger */}
        {tab===2 && (
          <div>
            <div className="mb-4">
              <Select value={ledStu} onChange={setLedStu} style={{width:280}}>
                <option value="">Select Student</option>
                {db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
              </Select>
            </div>
            {ledStu ? (() => {
              const s = db.students.find(x=>x.id===ledStu); if(!s) return null;
              const pays = db.pays.filter(p=>p.sid===ledStu).sort((a,b)=>new Date(a.dt)-new Date(b.dt));
              const tp = pays.reduce((s,p)=>s+p.amt,0), bal = s.fee - tp, full = bal <= 0; let run = s.fee;
              return (
                <>
                  <div className="flex justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <div className="text-lg font-bold text-on-surface">{s.fn} {s.ln}</div>
                      <div className="text-xs text-on-surface-variant">Class {s.cls} · Roll: {s.roll}</div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {[['Annual','bg-surface-container-low','text-on-surface',s.fee],['Paid','bg-emerald-50','text-emerald-700',tp],['Balance',full?'bg-emerald-50':'bg-error-container',full?'text-emerald-700':'text-error',Math.max(0,bal)]].map(([l,bg,c,v])=>(
                        <div key={l} className={'text-center '+bg+' px-4 py-2 rounded-xl'}>
                          <div className={'text-[10px] '+c}>{l}</div>
                          <div className={'text-sm font-bold '+c}>₹{v.toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden mb-4">
                    <div className="h-full rounded-full bg-emerald-500" style={{width:Math.min(100,s.fee>0?Math.round(tp/s.fee*100):0)+'%'}}/>
                  </div>
                  <div className="text-sm font-semibold text-on-surface mb-3">Payment Timeline</div>
                  {pays.length ? pays.map(p=>{run-=p.amt;return(
                    <div key={p.id} className="flex gap-3 mb-3 pl-4" style={{borderLeft:'2px solid #e0e3e5'}}>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" style={{marginLeft:-13,border:'2px solid white'}}/>
                      <div>
                        <div className="text-xs text-on-surface-variant">{p.dt} · {p.md}{p.mn?' · '+p.mn:''}</div>
                        <div className="text-sm font-semibold text-on-surface">₹{p.amt.toLocaleString('en-IN')} <Badge color="blue">{p.rc}</Badge></div>
                        <div className="text-xs text-on-surface-variant">Bal: ₹{Math.max(0,run).toLocaleString('en-IN')}{p.note?' · '+p.note:''}</div>
                      </div>
                    </div>
                  );}) : <NoData text="No payments"/>}
                  <div className="mt-3"><Btn variant="primary" size="sm" onClick={()=>{setSelClass(s.cls);setSelStu(s.id);setTab(-1);setTimeout(()=>setTab(0),0);}}>+ Record Payment</Btn></div>
                </>
              );
            })() : <NoData text="Select a student"/>}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receipt && <Modal open={showRec} onClose={()=>setShowRec(false)} title="Receipt">
        <div>
          <div className="text-center pb-4 mb-4" style={{borderBottom:'2px dashed #e0e3e5'}}>
            <div className="text-lg font-bold text-on-surface">{db.settings.school||'LKPS'}</div>
            {db.settings.addr&&<div className="text-xs text-on-surface-variant">{db.settings.addr}</div>}
            <div className="text-xs font-semibold text-primary mt-2 uppercase tracking-wide">Fee Payment Receipt</div>
          </div>
          {[['Receipt No.',receipt.pay.rc,'text-primary'],['Date',receipt.pay.dt,''],['Student',receipt.s.fn+' '+receipt.s.ln,''],['Class/Roll',receipt.s.cls+'/'+receipt.s.roll,''],['Father',receipt.s.father||'—',''],['Type',(receipt.pay.ty||'—')+(receipt.pay.mn?' ('+receipt.pay.mn+')':''),''],['Annual Fee','₹'+receipt.s.fee.toLocaleString('en-IN'),''],['Bal Before','₹'+receipt.pay.bb.toLocaleString('en-IN'),'text-error'],['Method',receipt.pay.md+(receipt.pay.ref?' ('+receipt.pay.ref+')':''),'']].map(([l,v,c])=>(
            <div key={l} className="flex justify-between py-1.5 text-sm" style={{borderBottom:'1px solid rgba(196,198,207,0.5)'}}>
              <span className="text-on-surface-variant">{l}</span><span className={'font-semibold '+(c||'text-on-surface')}>{v}</span>
            </div>
          ))}
          <div className="bg-emerald-50 rounded-xl px-4 py-3 flex justify-between mt-3">
            <span className="text-sm font-semibold text-emerald-700">Amount Received</span>
            <span className="text-lg font-bold text-emerald-700">₹{receipt.pay.amt.toLocaleString('en-IN')}</span>
          </div>
          <div className={'rounded-xl px-4 py-3 flex justify-between mt-2 '+(receipt.pay.ba===0?'bg-emerald-50':'bg-error-container')}>
            <span className={'text-sm font-semibold '+(receipt.pay.ba===0?'text-emerald-700':'text-error')}>Balance</span>
            <span className={'text-base font-bold '+(receipt.pay.ba===0?'text-emerald-700':'text-error')}>₹{receipt.pay.ba.toLocaleString('en-IN')}</span>
          </div>
          {receipt.pay.ba===0&&<div className="text-center mt-3"><span className="border-2 border-emerald-600 text-emerald-600 font-bold text-xs px-4 py-1 rounded inline-block" style={{transform:'rotate(-4deg)'}}>FULLY PAID</span></div>}
        </div>
        <ModalFooter><Btn onClick={()=>setShowRec(false)}>Close</Btn><Btn variant="primary" onClick={printRec}>Print</Btn></ModalFooter>
      </Modal>}
    </div>
  );
}

// ── Pannable / zoomable document preview ─────────────────────────
function DocPreview({ srcDoc, docW = 820, docH = 1100 }) {
  const [zoom, setZoom] = React.useState(0.56);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const dragging = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });
  const containerRef = React.useRef(null);

  const clampPan = React.useCallback((x, y, z) => {
    const cw = containerRef.current?.clientWidth  || 600;
    const ch = containerRef.current?.clientHeight || 520;
    const maxX = Math.max(0, docW * z - cw);
    const maxY = Math.max(0, docH * z - ch);
    return { x: Math.min(0, Math.max(-maxX, x)), y: Math.min(0, Math.max(-maxY, y)) };
  }, [docW, docH]);

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => {
      const nz = Math.min(2, Math.max(0.25, +(z + delta).toFixed(2)));
      setPan(p => clampPan(p.x, p.y, nz));
      return nz;
    });
  };

  const onMouseDown = (e) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.style.cursor = 'grabbing';
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan(p => clampPan(p.x + dx, p.y + dy, zoom));
  };
  const onMouseUp = (e) => { dragging.current = false; e.currentTarget.style.cursor = 'grab'; };

  const resetView = () => { setZoom(0.56); setPan({ x: 0, y: 0 }); };
  const zoomIn  = () => setZoom(z => { const nz = Math.min(2, +(z+0.15).toFixed(2)); setPan(p=>clampPan(p.x,p.y,nz)); return nz; });
  const zoomOut = () => setZoom(z => { const nz = Math.max(0.25, +(z-0.15).toFixed(2)); setPan(p=>clampPan(p.x,p.y,nz)); return nz; });

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-1">
        <button onClick={zoomOut}
          className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant border-0 cursor-pointer text-lg font-bold leading-none transition-colors select-none">−</button>
        <span className="text-[11px] font-semibold text-on-surface-variant w-10 text-center tabular-nums">{Math.round(zoom*100)}%</span>
        <button onClick={zoomIn}
          className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant border-0 cursor-pointer text-lg font-bold leading-none transition-colors select-none">+</button>
        <div className="w-px h-4 bg-surface-variant mx-1"/>
        <button onClick={resetView}
          className="px-2.5 h-7 rounded-lg bg-surface-container text-[10px] font-bold text-on-surface-variant hover:bg-surface-variant border-0 cursor-pointer transition-colors uppercase tracking-wide select-none">Fit</button>
        <span className="ml-auto text-[10px] text-on-surface-variant/50 italic">Scroll to zoom · Drag to pan</span>
      </div>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl bg-surface-container-lowest overflow-hidden"
        style={{ height: '540px', cursor: 'grab', userSelect: 'none' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Checkerboard bg hint */}
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:'radial-gradient(circle,#94a3b8 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div style={{ position:'absolute', left: pan.x, top: pan.y, width: docW*zoom, height: docH*zoom, willChange:'transform' }}>
          <iframe
            srcDoc={srcDoc}
            style={{ width: docW+'px', height: docH+'px', border:'none', transformOrigin:'top left', transform:`scale(${zoom})`, display:'block', pointerEvents:'none' }}
            title="Document Preview"
          />
        </div>
      </div>
    </div>
  );
}

function Documents({ db, save }) {
  // Shared
  const [docTab, setDocTab] = useState('id'); // 'id' | 'tc' | 'cc'
  const [logoErr, setLogoErr] = useState(false);
  const logo = logoErr ? null : LOGO_SRC;
  const classes = db.classes.map(c => c.name);
  const getAtt = (sid) => { let p=0,t=0; Object.values(db.att).forEach(d=>{if(d[sid]!==undefined){t++;if(d[sid]==='P'||d[sid]==='L')p++;}}); return{p,t}; };

  // ID Card state
  const [selCls, setSelCls] = useState('');
  const [selStu, setSelStu] = useState('');
  const [selAll, setSelAll] = useState(false);
  const [phone, setPhone] = useState(db.settings.phone||'9997360040, 8650616990');
  const [year, setYear] = useState(db.settings.year||'2025-2026');
  const [prin, setPrin] = useState(db.settings.prin||'');
  const [theme, setTheme] = useState('blue');

  const clsStudents = selCls ? db.students.filter(s => s.cls === selCls) : db.students;
  const s = db.students.find(x => x.id === selStu);
  const photo = s ? (db.photos[s.id]||null) : null;
  const previewHTML = s
    ? buildCard(s, photo, logo, phone, year, prin, theme, true)
    : buildCard({fn:'Student',ln:'Name',cls:'—',father:'—',mother:'—',city:'',addr:'',fphone:'',ph:'',dob:''},null,logo,phone,year,prin,theme,true);

  // TC state — only fields NOT in student directory
  const [tcStu, setTcStu] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [tcDt, setTcDt] = useState(new Date().toISOString().split('T')[0]);
  const [tcAdmDt, setTcAdmDt] = useState(''); // admission date — not stored on student
  const [tcLd, setTcLd] = useState('');        // last date of attendance
  const [tcRs, setTcRs] = useState("Parents' Transfer");
  const [tcCo, setTcCo] = useState('Good');
  const [tcFe, setTcFe] = useState('All Dues Cleared');
  // CC state
  const [ccStu, setCcStu] = useState(''); const [ccNo, setCcNo] = useState(''); const [ccDt, setCcDt] = useState(new Date().toISOString().split('T')[0]); const [ccCo, setCcCo] = useState('Good'); const [ccPu, setCcPu] = useState('General Purpose'); const [ccRm, setCcRm] = useState('');

  const doTC = () => {
    if(!tcStu){toast('Select student','err');return;}
    const st=db.students.find(x=>x.id===tcStu);if(!st)return;
    const{p,t}=getAtt(tcStu);
    printTC(st,logo,db.settings,{tcNo:tcNo||'TC-'+uid(),dt:new Date(tcDt).toLocaleDateString('en-IN'),admDt:tcAdmDt?new Date(tcAdmDt).toLocaleDateString('en-IN'):'',ld:tcLd?new Date(tcLd).toLocaleDateString('en-IN'):'',reason:tcRs,conduct:tcCo,feeStatus:tcFe,attP:p,attT:t});
    toast('TC Generated');
  };
  const doCC = () => {
    if(!ccStu){toast('Select student','err');return;}
    const st=db.students.find(x=>x.id===ccStu);if(!st)return;
    const{p,t}=getAtt(ccStu);
    printCC(st,logo,db.settings,{ccNo:ccNo||'CC-'+uid(),dt:new Date(ccDt).toLocaleDateString('en-IN'),conduct:ccCo,purpose:ccPu,remarks:ccRm,attP:p,attT:t});
    toast('CC Generated');
  };

  return (
    <div className="p-6 space-y-8">
      <img src={LOGO_SRC} alt="" className="hidden" onError={()=>setLogoErr(true)} onLoad={()=>setLogoErr(false)}/>

      {/* Page Header */}
      <div>
        <h2 className="text-5xl font-extrabold text-primary tracking-tight" style={{fontFamily:'Manrope,sans-serif'}}>Document Studio</h2>
        <p className="text-on-surface-variant mt-1 font-medium tracking-wide text-sm">Batch generate identification cards and certificates for the academic year.</p>
      </div>

      {/* Template Toggle */}
      <div className="flex items-center gap-8 border-b border-surface-variant/30 pb-0">
        {[['id','badge','ID Card'],['tc','workspace_premium','Transfer Certificate'],['cc','verified_user','Character Certificate'],['rc','description','Report Card']].map(([id,icon,label])=>(
          <button key={id} onClick={()=>setDocTab(id)}
            className={'flex items-center gap-2 pb-4 font-extrabold text-base transition-all border-0 bg-transparent cursor-pointer relative '+(docTab===id?'text-primary':'text-on-surface-variant/50 hover:text-on-surface-variant')}
            style={{fontFamily:'Manrope,sans-serif'}}>
            <span className="material-symbols-outlined text-lg">{icon}</span>
            {label}
            {docTab===id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"/>}
          </button>
        ))}
      </div>

      {/* ID CARD TAB */}
      {docTab==='id' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-5 flex flex-col gap-6">
            <div className="bg-surface-container-low rounded-2xl p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-5">Configuration</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Academic Class</label>
                  <select value={selCls} onChange={e=>{setSelCls(e.target.value);setSelStu('');}}
                    className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                    <option value="">All Classes</option>
                    {classes.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1.5">School Phone</label>
                    <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number"
                      className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
                  </div>
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1.5">Academic Year</label>
                    <input value={year} onChange={e=>setYear(e.target.value)}
                      className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Principal Name</label>
                  <input value={prin} onChange={e=>setPrin(e.target.value)} placeholder="Principal"
                    className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Card Theme</label>
                  <select value={theme} onChange={e=>setTheme(e.target.value)}
                    className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                    <option value="blue">Blue (Default)</option>
                    <option value="green">Green</option>
                    <option value="maroon">Maroon / Red</option>
                    <option value="navy">Navy</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high overflow-hidden flex-1">
              <div className="flex justify-between items-center px-5 py-4 border-b border-surface-container-low">
                <span className="text-sm font-bold text-primary" style={{fontFamily:'Manrope,sans-serif'}}>Student List</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selAll} onChange={e=>setSelAll(e.target.checked)} className="rounded border-outline text-primary focus:ring-primary"/>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Select All</span>
                </label>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-surface-container-low">
                {clsStudents.map((st)=>(
                  <div key={st.id} onClick={()=>setSelStu(st.id)}
                    className={'flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors group '+(selStu===st.id?'bg-primary/5':'hover:bg-surface-container-low')}>
                    <input type="checkbox" checked={selAll||selStu===st.id} readOnly className="rounded border-outline text-primary focus:ring-primary"/>
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {st.fn?.[0]}{st.ln?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{st.fn} {st.ln}</p>
                      <p className="text-[10px] text-on-surface-variant">Roll: {st.roll} · {st.cls}</p>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant/40 opacity-0 group-hover:opacity-100 uppercase">Select</span>
                  </div>
                ))}
                {!clsStudents.length && <div className="px-5 py-8 text-center text-sm text-on-surface-variant">No students</div>}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={()=>{if(!selStu){toast('Select a student','err');return;} printCard(s,photo,logo,phone,year,prin,theme);}}
                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 border-0 cursor-pointer hover:opacity-90 transition-opacity"
                style={{fontFamily:'Manrope,sans-serif'}}>
                <span className="material-symbols-outlined text-lg">id_card</span>
                Generate ID Card
              </button>
              <button onClick={()=>{
                if(!selCls){toast('Select a class first','err');return;}
                const sts=db.students.filter(x=>x.cls===selCls);
                printClassCards(sts,db.photos,logo,phone,year,prin,theme);
                toast('Printing '+sts.length+' cards');
              }}
                className="w-full py-4 bg-surface-container-highest text-primary rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 border-0 cursor-pointer hover:bg-surface-variant transition-colors"
                style={{fontFamily:'Manrope,sans-serif'}}>
                <span className="material-symbols-outlined text-lg">print</span>
                Print Entire Class
              </button>
            </div>
          </div>
          <div className="col-span-7 flex flex-col gap-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Live Preview</p>
            <div className="flex gap-8 items-start">
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Front Face</span>
                <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-center" style={{minHeight:'320px'}}>
                  <div dangerouslySetInnerHTML={{__html:previewHTML}}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER CERTIFICATE TAB */}
      {docTab==='tc' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-5 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Transfer Certificate</p>

            {/* Student selector */}
            <div>
              <label className="block text-sm text-on-surface-variant mb-1.5">Student *</label>
              <select value={tcStu} onChange={e=>setTcStu(e.target.value)}
                className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                <option value="">— Select Student —</option>
                {db.students.map(st=><option key={st.id} value={st.id}>{st.fn} {st.ln} ({st.cls})</option>)}
              </select>
            </div>

            {/* Auto-filled student data preview */}
            {tcStu && (()=>{const st=db.students.find(x=>x.id===tcStu);return st?(
              <div className="bg-surface-container-lowest rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Auto-filled from student record</p>
                {[
                  ['Name', st.fn+' '+st.ln],
                  ['Father', st.father||'—'],
                  ['Mother', st.mother||'—'],
                  ['Class / Roll', (st.cls||'—')+' / '+(st.roll||'—')],
                  ['Adm. No.', st.admno||'—'],
                  ['DOB', st.dob?new Date(st.dob).toLocaleDateString('en-IN'):'—'],
                  ['Address', st.addr?(st.addr+(st.city?', '+st.city:'')):'—'],
                  ['Blood Group', st.blood||'—'],
                  ['Aadhaar', st.aadhar||'—'],
                ].map(([l,v])=>(
                  <div key={l} className="flex gap-2 text-xs">
                    <span className="text-on-surface-variant w-24 flex-shrink-0">{l}</span>
                    <span className="font-semibold text-on-surface">{v}</span>
                  </div>
                ))}
              </div>
            ):null;})()}

            {/* Fields NOT in student directory — must ask */}
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant pt-1">Additional details required</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">TC Number</label>
                <input value={tcNo} onChange={e=>setTcNo(e.target.value)} placeholder="TC-2025-001"
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Issue Date</label>
                <input type="date" value={tcDt} onChange={e=>setTcDt(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Date of Admission</label>
                <input type="date" value={tcAdmDt} onChange={e=>setTcAdmDt(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Last Date of Attendance</label>
                <input type="date" value={tcLd} onChange={e=>setTcLd(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Conduct</label>
                <select value={tcCo} onChange={e=>setTcCo(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  {['Good','Very Good','Excellent','Satisfactory'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Fee Status</label>
                <select value={tcFe} onChange={e=>setTcFe(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  {['All Dues Cleared','Dues Pending'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1.5">Reason for Leaving</label>
              <select value={tcRs} onChange={e=>setTcRs(e.target.value)}
                className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                {["Parents' Transfer","Change of Residence","Admission to Other School","Completion of Studies","Family Reasons"].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>

            <button onClick={doTC}
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 border-0 cursor-pointer hover:opacity-90 transition-opacity mt-2"
              style={{fontFamily:'Manrope,sans-serif'}}>
              <span className="material-symbols-outlined text-lg">workspace_premium</span>
              Generate Transfer Certificate
            </button>
          </div>
          <div className="col-span-7 bg-surface-container-low rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant px-1">Live Preview</p>
            {(()=>{
              const st = tcStu ? db.students.find(x=>x.id===tcStu) : null;
              const previewSt = st || {fn:'Student',ln:'Name',father:'Father Name',mother:'Mother Name',cls:'—',roll:'—',admno:'—',dob:'',addr:'',city:'',blood:'',aadhar:''};
              const {p:attPv,t:attTv} = tcStu ? getAtt(tcStu) : {p:0,t:0};
              const html = buildTC(previewSt, logo, db.settings, {
                tcNo: tcNo||'TC-2025-001',
                dt: new Date(tcDt).toLocaleDateString('en-IN'),
                admDt: tcAdmDt ? new Date(tcAdmDt).toLocaleDateString('en-IN') : '—',
                ld: tcLd ? new Date(tcLd).toLocaleDateString('en-IN') : '—',
                reason: tcRs, conduct: tcCo, feeStatus: tcFe,
                attP: attPv, attT: attTv,
              });
              const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;}</style></head>${html}</html>`;
              return <DocPreview srcDoc={srcDoc} docW={820} docH={1100}/>;
            })()}
          </div>
        </div>
      )}

      {/* CHARACTER CERTIFICATE TAB */}
      {docTab==='cc' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-5 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Character Certificate</p>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1.5">Student *</label>
              <select value={ccStu} onChange={e=>setCcStu(e.target.value)}
                className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                <option value="">— Select Student —</option>
                {db.students.map(st=><option key={st.id} value={st.id}>{st.fn} {st.ln} ({st.cls})</option>)}
              </select>
            </div>
            {ccStu && (()=>{const st=db.students.find(x=>x.id===ccStu);return st?(
              <div className="bg-surface-container-lowest rounded-xl p-4">
                <div className="text-sm font-bold text-on-surface">{st.fn} {st.ln}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">Class: {st.cls} · Roll: {st.roll}</div>
              </div>
            ):null;})()}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">CC Number</label>
                <input value={ccNo} onChange={e=>setCcNo(e.target.value)} placeholder="CC-2025-001"
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Issue Date</label>
                <input type="date" value={ccDt} onChange={e=>setCcDt(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Conduct</label>
                <select value={ccCo} onChange={e=>setCcCo(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  {['Good','Very Good','Excellent','Satisfactory'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Purpose</label>
                <select value={ccPu} onChange={e=>setCcPu(e.target.value)}
                  className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  {['General Purpose','Admission','College Admission','Job Application','Scholarship'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1.5">Remarks</label>
              <input value={ccRm} onChange={e=>setCcRm(e.target.value)} placeholder="e.g. Active in sports and cultural activities"
                className="w-full p-3 bg-surface-container-lowest rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"/>
            </div>
            <button onClick={doCC}
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 border-0 cursor-pointer hover:opacity-90 transition-opacity mt-2"
              style={{fontFamily:'Manrope,sans-serif'}}>
              <span className="material-symbols-outlined text-lg">verified_user</span>
              Generate Character Certificate
            </button>
          </div>
          <div className="col-span-7 bg-surface-container-low rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant px-1">Live Preview</p>
            {(()=>{
              const st = ccStu ? db.students.find(x=>x.id===ccStu) : null;
              const previewSt = st || {fn:'Student',ln:'Name',father:'Father Name',cls:'—',roll:'—'};
              const {p:attPv,t:attTv} = ccStu ? getAtt(ccStu) : {p:0,t:0};
              const html = buildCC(previewSt, logo, db.settings, {
                ccNo: ccNo||'CC-2025-001',
                dt: new Date(ccDt).toLocaleDateString('en-IN'),
                conduct: ccCo, purpose: ccPu, remarks: ccRm,
                attP: attPv, attT: attTv,
              });
              const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;}</style></head>${html}</html>`;
              return <DocPreview srcDoc={srcDoc} docW={820} docH={960}/>;
            })()}
          </div>
        </div>
      )}

      {/* REPORT CARD TAB */}
      {docTab==='rc' && <ReportCardStudio db={db} save={save} logo={logo}/>}
    </div>
  );
}

function IDCards_REMOVED({ db, save }) {
  const [selStu, setSelStu] = useState('');
  const [phone, setPhone] = useState(db.settings.phone||'');
  const [year, setYear] = useState(db.settings.year||'2025-2026');
  const [prin, setPrin] = useState(db.settings.prin||'');
  const [theme, setTheme] = useState('blue');
  const [bulkCls, setBulkCls] = useState('');
  const [logoErr, setLogoErr] = useState(false);
  const classes = db.classes.map(c=>c.name);
  const logo = logoErr ? null : LOGO_SRC;
  const s = db.students.find(x=>x.id===selStu);
  const photo = s ? (db.photos[s.id]||null) : null;
  const previewHTML = s ? buildCard(s, photo, logo, phone, year, prin, theme, true) : buildCard({fn:'Student',ln:'Name',cls:'—',father:'—',mother:'—',city:'',addr:'',fphone:'',ph:'',dob:''},null,logo,phone,year,prin,theme,true);
  return (
    <div>
      <Card className="mb-3">
        <CardHead title="ID Card Generator"><div className="text-xs text-on-surface-variant">Lord Krishna Public School</div></CardHead>
        <div className="p-5 flex gap-6 flex-wrap items-start">
          <div className="flex-1 min-w-[260px] max-w-[340px]">
            <Field label="Student"><Select value={selStu} onChange={setSelStu} style={{marginBottom:10}}><option value="">— Choose student —</option>{db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}</Select></Field>
            <Field label="Phone No."><Input value={phone} onChange={setPhone} placeholder="School phone" style={{marginBottom:10}}/></Field>
            <Field label="Year"><Input value={year} onChange={setYear} style={{marginBottom:10}}/></Field>
            <Field label="Principal"><Input value={prin} onChange={setPrin} style={{marginBottom:10}}/></Field>
            <Field label="Theme"><Select value={theme} onChange={setTheme} style={{marginBottom:14}}><option value="blue">Blue (Default)</option><option value="green">Green</option><option value="maroon">Maroon/Red</option><option value="navy">Navy</option><option value="purple">Purple</option></Select></Field>
            <div className="flex gap-2 flex-wrap mb-3">
              <Btn variant="primary" onClick={()=>{if(!selStu){toast('Select student','err');return;} printCard(s,photo,logo,phone,year,prin,theme);}}>Print Card</Btn>
              <Btn variant="success" onClick={()=>{if(!bulkCls){toast('Select class','err');return;} const sts=db.students.filter(x=>x.cls===bulkCls); printClassCards(sts,db.photos,logo,phone,year,prin,theme);toast('Printing '+sts.length+' cards');}}>Print Class</Btn>
            </div>
            <Select value={bulkCls} onChange={setBulkCls} style={{width:190}}><option value="">Select class for bulk</option>{classes.map(c=><option key={c}>{c}</option>)}</Select>
            <div className="mt-3 text-xs text-outline">Logo: Place <span className="font-semibold text-on-surface-variant">logo.png</span> in the <span className="font-semibold text-on-surface-variant">public/</span> folder</div>
          </div>
          <div>
            <div className="text-[10px] text-on-surface-variant mb-2 font-semibold uppercase tracking-wider">Live Preview</div>
            <div dangerouslySetInnerHTML={{__html:previewHTML}}/>
            <img src={LOGO_SRC} alt="" className="hidden" onError={()=>setLogoErr(true)} onLoad={()=>setLogoErr(false)}/>
          </div>
        </div>
      </Card>
      <Card>
        <CardHead title="All Students"><Select value="" onChange={()=>{}} style={{width:150}}><option value="">All Classes</option>{classes.map(c=><option key={c}>{c}</option>)}</Select></CardHead>
        <TblWrap><table><thead><tr><th>Name</th><th>Class</th><th>Roll</th><th>Father</th><th>DOB</th><th>Phone</th><th>Photo</th><th>Action</th></tr></thead>
        <tbody>{db.students.map((s,i)=>(
          <tr key={s.id}>
            <td><div className="flex items-center"><Avatar name={s.fn+' '+s.ln} idx={i}/>{s.fn} {s.ln}</div></td>
            <td><Badge color="blue">{s.cls}</Badge></td>
            <td>{s.roll}</td>
            <td className="text-on-surface-variant">{s.father||'—'}</td>
            <td className="text-on-surface-variant">{s.dob?new Date(s.dob).toLocaleDateString('en-IN'):'—'}</td>
            <td>{s.fphone||s.ph||'—'}</td>
            <td>{db.photos[s.id]?<span className="text-emerald-600 text-xs font-medium">Yes</span>:'—'}</td>
            <td><Btn variant="primary" size="sm" onClick={()=>setSelStu(s.id)}>Generate</Btn></td>
          </tr>
        ))}{!db.students.length&&<tr><td colSpan={8}><NoData text="No students"/></td></tr>}</tbody></table></TblWrap>
      </Card>
    </div>
  );
}

function Certificates_REMOVED({ db }) {
  const [tcStu, setTcStu] = useState(''); const [tcNo, setTcNo] = useState(''); const [tcDt, setTcDt] = useState(new Date().toISOString().split('T')[0]); const [tcLd, setTcLd] = useState(''); const [tcRs, setTcRs] = useState("Parents' Transfer"); const [tcCo, setTcCo] = useState('Good'); const [tcFe, setTcFe] = useState('All Dues Cleared');
  const [ccStu, setCcStu] = useState(''); const [ccNo, setCcNo] = useState(''); const [ccDt, setCcDt] = useState(new Date().toISOString().split('T')[0]); const [ccCo, setCcCo] = useState('Good'); const [ccPu, setCcPu] = useState('General Purpose'); const [ccRm, setCcRm] = useState('');
  const [logoErr, setLogoErr] = useState(false);
  const logo = logoErr ? null : LOGO_SRC;
  const getAtt = (sid) => { let p=0,t=0; Object.values(db.att).forEach(d=>{if(d[sid]!==undefined){t++;if(d[sid]==='P'||d[sid]==='L')p++;}}); return{p,t}; };
  const doTC = () => {
    if(!tcStu){toast('Select student','err');return;}
    const s=db.students.find(x=>x.id===tcStu);if(!s)return;
    const{p,t}=getAtt(tcStu);
    printTC(s,logo,db.settings,{tcNo:tcNo||'TC-'+uid(),dt:new Date(tcDt).toLocaleDateString('en-IN'),ld:tcLd,reason:tcRs,conduct:tcCo,feeStatus:tcFe,attP:p,attT:t});
    toast('TC Generated');
  };
  const doCC = () => {
    if(!ccStu){toast('Select student','err');return;}
    const s=db.students.find(x=>x.id===ccStu);if(!s)return;
    const{p,t}=getAtt(ccStu);
    printCC(s,logo,db.settings,{ccNo:ccNo||'CC-'+uid(),dt:new Date(ccDt).toLocaleDateString('en-IN'),conduct:ccCo,purpose:ccPu,remarks:ccRm,attP:p,attT:t});
    toast('CC Generated');
  };
  const stuSel = (val,onCh) => (<Select value={val} onChange={onCh} style={{marginBottom:11}}><option value="">— Select Student —</option>{db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}</Select>);
  return (
    <div>
      <img src={LOGO_SRC} alt="" className="hidden" onError={()=>setLogoErr(true)} onLoad={()=>setLogoErr(false)}/>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHead title="Transfer Certificate"/>
          <div className="p-4">
            <Field label="Student *">{stuSel(tcStu,setTcStu)}</Field>
            {tcStu && (() => {const s=db.students.find(x=>x.id===tcStu);return s?<div className="bg-surface-container-low rounded-xl p-3 mb-3"><div className="text-sm font-semibold text-on-surface">{s.fn} {s.ln}</div><div className="text-xs text-on-surface-variant">Class: {s.cls} | Roll: {s.roll} | Father: {s.father||'—'}</div></div>:null;})()}
            <Grid>
              <Field label="TC Number"><Input value={tcNo} onChange={setTcNo} placeholder="TC-2025-001"/></Field>
              <Field label="Issue Date"><Input type="date" value={tcDt} onChange={setTcDt}/></Field>
              <Field label="Reason"><Select value={tcRs} onChange={setTcRs}><option>Parents' Transfer</option><option>Change of Residence</option><option>Admission to Other School</option><option>Completion of Studies</option><option>Family Reasons</option></Select></Field>
              <Field label="Last Date"><Input type="date" value={tcLd} onChange={setTcLd}/></Field>
              <Field label="Conduct"><Select value={tcCo} onChange={setTcCo}><option>Good</option><option>Very Good</option><option>Excellent</option><option>Satisfactory</option></Select></Field>
              <Field label="Fee Status"><Select value={tcFe} onChange={setTcFe}><option>All Dues Cleared</option><option>Dues Pending</option></Select></Field>
            </Grid>
            <div className="mt-4"><Btn variant="primary" onClick={doTC}>Generate Transfer Certificate</Btn></div>
          </div>
        </Card>
        <Card>
          <CardHead title="Character Certificate"/>
          <div className="p-4">
            <Field label="Student *">{stuSel(ccStu,setCcStu)}</Field>
            {ccStu && (() => {const s=db.students.find(x=>x.id===ccStu);return s?<div className="bg-surface-container-low rounded-xl p-3 mb-3"><div className="text-sm font-semibold text-on-surface">{s.fn} {s.ln}</div><div className="text-xs text-on-surface-variant">Class: {s.cls} | Roll: {s.roll}</div></div>:null;})()}
            <Grid>
              <Field label="CC Number"><Input value={ccNo} onChange={setCcNo} placeholder="CC-2025-001"/></Field>
              <Field label="Issue Date"><Input type="date" value={ccDt} onChange={setCcDt}/></Field>
              <Field label="Conduct"><Select value={ccCo} onChange={setCcCo}><option>Good</option><option>Very Good</option><option>Excellent</option><option>Satisfactory</option></Select></Field>
              <Field label="Purpose"><Select value={ccPu} onChange={setCcPu}><option>General Purpose</option><option>Admission</option><option>College Admission</option><option>Job Application</option><option>Scholarship</option></Select></Field>
              <Span><Field label="Remarks"><Input value={ccRm} onChange={setCcRm} placeholder="e.g. Active in sports and cultural activities"/></Field></Span>
            </Grid>
            <div className="mt-4"><Btn variant="primary" onClick={doCC}>Generate Character Certificate</Btn></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Reports({ db, save, activeSessionId }) {
  const [scope, setScope] = useState('all');
  const [filterCls, setFilterCls] = useState('');
  const [fmt, setFmt] = useState('csv');
  const [qPicker, setQPicker] = useState(null); // index of open quick-export picker
  const [prevSessionsData, setPrevSessionsData] = useState({}); // { [sid]: sdb }
  const [prevSessions, setPrevSessions] = useState([]);
  const [fields, setFields] = useState({
    name:true, uid:true, dob:false, blood:false,
    phone:true, address:false, email:false,
    cls:true, feeStatus:true, gpa:false, attendance:false,
    father:true, mother:false, caste:false, aadhar:false,
  });

  useEffect(() => {
    getSessions().then(all => {
      const others = all.filter(s => s.id !== activeSessionId);
      setPrevSessions(others);
      others.forEach(s => {
        loadSessionData(s.id).then(sdb => {
          if (sdb) setPrevSessionsData(prev => ({ ...prev, [s.id]: sdb }));
        });
      });
    });
  }, [activeSessionId]);
  const toggleField = k => setFields(f => ({...f,[k]:!f[k]}));
  const selCount = Object.values(fields).filter(Boolean).length;
  const allOn = Object.values(fields).every(Boolean);
  const toggleAll = () => { const v=!allOn; setFields(Object.fromEntries(Object.keys(fields).map(k=>[k,v]))); };

  const all=Object.values(db.att).flatMap(d=>Object.values(d));
  const attP=all.filter(v=>v==='P'||v==='L').length, attA=all.filter(v=>v==='A').length;
  const attPct = attP+attA>0 ? Math.round(attP/(attP+attA)*100) : 0;
  const totalCol = db.pays.reduce((s,p)=>s+p.amt,0);

  const buildRows = () => {
    const stuList = scope==='class' && filterCls
      ? db.students.filter(s=>s.cls===filterCls)
      : db.students;
    return stuList.map(s => {
      const pd = paidTotal(db.pays, s.id);
      const row = {};
      if(fields.name) row['Name'] = s.fn+' '+s.ln;
      if(fields.uid) row['Student ID'] = s.id;
      if(fields.dob) row['DOB'] = s.dob||'';
      if(fields.blood) row['Blood Group'] = s.blood||'';
      if(fields.phone) row['Phone'] = s.fphone||'';
      if(fields.address) row['Address'] = s.city||'';
      if(fields.email) row['Email'] = '';
      if(fields.cls) row['Class'] = s.cls||'';
      if(fields.feeStatus) { row['Annual Fee']='₹'+s.fee; row['Paid']='₹'+pd; row['Balance']='₹'+(s.fee-pd); row['Status']=s.fst; }
      if(fields.gpa) row['GPA'] = '—';
      if(fields.attendance) {
        let sp=0,st=0;
        Object.values(db.att).forEach(day=>{ if(day[s.id]!==undefined){st++;if(day[s.id]==='P'||day[s.id]==='L')sp++;} });
        row['Attendance'] = st>0?Math.round(sp/st*100)+'%':'—';
      }
      if(fields.father) row['Father'] = s.father||'';
      if(fields.mother) row['Mother'] = s.mother||'';
      if(fields.caste) row['Caste'] = s.caste||'';
      if(fields.aadhar) row['Aadhaar'] = s.aadhar||'';
      return row;
    });
  };

  // ── PDF helper — opens a styled print window ──────────────────
  const openPDF = (title, headers, dataRows) => {
    const school = db.settings.school || 'LORD KRISHNA PUBLIC SCHOOL';
    const year   = db.settings.year   || '2025-26';
    const addr   = db.settings.addr   || 'Ishapur, Laxminagar, Mathura';
    const thCells = headers.map(h=>`<th>${h}</th>`).join('');
    const bodyRows = dataRows.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#181c1e;background:#fff;padding:24px}
  .hdr{display:flex;align-items:center;gap:16px;border-bottom:2px solid #002045;padding-bottom:12px;margin-bottom:16px}
  .hdr-text h1{font-size:16px;font-weight:800;color:#002045;letter-spacing:-0.02em}
  .hdr-text p{font-size:10px;color:#74777f;margin-top:2px}
  .badge{font-size:9px;font-weight:700;color:#1960a3;background:#e8f0fe;padding:3px 10px;border-radius:20px;margin-top:4px;display:inline-block}
  h2{font-size:13px;font-weight:700;color:#002045;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#002045;color:#fff;padding:7px 10px;text-align:left;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:0.06em}
  td{padding:6px 10px;border-bottom:1px solid #f1f4f6;color:#181c1e}
  tr:nth-child(even) td{background:#f7fafc}
  tr:hover td{background:#eef2ff}
  .footer{margin-top:20px;font-size:9px;color:#74777f;text-align:right}
  @media print{body{padding:12px}button{display:none!important}}
</style></head><body>
<div class="hdr">
  <div class="hdr-text">
    <h1>${school}</h1>
    <p>${addr}</p>
    <span class="badge">${title} — ${year}</span>
  </div>
</div>
<h2>${title} <span style="font-weight:400;color:#74777f;font-size:11px">(${dataRows.length} records)</span></h2>
<table><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>
<div class="footer">Generated on ${new Date().toLocaleDateString('en-IN')} · ${school}</div>
<div style="margin-top:16px;text-align:center">
  <button onclick="window.print()" style="padding:10px 28px;background:#002045;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🖨 Print / Save as PDF</button>
</div>
</body></html>`;
    const w = window.open('','_blank','width=1000,height=700');
    w.document.write(html); w.document.close();
  };

  const doExport = () => {
    const rows = buildRows();
    if(rows.length===0){toast('No students to export','err');return;}
    const headers = Object.keys(rows[0]);
    const dataRows = rows.map(r=>headers.map(h=>r[h]||''));
    if(fmt==='json'){
      exportJSON({students:rows,meta:{school:db.settings.school,year:db.settings.year,exported:new Date().toISOString()}});
      toast('JSON exported');
    } else if(fmt==='pdf'){
      openPDF('Student Report', headers, dataRows);
      toast('PDF preview opened');
    } else {
      exportCSV('lkps_export.csv',[headers,...dataRows]);
      toast('CSV exported');
    }
  };

  const fmtOptions = [
    {id:'csv',  icon:'table_chart',      label:'CSV'},
    {id:'json', icon:'data_object',      label:'JSON'},
    {id:'pdf',  icon:'picture_as_pdf',   label:'PDF'},
  ];

  const fieldGroups = [
    { label:'Identity & Personal', fields:[
      {k:'name',label:'Full Name'},{k:'uid',label:'Student ID'},{k:'dob',label:'Date of Birth'},{k:'blood',label:'Blood Group'},
    ]},
    { label:'Contact Details', fields:[
      {k:'phone',label:'Primary Contact'},{k:'address',label:'Address'},{k:'email',label:'Guardian Email'},
    ]},
    { label:'Academic & Financial', fields:[
      {k:'cls',label:'Class & Section'},{k:'feeStatus',label:'Fee Status'},{k:'gpa',label:'GPA (Annual)'},{k:'attendance',label:'Attendance %'},
    ]},
    { label:'Family Details', fields:[
      {k:'father',label:'Father Name'},{k:'mother',label:'Mother Name'},{k:'caste',label:'Caste'},{k:'aadhar',label:'Aadhaar No.'},
    ]},
  ];

  const S = { // inline style helpers
    card: {background:'var(--s1)',borderRadius:16,padding:'28px 28px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1.5px solid var(--br)'},
    iconBox: {width:40,height:40,borderRadius:12,background:'rgba(0,32,69,0.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
    sectionTitle: {fontSize:10,fontWeight:800,color:'var(--di)',textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:14,marginTop:4},
    radioRow: (active) => ({display:'flex',alignItems:'center',gap:14,padding:'13px 16px',borderRadius:12,border:`1.5px solid ${active?'#1960a3':'var(--br)'}`,background:active?'var(--bll)':'var(--s1)',cursor:'pointer',transition:'all 160ms',marginBottom:10}),
    fmtBtn: (active) => ({display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'14px 10px',borderRadius:12,border:`2px solid ${active?'#1960a3':'var(--br)'}`,background:active?'var(--bll)':'var(--s1)',cursor:'pointer',transition:'all 160ms',flex:1}),
    fieldRow: {display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,cursor:'pointer',transition:'background 120ms'},
    chk: (on) => ({width:18,height:18,borderRadius:5,border:`2px solid ${on?'#1960a3':'#c4c6cf'}`,background:on?'#1960a3':'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 150ms'}),
  };

  return (
    <div style={{width:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:11,fontWeight:700,color:'#1960a3',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>Data Management</div>
        <h2 style={{fontSize:28,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif',letterSpacing:'-0.02em',margin:'0 0 6px'}}>Export Data Configuration</h2>
        <p style={{fontSize:13,color:'var(--di)',margin:0}}>Configure your data export requirements. Generate reports for institutional records or external audits.</p>
      </div>

      {/* Summary strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          {icon:'school',label:'Students',val:db.students.length,color:'#1960a3'},
          {icon:'record_voice_over',label:'Teachers',val:db.teachers.length,color:'#059669'},
          {icon:'payments',label:'Total Collected',val:'₹'+totalCol.toLocaleString('en-IN'),color:'#cb9524'},
          {icon:'fact_check',label:'Avg Attendance',val:attPct+'%',color:'#7c3aed'},
        ].map(s=>(
          <div key={s.label} style={{background:'var(--s1)',borderRadius:14,padding:'16px 18px',border:'1.5px solid var(--br)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:s.color+'14',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span className="material-symbols-outlined" style={{fontSize:18,color:s.color}}>{s.icon}</span>
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif',lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:'var(--di)',marginTop:3}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Config grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:20,marginBottom:20}}>

        {/* Left col */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Data Selection */}
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={S.iconBox}><span className="material-symbols-outlined" style={{fontSize:20,color:'var(--bl)'}}>filter_alt</span></div>
              <span style={{fontSize:15,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Data Selection</span>
            </div>
            <div style={S.radioRow(scope==='all')} onClick={()=>setScope('all')}>
              <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${scope==='all'?'#1960a3':'#c4c6cf'}`,background:scope==='all'?'#1960a3':'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {scope==='all'&&<div style={{width:7,height:7,borderRadius:'50%',background:'var(--s1)'}}/>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--bl)'}}>Export All Students</div>
                <div style={{fontSize:11,color:'var(--di)'}}>Includes all {db.students.length} enrolled students</div>
              </div>
            </div>
            <div style={S.radioRow(scope==='class')} onClick={()=>setScope('class')}>
              <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${scope==='class'?'#1960a3':'#c4c6cf'}`,background:scope==='class'?'#1960a3':'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {scope==='class'&&<div style={{width:7,height:7,borderRadius:'50%',background:'var(--s1)'}}/>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--bl)'}}>Filter by Class</div>
                <div style={{fontSize:11,color:'var(--di)'}}>Export a specific class only</div>
              </div>
            </div>
            {scope==='class'&&(
              <select value={filterCls} onChange={e=>setFilterCls(e.target.value)}
                style={{width:'100%',marginTop:4,padding:'10px 14px',borderRadius:10,border:'1.5px solid var(--br)',background:'var(--s2)',fontSize:13,fontWeight:600,color:'var(--bl)',outline:'none'}}>
                <option value="">— Select Class —</option>
                {db.classes.map(c=><option key={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Format Selection */}
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={S.iconBox}><span className="material-symbols-outlined" style={{fontSize:20,color:'var(--bl)'}}>file_present</span></div>
              <span style={{fontSize:15,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Format Selection</span>
            </div>
            <div style={{display:'flex',gap:10}}>
              {fmtOptions.map(f=>(
                <div key={f.id} style={S.fmtBtn(fmt===f.id)} onClick={()=>setFmt(f.id)}>
                  <span className="material-symbols-outlined" style={{fontSize:22,color:fmt===f.id?'var(--sc)':'var(--di)',marginBottom:6}}>{f.icon}</span>
                  <span style={{fontSize:11,fontWeight:700,color:fmt===f.id?'var(--sc)':'var(--di)'}}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick exports */}
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={S.iconBox}><span className="material-symbols-outlined" style={{fontSize:20,color:'var(--bl)'}}>bolt</span></div>
              <span style={{fontSize:15,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Quick Exports</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {
                  label:'Students',icon:'school',
                  headers:['Name','Roll','Class','Father','Mother','Phone','Blood','DOB','Gender','Annual Fee','Paid','Balance','Status'],
                  getRows:()=>db.students.map(s=>{const pd=paidTotal(db.pays,s.id);return[s.fn+' '+s.ln,s.roll||'',s.cls,s.father||'',s.mother||'',s.fphone||'',s.blood||'',s.dob||'',s.gn||'',s.fee,pd,s.fee-pd,s.fst];}),
                  fmts:['csv','pdf','json'],
                },
                {
                  label:'Teachers Directory',icon:'record_voice_over',
                  headers:['Name','EmpID','Subject','Class','Phone','Email','Salary','Status'],
                  getRows:()=>db.teachers.map(t=>[t.fn+' '+t.ln,t.empId||'',t.su||'',t.cls||'',t.ph||'',t.em||'',t.sal||0,t.status||'']),
                  fmts:['csv','pdf'],
                },
                {
                  label:'Fee Ledger',icon:'payments',
                  headers:['Student','Class','Annual Fee','Paid','Balance','Status'],
                  getRows:()=>db.students.map(s=>{const pd=paidTotal(db.pays,s.id);return[s.fn+' '+s.ln,s.cls,'₹'+s.fee,'₹'+pd,'₹'+(s.fee-pd),s.fst];}),
                  fmts:['csv','pdf'],
                },
                {
                  label:'Payment Transactions',icon:'receipt_long',
                  headers:['Date','Receipt','Student','Class','Type','Month','Amount','Method','Notes'],
                  getRows:()=>db.pays.map(p=>[p.dt,p.rc,p.nm||'',p.cls||'',p.ty||'',p.mn||'',p.amt,p.md||'',p.note||'']),
                  fmts:['csv','pdf'],
                },
                {
                  label:'Attendance Records',icon:'fact_check',
                  headers:['Date','Student','Class','Status'],
                  getRows:()=>Object.entries(db.att).flatMap(([dt,day])=>Object.entries(day).map(([sid,v])=>{const s=db.students.find(x=>x.id===sid);return s?[dt,s.fn+' '+s.ln,s.cls,v==='P'?'Present':v==='L'?'Late':'Absent']:null;}).filter(Boolean)),
                  fmts:['csv','pdf'],
                },
                {
                  label:'Grades / Marks',icon:'quiz',
                  headers:['Exam','Subject','Class','Student','Marks','Max','%','Grade'],
                  getRows:()=>db.exams.flatMap(e=>{const cls=e.cls?[e.cls]:db.classes.map(c=>c.name);return cls.flatMap(c=>{const key=e.id+'_'+c,sv=db.marks[key]||{};return db.students.filter(s=>s.cls===c).map(s=>{const m=sv[s.id]!==undefined?sv[s.id]:'';return[e.name,e.su||'',c,s.fn+' '+s.ln,m,e.max,m!==''?Math.round(m/e.max*100)+'%':'—',m!==''?grade(m,e.max):'—'];});});}),
                  fmts:['csv','pdf'],
                },
                {
                  label:'Full Backup',icon:'save',
                  headers:[], getRows:()=>[],
                  fmts:['json'],
                  jsonFn:()=>{exportJSON(db);toast('Backup exported');},
                },
                {
                  label:'Restore Backup',icon:'restore',
                  headers:[], getRows:()=>[],
                  fmts:['restore'],
                  restoreFn:()=>importJSON(data=>{if(window.confirm('Replace ALL data with backup?')){save({...db,...data});toast('Data restored');}}),
                },
              ].map((q,i)=>{
                const isOpen = qPicker===i;
                const fmtIcons = {csv:'table_chart',pdf:'picture_as_pdf',json:'data_object',restore:'upload_file'};
                const fmtLabels = {csv:'CSV',pdf:'PDF',json:'JSON',restore:'Import'};
                const runFmt = (f) => {
                  setQPicker(null);
                  if(f==='restore'){q.restoreFn();return;}
                  if(f==='json'&&q.jsonFn){q.jsonFn();return;}
                  const rows=q.getRows();
                  if(rows.length===0&&f!=='json'){toast('No data to export','err');return;}
                  if(f==='pdf'){
                    openPDF(q.label, q.headers, rows);
                    toast(q.label+' PDF opened');
                  } else if(f==='json'){
                    exportJSON({data:rows,headers:q.headers,meta:{label:q.label,school:db.settings.school,year:db.settings.year,exported:new Date().toISOString()}});
                    toast(q.label+' JSON exported');
                  } else {
                    exportCSV('lkps_'+q.label.toLowerCase().replace(/\s+/g,'_')+'.csv',[q.headers,...rows]);
                    toast(q.label+' CSV exported');
                  }
                };
                return (
                  <div key={i} style={{borderRadius:10,border:`1.5px solid ${isOpen?'#1960a3':'var(--br)'}`,overflow:'hidden',transition:'border-color 150ms'}}>
                    <button onClick={()=>setQPicker(isOpen?null:i)}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:isOpen?'var(--bll)':'var(--s2)',cursor:'pointer',width:'100%',border:'none',textAlign:'left',transition:'background 150ms'}}
                      onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background='var(--s2)';}}
                      onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.background='var(--s2)';}}>
                      <span className="material-symbols-outlined" style={{fontSize:16,color:'#1960a3'}}>{q.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--bl)',flex:1}}>{q.label}</span>
                      <span className="material-symbols-outlined" style={{fontSize:14,color:'#1960a3',transition:'transform 200ms',transform:isOpen?'rotate(90deg)':'rotate(0deg)'}}>arrow_forward</span>
                    </button>
                    {isOpen&&(
                      <div style={{display:'flex',gap:6,padding:'10px 14px',background:'var(--s2)',borderTop:'1px solid var(--br)'}}>
                        <span style={{fontSize:10,fontWeight:700,color:'var(--di)',alignSelf:'center',marginRight:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Format:</span>
                        {q.fmts.map(f=>(
                          <button key={f} onClick={()=>runFmt(f)}
                            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1.5px solid var(--sc)',background:'var(--s1)',color:'var(--sc)',fontWeight:700,fontSize:11,cursor:'pointer',transition:'all 130ms'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='#1960a3';e.currentTarget.style.color='#fff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#1960a3';}}>
                            <span className="material-symbols-outlined" style={{fontSize:13}}>{fmtIcons[f]}</span>
                            {fmtLabels[f]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right col — Field Selection */}
        <div style={{...S.card,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={S.iconBox}><span className="material-symbols-outlined" style={{fontSize:20,color:'var(--bl)'}}>checklist</span></div>
              <span style={{fontSize:15,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Field Selection</span>
            </div>
            <button onClick={toggleAll} style={{fontSize:12,fontWeight:700,color:'#1960a3',border:'none',background:'transparent',cursor:'pointer'}}>
              {allOn?'Deselect All':'Select All'}
            </button>
          </div>

          {fieldGroups.map((grp,gi)=>(
            <div key={gi} style={{marginBottom:18,paddingBottom:gi<fieldGroups.length-1?18:0,borderBottom:gi<fieldGroups.length-1?'1px solid #f1f4f6':'none'}}>
              <div style={S.sectionTitle}>{grp.label}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                {grp.fields.map(f=>(
                  <label key={f.k} style={{...S.fieldRow,background:fields[f.k]?'#f0f4ff':'transparent'}}
                    onMouseEnter={e=>{if(!fields[f.k])e.currentTarget.style.background='var(--s2)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background=fields[f.k]?'#f0f4ff':'transparent';}}>
                    <input type="checkbox" checked={fields[f.k]} onChange={()=>toggleField(f.k)} style={{display:'none'}}/>
                    <div style={S.chk(fields[f.k])}>
                      {fields[f.k]&&<span className="material-symbols-outlined" style={{fontSize:12,color:'#fff'}}>check</span>}
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:fields[f.k]?'var(--bl)':'var(--mu)'}}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Summary banner */}
          <div style={{marginTop:'auto',paddingTop:16}}>
            <div style={{background:'var(--s2)',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
              <span className="material-symbols-outlined" style={{fontSize:18,color:'#1960a3'}}>info</span>
              <div style={{fontSize:12,color:'var(--mu)'}}>
                <span style={{fontWeight:700,color:'var(--bl)'}}>{selCount} field{selCount!==1?'s':''} selected</span>
                {' · '}
                {scope==='class'&&filterCls ? `${db.students.filter(s=>s.cls===filterCls).length} students` : `${db.students.length} students`}
                {' · '}
                Format: <span style={{fontWeight:700,color:'var(--bl)'}}>{fmt.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Sessions Export */}
      {(() => {
        const allSessions = prevSessions;
        if (allSessions.length === 0) return null;
        return (
          <div style={{background:'var(--s1)',borderRadius:16,padding:'24px 28px',border:'1.5px solid var(--br)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <div style={{width:40,height:40,borderRadius:12,background:'rgba(0,32,69,0.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span className="material-symbols-outlined" style={{fontSize:20,color:'var(--bl)'}}>history</span>
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'var(--bl)',fontFamily:'Manrope,sans-serif'}}>Previous Sessions</div>
                <div style={{fontSize:11,color:'var(--di)',marginTop:1}}>Export data from other academic sessions</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {allSessions.map(s => {
                const sdb = prevSessionsData[s.id];
                const stuCount = sdb?.students?.length || 0;
                const col = sdb?.pays?.reduce((sum,p)=>sum+p.amt,0) || 0;
                return (
                  <div key={s.id} style={{padding:'14px 16px',borderRadius:12,border:'1.5px solid var(--br)',background:'var(--s2)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{width:34,height:34,borderRadius:10,background:'var(--bl)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span className="material-symbols-outlined" style={{fontSize:16,color:'#fff'}}>school</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:'var(--bl)'}}>{s.name}</div>
                        <div style={{fontSize:10,color:'var(--di)'}}>{stuCount} students · ₹{col.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {[
                        {label:'Students CSV',fn:()=>{
                          if(!sdb?.students?.length){toast('No data','err');return;}
                          exportCSV('lkps_'+s.year+'_students.csv',[
                            ['Name','Roll','Class','Father','Phone','Annual Fee','Paid','Balance','Status'],
                            ...sdb.students.map(st=>{const pd=paidTotal(sdb.pays||[],st.id);return[st.fn+' '+st.ln,st.roll||'',st.cls,st.father||'',st.fphone||'',st.fee,pd,st.fee-pd,st.fst];})
                          ]);toast(s.name+' students exported');
                        }},
                        {label:'Fee PDF',fn:()=>{
                          if(!sdb?.students?.length){toast('No data','err');return;}
                          const rows=sdb.students.map(st=>{const pd=paidTotal(sdb.pays||[],st.id);return[st.fn+' '+st.ln,st.cls,'₹'+st.fee,'₹'+pd,'₹'+(st.fee-pd),st.fst];});
                          openPDF(s.name+' Fee Ledger',['Student','Class','Annual Fee','Paid','Balance','Status'],rows);
                        }},
                        {label:'Backup',fn:()=>{exportJSON({...sdb,_session:s});toast(s.name+' backup exported');}},
                      ].map((btn,bi)=>(
                        <button key={bi} onClick={btn.fn}
                          style={{flex:1,padding:'6px 4px',borderRadius:8,border:'1.5px solid var(--br)',background:'var(--s1)',color:'#1960a3',fontWeight:700,fontSize:10,cursor:'pointer',transition:'all 130ms'}}
                          onMouseEnter={e=>{e.currentTarget.style.background='#f0f4ff';e.currentTarget.style.borderColor='#1960a3';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor='var(--br)';}}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Sticky action bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12,background:'rgba(255,255,255,0.8)',backdropFilter:'blur(12px)',padding:'16px 24px',borderRadius:16,border:'1.5px solid var(--br)',position:'sticky',bottom:16}}>
        <div style={{marginRight:'auto',fontSize:12,color:'var(--di)'}}>
          <span style={{fontWeight:700,color:'var(--bl)'}}>{selCount} field{selCount!==1?'s':''} selected</span>
          {' · '}
          {scope==='class'&&filterCls ? `${db.students.filter(s=>s.cls===filterCls).length} students` : `${db.students.length} students`}
          {' · '}
          <span style={{fontWeight:700,color:'#1960a3'}}>{fmt.toUpperCase()}</span>
        </div>
        <button onClick={()=>importJSON(data=>{if(window.confirm('Replace ALL data with backup?')){save({...db,...data});toast('Data restored');}})}
          style={{padding:'10px 20px',borderRadius:10,border:'1.5px solid var(--br)',background:'transparent',color:'var(--di)',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 150ms'}}
          onMouseEnter={e=>{e.currentTarget.style.color='#002045';e.currentTarget.style.borderColor='#002045';}}
          onMouseLeave={e=>{e.currentTarget.style.color='#74777f';e.currentTarget.style.borderColor='var(--br)';}}>
          Restore Backup
        </button>
        <button onClick={doExport}
          style={{display:'flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#002045,#1960a3)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 4px 16px rgba(0,32,69,0.25)',transition:'all 150ms',fontFamily:'Manrope,sans-serif'}}
          onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.02)';e.currentTarget.style.boxShadow='0 6px 24px rgba(0,32,69,0.35)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,32,69,0.25)';}}>
          {fmt==='pdf'?'Generate PDF':fmt==='json'?'Export JSON':'Export CSV'}
          <span className="material-symbols-outlined" style={{fontSize:18}}>{fmt==='pdf'?'picture_as_pdf':fmt==='json'?'data_object':'download'}</span>
        </button>
      </div>
    </div>
  );
}

function Settings({ db, save, user, setUser }) {
  const [form, setForm] = useState({ ...db.settings });
  const [auOpen, setAuOpen] = useState(false);
  const [auForm, setAuForm] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [cpOld, setCpOld] = useState(''); const [cpNew, setCpNew] = useState(''); const [cpConf, setCpConf] = useState('');
  const isMainAdmin = user.username === 'admin';

  const sf = k => v => { const nf={...form,[k]:v}; setForm(nf); save({...db,settings:nf}); };

  const addUser = async () => {
    if(!auForm.u?.trim()||!auForm.p){toast('Username and password required','err');return;}
    if(auForm.p.length<6){toast('Min 6 chars','err');return;}
    try {
      await createAdmin({ username:auForm.u, password:auForm.p, name:auForm.n||auForm.u, role:auForm.r||'Admin' });
      const admins = await getAdmins();
      save({...db, admins});
      setAuOpen(false); setAuForm({}); toast('User added');
    } catch(err) { toast(err.message,'err'); }
  };

  const delUser = async (a) => {
    if(!window.confirm('Remove?')) return;
    try {
      await removeAdmin(a._id || a.id);
      const admins = await getAdmins();
      save({...db, admins});
      toast('User removed');
    } catch(err) { toast(err.message,'err'); }
  };

  const openEdit = a => { setEditForm({...a}); setEditOpen(true); };
  const saveEdit = async () => {
    if(!editForm.name?.trim()){toast('Name required','err');return;}
    try {
      const updated = await updateAdmin(editForm._id || editForm.id, {
        name: editForm.name,
        role: editForm.role,
        photo: editForm.pic || editForm.photo || '',
      });
      const admins = await getAdmins();
      save({...db, admins});
      if(editForm.username === user.username) setUser({...user, ...updated, pic: updated.photo});
      setEditOpen(false); toast('Profile updated');
    } catch(err) { toast(err.message,'err'); }
  };

  const handlePicUpload = e => {
    const file = e.target.files[0]; if(!file) return;
    if(file.size > 500*1024){toast('Image too large (max 500KB)','err');return;}
    const reader = new FileReader();
    reader.onload = ev => setEditForm(f=>({...f,pic:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const chpw = async () => {
    if(!cpOld||!cpNew||!cpConf){toast('Fill all fields','err');return;}
    if(cpNew!==cpConf){toast('Passwords do not match','err');return;}
    if(cpNew.length<6){toast('Min 6 chars','err');return;}
    try {
      // Verify old password by attempting login
      await apiLogin(user.username, cpOld);
      const a = db.admins.find(x=>x.username===user.username);
      await updateAdmin(a?._id || a?.id || user.id, { password: cpNew });
      setCpOld('');setCpNew('');setCpConf('');toast('Password updated');
    } catch(err) { toast(err.message||'Wrong current password','err'); }
  };

  return (
    <div>
      <Card className="p-5 mb-4">
        <div className="text-sm font-semibold text-on-surface mb-4 pb-3" style={{borderBottom:'1px solid rgba(196,198,207,0.5)'}}>School Information</div>
        <Grid>
          <Field label="School Name"><Input value={form.school||''} onChange={sf('school')}/></Field>
          <Field label="Academic Year"><Input value={form.year||''} onChange={sf('year')}/></Field>
          <Field label="Principal"><Input value={form.prin||''} onChange={sf('prin')}/></Field>
          <Field label="Phone"><Input value={form.phone||''} onChange={sf('phone')}/></Field>
          <Span><Field label="Address"><Input value={form.addr||''} onChange={sf('addr')}/></Field></Span>
        </Grid>
      </Card>

      <Card className="p-5 mb-4">
        <div className="text-sm font-semibold text-on-surface mb-4 pb-3" style={{borderBottom:'1px solid rgba(196,198,207,0.5)'}}>Admin Accounts</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {db.admins.map((a,i)=>(
            <div key={a.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 14px',borderRadius:12,background:'#f8fafc',border:'1px solid #e8edf5'}}>
              {/* Avatar / pic */}
              <div style={{width:42,height:42,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:'#fff',boxShadow:'0 2px 8px rgba(25,96,163,0.2)'}}>
                {a.pic
                  ? <img src={a.pic} alt={a.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : (a.name||a.username).trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()
                }
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.name||a.username}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>@{a.username}</div>
              </div>
              {/* Role badge */}
              <span style={{fontSize:10,fontWeight:700,color:'#1960a3',background:'#dbeafe',padding:'3px 10px',borderRadius:20,letterSpacing:'0.04em',flexShrink:0}}>{a.role||'Admin'}</span>
              {/* Main admin tag */}
              {a.username==='admin' && <span style={{fontSize:10,fontWeight:700,color:'#059669',background:'#d1fae5',padding:'3px 10px',borderRadius:20,flexShrink:0}}>Main</span>}
              {/* Edit button — all admins */}
              <button onClick={()=>openEdit(a)}
                style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 150ms',flexShrink:0}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#1960a3';e.currentTarget.style.color='#1960a3';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#475569';}}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>edit</span> Edit
              </button>
              {/* Remove — only main admin can remove, can't remove self */}
              {isMainAdmin && a.username!=='admin' && (
                <button onClick={()=>delUser(a)}
                  style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1.5px solid #fee2e2',background:'#fff',color:'#ef4444',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 150ms',flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.background='#fee2e2';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#fff';}}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>delete</span> Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {isMainAdmin && <div className="mt-4"><Btn variant="primary" size="sm" onClick={()=>setAuOpen(true)}>+ Add User</Btn></div>}
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold text-on-surface mb-4 pb-3" style={{borderBottom:'1px solid rgba(196,198,207,0.5)'}}>Change Password</div>
        <Grid>
          <Field label="Current Password"><Input type="password" value={cpOld} onChange={setCpOld}/></Field>
          <Field label="New Password"><Input type="password" value={cpNew} onChange={setCpNew}/></Field>
          <Field label="Confirm"><Input type="password" value={cpConf} onChange={setCpConf}/></Field>
        </Grid>
        <div className="mt-3"><Btn variant="primary" size="sm" onClick={chpw}>Update Password</Btn></div>
      </Card>

      {/* Add User Modal */}
      <Modal open={auOpen} onClose={()=>setAuOpen(false)} title="Add User">
        <Grid>
          <Field label="Username *"><Input value={auForm.u||''} onChange={v=>setAuForm(f=>({...f,u:v}))}/></Field>
          <Field label="Display Name"><Input value={auForm.n||''} onChange={v=>setAuForm(f=>({...f,n:v}))}/></Field>
          <Field label="Password *"><Input type="password" value={auForm.p||''} onChange={v=>setAuForm(f=>({...f,p:v}))}/></Field>
          <Field label="Role"><Select value={auForm.r||'Admin'} onChange={v=>setAuForm(f=>({...f,r:v}))}><option>Admin</option><option>Accountant</option></Select></Field>
        </Grid>
        <ModalFooter><Btn onClick={()=>setAuOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={addUser}>Add</Btn></ModalFooter>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit Profile">
        {/* Profile picture upload */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,marginBottom:20}}>
          <div style={{position:'relative'}}>
            <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:28,color:'#fff',boxShadow:'0 4px 16px rgba(25,96,163,0.25)'}}>
              {editForm.pic
                ? <img src={editForm.pic} alt="profile" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : (editForm.name||editForm.username||'A').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()
              }
            </div>
            <label style={{position:'absolute',bottom:0,right:0,width:26,height:26,borderRadius:'50%',background:'#1960a3',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,0.2)',border:'2px solid #fff'}}>
              <span className="material-symbols-outlined" style={{fontSize:14,color:'#fff'}}>photo_camera</span>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePicUpload}/>
            </label>
          </div>
          <div style={{fontSize:11,color:'#94a3b8'}}>Click camera to upload photo (max 500KB)</div>
          {editForm.pic && (
            <button onClick={()=>setEditForm(f=>({...f,pic:null}))}
              style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>
              Remove photo
            </button>
          )}
        </div>
        <Grid>
          <Field label="Display Name *"><Input value={editForm.name||''} onChange={v=>setEditForm(f=>({...f,name:v}))}/></Field>
          <Field label="Username"><Input value={editForm.username||''} disabled style={{opacity:0.6}}/></Field>
          <Field label="Role">
            <Select value={editForm.role||'Admin'} onChange={v=>setEditForm(f=>({...f,role:v}))}>
              <option>Admin</option><option>Accountant</option><option>Principal</option>
            </Select>
          </Field>
        </Grid>
        <ModalFooter>
          <Btn onClick={()=>setEditOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={saveEdit}>Save Changes</Btn>
        </ModalFooter>
      </Modal>
    </div>
  );
}

const TEACHER_NAV = [
  { sec:'Main',      items:[{ id:'tdash', icon:'dashboard',    label:'Dashboard'   }] },
  { sec:'Academics', items:[{ id:'tatt',  icon:'fact_check',   label:'Attendance'  },
                             { id:'texam', icon:'quiz',         label:'Marks & Grades' },
                             { id:'ttt',   icon:'schedule',     label:'Timetable'   },
                             { id:'tcal',  icon:'calendar_month',label:'Calendar'   }] },
  { sec:'People',    items:[{ id:'tstu',  icon:'group',        label:'My Students' }] },
];

// Teacher-specific Sidebar (same visual as admin Sidebar but uses TEACHER_NAV)
const TeacherSidebar = React.memo(function TeacherSidebar({ page, setPage, user, onLogout, isMobile = false, mobileOpen = false, onMobileClose = () => {} }) {
  const ref = React.useRef(null);
  const open = React.useRef(false);
  const expand = () => {
    if (isMobile) return;
    if (open.current) return; open.current = true;
    const el = ref.current; if (!el) return;
    el.style.width = '230px'; el.classList.add('sb-open');
    el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='1'; n.style.maxWidth='180px'; });
    el.querySelectorAll('.sb-sec').forEach(n => { n.style.opacity='1'; n.style.maxHeight='24px'; });
    el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='1'; n.style.maxWidth='160px'; });
    el.querySelectorAll('.sb-logout-icon').forEach(n => { n.style.display='none'; });
    el.querySelectorAll('.sb-logout-full').forEach(n => { n.style.display='flex'; });
    el.querySelectorAll('.sb-active-pill').forEach(n => { n.style.opacity='1'; });
  };
  const collapse = () => {
    if (isMobile) return;
    if (!open.current) return; open.current = false;
    const el = ref.current; if (!el) return;
    el.style.width = '60px'; el.classList.remove('sb-open');
    el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='0'; n.style.maxWidth='0'; });
    el.querySelectorAll('.sb-sec').forEach(n => { n.style.opacity='0'; n.style.maxHeight='0'; });
    el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='0'; n.style.maxWidth='0'; });
    el.querySelectorAll('.sb-logout-icon').forEach(n => { n.style.display='flex'; });
    el.querySelectorAll('.sb-logout-full').forEach(n => { n.style.display='none'; });
    el.querySelectorAll('.sb-active-pill').forEach(n => { n.style.opacity='0'; });
  };
  const secColor = { Main:'#63b3ff', People:'#86efac', Academics:'#fbbf24' };
  const name = (user.fn||'') + ' ' + (user.ln||'');
  const initials = name.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'T';

  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    if (isMobile) {
      el.style.width = '230px';
      el.classList.add('sb-open');
      el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity = '1'; n.style.maxWidth = '180px'; });
      el.querySelectorAll('.sb-sec').forEach(n => { n.style.opacity = '1'; n.style.maxHeight = '24px'; });
      el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity = '1'; n.style.maxWidth = '160px'; });
      el.querySelectorAll('.sb-logout-icon').forEach(n => { n.style.display = 'none'; });
      el.querySelectorAll('.sb-logout-full').forEach(n => { n.style.display = 'flex'; });
      el.querySelectorAll('.sb-active-pill').forEach(n => { n.style.opacity = '1'; });
      open.current = true;
      return;
    }
    collapse();
  }, [isMobile]);

  const doLogout = () => { onLogout(); if (isMobile) onMobileClose(); };

  return (
    <aside ref={ref} onMouseEnter={isMobile ? undefined : expand} onMouseLeave={isMobile ? undefined : collapse}
      style={{
        width: isMobile ? 230 : 60,
        flexShrink: 0,
        zIndex: isMobile ? 1200 : 50,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'relative',
        left: 0,
        top: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
        transition: isMobile ? 'transform 220ms ease' : 'width 260ms cubic-bezier(0.4,0,0.2,1)',
        backgroundColor:'#1a3a5c',
        backgroundImage:`radial-gradient(ellipse at 0% 0%, rgba(99,179,255,0.12) 0%, transparent 60%),radial-gradient(ellipse at 100% 100%, rgba(99,102,241,0.1) 0%, transparent 60%)`,
        boxShadow:'4px 0 20px rgba(0,20,60,0.18)'}}>
      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:64,flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
          <span className="material-symbols-outlined" style={{fontSize:18,color:'#fff'}}>school</span>
        </div>
      </div>
      {/* Nav */}
      <nav style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'8px 6px'}}>
        {TEACHER_NAV.map((g, gi) => (
          <div key={g.sec}>
            <div className="sb-sec" style={{display:'flex',alignItems:'center',gap:6,padding:'10px 8px 4px',opacity:0,maxHeight:0,overflow:'hidden',transition:'opacity 200ms,max-height 240ms'}}>
              <div style={{height:1,width:10,background:secColor[g.sec]||'rgba(255,255,255,0.2)',borderRadius:1}}/>
              <span style={{color:secColor[g.sec]||'rgba(255,255,255,0.3)',fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.12em',whiteSpace:'nowrap'}}>{g.sec}</span>
            </div>
            {g.items.map(it => {
              const active = page === it.id;
              return (
                <button key={it.id} onClick={() => { setPage(it.id); if (isMobile) onMobileClose(); }} title={it.label} className="sb-btn"
                  style={{position:'relative',display:'flex',alignItems:'center',width:'100%',border:'none',borderRadius:10,cursor:'pointer',marginBottom:2,gap:0,
                    background: active?'rgba(255,255,255,0.12)':'transparent',
                    color: active?'#fff':'rgba(255,255,255,0.5)',
                    fontSize:13,fontWeight:600,fontFamily:'Manrope,sans-serif',
                    transition:'background 180ms,color 180ms,transform 120ms',
                    boxShadow: active?'inset 0 0 0 1px rgba(255,255,255,0.1)':'none'}}
                  onMouseEnter={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='rgba(255,255,255,0.85)';e.currentTarget.style.transform='translateX(2px)';}}}
                  onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.5)';e.currentTarget.style.transform='translateX(0)';}}}
                >
                  {active && <div style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:'0 3px 3px 0',background:secColor[g.sec]||'#63b3ff',boxShadow:`0 0 8px ${secColor[g.sec]||'#63b3ff'}88`,pointerEvents:'none'}}/>}
                  <span className="sb-icon">
                    <span className="material-symbols-outlined" style={{fontSize:20,lineHeight:1,color:active?(secColor[g.sec]||'#63b3ff'):'inherit',filter:active?`drop-shadow(0 0 4px ${secColor[g.sec]||'#63b3ff'}88)`:'none',transition:'color 180ms,filter 180ms'}}>{it.icon}</span>
                  </span>
                  <span className="sb-label" style={{whiteSpace:'nowrap',opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 240ms',textAlign:'left',flex:1,paddingRight:10}}>{it.label}</span>
                  <span className="sb-active-pill" style={{display:active?'block':'none',marginRight:12,width:6,height:6,borderRadius:'50%',flexShrink:0,background:secColor[g.sec]||'#63b3ff',boxShadow:`0 0 6px ${secColor[g.sec]||'#63b3ff'}`,opacity:0,transition:'opacity 200ms'}}/>
                </button>
              );
            })}
            {gi < TEACHER_NAV.length-1 && <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'6px 8px'}}/>}
          </div>
        ))}
      </nav>
      {/* Footer */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'10px 8px',flexShrink:0,background:'rgba(0,0,0,0.12)'}}>
        <button className="sb-logout-icon" onClick={doLogout} title="Sign Out"
          style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',border:'none',borderRadius:10,cursor:'pointer',padding:'10px 0',background:'rgba(239,68,68,0.12)',color:'#fca5a5',transition:'background 150ms'}}>
          <span className="material-symbols-outlined" style={{fontSize:20}}>logout</span>
        </button>
        <div className="sb-logout-full" style={{display:'none',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px',background:'rgba(255,255,255,0.06)',borderRadius:12,border:'1px solid rgba(255,255,255,0.08)'}}>
            <div style={{width:32,height:32,minWidth:32,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0}}>{initials}</div>
            <div className="sb-user" style={{opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 240ms'}}>
              <div style={{color:'#fff',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>{name.trim()||'Teacher'}</div>
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:10,whiteSpace:'nowrap'}}>{user.su||'Teacher'}</div>
            </div>
          </div>
          <button onClick={doLogout} style={{display:'flex',alignItems:'center',gap:10,width:'100%',border:'none',borderRadius:10,cursor:'pointer',padding:'9px 12px',background:'rgba(239,68,68,0.15)',color:'#fca5a5',fontSize:12,fontWeight:700,transition:'background 150ms'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.28)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.15)'}>
            <span className="material-symbols-outlined" style={{fontSize:18,flexShrink:0}}>logout</span>
            <span className="sb-label" style={{whiteSpace:'nowrap',opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 240ms'}}>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
});

function TeacherPortal({ db, save, teacher, onLogout }) {
  const [page, setPage] = useState('tdash');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const name = (teacher.fn||'') + ' ' + (teacher.ln||'');
  const photo = (db.tphotos||{})[teacher.id||teacher.tid] || null;
  const initials = name.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'T';

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => { if (!isMobile) setMobileNavOpen(false); }, [isMobile]);
  useEffect(() => { if (isMobile) setMobileNavOpen(false); }, [page, isMobile]);

  const pages = {
    tdash: <TeacherDash db={db} teacher={teacher} name={name} photo={photo} />,
    tatt:  <TeacherAttendance db={db} save={save} />,
    texam: <TeacherMarks db={db} save={save} />,
    ttt:   <TeacherTimetable db={db} teacher={teacher} name={name} />,
    tcal:  <AcademicCalendar db={db} save={save} />,
    tstu:  <TeacherStudents db={db} teacher={teacher} />,
  };

  return (
    <div className="tapp-shell" style={{display:'flex',height:'100vh',background:'#f7fafc'}}>
      <TeacherSidebar
        page={page}
        setPage={setPage}
        user={teacher}
        onLogout={onLogout}
        isMobile={isMobile}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {isMobile && mobileNavOpen && (
        <div
          className="tapp-sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1100 }}
        />
      )}
      <div className="tapp-content" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Header */}
        <header className="tapp-header" style={{height:64,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',background:'#ffffff',borderBottom:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,31,77,0.07)',zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button
              type="button"
              className="tapp-menu-btn"
              onClick={() => setMobileNavOpen(v => !v)}
              style={{ display: 'none', border: 0, background: 'transparent', cursor: 'pointer', color: '#1960a3', padding: 4 }}
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
            </button>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(25,96,163,0.25)'}}>
                <span className="material-symbols-outlined" style={{fontSize:18,color:'#fff'}}>school</span>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif',letterSpacing:'0.01em'}}>LORD KRISHNA PUBLIC SCHOOL</div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>Teacher Portal</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{name.trim()||'Teacher'}</div>
              <div style={{fontSize:10,color:'#94a3b8'}}>{teacher.su||'Faculty'}{teacher.cls ? ' · Class '+teacher.cls : ''}</div>
            </div>
            <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#059669,#10b981)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#fff',boxShadow:'0 2px 8px rgba(5,150,105,0.3)',overflow:'hidden',flexShrink:0}}>
              {photo ? <img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials}
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="tapp-main" style={{flex:1,overflowY:'auto',padding:'28px 32px'}}>
          {pages[page] || pages.tdash}
        </main>
      </div>
      <Toast />
    </div>
  );
}


// ── Teacher sub-pages ─────────────────────────────────────────────

function TeacherDash({ db, teacher, name, photo }) {
  const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  const today = new Date().toISOString().split('T')[0];
  const myCls = teacher.cls || '';
  const myStudents = db.students.filter(s => s.cls === myCls);
  const todayPers = db.tt.filter(p => p.day === todayName && (p.tea === name || (teacher.ln && p.tea?.includes(teacher.ln)))).length;
  const todayAttCount = Object.keys(db.att[today] || {}).length;
  const upcomingExams = (db.exams||[]).filter(e => {
    if (!e.dt) return false;
    const diff = (new Date(e.dt) - new Date()) / 86400000;
    return diff >= 0 && diff <= 14;
  });

  const statStyle = (accent) => ({
    background:'#fff', borderRadius:16, padding:'20px 24px',
    border:'1px solid #e8edf5', boxShadow:'0 2px 12px rgba(0,32,69,0.06)',
    display:'flex', alignItems:'center', gap:16,
  });

  return (
    <div>
      {/* Welcome */}
      <div style={{background:'linear-gradient(135deg,#1960a3 0%,#6366f1 100%)',borderRadius:20,padding:'28px 32px',marginBottom:28,display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 8px 32px rgba(25,96,163,0.2)'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Teacher Portal</div>
          <div style={{fontSize:24,fontWeight:800,color:'#fff',fontFamily:'Manrope,sans-serif',marginBottom:4}}>Welcome back, {teacher.fn||'Teacher'}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.75)'}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
          {myCls && <div style={{marginTop:10,display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'4px 14px',fontSize:12,color:'#fff',fontWeight:600}}>
            <span className="material-symbols-outlined" style={{fontSize:14}}>class</span> Class Teacher — {myCls}
          </div>}
        </div>
        <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:800,color:'#fff',flexShrink:0,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
          {photo
            ? <img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : name.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'T'
          }
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:28}}>
        {[
          {icon:'group',value:myStudents.length,label:'My Students',sub:myCls||'No class',accent:'#1960a3',bg:'#dbeafe'},
          {icon:'schedule',value:todayPers,label:'Periods Today',sub:todayName,accent:'#f59e0b',bg:'#fef3c7'},
          {icon:'how_to_reg',value:todayAttCount,label:'Marked Today',sub:'attendance',accent:'#059669',bg:'#d1fae5'},
          {icon:'quiz',value:upcomingExams.length,label:'Upcoming Exams',sub:'next 14 days',accent:'#8b5cf6',bg:'#ede9fe'},
        ].map(s => (
          <div key={s.label} style={statStyle(s.accent)}>
            <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span className="material-symbols-outlined" style={{fontSize:22,color:s.accent}}>{s.icon}</span>
            </div>
            <div>
              <div style={{fontSize:24,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif',lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:600,color:'#475569',marginTop:3}}>{s.label}</div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's timetable + upcoming exams */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8}}>
            <span className="material-symbols-outlined" style={{fontSize:18,color:'#1960a3'}}>schedule</span>
            <span style={{fontSize:14,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif'}}>Today's Schedule</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'#94a3b8',fontWeight:600}}>{todayName}</span>
          </div>
          <div style={{padding:'8px 0'}}>
            {db.tt.filter(p=>p.day===todayName&&(p.tea===name||(teacher.ln&&p.tea?.includes(teacher.ln)))).length === 0
              ? <div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No periods today</div>
              : db.tt.filter(p=>p.day===todayName&&(p.tea===name||(teacher.ln&&p.tea?.includes(teacher.ln)))).map((p,i)=>{
                  const sl = db.slots.find(s=>s.id===p.sid);
                  return <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 20px',borderBottom:'1px solid #f8fafc'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:'#1960a3',flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{p.su||'—'}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{p.cls} {sl?`· ${sl.s}–${sl.e}`:''}</div>
                    </div>
                    {p.rm && <div style={{fontSize:10,color:'#64748b',background:'#f1f5f9',padding:'2px 8px',borderRadius:6}}>Rm {p.rm}</div>}
                  </div>;
                })
            }
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8}}>
            <span className="material-symbols-outlined" style={{fontSize:18,color:'#8b5cf6'}}>quiz</span>
            <span style={{fontSize:14,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif'}}>Upcoming Exams</span>
          </div>
          <div style={{padding:'8px 0'}}>
            {upcomingExams.length === 0
              ? <div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No upcoming exams</div>
              : upcomingExams.slice(0,5).map(e=>(
                <div key={e.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 20px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span className="material-symbols-outlined" style={{fontSize:16,color:'#8b5cf6'}}>quiz</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{e.name}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{e.cls||'All'} · {e.dt||'TBD'}</div>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:'#8b5cf6',background:'#ede9fe',padding:'2px 8px',borderRadius:6}}>{e.su||'—'}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherAttendance({ db, save }) {
  const [attCls, setAttCls] = useState('');
  const [attDt, setAttDt] = useState(new Date().toISOString().split('T')[0]);
  const [attMap, setAttMap] = useState({});
  const [repCls, setRepCls] = useState('');
  const [subTab, setSubTab] = useState(0);
  const classes = db.classes.map(c => c.name);
  const attStu = db.students.filter(s => s.cls === attCls);

  useEffect(() => {
    const saved = db.att[attDt] || {};
    const m = {};
    attStu.forEach(s => { m[s.id] = saved[s.id] || 'P'; });
    setAttMap(m);
  }, [attCls, attDt]); // eslint-disable-line

  const saveAtt = () => {
    if (!attCls || !attDt) { toast('Select class and date', 'err'); return; }
    save({ ...db, att: { ...db.att, [attDt]: { ...db.att[attDt], ...attMap } } });
    toast('Attendance saved');
  };

  const p = Object.values(attMap).filter(v=>v==='P').length;
  const a = Object.values(attMap).filter(v=>v==='A').length;
  const l = Object.values(attMap).filter(v=>v==='L').length;

  const pageHeader = (title, sub) => (
    <div style={{marginBottom:24}}>
      <h1 style={{fontSize:26,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>{title}</h1>
      {sub && <p style={{fontSize:13,color:'#64748b',marginTop:4}}>{sub}</p>}
    </div>
  );

  return (
    <div>
      {pageHeader('Attendance', 'Mark and review student attendance')}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'#f1f5f9',borderRadius:10,padding:4,width:'fit-content'}}>
        {['Mark Attendance','Attendance Report'].map((t,i)=>(
          <button key={t} onClick={()=>setSubTab(i)} style={{padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'Manrope,sans-serif',background:subTab===i?'#fff':'transparent',color:subTab===i?'#1960a3':'#64748b',boxShadow:subTab===i?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 150ms'}}>{t}</button>
        ))}
      </div>

      {subTab === 0 && (
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <select value={attCls} onChange={e=>setAttCls(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',background:'#fff',cursor:'pointer'}}>
              <option value="">Select Class</option>{classes.map(c=><option key={c}>{c}</option>)}
            </select>
            <input type="date" value={attDt} onChange={e=>setAttDt(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b'}}/>
            {attCls && <div style={{display:'flex',gap:8,marginLeft:'auto',alignItems:'center'}}>
              <span style={{fontSize:11,color:'#64748b'}}>P:<b style={{color:'#059669'}}>{p}</b> A:<b style={{color:'#ef4444'}}>{a}</b> L:<b style={{color:'#f59e0b'}}>{l}</b></span>
              <button onClick={()=>{const m={};attStu.forEach(s=>{m[s.id]='P';});setAttMap(m);}} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',color:'#475569'}}>All Present</button>
              <button onClick={saveAtt} style={{padding:'6px 16px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(5,150,105,0.3)'}}>Save</button>
            </div>}
          </div>
          {!attCls ? (
            <div style={{padding:'48px',textAlign:'center',color:'#94a3b8'}}>
              <span className="material-symbols-outlined" style={{fontSize:40,display:'block',marginBottom:8}}>fact_check</span>
              <div style={{fontSize:13}}>Select a class to mark attendance</div>
            </div>
          ) : !attStu.length ? (
            <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>No students in this class</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{padding:'10px 20px',textAlign:'left',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>Roll</th>
                <th style={{padding:'10px 20px',textAlign:'left',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>Student</th>
                {['Present','Absent','Late'].map(h=><th key={h} style={{padding:'10px 16px',textAlign:'center',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>{h}</th>)}
              </tr></thead>
              <tbody>{attStu.map((s,i)=>(
                <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                  <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{s.roll}</td>
                  <td style={{padding:'12px 20px',fontSize:13,fontWeight:600,color:'#1e293b'}}>{s.fn} {s.ln}</td>
                  {['P','A','L'].map(v=>(
                    <td key={v} style={{padding:'12px 16px',textAlign:'center'}}>
                      <input type="radio" name={'att-'+s.id} value={v} checked={attMap[s.id]===v} onChange={()=>setAttMap(m=>({...m,[s.id]:v}))}
                        style={{width:16,height:16,accentColor:v==='P'?'#059669':v==='A'?'#ef4444':'#f59e0b',cursor:'pointer'}}/>
                    </td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 1 && (
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
            <select value={repCls} onChange={e=>setRepCls(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',background:'#fff',cursor:'pointer'}}>
              <option value="">Select Class</option>{classes.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          {!repCls ? (
            <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Select a class to view report</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                {['Student','Present','Absent','Late','Total','%'].map(h=><th key={h} style={{padding:'10px 20px',textAlign:'left',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>{h}</th>)}
              </tr></thead>
              <tbody>{db.students.filter(s=>s.cls===repCls).map((s,i)=>{
                let sp=0,sa=0,sl=0;
                Object.values(db.att).forEach(d=>{const v=d[s.id];if(v==='P')sp++;else if(v==='A')sa++;else if(v==='L')sl++;});
                const tot=sp+sa+sl; const pct=tot>0?Math.round((sp+sl)/tot*100):0;
                return <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                  <td style={{padding:'12px 20px',fontSize:13,fontWeight:600,color:'#1e293b'}}>{s.fn} {s.ln}</td>
                  <td style={{padding:'12px 20px',fontSize:12,color:'#059669',fontWeight:700}}>{sp}</td>
                  <td style={{padding:'12px 20px',fontSize:12,color:'#ef4444',fontWeight:700}}>{sa}</td>
                  <td style={{padding:'12px 20px',fontSize:12,color:'#f59e0b',fontWeight:700}}>{sl}</td>
                  <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{tot}</td>
                  <td style={{padding:'12px 20px'}}>
                    <span style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:pct>=90?'#d1fae5':pct>=75?'#fef3c7':'#fee2e2',color:pct>=90?'#059669':pct>=75?'#d97706':'#ef4444'}}>{pct}%</span>
                  </td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function TeacherMarks({ db, save }) {
  const [mkEx, setMkEx] = useState('');
  const [mkCls, setMkCls] = useState('');
  const classes = db.classes.map(c => c.name);
  const setMk = (key, sid, val) => {
    const nm = { ...db.marks, [key]: { ...(db.marks[key]||{}), [sid]: parseFloat(val)||0 } };
    save({ ...db, marks: nm });
  };

  const pageHeader = (title, sub) => (
    <div style={{marginBottom:24}}>
      <h1 style={{fontSize:26,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>{title}</h1>
      {sub && <p style={{fontSize:13,color:'#64748b',marginTop:4}}>{sub}</p>}
    </div>
  );

  const ex = db.exams.find(e=>e.id===mkEx);
  const stu = db.students.filter(s=>s.cls===mkCls);
  const key = mkEx+'_'+mkCls;

  return (
    <div>
      {pageHeader('Marks & Grades', 'Enter exam marks and view grade summary')}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <select value={mkEx} onChange={e=>setMkEx(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',background:'#fff',cursor:'pointer',minWidth:180}}>
            <option value="">Select Exam</option>{db.exams.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={mkCls} onChange={e=>setMkCls(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',background:'#fff',cursor:'pointer'}}>
            <option value="">Select Class</option>{classes.map(c=><option key={c}>{c}</option>)}
          </select>
          {ex && <span style={{marginLeft:'auto',fontSize:11,color:'#64748b',background:'#f1f5f9',padding:'4px 12px',borderRadius:8}}>Max Marks: <b>{ex.max||100}</b></span>}
        </div>
        {!mkEx || !mkCls ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8'}}>
            <span className="material-symbols-outlined" style={{fontSize:40,display:'block',marginBottom:8}}>quiz</span>
            <div style={{fontSize:13}}>Select exam and class to enter marks</div>
          </div>
        ) : !stu.length ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>No students in this class</div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {['Roll','Student','Marks /'+( ex?.max||100),'%','Grade'].map(h=><th key={h} style={{padding:'10px 20px',textAlign:'left',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>{h}</th>)}
            </tr></thead>
            <tbody>{stu.map((s,i)=>{
              const m=(db.marks[key]||{})[s.id];
              const pct=m!==undefined?Math.round(m/(ex?.max||100)*100):null;
              const g=m!==undefined?grade(m,ex?.max||100):null;
              const gc=g==='A+'||g==='A'?{bg:'#d1fae5',c:'#059669'}:g==='B'?{bg:'#dbeafe',c:'#1960a3'}:g==='C'?{bg:'#fef3c7',c:'#d97706'}:g?{bg:'#fee2e2',c:'#ef4444'}:null;
              return <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{s.roll}</td>
                <td style={{padding:'12px 20px',fontSize:13,fontWeight:600,color:'#1e293b'}}>{s.fn} {s.ln}</td>
                <td style={{padding:'12px 20px'}}>
                  <input type="number" min={0} max={ex?.max||100} value={m??''} onChange={e=>setMk(key,s.id,e.target.value)}
                    placeholder="—" style={{width:80,padding:'6px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',textAlign:'center'}}/>
                </td>
                <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{pct!==null?pct+'%':'—'}</td>
                <td style={{padding:'12px 20px'}}>{gc?<span style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:gc.bg,color:gc.c}}>{g}</span>:'—'}</td>
              </tr>;
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TeacherTimetable({ db, teacher, name }) {
  const [ttCls, setTtCls] = useState(teacher.cls||'');
  const classes = db.classes.map(c => c.name);
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const pers = db.tt.filter(p => p.cls === ttCls);
  const scm = {}; let ci = 0;
  pers.forEach(p => { if (p.su && !scm[p.su]) { scm[p.su] = TTCK[ci % TTCK.length]; ci++; } });

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:26,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>Timetable</h1>
        <p style={{fontSize:13,color:'#64748b',marginTop:4}}>View class timetable</p>
      </div>
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:12,alignItems:'center'}}>
          <select value={ttCls} onChange={e=>setTtCls(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',background:'#fff',cursor:'pointer'}}>
            <option value="">Select Class</option>{classes.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        {!ttCls ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8'}}>
            <span className="material-symbols-outlined" style={{fontSize:40,display:'block',marginBottom:8}}>schedule</span>
            <div style={{fontSize:13}}>Select a class to view timetable</div>
          </div>
        ) : (
          <div style={{padding:20,overflowX:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'90px repeat('+DAYS.length+',1fr)',gap:3,minWidth:600}}>
              <div style={{padding:'8px',textAlign:'center',fontSize:11,fontWeight:700,color:'#64748b',background:'#f8fafc',borderRadius:8}}>Time</div>
              {DAYS.map(d=><div key={d} style={{padding:'8px',textAlign:'center',fontSize:11,fontWeight:700,color:'#64748b',background:'#f8fafc',borderRadius:8}}>{d.slice(0,3)}</div>)}
              {db.slots.map(sl=>(
                <React.Fragment key={sl.id}>
                  <div style={{padding:'8px',textAlign:'center',background:'rgba(241,245,249,0.6)',borderRadius:8}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#1e293b'}}>{sl.l}</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>{sl.s}–{sl.e}</div>
                  </div>
                  {DAYS.map(day=>{
                    const per=pers.find(x=>x.day===day&&x.sid===sl.id);
                    if(per){
                      let ck=scm[per.su]||'g';
                      if(per.ty==='break')ck='d';else if(per.ty==='assembly')ck='f';else if(per.ty==='free')ck='g';
                      const c=TTC_LIGHT[ck]||TTC_LIGHT.g;
                      const lb=per.ty==='break'?'Break':per.ty==='assembly'?'Assembly':per.ty==='free'?'Free':per.su||'—';
                      const isMe = per.tea===name||(teacher.ln&&per.tea?.includes(teacher.ln));
                      return <div key={day} style={{padding:'7px 5px',borderRadius:8,textAlign:'center',minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',background:c.bg,color:c.fg,outline:isMe?`2px solid ${c.fg}`:'none',outlineOffset:'-2px'}}>
                        <div style={{fontSize:11,fontWeight:700}}>{lb}</div>
                        {per.rm&&<div style={{fontSize:'9px',opacity:.7}}>Rm {per.rm}</div>}
                        {isMe&&<div style={{fontSize:'9px',fontWeight:800,opacity:.8}}>★ You</div>}
                      </div>;
                    }
                    return <div key={day} style={{padding:'7px 5px',borderRadius:8,textAlign:'center',minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(241,244,246,0.5)',color:'#c4c6cf',fontSize:18}}>—</div>;
                  })}
                </React.Fragment>
              ))}
            </div>
            {Object.keys(scm).length>0&&<div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9'}}>
              {Object.keys(scm).map(su=>{const c=TTC_LIGHT[scm[su]]||TTC_LIGHT.g;return <div key={su} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#64748b'}}><div style={{width:10,height:10,borderRadius:2,background:c.bg,border:'1.5px solid '+c.fg}}/>{su}</div>;})}
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherStudents({ db, teacher }) {
  const [q, setQ] = useState('');
  const myCls = teacher.cls || '';
  const students = db.students.filter(s => (!myCls || s.cls === myCls) && (
    !q || `${s.fn} ${s.ln} ${s.roll}`.toLowerCase().includes(q.toLowerCase())
  ));

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:26,fontWeight:800,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>My Students</h1>
        <p style={{fontSize:13,color:'#64748b',marginTop:4}}>{myCls?`Class ${myCls}`:'All students'} · {db.students.filter(s=>!myCls||s.cls===myCls).length} enrolled</p>
      </div>
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #e8edf5',boxShadow:'0 2px 12px rgba(0,32,69,0.06)',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9'}}>
          <div style={{position:'relative',display:'inline-flex',alignItems:'center'}}>
            <span className="material-symbols-outlined" style={{position:'absolute',left:10,fontSize:16,color:'#94a3b8',pointerEvents:'none'}}>search</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search students…"
              style={{paddingLeft:34,paddingRight:12,paddingTop:7,paddingBottom:7,borderRadius:20,border:'1.5px solid #e2e8f0',fontSize:12,fontFamily:'inherit',color:'#1e293b',width:240,outline:'none'}}/>
          </div>
        </div>
        {students.length===0?(
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8'}}>
            <span className="material-symbols-outlined" style={{fontSize:40,display:'block',marginBottom:8}}>group</span>
            <div style={{fontSize:13}}>No students found</div>
          </div>
        ):(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {['Roll','Name','Gender','Father','Phone'].map(h=><th key={h} style={{padding:'10px 20px',textAlign:'left',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>{h}</th>)}
            </tr></thead>
            <tbody>{students.map((s,i)=>(
              <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{s.roll}</td>
                <td style={{padding:'12px 20px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>
                      {(s.fn||'?')[0]}{(s.ln||'')[0]}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>{s.fn} {s.ln}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{s.cls}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{s.gn||'—'}</td>
                <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{s.father||'—'}</td>
                <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{s.ph||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

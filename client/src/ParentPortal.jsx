// ParentPortal — separate file to keep App.jsx manageable
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage, studentRegisterEmail, studentRequestRegisterOtp, apiParentLogin } from './storage';

const PARENT_NAV = [
  { id:'pdash',  icon:'home',          label:'Dashboard'   },
  { id:'pfee',   icon:'payments',      label:'Fee Status'  },
  { id:'patt',   icon:'fact_check',    label:'Attendance'  },
  { id:'pmarks', icon:'quiz',          label:'Marks'       },
  { id:'pexam',  icon:'event_note',    label:'Exams'       },
  { id:'pcal',   icon:'calendar_month',label:'Calendar'    },
  { id:'pmsg',   icon:'mail',          label:'Messages'    },
];

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 min → lock
const WARN_BEFORE  =  2 * 60 * 1000; // warn 2 min before

export default function ParentPortal({ db, student, activeSessionId, onLogout }) {
  const [page, setPage] = useState('pdash');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(!(student.email || student.em));
  const [emailInput, setEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState('input');
  const [emailErr, setEmailErr] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  const sideRef = React.useRef(null);
  const sideOpen = React.useRef(false);

  const expandSide = () => {
    if (sideOpen.current) return;
    sideOpen.current = true;
    const el = sideRef.current; if (!el) return;
    el.style.width = '230px';
    el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='1'; n.style.maxWidth='180px'; });
    el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='1'; n.style.maxWidth='160px'; });
    el.querySelectorAll('.sb-btn').forEach(n => { n.style.justifyContent='flex-start'; n.style.padding='10px 12px'; });
  };

  const collapseSide = () => {
    if (!sideOpen.current) return;
    sideOpen.current = false;
    const el = sideRef.current; if (!el) return;
    el.style.width = '60px';
    el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='0'; n.style.maxWidth='0'; });
    el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='0'; n.style.maxWidth='0'; });
    el.querySelectorAll('.sb-btn').forEach(n => { n.style.justifyContent='center'; n.style.padding='10px 0'; });
  };

  // Init collapsed state on desktop
  React.useEffect(() => {
    if (!isMobile) collapseSide();
    else {
      const el = sideRef.current; if (!el) return;
      el.querySelectorAll('.sb-label').forEach(n => { n.style.opacity='1'; n.style.maxWidth='180px'; });
      el.querySelectorAll('.sb-user').forEach(n => { n.style.opacity='1'; n.style.maxWidth='160px'; });
      el.querySelectorAll('.sb-btn').forEach(n => { n.style.justifyContent='flex-start'; n.style.padding='10px 12px'; });
      sideOpen.current = true;
    }
  }, [isMobile]);
  const [locked, setLocked] = useState(false);
  const [lockWarning, setLockWarning] = useState(false);
  const [lockPw, setLockPw] = useState('');
  const [lockErr, setLockErr] = useState('');
  const idleTimer = useRef(null);
  const warnTimer = useRef(null);

  const clearTimers = () => { clearTimeout(idleTimer.current); clearTimeout(warnTimer.current); };

  const resetIdleTimer = useCallback(() => {
    if (locked) return;
    clearTimers();
    setLockWarning(false);
    warnTimer.current = setTimeout(() => setLockWarning(true), IDLE_TIMEOUT - WARN_BEFORE);
    idleTimer.current = setTimeout(() => { setLocked(true); setLockWarning(false); }, IDLE_TIMEOUT);
  }, [locked]);

  useEffect(() => {
    const events = ['mousemove','keydown','mousedown','touchstart','scroll','click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => { events.forEach(e => window.removeEventListener(e, resetIdleTimer)); clearTimers(); };
  }, [resetIdleTimer]);

  const tryUnlock = async () => {
    if (!lockPw) { setLockErr('Enter your password'); return; }
    try {
      await apiParentLogin(student.puser || '', lockPw);
      setLocked(false); setLockPw(''); setLockErr(''); resetIdleTimer();
    } catch(e) {
      // fallback: check against student record in db
      const s = db.students.find(x => (x.sid||x.id) === student.sid);
      if (s && s.ppass === lockPw) {
        setLocked(false); setLockPw(''); setLockErr(''); resetIdleTimer();
      } else {
        setLockErr('Incorrect password'); setLockPw('');
      }
    }
  };

  const name = (student.fn || '') + ' ' + (student.ln || '');
  const photo = student.photo || '';
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Find child in db
  const child = db.students.find(s => (s.sid || s.id) === student.sid) || student;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sendRegisterOtp = async () => {
    if (!emailInput || !emailInput.includes('@')) { setEmailErr('Enter a valid email address'); return; }
    setEmailSaving(true); setEmailErr('');
    try {
      await studentRequestRegisterOtp(emailInput);
      setEmailStep('otp');
    } catch(e) { setEmailErr(e.message || 'Failed to send OTP. Please try again.'); }
    finally { setEmailSaving(false); }
  };

  const saveEmail = async () => {
    if (!emailOtp) { setEmailErr('Enter the OTP'); return; }
    setEmailSaving(true); setEmailErr('');
    try {
      await studentRegisterEmail(emailInput, emailOtp);
      student.email = emailInput;
      student.em = emailInput;
      setShowEmailPrompt(false);
    } catch(e) { setEmailErr(e.message || 'Failed to save. Please try again.'); }
    finally { setEmailSaving(false); }
  };

  useEffect(() => {
    if (isMobile) setMobileNavOpen(false);
  }, [page, isMobile]);

  // Lock screen
  if (locked) return (
    <div style={{position:'fixed',inset:0,background:'linear-gradient(145deg,#001530,#002045)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999,fontFamily:'Inter,sans-serif'}}>
      <div style={{width:'100%',maxWidth:340,padding:'32px 28px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.12)',backdropFilter:'blur(20px)',boxShadow:'0 24px 60px rgba(0,0,0,0.5)',textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 8px 24px rgba(25,96,163,0.4)'}}>
          <span className="material-symbols-outlined" style={{fontSize:26,color:'#fff',fontVariationSettings:"'FILL' 1"}}>lock</span>
        </div>
        <div style={{fontSize:17,fontWeight:800,color:'#fff',marginBottom:4}}>Session Locked</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.45)',marginBottom:6}}>Locked due to inactivity</div>
        <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.55)',marginBottom:16}}>{name}</div>
        {lockErr && <div style={{background:'rgba(239,68,68,0.15)',color:'#fca5a5',borderRadius:10,padding:'8px 12px',fontSize:12,fontWeight:600,marginBottom:12,border:'1px solid rgba(239,68,68,0.3)'}}>{lockErr}</div>}
        <input value={lockPw} onChange={e=>{setLockPw(e.target.value);setLockErr('');}} type="password"
          placeholder="Enter your password" onKeyDown={e=>e.key==='Enter'&&tryUnlock()} autoFocus
          style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.07)',fontSize:13,color:'#fff',outline:'none',boxSizing:'border-box',marginBottom:12}}/>
        <button onClick={tryUnlock} style={{width:'100%',padding:'12px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#002045,#1960a3)',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',marginBottom:10}}>
          Unlock
        </button>
        <button onClick={onLogout} style={{width:'100%',padding:'9px',borderRadius:12,border:'1.5px solid rgba(255,255,255,0.12)',background:'transparent',color:'rgba(255,255,255,0.45)',fontWeight:600,fontSize:12,cursor:'pointer'}}>
          Sign out instead
        </button>
      </div>
    </div>
  );

  const pages = {
    pdash:  <ParentDash db={db} child={child} student={student} setPage={setPage} />,
    pfee:   <ParentFee db={db} child={child} />,
    patt:   <ParentAttendance db={db} child={child} />,
    pmarks: <ParentMarks db={db} child={child} />,
    pexam:  <ParentExams db={db} child={child} />,
    pcal:   <ParentCalendar db={db} />,
    pmsg:   <ParentMessages db={db} child={child} student={student} activeSessionId={activeSessionId} />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f4ff', fontFamily: 'Inter,sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes pp-slidein{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:none}}
        .pp-nav-btn:hover{background:rgba(96,165,250,0.15)!important;color:#60a5fa!important}
        .pp-nav-btn.active{background:rgba(96,165,250,0.18)!important;color:#60a5fa!important}
        .pp-stat:hover{transform:translateY(-3px)!important;box-shadow:0 8px 24px rgba(0,31,77,0.12)!important}
        @media(max-width:768px){
          .pp-main-pad{padding:20px 16px!important}
          .pp-stats-grid{grid-template-columns:1fr 1fr!important}
          .pp-dash-grid{grid-template-columns:1fr!important}
          .pp-header-title{display:none!important}
        }
      `}</style>

      {/* Idle warning banner */}
      {lockWarning && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9998,background:'#b45309',color:'#fff',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:13,fontWeight:600,boxShadow:'0 2px 12px rgba(0,0,0,0.3)'}}>
          <span>⚠️ You'll be locked out in 2 minutes due to inactivity.</span>
          <button onClick={resetIdleTimer} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',padding:'5px 14px',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12}}>Stay Active</button>
        </div>
      )}

      {/* Email Registration Prompt Modal */}
      {showEmailPrompt && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{width:'100%',maxWidth:400,background:'#fff',borderRadius:20,padding:'32px 28px',boxShadow:'0 24px 60px rgba(0,0,0,0.25)'}}>
            <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
              <span className="material-symbols-outlined" style={{fontSize:24,color:'#fff',fontVariationSettings:"'FILL' 1"}}>mail</span>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:6}}>Register Your Email</div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20,lineHeight:1.6}}>
              Register your email to enable self-service credential recovery if you forget your username or password.
            </div>
            {emailErr && <div style={{background:'#fef2f2',color:'#dc2626',borderRadius:10,padding:'9px 12px',fontSize:12,fontWeight:600,marginBottom:12,border:'1px solid #fecaca'}}>{emailErr}</div>}
            {emailStep === 'input' ? <>
              <input value={emailInput} onChange={e=>{setEmailInput(e.target.value);setEmailErr('');}}
                type="email" placeholder="your@email.com"
                style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#0f172a',outline:'none',boxSizing:'border-box',marginBottom:12}}
                onKeyDown={e=>e.key==='Enter'&&sendRegisterOtp()}/>
              <button onClick={sendRegisterOtp} disabled={emailSaving}
                style={{width:'100%',padding:'13px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#002045,#1960a3)',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',marginBottom:8}}>
                {emailSaving ? 'Sending OTP…' : 'Send OTP to Verify'}
              </button>
            </> : <>
              <div style={{fontSize:12,color:'#0369a1',fontWeight:600,marginBottom:8}}>OTP sent to <b>{emailInput}</b></div>
              <input value={emailOtp} onChange={e=>{setEmailOtp(e.target.value);setEmailErr('');}}
                placeholder="Enter 6-digit OTP" maxLength={6}
                style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#0f172a',outline:'none',boxSizing:'border-box',marginBottom:12}}
                onKeyDown={e=>e.key==='Enter'&&saveEmail()}/>
              <button onClick={saveEmail} disabled={emailSaving}
                style={{width:'100%',padding:'13px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#002045,#1960a3)',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',marginBottom:8}}>
                {emailSaving ? 'Saving…' : 'Verify & Register Email'}
              </button>
              <button onClick={()=>{setEmailStep('input');setEmailOtp('');setEmailErr('');}} style={{width:'100%',padding:'8px',borderRadius:12,border:'none',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',marginBottom:4}}>
                Change email
              </button>
            </>}
            <button onClick={()=>setShowEmailPrompt(false)}
              style={{width:'100%',padding:'10px',borderRadius:12,border:'1.5px solid #e2e8f0',background:'transparent',color:'#64748b',fontWeight:600,fontSize:12,cursor:'pointer'}}>
              Do it Later
            </button>
          </div>
        </div>
      )}

      {/* Sidebar overlay */}
      {/* Mobile overlay */}
      {isMobile && mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1100,backdropFilter:'blur(2px)'}} />
      )}

      {/* Sidebar — collapsed icon-only on desktop, hover to expand; drawer on mobile */}
      <aside ref={sideRef}
        onMouseEnter={isMobile ? undefined : expandSide}
        onMouseLeave={isMobile ? undefined : collapseSide}
        style={{
          width: isMobile ? 230 : 60, flexShrink:0,
          background:'linear-gradient(180deg,#001530 0%,#002045 100%)',
          display:'flex', flexDirection:'column', overflow:'hidden',
          position: isMobile ? 'fixed' : 'relative',
          left:0, top: isMobile ? 0 : undefined, bottom: isMobile ? 0 : undefined,
          transform: isMobile ? (mobileNavOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
          transition: isMobile ? 'transform 220ms ease' : 'width 260ms cubic-bezier(0.4,0,0.2,1)',
          zIndex: isMobile ? 1200 : 50,
          boxShadow:'4px 0 20px rgba(0,20,60,0.18)',
        }}>
        {/* Logo row */}
        <div style={{padding:'16px 0 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10,paddingLeft:isMobile?18:0,justifyContent:isMobile?'flex-start':'center',overflow:'hidden'}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:16,color:'#fff',fontVariationSettings:"'FILL' 1"}}>school</span>
          </div>
          <div className="sb-label" style={{opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 260ms',whiteSpace:'nowrap'}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'0.15em',textTransform:'uppercase'}}>Parent Portal</div>
            <div style={{fontSize:11,fontWeight:800,color:'#fff'}}>LKPS</div>
          </div>
        </div>
        {/* Student avatar */}
        <div style={{padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10,paddingLeft:isMobile?18:0,justifyContent:isMobile?'flex-start':'center',overflow:'hidden'}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0,overflow:'hidden'}}>
            {photo ? <img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ini}
          </div>
          <div className="sb-user" style={{opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 260ms',whiteSpace:'nowrap',minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>Class {child.cls||'—'}</div>
          </div>
        </div>
        {/* Nav */}
        <nav style={{flex:1,padding:'8px 8px',overflowY:'auto'}}>
          {PARENT_NAV.map(item => (
            <button key={item.id} onClick={()=>{setPage(item.id);if(isMobile)setMobileNavOpen(false);}}
              className="sb-btn"
              style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 0',borderRadius:10,border:'none',cursor:'pointer',marginBottom:2,fontWeight:600,fontSize:13,transition:'all 150ms',textAlign:'left',justifyContent:'center',
                background: page===item.id ? 'rgba(96,165,250,0.18)' : 'transparent',
                color: page===item.id ? '#60a5fa' : 'rgba(255,255,255,0.55)'}}>
              <span className="material-symbols-outlined" style={{fontSize:20,flexShrink:0,fontVariationSettings:page===item.id?"'FILL' 1":"'FILL' 0"}}>{item.icon}</span>
              <span className="sb-label" style={{opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 260ms',whiteSpace:'nowrap',fontSize:13}}>{item.label}</span>
            </button>
          ))}
        </nav>
        {/* Logout */}
        <div style={{padding:'8px 8px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={onLogout} className="sb-btn"
            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 0',borderRadius:10,border:'none',cursor:'pointer',background:'transparent',color:'rgba(255,255,255,0.45)',fontWeight:600,fontSize:13,transition:'all 150ms',justifyContent:'center'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.15)';e.currentTarget.style.color='#fca5a5';}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.45)';}}>
            <span className="material-symbols-outlined" style={{fontSize:20,flexShrink:0}}>logout</span>
            <span className="sb-label" style={{opacity:0,maxWidth:0,overflow:'hidden',transition:'opacity 200ms,max-width 260ms',whiteSpace:'nowrap',fontSize:13}}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        {/* Top bar */}
        <header style={{
          height:64, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 24px', background:'#ffffff', borderBottom:'1px solid #e8edf5',
          boxShadow:'0 2px 12px rgba(0,31,77,0.07)', zIndex:100,
        }}>
          {/* Left — school name */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {isMobile && (
              <button onClick={()=>setMobileNavOpen(v=>!v)}
                style={{border:0,background:'transparent',cursor:'pointer',color:'#1960a3',padding:4,display:'flex',alignItems:'center'}}>
                <span className="material-symbols-outlined" style={{fontSize:22}}>menu</span>
              </button>
            )}
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#002045,#1960a3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span className="material-symbols-outlined" style={{fontSize:17,color:'#fff',fontVariationSettings:"'FILL' 1"}}>school</span>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#002045',fontFamily:'Manrope,sans-serif',letterSpacing:'0.01em',lineHeight:1.1}}>LORD KRISHNA PUBLIC SCHOOL</div>
                <div style={{fontSize:9,fontWeight:700,color:'#1960a3',letterSpacing:'0.12em',textTransform:'uppercase'}}>Parent Portal</div>
              </div>
            </div>
            <div style={{width:1,height:28,background:'linear-gradient(180deg,transparent,#c7d9f5,transparent)',margin:'0 4px'}}/>
            <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
              <span style={{fontSize:9,fontWeight:800,color:'#1960a3',letterSpacing:'0.14em',textTransform:'uppercase'}}>Session</span>
              <span style={{fontSize:12,fontWeight:900,color:'#002045',fontFamily:'Manrope,sans-serif'}}>{db.settings?.year||'2025-26'}</span>
            </div>
          </div>

          {/* Right — session badge + alerts + user */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {/* Session badge (display only) */}
            <div style={{background:'#eef4ff',color:'#1960a3',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,border:'1px solid #c7d9f5',letterSpacing:'0.04em',display:'flex',alignItems:'center',gap:5}}>
              <span className="material-symbols-outlined" style={{fontSize:13}}>calendar_today</span>
              {db.settings?.year||'2025-26'}
            </div>
            {/* Notification bell — unread messages */}
            {(() => {
              const unread = (db.messages||[]).filter(m=>m.studentSid===(child.sid||child.id)&&m.status==='read').length;
              return (
                <button onClick={()=>setPage('pmsg')}
                  style={{position:'relative',width:36,height:36,borderRadius:10,border:'1.5px solid #e2e8f0',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',transition:'all 150ms'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='#eef4ff';e.currentTarget.style.color='#1960a3';e.currentTarget.style.borderColor='#c7d9f5';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.color='#64748b';e.currentTarget.style.borderColor='#e2e8f0';}}>
                  <span className="material-symbols-outlined" style={{fontSize:20}}>notifications</span>
                  {unread > 0 && <span style={{position:'absolute',top:4,right:4,width:8,height:8,borderRadius:'50%',background:'#dc2626',border:'1.5px solid #fff'}}/>}
                </button>
              );
            })()}
            <div style={{width:1,height:28,background:'#e2e8f0'}}/>
            {/* User */}
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{name}</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>Class {child.cls||'—'}</div>
              </div>
              <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',overflow:'hidden',flexShrink:0}}>
                {photo ? <img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ini}
              </div>
            </div>
          </div>
        </header>
        <main style={{flex:1,overflowY:'auto',padding:'28px 32px'}} className="pp-main-pad">
          {pages[page] || pages.pdash}
        </main>
      </div>
    </div>
  );
}

// ── Parent Dashboard ──────────────────────────────────────────────
function ParentDash({ db, child, student, setPage }) {
  const sid = child.sid || child.id;
  const name = (child.fn || '') + ' ' + (child.ln || '');

  // Attendance summary
  let p = 0, a = 0, l = 0;
  Object.values(db.att || {}).forEach(d => {
    const v = d[sid];
    if (v === 'P') p++;
    else if (v === 'L') l++;
    else if (v === 'A') a++;
  });
  const tot = p + a + l;
  const attPct = tot > 0 ? Math.round((p + l) / tot * 100) : 0;

  // Upcoming exams
  const today = new Date().toISOString().split('T')[0];
  const upcoming = (db.exams || []).filter(e => e.cls === child.cls && e.dt >= today && e.st !== 'Completed').slice(0, 3);

  // Recent marks
  const recentMarks = [];
  (db.exams || []).forEach(e => {
    const m = (db.marks || {})[e.eid || e.id];
    if (m && m[sid] !== undefined) recentMarks.push({ exam: e.name, marks: m[sid], max: e.max || 100 });
  });

  // Fee summary
  const pays = (db.pays || []).filter(p => p.sid === sid);
  const totalPaid = pays.reduce((s, p) => s + (p.amt || 0), 0);
  const totalFee = child.fee || 0;
  const feeDue = Math.max(0, totalFee - totalPaid);
  const lastPay = pays.sort((a,b)=>(b.dt||'').localeCompare(a.dt||''))[0];

  const STATS = [
    { icon: 'fact_check', label: 'Attendance', value: attPct + '%', color: attPct >= 90 ? '#059669' : attPct >= 75 ? '#d97706' : '#dc2626', page: 'patt' },
    { icon: 'payments', label: 'Fee Due', value: '₹'+feeDue.toLocaleString('en-IN'), color: feeDue > 0 ? '#dc2626' : '#059669', page: 'pfee' },
    { icon: 'quiz', label: 'Exams Taken', value: recentMarks.length, color: '#1960a3', page: 'pmarks' },
    { icon: 'event_note', label: 'Upcoming Exams', value: upcoming.length, color: '#7c3aed', page: 'pexam' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Parent Dashboard</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', margin: 0 }}>{name}</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Class {child.cls || '—'} · {db.settings?.year || ''}</div>
      </div>

      {/* Stats */}
      <div className="parent-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {STATS.map(s => (
          <div key={s.label} onClick={() => s.page && setPage(s.page)}
            style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', cursor: s.page ? 'pointer' : 'default', transition: 'all 150ms' }}
            onMouseEnter={e => { if (s.page) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'Manrope,sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming exams */}
      <div className="parent-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Upcoming Exams</div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No upcoming exams</div>
          ) : upcoming.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed' }}>quiz</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{e.su || ''} · {e.dt || 'TBD'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent marks */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Recent Results</div>
          {recentMarks.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No results yet</div>
          ) : recentMarks.slice(-5).reverse().map((m, i) => {
            const pct = Math.round(m.marks / m.max * 100);
            const col = pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 600 }}>{m.exam}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: col }}>{m.marks}/{m.max}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Parent Fee Status ─────────────────────────────────────────────
function ParentFee({ db, child }) {
  const sid = child.sid || child.id;
  const pays = (db.pays || []).filter(p => p.sid === sid).sort((a,b)=>(b.dt||'').localeCompare(a.dt||''));
  const totalFee = child.fee || 0;
  const totalPaid = pays.reduce((s,p) => s + (p.amt||0), 0);
  const feeDue = Math.max(0, totalFee - totalPaid);
  const lastPay = pays[0];
  const feeStatus = totalFee > 0
    ? (feeDue === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending')
    : (child.fst || 'Pending');
  const statusColor = feeStatus === 'Paid' ? '#059669' : feeStatus === 'Partial' ? '#d97706' : '#dc2626';

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Fee Status</div>
        <h1 style={{fontSize:28,fontWeight:900,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>{child.fn} {child.ln}</h1>
        <div style={{fontSize:13,color:'#64748b',marginTop:4}}>Class {child.cls||'—'} · {db.settings?.year||''}</div>
      </div>

      {/* Summary cards */}
      <div className="pp-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        {[
          {label:'Annual Fee',    value:'₹'+totalFee.toLocaleString('en-IN'),  color:'#1960a3', icon:'receipt_long'},
          {label:'Total Paid',    value:'₹'+totalPaid.toLocaleString('en-IN'), color:'#059669', icon:'check_circle'},
          {label:'Amount Due',    value:'₹'+feeDue.toLocaleString('en-IN'),    color: feeDue>0?'#dc2626':'#059669', icon:'pending'},
          {label:'Status',        value:feeStatus,                              color:statusColor, icon:'info'},
        ].map(s=>(
          <div key={s.label} className="pp-stat" style={{background:'#fff',borderRadius:16,padding:'20px',boxShadow:'0 1px 8px rgba(0,31,77,0.06)',transition:'all 150ms'}}>
            <div style={{width:36,height:36,borderRadius:10,background:s.color+'18',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
              <span className="material-symbols-outlined" style={{fontSize:18,color:s.color,fontVariationSettings:"'FILL' 1"}}>{s.icon}</span>
            </div>
            <div style={{fontSize:20,fontWeight:900,color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Last payment highlight */}
      {lastPay && (
        <div style={{background:'linear-gradient(135deg,#002045,#1960a3)',borderRadius:16,padding:'20px 24px',marginBottom:24,display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:22,color:'#fff',fontVariationSettings:"'FILL' 1"}}>payments</span>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>Last Payment</div>
            <div style={{fontSize:20,fontWeight:900,color:'#fff',fontFamily:'Manrope,sans-serif'}}>₹{(lastPay.amt||0).toLocaleString('en-IN')}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:2}}>
              {lastPay.dt ? new Date(lastPay.dt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—'}
              {lastPay.md ? ` · ${lastPay.md}` : ''}
              {lastPay.mn ? ` · ${lastPay.mn}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div style={{background:'#fff',borderRadius:16,boxShadow:'0 1px 8px rgba(0,31,77,0.06)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontSize:13,fontWeight:700,color:'#1e293b'}}>
          Payment History ({pays.length})
        </div>
        {pays.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>No payments recorded yet</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>{['Date','Amount','Mode','Months / Note','Receipt'].map(h=>(
                  <th key={h} style={{padding:'10px 20px',textAlign:'left',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',background:'#f8fafc'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {pays.map((p,i)=>(
                  <tr key={p.id||i} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:'12px 20px',fontSize:13,color:'#1e293b',fontWeight:600}}>
                      {p.dt ? new Date(p.dt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    </td>
                    <td style={{padding:'12px 20px',fontSize:14,fontWeight:800,color:'#059669'}}>₹{(p.amt||0).toLocaleString('en-IN')}</td>
                    <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{p.md||p.mode||'—'}</td>
                    <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{p.mn||p.note||'—'}</td>
                    <td style={{padding:'12px 20px',fontSize:12,color:'#64748b'}}>{p.rc||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Parent Attendance ─────────────────────────────────────────────
function ParentAttendance({ db, child }) {
  const sid = child.sid || child.id;
  let p = 0, a = 0, l = 0;
  const history = [];
  Object.entries(db.att || {}).forEach(([date, d]) => {
    const v = d[sid];
    if (v === 'P') p++;
    else if (v === 'L') l++;
    else if (v === 'A') a++;
    if (v) history.push({ date, status: v });
  });
  history.sort((a, b) => b.date.localeCompare(a.date));
  const tot = p + a + l;
  const pct = tot > 0 ? Math.round((p + l) / tot * 100) : 0;
  const col = pct >= 90 ? '#059669' : pct >= 75 ? '#d97706' : '#dc2626';

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Attendance</h1>
      <div className="parent-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[{ label: 'Present', val: p, c: '#059669' }, { label: 'Absent', val: a, c: '#dc2626' }, { label: 'Late', val: l, c: '#d97706' }, { label: 'Attendance %', val: pct + '%', c: col }].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c, fontFamily: 'Manrope,sans-serif' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,31,77,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Attendance History</div>
        {history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No attendance records yet</div>
        ) : (
          <div className="parent-table-wrap" style={{ overflowX:'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Date', 'Status'].map(h => <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc' }}>{h}</th>)}</tr></thead>
            <tbody>{history.slice(0, 60).map((r, i) => {
              const sc = r.status === 'P' ? '#059669' : r.status === 'A' ? '#dc2626' : '#d97706';
              const sl = r.status === 'P' ? 'Present' : r.status === 'A' ? 'Absent' : 'Late';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: '#1e293b' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '10px 20px' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: sc + '18', color: sc, fontSize: 11, fontWeight: 700 }}>{sl}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Parent Marks ──────────────────────────────────────────────────
function ParentMarks({ db, child }) {
  const sid = child.sid || child.id;
  const results = [];
  (db.exams || []).forEach(e => {
    const m = (db.marks || {})[e.eid || e.id];
    if (m && m[sid] !== undefined) {
      const pct = Math.round(m[sid] / (e.max || 100) * 100);
      results.push({ name: e.name, su: e.su, dt: e.dt, marks: m[sid], max: e.max || 100, pct });
    }
  });
  results.sort((a, b) => (b.dt || '').localeCompare(a.dt || ''));

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Marks & Results</h1>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,31,77,0.06)', overflow: 'hidden' }}>
        {results.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No results available yet</div>
        ) : (
          <div className="parent-table-wrap" style={{ overflowX:'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Exam', 'Subject', 'Date', 'Marks', 'Grade'].map(h => <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc' }}>{h}</th>)}</tr></thead>
            <tbody>{results.map((r, i) => {
              const col = r.pct >= 75 ? '#059669' : r.pct >= 50 ? '#d97706' : '#dc2626';
              const g = r.pct >= 90 ? 'A+' : r.pct >= 80 ? 'A' : r.pct >= 70 ? 'B+' : r.pct >= 60 ? 'B' : r.pct >= 50 ? 'C' : 'F';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.name}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748b' }}>{r.su || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748b' }}>{r.dt || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 800, color: col }}>{r.marks}/{r.max}</td>
                  <td style={{ padding: '12px 20px' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: col + '18', color: col, fontSize: 11, fontWeight: 800 }}>{g}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Parent Exams ──────────────────────────────────────────────────
function ParentExams({ db, child }) {
  const today = new Date().toISOString().split('T')[0];
  const exams = (db.exams || []).filter(e => !e.cls || e.cls === child.cls);
  const upcoming = exams.filter(e => (e.dt || '') >= today && e.st !== 'Completed');
  const past = exams.filter(e => (e.dt || '') < today || e.st === 'Completed');

  const ExamRow = ({ e, badge }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7c3aed' }}>quiz</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{e.su || ''}{e.su && e.dt ? ' · ' : ''}{e.dt || ''}{e.max ? ` · Max: ${e.max}` : ''}</div>
      </div>
      {badge && <span style={{ padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.c, fontSize: 10, fontWeight: 700 }}>{badge.label}</span>}
    </div>
  );

  return (
    <div className="parent-exams-page">
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Exams</h1>
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Upcoming Exams</div>
        {upcoming.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>No upcoming exams</div>
          : upcoming.map(e => <ExamRow key={e.id} e={e} badge={{ label: 'Upcoming', bg: '#ede9fe', c: '#7c3aed' }} />)}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Past Exams</div>
        {past.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>No past exams</div>
          : past.map(e => <ExamRow key={e.id} e={e} badge={{ label: 'Completed', bg: '#dcfce7', c: '#059669' }} />)}
      </div>
    </div>
  );
}

// ── Parent Calendar ───────────────────────────────────────────────
function ParentCalendar({ db }) {
  const today = new Date().toISOString().split('T')[0];
  const events = [...(db.events || [])].sort((a, b) => a.dt.localeCompare(b.dt));
  const upcoming = events.filter(e => e.dt >= today);
  const past = events.filter(e => e.dt < today).reverse();

  const typeColor = { holiday: { bg: '#fee2e2', c: '#dc2626' }, event: { bg: '#dbeafe', c: '#1960a3' }, exam: { bg: '#ede9fe', c: '#7c3aed' } };

  const EventRow = ({ e }) => {
    const tc = typeColor[e.type] || typeColor.event;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{new Date(e.dt).getDate()}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{new Date(e.dt).toLocaleDateString('en-IN', { month: 'short' })}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.title}</div>
          {e.note && <div style={{ fontSize: 11, color: '#64748b' }}>{e.note}</div>}
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 20, background: tc.bg, color: tc.c, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{e.type}</span>
      </div>
    );
  };

  return (
    <div className="parent-calendar-page">
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Calendar & Holidays</h1>
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Upcoming Events & Holidays</div>
        {upcoming.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>No upcoming events</div>
          : upcoming.slice(0, 20).map((e, i) => <EventRow key={i} e={e} />)}
      </div>
      {past.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Past Events</div>
          {past.slice(0, 10).map((e, i) => <EventRow key={i} e={e} />)}
        </div>
      )}
    </div>
  );
}

// ── Parent Messages ───────────────────────────────────────────────
function ParentMessages({ db, child, student, activeSessionId }) {
  const [msgs, setMsgs] = useState([]);
  const [form, setForm] = useState({ type: 'message', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!activeSessionId) return;
    getMessages(activeSessionId).then(all => {
      setMsgs(all.filter(m => m.studentSid === (child.sid || child.id)));
    }).catch(() => {});
  }, [activeSessionId, child.sid, child.id]);

  const doSend = async () => {
    if (!form.subject.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeSessionId, {
        studentSid: child.sid || child.id,
        studentName: (child.fn || '') + ' ' + (child.ln || ''),
        cls: child.cls,
        type: form.type,
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      setMsgs(prev => [msg, ...prev]);
      setForm({ type: 'message', subject: '', body: '' });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      alert('Failed to send: ' + e.message);
    }
    setSending(false);
  };

  const TYPE_OPTS = [
    { v: 'message', label: 'General Message' },
    { v: 'certificate', label: 'Certificate Request' },
    { v: 'request', label: 'Other Request' },
  ];

  const statusColor = { unread: { bg: '#dbeafe', c: '#1960a3' }, read: { bg: '#f1f5f9', c: '#64748b' }, resolved: { bg: '#dcfce7', c: '#059669' } };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Messages & Requests</h1>

      {/* Compose */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Send a Message to Admin</div>
        {sent && <div style={{ background: '#dcfce7', color: '#059669', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Message sent successfully!</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Type</div>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff' }}>
              {TYPE_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Subject *</div>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Request for Transfer Certificate"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Message (optional)</div>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} placeholder="Add details here…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <button onClick={doSend} disabled={sending || !form.subject.trim()}
          style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#002045,#1960a3)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
          {sending ? 'Sending…' : 'Send Message'}
        </button>
      </div>

      {/* Sent messages */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,31,77,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Sent Messages ({msgs.length})</div>
        {msgs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No messages sent yet</div>
        ) : msgs.map((m, i) => {
          const sc = statusColor[m.status] || statusColor.unread;
          return (
            <div key={m._id || i} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{m.subject}</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.c, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{m.status}</span>
              </div>
              {m.body && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{m.body}</div>}
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {m.type}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

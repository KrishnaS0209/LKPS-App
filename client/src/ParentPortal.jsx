// ParentPortal — separate file to keep App.jsx manageable
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage, studentRegisterEmail, studentRequestRegisterOtp, apiParentLogin, parentVerifyPassword } from './storage';

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
  const [alertOpen, setAlertOpen] = useState(false);
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
    // child record has puser (username) — use it to re-authenticate
    const s = db.students.find(x => (x.sid||x.id) === student.sid);
    const puser = s?.puser || student.puser || '';
    if (!puser) { setLockErr('Cannot verify — contact school office'); return; }
    try {
      await apiParentLogin(puser, lockPw);
      setLocked(false); setLockPw(''); setLockErr(''); resetIdleTimer();
    } catch(e) {
      setLockErr('Incorrect password'); setLockPw('');
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
    pdash:    <ParentDash db={db} child={child} student={student} setPage={setPage} />,
    pfee:     <ParentFee db={db} child={child} />,
    patt:     <ParentAttendance db={db} child={child} />,
    pmarks:   <ParentMarks db={db} child={child} />,
    pexam:    <ParentExams db={db} child={child} />,
    pcal:     <ParentCalendar db={db} />,
    pmsg:     <ParentMessages db={db} child={child} student={student} activeSessionId={activeSessionId} />,
    pprofile: <ParentProfile child={child} db={db} />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f4ff', fontFamily: 'Inter,sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes pp-slidein{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:none}}
        @keyframes pp-fadein{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(25,96,163,0.25)}50%{box-shadow:0 0 0 6px rgba(25,96,163,0)}}
        @keyframes pp-bar-grow{from{height:0}to{height:var(--bar-h)}}
        @keyframes pp-progress{from{stroke-dashoffset:var(--dash-total)}to{stroke-dashoffset:var(--dash-offset)}}
        .pp-nav-btn:hover{background:rgba(96,165,250,0.15)!important;color:#60a5fa!important}
        .pp-nav-btn.active{background:rgba(96,165,250,0.18)!important;color:#60a5fa!important}
        .pp-stat{transition:all 200ms cubic-bezier(0.4,0,0.2,1)!important}
        .pp-stat:hover{transform:translateY(-4px)!important;box-shadow:0 12px 32px rgba(0,31,77,0.14)!important}
        .pp-card{transition:all 200ms cubic-bezier(0.4,0,0.2,1)!important}
        .pp-card:hover{box-shadow:0 8px 28px rgba(0,31,77,0.11)!important}
        .pp-fadein{animation:pp-fadein 0.45s ease both}
        .pp-pulse-badge{animation:pp-pulse 2s infinite}
        @media(max-width:768px){
          .pp-main-pad{padding:20px 16px!important}
          .pp-stats-grid{grid-template-columns:1fr 1fr!important}
          .pp-dash-grid{grid-template-columns:1fr!important}
          .pp-header-title{display:none!important}
          .pp-fee-timeline{grid-template-columns:repeat(4,1fr)!important}
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
        {/* Student avatar — clickable → profile */}
        <div onClick={()=>{setPage('pprofile');if(isMobile)setMobileNavOpen(false);}}
          style={{padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10,paddingLeft:isMobile?18:0,justifyContent:isMobile?'flex-start':'center',overflow:'hidden',cursor:'pointer'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
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
          boxShadow:'0 2px 12px rgba(0,31,77,0.07)', zIndex:100, position:'relative',
        }}>
          {/* Left — logo + school name (clickable → dashboard) */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {isMobile && (
              <button onClick={()=>setMobileNavOpen(v=>!v)}
                style={{border:0,background:'transparent',cursor:'pointer',color:'#1960a3',padding:4,display:'flex',alignItems:'center'}}>
                <span className="material-symbols-outlined" style={{fontSize:22}}>menu</span>
              </button>
            )}
            <div onClick={()=>setPage('pdash')} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
              <img src={process.env.PUBLIC_URL+'/assets/logo.png'} alt="LKPS"
                style={{width:36,height:36,objectFit:'contain',flexShrink:0}}
                onError={e=>{e.target.style.display='none';}}/>
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

          {/* Right — alert bell + user */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>

            {/* Alert bell — dropdown with pending fees, upcoming exams, events */}
            {(() => {
              const sid = child.sid || child.id;
              const pays = (db.pays||[]).filter(p=>p.sid===sid);
              const totalPaid = pays.reduce((s,p)=>s+(p.amt||0),0);
              const feeDue = Math.max(0,(child.fee||0)-totalPaid);
              const today = new Date().toISOString().split('T')[0];
              const upcomingExams = (db.exams||[]).filter(e=>(!e.cls||e.cls===child.cls)&&(e.dt||'')>=today&&e.st!=='Completed').slice(0,3);
              const upcomingEvents = (db.events||[]).filter(e=>e.dt>=today).slice(0,3);
              const alertCount = (feeDue>0?1:0) + upcomingExams.length + upcomingEvents.length;

              return (
                <div style={{position:'relative'}}>
                  <button onClick={()=>setAlertOpen(v=>!v)}
                    style={{position:'relative',width:36,height:36,borderRadius:10,border:'1.5px solid #e2e8f0',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',transition:'all 150ms'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='#eef4ff';e.currentTarget.style.color='#1960a3';e.currentTarget.style.borderColor='#c7d9f5';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.color='#64748b';e.currentTarget.style.borderColor='#e2e8f0';}}>
                    <span className="material-symbols-outlined" style={{fontSize:20}}>notifications</span>
                    {alertCount > 0 && <span style={{position:'absolute',top:4,right:4,width:8,height:8,borderRadius:'50%',background:'#dc2626',border:'1.5px solid #fff'}}/>}
                  </button>
                  {alertOpen && (
                    <>
                      <div onClick={()=>setAlertOpen(false)} style={{position:'fixed',inset:0,zIndex:199}}/>
                      <div style={{position:'absolute',right:0,top:44,width:300,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,31,77,0.15)',border:'1px solid #e2e8f0',zIndex:200,overflow:'hidden'}}>
                        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800,color:'#1e293b'}}>Alerts & Reminders</div>
                        <div style={{maxHeight:320,overflowY:'auto'}}>
                          {feeDue > 0 && (
                            <div onClick={()=>{setPage('pfee');setAlertOpen(false);}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',background:'#fff'}}
                              onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
                              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                              <div style={{width:32,height:32,borderRadius:8,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span className="material-symbols-outlined" style={{fontSize:16,color:'#dc2626',fontVariationSettings:"'FILL' 1"}}>payments</span>
                              </div>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Fee Due</div>
                                <div style={{fontSize:11,color:'#dc2626',fontWeight:600}}>₹{feeDue.toLocaleString('en-IN')} pending</div>
                              </div>
                            </div>
                          )}
                          {upcomingExams.map((e,i)=>(
                            <div key={i} onClick={()=>{setPage('pexam');setAlertOpen(false);}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',background:'#fff'}}
                              onMouseEnter={ev=>ev.currentTarget.style.background='#f5f3ff'}
                              onMouseLeave={ev=>ev.currentTarget.style.background='#fff'}>
                              <div style={{width:32,height:32,borderRadius:8,background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span className="material-symbols-outlined" style={{fontSize:16,color:'#7c3aed',fontVariationSettings:"'FILL' 1"}}>quiz</span>
                              </div>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{e.name}</div>
                                <div style={{fontSize:11,color:'#7c3aed',fontWeight:600}}>{e.dt||'TBD'} · {e.su||''}</div>
                              </div>
                            </div>
                          ))}
                          {upcomingEvents.map((e,i)=>(
                            <div key={i} onClick={()=>{setPage('pcal');setAlertOpen(false);}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',background:'#fff'}}
                              onMouseEnter={ev=>ev.currentTarget.style.background='#f0fdf4'}
                              onMouseLeave={ev=>ev.currentTarget.style.background='#fff'}>
                              <div style={{width:32,height:32,borderRadius:8,background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span className="material-symbols-outlined" style={{fontSize:16,color:'#059669',fontVariationSettings:"'FILL' 1"}}>event</span>
                              </div>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{e.title}</div>
                                <div style={{fontSize:11,color:'#059669',fontWeight:600}}>{e.dt}</div>
                              </div>
                            </div>
                          ))}
                          {alertCount === 0 && (
                            <div style={{padding:'24px 16px',textAlign:'center',color:'#94a3b8',fontSize:12}}>No alerts right now</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
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

// ── Parent Profile ────────────────────────────────────────────────
function ParentProfile({ child, db }) {
  const photo = (db.photos||{})[child.sid||child.id] || child.photo || '';
  const name = (child.fn||'') + ' ' + (child.ln||'');
  const ini = name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const dob = child.dob ? new Date(child.dob).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—';

  const row = (label, val) => val ? (
    <div style={{display:'flex',gap:16,padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
      <div style={{fontSize:12,color:'#64748b',fontWeight:600,minWidth:140}}>{label}</div>
      <div style={{fontSize:13,color:'#1e293b',fontWeight:600}}>{val}</div>
    </div>
  ) : null;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Student Profile</div>
        <h1 style={{fontSize:28,fontWeight:900,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>{name}</h1>
      </div>

      {/* Profile card */}
      <div style={{background:'#fff',borderRadius:16,padding:'28px',boxShadow:'0 1px 8px rgba(0,31,77,0.06)',marginBottom:20,display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div style={{width:100,height:100,borderRadius:16,background:'linear-gradient(135deg,#1960a3,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:900,color:'#fff',overflow:'hidden',flexShrink:0}}>
          {photo ? <img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ini}
        </div>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:22,fontWeight:900,color:'#1e293b',fontFamily:'Manrope,sans-serif',marginBottom:4}}>{name}</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:12}}>Class {child.cls||'—'} · {db.settings?.year||''}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {child.roll && <span style={{background:'#eef4ff',color:'#1960a3',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,border:'1px solid #c7d9f5'}}>Roll: {child.roll}</span>}
            {child.admno && <span style={{background:'#f0fdf4',color:'#059669',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,border:'1px solid #bbf7d0'}}>Adm: {child.admno}</span>}
            {child.blood && <span style={{background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,border:'1px solid #fecaca'}}>{child.blood}</span>}
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{background:'#fff',borderRadius:16,padding:'20px 24px',boxShadow:'0 1px 8px rgba(0,31,77,0.06)'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#1e293b',marginBottom:4}}>Personal Information</div>
        {row('Date of Birth', dob)}
        {row('Gender', child.gn)}
        {row('Class / Section', child.cls)}
        {row('Roll Number', child.roll)}
        {row('Admission No.', child.admno)}
        {row('Blood Group', child.blood)}
        {row('Caste', child.caste)}
        {row('Aadhaar No.', child.aadhar)}
        <div style={{fontSize:12,fontWeight:800,color:'#1e293b',margin:'16px 0 4px'}}>Family Information</div>
        {row("Father's Name", child.father)}
        {row("Mother's Name", child.mother)}
        {row("Father's Phone", child.fphone)}
        {row('Student Phone', child.ph)}
        {row('Email', child.em || child.email)}
        <div style={{fontSize:12,fontWeight:800,color:'#1e293b',margin:'16px 0 4px'}}>Address</div>
        {row('Address', [child.addr, child.city, child.pin ? 'Pin-'+child.pin : ''].filter(Boolean).join(', '))}
      </div>
    </div>
  );
}

// ── Attendance Donut Chart (SVG) ──────────────────────────────────
function AttendanceDonut({ present, absent, late, size = 120 }) {
  const total = present + absent + late || 1;
  const r = 44; const cx = 60; const cy = 60;
  const circ = 2 * Math.PI * r;
  const pPct = present / total; const lPct = late / total; const aPct = absent / total;
  const pDash = circ * pPct; const lDash = circ * lPct; const aDash = circ * aPct;
  const pOffset = 0;
  const lOffset = -(circ * pPct);
  const aOffset = -(circ * (pPct + lPct));
  const attPct = Math.round((present + late) / total * 100);
  const col = attPct >= 90 ? '#059669' : attPct >= 75 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{display:'block',flexShrink:0}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14"/>
      {present > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#059669" strokeWidth="14"
        strokeDasharray={`${pDash} ${circ - pDash}`} strokeDashoffset={pOffset}
        strokeLinecap="butt" transform="rotate(-90 60 60)" style={{transition:'stroke-dasharray 0.8s ease'}}/>}
      {late > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#d97706" strokeWidth="14"
        strokeDasharray={`${lDash} ${circ - lDash}`} strokeDashoffset={lOffset}
        strokeLinecap="butt" transform="rotate(-90 60 60)" style={{transition:'stroke-dasharray 0.8s ease'}}/>}
      {absent > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="14"
        strokeDasharray={`${aDash} ${circ - aDash}`} strokeDashoffset={aOffset}
        strokeLinecap="butt" transform="rotate(-90 60 60)" style={{transition:'stroke-dasharray 0.8s ease'}}/>}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="900" fill={col} fontFamily="Manrope,sans-serif">{attPct}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8">Attendance</text>
    </svg>
  );
}

// ── Count-up hook ─────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const isNum = typeof target === 'number';
    if (!isNum) { setVal(target); return; }
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
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
  const classFee = (db.settings?.classFees || {})[child.cls] || {};
  const monthlyFee = parseFloat(classFee.monthly) || child.mf || 0;
  const lastPay = pays.sort((a,b)=>(b.dt||'').localeCompare(a.dt||''))[0];
  const paidMonths = new Set();
  pays.forEach(p => { if (p.mn) p.mn.split(',').map(m=>m.trim()).filter(Boolean).forEach(m=>paidMonths.add(m.toLowerCase())); });
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentMonth = MONTHS[new Date().getMonth()];
  const currentMonthPaid = paidMonths.has(currentMonth.toLowerCase());
  const feeStatusLabel = currentMonthPaid ? 'Paid' : (child.fst === 'Paid' ? 'Paid' : 'Due');

  const attColor = attPct >= 90 ? '#059669' : attPct >= 75 ? '#d97706' : '#dc2626';
  const feeColor = feeStatusLabel === 'Paid' ? '#059669' : '#dc2626';

  const countExams = useCountUp(recentMarks.length);
  const countUpcoming = useCountUp(upcoming.length);

  const motivations = [
    'Keep up the great work! 🌟', 'Every day is a new opportunity to learn! 📚',
    'Consistency is the key to success! 🎯', 'Stay focused and keep growing! 🚀',
  ];
  const motivation = motivations[Math.floor((new Date().getDate()) % motivations.length)];

  return (
    <div className="pp-fadein">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #002045 0%, #1960a3 60%, #3b82f6 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 8px 32px rgba(0,31,77,0.18)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{position:'absolute',top:-30,right:-30,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-40,right:80,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none'}}/>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6}}>Welcome back</div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#fff',fontFamily:'Manrope,sans-serif',margin:'0 0 4px'}}>{name}</h1>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.65)',marginBottom:10}}>Class {child.cls || '—'} · {db.settings?.year || ''}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.8)',fontStyle:'italic'}}>{motivation}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
          {/* Donut chart */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <AttendanceDonut present={p} absent={a} late={l} size={110}/>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
              {[['#059669','Present',p],['#d97706','Late',l],['#ef4444','Absent',a]].map(([c,lbl,v])=>(
                <div key={lbl} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.65)',fontWeight:600}}>{lbl}: {v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Fee mini-card */}
          <div style={{background:'rgba(255,255,255,0.1)',borderRadius:14,padding:'16px 20px',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',minWidth:130}}>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>This Month Fee</div>
            <div style={{fontSize:20,fontWeight:900,color: feeStatusLabel==='Paid'?'#6ee7b7':'#fca5a5',fontFamily:'Manrope,sans-serif',marginBottom:4}}>{feeStatusLabel}</div>
            {monthlyFee > 0 && <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>₹{monthlyFee.toLocaleString('en-IN')}/mo</div>}
            <div className="pp-pulse-badge" style={{display:'inline-block',marginTop:8,padding:'3px 10px',borderRadius:20,background: feeStatusLabel==='Paid'?'rgba(110,231,183,0.2)':'rgba(252,165,165,0.2)',border:`1px solid ${feeStatusLabel==='Paid'?'rgba(110,231,183,0.4)':'rgba(252,165,165,0.4)'}`,fontSize:10,fontWeight:700,color: feeStatusLabel==='Paid'?'#6ee7b7':'#fca5a5'}}>
              {feeStatusLabel === 'Paid' ? '✓ Cleared' : '⚠ Due'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="pp-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: 'fact_check', label: 'Attendance', rawVal: attPct, value: attPct + '%', color: attColor, page: 'patt' },
          { icon: 'payments', label: 'Fee Status', value: feeStatusLabel, color: feeColor, page: 'pfee' },
          { icon: 'quiz', label: 'Exams Taken', rawVal: recentMarks.length, value: countExams, color: '#1960a3', page: 'pmarks' },
          { icon: 'event_note', label: 'Upcoming', rawVal: upcoming.length, value: countUpcoming, color: '#7c3aed', page: 'pexam' },
        ].map(s => (
          <div key={s.label} className="pp-stat" onClick={() => s.page && setPage(s.page)}
            style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', cursor: s.page ? 'pointer' : 'default', border: '1px solid #f1f5f9' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 19, color: s.color, fontVariationSettings:"'FILL' 1" }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: 'Manrope,sans-serif', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="pp-dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Upcoming exams */}
        <div className="pp-card" style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>📅 Upcoming Exams</div>
            <button onClick={() => setPage('pexam')} style={{ fontSize: 11, color: '#1960a3', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View all →</button>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12 }}>No upcoming exams</div>
            </div>
          ) : upcoming.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#7c3aed', fontVariationSettings:"'FILL' 1" }}>quiz</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{e.su || ''}{e.su && e.dt ? ' · ' : ''}{e.dt || 'TBD'}</div>
              </div>
              <span style={{ padding: '3px 9px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>Soon</span>
            </div>
          ))}
        </div>

        {/* Recent results */}
        <div className="pp-card" style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>🏆 Recent Results</div>
            <button onClick={() => setPage('pmarks')} style={{ fontSize: 11, color: '#1960a3', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View all →</button>
          </div>
          {recentMarks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 12 }}>No results yet</div>
            </div>
          ) : recentMarks.slice(-5).reverse().map((m, i) => {
            const pct = Math.round(m.marks / m.max * 100);
            const col = pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
            const g = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.exam}</div>
                  <div style={{ height: 4, borderRadius: 4, background: '#f1f5f9', marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: col, borderRadius: 4, transition: 'width 0.8s ease' }}/>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: col }}>{m.marks}/{m.max}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{g}</span>
                </div>
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
  const totalPaid = pays.reduce((s,p) => s + (p.amt||0), 0);
  const classFee = (db.settings?.classFees || {})[child.cls] || {};
  const monthlyFee = parseFloat(classFee.monthly) || child.mf || 0;
  const lastPay = pays[0];

  const paidMonths = new Set();
  pays.forEach(p => {
    if (p.mn) p.mn.split(',').map(m=>m.trim()).filter(Boolean).forEach(m=>paidMonths.add(m.toLowerCase()));
  });

  const now = new Date();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentMonth = MONTHS[now.getMonth()];
  const nextMonth = MONTHS[(now.getMonth()+1)%12];
  const nextMonthDueDate = new Date(now.getFullYear(), now.getMonth()+1, 10);
  const nextMonthPaid = paidMonths.has(nextMonth.toLowerCase());

  let dueMontIdx = now.getMonth() + 1;
  while (dueMontIdx < 12 && paidMonths.has(MONTHS[dueMontIdx].toLowerCase())) dueMontIdx++;
  const dueMonth = dueMontIdx < 12 ? MONTHS[dueMontIdx] : null;
  const dueDateObj = dueMonth ? new Date(now.getFullYear(), dueMontIdx, 10) : null;
  const currentMonthPaid = paidMonths.has(currentMonth.toLowerCase());

  const feeStatus = currentMonthPaid ? 'Paid' : (child.fst === 'Paid' ? 'Paid' : 'Due');
  const statusColor = feeStatus === 'Paid' ? '#059669' : '#dc2626';

  // Academic year months (April → March)
  const academicMonths = ['April','May','June','July','August','September','October','November','December','January','February','March'];
  const currentMonthIdx = now.getMonth();

  return (
    <div className="pp-fadein">
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Fee Status</div>
        <h1 style={{fontSize:28,fontWeight:900,color:'#1e293b',fontFamily:'Manrope,sans-serif',margin:0}}>{child.fn} {child.ln}</h1>
        <div style={{fontSize:13,color:'#64748b',marginTop:4}}>Class {child.cls||'—'} · {db.settings?.year||''}</div>
      </div>

      {/* Summary cards */}
      <div className="pp-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {[
          {label:'Monthly Fee', value: monthlyFee ? '₹'+monthlyFee.toLocaleString('en-IN') : '—', color:'#1960a3', icon:'receipt_long'},
          {label:'Total Paid',  value:'₹'+totalPaid.toLocaleString('en-IN'), color:'#059669', icon:'check_circle'},
          {label:'This Month',  value:feeStatus, color:statusColor, icon: feeStatus==='Paid'?'verified':'pending'},
        ].map(s=>(
          <div key={s.label} className="pp-stat" style={{background:'#fff',borderRadius:16,padding:'20px',boxShadow:'0 2px 12px rgba(0,31,77,0.07)',border:'1px solid #f1f5f9'}}>
            <div style={{width:38,height:38,borderRadius:11,background:s.color+'18',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
              <span className="material-symbols-outlined" style={{fontSize:19,color:s.color,fontVariationSettings:"'FILL' 1"}}>{s.icon}</span>
            </div>
            <div style={{fontSize:22,fontWeight:900,color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:4,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Payment Timeline */}
      <div className="pp-card" style={{background:'#fff',borderRadius:16,padding:'24px',boxShadow:'0 2px 12px rgba(0,31,77,0.07)',border:'1px solid #f1f5f9',marginBottom:24}}>
        <div style={{fontSize:13,fontWeight:800,color:'#1e293b',marginBottom:6}}>📅 Academic Year Payment Timeline</div>
        <div style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>{db.settings?.year || 'Current Year'} · April to March</div>
        <div className="pp-fee-timeline" style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8}}>
          {academicMonths.map((month, idx) => {
            const isPaid = paidMonths.has(month.toLowerCase());
            const mIdx = MONTHS.indexOf(month);
            const isCurrent = mIdx === currentMonthIdx;
            const isFuture = !isPaid && (
              (mIdx > currentMonthIdx && mIdx < 12) ||
              (currentMonthIdx >= 9 && mIdx < 3)
            );
            let bg, color, border, emoji;
            if (isPaid) { bg = '#dcfce7'; color = '#059669'; border = '#bbf7d0'; emoji = '✓'; }
            else if (isCurrent) { bg = '#fef2f2'; color = '#dc2626'; border = '#fecaca'; emoji = '!'; }
            else if (isFuture) { bg = '#f8fafc'; color = '#94a3b8'; border = '#e2e8f0'; emoji = '·'; }
            else { bg = '#fef2f2'; color = '#dc2626'; border = '#fecaca'; emoji = '✗'; }
            return (
              <div key={month} style={{
                borderRadius: 10, padding: '10px 6px', textAlign: 'center',
                background: bg, border: `1.5px solid ${border}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(220,38,38,0.15)' : 'none',
                transition: 'all 150ms',
              }}>
                <div style={{fontSize:16,marginBottom:2}}>{emoji}</div>
                <div style={{fontSize:10,fontWeight:800,color,lineHeight:1.2}}>{month.slice(0,3)}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap'}}>
          {[['#059669','#dcfce7','Paid'],['#dc2626','#fef2f2','Unpaid / Due'],['#94a3b8','#f8fafc','Upcoming']].map(([c,bg,lbl])=>(
            <div key={lbl} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:12,height:12,borderRadius:3,background:bg,border:`1.5px solid ${c}33`}}/>
              <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next month due */}
      {monthlyFee > 0 && (
        <div style={{background:'linear-gradient(135deg,#002045,#1960a3)',borderRadius:16,padding:'20px 24px',marginBottom:24,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span className="material-symbols-outlined" style={{fontSize:22,color:'#fff',fontVariationSettings:"'FILL' 1"}}>event_upcoming</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>Next Month Due</div>
            {dueMonth ? <>
              <div style={{fontSize:20,fontWeight:900,color:'#fff',fontFamily:'Manrope,sans-serif'}}>₹{monthlyFee.toLocaleString('en-IN')} · {dueMonth}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:2}}>
                Due by {dueDateObj.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
              </div>
            </> : <div style={{fontSize:16,fontWeight:700,color:'#6ee7b7'}}>All months paid ✓</div>}
          </div>
          {lastPay && (
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>Last Payment</div>
              <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>₹{(lastPay.amt||0).toLocaleString('en-IN')}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>
                {lastPay.dt ? new Date(lastPay.dt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                {lastPay.mn ? ` · ${lastPay.mn}` : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment history */}
      <div className="pp-card" style={{background:'#fff',borderRadius:16,boxShadow:'0 2px 12px rgba(0,31,77,0.07)',overflow:'hidden',border:'1px solid #f1f5f9'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',fontSize:13,fontWeight:700,color:'#1e293b'}}>
          Payment History ({pays.length})
        </div>
        {pays.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:32,marginBottom:8}}>💳</div>
            <div style={{fontSize:13}}>No payments recorded yet</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>{['Date','Amount','Mode','Month / Note','Receipt'].map(h=>(
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
  // Monthly breakdown
  const monthlyData = {};
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  Object.entries(db.att || {}).forEach(([date, d]) => {
    const v = d[sid];
    if (v === 'P') p++;
    else if (v === 'L') l++;
    else if (v === 'A') a++;
    if (v) {
      history.push({ date, status: v });
      const mo = new Date(date).getMonth();
      if (!monthlyData[mo]) monthlyData[mo] = { p: 0, a: 0, l: 0 };
      if (v === 'P') monthlyData[mo].p++;
      else if (v === 'A') monthlyData[mo].a++;
      else if (v === 'L') monthlyData[mo].l++;
    }
  });
  history.sort((a, b) => b.date.localeCompare(a.date));
  const tot = p + a + l;
  const pct = tot > 0 ? Math.round((p + l) / tot * 100) : 0;
  const col = pct >= 90 ? '#059669' : pct >= 75 ? '#d97706' : '#dc2626';

  // Bar chart data — last 6 months with data
  const chartMonths = Object.keys(monthlyData).map(Number).sort((a,b)=>a-b).slice(-6);
  const maxDays = Math.max(...chartMonths.map(m => (monthlyData[m]?.p||0) + (monthlyData[m]?.a||0) + (monthlyData[m]?.l||0)), 1);

  // Recent 30 days for calendar-style view
  const recent30 = history.slice(0, 30);

  return (
    <div className="pp-fadein">
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Attendance</h1>

      {/* Stat cards */}
      <div className="pp-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[{ label: 'Present', val: p, c: '#059669', icon: 'check_circle' },
          { label: 'Absent', val: a, c: '#dc2626', icon: 'cancel' },
          { label: 'Late', val: l, c: '#d97706', icon: 'schedule' },
          { label: 'Attendance %', val: pct + '%', c: col, icon: 'fact_check' }].map(s => (
          <div key={s.label} className="pp-stat" style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: s.c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 19, color: s.c, fontVariationSettings:"'FILL' 1" }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c, fontFamily: 'Manrope,sans-serif' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Animated progress bar */}
      <div className="pp-card" style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', border: '1px solid #f1f5f9', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Overall Attendance</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: col, fontFamily: 'Manrope,sans-serif' }}>{pct}%</div>
        </div>
        <div style={{ height: 10, borderRadius: 10, background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg, ${col}, ${col}cc)`, borderRadius: 10, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>0%</span>
          <span style={{ fontSize: 10, color: pct >= 75 ? '#059669' : '#dc2626', fontWeight: 700 }}>
            {pct >= 90 ? '🌟 Excellent' : pct >= 75 ? '✓ Satisfactory' : '⚠ Below Required (75%)'}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>100%</span>
        </div>
      </div>

      {/* Monthly bar chart (SVG) */}
      {chartMonths.length > 0 && (
        <div className="pp-card" style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', border: '1px solid #f1f5f9', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>📊 Monthly Attendance</div>
          <svg width="100%" viewBox={`0 0 ${chartMonths.length * 70} 120`} style={{ overflow: 'visible' }}>
            {chartMonths.map((mo, i) => {
              const d = monthlyData[mo] || { p: 0, a: 0, l: 0 };
              const total = d.p + d.a + d.l;
              const attPctM = total > 0 ? (d.p + d.l) / total : 0;
              const barH = Math.round(attPctM * 80);
              const barColor = attPctM >= 0.9 ? '#059669' : attPctM >= 0.75 ? '#d97706' : '#ef4444';
              const x = i * 70 + 10;
              return (
                <g key={mo}>
                  <rect x={x} y={80 - barH} width={50} height={barH} rx={6} fill={barColor} opacity="0.85"
                    style={{ transition: 'height 0.8s ease, y 0.8s ease' }}/>
                  <text x={x + 25} y={98} textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748b">{MONTHS[mo]}</text>
                  <text x={x + 25} y={80 - barH - 4} textAnchor="middle" fontSize="9" fontWeight="800" fill={barColor}>{Math.round(attPctM * 100)}%</text>
                </g>
              );
            })}
            <line x1="0" y1="80" x2={chartMonths.length * 70} y2="80" stroke="#f1f5f9" strokeWidth="1"/>
          </svg>
        </div>
      )}

      {/* Calendar-style recent attendance */}
      {recent30.length > 0 && (
        <div className="pp-card" style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,31,77,0.07)', border: '1px solid #f1f5f9', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>🗓 Recent Attendance</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Last {recent30.length} school days</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recent30.map((r, i) => {
              const sc = r.status === 'P' ? '#059669' : r.status === 'A' ? '#dc2626' : '#d97706';
              const bg = r.status === 'P' ? '#dcfce7' : r.status === 'A' ? '#fee2e2' : '#fef3c7';
              const d = new Date(r.date);
              return (
                <div key={i} title={`${d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} — ${r.status === 'P' ? 'Present' : r.status === 'A' ? 'Absent' : 'Late'}`}
                  style={{ width: 32, height: 32, borderRadius: 8, background: bg, border: `1.5px solid ${sc}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: sc, lineHeight: 1 }}>{d.getDate()}</div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: sc + 'aa', lineHeight: 1 }}>{d.toLocaleDateString('en-IN',{month:'short'})}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            {[['#059669','#dcfce7','Present'],['#dc2626','#fee2e2','Absent'],['#d97706','#fef3c7','Late']].map(([c,bg,lbl])=>(
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1.5px solid ${c}44` }}/>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full history table */}
      <div className="pp-card" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,31,77,0.07)', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Attendance History</div>
        {history.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13 }}>No attendance records yet</div>
          </div>
        ) : (
          <div className="parent-table-wrap" style={{ overflowX: 'auto' }}>
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

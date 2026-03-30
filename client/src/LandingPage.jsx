import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBase } from './apiBase';

const API = getApiBase();

/* ── Hooks ── */
function useCountUp(target, duration = 2000, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) { setVal(0); return; }
    let s = null;
    const step = (ts) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return val;
}

function useInView(ref, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

function Icon({ name, size = 24, style = {} }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1, userSelect: 'none', ...style }}>{name}</span>;
}

/* ── Particle Canvas ── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const N = 55;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      op: Math.random() * 0.5 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.op})`;
        ctx.fill();
      });
      // connections
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.07 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ── Typewriter ── */
function Typewriter({ texts, speed = 80, pause = 2200 }) {
  const [display, setDisplay] = useState('');
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('typing'); // typing | pausing | erasing
  const [charIdx, setCharIdx] = useState(0);
  useEffect(() => {
    let t;
    if (phase === 'typing') {
      if (charIdx < texts[idx].length) {
        t = setTimeout(() => { setDisplay(texts[idx].slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, speed);
      } else { t = setTimeout(() => setPhase('pausing'), pause); }
    } else if (phase === 'pausing') {
      t = setTimeout(() => setPhase('erasing'), 400);
    } else {
      if (charIdx > 0) {
        t = setTimeout(() => { setDisplay(texts[idx].slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, speed / 2);
      } else { setIdx(i => (i + 1) % texts.length); setPhase('typing'); }
    }
    return () => clearTimeout(t);
  }, [phase, charIdx, idx, texts, speed, pause]);
  return (
    <span style={{ borderRight: '2px solid #fbbf24', paddingRight: 3, animation: 'cursorBlink 0.9s step-end infinite' }}>
      {display}
    </span>
  );
}

/* ── Stat Counter ── */
function StatCounter({ value, suffix = '', label, inView }) {
  const num = useCountUp(value, 1800, inView);
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', fontFamily: 'Manrope,sans-serif', lineHeight: 1, letterSpacing: '-0.03em', textShadow: inView ? '0 0 40px rgba(251,191,36,0.5)' : 'none', transition: 'text-shadow 0.5s' }}>
        {num}{suffix}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

const FALLBACK_NOTICES = [];

const ACADEMICS = [
  { icon: 'menu_book', label: 'Nursery & KG', desc: 'Play-based early learning with phonics, numeracy, and creative arts.' },
  { icon: 'calculate', label: 'Primary (I–V)', desc: 'Strong foundation in Maths, Science, English, Hindi, and EVS.' },
  { icon: 'science', label: 'Middle (VI–VIII)', desc: 'Conceptual depth in all subjects with project-based learning.' },
  { icon: 'sports_soccer', label: 'Co-Curricular', desc: 'Sports, art, music, and cultural activities for holistic growth.' },
];

const VALUES = [
  { icon: 'emoji_events', color: '#f59e0b', bg: '#fffbeb', label: 'Excellence', desc: '100% annual results with consistent academic achievement.' },
  { icon: 'diversity_3', color: '#8b5cf6', bg: '#f5f3ff', label: 'Inclusivity', desc: 'A welcoming environment for every child to thrive.' },
  { icon: 'psychology', color: '#0ea5e9', bg: '#f0f9ff', label: 'Critical Thinking', desc: 'Encouraging curiosity, reasoning, and problem-solving.' },
  { icon: 'favorite', color: '#ef4444', bg: '#fff1f2', label: 'Care & Values', desc: 'Nurturing character, discipline, and moral values.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [brochureOpen, setBrochureOpen] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '' });
  const [regError, setRegError] = useState('');
  const [regDone, setRegDone] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [notices, setNotices] = useState(FALLBACK_NOTICES);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, 0.2);
  const heroRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      {
        threshold: 0,
        rootMargin: '0px',
      }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBrochureOpen(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch(`${API}/notices/public`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setNotices(data); })
      .catch(() => {});
  }, []);

  // Scroll-reveal bidirectional
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); e.target.classList.remove('reveal-out'); }
        else { e.target.classList.remove('revealed'); e.target.classList.add('reveal-out'); }
      });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Mouse parallax for hero
  const onMouseMove = useCallback((e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
    });
  }, []);

  const scrollTo = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  const handleReg = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.name.trim()) return setRegError('Student name is required.');
    if (!/^\d{10}$/.test(regForm.phone)) return setRegError('Enter a valid 10-digit phone number.');
    setRegLoading(true);
    try {
      const res = await fetch(`${API}/admissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      if (!res.ok) throw new Error();
      setRegDone(true);
    } catch { setRegError('Something went wrong. Please try again.'); }
    finally { setRegLoading(false); }
  };

  const closeReg = () => { setRegOpen(false); setRegDone(false); setRegForm({ name: '', phone: '', email: '' }); setRegError(''); };
  const NAV_LINKS = ['About', 'Academics', 'Facilities', 'Notices', 'Contact'];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1e293b', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&display=swap');

        /* ── Keyframes ── */
        @keyframes gradShift  { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes sway       { 0%,100%{transform:translateX(0) rotate(-5deg)} 50%{transform:translateX(20px) rotate(5deg)} }
        @keyframes bobY       { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(8deg)} }
        @keyframes spinSlow   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes twinkle    { 0%,100%{opacity:0.05;transform:scale(0.6)} 50%{opacity:1;transform:scale(1.6)} }
        @keyframes ringOut    { 0%{transform:scale(0.5);opacity:0.6} 100%{transform:scale(2.8);opacity:0} }
        @keyframes slideInL   { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:none} }
        @keyframes slideInR   { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:none} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:none} }
        @keyframes orb1       { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.05)} 66%{transform:translate(-30px,50px) scale(0.95)} }
        @keyframes orb2       { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-70px,30px) scale(1.08)} 70%{transform:translate(40px,-60px) scale(0.92)} }
        @keyframes shimmerTxt { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes popIn      { 0%{opacity:0;transform:scale(0.4) translateY(24px)} 70%{transform:scale(1.1) translateY(-4px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cursorBlink{ 0%,100%{border-color:#fbbf24} 50%{border-color:transparent} }
        @keyframes blobMorph  { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 25%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} 50%{border-radius:50% 60% 30% 60%/30% 60% 70% 40%} 75%{border-radius:60% 40% 60% 30%/70% 30% 50% 60%} }
        @keyframes glowPulse  { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,0.3),0 0 60px rgba(251,191,36,0.1)} 50%{box-shadow:0 0 40px rgba(251,191,36,0.6),0 0 100px rgba(251,191,36,0.2)} }
        @keyframes scanLine   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes floatIcon  { 0%{transform:translateY(0) rotate(0deg) scale(1)} 33%{transform:translateY(-22px) rotate(8deg) scale(1.05)} 66%{transform:translateY(-10px) rotate(-5deg) scale(0.97)} 100%{transform:translateY(0) rotate(0deg) scale(1)} }
        @keyframes gradBorder { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes countGlow  { 0%,100%{text-shadow:0 0 20px rgba(251,191,36,0.3)} 50%{text-shadow:0 0 60px rgba(251,191,36,0.8),0 0 100px rgba(251,191,36,0.4)} }
        @keyframes waveAnim   { 0%{d:path("M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z")} 50%{d:path("M0,20 C400,70 1000,10 1440,50 L1440,80 L0,80 Z")} 100%{d:path("M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z")} }

        /* ── Reveal ── */
        [data-reveal]{opacity:0;will-change:opacity,transform;transition:opacity 0.75s cubic-bezier(0.16,1,0.3,1),transform 0.75s cubic-bezier(0.16,1,0.3,1);}
        [data-reveal="up"]   {transform:translateY(48px);}
        [data-reveal="down"] {transform:translateY(-36px);}
        [data-reveal="left"] {transform:translateX(48px);}
        [data-reveal="right"]{transform:translateX(-48px);}
        [data-reveal="scale"]{transform:scale(0.82);}
        [data-reveal].revealed{opacity:1!important;transform:none!important;}
        [data-reveal].reveal-out{opacity:0;}
        [data-reveal="up"].reveal-out   {transform:translateY(48px);}
        [data-reveal="down"].reveal-out {transform:translateY(-36px);}
        [data-reveal="left"].reveal-out {transform:translateX(48px);}
        [data-reveal="right"].reveal-out{transform:translateX(-48px);}
        [data-reveal="scale"].reveal-out{transform:scale(0.82);}
        .d1{transition-delay:0.08s!important}.d2{transition-delay:0.16s!important}
        .d3{transition-delay:0.24s!important}.d4{transition-delay:0.32s!important}

        /* ── Hero ── */
        .hero-bg{
          background:
            radial-gradient(circle at top right, rgba(96,165,250,0.2), transparent 32%),
            radial-gradient(circle at bottom left, rgba(251,191,36,0.16), transparent 28%),
            linear-gradient(135deg,#f8fbff 0%,#eef6ff 48%,#fffdf7 100%);
        }
        .hero-grid{
          position:absolute;inset:0;pointer-events:none;
          background-image:linear-gradient(rgba(25,96,163,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(25,96,163,0.06) 1px,transparent 1px);
          background-size:72px 72px;
          mask-image:radial-gradient(ellipse 85% 85% at 50% 50%,black 24%,transparent 100%);
        }
        .scan-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent);animation:scanLine 8s linear infinite;pointer-events:none;}

        /* ── Orbs ── */
        .orb{position:absolute;border-radius:50%;pointer-events:none;will-change:transform;filter:blur(1px);}
        .orb1{animation:orb1 22s ease-in-out infinite;}
        .orb2{animation:orb2 28s ease-in-out infinite;}

        /* ── Blob ── */
        .blob{position:absolute;pointer-events:none;animation:blobMorph 18s ease-in-out infinite;filter:blur(60px);opacity:0.12;}

        /* ── Float card ── */
        .float-card{animation:bobY 6s ease-in-out infinite;will-change:transform;}

        /* ── Nav ── */
        .nav-link{position:relative;color:#334155;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.01em;padding:4px 0;transition:color 0.2s;}
        .nav-link::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:2px;background:#fbbf24;border-radius:2px;transition:width 0.28s ease;}
        .nav-link:hover{color:#0f172a;}.nav-link:hover::after{width:100%;}
        .nav-link-dark{color:#334155;}.nav-link-dark:hover{color:#0f172a;}.nav-link-dark::after{background:#1960a3;}
        .lp-nav-menu{display:none;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;border:1px solid #d7e2f0;background:rgba(255,255,255,0.92);color:#1960a3;cursor:pointer;box-shadow:0 8px 22px rgba(148,163,184,0.12);transition:transform 0.2s ease,box-shadow 0.2s ease;}
        .lp-nav-menu:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(148,163,184,0.16);}

        /* ── Cards ── */
        .card-hover{transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s ease;}
        .card-hover:hover{transform:translateY(-12px) scale(1.02);box-shadow:0 32px 64px rgba(0,32,69,0.14);}
        .grad-border{position:relative;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#1960a3,#fbbf24,#1960a3) border-box;border:2px solid transparent;background-size:200% 200%;animation:gradBorder 4s ease infinite;}
        .notice-row{transition:background 0.2s,transform 0.2s;}
        .notice-row:hover{background:#eef4ff;transform:translateX(8px);}

        /* ── Buttons ── */
        .reg-btn{background:linear-gradient(135deg,#ffc533,#f5a300);color:#132238;border:none;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:800;cursor:pointer;transition:transform 0.22s,box-shadow 0.22s,filter 0.22s;box-shadow:0 10px 24px rgba(245,163,0,0.26);letter-spacing:0.01em;will-change:transform;}
        .reg-btn:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(245,163,0,0.32);filter:brightness(1.03);}
        .hero-cta{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;transition:transform 0.25s,box-shadow 0.25s;border:none;will-change:transform;}
        .hero-cta-primary{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1e293b;box-shadow:0 8px 28px rgba(251,191,36,0.45);animation:glowPulse 3s ease-in-out infinite;}
        .hero-cta-primary:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 20px 48px rgba(251,191,36,0.6);}
        .hero-cta-secondary{background:#fff;color:#0f172a;border:1.5px solid #d7e2f0;box-shadow:0 12px 28px rgba(15,23,42,0.08);}
        .hero-cta-secondary:hover{background:#f8fbff;transform:translateY(-2px);}

        /* ── Tags ── */
        .tag{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.06em;}
        .tag-event{background:#dbeafe;color:#1d4ed8;}.tag-important{background:#fee2e2;color:#dc2626;}
        .tag-holiday{background:#d1fae5;color:#059669;}.tag-admission{background:#ede9fe;color:#7c3aed;}
        .tag-general{background:#f1f5f9;color:#475569;}

        /* ── Pulse ring ── */
        .pulse-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(251,191,36,0.5);animation:ringOut 2.6s ease-out infinite;}
        .pulse-ring.r2{animation-delay:0.9s;}.pulse-ring.r3{animation-delay:1.8s;}

        /* ── School float icons ── */
        .school-float{position:absolute;pointer-events:none;will-change:transform,opacity;font-variation-settings:'FILL' 1,'wght' 300,'GRAD' 0,'opsz' 48;}

        /* ── Stat glow ── */
        .stat-glow{animation:countGlow 2s ease-in-out infinite;}

        /* ── Kid on school name ── */
        @keyframes letterWave    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes underlineGrow { from{width:0} to{width:100%} }
        @keyframes starPop       { 0%,100%{transform:scale(1) rotate(0deg);opacity:0.9} 50%{transform:scale(1.5) rotate(180deg);opacity:1} }
        @keyframes footballBounce { 0%{transform:translateY(0) scaleY(1) scaleX(1)} 45%,55%{transform:translateY(8px) scaleY(0.75) scaleX(1.3)} 100%{transform:translateY(0) scaleY(1) scaleX(1)} }
        @keyframes shadowPulse   { 0%,100%{transform:scaleX(1);opacity:0.18} 45%,55%{transform:scaleX(1.6);opacity:0.32} }
        @keyframes sleepBreathe  { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-3px) rotate(-2deg)} }
        @keyframes zFloat1       { 0%{opacity:0;transform:translate(0,0) scale(0.6)} 30%{opacity:1} 100%{opacity:0;transform:translate(10px,-20px) scale(1.2)} }
        @keyframes zFloat2       { 0%{opacity:0;transform:translate(0,0) scale(0.5)} 30%{opacity:1} 100%{opacity:0;transform:translate(16px,-28px) scale(1.1)} }
        @keyframes zFloat3       { 0%{opacity:0;transform:translate(0,0) scale(0.4)} 30%{opacity:1} 100%{opacity:0;transform:translate(22px,-36px) scale(1)} }

        .school-name-letter{display:inline-block;animation:letterWave 2s ease-in-out infinite;}
        .school-name-letter:hover{color:#fbbf24!important;transform:translateY(-8px) scale(1.2)!important;transition:color 0.15s,transform 0.15s;}

        input:focus,textarea:focus{outline:none;border-color:#1960a3!important;}
        *{box-sizing:border-box;}

        /* ── Responsive ── */
        @media (max-width: 1024px){
          .lp-nav-links{display:none!important;}
          .lp-nav-menu{display:inline-flex!important;}
          .lp-nav-inner{padding:0 14px!important;}
          .lp-nav-actions{gap:8px!important;}
          .lp-hero-main{grid-template-columns:1fr!important;gap:34px!important;}
          .lp-about-grid{grid-template-columns:1fr!important;gap:36px!important;}
          .lp-values-grid{grid-template-columns:1fr 1fr!important;}
          .lp-stats-grid{grid-template-columns:repeat(2,1fr)!important;gap:26px!important;}
          .lp-academics-grid{grid-template-columns:repeat(2,1fr)!important;}
          .lp-facilities-grid{grid-template-columns:1fr!important;}
          .lp-contact-grid{grid-template-columns:1fr!important;}
          .lp-footer-grid{grid-template-columns:1fr 1fr!important;gap:28px!important;}
        }

        @media (max-width: 768px){
          .lp-nav{padding:0!important;}
          .lp-nav-brand div:first-child{font-size:14px!important;}
          .lp-nav-brand div:last-child{font-size:9px!important;}
          .lp-nav-actions .reg-btn{padding:8px 14px!important;font-size:12px!important;}
          .lp-nav-actions a{padding:8px 12px!important;font-size:12px!important;}
          .lp-hero-main{gap:24px!important;}
          .lp-hero-copy{text-align:center!important;}
          .lp-hero-copy p{margin-left:auto!important;margin-right:auto!important;}
          .lp-hero-ctas{justify-content:center!important;}
          .lp-hero-badges{justify-content:center!important;}
          .lp-about-grid,.lp-academics,.lp-notices,.lp-facilities,.lp-contact,.lp-footer{padding-left:14px!important;padding-right:14px!important;}
          .lp-values-grid{grid-template-columns:1fr!important;}
          .lp-stats-grid{grid-template-columns:1fr 1fr!important;gap:22px!important;}
          .lp-academics-grid{grid-template-columns:1fr!important;gap:16px!important;}
          .lp-footer-grid{grid-template-columns:1fr!important;}
        }

        @media (max-width: 480px){
          .lp-nav-actions .reg-btn{display:none!important;}
          .lp-nav-inner{padding:12px 14px!important;border-radius:0!important;}
          .lp-hero-copy h1,.lp-hero-copy h2{font-size:36px!important;line-height:1.12!important;}
          .lp-hero-copy p{font-size:13px!important;}
          .lp-hero-ctas .hero-cta{width:100%;justify-content:center!important;}
          .lp-hero-badges{gap:12px!important;}
          .lp-hero-card{padding:24px!important;}
          .lp-stats-grid{grid-template-columns:1fr!important;}
          .lp-notice-row{padding:16px 14px!important;gap:12px!important;}
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: 0,
        background: scrolled
          ? 'rgba(255,255,255,0.96)'
          : 'linear-gradient(135deg,#f8fbff 0%,#eef6ff 52%,#edf5ff 100%)',
        backdropFilter: 'blur(14px)',
        boxShadow: scrolled ? '0 10px 30px rgba(15,23,42,0.08)' : 'none',
        transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
        borderBottom: scrolled ? '1px solid rgba(226,232,240,0.95)' : 'none',
      }}>
        <div className="lp-nav-inner" style={{
          maxWidth: '100%',
          margin: '0 auto',
          width: '100%',
          padding: scrolled ? '14px 28px' : '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0,
          background: 'transparent',
          backdropFilter: 'none',
          boxShadow: 'none',
          border: 'none',
          transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div
            className="lp-nav-brand"
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', position: 'relative', zIndex: 1 }}
            onClick={() => window.location.href = '/'}
          >
            {/* Logo */}
            <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Lord Krishna Public School"
              style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(15,23,42,0.10))', transition: 'all 0.25s ease' }} />
            <div>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 17, color: '#0f172a', lineHeight: 1.05, letterSpacing: '-0.01em', transition: 'all 0.25s ease' }}>LORD KRISHNA</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3, transition: 'all 0.25s ease' }}>PUBLIC SCHOOL · MATHURA</div>
            </div>
          </div>

          <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32, position: 'relative', zIndex: 1, transition: 'gap 0.25s ease' }}>
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={e => { e.preventDefault(); scrollTo(l.toLowerCase()); }}
                className={`nav-link ${scrolled ? 'nav-link-dark' : ''}`}>{l}</a>
            ))}
          </div>

          <div className="lp-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <button
              className="lp-nav-menu"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
            <button className="reg-btn" onClick={() => setRegOpen(true)}>Register Now</button>
            <a href="/login" style={{
              padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: scrolled ? '#0f172a' : '#eef6ff',
              color: scrolled ? '#fff' : '#0f172a', textDecoration: 'none',
              border: scrolled ? '1px solid rgba(15,23,42,0.04)' : '1px solid #d7e2f0',
              transition: 'all 0.2s', backdropFilter: 'blur(8px)', boxShadow: scrolled ? '0 8px 18px rgba(15,23,42,0.08)' : 'none',
            }}>Login</a>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background: 'rgba(255,255,255,0.98)', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 18px 42px rgba(15,23,42,0.08)', backdropFilter: 'blur(16px)' }}>
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={e => { e.preventDefault(); scrollTo(l.toLowerCase()); }}
                style={{ color: '#334155', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{l}</a>
            ))}
            <button className="reg-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { setMenuOpen(false); setRegOpen(true); }}>Register Now</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        onMouseMove={onMouseMove}
        style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}
        className="hero-bg"
      >
        <div className="hero-grid" style={{ opacity: 0.48 }} />
        <div
          className="orb orb1"
          style={{
            width: 560,
            height: 560,
            background: 'radial-gradient(circle,rgba(147,197,253,0.26) 0%,transparent 70%)',
            top: -180,
            right: -160,
            transform: `translate(${mouse.x * -8}px, ${mouse.y * -6}px)`,
            transition: 'transform 0.15s ease-out',
          }}
        />
        <div
          className="orb orb2"
          style={{
            width: 420,
            height: 420,
            background: 'radial-gradient(circle,rgba(251,191,36,0.18) 0%,transparent 70%)',
            bottom: -120,
            left: -80,
            transform: `translate(${mouse.x * 6}px, ${mouse.y * 5}px)`,
            transition: 'transform 0.15s ease-out',
          }}
        />

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '150px 24px 96px', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="lp-hero-main" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}>
            <div className="lp-hero-copy" style={{ animation: 'slideInL 0.8s cubic-bezier(0.16,1,0.3,1) both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff8e1', border: '1px solid #f6dd9d', borderRadius: 999, padding: '8px 18px', marginBottom: 26, boxShadow: '0 10px 24px rgba(245, 158, 11, 0.08)' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px rgba(245,158,11,0.35)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Admissions Open 2025-26</span>
              </div>

              <div style={{ maxWidth: 620 }}>
                <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 'clamp(42px,6vw,72px)', fontWeight: 900, color: '#0f172a', lineHeight: 0.96, letterSpacing: '-0.04em', margin: 0 }}>
                  Bright beginnings,
                  <br />
                  strong foundations
                </h1>
                <div style={{ marginTop: 18, width: 120, height: 4, borderRadius: 999, background: 'linear-gradient(90deg,#1960a3,#7dd3fc)' }} />
              </div>

              <p style={{ fontSize: 20, color: '#334155', lineHeight: 1.6, margin: '24px 0 10px', maxWidth: 660, fontWeight: 600 }}>
                A warm, modern English-medium school for Nursery to Class VIII in Mathura.
              </p>
              <p style={{ fontSize: 14, color: '#1960a3', lineHeight: 1.8, margin: '0 0 12px', maxWidth: 620, fontWeight: 700 }}>
                <Typewriter texts={['Focused learning with personal attention.', 'Safe classrooms, clear routines, and caring teachers.', 'Confident learners with strong values.']} />
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, maxWidth: 660, marginBottom: 30 }}>
                {[
                  ['verified', 'Structured learning from Nursery to Class VIII'],
                  ['groups', 'Caring teachers and personal attention'],
                  ['emoji_events', 'Strong values and confident growth'],
                  ['apartment', 'Clean campus, activities, and modern facilities'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,255,255,0.76)', border: '1px solid #dbe7f5', borderRadius: 18, padding: '14px 16px', backdropFilter: 'blur(10px)', boxShadow: '0 12px 28px rgba(148,163,184,0.08)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eef6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={icon} size={18} style={{ color: '#1960a3' }} />
                    </div>
                    <span style={{ fontSize: 13, lineHeight: 1.6, color: '#334155', fontWeight: 600 }}>{text}</span>
                  </div>
                ))}
              </div>

              <div className="lp-hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button className="hero-cta hero-cta-primary" onClick={() => setRegOpen(true)}>
                  <Icon name="how_to_reg" size={18} /> Apply for Admission
                </button>
                <button className="hero-cta hero-cta-secondary" onClick={() => scrollTo('about')}>
                  <Icon name="explore" size={18} /> Explore School
                </button>
              </div>

              <div className="lp-hero-badges" style={{ display: 'flex', gap: 24, marginTop: 34, flexWrap: 'wrap' }}>
                {[
                  ['location_on', 'Ishapur, Laxminagar, Mathura'],
                  ['calendar_today', 'Established 2009'],
                  ['school', 'Value-based learning'],
                ].map(([icon, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Icon name={icon} size={16} style={{ color: '#1960a3' }} />
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', animation: 'slideInR 0.8s 0.12s cubic-bezier(0.16,1,0.3,1) both' }}>
              <div style={{ width: '100%', maxWidth: 430, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #dbe7f5', borderRadius: 28, padding: 30, backdropFilter: 'blur(18px)', boxShadow: '0 28px 70px rgba(15,23,42,0.12)' }}>
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 22, color: '#0f172a' }}>Admissions & Enquiry</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>Share your details and our team will contact you shortly.</div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    {[
                      ['call', '9997360040 / 8650616990'],
                      ['menu_book', 'Nursery to VIII'],
                    ].map(([icon, value]) => (
                      <div key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f8fbff', border: '1px solid #dbe7f5', borderRadius: 999, padding: '10px 14px' }}>
                        <Icon name={icon} size={16} style={{ color: '#1960a3' }} />
                        <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, lineHeight: 1.4 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[{ ph: 'Student Name *', ic: 'person', key: 'name' }, { ph: 'Phone Number *', ic: 'phone', key: 'phone' }, { ph: 'Email (optional)', ic: 'mail', key: 'email' }].map(({ ph, ic, key }) => (
                      <div key={key} style={{ position: 'relative' }}>
                        <Icon name={ic} size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          placeholder={ph}
                          value={regForm[key]}
                          onChange={e => setRegForm(f => ({ ...f, [key]: e.target.value }))}
                          style={{ width: '100%', padding: '13px 14px 13px 40px', background: '#fff', border: '1px solid #d7e2f0', borderRadius: 14, color: '#0f172a', fontSize: 14, transition: 'border 0.2s' }}
                        />
                      </div>
                    ))}
                    {regError && <div style={{ fontSize: 12, color: '#dc2626' }}>{regError}</div>}
                    <button onClick={handleReg} disabled={regLoading} style={{ marginTop: 2, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1e293b', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 12px 28px rgba(251,191,36,0.34)', opacity: regLoading ? 0.7 : 1 }}>
                      {regLoading ? 'Submitting...' : 'Request a Call Back'}
                    </button>
                    {regDone && <div style={{ textAlign: 'center', color: '#059669', fontSize: 13, fontWeight: 700 }}>Enquiry submitted. Our team will contact you soon.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%' }}>
            <path d="M0,45 C240,90 480,0 720,45 C960,90 1200,0 1440,45 L1440,90 L0,90 Z" fill="#f8fafc" opacity="0.52" />
            <path d="M0,55 C360,90 1080,10 1440,55 L1440,90 L0,90 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} style={{ background: 'linear-gradient(135deg,#002045,#0a3060,#1960a3)', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Animated bg dots */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', width: 200 + i * 60, height: 200 + i * 60, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: `ringOut ${8 + i * 2}s ${i * 1.2}s ease-out infinite`, pointerEvents: 'none' }} />
        ))}
        <div className="lp-stats-grid" style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 40, position: 'relative', zIndex: 1 }}>
          {[
            { value: 100, suffix: '%', label: 'Annual Result' },
            { value: 300, suffix: '+', label: 'Students' },
            { value: 1000, suffix: '+', label: 'Alumni' },
            { value: 15, suffix: '+', label: 'Years of Excellence' },
          ].map(({ value, suffix, label }) => (
            <div key={label} style={{ textAlign: 'center', position: 'relative' }}>
              <div className={statsInView ? 'stat-glow' : ''} style={{ fontSize: 52, fontWeight: 900, color: '#fff', fontFamily: 'Manrope,sans-serif', lineHeight: 1, letterSpacing: '-0.03em' }}>
                <StatCounter value={value} suffix={suffix} label={label} inView={statsInView} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="lp-about-grid" style={{ padding: '100px 24px', background: '#f8fafc' }}>
        <div className="lp-about-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div data-reveal="right">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eef4ff', borderRadius: 50, padding: '6px 16px', marginBottom: 20 }}>
              <Icon name="info" size={14} style={{ color: '#1960a3' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1960a3', letterSpacing: '0.1em', textTransform: 'uppercase' }}>About Us</span>
            </div>
            <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 20 }}>
              A trusted school for<br />
              <span style={{ color: '#1960a3' }}>steady learning and strong values</span>
            </h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 32 }}>
              Since 2009, Lord Krishna Public School has offered a balanced English-medium education with clear academics, caring teachers, and a safe environment for children across Mathura.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[['location_on', 'Ishapur, Laxminagar, Mathura'], ['language', 'English Medium'], ['calendar_today', 'Est. 2009']].map(([ic, lb]) => (
                <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 50, padding: '8px 16px' }}>
                  <Icon name={ic} size={15} style={{ color: '#1960a3' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{lb}</span>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal="left" className="d2 lp-values-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {VALUES.map(({ icon, color, bg, label, desc }) => (
              <div key={label} className="card-hover grad-border" style={{ borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon name={icon} size={22} style={{ color }} />
                </div>
                <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACADEMICS ── */}
      <section id="academics" className="lp-academics" style={{ padding: '100px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div data-reveal="up" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eef4ff', borderRadius: 50, padding: '6px 16px', marginBottom: 16 }}>
              <Icon name="menu_book" size={14} style={{ color: '#1960a3' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1960a3', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Academics</span>
            </div>
            <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 14 }}>
              A Complete Learning Journey
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 520, margin: '0 auto' }}>
              From playful early years to structured middle school — every stage is designed for growth.
            </p>
          </div>

          <div className="lp-academics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {ACADEMICS.map(({ icon, label, desc }, i) => (
              <div key={label} data-reveal="up" className={`d${i + 1} card-hover`} style={{
                background: 'linear-gradient(160deg,#f8faff,#fff)', borderRadius: 24,
                padding: '32px 24px', border: '1px solid #e8edf5',
                boxShadow: '0 4px 20px rgba(0,32,69,0.05)', textAlign: 'center',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
                  background: 'linear-gradient(135deg,#002045,#1960a3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(25,96,163,0.3)',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                }}>
                  <Icon name={icon} size={28} style={{ color: '#fff' }} />
                </div>
                <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOTICES ── */}
      {/* ── FACILITIES ── */}
      <section id="facilities" className="lp-facilities" style={{ padding: '100px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div data-reveal="up" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eef4ff', borderRadius: 50, padding: '6px 16px', marginBottom: 16 }}>
              <Icon name="apartment" size={14} style={{ color: '#1960a3' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1960a3', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Our Facilities</span>
            </div>
            <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 14 }}>
              Built for Better Learning
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>
              Modern infrastructure designed to give every student the best environment to grow, explore, and excel.
            </p>
          </div>

          <div className="lp-facilities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 28 }}>

            {/* Computer Lab */}
            <div data-reveal="right" className="d1 card-hover" style={{
              borderRadius: 24, overflow: 'hidden', border: '1px solid #e8edf5',
              boxShadow: '0 4px 24px rgba(0,32,69,0.06)', background: '#fff',
              display: 'flex', alignItems: 'stretch',
            }}>
              <div style={{ width: 8, background: 'linear-gradient(180deg,#1960a3,#0ea5e9)', flexShrink: 0, borderRadius: '0 0 0 0' }} />
              <div style={{ padding: '32px 28px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#dbeafe,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="computer" size={28} style={{ color: '#1960a3' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Computer Lab</div>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                      Fully equipped computer laboratory with modern systems, high-speed internet, and age-appropriate software to build digital literacy from an early age.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Modern PCs', 'Internet Access', 'Typing & Coding'].map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Projector Room */}
            <div data-reveal="left" className="d2 card-hover" style={{
              borderRadius: 24, overflow: 'hidden', border: '1px solid #e8edf5',
              boxShadow: '0 4px 24px rgba(0,32,69,0.06)', background: '#fff',
              display: 'flex', alignItems: 'stretch',
            }}>
              <div style={{ width: 8, background: 'linear-gradient(180deg,#8b5cf6,#a78bfa)', flexShrink: 0 }} />
              <div style={{ padding: '32px 28px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="videocam" size={28} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Projector Room</div>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                      Dedicated smart classroom with HD projector and audio system for interactive lessons, educational videos, and engaging visual learning experiences.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['HD Projector', 'Smart Board', 'Audio System'].map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transport */}
            <div data-reveal="right" className="d3 card-hover" style={{
              borderRadius: 24, overflow: 'hidden', border: '1px solid #e8edf5',
              boxShadow: '0 4px 24px rgba(0,32,69,0.06)', background: '#fff',
              display: 'flex', alignItems: 'stretch',
            }}>
              <div style={{ width: 8, background: 'linear-gradient(180deg,#f59e0b,#fbbf24)', flexShrink: 0 }} />
              <div style={{ padding: '32px 28px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#fef3c7,#fffbeb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="directions_bus" size={28} style={{ color: '#d97706' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Transport Facility</div>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                      Safe and reliable school bus service covering Ishapur, Laxminagar, and surrounding areas of Mathura — ensuring every child travels comfortably and on time.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['School Bus', 'Safe Routes', 'Timely Pickup'].map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sports */}
            <div data-reveal="left" className="d4 card-hover" style={{
              borderRadius: 24, overflow: 'hidden', border: '1px solid #e8edf5',
              boxShadow: '0 4px 24px rgba(0,32,69,0.06)', background: '#fff',
              display: 'flex', alignItems: 'stretch',
            }}>
              <div style={{ width: 8, background: 'linear-gradient(180deg,#10b981,#34d399)', flexShrink: 0 }} />
              <div style={{ padding: '32px 28px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#d1fae5,#ecfdf5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="sports_soccer" size={28} style={{ color: '#059669' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Sports Facility</div>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
                      Spacious playground and sports ground for cricket, football, kabaddi, and athletics — fostering teamwork, fitness, and a competitive spirit in every student.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Cricket', 'Football', 'Kabaddi', 'Athletics'].map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="notices" className="lp-notices" style={{ padding: '100px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div data-reveal="up" style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eef4ff', borderRadius: 50, padding: '6px 16px', marginBottom: 16 }}>
              <Icon name="campaign" size={14} style={{ color: '#1960a3' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1960a3', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notice Board</span>
            </div>
            <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Latest Announcements
            </h2>
          </div>

          <div data-reveal="scale" style={{ background: '#fff', borderRadius: 24, border: '1px solid #e8edf5', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            {notices.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                No announcements at the moment. Check back soon.
              </div>
            ) : notices.map((n, i) => {
              const d = new Date(n.createdAt);
              const mon = d.toLocaleString('en-IN', { month: 'short' });
              const day = d.getDate();
              return (
                <div key={n._id || i} className="notice-row lp-notice-row" style={{
                  display: 'flex', alignItems: 'center', gap: 20, padding: '20px 28px',
                  borderBottom: i < notices.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'default',
                }}>
                  <div style={{ minWidth: 52, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#1960a3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{mon}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', fontFamily: 'Manrope,sans-serif' }}>{day}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: '#e2e8f0', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{n.body}</div>}
                    <span className={`tag tag-${(n.tag || 'General').toLowerCase()}`}>{n.tag || 'General'}</span>
                  </div>
                  <Icon name="chevron_right" size={20} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="lp-contact" style={{ padding: '100px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div data-reveal="up" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eef4ff', borderRadius: 50, padding: '6px 16px', marginBottom: 16 }}>
              <Icon name="contact_phone" size={14} style={{ color: '#1960a3' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1960a3', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Contact Us</span>
            </div>
            <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 14 }}>
              Get in Touch
            </h2>
            <p style={{ fontSize: 15, color: '#64748b' }}>We'd love to hear from you. Reach out anytime.</p>
          </div>

          <div className="lp-contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div data-reveal="right" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: 'location_on', color: '#1960a3', bg: '#eef4ff', label: 'Address', val: 'Ishapur, Laxminagar, Yamuna Par, Mathura, Uttar Pradesh' },
                { icon: 'phone', color: '#059669', bg: '#d1fae5', label: 'Phone', val: '9997360040 / 8650616990' },
                { icon: 'mail', color: '#7c3aed', bg: '#ede9fe', label: 'Email', val: 'lordkrishnapublicschoolmtr29@gmail.com' },
                { icon: 'schedule', color: '#d97706', bg: '#fef3c7', label: 'School Hours', val: 'Mon – Sat: 8:00 AM – 2:00 PM' },
              ].map(({ icon, color, bg, label, val }) => (
                <div key={label} className="card-hover" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: '#f8fafc', borderRadius: 16, padding: '20px 24px', border: '1px solid #e8edf5' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={icon} size={20} style={{ color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div data-reveal="left" className="d2" style={{
              background: 'linear-gradient(135deg,#002045,#1960a3)', borderRadius: 24, padding: 40,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
              boxShadow: '0 20px 60px rgba(0,32,69,0.25)', position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative rings inside CTA card */}
              <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', top: -100, right: -100, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', top: -50, right: -50, pointerEvents: 'none' }} />
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
                <Icon name="how_to_reg" size={28} style={{ color: '#fbbf24' }} />
              </div>
              <h3 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.2, position: 'relative', zIndex: 1 }}>
                Ready to Join<br />Our School?
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 28, position: 'relative', zIndex: 1 }}>
                Admissions for 2025–26 are open. Register your enquiry today and our team will get back to you within 24 hours.
              </p>
              <button className="reg-btn" style={{ fontSize: 14, padding: '12px 28px', position: 'relative', zIndex: 1 }} onClick={() => setRegOpen(true)}>
                Register Enquiry
              </button>
              <div style={{ marginTop: 24, display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
                <a href="tel:9997360040" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                  <Icon name="phone" size={15} style={{ color: '#fbbf24' }} /> 9997360040
                </a>
                <a href="tel:8650616990" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                  <Icon name="phone" size={15} style={{ color: '#fbbf24' }} /> 8650616990
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer" style={{ background: '#001529', padding: '60px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="lp-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Lord Krishna Public School"
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: 3 }} />
                <div>
                  <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 15, color: '#fff' }}>LORD KRISHNA PUBLIC SCHOOL</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Est. 2009 · Mathura</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, maxWidth: 300 }}>
                Providing quality English-medium education from Nursery to Class VIII in Ishapur, Laxminagar, Yamuna Par, Mathura.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Quick Links</div>
              {['About', 'Academics', 'Facilities', 'Notices', 'Contact'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} onClick={e => { e.preventDefault(); scrollTo(l.toLowerCase()); }}
                  style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: 10, fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fbbf24'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                >{l}</a>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Contact</div>
              {[['phone', '9997360040'], ['phone', '8650616990'], ['mail', 'lordkrishnapublicschoolmtr29@gmail.com']].map(([ic, val]) => (
                <div key={val} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <Icon name={ic} size={14} style={{ color: '#fbbf24', marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, wordBreak: 'break-all' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2025 Lord Krishna Public School. All rights reserved.</div>
            <a href="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>Staff Login →</a>
          </div>
        </div>
      </footer>

      {/* ── REGISTRATION MODAL ── */}
      {regOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', position: 'relative', animation: 'fadeUp 0.35s ease' }}>
            <button onClick={closeReg} style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={18} style={{ color: '#64748b' }} />
            </button>
            {regDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Icon name="check_circle" size={36} style={{ color: '#059669' }} />
                </div>
                <h3 style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 22, color: '#0f172a', marginBottom: 10 }}>Enquiry Submitted!</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>Thank you for your interest. Our team will contact you within 24 hours.</p>
                <button onClick={closeReg} style={{ padding: '12px 32px', borderRadius: 50, background: 'linear-gradient(135deg,#002045,#1960a3)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#002045,#1960a3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon name="how_to_reg" size={24} style={{ color: '#fff' }} />
                  </div>
                  <h3 style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, fontSize: 22, color: '#0f172a', marginBottom: 6 }}>Admission Enquiry</h3>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Fill in the details below and we'll get back to you.</p>
                </div>
                <form onSubmit={handleReg} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Student Name *', key: 'name', type: 'text', ph: 'Enter student name' },
                    { label: 'Phone Number *', key: 'phone', type: 'tel', ph: '10-digit mobile number' },
                    { label: 'Email Address', key: 'email', type: 'email', ph: 'Optional' },
                  ].map(({ label, key, type, ph }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{label}</label>
                      <input type={type} placeholder={ph} value={regForm[key]} onChange={e => setRegForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b', background: '#f8fafc', transition: 'border 0.2s' }} />
                    </div>
                  ))}
                  {regError && <div style={{ fontSize: 12, color: '#ef4444', padding: '2px 0' }}>{regError}</div>}
                  <button type="submit" disabled={regLoading} style={{ marginTop: 4, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#002045,#1960a3)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: regLoading ? 0.7 : 1 }}>
                    {regLoading ? 'Submitting…' : 'Submit Enquiry'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BROCHURE POPUP ── */}
      {brochureOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20, backdropFilter: 'blur(8px)' }}>
          <div style={{ position: 'relative', maxWidth: 480, width: '100%', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', animation: 'fadeUp 0.4s ease' }}>
            <button onClick={() => setBrochureOpen(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <Icon name="close" size={20} style={{ color: '#fff' }} />
            </button>
            <img src={process.env.PUBLIC_URL + '/brochure.png'} alt="School Brochure" style={{ width: '100%', display: 'block' }} />
            <div style={{ background: '#002045', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Admissions Open 2025–26</span>
              <button className="reg-btn" style={{ fontSize: 12, padding: '8px 18px' }} onClick={() => { setBrochureOpen(false); setRegOpen(true); }}>Apply Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

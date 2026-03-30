import React, { useState } from 'react';
import { uid } from './db';
import { toast } from './ui.jsx';
import { getApiBase } from './apiBase';

const CO_ACTIVITIES = [
  'General Knowledge','Art Education','Health & Physical Education',
  'Scientific Skills','Thinking Skills','Moral Education','Yoga / P.T.','Sports',
];
const DISCIPLINE_ITEMS = [
  'Regularity & Punctuality','Sincerity','Behavior & Values',
  'Respectfulness for Rules & Regulations','Attitude Towards Teachers',
  'Attitude Towards School-Mates','Attitude Towards Society','Attitude Towards Nation',
];
const GRADES_8 = ['A1','A2','B1','B2','C1','C2','D','E'];

const EARLY_SUBS = 'Hindi, English, Mathematics, Rhymes';
const UPPER_SUBS = 'English, Hindi, Mathematics, Science, S.St., Computer';

function defaultSubs(cls) {
  if (!cls) return '';
  const lower = cls.toLowerCase().replace(/\./g,'');
  if (['playgroup','nursery','lkg','ukg'].includes(lower)) return EARLY_SUBS;
  const m = lower.match(/^(\d+)(st|nd|rd|th)?$/);
  if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 8) return UPPER_SUBS;
  return '';
}

function grade8(pct) {
  if (pct >= 91) return 'A1'; if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1'; if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1'; if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D'; return 'E';
}
function gradeColor(g) {
  return {A1:'#166534',A2:'#065f46',B1:'#1e40af',B2:'#1d4ed8',C1:'#92400e',C2:'#b45309',D:'#c2410c',E:'#991b1b'}[g]||'#374151';
}
function gradeBg(g) {
  return {A1:'#dcfce7',A2:'#d1fae5',B1:'#dbeafe',B2:'#eff6ff',C1:'#fef3c7',C2:'#fffbeb',D:'#ffedd5',E:'#fee2e2'}[g]||'#f3f4f6';
}

/** Student records use `admno` in forms; guest flow uses `admNo`. */
function admissionNo(s) {
  const v = s.admNo ?? s.admno;
  return v != null && String(v).trim() !== '' ? String(v).trim() : '—';
}

function escapeDocTitle(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const GradeSelect = ({ value, onChange }) => (
  <select value={value||'A2'} onChange={e=>onChange(e.target.value)}
    style={{fontSize:11,fontWeight:700,padding:'2px 5px',borderRadius:5,border:'1px solid #bfdbfe',
      background:gradeBg(value||'A2'),color:gradeColor(value||'A2'),cursor:'pointer',outline:'none'}}>
    {GRADES_8.map(g=><option key={g} value={g}>{g}</option>)}
  </select>
);

// ── Guest student form (not in directory) ────────────────────────
const BLANK_GUEST = { fn:'', ln:'', father:'', mother:'', dob:'', roll:'', admNo:'', gn:'Male', blood:'', addr:'', cls:'' };

function GuestForm({ guest, setGuest, subjects, setSubjects, marks, setMarks }) {
  const f = (k) => (v) => setGuest(g => ({...g, [k]: v}));
  const inp = 'w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-300 outline-none';
  const lbl = 'block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {[['First Name','fn'],['Last Name','ln'],["Father's Name",'father'],["Mother's Name",'mother'],
          ['Date of Birth','dob'],['Roll No.','roll'],['Admission No.','admNo'],['Blood Group','blood'],
        ].map(([label,key])=>(
          <div key={key}>
            <label className={lbl}>{label}</label>
            <input value={guest[key]||''} onChange={e=>f(key)(e.target.value)} className={inp} placeholder={label}/>
          </div>
        ))}
        <div>
          <label className={lbl}>Gender</label>
          <select value={guest.gn||'Male'} onChange={e=>f('gn')(e.target.value)} className={inp}>
            {['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={lbl}>Address</label>
          <input value={guest.addr||''} onChange={e=>f('addr')(e.target.value)} className={inp} placeholder="Address"/>
        </div>
      </div>

      <div>
        <label className={lbl}>Subjects (comma separated)</label>
        <input value={subjects} onChange={e=>setSubjects(e.target.value)} className={inp}
          placeholder="Hindi, English, Mathematics, Rhymes"/>
        <p className="text-xs text-slate-400 mt-1">These subjects will appear as rows in the marksheet.</p>
      </div>

      <div>
        <p className={lbl + ' mb-3'}>Marks Entry</p>
        <div className="space-y-2">
          {subjects.split(',').map(s=>s.trim()).filter(Boolean).map(su => {
            const m = marks[su] || {};
            return (
              <div key={su} className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-2">{su}</p>
                <div className="grid grid-cols-5 gap-2">
                  {[['T1 Per.Test','t1_pt'],['T1 NoteBook','t1_nb'],['T1 SEA','t1_sea'],['T1 Half Yearly','t1_hy'],
                    ['T2 Per.Test','t2_pt'],['T2 NoteBook','t2_nb'],['T2 SEA','t2_sea'],['T2 Yearly','t2_ye'],
                  ].map(([label,key])=>(
                    <div key={key}>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">{label}</label>
                      <input type="number" min="0" value={m[key]??''} onChange={e=>setMarks(mk=>({...mk,[su]:{...mk[su],[key]:e.target.value===''?null:parseFloat(e.target.value)}}))}
                        className="w-full p-1.5 bg-white border border-blue-200 rounded-lg text-xs text-center text-slate-700 outline-none focus:ring-1 focus:ring-blue-300"/>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



// ── Auto title-case: capitalise first letter of each word ────────
const toTitleCase = (str) =>
  str.replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

const titleCaseInput = (e, setter) => {
  setter(toTitleCase(e.target.value));
};

// ── Address selector ──────────────────────────────────────────────
const ADDRESSES = [
  'Ishapur','Dengra','Abdul Navipur','Pratap Nagar',
  'Shyamapuram','Shanti Ashram','Hansganj','Vishanganj',
];

function AddressSelect({ value, onChange, className }) {
  const [custom, setCustom] = React.useState(false);
  const isPreset = ADDRESSES.some(a => value === a + ', Mathura');
  const selectedPreset = isPreset ? value.replace(', Mathura','') : '';

  return (
    <div className="space-y-2">
      <select
        value={custom ? '__custom__' : (selectedPreset || '')}
        onChange={e => {
          if (e.target.value === '__custom__') {
            setCustom(true);
            onChange('');
          } else if (e.target.value === '') {
            setCustom(false);
            onChange('');
          } else {
            setCustom(false);
            onChange(e.target.value + ', Mathura');
          }
        }}
        className={className}
      >
        <option value="">Select Address</option>
        {ADDRESSES.map(a => <option key={a} value={a}>{a}, Mathura</option>)}
        <option value="__custom__">Custom address...</option>
      </select>
      {(custom || (!isPreset && value)) && (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type custom address"
          className={className}
        />
      )}
    </div>
  );
}


// ── Navigate info fields with arrow keys ─────────────────────────
const INFO_FIELDS = ['fn','ln','father','mother','roll','admNo','dob','addr'];

const infoKeyDown = (e, fieldKey) => {
  if (!['ArrowDown','ArrowUp','Enter'].includes(e.key)) return;
  e.preventDefault();
  const idx = INFO_FIELDS.indexOf(fieldKey);
  const next = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
  if (next < 0 || next >= INFO_FIELDS.length) return;
  const container = e.target.closest('.info-nav-container') || document;
  const el = container.querySelector(`[data-info="${INFO_FIELDS[next]}"]`);
  if (el) { el.focus(); try { el.select(); } catch(_){} }
};

// ── Shared spreadsheet-style marks table ─────────────────────────
const COLS = [
  { key:'t1_pt',  label:'Per.Test',  max:10, term:1 },
  { key:'t1_nb',  label:'NoteBook',  max:5,  term:1 },
  { key:'t1_sea', label:'SEA',       max:5,  term:1 },
  { key:'t1_hy',  label:'Half Yrly', max:80, term:1 },
  { key:'t2_pt',  label:'Per.Test',  max:10, term:2 },
  { key:'t2_nb',  label:'NoteBook',  max:5,  term:2 },
  { key:'t2_sea', label:'SEA',       max:5,  term:2 },
  { key:'t2_ye',  label:'Yearly',    max:80, term:2 },
];

function MarksTable({ subjects, marks, onChange }) {
  // Use a stable container ref to find inputs by data-cell
  const containerRef = React.useRef(null);

  const focusCell = React.useCallback((si, ci) => {
    if (!containerRef.current) return;
    const totalRows = subjects.length;
    const totalCols = COLS.length;
    const r = Math.max(0, Math.min(totalRows - 1, si));
    const c = Math.max(0, Math.min(totalCols - 1, ci));
    const el = containerRef.current.querySelector(`[data-cell="${r}-${c}"]`);
    if (el) { el.focus(); el.select(); }
  }, [subjects.length]);

  return (
    <div ref={containerRef} className="overflow-x-auto rounded-xl border border-blue-200">
      <table className="w-full border-collapse text-xs" style={{minWidth:'600px'}}>
        <thead>
          <tr>
            <th className="bg-blue-600 text-white px-3 py-2 text-left font-semibold sticky left-0 z-10" style={{minWidth:'90px'}}>Subject</th>
            {[1,2].map(term => (
              <React.Fragment key={term}>
                <th colSpan={4} className={`bg-blue-500 text-white px-2 py-2 text-center font-semibold ${term===2?'border-l-2 border-l-blue-300':''}`}>
                  Term {term} (100)
                </th>
              </React.Fragment>
            ))}
          </tr>
          <tr>
            <th className="bg-blue-50 px-3 py-1.5 text-left text-slate-500 sticky left-0 z-10 border-b border-blue-200"></th>
            {COLS.map((col, ci) => (
              <th key={ci} className={`px-2 py-1.5 text-center text-slate-500 font-semibold border-b border-blue-200 ${ci===4?'border-l-2 border-l-blue-300':''}`}>
                <div>{col.label}</div>
                <div className="text-[9px] text-slate-400 font-normal">/{col.max}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((su, si) => {
            const m = marks[su] || {};
            return (
              <tr key={su} className={si%2===0?'bg-white':'bg-blue-50/40'}>
                <td className="px-3 py-1.5 font-semibold text-blue-700 sticky left-0 z-10 border-r border-blue-100" style={{background:si%2===0?'#fff':'#f0f7ff'}}>
                  {su}
                </td>
                {COLS.map((col, ci) => {
                  const val = m[col.key];
                  const over = val !== null && val !== undefined && val > col.max;
                  return (
                    <td key={ci} className={`p-1 ${ci===4?'border-l-2 border-l-blue-200':''}`}>
                      <input
                        data-cell={`${si}-${ci}`}
                        type="text"
                        inputMode="numeric"
                        value={val ?? ''}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          const raw = v === '' ? null : parseInt(v, 10);
                          onChange(su, col.key, raw);
                        }}
                        onBlur={e => {
                          const r = parseInt(e.target.value, 10);
                          if (!isNaN(r) && r > col.max) onChange(su, col.key, col.max);
                        }}
                        onKeyDown={e => {
                          const key = e.key;
                          if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Enter'].includes(key)) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (key === 'ArrowRight' || (key === 'Tab' && !e.shiftKey)) {
                            const nc = ci + 1 >= COLS.length ? 0 : ci + 1;
                            const ns = ci + 1 >= COLS.length ? si + 1 : si;
                            focusCell(ns, nc);
                          } else if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) {
                            const nc = ci - 1 < 0 ? COLS.length - 1 : ci - 1;
                            const ns = ci - 1 < 0 ? si - 1 : si;
                            focusCell(ns, nc);
                          } else if (key === 'ArrowDown' || key === 'Enter') {
                            focusCell(si + 1, ci);
                          } else if (key === 'ArrowUp') {
                            focusCell(si - 1, ci);
                          }
                        }}
                        onFocus={e => e.target.select()}
                        className={`w-full text-center rounded-md py-1.5 px-1 outline-none focus:ring-2 text-sm font-medium transition-all
                          ${over
                            ? 'bg-red-50 border border-red-300 focus:ring-red-200 text-red-600'
                            : 'bg-white border border-blue-100 focus:ring-blue-300 focus:border-blue-400 text-slate-700'
                          }`}
                        style={{minWidth:'42px'}}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


export default function ReportCardStudio({ db, save, logo }) {
  const classes = db.classes.map(c => c.name);
  const [mode, setMode] = useState('directory'); // 'directory' | 'guest'
  const [rcCls, setRcCls] = useState('');
  const [selStu, setSelStu] = useState('all');
  const [overrides, setOverrides] = useState({});
  const [activeTab, setActiveTab] = useState('marks');
  const [previewHtml, setPreviewHtml] = useState('');

  // Guest mode state
  const [guest, setGuest] = useState(BLANK_GUEST);
  const [guestSubjects, setGuestSubjects] = useState('');
  const [guestMarks, setGuestMarks] = useState({});
  const [guestCoGrades, setGuestCoGrades] = useState({});
  const [guestDiscGrades, setGuestDiscGrades] = useState({});
  const [guestAttP, setGuestAttP] = useState('');
  const [guestAttT, setGuestAttT] = useState('');
  const [guestRank, setGuestRank] = useState('');
  const [guestTab, setGuestTab] = useState('info');

  const clsStudents = rcCls ? db.students.filter(s => s.cls === rcCls) : [];
  const editStu = selStu !== 'all' ? db.students.find(s => s.id === selStu) : null;

  const getOvr = (sid) => overrides[sid] || {};
  const setOvr = (sid, patch) => setOverrides(o => ({ ...o, [sid]: { ...(o[sid]||{}), ...patch } }));
  const setCoGrade = (sid, act, g) => setOvr(sid, { coGrades: { ...(getOvr(sid).coGrades||{}), [act]: g } });
  const setDiscGrade = (sid, item, g) => setOvr(sid, { discGrades: { ...(getOvr(sid).discGrades||{}), [item]: g } });

  const getAtt = (sid) => {
    let p = 0, t = 0;
    Object.values(db.att).forEach(d => { if (d[sid]!==undefined){t++;if(d[sid]==='P'||d[sid]==='L')p++;} });
    return { p, t };
  };

  const clsExams = db.exams.filter(e => !e.cls || e.cls === rcCls);
  const t1Exams  = clsExams.filter(e => e.term === 'Term1');
  const t2Exams  = clsExams.filter(e => e.term === 'Term2');
  const subjects = rcCls
    ? ((db.classes.find(c=>c.name===rcCls)?.subs || defaultSubs(rcCls) || '').split(',').map(s=>s.trim()).filter(Boolean))
    : [];

  const getMark = (examId, sid) => { const v=(db.marks[examId+'_'+rcCls]||{})[sid]; return v!==undefined?v:null; };
  const getSubjectExams = (su, termExams) => termExams.filter(e => e.su === su);

  // Generate varied grades per row based on avg performance
  // Each row gets a grade within ±1 step of the base grade, weighted toward base
  const variedGrades = (items, avgPct) => {
    const order = ['A1','A2','B1','B2','C1','C2','D','E'];
    const baseGrade = grade8(avgPct);
    const baseIdx = order.indexOf(baseGrade);
    const result = {};
    items.forEach(item => {
      // Seed variation: use item string hash for determinism per student
      const hash = item.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
      const rand = ((hash * 2654435761) >>> 0) % 100; // pseudo-random 0-99
      let offset = 0;
      if (avgPct >= 75) {
        // Good student: 60% same, 30% one better, 10% one worse
        if (rand < 30) offset = -1;
        else if (rand < 90) offset = 0;
        else offset = 1;
      } else if (avgPct >= 50) {
        // Average: 50% same, 25% better, 25% worse
        if (rand < 25) offset = -1;
        else if (rand < 75) offset = 0;
        else offset = 1;
      } else {
        // Weak: 60% same, 10% better, 30% worse
        if (rand < 10) offset = -1;
        else if (rand < 70) offset = 0;
        else offset = 1;
      }
      const idx = Math.max(0, Math.min(order.length - 1, baseIdx + offset));
      result[item] = order[idx];
    });
    return result;
  };

  const autoGrades = (sid) => {
    let total=0,count=0;
    subjects.forEach(su=>{
      const t1=getSubjectExams(su,t1Exams),t2=getSubjectExams(su,t2Exams);
      const t1T=t1.length===1?getMark(t1[0].id,sid):null,t2T=t2.length===1?getMark(t2[0].id,sid):null;
      const t1M=t1.reduce((a,e)=>a+(e.max||0),0)||100,t2M=t2.reduce((a,e)=>a+(e.max||0),0)||100;
      const t1H=t1T!==null?Math.round(t1T/t1M*50):null,t2H=t2T!==null?Math.round(t2T/t2M*50):null;
      if(t1H!==null&&t2H!==null){total+=t1H+t2H;count++;}
    });
    const avg=count>0?Math.round(total/count):50;
    return { coGrades: variedGrades(CO_ACTIVITIES, avg), discGrades: variedGrades(DISCIPLINE_ITEMS, avg) };
  };

  const applyAutoGrades = (sid) => { setOvr(sid, autoGrades(sid)); toast('Grades auto-filled'); };
  const applyAutoGradesAll = () => { clsStudents.forEach(s=>setOverrides(o=>({...o,[s.id]:{...(o[s.id]||{}),...autoGrades(s.id)}}))); toast('Auto-filled all students'); };

  // Auto-fill guest co/disc from guest marks
  const autoGuestGrades = () => {
    const subs = guestSubjects.split(',').map(s=>s.trim()).filter(Boolean);
    let total=0,count=0;
    subs.forEach(su=>{
      const m=guestMarks[su]||{};
      const t1T=(m.t1_pt||0)+(m.t1_nb||0)+(m.t1_sea||0)+(m.t1_hy||0);
      const t2T=(m.t2_pt||0)+(m.t2_nb||0)+(m.t2_sea||0)+(m.t2_ye||0);
      if(t1T||t2T){total+=Math.round(t1T/100*50)+Math.round(t2T/100*50);count++;}
    });
    const avg=count>0?Math.round(total/count):50;
    const g=grade8(avg);
    setGuestCoGrades(variedGrades(CO_ACTIVITIES, avg));
    setGuestDiscGrades(variedGrades(DISCIPLINE_ITEMS, avg));
    toast('Guest grades auto-filled');
  };

  // ── HTML generator (shared for both directory and guest) ─────────
  const nextClass = (cls) => {
    const order = ['Playgroup','Nursery','L.K.G.','U.K.G.','1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
    const idx = order.findIndex(c => c.toLowerCase() === cls.toLowerCase());
    if (idx !== -1 && idx < order.length - 1) return order[idx + 1];
    // fallback: try numeric suffix
    const m = cls.match(/^(\d+)(st|nd|rd|th)?$/i);
    if (m) {
      const n = parseInt(m[1]) + 1;
      const sfx = n===1?'st':n===2?'nd':n===3?'rd':'th';
      return n + sfx;
    }
    return cls;
  };
  const buildRC = async (students, opts = {}, previewOnly = false, silent = false) => {
    const school = db.settings.school || 'LORD KRISHNA PUBLIC SCHOOL';
    const yr     = db.settings.reportAcademicYear || db.settings.year || '2025-2026';
    const addr   = db.settings.addr   || '';
    const prin   = db.settings.prin   || '';
    const phone  = db.settings.phone  || '';
    const cls    = opts.cls || rcCls;

    const sampleSubs = students[0]?.subjects?.length || 4;
    const scale = sampleSubs <= 4 ? 1 : sampleSubs <= 6 ? 0.93 : 0.86;
    const fs = (b) => Math.round(b * scale * 10) / 10;
    const pd = (b) => Math.round(b * scale * 10) / 10;

    const css = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{width:210mm;background:#E8F4FD;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:'DM Sans',Arial,sans-serif;color:#1A2B3C;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
      .page{width:210mm;min-height:297mm;margin:0 auto 16px;background:#FFFFFF;position:relative;overflow:hidden;page-break-after:always;page-break-inside:avoid;box-shadow:0 4px 24px rgba(100,160,210,0.25);border:1.5px solid #B8D8EE}
      .wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;opacity:0.04;pointer-events:none;z-index:0;object-fit:contain}
      .hdr{background:linear-gradient(160deg,#EBF5FB 0%,#D6EAF8 50%,#EBF5FB 100%);text-align:center;padding:${pd(16)}px 24px ${pd(12)}px;border-bottom:2px solid #AED6F1;position:relative}
      .hdr::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#5DADE2,#85C1E9,#5DADE2)}
      .hdr-eyebrow{font-size:${fs(13)}px;font-weight:400;color:#7FB3D3;letter-spacing:3px;text-transform:uppercase;margin-bottom:${pd(6)}px}
      .hdr-title{font-family:'DM Serif Display',serif;font-size:${fs(32)}px;font-weight:400;color:#1A5276;letter-spacing:2px;text-transform:uppercase;line-height:1}
      .hdr-rule{width:48px;height:2px;background:linear-gradient(90deg,transparent,#5DADE2,transparent);margin:${pd(8)}px auto;border-radius:2px}
      .hdr-cls{font-family:'DM Serif Display',serif;font-size:${fs(22)}px;color:#1A5276;font-style:italic;margin-bottom:${pd(3)}px}
      .hdr-sess{font-size:${fs(19)}px;font-weight:400;color:#5D8AA8;letter-spacing:0.5px}
      .info-wrap{background:#F4FAFF;border-bottom:1px solid #D6EAF8;padding:${pd(10)}px ${pd(22)}px ${pd(8)}px}
      .info{display:grid;grid-template-columns:3fr 2fr;gap:0}
      .ir{display:flex;align-items:baseline;padding:${pd(5)}px 0;border-bottom:1px dashed #D6EAF8;line-height:1.5}
      .ir:last-child{border-bottom:none}
      .il{font-size:${fs(16)}px;font-weight:400;color:#1A5276;min-width:140px;flex-shrink:0}
      .iv{font-size:${fs(16)}px;color:#1A2B3C;font-weight:400}
      .tw{padding:${pd(7)}px ${pd(4)}px 0}
      .mt{width:100%;border-collapse:collapse}
      .mt th,.mt td{border:1px solid #AED6F1;text-align:center;padding:${pd(4.5)}px ${pd(2.5)}px;line-height:1.2}
      .th-area{background:#D6EAF8;color:#1A5276;font-weight:400;font-size:${fs(14)}px;text-align:center;vertical-align:middle;width:80px}
      .th-term{background:#D6EAF8;color:#1A5276;font-weight:400;font-size:${fs(17)}px;font-family:'DM Serif Display',serif;font-style:italic}
      .th-overall{background:#D6EAF8;color:#1A5276;font-weight:400;font-size:${fs(14)}px}
      .th-sub{background:#EBF5FB;color:#2471A3;font-weight:400;font-size:${fs(13)}px}
      .th-max{background:#FDEDEC;color:#C0392B;font-weight:400;font-size:${fs(13)}px;border-top:1px solid #F5B7B1}
      .td-subj{text-align:center;font-weight:400;color:#1A5276;background:#EBF5FB;font-size:${fs(16)}px}
      .td-tot{background:#D6EAF8;font-weight:400;color:#1A5276}
      .td-grand{background:#EAFAF1;font-weight:400;color:#1A5276;font-size:${fs(14)}px;font-family:'DM Sans',sans-serif}
      .td-grade{font-weight:400;font-size:${fs(12)}px;color:#1A5276}
      .td-rank{font-weight:400;color:#7F8C8D}
      tbody tr:nth-child(even) td:not(.td-subj):not(.td-tot):not(.td-grand){background:#F4FAFF}
      .gn{font-size:${fs(11)}px;padding:${pd(5)}px ${pd(10)}px;border-left:3px solid #5DADE2;margin:${pd(5)}px ${pd(4)}px;color:#5D6D7E;line-height:1.3;background:#F4FAFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tb{display:flex;align-items:center;justify-content:space-between;padding:${pd(7)}px ${pd(18)}px;background:#EBF5FB;border-top:1px solid #AED6F1;border-bottom:1px solid #AED6F1}
      .tot-item{display:flex;align-items:center;gap:10px;font-size:${fs(13)}px;font-weight:400;color:#1A5276}
      .tot-val{border:1.5px solid #5DADE2;padding:${pd(3)}px ${pd(14)}px;border-radius:6px;font-family:'DM Sans',sans-serif;font-size:${fs(14)}px;color:#1A5276;background:#fff}
      .cw{display:grid;grid-template-columns:1fr 1fr;gap:0 8px;padding:${pd(4)}px ${pd(4)}px}
      .co-tbl{width:100%;border-collapse:collapse}
      .co-tbl th,.co-tbl td{border:1px solid #AED6F1;padding:${pd(4)}px ${pd(7)}px;line-height:1.4}
      .co-hdr-main{background:#D6EAF8;color:#1A5276;font-weight:400;font-size:${fs(16)}px;text-align:center;font-family:'DM Sans',sans-serif;font-style:normal}
      .co-hdr-sub{background:#EBF5FB;color:#1A5276;font-weight:400;font-size:${fs(14)}px;text-align:center}
      .co-act{text-align:left;color:#2C3E50;font-size:${fs(15)}px}
      .co-g{text-align:center;font-weight:400;color:#1A5276;font-size:${fs(15)}px}
      .ft{padding:${pd(7)}px ${pd(18)}px ${pd(12)}px}
      .ft-row1{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:${pd(4)}px}
      .ft-att{font-size:${fs(16)}px;font-weight:400;color:#1A5276}
      .ft-rem{font-size:${fs(16)}px;font-weight:400;color:#1A5276}
      .ft-promo{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(90deg,#EBF5FB,#F4FAFF);border:1px solid #AED6F1;border-left:4px solid #5DADE2;border-radius:5px;padding:${pd(5)}px ${pd(13)}px;font-size:${fs(16)}px;font-weight:400;color:#1A5276;font-family:'DM Sans',sans-serif;font-style:normal}
      .sr{display:flex;justify-content:space-around;padding-top:${pd(36)}px;margin-top:${pd(6)}px}
      .si{text-align:center;min-width:110px}
      .sl{border-top:1.5px solid #5DADE2;padding-top:4px;font-size:${fs(15)}px;color:#1A5276;font-weight:400}
      @media print{@page{size:A4 portrait;margin:0}html,body{background:#E8F4FD;width:210mm}.page{box-shadow:none;margin:0;page-break-after:always;page-break-inside:avoid}}
    `;

    const fmt = v => v!==null&&v!==undefined?v:'—';
    const logoTag = logo ? `<img src="${logo}" class="wm" alt=""/>` : '';

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report Cards — ${cls}</title><style>${css}</style></head><body>`;

    students.forEach(entry => {
      const s    = entry.s;
      const subs = entry.subjects;
      const attP = entry.attP;
      const attT = entry.attT;
      const coG  = entry.coGrades  || {};
      const dG   = entry.discGrades || {};
      const rank = entry.rank;

      const subjectRows = subs.map(su => {
        const m = entry.marks[su] || {};
        const t1_pt=m.t1_pt??null,t1_nb=m.t1_nb??null,t1_sea=m.t1_sea??null,t1_hy=m.t1_hy??null;
        const t2_pt=m.t2_pt??null,t2_nb=m.t2_nb??null,t2_sea=m.t2_sea??null,t2_ye=m.t2_ye??null;
        const t1Total=(t1_pt!==null||t1_nb!==null||t1_sea!==null||t1_hy!==null)?(t1_pt||0)+(t1_nb||0)+(t1_sea||0)+(t1_hy||0):null;
        const t2Total=(t2_pt!==null||t2_nb!==null||t2_sea!==null||t2_ye!==null)?(t2_pt||0)+(t2_nb||0)+(t2_sea||0)+(t2_ye||0):null;
        const grand=(t1Total!==null&&t2Total!==null)?Math.round((t1Total+t2Total)/2):null;
        return {su,t1_pt,t1_nb,t1_sea,t1_hy,t1Total,t2_pt,t2_nb,t2_sea,t2_ye,t2Total,grand};
      });

      const validRows    = subjectRows.filter(r=>r.grand!==null);
      const overallTotal = validRows.reduce((a,r)=>a+(r.grand||0),0);
      const overallMax   = subs.length * 100;
      const overallPct   = overallMax>0?Math.round(overallTotal/overallMax*100):0;
      const remarkText   = overallPct>=91?'Excellent!':overallPct>=75?'Good!':overallPct>=50?'Satisfactory':'Needs Improvement';
      const promotedCls  = nextClass(cls);

      const subRows = subjectRows.map(r => `<tr>
        <td class="td-subj">${r.su}</td>
        <td>${fmt(r.t1_pt)}</td><td>${fmt(r.t1_nb)}</td><td>${fmt(r.t1_sea)}</td><td>${fmt(r.t1_hy)}</td>
        <td class="td-tot">${fmt(r.t1Total)}</td>
        <td>${fmt(r.t2_pt)}</td><td>${fmt(r.t2_nb)}</td><td>${fmt(r.t2_sea)}</td><td>${fmt(r.t2_ye)}</td>
        <td class="td-tot">${fmt(r.t2Total)}</td>
        <td class="td-grand">${fmt(r.grand)}</td>
        <td class="td-grade">${r.grand!==null?grade8(r.grand):'—'}</td>
      </tr>`).join('');

      const coRows   = CO_ACTIVITIES.map(a=>{const g=coG[a]||'A2';return`<tr><td class="co-act">${a}</td><td class="co-g">${g}</td><td class="co-g">${g}</td></tr>`;}).join('');
      const discRows = DISCIPLINE_ITEMS.map(d=>{const g=dG[d]||'A2';return`<tr><td class="co-act">${d}</td><td class="co-g">${g}</td><td class="co-g">${g}</td></tr>`;}).join('');

      html+=`
      <div class="page">
        ${logoTag}

        <div class="hdr">
          <div class="hdr-eyebrow">Academic Report</div>
          <div class="hdr-title">Report Card</div>
          <div class="hdr-rule"></div>
          <div class="hdr-cls">Class : ${cls}</div>
          <div class="hdr-sess">Academic Session &nbsp;·&nbsp; ${yr}</div>
        </div>

        <div class="info-wrap">
          <div class="info">
            <div>
              <div class="ir"><span class="il">Student's Name</span><span class="iv">${s.fn} ${s.ln}</span></div>
              <div class="ir"><span class="il">Father's Name</span><span class="iv">${s.father||'—'}</span></div>
              <div class="ir"><span class="il">Mother's Name</span><span class="iv">${s.mother||'—'}</span></div>
              <div class="ir"><span class="il">Date of Birth</span><span class="iv">${s.dob||'—'}</span></div>
              <div class="ir"><span class="il">Address</span><span class="iv">${s.addr||addr||'—'}</span></div>
            </div>
            <div>
              <div class="ir"><span class="il">Roll No.</span><span class="iv">${s.roll||'—'}</span></div>
              <div class="ir" style="margin-top:6px"><span class="il">Admission No.</span><span class="iv">${admissionNo(s)}</span></div>
            </div>
          </div>
        </div>

        <div class="tw">
          <table class="mt">
            <thead>
              <tr>
                <th rowspan="2" class="th-area">Scholastic<br/>Area</th>
                <th colspan="5" class="th-term">Term 1 (100 Marks)</th>
                <th colspan="5" class="th-term">Term 2 (100 Marks)</th>
                <th colspan="2" class="th-overall">Overall</th>
              </tr>
              <tr class="th-sub">
                <th>Per.<br/>Test</th><th>Note<br/>Book</th><th>SEA</th><th>Half<br/>Yearly</th><th>Total</th>
                <th>Per.<br/>Test</th><th>Note<br/>Book</th><th>SEA</th><th>Yearly<br/>Exam</th><th>Total</th>
                <th>Grand<br/>Total</th><th>Grade</th>
              </tr>
              <tr class="th-max">
                <td class="td-subj">Subjects</td>
                <td>10</td><td>5</td><td>5</td><td>80</td><td>100</td>
                <td>10</td><td>5</td><td>5</td><td>80</td><td>100</td>
                <td>100</td><td></td>
              </tr>
            </thead>
            <tbody>${subRows||`<tr><td colspan="14" style="text-align:center;padding:14px;color:#9CA3AF;font-style:italic">No marks entered</td></tr>`}</tbody>
          </table>
        </div>

        <div class="gn">
          <strong>8-Point Scale:</strong> A1(91-100%) · A2(81-90%) · B1(71-80%) · B2(61-70%) · C1(51-60%) · C2(41-50%) · D(33-40%) · E(≤32%) &nbsp; <strong>*SEA</strong>=Sub Enrichment Activity
        </div>

        <div class="tb">
          <div class="tot-item">Overall Marks &nbsp;<span class="tot-val">${overallTotal} / ${overallMax}</span></div>
          <div class="tot-item">Percentage &nbsp;<span class="tot-val">${overallPct}%</span></div>
          <div class="tot-item">Result &nbsp;<span class="tot-val" style="color:#1E8449">Pass</span></div>
          <div class="tot-item">Rank &nbsp;<span class="tot-val">${rank > 0 ? rank : '—'}</span></div>
        </div>

        <div class="cw">
          <table class="co-tbl">
            <thead>
              <tr><th colspan="3" class="co-hdr-main">Co-Scholastic Areas</th></tr>
              <tr>
                <th class="co-hdr-sub" style="text-align:left;padding-left:8px">Activity</th>
                <th class="co-hdr-sub">T1</th>
                <th class="co-hdr-sub">T2</th>
              </tr>
            </thead>
            <tbody>${coRows}</tbody>
          </table>
          <table class="co-tbl">
            <thead>
              <tr><th colspan="3" class="co-hdr-main">Discipline</th></tr>
              <tr>
                <th class="co-hdr-sub" style="text-align:left;padding-left:8px">Element</th>
                <th class="co-hdr-sub">T1</th>
                <th class="co-hdr-sub">T2</th>
              </tr>
            </thead>
            <tbody>${discRows}</tbody>
          </table>
        </div>

        <div class="ft">
          <div class="ft-row1">
            <span class="ft-att">Attendance : ${attP} / ${attT}</span>
            <span class="ft-rem">Remarks : ${remarkText}</span>
          </div>
          <div class="ft-promo">Congratulations! Promoted to Class ${promotedCls}.</div>
          <div class="sr">
            <div class="si"><div class="sl" style="border-top:none">Date : 31/03/2026</div></div>
            <div class="si"><div class="sl">Class Teacher</div></div>
            <div class="si"><div class="sl">Principal${prin?' ('+prin+')':''}</div></div>
          </div>
        </div>
      </div>`;
    });

    if (previewOnly) return html + '</body></html>';

    const output = opts.output || 'print';
    const wantPrint = !silent && (output === 'print' || output === 'both');
    const wantDownload = !silent && (output === 'download' || output === 'both');
    const skipServerSave = opts.skipServerSave === true || output === 'download';

    const openViewer = !silent && (wantPrint || wantDownload);
    const pw = openViewer ? window.open('', '_blank') : null;
    if (pw) {
      pw.document.write('<html><head><title>Loading...</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666">Generating report card...</body></html>');
    }

    const allPages = [];
    const BASE = getApiBase();
    const token = sessionStorage.getItem('lkps_token');
    const pageCSS = css;

    let serverOk = 0;
    let serverFail = 0;

    for (const entry of students) {
      const s = entry.s;
      const roll = (s.roll || s.admNo || s.admno || '').toString().trim();
      const name = `${s.fn || ''}${s.ln ? ' '+s.ln : ''}`.trim() || 'Student';
      const filename = roll ? `${roll},${name}` : name;
      const promotedCls = nextClass(cls);

      // Build marks rows for this student
      const subs2 = entry.subjects;
      const subjectRows2 = subs2.map(su => {
        const m = entry.marks[su] || {};
        const t1_pt=m.t1_pt??null,t1_nb=m.t1_nb??null,t1_sea=m.t1_sea??null,t1_hy=m.t1_hy??null;
        const t2_pt=m.t2_pt??null,t2_nb=m.t2_nb??null,t2_sea=m.t2_sea??null,t2_ye=m.t2_ye??null;
        const t1Total=(t1_pt!==null||t1_nb!==null||t1_sea!==null||t1_hy!==null)?(t1_pt||0)+(t1_nb||0)+(t1_sea||0)+(t1_hy||0):null;
        const t2Total=(t2_pt!==null||t2_nb!==null||t2_sea!==null||t2_ye!==null)?(t2_pt||0)+(t2_nb||0)+(t2_sea||0)+(t2_ye||0):null;
        const grand=(t1Total!==null&&t2Total!==null)?Math.round((t1Total+t2Total)/2):null;
        return {su,t1_pt,t1_nb,t1_sea,t1_hy,t1Total,t2_pt,t2_nb,t2_sea,t2_ye,t2Total,grand};
      });
      const validRows2 = subjectRows2.filter(r=>r.grand!==null);
      const overallTotal2 = validRows2.reduce((a,r)=>a+(r.grand||0),0);
      const overallMax2 = subs2.length*100;
      const overallPct2 = overallMax2>0?Math.round(overallTotal2/overallMax2*100):0;
      const remarkText2 = overallPct2>=91?'Excellent!':overallPct2>=75?'Good!':overallPct2>=50?'Satisfactory':'Needs Improvement';
      const coG2 = entry.coGrades||{}, dG2 = entry.discGrades||{};
      const rank2 = entry.rank;
      const logoTag2 = logo ? `<img src="${logo}" class="wm" alt=""/>` : '';

      const subRows2 = subjectRows2.map(r=>`<tr>
        <td class="td-subj">${r.su}</td>
        <td>${fmt(r.t1_pt)}</td><td>${fmt(r.t1_nb)}</td><td>${fmt(r.t1_sea)}</td><td>${fmt(r.t1_hy)}</td>
        <td class="td-tot">${fmt(r.t1Total)}</td>
        <td>${fmt(r.t2_pt)}</td><td>${fmt(r.t2_nb)}</td><td>${fmt(r.t2_sea)}</td><td>${fmt(r.t2_ye)}</td>
        <td class="td-tot">${fmt(r.t2Total)}</td>
        <td class="td-grand">${fmt(r.grand)}</td>
        <td class="td-grade">${r.grand!==null?grade8(r.grand):'—'}</td>
      </tr>`).join('');
      const coRows2 = CO_ACTIVITIES.map(a=>{const g=coG2[a]||'A2';return`<tr><td class="co-act">${a}</td><td class="co-g">${g}</td><td class="co-g">${g}</td></tr>`;}).join('');
      const discRows2 = DISCIPLINE_ITEMS.map(d=>{const g=dG2[d]||'A2';return`<tr><td class="co-act">${d}</td><td class="co-g">${g}</td><td class="co-g">${g}</td></tr>`;}).join('');

      const singleHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCSS}</style></head><body>
      <div class="page">
        ${logoTag2}
        <div class="hdr">
          <div class="hdr-eyebrow">Academic Report</div>
          <div class="hdr-title">Report Card</div>
          <div class="hdr-rule"></div>
          <div class="hdr-cls">Class : ${cls}</div>
          <div class="hdr-sess">Academic Session &nbsp;·&nbsp; ${yr}</div>
        </div>
        <div class="info-wrap"><div class="info">
          <div>
            <div class="ir"><span class="il">Student's Name</span><span class="iv">${s.fn} ${s.ln}</span></div>
            <div class="ir"><span class="il">Father's Name</span><span class="iv">${s.father||'—'}</span></div>
            <div class="ir"><span class="il">Mother's Name</span><span class="iv">${s.mother||'—'}</span></div>
            <div class="ir"><span class="il">Date of Birth</span><span class="iv">${s.dob||'—'}</span></div>
            <div class="ir"><span class="il">Address</span><span class="iv">${s.addr||addr||'—'}</span></div>
          </div>
          <div style="border-left:2px solid #D6EAF8;padding-left:24px">
            <div class="ir"><span class="il">Roll No.</span><span class="iv">${s.roll||'—'}</span></div>
            <div class="ir" style="margin-top:6px"><span class="il">Admission No.</span><span class="iv">${admissionNo(s)}</span></div>
          </div>
        </div></div>
        <div class="tw"><table class="mt">
          <thead>
            <tr>
              <th rowspan="2" class="th-area">Scholastic<br/>Area</th>
              <th colspan="5" class="th-term">Term 1 (100 Marks)</th>
              <th colspan="5" class="th-term">Term 2 (100 Marks)</th>
              <th colspan="2" class="th-overall">Overall</th>
            </tr>
            <tr class="th-sub">
              <th>Per.<br/>Test</th><th>Note<br/>Book</th><th>SEA</th><th>Half<br/>Yearly</th><th>Total</th>
              <th>Per.<br/>Test</th><th>Note<br/>Book</th><th>SEA</th><th>Yearly<br/>Exam</th><th>Total</th>
              <th>Grand<br/>Total</th><th>Grade</th>
            </tr>
            <tr class="th-max">
              <td class="td-subj">Subjects</td>
              <td>10</td><td>5</td><td>5</td><td>80</td><td>100</td>
              <td>10</td><td>5</td><td>5</td><td>80</td><td>100</td>
              <td>100</td><td></td>
            </tr>
          </thead>
          <tbody>${subRows2}</tbody>
        </table></div>
        <div class="gn"><strong>8-Point Scale:</strong> A1(91-100%) · A2(81-90%) · B1(71-80%) · B2(61-70%) · C1(51-60%) · C2(41-50%) · D(33-40%) · E(≤32%) &nbsp; <strong>*SEA</strong>=Sub Enrichment Activity</div>
        <div class="tb">
          <div class="tot-item">Overall Marks &nbsp;<span class="tot-val">${overallTotal2} / ${overallMax2}</span></div>
          <div class="tot-item">Percentage &nbsp;<span class="tot-val">${overallPct2}%</span></div>
          <div class="tot-item">Result &nbsp;<span class="tot-val" style="color:#1E8449">Pass</span></div>
          <div class="tot-item">Rank &nbsp;<span class="tot-val">${rank2 > 0 ? rank2 : '—'}</span></div>
        </div>
        <div class="cw">
          <table class="co-tbl"><thead><tr><th colspan="3" class="co-hdr-main">Co-Scholastic Areas</th></tr><tr><th class="co-hdr-sub" style="text-align:left;padding-left:8px">Activity</th><th class="co-hdr-sub">T1</th><th class="co-hdr-sub">T2</th></tr></thead><tbody>${coRows2}</tbody></table>
          <table class="co-tbl"><thead><tr><th colspan="3" class="co-hdr-main">Discipline</th></tr><tr><th class="co-hdr-sub" style="text-align:left;padding-left:8px">Element</th><th class="co-hdr-sub">T1</th><th class="co-hdr-sub">T2</th></tr></thead><tbody>${discRows2}</tbody></table>
        </div>
        <div class="ft">
          <div class="ft-row1">
            <span class="ft-att">Attendance : ${entry.attP} / ${entry.attT}</span>
            <span class="ft-rem">Remarks : ${remarkText2}</span>
          </div>
          <div class="ft-promo">Congratulations! Promoted to Class ${promotedCls}.</div>
          <div class="sr">
            <div class="si"><div class="sl" style="border-top:none">Date : 31/03/2026</div></div>
            <div class="si"><div class="sl">Class Teacher</div></div>
            <div class="si"><div class="sl">Principal${prin?' ('+prin+')':''}</div></div>
          </div>
        </div>
      </div>
      </body></html>`;

      allPages.push(singleHtml);

      if (token && !skipServerSave) {
        try {
          const resp = await fetch(`${BASE}/marksheet/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ html: singleHtml, cls, filename }),
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(data.error || resp.statusText || 'Save failed');
          serverOk++;
        } catch (err) {
          console.warn('marksheet/save (optional):', err);
          serverFail++;
        }
      }
    }

    if (!silent && token && (serverOk || serverFail)) {
      if (serverFail === 0 && serverOk > 0) {
        toast(`Saved ${serverOk} PDF(s) on server (host Desktop folder when available)`);
      } else if (serverOk > 0 && serverFail > 0) {
        toast(`${serverOk} saved on server, ${serverFail} failed — use Print or Download PDF.`, 'err');
      } else if (serverFail > 0) {
        toast('Could not save on server — use Print or Download PDF.', 'err');
      }
    }

    const pageCSS2 = css;
    const allPageBodies = allPages.map(p => p.replace(/^[\s\S]*?<body>/,'').replace(/<\/body>[\s\S]*$/,'')).join('');

    const s0 = students[0]?.s;
    const docTitle = students.length === 1 && s0
      ? (() => {
          const r = (s0.roll || s0.admNo || s0.admno || '').toString().trim();
          const n = `${s0.fn || ''} ${s0.ln || ''}`.trim() || 'Student';
          return r ? `Marksheet — ${r} — ${n}` : `Marksheet — ${n}`;
        })()
      : `Marksheet — ${cls} (${students.length} students)`;

    const downloadOnly = wantDownload && !wantPrint;
    const pdfHintCss = downloadOnly
      ? `@media screen{.lkps-pdf-hint{position:fixed;top:0;left:0;right:0;background:#0f172a;color:#e2e8f0;padding:12px 16px;font:14px system-ui,-apple-system,sans-serif;text-align:center;z-index:999999;box-shadow:0 2px 12px rgba(0,0,0,.25)}}@media print{.lkps-pdf-hint{display:none!important}}`
      : '';
    const pdfHintHtml = downloadOnly
      ? '<div class="lkps-pdf-hint">Same layout as preview — in the print dialog choose <strong>Save as PDF</strong> (or Microsoft Print to PDF) to download.</div>'
      : '';

    const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeDocTitle(docTitle)}</title><style>${pageCSS2}${pdfHintCss}</style></head><body>${pdfHintHtml}${allPageBodies}</body></html>`;

    if (openViewer) {
      if (!pw) {
        toast('Pop-up blocked — allow pop-ups to print or save as PDF.', 'err');
      } else {
        const fontDelay = downloadOnly ? 500 : 350;
        const printHtml = docHtml.replace(
          '</body>',
          `<script>(function(){
function run(){window.focus();window.print();}
if(document.fonts&&document.fonts.ready){
document.fonts.ready.then(function(){setTimeout(run,${fontDelay});});
}else{
setTimeout(run,${downloadOnly ? 900 : 700});
}
})();<\/script></body>`
        );
        pw.document.open();
        pw.document.write(printHtml);
        pw.document.close();
        if (downloadOnly) {
          toast('Print dialog opened — pick Save as PDF for a file that matches preview.');
        }
      }
    }
  };

  // Build entries for directory students
  const buildDirectoryEntries = (studentsToGen) => {
    return studentsToGen.map(s => {
      const ovr = overrides[s.id] || {};
      const dbAtt = getAtt(s.id);
      // Priority: manual override > saved _rcAtt > real attendance records
      const attP = ovr.attP !== undefined ? ovr.attP : (dbAtt.t > 0 ? dbAtt.p : (s._rcAttP || 0));
      const attT = ovr.attT !== undefined ? ovr.attT : (dbAtt.t > 0 ? dbAtt.t : (s._rcAttT || 0));

      // Use override rcMarks > saved _rcMarks > exam schedule marks
      const overrideMarks = ovr.rcMarks;
      const hasExamMarks = !overrideMarks && !s._rcMarks && subjects.some(su => {
        const t1 = getSubjectExams(su, t1Exams);
        const t2 = getSubjectExams(su, t2Exams);
        return [...t1,...t2].some(e => getMark(e.id, s.id) !== null);
      });

      const marks = {};
      if (overrideMarks) {
        subjects.forEach(su => { marks[su] = overrideMarks[su] || {}; });
      } else if (!hasExamMarks && s._rcMarks) {
        // restore from saved guest marksheet data
        subjects.forEach(su => { marks[su] = s._rcMarks[su] || {}; });
      } else {
        subjects.forEach(su => {
          const t1 = getSubjectExams(su, t1Exams);
          const t2 = getSubjectExams(su, t2Exams);
          const fc = (exams, kws) => { const e=exams.find(ex=>kws.some(k=>ex.name.toLowerCase().includes(k))); return e?getMark(e.id,s.id):null; };
          marks[su] = {
            t1_pt: fc(t1,['per.test','periodic','per test','pt']),
            t1_nb: fc(t1,['note','notebook','note book']),
            t1_sea: fc(t1,['sea','sub enrich','enrichment']),
            t1_hy: fc(t1,['half','half yearly','hy']),
            t2_pt: fc(t2,['per.test','periodic','per test','pt']),
            t2_nb: fc(t2,['note','notebook','note book']),
            t2_sea: fc(t2,['sea','sub enrich','enrichment']),
            t2_ye: fc(t2,['yearly','annual','year exam','ye']),
          };
        });
      }

      const coGrades   = ovr.coGrades   || s._rcCoGrades   || {};
      const discGrades = ovr.discGrades || s._rcDiscGrades || {};
      const rank       = ovr.rank !== undefined ? ovr.rank : (s._rcRank || 0);

      const info = ovr.info || {};
      const mergedS = { ...s, ...info, addr: info.addr ?? ovr.addr ?? s.addr };
      mergedS.admNo = info.admNo ?? info.admno ?? s.admNo ?? s.admno ?? mergedS.admNo;

      return { s: mergedS, subjects, marks, attP, attT, coGrades, discGrades, rank };
    });
  };

  const genDirectory = async (studentsToGen) => {
    if (!rcCls) { toast('Select a class first','err'); return; }
    if (!studentsToGen?.length) { toast('No students to generate','err'); return; }
    await buildRC(buildDirectoryEntries(studentsToGen), { cls: rcCls });
  };

  const downloadDirectoryPdf = async (studentsToGen) => {
    if (!rcCls) { toast('Select a class first','err'); return; }
    if (!studentsToGen?.length) { toast('No students to generate','err'); return; }
    // Save updated marks/grades/attendance to each student's record
    const entries = buildDirectoryEntries(studentsToGen);
    const updatedStudents = db.students.map(s => {
      const entry = entries.find(e => e.s.id === s.id);
      if (!entry) return s;
      const ovr = overrides[s.id] || {};
      return {
        ...s,
        _rcMarks: entry.marks,
        _rcCoGrades: entry.coGrades,
        _rcDiscGrades: entry.discGrades,
        _rcAttP: entry.attP,
        _rcAttT: entry.attT,
        _rcRank: entry.rank,
      };
    });
    save({ ...db, students: updatedStudents });
    await buildRC(entries, { cls: rcCls, output: 'download' });
  };

  const genDirectorySilent = async (studentsToGen) => {
    if (!rcCls) return;
    if (!studentsToGen?.length) return;
    await buildRC(buildDirectoryEntries(studentsToGen), { cls: rcCls }, false, true);
  };

  // Auto-update preview whenever inputs change
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (mode === 'directory') {
        if (!rcCls) { setPreviewHtml(''); return; }
        const stuList = selStu !== 'all' && editStu ? [editStu] : clsStudents.slice(0, 1);
        if (!stuList.length) { setPreviewHtml(''); return; }
        const html = await buildRC(buildDirectoryEntries(stuList), { cls: rcCls }, true);
        if (!cancelled && html) setPreviewHtml(html);
      } else {
        if (!guest.fn.trim() || !guest.cls.trim()) { setPreviewHtml(''); return; }
        const subs = guestSubjects.split(',').map(s => s.trim()).filter(Boolean);
        if (!subs.length) { setPreviewHtml(''); return; }
        const entry = {
          s: { ...guest, id: 'guest' },
          subjects: subs, marks: guestMarks,
          attP: parseInt(guestAttP)||0, attT: parseInt(guestAttT)||0,
          coGrades: guestCoGrades, discGrades: guestDiscGrades,
          rank: parseInt(guestRank)||0,
        };
        const html = await buildRC([entry], { cls: guest.cls }, true);
        if (!cancelled && html) setPreviewHtml(html);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [mode, rcCls, selStu, overrides, guest, guestSubjects, guestMarks, guestCoGrades, guestDiscGrades, guestAttP, guestAttT, guestRank]); // eslint-disable-line

  const genGuest = async () => {
    if (!guest.fn.trim()) { toast('Enter student first name','err'); return; }
    if (!guest.cls.trim()) { toast('Enter class name','err'); return; }
    const subs = guestSubjects.split(',').map(s=>s.trim()).filter(Boolean);
    if (!subs.length) { toast('Enter at least one subject','err'); return; }

    // ── Save student to directory only ─────────────────────────────
    // Match by roll+class or admNo+class (unique), fall back to name only if no identifiers
    const existingId = db.students.find(s => {
      if (s.cls !== guest.cls) return false;
      if (guest.roll && s.roll && String(guest.roll) === String(s.roll)) return true;
      if (guest.admNo && s.admNo && String(guest.admNo) === String(s.admNo)) return true;
      if (!guest.roll && !guest.admNo)
        return s.fn.toLowerCase()===guest.fn.toLowerCase() &&
               s.ln.toLowerCase()===(guest.ln||'').toLowerCase();
      return false;
    })?.id;

    const stuId = existingId || ('S' + uid());
    const newStudent = {
      id: stuId, sid: stuId,
      fn: guest.fn, ln: guest.ln||'',
      father: guest.father||'', mother: guest.mother||'',
      dob: guest.dob||'', roll: guest.roll||'',
      admNo: guest.admNo||'', addr: guest.addr||'',
      cls: guest.cls, fst: 'Pending', mf: 0, fextras: [], fee: 0, gn: 'Male',
      // store marksheet data on the student record for later re-use
      _rcMarks: guestMarks,
      _rcSubjects: guestSubjects,
      _rcCoGrades: guestCoGrades,
      _rcDiscGrades: guestDiscGrades,
      _rcAttP: parseInt(guestAttP)||0,
      _rcAttT: parseInt(guestAttT)||0,
      _rcRank: parseInt(guestRank)||0,
    };

    const updatedStudents = existingId
      ? db.students.map(s => s.id === existingId ? { ...s, ...newStudent } : s)
      : [...db.students, newStudent];

    save({ ...db, students: updatedStudents });
    toast(existingId ? 'Student updated in directory' : 'Student added to directory');

    // ── Generate PDF ───────────────────────────────────────────────
    const entry = {
      s: { ...newStudent },
      subjects: subs,
      marks: guestMarks,
      attP: parseInt(guestAttP)||0,
      attT: parseInt(guestAttT)||0,
      coGrades: guestCoGrades,
      discGrades: guestDiscGrades,
      rank: parseInt(guestRank)||0,
    };
    await buildRC([entry], { cls: guest.cls });
  };

  const previewGuest = async () => {
    if (!guest.fn.trim() || !guest.cls.trim()) return;
    const subs = guestSubjects.split(',').map(s=>s.trim()).filter(Boolean);
    if (!subs.length) return;
    const entry = {
      s: { ...guest, id: 'guest' },
      subjects: subs,
      marks: guestMarks,
      attP: parseInt(guestAttP)||0,
      attT: parseInt(guestAttT)||0,
      coGrades: guestCoGrades,
      discGrades: guestDiscGrades,
      rank: parseInt(guestRank)||0,
    };
    const html = await buildRC([entry], { cls: guest.cls }, true);
    if (html) setPreviewHtml(html);
  };

  const downloadGuestPdf = async () => {
    if (!guest.fn.trim()) { toast('Enter student first name','err'); return; }
    if (!guest.cls.trim()) { toast('Enter class name','err'); return; }
    const subs = guestSubjects.split(',').map(s=>s.trim()).filter(Boolean);
    if (!subs.length) { toast('Enter at least one subject','err'); return; }

    // Save student to directory (same as genGuest)
    const existingId = db.students.find(s => {
      if (s.cls !== guest.cls) return false;
      if (guest.roll && s.roll && String(guest.roll) === String(s.roll)) return true;
      if (guest.admNo && s.admNo && String(guest.admNo) === String(s.admNo)) return true;
      if (!guest.roll && !guest.admNo)
        return s.fn.toLowerCase()===guest.fn.toLowerCase() &&
               s.ln.toLowerCase()===(guest.ln||'').toLowerCase();
      return false;
    })?.id;
    const stuId = existingId || ('S' + uid());
    const newStudent = {
      id: stuId, sid: stuId,
      fn: guest.fn, ln: guest.ln||'',
      father: guest.father||'', mother: guest.mother||'',
      dob: guest.dob||'', roll: guest.roll||'',
      admNo: guest.admNo||'', addr: guest.addr||'',
      cls: guest.cls, fst: 'Pending', mf: 0, fextras: [], fee: 0, gn: 'Male',
      _rcMarks: guestMarks, _rcSubjects: guestSubjects,
      _rcCoGrades: guestCoGrades, _rcDiscGrades: guestDiscGrades,
      _rcAttP: parseInt(guestAttP)||0, _rcAttT: parseInt(guestAttT)||0,
      _rcRank: parseInt(guestRank)||0,
    };
    const updatedStudents = existingId
      ? db.students.map(s => s.id === existingId ? { ...s, ...newStudent } : s)
      : [...db.students, newStudent];
    save({ ...db, students: updatedStudents });
    toast(existingId ? 'Student updated in directory' : 'Student added to directory');

    const entry = {
      s: { ...newStudent },
      subjects: subs, marks: guestMarks,
      attP: parseInt(guestAttP)||0, attT: parseInt(guestAttT)||0,
      coGrades: guestCoGrades, discGrades: guestDiscGrades,
      rank: parseInt(guestRank)||0,
    };
    await buildRC([entry], { cls: guest.cls, output: 'download' });
  };

  const inp = 'w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-300 outline-none';
  const lbl = 'block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider';

  return (
    <div className="report-card-studio flex gap-6">
      {/* ── LEFT: controls ── */}
      <div className="report-card-controls flex-1 min-w-0 space-y-6">
      {/* Mode toggle */}
      <div className="report-card-mode-toggle flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[['directory','group','From Student Directory'],['guest','person_add','Guest Student (Manual)']].map(([id,icon,label])=>(
          <button key={id} onClick={()=>setMode(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all border-0 cursor-pointer ${mode===id?'bg-white text-blue-700 shadow-sm':'text-slate-500 bg-transparent hover:text-slate-700'}`}>
            <span className="material-symbols-outlined text-base">{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* ── DIRECTORY MODE ── */}
      {mode === 'directory' && (
        <>
            <div className="report-card-config bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">Configuration</p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className={lbl}>Class</label>
                <select value={rcCls} onChange={e=>{setRcCls(e.target.value);setSelStu('all');}}
                  className={inp + ' min-w-[140px]'}>
                  <option value="">Select Class</option>
                  {classes.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              {rcCls && (
                <div>
                  <label className={lbl}>Edit Student</label>
                  <select value={selStu} onChange={e=>{
                    const id = e.target.value;
                    setSelStu(id);
                    // if student has saved marksheet data, pre-load into overrides
                    if (id !== 'all') {
                      const s = db.students.find(x => x.id === id);
                      if (s?._rcMarks) {
                        setOverrides(o => ({
                          ...o,
                          [id]: {
                            ...(o[id]||{}),
                            rcMarks:     s._rcMarks     || {},
                            coGrades:    s._rcCoGrades  || {},
                            discGrades:  s._rcDiscGrades|| {},
                            attP: s._rcAttP !== undefined ? s._rcAttP : undefined,
                            attT: s._rcAttT !== undefined ? s._rcAttT : undefined,
                            rank: s._rcRank || undefined,
                          }
                        }));
                      }
                    }
                  }}
                    className={inp + ' min-w-[180px]'}>
                    <option value="all">— All Students —</option>
                    {clsStudents.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln}{s._rcMarks?' ✦':''}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Per-student editor */}
          {rcCls && selStu!=='all' && editStu && (
            <div className="report-card-editor bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="report-card-tabbar flex border-b border-blue-100 bg-blue-50">
                {[['marks','edit_note','Marks Entry'],['info','person','Student Info'],['co','star','Co-Scholastic'],['disc','verified','Discipline'],['att','calendar_today','Attendance']].map(([id,icon,label])=>(
                  <button key={id} onClick={()=>setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold transition-all border-0 cursor-pointer ${activeTab===id?'bg-white text-blue-700 border-b-2 border-blue-500':'text-slate-500 hover:text-slate-700 bg-transparent'}`}>
                    <span className="material-symbols-outlined text-sm">{icon}</span>{label}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab==='marks' && (()=>{
                  const stuSubs = ((db.classes.find(c=>c.name===rcCls)?.subs || defaultSubs(rcCls) || '').split(',').map(s=>s.trim()).filter(Boolean));
                  const savedMarks = (overrides[selStu]?.rcMarks) || editStu?._rcMarks || {};
                  const maxMap = {t1_pt:10,t1_nb:5,t1_sea:5,t1_hy:80,t2_pt:10,t2_nb:5,t2_sea:5,t2_ye:80};
                  const setMark = (su, key, val) => {
                    const cur = (overrides[selStu]?.rcMarks) || editStu?._rcMarks || {};
                    const newMarks = { ...cur, [su]: { ...(cur[su]||{}), [key]: val } };
                    // auto-compute co/disc grades from updated marks
                    let total = 0, count = 0;
                    stuSubs.forEach(s => {
                      const m = newMarks[s] || {};
                      const t1 = (m.t1_pt||0)+(m.t1_nb||0)+(m.t1_sea||0)+(m.t1_hy||0);
                      const t2 = (m.t2_pt||0)+(m.t2_nb||0)+(m.t2_sea||0)+(m.t2_ye||0);
                      if (t1 > 0 || t2 > 0) { total += Math.round((t1+t2)/2); count++; }
                    });
                    const avg = count > 0 ? Math.round(total / count) : 50;
                    const g = grade8(avg);
                    const coGrades   = variedGrades(CO_ACTIVITIES, avg);
                    const discGrades = variedGrades(DISCIPLINE_ITEMS, avg);
                    setOvr(selStu, { rcMarks: newMarks, coGrades, discGrades });
                  };
                  return (
                    <div className="space-y-3">
                      <MarksTable
                        subjects={stuSubs}
                        marks={savedMarks}
                        onChange={(su, key, val) => setMark(su, key, val)}
                      />
                    </div>
                  );
                })()}
                {activeTab==='info' && editStu && (
                  <div className="info-nav-container report-card-info-grid grid grid-cols-2 gap-4">
                    {[
                      ['First Name','fn'], ['Last Name','ln'],
                      ["Father's Name",'father'], ["Mother's Name",'mother'],
                      ['Roll No.','roll'], ['Admission No.','admNo'],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label className={lbl}>{label}</label>
                        <input
                          data-info={key}
                          value={(overrides[selStu]?.info?.[key] ?? editStu[key]) || ''}
                          onChange={e => setOvr(selStu, { info: { ...(overrides[selStu]?.info||{}), [key]: toTitleCase(e.target.value) } })}
                          onKeyDown={e=>infoKeyDown(e,key)}
                          className={inp} placeholder={label}/>
                      </div>
                    ))}
                    <div>
                      <label className={lbl}>Date of Birth (dd-mm-yyyy)</label>
                      <input type="date"
                        value={(() => {
                          const raw = (overrides[selStu]?.info?.dob ?? editStu.dob) || '';
                          // convert dd-mm-yyyy → yyyy-mm-dd for input
                          if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
                            const [d,m,y] = raw.split('-'); return `${y}-${m}-${d}`;
                          }
                          return raw;
                        })()}
                        onChange={e => {
                          const v = e.target.value; // yyyy-mm-dd
                          if (v) {
                            const [y,m,d] = v.split('-');
                            setOvr(selStu, { info: { ...(overrides[selStu]?.info||{}), dob: `${d}-${m}-${y}` } });
                          } else {
                            setOvr(selStu, { info: { ...(overrides[selStu]?.info||{}), dob: '' } });
                          }
                        }}
                        className={inp}/>
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Address</label>
                      <AddressSelect
                        value={(overrides[selStu]?.info?.addr ?? editStu.addr) || ''}
                        onChange={v => setOvr(selStu, { info: { ...(overrides[selStu]?.info||{}), addr: v } })}
                        className={inp}/>
                    </div>
                    <div className="col-span-2 text-xs text-slate-400 italic">Changes are saved with the button below.</div>
                  </div>
                )}
                {activeTab==='co' && (
                  <div className="report-card-grade-grid grid grid-cols-2 gap-3">
                    {CO_ACTIVITIES.map(act=>{
                      const g=(overrides[selStu]?.coGrades||{})[act]||'A2';
                      return <div key={act} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
                        <span className="text-sm text-slate-700 font-medium">{act}</span>
                        <GradeSelect value={g} onChange={v=>setCoGrade(selStu,act,v)}/>
                      </div>;
                    })}
                  </div>
                )}
                {activeTab==='disc' && (
                  <div className="report-card-grade-grid grid grid-cols-2 gap-3">
                    {DISCIPLINE_ITEMS.map(item=>{
                      const g=(overrides[selStu]?.discGrades||{})[item]||'A2';
                      return <div key={item} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
                        <span className="text-xs text-slate-700 font-medium">{item}</span>
                        <GradeSelect value={g} onChange={v=>setDiscGrade(selStu,item,v)}/>
                      </div>;
                    })}
                  </div>
                )}
                {activeTab==='att' && (()=>{
                  const dbAtt=getAtt(selStu);
                  const ovr=overrides[selStu]||{};
                  const attP=ovr.attP!==undefined?ovr.attP:dbAtt.p;
                  const attT=ovr.attT!==undefined?ovr.attT:dbAtt.t;
                  return <div className="space-y-4">
                    <p className="text-xs text-slate-400 italic">Auto-calculated from records. Override if needed.</p>
                    <div className="flex gap-6 items-center bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <span className="text-sm text-slate-500">From records: <strong className="text-blue-700">{dbAtt.p} / {dbAtt.t}</strong></span>
                    </div>
                    <div className="report-card-info-grid grid grid-cols-2 gap-4">
                      <div><label className={lbl}>Days Present</label><input type="number" min="0" value={attP} onChange={e=>setOvr(selStu,{attP:parseInt(e.target.value)||0})} className={inp}/></div>
                      <div><label className={lbl}>Total Working Days</label><input type="number" min="0" value={attT} onChange={e=>setOvr(selStu,{attT:parseInt(e.target.value)||0})} className={inp}/></div>
                      <div><label className={lbl}>Rank</label><input type="number" min="1" value={ovr.rank||''} onChange={e=>setOvr(selStu,{rank:parseInt(e.target.value)||0})} className={inp} placeholder="e.g. 3"/></div>
                    </div>
                    <button onClick={()=>setOvr(selStu,{attP:undefined,attT:undefined})} className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer border-0 bg-transparent">Reset to auto</button>
                  </div>;
                })()}
              </div>
              {/* Unified Save All button */}
              <div className="px-6 pb-5 pt-3 border-t border-blue-100 bg-blue-50">
                <button onClick={async ()=>{
                  const ovr = overrides[selStu] || {};
                  const info = ovr.info || {};
                  const rcMarks = ovr.rcMarks || editStu?._rcMarks || {};
                  const updated = db.students.map(s => s.id===selStu ? {
                    ...s, ...info, _rcMarks: rcMarks,
                    _rcCoGrades: ovr.coGrades || s._rcCoGrades,
                    _rcDiscGrades: ovr.discGrades || s._rcDiscGrades,
                    _rcAttP: ovr.attP !== undefined ? ovr.attP : s._rcAttP,
                    _rcAttT: ovr.attT !== undefined ? ovr.attT : s._rcAttT,
                    _rcRank: ovr.rank !== undefined ? ovr.rank : s._rcRank,
                  } : s);
                  save({ ...db, students: updated });
                  toast('All changes saved — updating PDF...');
                  await genDirectorySilent([editStu].filter(Boolean));
                }} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors border-0 cursor-pointer shadow-sm">
                  <span className="material-symbols-outlined text-lg">save</span>
                  Save All Changes & Update PDF
                </button>
              </div>
            </div>
          )}

          {rcCls && (
            <div className="report-card-actions flex flex-wrap gap-3">
              <button onClick={()=>genDirectory(selStu==='all'?clsStudents:[editStu].filter(Boolean))}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors border-0 cursor-pointer">
                <span className="material-symbols-outlined text-lg">description</span>
                {selStu==='all'?`Generate All (${clsStudents.length})`:'Generate This Student'}
              </button>
              <button type="button" title="Opens the same marksheet as preview/print — in the dialog choose Save as PDF."
                onClick={()=>downloadDirectoryPdf(selStu==='all'?clsStudents:[editStu].filter(Boolean))}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-colors border-0 cursor-pointer">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                Save as PDF
              </button>
              {selStu!=='all' && (
                <button onClick={()=>genDirectory(clsStudents)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer">
                  <span className="material-symbols-outlined text-lg">group</span>
                  Generate Entire Class
                </button>
              )}
            </div>
          )}
          {!rcCls && <div className="flex flex-col items-center justify-center py-16 text-slate-400"><span className="material-symbols-outlined text-5xl mb-3 opacity-30">description</span><p className="font-medium">Select a class to begin</p></div>}
        </>
      )}

      {/* ── GUEST MODE ── */}
      {mode === 'guest' && (
        <div className="report-card-editor bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="report-card-tabbar flex border-b border-blue-100 bg-blue-50">
            {[['info','person','Student Info & Marks'],['co','star','Co-Scholastic'],['disc','verified','Discipline'],['att','calendar_today','Attendance']].map(([id,icon,label])=>(
              <button key={id} onClick={()=>setGuestTab(id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold transition-all border-0 cursor-pointer ${guestTab===id?'bg-white text-blue-700 border-b-2 border-blue-500':'text-slate-500 hover:text-slate-700 bg-transparent'}`}>
                <span className="material-symbols-outlined text-sm">{icon}</span>{label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {guestTab==='info' && (
              <div className="space-y-5">
                <div className="report-card-info-grid grid grid-cols-2 gap-4 info-nav-container">
                  <div><label className={lbl}>Class *</label>
                    <select value={guest.cls} onChange={e=>{
                      const v=e.target.value;
                      setGuest(g=>({...g,cls:v}));
                      // auto-fill subjects from class definition or default
                      const clsObj = db.classes.find(c=>c.name===v);
                      const subs = clsObj?.subs || defaultSubs(v) || '';
                      if (subs) setGuestSubjects(subs);
                    }} className={inp}>
                      <option value="">Select Class</option>
                      {db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  {[['First Name *','fn'],['Last Name','ln'],["Father's Name",'father'],["Mother's Name",'mother'],
                    ['Roll No.','roll'],['Admission No.','admNo'],
                  ].map(([label,key])=>(
                    <div key={key}><label className={lbl}>{label}</label>
                      <input
                        data-info={key}
                        value={guest[key]||''}
                        onChange={e=>setGuest(g=>({...g,[key]:toTitleCase(e.target.value)}))}
                        onKeyDown={e=>infoKeyDown(e,key)}
                        className={inp} placeholder={label}/></div>
                  ))}
                  <div>
                    <label className={lbl}>Date of Birth (dd-mm-yyyy)</label>
                    <input type="date"
                      value={(() => {
                        const raw = guest.dob || '';
                        if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
                          const [d,m,y] = raw.split('-'); return `${y}-${m}-${d}`;
                        }
                        return raw;
                      })()}
                      onChange={e => {
                        const v = e.target.value;
                        if (v) { const [y,m,d] = v.split('-'); setGuest(g=>({...g,dob:`${d}-${m}-${y}`})); }
                        else setGuest(g=>({...g,dob:''}));
                      }}
                      className={inp}/>
                  </div>
                  <div className="col-span-2"><label className={lbl}>Address</label>
                    <AddressSelect value={guest.addr||''} onChange={v=>setGuest(g=>({...g,addr:v}))} className={inp}/></div>
                </div>
                <div>
                  <label className={lbl}>Subjects (comma separated)</label>
                  <input value={guestSubjects} onChange={e=>setGuestSubjects(e.target.value)} className={inp} placeholder="Hindi, English, Mathematics, Rhymes"/>
                  <p className="text-xs text-slate-400 mt-1">Auto-filled from class — edit if needed.</p>
                </div>
                <div>
                  <p className={lbl + ' mb-3'}>Marks Entry</p>
                  <MarksTable
                    subjects={guestSubjects.split(',').map(s=>s.trim()).filter(Boolean)}
                    marks={guestMarks}
                    onChange={(su, key, raw) => {
                      const newMk = {...guestMarks,[su]:{...guestMarks[su],[key]:raw}};
                      setGuestMarks(newMk);
                      const gSubs = guestSubjects.split(',').map(s=>s.trim()).filter(Boolean);
                      let tot=0,cnt=0;
                      gSubs.forEach(s=>{const m=newMk[s]||{};const t1=(m.t1_pt||0)+(m.t1_nb||0)+(m.t1_sea||0)+(m.t1_hy||0);const t2=(m.t2_pt||0)+(m.t2_nb||0)+(m.t2_sea||0)+(m.t2_ye||0);if(t1>0||t2>0){tot+=Math.round((t1+t2)/2);cnt++;}});
                      const avg=cnt>0?Math.round(tot/cnt):50;
                      setGuestCoGrades(variedGrades(CO_ACTIVITIES, avg));
                      setGuestDiscGrades(variedGrades(DISCIPLINE_ITEMS, avg));
                    }}
                  />
                </div>
              </div>
            )}
            {guestTab==='co' && (
              <div>
                <p className="text-xs text-slate-400 italic mb-4">Set grades for co-scholastic activities.</p>
                <div className="report-card-grade-grid grid grid-cols-2 gap-3">
                  {CO_ACTIVITIES.map(act=>{
                    const g=guestCoGrades[act]||'A2';
                    return <div key={act} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
                      <span className="text-sm text-slate-700 font-medium">{act}</span>
                      <GradeSelect value={g} onChange={v=>setGuestCoGrades(c=>({...c,[act]:v}))}/>
                    </div>;
                  })}
                </div>
              </div>
            )}
            {guestTab==='disc' && (
              <div className="report-card-grade-grid grid grid-cols-2 gap-3">
                {DISCIPLINE_ITEMS.map(item=>{
                  const g=guestDiscGrades[item]||'A2';
                  return <div key={item} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
                    <span className="text-xs text-slate-700 font-medium">{item}</span>
                    <GradeSelect value={g} onChange={v=>setGuestDiscGrades(c=>({...c,[item]:v}))}/>
                  </div>;
                })}
              </div>
            )}
            {guestTab==='att' && (
              <div className="report-card-info-grid grid grid-cols-2 gap-4">
                <div><label className={lbl}>Days Present</label><input type="number" min="0" value={guestAttP} onChange={e=>setGuestAttP(e.target.value)} className={inp} placeholder="0"/></div>
                <div><label className={lbl}>Total Working Days</label><input type="number" min="0" value={guestAttT} onChange={e=>setGuestAttT(e.target.value)} className={inp} placeholder="0"/></div>
                <div><label className={lbl}>Rank</label><input type="number" min="1" value={guestRank} onChange={e=>setGuestRank(e.target.value)} className={inp} placeholder="e.g. 3"/></div>
              </div>
            )}
          </div>
          <div className="report-card-actions px-6 pb-6 flex flex-wrap gap-3">
            <button onClick={genGuest}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors border-0 cursor-pointer">
              <span className="material-symbols-outlined text-lg">description</span>
              Generate Report Card
            </button>
            <button type="button" title="Same layout as preview — choose Save as PDF in the print dialog."
              onClick={downloadGuestPdf}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-colors border-0 cursor-pointer">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              Save as PDF
            </button>
            <button onClick={()=>{
              setGuest(BLANK_GUEST);
              setGuestSubjects('');
              setGuestMarks({});
              setGuestCoGrades({});
              setGuestDiscGrades({});
              setGuestAttP('');
              setGuestAttT('');
              setGuestRank('');
              setGuestTab('info');
              setPreviewHtml('');
            }} className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-200 cursor-pointer">
              <span className="material-symbols-outlined text-lg">restart_alt</span>
              Reset
            </button>
          </div>
        </div>
      )}
      </div>{/* end left controls */}

      {/* ── RIGHT: live preview ── */}
      <div className="report-card-preview w-[380px] flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden sticky top-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-blue-50">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500">Live Preview</span>
            <span className="text-[10px] text-slate-400">Updates automatically</span>
          </div>
          {previewHtml ? (
            <div className="relative bg-slate-100" style={{height:'560px',overflow:'hidden'}}>
              <iframe
                srcDoc={previewHtml}
                title="Report Card Preview"
                style={{
                  width:'794px', // A4 at 96dpi
                  height:'1123px',
                  border:'none',
                  transformOrigin:'top left',
                  transform:'scale(0.478)',
                  pointerEvents:'none',
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50" style={{height:'560px'}}>
              <span className="material-symbols-outlined text-4xl mb-3 opacity-30">preview</span>
              <p className="text-xs font-medium text-center px-6">
                {mode==='directory'
                  ? rcCls ? 'Click Refresh to preview' : 'Select a class first'
                  : guest.fn ? 'Click Refresh to preview' : 'Fill in student details first'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// force redeploy Sun Mar 29 19:27:54 IST 2026

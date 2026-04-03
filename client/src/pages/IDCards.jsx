import React,{useState} from 'react';
import {useApp,Badge} from '../context/AppContext';
import {NoData} from '../components/UI';

const THEMES={
  blue:   {h1:'#1a3a8f',h2:'#2255c4',acc:'#c8a96e'},
  green:  {h1:'#065f46',h2:'#10b981',acc:'#6db88a'},
  maroon: {h1:'#7f1d1d',h2:'#dc2626',acc:'#c8906e'},
  navy:   {h1:'#0f172a',h2:'#334155',acc:'#7ea8c8'},
  purple: {h1:'#4c1d95',h2:'#8b5cf6',acc:'#a06ec8'},
};

const CARD_W = 300;
const CARD_H = 480;

function buildFront(s, photo, ph, yr, prin, th, logo) {
  const dob = s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '—';
  const validity = yr || '2025-2026';
  const logoEl = logo
    ? `<img src="${logo}" style="width:54px;height:54px;object-fit:contain;flex-shrink:0;">`
    : `<div style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">🏫</div>`;
  const phEl = photo
    ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:32px;font-weight:900;color:#94a3b8">${((s.fn||'?')[0]).toUpperCase()}</span>`;
  let qrEl = '';
  try {
    const qrData = encodeURIComponent(`${s.fn||''} ${s.ln||''}\nClass:${s.cls||''} Roll:${s.roll||''}\nAdm:${s.admno||''}\nFather:${s.father||''}\nPh:${s.fphone||s.ph||''}`);
    qrEl = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&margin=4&ecc=M" width="62" height="62" style="border:1px solid #ddd;border-radius:3px;" alt="QR"/>`;
  } catch(e){}

  return `<div style="width:${CARD_W}px;height:${CARD_H}px;background:#f0f4ff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.45);display:flex;flex-direction:column;position:relative;">
  <!-- Header -->
  <div style="background:#fff;padding:10px 12px 8px;display:flex;align-items:center;gap:10px;border-bottom:3px solid ${th.h1};">
    ${logoEl}
    <div style="width:1px;height:50px;background:#ddd;flex-shrink:0;"></div>
    <div>
      <div style="font-size:15px;font-weight:900;color:${th.h1};font-family:'Arial Black',Arial,sans-serif;text-transform:uppercase;letter-spacing:0.3px;line-height:1.1;">LORD KRISHNA</div>
      <div style="font-size:13px;font-weight:900;color:${th.h1};font-family:'Arial Black',Arial,sans-serif;text-transform:uppercase;letter-spacing:0.3px;">PUBLIC SCHOOL</div>
      <div style="font-size:7.5px;color:#555;margin-top:2px;">Ishapur, Laxminagar, Mathura</div>
      ${ph?`<div style="font-size:7.5px;color:#555;">Ph.: ${ph}</div>`:''}
    </div>
  </div>
  <!-- ID Card Banner -->
  <div style="background:${th.h1};padding:5px 0;text-align:center;">
    <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">Student ID Card</span>
  </div>
  <!-- Name Bar -->
  <div style="background:${th.h2};padding:5px 12px;">
    <div style="font-size:13px;font-weight:700;color:#fff;text-align:center;">${s.fn||'Student'} ${s.ln||'Name'}</div>
  </div>
  <!-- Body -->
  <div style="flex:1;background:#fff;padding:10px 12px;display:flex;gap:10px;">
    <!-- Photo -->
    <div style="flex-shrink:0;">
      <div style="width:88px;height:108px;border:2px solid ${th.h1};border-radius:4px;overflow:hidden;background:#e8f0ff;display:flex;align-items:center;justify-content:center;">${phEl}</div>
      <div style="margin-top:6px;">${qrEl}</div>
    </div>
    <!-- Details -->
    <div style="flex:1;font-size:9px;font-family:Arial,sans-serif;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#555;padding:3px 0;font-weight:600;white-space:nowrap;">Class / Sec.</td></tr>
        <tr><td style="color:#111;font-weight:700;font-size:11px;padding-bottom:5px;border-bottom:1px solid #eee;">${s.cls||'—'}</td></tr>
        <tr><td style="color:#555;padding:3px 0 1px;font-weight:600;">Date of Birth</td></tr>
        <tr><td style="color:#111;font-weight:700;font-size:10px;padding-bottom:5px;border-bottom:1px solid #eee;">${dob}</td></tr>
        <tr><td style="color:#555;padding:3px 0 1px;font-weight:600;">Validity</td></tr>
        <tr><td style="color:#111;font-weight:700;font-size:10px;padding-bottom:5px;border-bottom:1px solid #eee;">${validity}</td></tr>
        ${s.roll?`<tr><td style="color:#555;padding:3px 0 1px;font-weight:600;">Roll No.</td></tr><tr><td style="color:#111;font-weight:700;font-size:10px;padding-bottom:5px;border-bottom:1px solid #eee;">${s.roll}</td></tr>`:''}
        ${s.admno?`<tr><td style="color:#555;padding:3px 0 1px;font-weight:600;">Adm. No.</td></tr><tr><td style="color:#111;font-weight:700;font-size:10px;padding-bottom:5px;">${s.admno}</td></tr>`:''}
      </table>
      <div style="margin-top:auto;padding-top:6px;border-top:1px solid #eee;text-align:right;">
        <div style="font-size:11px;font-style:italic;color:${th.h1};font-family:'Times New Roman',serif;">${prin||'__________'}</div>
        <div style="font-size:7.5px;color:#777;margin-top:1px;">Principal Sign.</div>
      </div>
    </div>
  </div>
  <!-- Footer -->
  <div style="background:${th.h1};padding:4px 0;text-align:center;">
    <span style="font-size:8px;color:rgba(255,255,255,.85);letter-spacing:0.5px;">lkps-app.vercel.app</span>
  </div>
</div>`;
}

function buildBack(s, ph, logo) {
  const mob = s.fphone || s.ph || '—';
  const addr = [s.addr, s.city, s.pin ? 'Pin-'+s.pin : ''].filter(Boolean).join(', ') || 'Ishapur, Laxminagar, Yamuna Paar, Dist-Mathura, Uttar Pradesh Pin-281204, (India)';
  const row = (label, val) =>
    `<div style="margin-bottom:7px;"><span style="font-size:9.5px;color:#333;">${label}: </span><span style="font-size:9.5px;font-weight:700;color:#111;">${val}</span></div>`;

  return `<div style="width:${CARD_W}px;height:${CARD_H}px;background:#fff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.45);display:flex;flex-direction:column;">
  <!-- Info section -->
  <div style="flex:1;padding:14px 14px 8px;">
    ${s.blood ? row('Blood Group', `<b style="font-size:11px">${s.blood}</b>`) : ''}
    ${row('Contact No.', mob)}
    ${row("Father's Name", s.father||'—')}
    ${s.fphone ? row("Father's Contact No.", s.fphone) : ''}
    <div style="margin-bottom:4px;font-size:9.5px;color:#333;">Address:</div>
    <div style="font-size:9.5px;font-weight:700;color:#111;margin-bottom:10px;line-height:1.5;">${addr}</div>
    <!-- Rules -->
    <div style="font-size:9.5px;font-weight:700;color:#111;text-decoration:underline;margin-bottom:4px;">Rules to be followed:</div>
    <div style="font-size:8.5px;color:#222;line-height:1.6;">
      <div style="margin-bottom:3px;">• Always carry and display the identity card in the campus when ever asked by the officials.</div>
      <div style="margin-bottom:3px;">• The loss of this ID card must be reported immediately to HoD/PC.</div>
      <div>• This card must be returned to HoD/PC before final clearance.</div>
    </div>
  </div>
  <!-- School sketch placeholder -->
  <div style="height:70px;background:linear-gradient(180deg,#f8f8f8,#ececec);display:flex;align-items:center;justify-content:center;border-top:1px solid #ddd;border-bottom:1px solid #ddd;">
    ${logo ? `<img src="${logo}" style="height:56px;object-fit:contain;opacity:0.18;">` : `<span style="font-size:40px;opacity:0.15;">🏫</span>`}
  </div>
  <!-- Footer address -->
  <div style="background:#111;padding:7px 10px;text-align:center;">
    <div style="font-size:8px;color:#eee;line-height:1.6;">17 KM Stone, NH#2, Mathura-Delhi Road, P.O.: Chaumuhan, Mathura - 281 406 (UP) India</div>
    <div style="font-size:8px;color:#eee;">Phone: +91-5662-250900, 909</div>
  </div>
</div>`;
}

export function buildCard2Sided(s, photo, ph, yr, prin, th, logo) {
  return { front: buildFront(s, photo, ph, yr, prin, th, logo), back: buildBack(s, ph, logo) };
}

export default function IDCards(){
  const{db}=useApp();
  const[sid,setSid]=useState('');
  const[phone,setPhone]=useState('9339400600');
  const[year,setYear]=useState('2025-2026');
  const[prin,setPrin]=useState('');
  const[theme,setTheme]=useState('blue');
  const[bulkCls,setBulkCls]=useState('');
  const[search,setSearch]=useState('');
  const[filterCls,setFilterCls]=useState('');
  const[showBack,setShowBack]=useState(false);

  const th=THEMES[theme]||THEMES.blue;
  const selStu=db.students.find(x=>x.id===sid);
  const logo=null;

  const demoStu={fn:'Student',ln:'Name',cls:'—',father:'—',mother:'—',city:'',addr:'',fphone:'',ph:'',dob:'',roll:'',admno:'',blood:''};
  const previewStu = selStu || demoStu;
  const {front: frontHTML, back: backHTML} = buildCard2Sided(previewStu, selStu?db.photos[sid]||null:null, phone, year, prin, th, logo);

  const printCard=()=>{
    if(!sid){alert('Select a student');return;}
    const s=db.students.find(x=>x.id===sid);if(!s)return;
    const {front,back}=buildCard2Sided(s,db.photos[sid]||null,phone,year,prin,th,logo);
    const css=`body{margin:0;padding:20px;background:#e2e8f0;display:flex;gap:24px;justify-content:center;flex-wrap:wrap;}
    .label{font-size:10px;color:#666;text-align:center;margin-bottom:6px;font-family:Arial;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
    @media print{body{background:#fff;padding:0;gap:0;}.side{page-break-after:always;display:flex;flex-direction:column;align-items:center;padding:10px;}.label{display:none;}@page{size:${CARD_W+40}px ${CARD_H+40}px;margin:0;}}`;
    const w=window.open('','_blank','width=720,height=560');
    w.document.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body>
      <div class="side"><div class="label">Front</div>${front}</div>
      <div class="side"><div class="label">Back</div>${back}</div>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const printClass=()=>{
    if(!bulkCls){alert('Select a class');return;}
    const sts=db.students.filter(s=>s.cls===bulkCls);
    if(!sts.length){alert('No students');return;}
    const pairs = sts.map(s=>{
      const {front,back}=buildCard2Sided(s,db.photos[s.id]||null,phone,year,prin,th,logo);
      return `<div class="pair"><div class="side"><div class="lbl">Front</div>${front}</div><div class="side"><div class="lbl">Back</div>${back}</div></div>`;
    }).join('');
    const css=`*{box-sizing:border-box}body{margin:0;padding:12px;background:#e2e8f0;font-family:Arial;}
    .pair{display:flex;gap:16px;margin-bottom:20px;justify-content:center;page-break-inside:avoid;}
    .lbl{font-size:9px;color:#666;text-align:center;margin-bottom:4px;font-weight:600;text-transform:uppercase;}
    @media print{body{background:#fff;padding:8px;}.lbl{display:none;}@page{margin:8px;size:A4 landscape;}}`;
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body>${pairs}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const filtered=db.students.filter(s=>{
    const q=search.toLowerCase();
    return(!q||(s.fn+' '+s.ln+s.roll).toLowerCase().includes(q))&&(!filterCls||s.cls===filterCls);
  });

  return(<div>
    <div className="card" style={{marginBottom:13}}>
      <div className="card-head"><div className="card-title">🪪 ID Card Generator</div><div style={{fontSize:12,color:'var(--mu)'}}>2-Sided · Lord Krishna Public School</div></div>
      <div style={{padding:18,display:'flex',gap:22,flexWrap:'wrap',alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:260,maxWidth:340}}>
          <div className="form-group" style={{marginBottom:10}}><label>Student</label>
            <select className="form-control" value={sid} onChange={e=>setSid(e.target.value)}>
              <option value="">— Choose student —</option>
              {db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:10}}><label>Phone No.</label><input className="form-control" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9339400600"/></div>
          <div className="form-group" style={{marginBottom:10}}><label>Year / Validity</label><input className="form-control" value={year} onChange={e=>setYear(e.target.value)}/></div>
          <div className="form-group" style={{marginBottom:10}}><label>Principal</label><input className="form-control" value={prin} onChange={e=>setPrin(e.target.value)} placeholder="Principal name"/></div>
          <div className="form-group" style={{marginBottom:14}}><label>Theme</label>
            <select className="form-control" value={theme} onChange={e=>setTheme(e.target.value)}>
              <option value="blue">Blue (Default)</option><option value="green">Green</option><option value="maroon">Maroon/Red</option><option value="navy">Navy</option><option value="purple">Purple</option>
            </select>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:9}}>
            <button className="btn btn-primary" onClick={printCard}>🖨️ Print Card</button>
            <button className="btn btn-success" onClick={printClass}>🖨️ Print Class</button>
          </div>
          <select className="form-control" value={bulkCls} onChange={e=>setBulkCls(e.target.value)} style={{width:190}}>
            <option value="">Select class for bulk</option>
            {db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div style={{marginTop:10,fontSize:11,color:'var(--di)'}}>💡 Place logo.png in <code style={{background:'rgba(255,255,255,.08)',padding:'1px 4px',borderRadius:3}}>public/assets/</code> folder</div>
        </div>
        <div>
          <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
            <span style={{fontSize:10,color:'var(--mu)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Preview:</span>
            <button className={`btn btn-sm ${!showBack?'btn-primary':''}`} style={{opacity:showBack?.5:1}} onClick={()=>setShowBack(false)}>Front</button>
            <button className={`btn btn-sm ${showBack?'btn-primary':''}`} style={{opacity:!showBack?.5:1}} onClick={()=>setShowBack(true)}>Back</button>
          </div>
          <div dangerouslySetInnerHTML={{__html: showBack ? backHTML : frontHTML}}/>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head"><div className="card-title">All Students</div>
        <div className="card-actions">
          <div className="search-wrap"><span className="search-icon">🔍</span><input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"/></div>
          <select className="form-control" value={filterCls} onChange={e=>setFilterCls(e.target.value)} style={{width:150}}>
            <option value="">All Classes</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Class</th><th>Roll</th><th>Father</th><th>DOB</th><th>Phone</th><th>Photo</th><th>Action</th></tr></thead>
        <tbody>{filtered.length?filtered.map((s)=>(
          <tr key={s.id}>
            <td style={{display:'flex',alignItems:'center'}}>{db.photos[s.id]?<img src={db.photos[s.id]} alt="" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',marginRight:6}}/>:<span style={{width:30,height:30,display:'inline-flex',alignItems:'center',justifyContent:'center',background:'var(--bll)',borderRadius:'50%',fontSize:11,fontWeight:700,color:'var(--sk)',marginRight:6,flexShrink:0}}>{s.fn[0]}</span>}{s.fn} {s.ln}</td>
            <td><Badge color="blue">{s.cls}</Badge></td>
            <td>{s.roll}</td>
            <td style={{color:'var(--mu)'}}>{s.father||'—'}</td>
            <td style={{color:'var(--mu)'}}>{s.dob?new Date(s.dob).toLocaleDateString('en-IN'):'—'}</td>
            <td>{s.fphone||s.ph||'—'}</td>
            <td>{db.photos[s.id]?<span style={{color:'var(--gn)'}}>📷</span>:'—'}</td>
            <td><button className="btn btn-primary btn-sm" onClick={()=>setSid(s.id)}>Generate</button></td>
          </tr>
        )):<tr><td colSpan={8}><NoData icon="🪪" message="No students"/></td></tr>}</tbody>
      </table></div>
    </div>
  </div>);
}

import React,{useState} from 'react';
import {useApp,Badge,Avatar,calcGrade,gradeColor,downloadCSV,downloadJSON} from '../context/AppContext';
import {Modal,FG,Input,Select,NoData,StatCard} from '../components/UI';

// ── CLASSES ───────────────────────────────────────────────────────
export function Classes(){
  const{db,setDb,showToast}=useApp();
  const[open,setOpen]=useState(false);
  const[name,setName]=useState('');const[stream,setStream]=useState('');const[room,setRoom]=useState('');const[str,setStr]=useState('');const[subs,setSubs]=useState('');
  const save=()=>{if(!name.trim()){showToast('Name required','err');return;}setDb(d=>({...d,classes:[...d.classes,{id:'C'+Date.now(),name,stream,room,str,subs}]}));showToast('Class added');setOpen(false);setName('');setStream('');setRoom('');setStr('');setSubs('');};
  const del=id=>{if(!window.confirm('Delete?'))return;setDb(d=>({...d,classes:d.classes.filter(c=>c.id!==id)}));};
  const CLC=['bb','bg','br','by','bp'];
  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:13}}>
      <div style={{fontSize:14,fontWeight:600}}>Classes ({db.classes.length})</div>
      <button className="btn btn-primary" onClick={()=>setOpen(true)}>＋ Add Class</button>
    </div>
    {db.classes.length?<div className="g3">{db.classes.map((c,i)=>{const sc=db.students.filter(s=>s.cls===c.name).length;const tea=db.teachers.find(t=>t.cls===c.name);const sub=(c.subs||'').split(',').map(s=>s.trim()).filter(Boolean);return(<div key={c.id} className="card" style={{padding:15}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><div><div style={{fontSize:20,fontWeight:800}}>{c.name}</div><div style={{fontSize:12,color:'var(--mu)'}}>{c.stream||'General'}</div></div><span className={`badge badge-${CLC[i%5]}`}>{sc} students</span></div><div style={{fontSize:12.5,color:'var(--mu)',marginBottom:3}}>Teacher: <b style={{color:'var(--tx)'}}>{tea?tea.fn+' '+tea.ln:'—'}</b></div><div style={{fontSize:12.5,color:'var(--mu)',marginBottom:9}}>Room: {c.room||'—'}</div><div style={{marginBottom:9}}>{sub.slice(0,4).map((s,j)=><span key={j} className={`badge badge-${CLC[(i+j+1)%5]}`} style={{margin:2}}>{s}</span>)}</div><button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}>Remove</button></div>);})}</div>:<NoData icon="🏛" message="No classes yet"/>}
    <Modal open={open} onClose={()=>setOpen(false)} title="🏛 Add Class"><div className="form-grid">
      <FG label="Class Name *"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="10-A"/></FG>
      <FG label="Stream"><Input value={stream} onChange={e=>setStream(e.target.value)} placeholder="Science"/></FG>
      <FG label="Room"><Input value={room} onChange={e=>setRoom(e.target.value)} placeholder="104"/></FG>
      <FG label="Strength"><Input type="number" value={str} onChange={e=>setStr(e.target.value)} placeholder="45"/></FG>
      <FG label="Subjects (comma sep)" span><Input value={subs} onChange={e=>setSubs(e.target.value)} placeholder="Maths, Science, English"/></FG>
    </div><div className="modal-footer"><button className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div></Modal>
  </div>);
}

// ── ATTENDANCE ────────────────────────────────────────────────────
export function Attendance(){
  const{db,setDb,showToast}=useApp();
  const[cls,setCls]=useState('');const[dt,setDt]=useState(new Date().toISOString().split('T')[0]);
  const[rpt,setRpt]=useState('');const[attMap,setAttMap]=useState({});
  const sts=db.students.filter(s=>s.cls===cls);
  const saved=cls&&dt?db.att[dt]||{}:{};
  const setV=(id,v)=>setAttMap(m=>({...m,[id]:v}));
  const allP=()=>{const m={};sts.forEach(s=>m[s.id]='P');setAttMap(m);};
  const getV=id=>attMap[id]||saved[id]||'P';
  const pCount=sts.filter(s=>getV(s.id)==='P').length,aCount=sts.filter(s=>getV(s.id)==='A').length,lCount=sts.filter(s=>getV(s.id)==='L').length;
  const saveAtt=()=>{if(!cls||!dt){showToast('Select class and date','err');return;}setDb(d=>{const att={...d.att};if(!att[dt])att[dt]={};sts.forEach(s=>{att[dt][s.id]=getV(s.id);});return{...d,att};});setAttMap({});showToast('Attendance saved');};
  const rptSts=db.students.filter(s=>s.cls===rpt);
  return(<div><div className="g2">
    <div className="card"><div className="card-head"><div className="card-title">Mark Attendance</div>
      <div className="card-actions">
        <Select value={cls} onChange={e=>{setCls(e.target.value);setAttMap({})}} style={{width:140}}><option value="">Select Class</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select>
        <Input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={{width:'auto'}}/>
      </div>
    </div>
    {cls&&dt?<>
      <div style={{overflow:'auto'}}><table><thead><tr><th>Roll</th><th>Student</th><th>P</th><th>A</th><th>Late</th></tr></thead>
        <tbody>{sts.length?sts.map(s=>(<tr key={s.id}><td>{s.roll}</td><td style={{fontWeight:500}}>{s.fn} {s.ln}</td>
          {['P','A','L'].map(v=><td key={v}><input type="radio" name={`ar-${s.id}`} checked={getV(s.id)===v} onChange={()=>setV(s.id,v)}/></td>)}
        </tr>)):<tr><td colSpan={5}><NoData icon="📅" message="No students"/></td></tr>}</tbody>
      </table></div>
      <div style={{padding:'10px 13px',borderTop:'1px solid var(--br)',display:'flex',gap:7,alignItems:'center'}}>
        <button className="btn btn-success btn-sm" onClick={saveAtt}>✓ Save</button>
        <button className="btn btn-sm" onClick={allP}>All Present</button>
        <span style={{fontSize:12,color:'var(--mu)'}}>✅{pCount} ❌{aCount} ⏰{lCount}</span>
      </div>
    </>:<div style={{padding:13}}><NoData icon="📅" message="Select class and date"/></div>}
    </div>
    <div className="card"><div className="card-head"><div className="card-title">Report</div>
      <Select value={rpt} onChange={e=>setRpt(e.target.value)} style={{width:140}}><option value="">Select Class</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Student</th><th>P</th><th>A</th><th>%</th></tr></thead>
      <tbody>{rptSts.length?rptSts.map(s=>{let p=0,a=0;Object.values(db.att).forEach(d=>{const v=d[s.id];if(v==='P'||v==='L')p++;else if(v==='A')a++;});const pct=p+a>0?Math.round(p/(p+a)*100):0;return(<tr key={s.id}><td style={{fontWeight:500}}>{s.fn} {s.ln}</td><td>{p}</td><td>{a}</td><td><Badge color={pct>=90?'green':pct>=75?'yellow':'red'}>{pct}%</Badge></td></tr>);}):<tr><td colSpan={4}><NoData message="Select a class"/></td></tr>}</tbody>
    </table></div></div>
  </div></div>);
}

// ── EXAMS ─────────────────────────────────────────────────────────
export function Exams(){
  const{db,setDb,showToast}=useApp();
  const[tab,setTab]=useState(0);
  const[open,setOpen]=useState(false);
  const[form,setForm]=useState({name:'',cls:'',su:'',dt:'',mx:'100',st:'Upcoming'});
  const fe=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const saveEx=()=>{if(!form.name.trim()){showToast('Name required','err');return;}setDb(d=>({...d,exams:[...d.exams,{id:'E'+Date.now(),...form,max:parseInt(form.mx)||100}]}));setOpen(false);setForm({name:'',cls:'',su:'',dt:'',mx:'100',st:'Upcoming'});showToast('Exam added');};
  const delEx=id=>{if(!window.confirm('Delete?'))return;setDb(d=>({...d,exams:d.exams.filter(e=>e.id!==id)}));};
  const[mkEx,setMkEx]=useState('');const[mkCls,setMkCls]=useState('');
  const[grEx,setGrEx]=useState('');const[grCls,setGrCls]=useState('');
  const[rcCls,setRcCls]=useState('');
  const TABS=['📋 Schedule','✏️ Marks','🏆 Grades','📄 Report Cards'];
  const sb={Upcoming:'yellow',Scheduled:'blue',Completed:'green'};
  return(<div><div className="card"><div className="tabs" style={{padding:'0 17px'}}>{TABS.map((t,i)=><button key={i} className={`tab ${tab===i?'active':''}`} onClick={()=>setTab(i)}>{t}</button>)}</div>
    {tab===0&&<div className="tab-content"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}><span style={{color:'var(--mu)'}}>All exams</span><button className="btn btn-primary btn-sm" onClick={()=>setOpen(true)}>＋ Add</button></div>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Class</th><th>Subject</th><th>Date</th><th>Max</th><th>Status</th><th></th></tr></thead>
        <tbody>{db.exams.length?db.exams.map(e=>(<tr key={e.id}><td style={{fontWeight:600}}>{e.name}</td><td>{e.cls||'All'}</td><td>{e.su||'—'}</td><td>{e.dt||'—'}</td><td>{e.max}</td><td><Badge color={sb[e.st]||'yellow'}>{e.st}</Badge></td><td><button className="btn btn-danger btn-sm" onClick={()=>delEx(e.id)}>🗑</button></td></tr>)):<tr><td colSpan={7}><NoData icon="📝" message="No exams"/></td></tr>}</tbody>
      </table></div>
    </div>}
    {tab===1&&<MarksTab db={db} setDb={setDb} showToast={showToast}/>}
    {tab===2&&<GradesTab db={db}/>}
    {tab===3&&<ReportCardsTab db={db} showToast={showToast}/>}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="📝 Add Exam"><div className="form-grid">
      <FG label="Name *" span><Input value={form.name} onChange={fe('name')} placeholder="Unit Test 1"/></FG>
      <FG label="Class"><Select value={form.cls} onChange={fe('cls')}><option value="">All</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select></FG>
      <FG label="Subject"><Input value={form.su} onChange={fe('su')} placeholder="Mathematics"/></FG>
      <FG label="Date"><Input type="date" value={form.dt} onChange={fe('dt')}/></FG>
      <FG label="Max Marks"><Input type="number" value={form.mx} onChange={fe('mx')} placeholder="100"/></FG>
      <FG label="Status"><Select value={form.st} onChange={fe('st')}><option>Upcoming</option><option>Scheduled</option><option>Completed</option></Select></FG>
    </div><div className="modal-footer"><button className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={saveEx}>Save</button></div></Modal>
  </div>);
}

function MarksTab({db,setDb,showToast}){
  const[eid,setEid]=useState('');const[cls,setCls]=useState('');
  const ex=db.exams.find(e=>e.id===eid);const sts=db.students.filter(s=>s.cls===cls);const key=eid+'_'+cls;const saved=db.marks[key]||{};
  const setM=(sid,val)=>{setDb(d=>{const marks={...d.marks,[key]:{...d.marks[key],[sid]:parseFloat(val)||0}};return{...d,marks};});};
  return(<div className="tab-content">
    <div style={{display:'flex',gap:7,marginBottom:12}}>
      <Select value={eid} onChange={e=>setEid(e.target.value)} style={{width:200}}><option value="">Exam</option>{db.exams.map(e=><option key={e.id} value={e.id}>{e.name}{e.su?' – '+e.su:''}</option>)}</Select>
      <Select value={cls} onChange={e=>setCls(e.target.value)} style={{width:130}}><option value="">Class</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select>
    </div>
    {ex&&cls?(<><div className="table-wrap"><table><thead><tr><th>Student</th><th>Roll</th><th>Marks /{ex.max}</th><th>Grade</th></tr></thead>
      <tbody>{sts.length?sts.map(s=>{const m=saved[s.id]!==undefined?saved[s.id]:'';return(<tr key={s.id}><td style={{fontWeight:500}}>{s.fn} {s.ln}</td><td>{s.roll}</td>
        <td><Input type="number" min={0} max={ex.max} defaultValue={m} onBlur={e=>setM(s.id,e.target.value)} style={{width:80}}/></td>
        <td>{m!==''?<Badge color={gradeColor(m,ex.max)}>{calcGrade(m,ex.max)}</Badge>:'—'}</td>
      </tr>);}):<tr><td colSpan={4}><NoData message="No students"/></td></tr>}</tbody>
    </table></div>
    <div style={{padding:'10px',borderTop:'1px solid var(--br)'}}><button className="btn btn-success btn-sm" onClick={()=>showToast('Marks saved')}>✓ Save</button></div>
    </>):<NoData message="Select exam and class"/>}
  </div>);
}

function GradesTab({db}){
  const[eid,setEid]=useState('');const[cls,setCls]=useState('');
  const ex=db.exams.find(e=>e.id===eid);const sts=db.students.filter(s=>s.cls===cls);const key=eid+'_'+cls;const saved=db.marks[key]||{};
  return(<div className="tab-content">
    <div style={{display:'flex',gap:7,marginBottom:12}}>
      <Select value={eid} onChange={e=>setEid(e.target.value)} style={{width:200}}><option value="">Exam</option>{db.exams.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</Select>
      <Select value={cls} onChange={e=>setCls(e.target.value)} style={{width:130}}><option value="">Class</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select>
    </div>
    {ex&&cls?<div className="table-wrap"><table><thead><tr><th>Student</th><th>Roll</th><th>Marks /{ex.max}</th><th>%</th><th>Grade</th></tr></thead>
      <tbody>{sts.map(s=>{const m=saved[s.id]!==undefined?saved[s.id]:'N/A';const pct=m!=='N/A'?Math.round(m/ex.max*100)+'%':'—';return(<tr key={s.id}><td style={{fontWeight:500}}>{s.fn} {s.ln}</td><td>{s.roll}</td><td>{m}</td><td>{pct}</td><td>{m!=='N/A'?<Badge color={gradeColor(m,ex.max)}>{calcGrade(m,ex.max)}</Badge>:'—'}</td></tr>);})}</tbody>
    </table></div>:<NoData message="Select exam and class"/>}
  </div>);
}

function ReportCardsTab({db,showToast}){
  const[cls,setCls]=useState('');
  const gen=()=>{
    if(!cls){showToast('Select class','err');return;}
    const sts=db.students.filter(s=>s.cls===cls);if(!sts.length){showToast('No students','err');return;}
    const clsEx=db.exams.filter(e=>!e.cls||e.cls===cls);
    const sch=db.settings?.school||'LKPS',yr=db.settings?.year||'2025-2026',prin=db.settings?.prin||'';
    const w=window.open('','_blank');
    let html=`<!DOCTYPE html><html><head><title>Report Cards</title><style>body{font-family:Arial,sans-serif;padding:20px;background:#fff}.rc{border:2px solid #1a3a8f;border-radius:8px;padding:20px;margin-bottom:26px;max-width:700px;margin-left:auto;margin-right:auto;page-break-after:always}.hdr{text-align:center;border-bottom:2px solid #1a3a8f;padding-bottom:12px;margin-bottom:12px}.sch{font-size:20px;font-weight:900;color:#1a3a8f}.ttl{font-size:13px;font-weight:600;color:#1a3a8f;margin-top:8px;text-transform:uppercase}.info{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:12px;font-size:12.5px}.il{padding:4px 0;border-bottom:1px solid #eee}.ilk{font-size:10px;color:#666;text-transform:uppercase}.tbl{width:100%;border-collapse:collapse}.tbl th{background:#f0f4ff;padding:7px;font-size:12px;border:1px solid #ccc;text-align:left}.tbl td{padding:7px;border:1px solid #ccc;font-size:12.5px}.tot{background:#e6ffed;font-weight:700}.sig{display:flex;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:12px}.sl{text-align:center}.sl-ln{border-top:1px solid #333;padding-top:4px;margin-top:26px}@media print{@page{margin:12px}.rc{page-break-after:always}}</style></head><body>`;
    sts.forEach(s=>{const att=Object.values(db.att).reduce((t,d)=>{if(d[s.id]==='P'||d[s.id]==='L')t.p++;else if(d[s.id]==='A')t.a++;return t;},{p:0,a:0});const ap=att.p+att.a>0?Math.round(att.p/(att.p+att.a)*100):0;let tm=0,mx=0,rows='';clsEx.forEach(e=>{const key=e.id+'_'+cls;const m=(db.marks[key]||{})[s.id];rows+=`<tr><td>${e.name}</td><td>${e.su||'—'}</td><td>${e.dt||'—'}</td><td>${e.max}</td><td>${m!==undefined?m:'—'}</td><td>${m!==undefined?calcGrade(m,e.max):'—'}</td></tr>`;if(m!==undefined){tm+=m;mx+=e.max;}});
    html+=`<div class="rc"><div class="hdr"><div class="sch">${sch}</div><div style="font-size:12px;color:#555">${db.settings?.addr||''}</div><div class="ttl">Report Card — ${yr}</div></div><div class="info"><div class="il"><div class="ilk">Name</div>${s.fn} ${s.ln}</div><div class="il"><div class="ilk">Class/Roll</div>${s.cls}/${s.roll}</div><div class="il"><div class="ilk">Father</div>${s.father||'—'}</div><div class="il"><div class="ilk">Attendance</div>${att.p}P / ${att.a}A (${ap}%)</div></div><table class="tbl"><thead><tr><th>Exam</th><th>Subject</th><th>Date</th><th>Max</th><th>Marks</th><th>Grade</th></tr></thead><tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:#888">No exams</td></tr>'}${mx>0?`<tr class="tot"><td colspan="3">Total</td><td>${mx}</td><td>${tm}</td><td>${calcGrade(tm,mx)} (${Math.round(tm/mx*100)}%)</td></tr>`:''}</tbody></table><div class="sig"><div class="sl"><div style="height:24px"></div><div class="sl-ln">Class Teacher</div></div><div class="sl"><div style="height:24px"></div><div class="sl-ln">Principal</div></div><div class="sl"><div style="height:24px"></div><div class="sl-ln">Parent</div></div></div></div>`;});
    html+=`<script>window.onload=()=>window.print()<\/script></body></html>`;
    w.document.write(html);w.document.close();showToast('Generated');
  };
  return(<div className="tab-content"><div style={{display:'flex',gap:7,marginBottom:12}}>
    <Select value={cls} onChange={e=>setCls(e.target.value)} style={{width:160}}><option value="">Select Class</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select>
    <button className="btn btn-primary btn-sm" onClick={gen}>Generate Report Cards</button>
  </div></div>);
}

// ── TIMETABLE ─────────────────────────────────────────────────────
export function Timetable(){
  const{db,setDb,showToast}=useApp();
  const[cls,setCls]=useState('');const[open,setOpen]=useState(false);const[editId,setEditId]=useState(null);
  const[form,setForm]=useState({cls:'',day:'Monday',sid:'',ty:'subject',su:'',tea:'',rm:''});
  const fe=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const TTC={a:{bg:'rgba(56,139,253,.2)',fg:'#79c0ff'},b:{bg:'rgba(63,185,80,.2)',fg:'#56d364'},c:{bg:'rgba(248,81,73,.2)',fg:'#ffa198'},d:{bg:'rgba(210,153,34,.2)',fg:'#f0c040'},e:{bg:'rgba(188,140,255,.2)',fg:'#d2a8ff'},f:{bg:'rgba(121,192,255,.2)',fg:'#79c0ff'},g:{bg:'rgba(255,255,255,.06)',fg:'#8b949e'}};const TTCK=Object.keys(TTC);
  const pers=db.tt.filter(p=>p.cls===cls);const scm={};let ci=0;pers.forEach(p=>{if(p.su&&!scm[p.su]){scm[p.su]=TTCK[ci%TTCK.length];ci++;}});
  const openPer=(day,sid)=>{setForm(f=>({...f,cls,day,sid,ty:'subject',su:'',tea:'',rm:''}));setEditId(null);setOpen(true);};
  const editPer=pid=>{const p=db.tt.find(x=>x.id===pid);if(!p)return;setForm({...p});setEditId(pid);setOpen(true);};
  const savePer=()=>{if(!form.cls||(!form.su&&form.ty==='subject')||!form.sid){showToast('Fill required fields','err');return;}const id=editId||'P'+Date.now();const p={...form,id};setDb(d=>{let tt=d.tt.filter(x=>!(x.cls===form.cls&&x.day===form.day&&x.sid===form.sid&&(!editId||x.id!==editId)));tt.push(p);return{...d,tt};});setOpen(false);showToast('Saved');};
  const clearTT=()=>{if(!cls||!window.confirm('Clear?'))return;setDb(d=>({...d,tt:d.tt.filter(p=>p.cls!==cls)}));showToast('Cleared','err');};
  return(<div><div className="card">
    <div style={{display:'flex',gap:8,flexWrap:'wrap',padding:'12px 15px',borderBottom:'1px solid var(--br)',alignItems:'center'}}>
      <Select value={cls} onChange={e=>setCls(e.target.value)} style={{width:160}}><option value="">Select Class</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select>
      <button className="btn btn-primary btn-sm" onClick={()=>{setForm(f=>({...f,cls,ty:'subject',su:'',tea:'',rm:''}));setEditId(null);setOpen(true);}}>＋ Period</button>
      <button className="btn btn-danger btn-sm" onClick={clearTT}>🗑 Clear</button>
      <span style={{fontSize:11.5,color:'var(--mu)'}}>{pers.length} periods</span>
    </div>
    <div style={{overflowX:'auto',padding:13}}>
      <div className="tt-grid" style={{gridTemplateColumns:`90px repeat(${DAYS.length},1fr)`}}>
        <div className="tt-head">Time</div>{DAYS.map(d=><div key={d} className="tt-head">{d.slice(0,3)}</div>)}
        {db.slots.map(sl=>[
          <div key={sl.id+'t'} className="tt-time"><div style={{fontWeight:600,fontSize:11}}>{sl.l}</div><div style={{fontSize:9,opacity:.6}}>{sl.s}–{sl.e}</div></div>,
          ...DAYS.map(day=>{const p=pers.find(x=>x.day===day&&x.sid===sl.id);if(p){let ck=scm[p.su]||'g';if(p.ty==='break')ck='d';else if(p.ty==='assembly')ck='f';else if(p.ty==='free')ck='g';const{bg,fg}=TTC[ck]||TTC.g;const lb=p.ty==='break'?'☕ Break':p.ty==='assembly'?'🎺 Assembly':p.ty==='free'?'📖 Free':p.su||'—';return(<div key={day} className="tt-cell" style={{background:bg,color:fg}} onClick={()=>editPer(p.id)}><div className="tt-cell-subject">{lb}</div>{p.tea&&<div className="tt-cell-teacher">{p.tea.split(' ').pop()}</div>}</div>);}return(<div key={day} className="tt-cell tt-cell-empty" onClick={()=>openPer(day,sl.id)}>＋</div>);})
        ])}
      </div>
    </div>
    <div style={{display:'flex',gap:9,flexWrap:'wrap',padding:'9px 15px',borderTop:'1px solid var(--br)'}}>
      {Object.keys(scm).map(su=>{const{bg,fg}=TTC[scm[su]]||TTC.g;return(<div key={su} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--mu)'}}><div style={{width:10,height:10,borderRadius:2,background:bg,border:`1px solid ${fg}`}}/>{su}</div>);})}
    </div>
  </div>
  <Modal open={open} onClose={()=>setOpen(false)} title="🕐 Add Period"><div className="form-grid">
    <FG label="Class *"><Select value={form.cls} onChange={fe('cls')}><option value="">—</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select></FG>
    <FG label="Day *"><Select value={form.day} onChange={fe('day')}>{DAYS.map(d=><option key={d}>{d}</option>)}</Select></FG>
    <FG label="Time Slot *"><Select value={form.sid} onChange={fe('sid')}>{db.slots.map(s=><option key={s.id} value={s.id}>{s.l} ({s.s}–{s.e})</option>)}</Select></FG>
    <FG label="Type"><Select value={form.ty} onChange={fe('ty')}><option value="subject">Subject</option><option value="break">Break</option><option value="assembly">Assembly</option><option value="free">Free</option></Select></FG>
    {form.ty==='subject'&&<><FG label="Subject *"><Input value={form.su} onChange={fe('su')} placeholder="Mathematics"/></FG>
    <FG label="Teacher"><Select value={form.tea} onChange={fe('tea')}><option value="">—</option>{db.teachers.map(t=><option key={t.id} value={t.fn+' '+t.ln}>{t.fn} {t.ln}{t.su?' ('+t.su+')':''}</option>)}</Select></FG></>}
    <FG label="Room"><Input value={form.rm} onChange={fe('rm')}/></FG>
  </div><div className="modal-footer"><button className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={savePer}>Save</button></div></Modal>
  </div>);
}

// ── REPORTS ───────────────────────────────────────────────────────
export function Reports(){
  const{db,setDb,showToast,paid}=useApp();
  const expStu=()=>{const rows=[['Name','Roll','Class','Father','Mother','Phone','Blood','DOB','Annual Fee','Paid','Balance','Status']];db.students.forEach(s=>{const p=paid(s.id);rows.push([s.fn+' '+s.ln,s.roll,s.cls,s.father||'',s.mother||'',s.fphone||'',s.blood||'',s.dob||'',s.fee,p,s.fee-p,s.fst]);});downloadCSV('lkps_students.csv',rows);showToast('Exported');};
  const expTea=()=>{const rows=[['Name','EmpID','Subject','Class','Phone','Salary','Status']];db.teachers.forEach(t=>rows.push([t.fn+' '+t.ln,t.empId||'',t.su||'',t.cls||'',t.ph||'',t.sal||0,t.status||'']));downloadCSV('lkps_teachers.csv',rows);showToast('Exported');};
  const expFee=()=>{const rows=[['Student','Class','Annual','Paid','Balance','Status']];db.students.forEach(s=>{const p=paid(s.id);rows.push([s.fn+' '+s.ln,s.cls,s.fee,p,s.fee-p,s.fst]);});downloadCSV('lkps_fees.csv',rows);showToast('Exported');};
  const expPays=()=>{const rows=[['Date','Receipt','Student','Class','Type','Month','Amount','Method','Balance','Notes']];db.pays.forEach(p=>rows.push([p.dt,p.rc,p.nm,p.cls,p.ty||'',p.mn||'',p.amt,p.md,p.ba||0,p.note||'']));downloadCSV('lkps_payments.csv',rows);showToast('Exported');};
  const expAtt=()=>{const rows=[['Date','Student','Class','Status']];Object.entries(db.att).forEach(([dt,d])=>Object.entries(d).forEach(([sid,v])=>{const s=db.students.find(x=>x.id===sid);if(s)rows.push([dt,s.fn+' '+s.ln,s.cls,v==='P'?'Present':v==='L'?'Late':'Absent']);}));downloadCSV('lkps_attendance.csv',rows);showToast('Exported');};
  const expGrades=()=>{const rows=[['Exam','Subject','Class','Student','Marks','Max','%','Grade']];db.exams.forEach(e=>{const cls=e.cls?[e.cls]:db.classes.map(c=>c.name);cls.forEach(c=>{const key=e.id+'_'+c,sv=db.marks[key]||{};db.students.filter(s=>s.cls===c).forEach(s=>{const m=sv[s.id]!==undefined?sv[s.id]:'';rows.push([e.name,e.su||'',c,s.fn+' '+s.ln,m,e.max,m!==''?Math.round(m/e.max*100)+'%':'—',m!==''?calcGrade(m,e.max):'—']);});});});downloadCSV('lkps_grades.csv',rows);showToast('Exported');};
  const backup=()=>{downloadJSON('lkps_backup.json',db);showToast('Backup exported');};
  const restore=()=>{const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=x=>{try{const d=JSON.parse(x.target.result);if(!window.confirm('Replace ALL data?'))return;setDb(prev=>({...prev,...d}));showToast('Restored');}catch(err){showToast('Invalid file','err');}};r.readAsText(f);};input.click();};
  const CARDS=[['📄','Students CSV','Full student list','green',expStu],['👩‍🏫','Teachers CSV','Staff directory','blue',expTea],['💰','Fee Report','Fee status','yellow',expFee],['🧾','Payments CSV','All transactions','green',expPays],['📅','Attendance CSV','Daily records','purple',expAtt],['📊','Grades CSV','Exam marks','blue',expGrades],['💾','Backup','Export JSON','gray',backup],['📂','Restore','Import JSON','yellow',restore]];
  const all=Object.values(db.att).flatMap(d=>Object.values(d));const p=all.filter(v=>v==='P'||v==='L').length,a=all.filter(v=>v==='A').length;
  return(<div>
    <div className="g3" style={{marginBottom:14}}>{CARDS.map(([icon,label,sub,color,fn])=>(<div key={label} className="card" style={{padding:17,cursor:'pointer'}} onClick={fn}><div style={{fontSize:24,marginBottom:9}}>{icon}</div><div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{label}</div><div style={{fontSize:12,color:'var(--mu)',marginBottom:9}}>{sub}</div><Badge color={color}>Export</Badge></div>))}</div>
    <div className="card"><div className="card-head"><div className="card-title">Summary</div></div>
      <div className="card-body"><div className="g4">
        {[['Students',db.students.length],['Teachers',db.teachers.length],['Classes',db.classes.length],['Attendance',(p+a>0?Math.round(p/(p+a)*100):0)+'%'],['Collected','₹'+db.pays.reduce((s,p)=>s+p.amt,0).toLocaleString()],['Exams',db.exams.length],['Payments',db.pays.length],['Periods',db.tt.length]].map(([l,v])=>(
          <div key={l} className="stat-card"><div className="stat-value">{v}</div><div className="stat-label">{l}</div></div>
        ))}
      </div></div>
    </div>
  </div>);
}

// ── SETTINGS ──────────────────────────────────────────────────────
export function Settings(){
  const{db,setDb,session,showToast}=useApp();
  const[cpOld,setCpOld]=useState('');const[cpNew,setCpNew]=useState('');const[cpConf,setCpConf]=useState('');
  const[auUser,setAuUser]=useState('');const[auName,setAuName]=useState('');const[auPass,setAuPass]=useState('');const[auRole,setAuRole]=useState('Admin');
  const upd=k=>e=>setDb(d=>({...d,settings:{...d.settings,[k]:e.target.value}}));
  const chpw=()=>{if(!cpOld||!cpNew||!cpConf){showToast('Fill all','err');return;}const a=db.admins.find(x=>x.username===session.user.username);if(!a||a.password!==cpOld){showToast('Wrong current password','err');return;}if(cpNew!==cpConf){showToast('Passwords do not match','err');return;}if(cpNew.length<6){showToast('Min 6 chars','err');return;}setDb(d=>({...d,admins:d.admins.map(x=>x.id===a.id?{...x,password:cpNew}:x)}));setCpOld('');setCpNew('');setCpConf('');showToast('Password updated');};
  const addUser=()=>{if(!auUser||!auPass){showToast('Username & password required','err');return;}if(auPass.length<6){showToast('Min 6 chars','err');return;}if(db.admins.find(a=>a.username===auUser)){showToast('Username exists','err');return;}setDb(d=>({...d,admins:[...d.admins,{id:Date.now(),username:auUser,name:auName||auUser,password:auPass,role:auRole}]}));setAuUser('');setAuName('');setAuPass('');showToast('User added');};
  const delUser=u=>{if(!window.confirm('Remove "'+u+'"?'))return;setDb(d=>({...d,admins:d.admins.filter(a=>a.username!==u)}));};
  const sets=db.settings||{};
  return(<div>
    <div className="card" style={{padding:20,marginBottom:13}}>
      <div style={{fontSize:14,fontWeight:600,marginBottom:13,paddingBottom:9,borderBottom:'1px solid var(--br)'}}>🏫 School Info</div>
      <div className="form-grid">
        <FG label="School Name"><Input value={sets.school||''} onChange={upd('school')}/></FG>
        <FG label="Year"><Input value={sets.year||''} onChange={upd('year')}/></FG>
        <FG label="Principal"><Input value={sets.prin||''} onChange={upd('prin')}/></FG>
        <FG label="Phone"><Input value={sets.phone||''} onChange={upd('phone')}/></FG>
        <FG label="Address" span><Input value={sets.addr||''} onChange={upd('addr')}/></FG>
      </div>
    </div>
    <div className="card" style={{padding:20,marginBottom:13}}>
      <div style={{fontSize:14,fontWeight:600,marginBottom:13,paddingBottom:9,borderBottom:'1px solid var(--br)'}}>👤 Admin Accounts</div>
      {db.admins.map((a,i)=>(<div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--br)'}}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={a.name||a.username} index={i}/><strong>{a.name||a.username}</strong></div><Badge color="blue">{a.role}</Badge><span style={{fontSize:11,color:'var(--di)'}}>@{a.username}</span>{a.username!=='admin'?<button className="btn btn-danger btn-sm" onClick={()=>delUser(a.username)}>Remove</button>:<span style={{fontSize:11,color:'var(--di)'}}>Default</span>}</div>))}
      <div style={{marginTop:12,display:'flex',gap:7,flexWrap:'wrap'}}>
        <Input value={auUser} onChange={e=>setAuUser(e.target.value)} placeholder="Username" style={{width:130}}/>
        <Input value={auName} onChange={e=>setAuName(e.target.value)} placeholder="Display name" style={{width:130}}/>
        <Input type="password" value={auPass} onChange={e=>setAuPass(e.target.value)} placeholder="Password" style={{width:130}}/>
        <Select value={auRole} onChange={e=>setAuRole(e.target.value)} style={{width:110}}><option>Admin</option><option>Accountant</option></Select>
        <button className="btn btn-primary btn-sm" onClick={addUser}>＋ Add</button>
      </div>
    </div>
    <div className="card" style={{padding:20}}>
      <div style={{fontSize:14,fontWeight:600,marginBottom:13,paddingBottom:9,borderBottom:'1px solid var(--br)'}}>🔒 Change Password</div>
      <div className="form-grid">
        <FG label="Current"><Input type="password" value={cpOld} onChange={e=>setCpOld(e.target.value)}/></FG>
        <FG label="New"><Input type="password" value={cpNew} onChange={e=>setCpNew(e.target.value)}/></FG>
        <FG label="Confirm"><Input type="password" value={cpConf} onChange={e=>setCpConf(e.target.value)}/></FG>
      </div>
      <div style={{marginTop:11}}><button className="btn btn-primary btn-sm" onClick={chpw}>Update</button></div>
    </div>
  </div>);
}

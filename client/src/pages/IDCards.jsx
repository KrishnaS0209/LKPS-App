import React,{useState} from 'react';
import {useApp,Badge} from '../context/AppContext';
import {NoData} from '../components/UI';

const THEMES={blue:{h1:'#1a3a8f',h2:'#2255c4'},green:{h1:'#065f46',h2:'#10b981'},maroon:{h1:'#7f1d1d',h2:'#dc2626'},navy:{h1:'#0f172a',h2:'#334155'},purple:{h1:'#4c1d95',h2:'#8b5cf6'}};

function buildCard(s,photo,ph,yr,prin,th,big,logo){
  const dob=s.dob?new Date(s.dob).toLocaleDateString('en-IN'):'—';
  const mob=s.fphone||s.ph||'—';
  const addr=s.addr?(s.addr+(s.city?', '+s.city:'')+(s.pin?'-'+s.pin:'')):'—';
  const w=big?300:280;
  const logoEl=logo?`<img src="${logo}" style="width:${big?46:40}px;height:${big?46:40}px;object-fit:contain;flex-shrink:0;border-radius:4px;background:#fff;padding:2px;">`:`<div style="width:${big?46:40}px;height:${big?46:40}px;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:${big?20:16}px;flex-shrink:0">🏫</div>`;
  const phEl=photo?`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;">`:`<span style="font-size:${big?28:22}px;font-weight:900;color:#94a3b8">${((s.fn||'?')[0]).toUpperCase()}</span>`;
  return `<div style="width:${w}px;background:#fff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;${big?'box-shadow:0 16px 48px rgba(0,0,0,.5);':'border:1px solid #ccc;page-break-inside:avoid;'}">
  <div style="background:linear-gradient(180deg,${th.h1} 0%,${th.h2} 100%);padding:12px 13px 22px;position:relative;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">${logoEl}
      <div><div style="font-size:${big?14:12}px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.3);font-family:'Arial Black',Arial,sans-serif;text-transform:uppercase">LORD KRISHNA PUBLIC SCHOOL</div>
      <div style="font-size:${big?8.5:7.5}px;color:rgba(255,255,255,.85);margin-top:2px;">Ishapur, Laxminagar, Mathura</div>
      ${ph?`<div style="font-size:${big?8.5:7.5}px;font-weight:700;color:rgba(255,255,255,.9);margin-top:1px;">Ph.: ${ph}</div>`:''}
      </div>
    </div>
    <div style="position:absolute;bottom:-1px;left:0;right:0;height:26px;overflow:hidden;">
      <svg viewBox="0 0 300 26" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M0,26 L0,10 Q75,0 150,13 Q225,26 300,10 L300,26 Z" fill="#fff"/></svg>
    </div>
  </div>
  <div style="background:#fff;padding:4px 13px 11px;">
    <div style="display:flex;justify-content:center;margin-bottom:5px;margin-top:3px;">
      <div style="width:${big?88:78}px;height:${big?106:94}px;border:3px solid ${th.h1};border-radius:4px;overflow:hidden;background:#e8f0ff;display:flex;align-items:center;justify-content:center;">${phEl}</div>
    </div>
    <div style="text-align:center;font-size:${big?16:14}px;font-weight:700;color:#1a1a1a;margin-bottom:7px;">${s.fn} ${s.ln}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:5px;">
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:${big?9.5:8.5}px;font-weight:600;color:#333;padding:2.5px 4px 2.5px 0;width:82px;">Father's Name</td><td style="font-size:${big?9.5:8.5}px;color:#1a1a1a;padding:2.5px 0;font-weight:500;">${s.father||'—'}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:${big?9.5:8.5}px;font-weight:600;color:#333;padding:2.5px 4px 2.5px 0;">Mother's Name</td><td style="font-size:${big?9.5:8.5}px;color:#1a1a1a;padding:2.5px 0;font-weight:500;">${s.mother||'—'}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:${big?9.5:8.5}px;font-weight:600;color:#333;padding:2.5px 4px 2.5px 0;">D.O.B.</td><td style="font-size:${big?9.5:8.5}px;color:#1a1a1a;padding:2.5px 0;font-weight:500;">${dob}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:${big?9.5:8.5}px;font-weight:600;color:#333;padding:2.5px 4px 2.5px 0;">Contact No.</td><td style="font-size:${big?9.5:8.5}px;color:#1a1a1a;padding:2.5px 0;font-weight:500;">${mob}</td></tr>
    </table>
    <div style="font-size:${big?8.5:7.5}px;color:#333;margin-bottom:7px;"><b>Add.:</b> ${addr}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #e2e8f0;padding-top:5px;">
      <div style="font-size:${big?10:9}px;font-weight:700;color:#1a1a1a;">Class : ${s.cls||'—'}</div>
      <div style="text-align:right;"><div style="font-size:${big?11:10}px;font-style:italic;color:${th.h1};font-family:'Times New Roman',serif;">${prin||'__________'}</div><div style="font-size:${big?8.5:7.5}px;color:#555;margin-top:1px;">Principal Sign.</div></div>
    </div>
  </div>
  <div style="background:linear-gradient(90deg,${th.h1},${th.h2});height:5px;"></div>
</div>`;
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

  const th=THEMES[theme]||THEMES.blue;
  const selStu=db.students.find(x=>x.id===sid);
  const logo=null; // Will be loaded from public/assets/logo.png

  const cardHTML=selStu?buildCard(selStu,db.photos[sid]||null,phone,year,prin,th,true,logo)
    :buildCard({fn:'Student',ln:'Name',cls:'—',father:'—',mother:'—',city:'',addr:'',fphone:'',ph:'',dob:''},null,phone,year,prin,th,true,logo);

  const printCard=()=>{
    if(!sid){alert('Select a student');return;}
    const s=db.students.find(x=>x.id===sid);if(!s)return;
    const css='body{margin:0;padding:20px;background:#e2e8f0;display:flex;justify-content:center;}@media print{body{background:#fff;padding:0;}@page{size:310px 490px;margin:0;}}';
    const w=window.open('','_blank','width=360,height=540');
    w.document.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body>${buildCard(s,db.photos[sid]||null,phone,year,prin,th,true,logo)}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const printClass=()=>{
    if(!bulkCls){alert('Select a class');return;}
    const sts=db.students.filter(s=>s.cls===bulkCls);
    if(!sts.length){alert('No students');return;}
    const cards=sts.map(s=>buildCard(s,db.photos[s.id]||null,phone,year,prin,th,false,logo)).join('');
    const css='body{margin:0;padding:16px;background:#e2e8f0;}.grid{display:grid;grid-template-columns:repeat(2,280px);gap:16px;justify-content:center;}@media print{body{background:#fff;}@page{margin:8px;}}';
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const filtered=db.students.filter(s=>{
    const q=search.toLowerCase();
    return(!q||(s.fn+' '+s.ln+s.roll).toLowerCase().includes(q))&&(!filterCls||s.cls===filterCls);
  });

  return(<div>
    <div className="card" style={{marginBottom:13}}>
      <div className="card-head"><div className="card-title">🪪 ID Card Generator</div><div style={{fontSize:12,color:'var(--mu)'}}>Lord Krishna Public School</div></div>
      <div style={{padding:18,display:'flex',gap:22,flexWrap:'wrap',alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:260,maxWidth:340}}>
          <div className="form-group" style={{marginBottom:10}}><label>Student</label>
            <select className="form-control" value={sid} onChange={e=>setSid(e.target.value)}>
              <option value="">— Choose student —</option>
              {db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:10}}><label>Phone No.</label><input className="form-control" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9339400600"/></div>
          <div className="form-group" style={{marginBottom:10}}><label>Year</label><input className="form-control" value={year} onChange={e=>setYear(e.target.value)}/></div>
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
          <div style={{fontSize:10,color:'var(--mu)',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Live Preview</div>
          <div dangerouslySetInnerHTML={{__html:cardHTML}}/>
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
        <tbody>{filtered.length?filtered.map((s,i)=>(
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

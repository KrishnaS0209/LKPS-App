import React,{useState} from 'react';
import {useApp} from '../context/AppContext';
import {FG,Input,Select} from '../components/UI';

const LOGO_PATH='assets/logo.png';

function getAttStats(db,sid){let p=0,t=0;Object.values(db.att).forEach(d=>{if(d[sid]!==undefined){t++;if(d[sid]==='P'||d[sid]==='L')p++;}});return{p,t,pct:t>0?Math.round(p/t*100):0};}

function certHeader(school,addr,ph){
  return `<div style="text-align:center;border-bottom:3px double #1a3a8f;padding-bottom:14px;margin-bottom:18px;">
    <img src="${LOGO_PATH}" style="width:70px;height:70px;object-fit:contain;margin-bottom:6px;" onerror="this.style.display='none'">
    <div style="font-size:22px;font-weight:900;color:#1a3a8f;font-family:'Arial Black',Arial">${school}</div>
    <div style="font-size:12px;font-style:italic;color:#555;">(Govt. Recognised)</div>
    <div style="font-size:11.5px;color:#444;margin-top:3px;">${addr}</div>
    ${ph?`<div style="font-size:11.5px;color:#444;">Ph.: ${ph}</div>`:''}
  </div>`;
}

export default function Certificates(){
  const{db}=useApp();
  const sch=db.settings?.school||'LORD KRISHNA PUBLIC SCHOOL';
  const addr=db.settings?.addr||'Ishapur, Laxminagar, Mathura';
  const ph=db.settings?.phone||'';
  const prin=db.settings?.prin||'';
  const yr=db.settings?.year||'2025-2026';

  // TC state
  const[tcStu,setTcStu]=useState('');const[tcNo,setTcNo]=useState('');const[tcDt,setTcDt]=useState('');const[tcLd,setTcLd]=useState('');
  const[tcRs,setTcRs]=useState("Parents' Transfer");const[tcCo,setTcCo]=useState('Good');const[tcFe,setTcFe]=useState('All Dues Cleared');
  // CC state
  const[ccStu,setCcStu]=useState('');const[ccNo,setCcNo]=useState('');const[ccDt,setCcDt]=useState('');
  const[ccCo,setCcCo]=useState('Good');const[ccPu,setCcPu]=useState('General Purpose');const[ccRm,setCcRm]=useState('');

  const tcS=db.students.find(x=>x.id===tcStu);
  const ccS=db.students.find(x=>x.id===ccStu);

  const printTC=()=>{
    if(!tcS){alert('Select a student');return;}
    const at=getAttStats(db,tcStu);const photo=db.photos[tcStu]||null;
    const dob=tcS.dob?new Date(tcS.dob).toLocaleDateString('en-IN'):'—';
    const issueDate=tcDt||new Date().toLocaleDateString('en-IN');
    const w=window.open('','_blank','width=820,height=1020');
    w.document.write(`<!DOCTYPE html><html><head><title>TC</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px}.cert{background:#fff;max-width:720px;margin:0 auto;padding:32px 40px;border:1px solid #ccc;box-shadow:0 4px 16px rgba(0,0,0,.1)}.ttl{font-size:18px;font-weight:800;color:#1a3a8f;text-align:center;margin:14px 0;text-transform:uppercase;text-decoration:underline}.no{text-align:right;font-size:12px;color:#555;margin-bottom:13px}.ph{float:right;margin:0 0 12px 20px;border:2px solid #1a3a8f;width:90px;height:110px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#e8f0ff}.body{font-size:13px;line-height:1.9;color:#222}.tbl{width:100%;border-collapse:collapse;margin:13px 0;font-size:13px}.tbl td{padding:6px 8px;border:1px solid #ccc}.tbl td:first-child{font-weight:600;background:#f0f4ff;width:200px;color:#1a3a8f}.foot{margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end}.sl{text-align:center}.sl-nm{font-size:12px;font-weight:600;margin-top:36px;border-top:1px solid #333;padding-top:4px}@media print{body{background:#fff;padding:0}.cert{box-shadow:none;border:1px solid #999;max-width:100%}@page{margin:12px;size:A4}}</style></head><body>
    <div class="cert">${certHeader(sch,addr,ph)}<div class="ttl">Transfer Certificate</div>
    <div class="no"><b>TC No.:</b> ${tcNo||'TC-'+Date.now()} &nbsp; <b>Date:</b> ${issueDate}</div>
    ${photo?`<div class="ph"><img src="${photo}" style="width:100%;height:100%;object-fit:cover;"></div>`:`<div class="ph"><div style="text-align:center;font-size:10px;color:#94a3b8;padding:10px">No Photo</div></div>`}
    <div class="body">This is to certify that <b>${tcS.fn} ${tcS.ln}</b>, Son/Daughter of <b>${tcS.father||'—'}</b> and <b>${tcS.mother||'—'}</b>, was a bonafide student of this school.</div>
    <table class="tbl">
      <tr><td>Student Name</td><td>${tcS.fn} ${tcS.ln}</td></tr>
      <tr><td>Father's Name</td><td>${tcS.father||'—'}</td></tr>
      <tr><td>Mother's Name</td><td>${tcS.mother||'—'}</td></tr>
      <tr><td>Date of Birth</td><td>${dob}</td></tr>
      <tr><td>Class Last Studied</td><td>${tcS.cls||'—'}</td></tr>
      <tr><td>Roll Number</td><td>${tcS.roll||'—'}</td></tr>
      <tr><td>Admission No.</td><td>${tcS.admno||'—'}</td></tr>
      ${tcLd?`<tr><td>Last Attendance</td><td>${new Date(tcLd).toLocaleDateString('en-IN')}</td></tr>`:''}
      <tr><td>Attendance</td><td>${at.pct}% (${at.p} days / ${at.t} total)</td></tr>
      <tr><td>Conduct</td><td><b>${tcCo}</b></td></tr>
      <tr><td>Reason for Leaving</td><td>${tcRs}</td></tr>
      <tr><td>Fee Status</td><td>${tcFe}</td></tr>
      <tr><td>Aadhaar</td><td>${tcS.aadhar||'—'}</td></tr>
    </table>
    <div class="body">We wish the student all the best in future endeavours.</div>
    <div class="foot">
      <div class="sl"><div class="sl-nm">Class Teacher</div></div>
      <div class="sl"><div class="sl-nm">Exam In-charge</div></div>
      <div class="sl"><div style="font-size:12px;font-style:italic;color:#1a3a8f;margin-bottom:3px">${prin}</div><div class="sl-nm">Principal</div><div style="font-size:11px;color:#555;margin-top:3px">${sch}</div></div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:9px">Generated: ${new Date().toLocaleDateString('en-IN')} | ${yr}</div>
    </div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const printCC=()=>{
    if(!ccS){alert('Select a student');return;}
    const at=getAttStats(db,ccStu);const photo=db.photos[ccStu]||null;
    const ctm={Good:'good character and conduct','Very Good':'very good character and conduct',Excellent:'excellent character and conduct',Satisfactory:'satisfactory conduct'};
    const w=window.open('','_blank','width=820,height=960');
    w.document.write(`<!DOCTYPE html><html><head><title>CC</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px}.cert{background:#fff;max-width:680px;margin:0 auto;padding:36px 44px;border:2px solid #1a3a8f;box-shadow:0 4px 16px rgba(0,0,0,.1)}.ttl{font-size:20px;font-weight:900;color:#1a3a8f;text-align:center;margin:13px 0;text-decoration:underline double;letter-spacing:1px}.no{text-align:right;font-size:12px;color:#666;margin-bottom:16px}.ph{float:right;margin:0 0 12px 24px;border:2px solid #1a3a8f;width:100px;height:120px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#e8f0ff}.body{font-size:14px;line-height:2;color:#222;text-align:justify}.body b{color:#1a3a8f}.seal{display:flex;justify-content:space-between;align-items:flex-end;margin-top:34px}.slk{text-align:center;min-width:155px}.sll{font-size:12px;font-weight:600;margin-top:36px;border-top:1px solid #333;padding-top:4px}@media print{body{background:#fff;padding:0}.cert{box-shadow:none;border:2px solid #1a3a8f;max-width:100%}@page{margin:12px;size:A4}}</style></head><body>
    <div class="cert">${certHeader(sch,addr,ph)}<div class="ttl">Character Certificate</div>
    <div class="no"><b>Cert. No.:</b> ${ccNo||'CC-'+Date.now()} &nbsp; <b>Date:</b> ${ccDt||new Date().toLocaleDateString('en-IN')}</div>
    ${photo?`<div class="ph"><img src="${photo}" style="width:100%;height:100%;object-fit:cover;"></div>`:`<div class="ph"><div style="text-align:center;font-size:10px;color:#94a3b8;padding:10px">No Photo</div></div>`}
    <div class="body">
      <p>This is to certify that <b>${ccS.fn} ${ccS.ln}</b>, Son/Daughter of <b>${ccS.father||'—'}</b>, residing at <b>${[ccS.addr,ccS.city,ccS.pin].filter(Boolean).join(', ')||'—'}</b>, was a bonafide student of <b>${sch}</b> during the academic year <b>${yr}</b>.</p>
      <br><p>During the period of study in Class <b>${ccS.cls}</b>, the student has shown <b>${ctm[ccCo]||'good character and conduct'}</b>. Attendance: <b>${at.pct}%</b>. The student has been regular and disciplined.</p>
      ${ccRm?`<br><p>${ccRm}</p>`:''}
      <br><p>This certificate is issued for <b>${ccPu}</b> as per the request of the student/parent.</p>
    </div>
    <div class="seal">
      <div style="text-align:center"><div style="width:76px;height:76px;border:2px dashed #1a3a8f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#1a3a8f;font-weight:600;text-align:center;padding:6px">SCHOOL<br>SEAL</div></div>
      <div class="slk"><div class="sll">Class Teacher</div></div>
      <div class="slk"><div style="font-size:13px;font-style:italic;color:#1a3a8f;margin-bottom:3px">${prin}</div><div class="sll">Principal</div></div>
    </div>
    <div style="text-align:center;margin-top:14px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:8px">Generated: ${new Date().toLocaleDateString('en-IN')} | ${yr}</div>
    </div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const StuInfo=({s})=>s?(<div style={{background:'rgba(13,17,23,.5)',borderRadius:'var(--r)',padding:10,marginBottom:11,border:'1px solid var(--br)'}}>
    <div style={{fontSize:13,fontWeight:600}}>{s.fn} {s.ln}</div>
    <div style={{fontSize:12,color:'var(--mu)'}}>Class: {s.cls} | Roll: {s.roll} | Father: {s.father||'—'}</div>
  </div>):null;

  return(<div><div className="g2" style={{marginBottom:13}}>
    <div className="card"><div className="card-head"><div className="card-title">📜 Transfer Certificate</div></div>
      <div style={{padding:15}}>
        <div className="form-group" style={{marginBottom:11}}><label>Student *</label>
          <select className="form-control" value={tcStu} onChange={e=>setTcStu(e.target.value)}>
            <option value="">— Select —</option>{db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
          </select>
        </div>
        <StuInfo s={tcS}/>
        <div className="form-grid" style={{marginBottom:11}}>
          <FG label="TC Number"><Input value={tcNo} onChange={e=>setTcNo(e.target.value)} placeholder="TC-2025-001"/></FG>
          <FG label="Issue Date"><Input type="date" value={tcDt} onChange={e=>setTcDt(e.target.value)}/></FG>
          <FG label="Reason"><Select value={tcRs} onChange={e=>setTcRs(e.target.value)}><option>Parents' Transfer</option><option>Change of Residence</option><option>Admission to Other School</option><option>Completion of Studies</option><option>Family Reasons</option></Select></FG>
          <FG label="Last Date"><Input type="date" value={tcLd} onChange={e=>setTcLd(e.target.value)}/></FG>
          <FG label="Conduct"><Select value={tcCo} onChange={e=>setTcCo(e.target.value)}><option>Good</option><option>Very Good</option><option>Excellent</option><option>Satisfactory</option></Select></FG>
          <FG label="Fee Status"><Select value={tcFe} onChange={e=>setTcFe(e.target.value)}><option>All Dues Cleared</option><option>Dues Pending</option></Select></FG>
        </div>
        <button className="btn btn-primary" onClick={printTC}>🖨️ Generate Transfer Certificate</button>
      </div>
    </div>

    <div className="card"><div className="card-head"><div className="card-title">🏅 Character Certificate</div></div>
      <div style={{padding:15}}>
        <div className="form-group" style={{marginBottom:11}}><label>Student *</label>
          <select className="form-control" value={ccStu} onChange={e=>setCcStu(e.target.value)}>
            <option value="">— Select —</option>{db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
          </select>
        </div>
        <StuInfo s={ccS}/>
        <div className="form-grid" style={{marginBottom:11}}>
          <FG label="CC Number"><Input value={ccNo} onChange={e=>setCcNo(e.target.value)} placeholder="CC-2025-001"/></FG>
          <FG label="Issue Date"><Input type="date" value={ccDt} onChange={e=>setCcDt(e.target.value)}/></FG>
          <FG label="Conduct"><Select value={ccCo} onChange={e=>setCcCo(e.target.value)}><option>Good</option><option>Very Good</option><option>Excellent</option><option>Satisfactory</option></Select></FG>
          <FG label="Purpose"><Select value={ccPu} onChange={e=>setCcPu(e.target.value)}><option>General Purpose</option><option>Admission</option><option>College Admission</option><option>Job Application</option><option>Scholarship</option></Select></FG>
          <FG label="Remarks" span><Input value={ccRm} onChange={e=>setCcRm(e.target.value)} placeholder="e.g. Active in sports"/></FG>
        </div>
        <button className="btn btn-primary" onClick={printCC}>🖨️ Generate Character Certificate</button>
      </div>
    </div>
  </div></div>);
}

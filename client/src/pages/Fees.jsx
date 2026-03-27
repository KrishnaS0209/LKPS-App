import React,{useState} from 'react';
import {useApp,Avatar,Badge} from '../context/AppContext';
import {Tabs,FG,Input,Select,NoData,StatCard} from '../components/UI';

const METHODS=['Cash','UPI','Online','Cheque','DD'];
const TYPES=['Monthly Tuition','Annual','Exam','Sports','Transport','Library','Other'];
const MONTHS_LIST=['April','May','June','July','August','September','October','November','December','January','February','March'];

export default function Fees(){
  const{db,setDb,showToast,paid}=useApp();
  const[tab,setTab]=useState(0);
  const[search,setSearch]=useState('');
  const[rec,setRec]=useState(null);

  // Pay form
  const[pstu,setPstu]=useState('');
  const[pamt,setPamt]=useState('');
  const[pdt,setPdt]=useState(new Date().toISOString().split('T')[0]);
  const[pmd,setPmd]=useState('Cash');
  const[pmn,setPmn]=useState('');
  const[pty,setPty]=useState('Monthly Tuition');
  const[pref,setPref]=useState('');
  const[pnote,setPnote]=useState('');

  const totalFee=db.students.reduce((s,x)=>s+x.fee,0)||1;
  const collected=db.pays.reduce((s,p)=>s+p.amt,0);
  let pending=0,overdue=0;
  db.students.forEach(s=>{const b=Math.max(0,s.fee-paid(s.id));if(s.fst==='Overdue')overdue+=b;else if(s.fst!=='Paid')pending+=b;});
  const rate=Math.round(collected/totalFee*100);

  const selStu=db.students.find(x=>x.id===pstu);
  const paidAmt=pstu?paid(pstu):0;
  const balBefore=selStu?Math.max(0,selStu.fee-paidAmt):0;
  const balAfter=Math.max(0,balBefore-(parseFloat(pamt)||0));

  const recordPay=()=>{
    if(!pstu||!pamt||!pdt){showToast('Student, amount and date required','err');return;}
    const s=db.students.find(x=>x.id===pstu);if(!s)return;
    const id='PAY'+Date.now();
    const rcpt='RCP-'+new Date().getFullYear()+'-'+String(db.pays.length+1).padStart(4,'0');
    const pay={id,dt:pdt,sid:pstu,nm:s.fn+' '+s.ln,cls:s.cls,fee:s.fee,amt:parseFloat(pamt),md:pmd,ref:pref,mn:pmn,ty:pty,note:pnote,rc:rcpt,bb:balBefore,ba:balAfter};
    setDb(d=>{
      const students=d.students.map(x=>x.id===pstu?{...x,fst:balAfter===0?'Paid':x.fst==='Paid'?'Pending':x.fst}:x);
      return{...d,pays:[...d.pays,pay],students};
    });
    showToast('Recorded! '+rcpt);
    setRec({pay,s});
    setPamt('');setPref('');setPnote('');
  };

  const showReceipt=(payId)=>{const p=db.pays.find(x=>x.id===payId);const s=db.students.find(x=>x.id===p?.sid);if(p&&s)setRec({pay:p,s});};

  const fStatus={Paid:'green',Pending:'yellow',Overdue:'red'};
  const MC={Cash:'#3fb950',UPI:'#79c0ff',Online:'#bc8cff',Cheque:'#f0c040',DD:'#ffa198'};

  const filtered=db.students.filter(s=>!search||(s.fn+' '+s.ln+s.cls+s.admno).toLowerCase().includes(search.toLowerCase()));

  return(<div>
    <div className="card">
      <div className="tabs" style={{padding:'0 17px'}}>
        {['📊 Overview','💳 Pay','📜 History','👤 Ledger','⚙ Structure'].map((t,i)=>(
          <button key={i} className={`tab ${tab===i?'active':''}`} onClick={()=>setTab(i)}>{t}</button>
        ))}
      </div>

      {tab===0&&(<div className="tab-content">
        <div className="g4" style={{marginBottom:14}}>
          <StatCard icon="💰" value={`₹${collected.toLocaleString()}`} label="Collected" color="gn"/>
          <StatCard icon="⏳" value={`₹${pending.toLocaleString()}`} label="Pending" color="yw"/>
          <StatCard icon="⚠️" value={`₹${overdue.toLocaleString()}`} label="Overdue" color="rd"/>
          <StatCard icon="📊" value={`${rate}%`} label="Rate" color="bl"/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9,flexWrap:'wrap',gap:7}}>
          <div style={{fontSize:14,fontWeight:600}}>Student Fee Status</div>
          <div style={{display:'flex',gap:7}}><div className="search-wrap"><span className="search-icon">🔍</span><input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"/></div></div>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Student</th><th>Class</th><th>Annual</th><th>Paid</th><th>Balance</th><th>Status</th><th style={{minWidth:190}}>Recent Txns</th><th>Actions</th></tr></thead>
          <tbody>{filtered.length?filtered.map((s,i)=>{
            const p=paid(s.id),b=Math.max(0,s.fee-p);
            const pays=[...db.pays].filter(x=>x.sid===s.id).sort((a,b)=>new Date(b.dt)-new Date(a.dt));
            return(<tr key={s.id}>
              <td style={{display:'flex',alignItems:'center'}}>{db.photos[s.id]?<img src={db.photos[s.id]} alt="" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',marginRight:6,flexShrink:0}}/>:<Avatar name={s.fn+' '+s.ln} index={i}/>}<div><div style={{fontWeight:600}}>{s.fn} {s.ln}</div><div style={{fontSize:10,color:'var(--di)'}}>{s.admno||s.roll}</div></div></td>
              <td><Badge color="blue">{s.cls}</Badge></td>
              <td>₹{s.fee.toLocaleString()}</td>
              <td style={{color:'var(--gn)',fontWeight:700}}>₹{p.toLocaleString()}</td>
              <td style={{color:b>0?'var(--rd)':'var(--gn)',fontWeight:700}}>₹{b.toLocaleString()}</td>
              <td><Badge color={fStatus[s.fst]||'yellow'}>{s.fst}</Badge></td>
              <td>{pays.length===0?<span style={{fontSize:11,color:'var(--di)'}}>No payments</span>:pays.slice(0,3).map(x=>(
                <div key={x.id} className="fee-txn">
                  <span style={{fontSize:'9.5px',color:'var(--mu)',width:63,flexShrink:0}}>{x.dt}</span>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--gn)',flexShrink:0}}>+₹{x.amt.toLocaleString()}</span>
                  <span style={{fontSize:9,padding:'1px 4px',borderRadius:7,background:'rgba(255,255,255,.08)',color:MC[x.md]||'#8b949e',flexShrink:0}}>{x.md}</span>
                  {x.mn&&<span style={{fontSize:9,color:'var(--di)'}}>{x.mn}</span>}
                  <span style={{fontSize:'9.5px',color:x.ba===0?'var(--gn)':'var(--rd)',marginLeft:'auto',flexShrink:0}}>₹{(x.ba||0).toLocaleString()}</span>
                </div>
              ))}</td>
              <td><div style={{display:'flex',gap:4}}>
                <button className="btn btn-primary btn-sm" onClick={()=>{setPstu(s.id);setTab(1);}}>Pay</button>
                <button className="btn btn-sm" onClick={()=>{setTab(3);}}>📋</button>
              </div></td>
            </tr>);
          }):<tr><td colSpan={8}><NoData icon="💰" message="No students"/></td></tr>}</tbody>
        </table></div>
      </div>)}

      {tab===1&&(<div className="tab-content" style={{maxWidth:560}}>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="form-group label">Student *</label>
          <Select value={pstu} onChange={e=>setPstu(e.target.value)}>
            <option value="">— Select —</option>
            {db.students.map(s=><option key={s.id} value={s.id}>{s.fn} {s.ln} ({s.cls})</option>)}
          </Select>
        </div>
        {selStu&&(<div style={{background:'rgba(13,17,23,.6)',borderRadius:'var(--r)',padding:13,marginBottom:12,border:'1px solid var(--br)'}}>
          <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:8}}>
            <div><div style={{fontSize:14,fontWeight:600}}>{selStu.fn} {selStu.ln}</div><div style={{fontSize:12,color:'var(--mu)'}}>Class {selStu.cls} | Roll: {selStu.roll}</div></div>
            <div style={{display:'flex',gap:13}}>
              <div style={{textAlign:'center'}}><div style={{fontSize:10,color:'var(--mu)'}}>Annual</div><div style={{fontSize:15,fontWeight:700}}>₹{selStu.fee.toLocaleString()}</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:10,color:'var(--gn)'}}>Paid</div><div style={{fontSize:15,fontWeight:700,color:'var(--gn)'}}>₹{paidAmt.toLocaleString()}</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:10,color:'var(--rd)'}}>Balance</div><div style={{fontSize:15,fontWeight:700,color:'var(--rd)'}}>₹{balBefore.toLocaleString()}</div></div>
            </div>
          </div>
          <div className="progress"><div className="progress-fill" style={{background:'var(--gn)',width:`${selStu.fee>0?Math.min(100,Math.round(paidAmt/selStu.fee*100)):0}%`}}/></div>
        </div>)}
        <div className="form-grid" style={{marginBottom:12}}>
          <FG label="Amount ₹ *"><Input type="number" value={pamt} onChange={e=>setPamt(e.target.value)} placeholder="5000"/></FG>
          <FG label="Month"><Select value={pmn} onChange={e=>setPmn(e.target.value)}><option value="">General</option>{MONTHS_LIST.map(m=><option key={m}>{m}</option>)}</Select></FG>
          <FG label="Date *"><Input type="date" value={pdt} onChange={e=>setPdt(e.target.value)}/></FG>
          <FG label="Method"><Select value={pmd} onChange={e=>setPmd(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</Select></FG>
          <FG label="Ref No."><Input value={pref} onChange={e=>setPref(e.target.value)} placeholder="Optional"/></FG>
          <FG label="Fee Type"><Select value={pty} onChange={e=>setPty(e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select></FG>
          <FG label="Notes" span><Input value={pnote} onChange={e=>setPnote(e.target.value)} placeholder="e.g. April fee"/></FG>
        </div>
        {pamt&&selStu&&<div style={{padding:'9px 13px',borderRadius:'var(--rs)',marginBottom:12,fontSize:13,background:'var(--gnl)',border:'1px solid rgba(63,185,80,.2)'}}>After payment: Balance = <b style={{color:'var(--gn)'}}>₹{balAfter.toLocaleString()}</b></div>}
        <button className="btn btn-success" style={{fontSize:14,padding:'10px 20px'}} onClick={recordPay}>✓ Record & Receipt</button>
      </div>)}

      {tab===2&&(<div className="tab-content">
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Receipt</th><th>Student</th><th>Class</th><th>Type</th><th>Month</th><th>Amount</th><th>Method</th><th>Balance</th><th>Notes</th><th></th></tr></thead>
          <tbody>{[...db.pays].reverse().map(p=>(
            <tr key={p.id}>
              <td style={{whiteSpace:'nowrap'}}>{p.dt}</td>
              <td><Badge color="blue">{p.rc}</Badge></td>
              <td style={{fontWeight:500}}>{p.nm}</td>
              <td><Badge color="blue">{p.cls}</Badge></td>
              <td style={{color:'var(--mu)'}}>{p.ty||'—'}</td>
              <td style={{color:'var(--mu)'}}>{p.mn||'—'}</td>
              <td style={{fontWeight:700,color:'var(--gn)'}}>₹{p.amt.toLocaleString()}</td>
              <td>{p.md}</td>
              <td style={{color:p.ba===0?'var(--gn)':'var(--rd)',fontWeight:600}}>₹{(p.ba||0).toLocaleString()}</td>
              <td style={{color:'var(--mu)'}}>{p.note||'—'}</td>
              <td><button className="btn btn-sm" onClick={()=>showReceipt(p.id)}>🧾</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>)}

      {tab===3&&(<LedgerTab/>)}
      {tab===4&&(<FeeStructureTab/>)}
    </div>

    {rec&&<ReceiptModal rec={rec} onClose={()=>setRec(null)} school={db.settings?.school||'LKPS'}/>}
  </div>);
}

function LedgerTab(){
  const{db,paid}=useApp();
  const[sid,setSid]=useState('');
  const s=db.students.find(x=>x.id===sid);
  const pays=s?[...db.pays].filter(p=>p.sid===sid).sort((a,b)=>new Date(a.dt)-new Date(b.dt)):[];
  const tp=pays.reduce((s,p)=>s+p.amt,0);
  const bal=s?s.fee-tp:0;
  return(<div className="tab-content">
    <div style={{marginBottom:12}}>
      <Select value={sid} onChange={e=>setSid(e.target.value)} style={{width:260}}>
        <option value="">Select Student</option>
        {db.students.map(st=><option key={st.id} value={st.id}>{st.fn} {st.ln} ({st.cls})</option>)}
      </Select>
    </div>
    {s&&(<>
      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:13}}>
        <div><div style={{fontSize:17,fontWeight:700}}>{s.fn} {s.ln}</div><div style={{fontSize:12,color:'var(--mu)'}}>Class {s.cls} | Roll: {s.roll}</div></div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[['Annual',s.fee,'var(--tx)'],['Paid',tp,'var(--gn)'],['Balance',Math.max(0,bal),bal<=0?'var(--gn)':'var(--rd)']].map(([l,v,c])=>(
            <div key={l} style={{textAlign:'center',background:'rgba(255,255,255,.04)',padding:'8px 13px',borderRadius:'var(--r)',border:'1px solid var(--br)'}}>
              <div style={{fontSize:10,color:'var(--mu)'}}>{l}</div><div style={{fontSize:15,fontWeight:700,color:c}}>₹{v.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="progress" style={{marginBottom:14,height:8}}><div className="progress-fill" style={{background:'var(--gn)',width:`${s.fee>0?Math.min(100,Math.round(tp/s.fee*100)):0}%`}}/></div>
      {pays.length===0?<NoData icon="💳" message="No payments"/>:pays.map(p=>{
        return(<div key={p.id} style={{display:'flex',gap:9,marginBottom:10,paddingLeft:14,borderLeft:'2px solid var(--br)'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gn)',border:'2px solid var(--s1)',marginTop:4,flexShrink:0,marginLeft:-11}}/>
          <div>
            <div style={{fontSize:11,color:'var(--mu)'}}>{p.dt} · {p.md}{p.mn?' · '+p.mn:''}{p.ref?' ('+p.ref+')':''}</div>
            <div style={{fontSize:13,fontWeight:600}}>₹{p.amt.toLocaleString()} <Badge color="blue">{p.rc}</Badge></div>
            <div style={{fontSize:12,color:'var(--mu)'}}>Balance: ₹{Math.max(0,p.ba||0).toLocaleString()}{p.note?' · '+p.note:''}</div>
          </div>
        </div>);
      })}
    </>)}
    {!s&&<NoData icon="👤" message="Select a student"/>}
  </div>);
}

function FeeStructureTab(){
  const{db,setDb,showToast}=useApp();
  const[mn,setMn]=useState('April');const[ma,setMa]=useState('');const[en,setEn]=useState('');const[ea,setEa]=useState('');
  const MONTHS=['April','May','June','July','August','September','October','November','December','January','February','March'];
  const addM=()=>{const a=parseFloat(ma)||0;if(!a){showToast('Enter amount','err');return;}setDb(d=>({...d,fstr:{...d.fstr,months:[...(d.fstr.months||[]),{month:mn,amount:a}]}}));setMa('');showToast(mn+' added');};
  const delM=i=>setDb(d=>({...d,fstr:{...d.fstr,months:d.fstr.months.filter((_,j)=>j!==i)}}));
  const addE=()=>{const a=parseFloat(ea)||0;if(!en.trim()||!a){showToast('Name & amount','err');return;}setDb(d=>({...d,fstr:{...d.fstr,extras:[...(d.fstr.extras||[]),{name:en,amount:a}]}}));setEn('');setEa('');showToast(en+' added');};
  const delE=i=>setDb(d=>({...d,fstr:{...d.fstr,extras:d.fstr.extras.filter((_,j)=>j!==i)}}));
  const Row=({label,amount,onDel})=>(
    <div style={{display:'flex',alignItems:'center',padding:'6px 8px',background:'rgba(13,17,23,.6)',borderRadius:'var(--rs)',marginBottom:4,border:'1px solid var(--br)'}}>
      <span style={{flex:1,fontSize:13}}>{label}</span>
      <span style={{fontSize:13,fontWeight:600,color:'var(--gn)',marginRight:8}}>₹{Number(amount).toLocaleString()}</span>
      <button className="btn btn-danger btn-sm" onClick={onDel}>✕</button>
    </div>
  );
  return(<div className="tab-content"><div className="g2">
    <div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:11}}>📅 Monthly</div>
      <div style={{background:'rgba(13,17,23,.6)',borderRadius:'var(--r)',padding:13,border:'1px solid var(--br)'}}>
        {(db.fstr.months||[]).length?db.fstr.months.map((m,i)=><Row key={i} label={m.month} amount={m.amount} onDel={()=>delM(i)}/>):<div style={{fontSize:12,color:'var(--di)',padding:5}}>None added</div>}
        <div style={{display:'flex',gap:6,marginTop:9}}>
          <Select value={mn} onChange={e=>setMn(e.target.value)} style={{flex:1}}>{MONTHS.map(m=><option key={m}>{m}</option>)}</Select>
          <Input type="number" value={ma} onChange={e=>setMa(e.target.value)} placeholder="₹" style={{width:100}}/>
          <button className="btn btn-primary btn-sm" onClick={addM}>＋</button>
        </div>
      </div>
    </div>
    <div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:11}}>➕ Extra Fees</div>
      <div style={{background:'rgba(13,17,23,.6)',borderRadius:'var(--r)',padding:13,border:'1px solid var(--br)'}}>
        {(db.fstr.extras||[]).length?db.fstr.extras.map((e,i)=><Row key={i} label={e.name} amount={e.amount} onDel={()=>delE(i)}/>):<div style={{fontSize:12,color:'var(--di)',padding:5}}>None added</div>}
        <div style={{display:'flex',gap:6,marginTop:9}}>
          <Input value={en} onChange={e=>setEn(e.target.value)} placeholder="Name" style={{flex:1}}/>
          <Input type="number" value={ea} onChange={e=>setEa(e.target.value)} placeholder="₹" style={{width:100}}/>
          <button className="btn btn-primary btn-sm" onClick={addE}>＋</button>
        </div>
      </div>
    </div>
  </div></div>);
}

function ReceiptModal({rec,onClose,school}){
  const{pay,s}=rec;
  const full=pay.ba===0;
  const print=()=>{
    const w=window.open('','_blank','width=480,height=680');
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:28px;max-width:390px;margin:0 auto;color:#1a1a1a}.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:12.5px}.lbl{color:#666}.val{font-weight:600}@media print{@page{margin:8px}}</style></head><body>
    <div style="text-align:center;padding-bottom:14px;border-bottom:2px dashed #ccc;margin-bottom:14px"><div style="font-size:17px;font-weight:700">${school}</div><div style="font-size:12px;font-weight:600;color:#1a3a8f;margin-top:7px;text-transform:uppercase">Fee Receipt</div></div>
    <div class="row"><span class="lbl">Receipt</span><span class="val" style="color:#1a3a8f">${pay.rc}</span></div>
    <div class="row"><span class="lbl">Date</span><span class="val">${pay.dt}</span></div>
    <div class="row"><span class="lbl">Student</span><span class="val">${s.fn} ${s.ln}</span></div>
    <div class="row"><span class="lbl">Class/Roll</span><span class="val">${s.cls}/${s.roll}</span></div>
    <div class="row"><span class="lbl">Father</span><span class="val">${s.father||'—'}</span></div>
    <div class="row"><span class="lbl">Type</span><span class="val">${pay.ty||'—'}${pay.mn?' ('+pay.mn+')':''}</span></div>
    <div class="row"><span class="lbl">Method</span><span class="val">${pay.md}${pay.ref?' ('+pay.ref+')':''}</span></div>
    <div class="row"><span class="lbl">Bal Before</span><span class="val" style="color:#cf222e">₹${pay.bb.toLocaleString()}</span></div>
    <div style="background:#e6ffed;border-radius:6px;padding:10px 12px;display:flex;justify-content:space-between;margin-top:9px"><span style="font-size:13px;font-weight:600;color:#1a7f37">Received</span><span style="font-size:17px;font-weight:700;color:#1a7f37">₹${pay.amt.toLocaleString()}</span></div>
    <div style="border-radius:6px;padding:8px 12px;display:flex;justify-content:space-between;margin-top:7px;background:${full?'#e6ffed':'#ffebe9'}"><span style="font-weight:600;color:${full?'#1a7f37':'#cf222e'}">Balance</span><span style="font-size:15px;font-weight:700;color:${full?'#1a7f37':'#cf222e'}">₹${pay.ba.toLocaleString()}</span></div>
    ${full?'<div style="text-align:center;margin-top:14px"><span style="border:2px solid #3fb950;color:#1a7f37;font-weight:700;font-size:12px;padding:4px 13px;border-radius:5px;display:inline-block;transform:rotate(-4deg)">✓ FULLY PAID</span></div>':''}
    <script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{textAlign:'center',paddingBottom:14,borderBottom:'2px dashed var(--br)',marginBottom:14}}>
          <div style={{fontSize:17,fontWeight:700}}>{school}</div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--bl)',marginTop:7,textTransform:'uppercase'}}>Fee Receipt</div>
        </div>
        {[['Receipt No.',pay.rc,'var(--bl)'],['Date',pay.dt,null],['Student',s.fn+' '+s.ln,null],['Class/Roll',s.cls+'/'+s.roll,null],['Father',s.father||'—',null],['Type',(pay.ty||'—')+(pay.mn?' ('+pay.mn+')':''),null],['Method',pay.md+(pay.ref?' ('+pay.ref+')':''),null],['Bal Before','₹'+pay.bb.toLocaleString(),'var(--rd)']].map(([l,v,c])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--br)',fontSize:13}}><span style={{color:'var(--mu)'}}>{l}</span><span style={{fontWeight:600,color:c||'var(--tx)'}}>{v}</span></div>
        ))}
        <div style={{background:'var(--gnl)',borderRadius:'var(--rs)',padding:'11px 13px',display:'flex',justifyContent:'space-between',marginTop:10,border:'1px solid rgba(63,185,80,.2)'}}><span style={{fontSize:13,fontWeight:600,color:'var(--gn)'}}>Received</span><span style={{fontSize:18,fontWeight:700,color:'var(--gn)'}}>₹{pay.amt.toLocaleString()}</span></div>
        <div style={{borderRadius:'var(--rs)',padding:'9px 13px',display:'flex',justifyContent:'space-between',marginTop:7,background:full?'var(--gnl)':'var(--rdl)',border:`1px solid ${full?'rgba(63,185,80,.2)':'rgba(248,81,73,.2)'}`}}><span style={{fontWeight:600,color:full?'var(--gn)':'var(--rd)'}}>Balance</span><span style={{fontSize:16,fontWeight:700,color:full?'var(--gn)':'var(--rd)'}}>₹{pay.ba.toLocaleString()}</span></div>
        {full&&<div style={{textAlign:'center',marginTop:12}}><span style={{border:'2px solid var(--gn)',color:'var(--gn)',fontWeight:700,fontSize:12,padding:'4px 13px',borderRadius:5,display:'inline-block',transform:'rotate(-4deg)'}}>✓ FULLY PAID</span></div>}
        <div className="modal-footer"><button className="btn" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={print}>🖨️ Print</button></div>
      </div>
    </div>
  );
}

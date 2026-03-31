import React,{useState} from 'react';
import {useApp,Avatar,Badge} from '../context/AppContext';
import {Modal,FG,Input,Select,SearchInput,NoData} from '../components/UI';
const BK={fn:'',ln:'',empId:'',su:'',cls:'',qual:'',ph:'',em:'',sal:'',doj:'',status:'Active',blood:'',puser:'',ppass:''};
export default function Teachers(){
  const{db,setDb,showToast}=useApp();
  const[search,setSearch]=useState('');const[open,setOpen]=useState(false);const[form,setForm]=useState(BK);const[editId,setEditId]=useState(null);
  const fe=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const openAdd=()=>{setForm(BK);setEditId(null);setOpen(true);};
  const openEdit=t=>{setForm({...BK,...t,sal:t.sal||''});setEditId(t.id);setOpen(true);};
  const close=()=>{setOpen(false);setForm(BK);setEditId(null);};
  const save=()=>{
    if(!form.fn.trim()||!form.ln.trim()){showToast('Name required','err');return;}
    const id=editId||'T'+Date.now();
    const t={...form,id,sal:parseFloat(form.sal)||0};
    if(editId&&!form.ppass)t.ppass=db.teachers.find(x=>x.id===editId)?.ppass;
    setDb(d=>({...d,teachers:editId?d.teachers.map(x=>x.id===editId?t:x):[...d.teachers,t]}));
    showToast(editId?'Updated':'Teacher added');close();
  };
  const del=id=>{if(!window.confirm('Delete?'))return;setDb(d=>({...d,teachers:d.teachers.filter(t=>t.id!==id)}));showToast('Deleted','err');};
  const filtered=db.teachers.filter(t=>!search||(t.fn+' '+t.ln+t.su+t.empId).toLowerCase().includes(search.toLowerCase()));
  const sb={Active:'green','On Leave':'yellow',Resigned:'red'};
  return(<div>
    <div className="card">
      <div className="card-head"><div className="card-title">Teachers ({db.teachers.length})</div>
        <div className="card-actions"><SearchInput value={search} onChange={setSearch}/><button className="btn btn-primary" onClick={openAdd}>＋ Add</button></div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Teacher</th><th>Emp ID</th><th>Subject</th><th>Class</th><th>Phone</th><th>Salary</th><th>Status</th><th>Portal</th><th>Actions</th></tr></thead>
        <tbody>{filtered.length?filtered.map((t,i)=>(
          <tr key={t.id}>
            <td style={{display:'flex',alignItems:'center'}}><Avatar name={t.fn+' '+t.ln} index={i+3}/><div><div style={{fontWeight:600}}>{t.fn} {t.ln}</div><div style={{fontSize:10,color:'var(--di)'}}>{t.em}</div></div></td>
            <td>{t.empId||'—'}</td><td>{t.su||'—'}</td><td>{t.cls||'—'}</td><td>{t.ph||'—'}</td>
            <td>₹{(t.sal||0).toLocaleString()}/mo</td>
            <td><Badge color={sb[t.status]||'yellow'}>{t.status||'Active'}</Badge></td>
            <td>{t.puser?<Badge color="blue">✓ {t.puser}</Badge>:<span style={{color:'var(--di)'}}>—</span>}</td>
            <td><div style={{display:'flex',gap:4}}><button className="btn btn-sm" onClick={()=>openEdit(t)}>✏️</button><button className="btn btn-danger btn-sm" onClick={()=>del(t.id)}>🗑</button></div></td>
          </tr>
        )):<tr><td colSpan={9}><NoData icon="👩‍🏫" message="No teachers"/></td></tr>}</tbody>
      </table></div>
    </div>
    <Modal open={open} onClose={close} title={<>👩‍🏫 {editId?'Edit':'Add'} Teacher</>}>
      <div className="form-grid">
        <FG label="First Name *"><Input value={form.fn} onChange={fe('fn')} placeholder="Enter first name"/></FG>
        <FG label="Last Name *"><Input value={form.ln} onChange={fe('ln')} placeholder="Enter last name"/></FG>
        <FG label="Emp ID"><Input value={form.empId} onChange={fe('empId')} placeholder="Enter employee ID"/></FG>
        <FG label="Subject"><Input value={form.su} onChange={fe('su')} placeholder="Subject taught"/></FG>
        <FG label="Class Teacher Of"><Select value={form.cls} onChange={fe('cls')}><option value="">— None —</option>{db.classes.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select></FG>
        <FG label="Qualification"><Input value={form.qual} onChange={fe('qual')} placeholder="Highest qualification"/></FG>
        <FG label="Phone"><Input value={form.ph} onChange={fe('ph')} placeholder="10-digit mobile number"/></FG>
        <FG label="Email"><Input type="email" value={form.em} onChange={fe('em')} placeholder="Teacher email address"/></FG>
        <FG label="Salary ₹/mo"><Input type="number" value={form.sal} onChange={fe('sal')} placeholder="Monthly salary amount"/></FG>
        <FG label="Joining Date"><Input type="date" value={form.doj} onChange={fe('doj')}/></FG>
        <FG label="Status"><Select value={form.status} onChange={fe('status')}><option>Active</option><option>On Leave</option><option>Resigned</option></Select></FG>
        <FG label="Blood"><Select value={form.blood} onChange={fe('blood')}><option value="">—</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></Select></FG>
        <div className="form-section">Portal Access</div>
        <FG label="Username"><Input value={form.puser} onChange={fe('puser')} placeholder="Leave blank for no access"/></FG>
        <FG label="Password"><Input type="password" value={form.ppass} onChange={fe('ppass')} placeholder="Minimum 6 characters"/></FG>
      </div>
      <div className="modal-footer"><button className="btn" onClick={close}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
    </Modal>
  </div>);
}

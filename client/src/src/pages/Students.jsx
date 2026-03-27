import React, { useState } from 'react';
import { useApp, Avatar, Badge } from '../context/AppContext';
import { Modal, Tabs, FG, Input, Select, SearchInput, NoData, PhotoZone } from '../components/UI';

const BLANK = { fn:'',ln:'',dob:'',gn:'Male',bl:'',ca:'',aa:'',re:'',cl:'',ro:'',an:'',ad:'',ps:'',em:'',fa:'',fo:'',fp:'',faa:'',ma:'',mo:'',mp:'',maa:'',ph:'',addr:'',cy:'',pin:'',fe:0,mf:0,fst:'Pending',co:0,mc:'',al:'',photo:'' };

export default function Students() {
  const { db, setDb, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterCls, setFilterCls] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState(0);

  const fv = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fe = (k) => (e) => fv(k, e.target.value);

  const openAdd = () => { setForm(BLANK); setEditId(null); setTab(0); setOpen(true); };
  const openEdit = (s) => {
    setForm({ ...BLANK, ...s, photo: db.photos[s.id] || '' });
    setEditId(s.id); setTab(0); setOpen(true);
  };
  const close = () => { setOpen(false); setForm(BLANK); setEditId(null); };

  const save = () => {
    if (!form.fn.trim() || !form.ln.trim()) { showToast('Name required', 'err'); return; }
    const id = editId || 'S' + Date.now();
    const s = { ...form, id, fee: parseFloat(form.fe) || 0, mfee: parseFloat(form.mf) || 0, fst: form.fst, cls: form.cl, roll: form.ro, admno: form.an, admdate: form.ad, father: form.fa, mother: form.ma, fphone: form.fp, blood: form.bl, caste: form.ca, city: form.cy, aadhar: form.aa };
    setDb(d => {
      const students = editId ? d.students.map(x => x.id === editId ? s : x) : [...d.students, s];
      const photos = { ...d.photos };
      if (form.photo) photos[id] = form.photo; else delete photos[id];
      return { ...d, students, photos };
    });
    showToast(editId ? 'Student updated' : 'Student added');
    close();
  };

  const del = (id) => {
    if (!window.confirm('Delete student?')) return;
    setDb(d => ({ ...d, students: d.students.filter(s => s.id !== id), photos: { ...d.photos, [id]: undefined } }));
    showToast('Deleted', 'err');
  };

  const filtered = db.students.filter(s => {
    const q = search.toLowerCase();
    const match = !q || (s.fn + ' ' + s.ln + s.roll + s.admno + s.father + s.cls).toLowerCase().includes(q);
    const cls = !filterCls || s.cls === filterCls;
    return match && cls;
  });

  const fStatus = { Paid: 'green', Pending: 'yellow', Overdue: 'red' };
  const { db: { pays } } = useApp();
  const getPaid = (sid) => pays.filter(p => p.sid === sid).reduce((s, p) => s + p.amt, 0);

  const TABS = ['📋 Personal', '📚 Academic', '👨‍👩‍👧 Parents', '📍 Address & Fees'];

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Students ({db.students.length})</div>
          <div className="card-actions">
            <SearchInput value={search} onChange={setSearch} />
            <Select value={filterCls} onChange={e => setFilterCls(e.target.value)} style={{ width: 150, padding: '7px 10px' }}>
              <option value="">All Classes</option>
              {db.classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
            <button className="btn btn-primary" onClick={openAdd}>＋ Add Student</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Class</th><th>Father</th><th>Phone</th><th>Blood</th><th>Status</th><th style={{ minWidth: 160 }}>Recent Payments</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((s, i) => {
                const pays = (db.pays || []).filter(p => p.sid === s.id).sort((a, b) => new Date(b.dt) - new Date(a.dt));
                return (
                  <tr key={s.id}>
                    <td style={{ display: 'flex', alignItems: 'center' }}>
                      {db.photos[s.id] ? <img src={db.photos[s.id]} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', marginRight: 6, flexShrink: 0 }} /> : <Avatar name={s.fn + ' ' + s.ln} index={i} />}
                      <div><div style={{ fontWeight: 600 }}>{s.fn} {s.ln}</div><div style={{ fontSize: 10, color: 'var(--di)' }}>{s.admno}</div></div>
                    </td>
                    <td><Badge color="blue">{s.cls}</Badge></td>
                    <td style={{ color: 'var(--mu)' }}>{s.father || '—'}</td>
                    <td>{s.fphone || s.ph || '—'}</td>
                    <td>{s.blood ? <Badge color="red">{s.blood}</Badge> : '—'}</td>
                    <td><Badge color={fStatus[s.fst] || 'yellow'}>{s.fst}</Badge></td>
                    <td style={{ minWidth: 160 }}>
                      {pays.length === 0 ? <span style={{ fontSize: 11, color: 'var(--di)' }}>No payments</span>
                        : pays.slice(0, 2).map(p => (
                          <div key={p.id} className="fee-txn">
                            <span style={{ fontSize: '9.5px', color: 'var(--mu)', width: 64, flexShrink: 0 }}>{p.dt}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gn)' }}>+₹{p.amt.toLocaleString()}</span>
                            <span style={{ fontSize: 9, color: 'var(--di)', marginLeft: 3 }}>{p.md}</span>
                          </div>
                        ))}
                    </td>
                    <td><div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => openEdit(s)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>🗑</button>
                    </div></td>
                  </tr>
                );
              }) : <tr><td colSpan={8}><NoData icon="👨‍🎓" message="No students found" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={close} large title={<>👨‍🎓 {editId ? 'Edit' : 'Add'} Student</>}>
        {/* Photo */}
        <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--bll)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', textTransform: 'uppercase', marginBottom: 10 }}>Student Photo (for ID Card)</div>
          <PhotoZone photo={form.photo} onChange={v => fv('photo', v)} onClear={() => fv('photo', '')} />
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 0 && (
          <div className="tab-content form-grid">
            <FG label="First Name *"><Input value={form.fn} onChange={fe('fn')} placeholder="Aryan" /></FG>
            <FG label="Last Name *"><Input value={form.ln} onChange={fe('ln')} placeholder="Sharma" /></FG>
            <FG label="Date of Birth"><Input type="date" value={form.dob} onChange={fe('dob')} /></FG>
            <FG label="Gender"><Select value={form.gn} onChange={fe('gn')}><option>Male</option><option>Female</option><option>Other</option></Select></FG>
            <FG label="Blood Group"><Select value={form.bl} onChange={fe('bl')}><option value="">—</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></Select></FG>
            <FG label="Caste"><Select value={form.ca} onChange={fe('ca')}><option value="">—</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option></Select></FG>
            <FG label="Aadhaar"><Input value={form.aa} onChange={fe('aa')} placeholder="XXXX XXXX XXXX" /></FG>
            <FG label="Religion"><Input value={form.re} onChange={fe('re')} /></FG>
            <FG label="Medical Condition"><Input value={form.mc} onChange={fe('mc')} placeholder="None" /></FG>
            <FG label="Allergies"><Input value={form.al} onChange={fe('al')} placeholder="None" /></FG>
          </div>
        )}
        {tab === 1 && (
          <div className="tab-content form-grid">
            <FG label="Class *"><Select value={form.cl} onChange={fe('cl')}><option value="">—</option>{db.classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></FG>
            <FG label="Roll No."><Input value={form.ro} onChange={fe('ro')} placeholder="2401" /></FG>
            <FG label="Admission No."><Input value={form.an} onChange={fe('an')} placeholder="ADM-001" /></FG>
            <FG label="Admission Date"><Input type="date" value={form.ad} onChange={fe('ad')} /></FG>
            <FG label="Previous School"><Input value={form.ps} onChange={fe('ps')} /></FG>
            <FG label="Email"><Input type="email" value={form.em} onChange={fe('em')} /></FG>
            <FG label="Annual Fee ₹"><Input type="number" value={form.fe} onChange={fe('fe')} placeholder="45000" /></FG>
            <FG label="Monthly Fee ₹"><Input type="number" value={form.mf} onChange={fe('mf')} placeholder="3500" /></FG>
            <FG label="Fee Status"><Select value={form.fst} onChange={fe('fst')}><option>Pending</option><option>Paid</option><option>Overdue</option></Select></FG>
            <FG label="Concession %"><Input type="number" value={form.co} onChange={fe('co')} placeholder="0" /></FG>
          </div>
        )}
        {tab === 2 && (
          <div className="tab-content form-grid">
            <div className="form-section">Father</div>
            <FG label="Father's Name"><Input value={form.fa} onChange={fe('fa')} placeholder="Ramesh Sharma" /></FG>
            <FG label="Occupation"><Input value={form.fo} onChange={fe('fo')} /></FG>
            <FG label="Father's Phone"><Input value={form.fp} onChange={fe('fp')} placeholder="98100-XXXXX" /></FG>
            <FG label="Father's Aadhaar"><Input value={form.faa} onChange={fe('faa')} /></FG>
            <div className="form-section">Mother</div>
            <FG label="Mother's Name"><Input value={form.ma} onChange={fe('ma')} placeholder="Sunita Sharma" /></FG>
            <FG label="Occupation"><Input value={form.mo} onChange={fe('mo')} /></FG>
            <FG label="Mother's Phone"><Input value={form.mp} onChange={fe('mp')} /></FG>
            <FG label="Mother's Aadhaar"><Input value={form.maa} onChange={fe('maa')} /></FG>
          </div>
        )}
        {tab === 3 && (
          <div className="tab-content form-grid">
            <FG label="Phone / WhatsApp"><Input value={form.ph} onChange={fe('ph')} /></FG>
            <FG label="City"><Input value={form.cy} onChange={fe('cy')} /></FG>
            <FG label="Address" span><Input value={form.addr} onChange={fe('addr')} placeholder="Full address" /></FG>
            <FG label="PIN Code"><Input value={form.pin} onChange={fe('pin')} /></FG>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Student</button>
        </div>
      </Modal>
    </div>
  );
}

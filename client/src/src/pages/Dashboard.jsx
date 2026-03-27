import React from 'react';
import { useApp, Avatar, Badge } from '../context/AppContext';
import { StatCard, NoData } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];
const SHORT  = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const COLORS = ['#388bfd','#3fb950','#f85149','#d29922','#bc8cff','#79c0ff'];

export default function Dashboard() {
  const { db, paid } = useApp();
  const totalFee = db.students.reduce((s, x) => s + x.fee, 0) || 1;
  const collected = db.pays.reduce((s, p) => s + p.amt, 0);
  const pending = db.students.filter(s => s.fst !== 'Paid').reduce((s, x) => s + Math.max(0, x.fee - paid(x.id)), 0);
  const pendingCount = db.students.filter(s => s.fst !== 'Paid').length;

  // Fee chart: last 6 months
  const now = new Date(); const mo = now.getMonth();
  const feeData = Array.from({ length: 6 }, (_, i) => {
    const m = (mo - 5 + i + 12) % 12;
    const total = db.pays.filter(p => p.mn === MONTHS[m] || (!p.mn && new Date(p.dt).getMonth() === m)).reduce((s, p) => s + p.amt, 0);
    return { name: SHORT[m], amt: total };
  });

  // Attendance chart: class-wise
  const attData = db.classes.slice(0, 6).map((c, i) => {
    const sts = db.students.filter(s => s.cls === c.name);
    const all = Object.values(db.att).flatMap(d => sts.map(s => d[s.id]).filter(Boolean));
    const p = all.filter(v => v === 'P' || v === 'L').length;
    const a = all.filter(v => v === 'A').length;
    return { name: c.name, pct: p + a > 0 ? Math.round(p / (p + a) * 100) : 0, fill: COLORS[i % COLORS.length] };
  });

  const recentStudents = [...db.students].slice(-5).reverse();
  const pendingStudents = db.students.filter(s => s.fst !== 'Paid').slice(0, 5);
  const fStatus = { Paid: 'green', Pending: 'yellow', Overdue: 'red' };

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon="👨‍🎓" value={db.students.length} label="Students" sub={`${db.classes.length} classes`} color="bl" />
        <StatCard icon="👩‍🏫" value={db.teachers.length} label="Teachers" sub={`${[...new Set(db.teachers.map(t=>t.su).filter(Boolean))].length} subjects`} color="sk" />
        <StatCard icon="🏛" value={db.classes.length} label="Classes" color="pu" />
        <StatCard icon="💰" value={`₹${collected.toLocaleString()}`} label="Collected" sub={`${Math.round(collected/totalFee*100)}% rate`} color="gn" />
        <StatCard icon="⚠️" value={`₹${pending.toLocaleString()}`} label="Pending" sub={`${pendingCount} students`} color="rd" />
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-head"><div className="card-title">📈 Monthly Fee Collection</div></div>
          <div style={{ padding: 16, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeData}>
                <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Collected']} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 7, fontSize: 12 }} />
                <Bar dataKey="amt" fill="#388bfd" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">📊 Attendance by Class</div></div>
          <div style={{ padding: 16, height: 220 }}>
            {attData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attData} dataKey="pct" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} label={({ name, pct }) => `${name}: ${pct}%`} labelLine={false}>
                    {attData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`, 'Attendance']} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 7, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <NoData icon="📊" message="Add classes to see attendance" />}
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-head"><div className="card-title">🆕 Recent Students</div></div>
          <div className="table-wrap">
            <table><thead><tr><th>Name</th><th>Class</th><th>Status</th></tr></thead>
              <tbody>
                {recentStudents.length ? recentStudents.map((s, i) => (
                  <tr key={s.id}><td style={{ display: 'flex', alignItems: 'center' }}><Avatar name={s.fn + ' ' + s.ln} index={i} />{s.fn} {s.ln}</td>
                    <td><Badge color="blue">{s.cls}</Badge></td>
                    <td><Badge color={fStatus[s.fst] || 'yellow'}>{s.fst}</Badge></td>
                  </tr>
                )) : <tr><td colSpan={3}><NoData icon="👨‍🎓" message="No students yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">⚠️ Pending Fees</div></div>
          <div className="table-wrap">
            <table><thead><tr><th>Student</th><th>Class</th><th>Balance</th></tr></thead>
              <tbody>
                {pendingStudents.length ? pendingStudents.map((s, i) => {
                  const b = Math.max(0, s.fee - paid(s.id));
                  return <tr key={s.id}><td style={{ display: 'flex', alignItems: 'center' }}><Avatar name={s.fn + ' ' + s.ln} index={i} />{s.fn} {s.ln}</td>
                    <td><Badge color="blue">{s.cls}</Badge></td>
                    <td style={{ color: 'var(--rd)', fontWeight: 600 }}>₹{b.toLocaleString()}</td>
                  </tr>;
                }) : <tr><td colSpan={3}><NoData icon="✅" message="All fees clear!" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

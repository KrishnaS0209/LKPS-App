// ── ID Card HTML builder ──────────────────────────────────────────
const THEMES = {
  blue:   { h1: '#1a2e5a', h2: '#2a4a8f', acc: '#c8a96e' },
  green:  { h1: '#0f3d2e', h2: '#1a6b4a', acc: '#6db88a' },
  maroon: { h1: '#5a1a1a', h2: '#8b2a2a', acc: '#c8906e' },
  navy:   { h1: '#0f172a', h2: '#1e3a5f', acc: '#7ea8c8' },
  purple: { h1: '#2d1a5a', h2: '#4a2a8f', acc: '#a06ec8' },
};

const GFONT_CARD = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');`;

export function buildCard(s, photo, logo, phone, year, prin, theme, big = true) {
  const th = THEMES[theme] || THEMES.blue;
  const w = big ? 300 : 280;
  const dob = s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '—';
  const mob = s.fphone || s.ph || '—';
  const addr = s.addr ? (s.addr + (s.city ? ', ' + s.city : '') + (s.pin ? '-' + s.pin : '')) : '—';
  const ini = ((s.fn || '?')[0] || '?').toUpperCase();

  const logoEl = logo
    ? `<img src="${logo}" style="width:${big?48:40}px;height:${big?48:40}px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 1px 4px rgba(0,0,0,.3));">`
    : `<div style="width:${big?48:40}px;height:${big?48:40}px;display:flex;align-items:center;justify-content:center;font-size:${big?22:18}px;flex-shrink:0;">🏫</div>`;
  const photoEl = photo
    ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:${big?30:24}px;font-weight:700;color:rgba(255,255,255,.4);font-family:'Playfair Display',serif;">${ini}</span>`;
  const logoWm = logo
    ? `<img src="${logo}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${big?110:95}px;height:${big?110:95}px;object-fit:contain;opacity:0.05;pointer-events:none;">`
    : '';

  const row = (label, val) =>
    `<tr><td style="font-size:${big?9:8}px;font-weight:500;color:#666;padding:2.5px 6px 2.5px 0;width:80px;font-family:'Inter',sans-serif;">${label}</td>`+
    `<td style="font-size:${big?9:8}px;color:#1a1a2e;padding:2.5px 0;font-weight:600;font-family:'Inter',sans-serif;border-bottom:1px solid #f0f0f0;">${val}</td></tr>`;

  return `<div style="width:${w}px;background:#fff;border-radius:12px;overflow:hidden;font-family:'Inter',Helvetica,sans-serif;${big?'box-shadow:0 20px 60px rgba(0,0,0,.45);':'border:1px solid #e0e0e0;page-break-inside:avoid;'}position:relative;">
  <style>${GFONT_CARD}</style>
  <div style="background:linear-gradient(160deg,${th.h1} 0%,${th.h2} 100%);padding:${big?'14px 14px 28px':'12px 12px 24px'};position:relative;overflow:hidden;">
    ${logoWm}
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;position:relative;z-index:1;">
      ${logoEl}
      <div>
        <div style="font-size:${big?10.5:9}px;font-weight:700;color:#fff;font-family:'Playfair Display',serif;white-space:nowrap;letter-spacing:0.2px;text-shadow:0 1px 3px rgba(0,0,0,.3);">LORD KRISHNA PUBLIC SCHOOL</div>
        <div style="font-size:${big?7.5:6.5}px;color:rgba(255,255,255,.75);margin-top:2px;font-family:'Inter',sans-serif;letter-spacing:0.3px;">(Govt. Recognised) · Ishapur, Laxminagar, Mathura</div>
        ${phone ? `<div style="font-size:${big?7.5:6.5}px;color:rgba(255,255,255,.85);margin-top:1px;font-family:'Inter',sans-serif;">Ph.: ${phone}</div>` : ''}
      </div>
    </div>
    <div style="position:absolute;bottom:-1px;left:0;right:0;height:28px;overflow:hidden;z-index:1;">
      <svg viewBox="0 0 300 28" preserveAspectRatio="none" style="width:100%;height:100%;"><path d="M0,28 L0,12 Q75,0 150,14 Q225,28 300,12 L300,28 Z" fill="#fff"/></svg>
    </div>
  </div>
  <div style="background:#fff;padding:${big?'6px 14px 12px':'4px 12px 10px'};">
    <div style="display:flex;justify-content:center;margin-bottom:6px;margin-top:2px;">
      <div style="width:${big?84:74}px;height:${big?102:90}px;border:2px solid ${th.acc};border-radius:6px;overflow:hidden;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">${photoEl}</div>
    </div>
    <div style="text-align:center;font-size:${big?15:13}px;font-weight:700;color:${th.h1};margin-bottom:6px;font-family:'Playfair Display',serif;letter-spacing:0.3px;">${s.fn} ${s.ln}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:5px;">
      ${row("Father's Name", s.father||'—')}
      ${row("Mother's Name", s.mother||'—')}
      ${row('D.O.B.', dob)}
      ${row('Contact No.', mob)}
      ${s.blood ? row('Blood Group', s.blood) : ''}
    </table>
    <div style="font-size:${big?7.5:7}px;color:#888;margin-bottom:7px;font-family:'Inter',sans-serif;"><span style="font-weight:600;color:#555;">Addr:</span> ${addr}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #f0f0f0;padding-top:5px;">
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="font-size:${big?7.5:7}px;font-weight:600;color:#999;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:0.8px;">Class</div>
        <div style="font-size:${big?11:10}px;font-weight:700;color:${th.h2};font-family:'Playfair Display',serif;border-bottom:2px solid ${th.acc};padding-bottom:1px;line-height:1;">${s.cls||'—'}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:${big?10:9}px;font-style:italic;color:${th.h1};font-family:'Playfair Display',serif;">${prin||'__________'}</div>
        <div style="font-size:${big?7.5:7}px;color:#888;margin-top:1px;font-family:'Inter',sans-serif;">Principal Sign.</div>
      </div>
    </div>
  </div>
  <div style="background:linear-gradient(90deg,${th.h1},${th.acc},${th.h2});height:4px;"></div>
</div>`;
}

const cardCSS = (single) => `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#e2e8f0;padding:${single?'20px':'16px'};display:${single?'flex':'block'};justify-content:center}
  .grid{display:grid;grid-template-columns:repeat(2,280px);gap:16px;justify-content:center}
  @media print{body{background:#fff;padding:0;}@page{margin:8px;size:${single?'310px 490px':'A4 landscape'}}}
`;

export function printCard(s, photo, logo, phone, year, prin, theme) {
  const w = window.open('', '_blank', 'width=360,height=560');
  w.document.write(`<!DOCTYPE html><html><head><style>${cardCSS(true)}</style></head><body>${buildCard(s, photo, logo, phone, year, prin, theme, true)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

export function printClassCards(students, photos, logo, phone, year, prin, theme) {
  const cards = students.map(s => buildCard(s, photos[s.id] || null, logo, phone, year, prin, theme, false)).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><style>${cardCSS(false)}</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

// ── Certificate header (used by CC) ──────────────────────────────
const certHeader = (school, addr, phone, logo) => {
  const logoImg = logo ? `<img src="${logo}" style="width:64px;height:64px;object-fit:contain;margin-bottom:8px;filter:drop-shadow(0 1px 4px rgba(0,0,0,.15));">` : `<span style="font-size:40px;margin-bottom:8px;display:block;">🏫</span>`;
  return `<div style="text-align:center;border-bottom:1.5px solid #c8a96e;padding-bottom:14px;margin-bottom:18px;">
    ${logoImg}
    <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#1a2e5a;letter-spacing:0.3px;">${school}</div>
    <div style="font-family:'Inter',sans-serif;font-size:11px;color:#777;margin-top:3px;">(Govt. Recognised)</div>
    <div style="font-family:'Inter',sans-serif;font-size:11px;color:#666;margin-top:2px;">${addr}</div>
    ${phone ? `<div style="font-family:'Inter',sans-serif;font-size:11px;color:#666;">Ph.: ${phone}</div>` : ''}
  </div>`;
};

// ── Transfer Certificate ──────────────────────────────────────────
const tcCSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;padding:20px}
.cert{max-width:760px;margin:0 auto;padding:32px 48px 40px;border:1.5px solid #c8a96e;position:relative;overflow:hidden}
.cert::before{content:'';position:absolute;inset:5px;border:0.5px solid #e8d5a8;pointer-events:none;z-index:0}
.logo-wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;height:320px;object-fit:contain;opacity:0.04;pointer-events:none;z-index:0}
.content{position:relative;z-index:1}
.hdr{text-align:center;padding-bottom:14px;border-bottom:1.5px solid #c8a96e;margin-bottom:12px}
.hdr-logo{width:68px;height:68px;object-fit:contain;margin-bottom:8px;filter:drop-shadow(0 1px 4px rgba(0,0,0,.15))}
.hdr-logo-ph{font-size:44px;margin-bottom:8px;display:block}
.hdr h1{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#1a2e5a;letter-spacing:0.5px;margin-bottom:3px}
.hdr .sub{font-family:'Inter',sans-serif;font-size:11px;font-weight:400;color:#666;margin-top:2px;letter-spacing:0.2px}
.ttl-box{background:#f7f2e8;border-top:1.5px solid #c8a96e;border-bottom:1.5px solid #c8a96e;padding:7px 0;margin:12px 0 14px;text-align:center}
.ttl-box span{font-family:'Playfair Display',serif;font-size:13.5px;font-weight:600;color:#1a2e5a;letter-spacing:2px;text-transform:uppercase}
.meta-row{display:flex;justify-content:space-between;font-size:11.5px;color:#444;margin-bottom:16px;font-weight:500;font-family:'Inter',sans-serif}
.meta-row strong{color:#1a2e5a;font-weight:600}
.rows{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:4px}
.rows tr td{padding:5.5px 0;vertical-align:top;line-height:1.5}
.rows tr td.lbl{width:220px;color:#555;font-weight:400;padding-right:8px;white-space:nowrap;font-family:'Inter',sans-serif}
.rows tr td.sep{width:12px;text-align:center;color:#999;font-weight:300}
.rows tr td.val{font-weight:600;color:#1a1a2e;border-bottom:1px solid #ddd;font-family:'Inter',sans-serif;padding-bottom:4px}
.rows tr td.val.noln{border-bottom:none}
.foot{margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;font-family:'Inter',sans-serif}
.foot-left p{margin-bottom:6px;color:#444;font-weight:400}
.foot-left strong{color:#1a1a2e;font-weight:600}
.sign-block{text-align:center}
.sign-line{border-top:1.5px solid #1a2e5a;width:180px;margin-top:44px;padding-top:5px;font-weight:600;font-size:12.5px;color:#1a2e5a;font-family:'Inter',sans-serif;letter-spacing:0.5px}
@media print{body{padding:0}.cert{border:1.5px solid #c8a96e;max-width:100%}@page{margin:10mm;size:A4 portrait}}
`;

function tcBody(s, logo, sets, { tcNo, dt, admDt, ld, reason, conduct, feeStatus, attP, attT }) {
  const school  = sets.school || 'LORD KRISHNA PUBLIC SCHOOL';
  const addr    = sets.addr   || 'Ishapur, Laxminagar, Mathura';
  const phone   = sets.phone  || '';
  const dob     = s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '—';
  const attPct  = attT > 0 ? Math.round(attP / attT * 100) : 0;
  const stuAddr = [s.addr, s.city].filter(Boolean).join(', ') || '—';

  // DOB in words
  const dobInWords = (() => {
    if (!s.dob) return '—';
    const d = new Date(s.dob);
    const day = d.getDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const numToWords = (n) => {
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
      return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWords(n%100) : '');
    };
    const year = d.getFullYear();
    const y1 = Math.floor(year/100);
    const y2 = year % 100;
    const yearWords = numToWords(y1) + ' Hundred' + (y2 ? ' and ' + numToWords(y2) : '');
    return `${numToWords(day)} ${months[d.getMonth()]} ${yearWords}`;
  })();

  const logoImg  = logo ? `<img class="hdr-logo" src="${logo}">` : `<span class="hdr-logo-ph">🏫</span>`;
  const logoWm   = logo ? `<img class="logo-wm" src="${logo}">` : '';

  const row = (label, value, noUnderline = false) =>
    `<tr><td class="lbl">${label}</td><td class="sep">:</td><td class="val${noUnderline?' noln':''}">${value || '—'}</td></tr>`;

  return `<div class="cert">
  ${logoWm}
  <div class="content">
    <div class="hdr">
      ${logoImg}
      <h1>${school}</h1>
      <div class="sub">(Govt. Recognised)</div>
      <div class="sub">${addr}${phone ? '  ·  Ph.: ' + phone : ''}</div>
      ${sets.year ? `<div class="sub">Academic Year : ${sets.year}</div>` : ''}
    </div>
    <div class="ttl-box"><span>Transfer Certificate</span></div>
    <div class="meta-row">
      <span>Sl. No. : <strong>${tcNo || '—'}</strong></span>
      <span>Date : <strong>${dt || '—'}</strong></span>
    </div>
    <table class="rows">
      ${row('Name of Student', s.fn + ' ' + s.ln)}
      ${row("Father's Name", s.father)}
      ${row("Mother's Name", s.mother)}
      ${row('Address', stuAddr)}
      ${row('Date of Admission', admDt)}
      ${row('Last Date of Attendance', ld)}
      ${row('Class', s.cls)}
      ${row('Roll No.', s.roll)}
      ${row('Admission No.', s.admno)}
      ${s.pen ? row('PEN No.', s.pen) : ''}
      ${s.apaar ? row('APAAR ID', s.apaar) : ''}
      ${row('Date of Birth (as per register)', dob + (s.dob ? `  <span style="font-weight:400;color:#555;font-size:11.5px">(${dobInWords})</span>` : ''))}
      ${s.blood ? row('Blood Group', s.blood) : ''}
      ${s.aadhar ? row('Aadhaar No.', s.aadhar) : ''}
      ${s.ps ? row('Previous School', s.ps) : ''}
      ${row('Character &amp; Conduct', conduct)}
      ${row('Reason for Leaving', reason, true)}
    </table>
    <div style="margin:16px 0 20px;padding:12px 16px;border:1px solid #c8a96e;border-radius:4px;background:#fdfaf4;font-size:11.5px;color:#444;font-style:italic;line-height:1.7;font-family:'Inter',sans-serif;">
      Certified that the above scholar's name has been struck off from the school register and all dues have been cleared. The entries made above are correct as per the school records and the register of admissions and withdrawals has been duly maintained in accordance with departmental rules.
    </div>
    <div class="foot">
      <div class="foot-left">
        <p>Date : <strong>${dt || '—'}</strong></p>
        <p>Place : <strong>Mathura</strong></p>
      </div>
      <div class="sign-block">
        <div class="sign-line">Principal</div>
        <div style="font-size:10.5px;margin-top:4px;color:#666;">${school}</div>
      </div>
    </div>
  </div>
</div>`;
}

export function buildTC(s, logo, sets, opts) {
  return `<style>${tcCSS}</style><body style="padding:0;background:#fff;">${tcBody(s, logo, sets, opts)}</body>`;
}

export function printTC(s, logo, sets, opts) {
  const w = window.open('', '_blank', 'width=820,height=1100');
  w.document.write(`<!DOCTYPE html><html><head><title>TC - ${s.fn} ${s.ln}</title><style>${tcCSS}</style></head><body>${tcBody(s, logo, sets, opts)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

// ── Character Certificate ─────────────────────────────────────────
const ccCSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;padding:20px}
.cert{background:#fff;max-width:700px;margin:0 auto;padding:36px 48px 40px;border:1.5px solid #c8a96e;position:relative;overflow:hidden}
.cert::before{content:'';position:absolute;inset:5px;border:0.5px solid #e8d5a8;pointer-events:none;z-index:0}
.inner{position:relative;z-index:1}
.ttl{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:#1a2e5a;text-align:center;margin:14px 0 4px;letter-spacing:1.5px;text-transform:uppercase}
.ttl-line{width:60px;height:2px;background:#c8a96e;margin:0 auto 16px}
.no{text-align:right;font-size:11.5px;color:#777;margin-bottom:18px;font-weight:400}
.no b{color:#1a2e5a;font-weight:600}
.body{font-size:13.5px;line-height:2;color:#2a2a3a;text-align:justify;font-weight:400}
.body b{color:#1a2e5a;font-weight:600}
.seal{display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px}
.slk{text-align:center;min-width:150px}
.sll{font-size:12px;font-weight:600;color:#1a2e5a;margin-top:40px;border-top:1.5px solid #1a2e5a;padding-top:5px;font-family:'Inter',sans-serif;letter-spacing:0.5px}
.seal-circle{width:72px;height:72px;border:1.5px dashed #c8a96e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#c8a96e;font-weight:600;text-align:center;padding:6px;font-family:'Inter',sans-serif;letter-spacing:0.5px;opacity:0.35}
.foot-note{text-align:center;margin-top:16px;font-size:10.5px;color:#bbb;border-top:1px solid #f0ebe0;padding-top:8px;font-family:'Inter',sans-serif}
@media print{body{background:#fff;padding:0}.cert{box-shadow:none;border:1.5px solid #c8a96e;max-width:100%}@page{margin:8mm;size:A4}}
`;

function ccBody(s, logo, sets, { ccNo, dt, conduct, purpose, remarks, attP, attT }) {
  const school  = sets.school || 'LORD KRISHNA PUBLIC SCHOOL';
  const attPct  = attT > 0 ? Math.round(attP / attT * 100) : 0;
  const sonDaughter = s.gn === 'Female' ? 'Daughter' : 'Son';
  const conductMap = { Good: 'good character and conduct', 'Very Good': 'very good character and conduct', Excellent: 'excellent character and conduct', Satisfactory: 'satisfactory conduct' };
  const certWm = logo ? `<img src="${logo}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:340px;height:340px;object-fit:contain;opacity:0.05;pointer-events:none;z-index:0;">` : '';
  return `<div class="cert">
  ${certWm}
  <div class="inner">
    ${certHeader(school, sets.addr || '', sets.phone || '', logo)}
    <div class="ttl">Character Certificate</div>
    <div class="ttl-line"></div>
    <div class="no"><b>Cert. No.:</b> ${ccNo || '—'} &nbsp;&nbsp; <b>Date:</b> ${dt}</div>
    <div class="body">
      <p>This is to certify that <b>${s.fn} ${s.ln}</b>, ${sonDaughter} of <b>${s.father || '—'}</b>, was a bonafide student of <b>${school}</b> during the academic year <b>${sets.year || '—'}</b>.</p>
      <br>
      <p>During the period of study in Class <b>${s.cls || '—'}</b>, the student has shown <b>${conductMap[conduct] || 'good character and conduct'}</b>. Attendance recorded was <b>${attPct}%</b>. The student has been regular and disciplined throughout the academic session.</p>
      ${remarks ? `<br><p>${remarks}</p>` : ''}
      <br>
      <p>This certificate is issued for <b>${purpose}</b> as per the request of the student/parent. We wish the student all the best in future endeavours.</p>
    </div>
    <div class="seal">
      <div style="text-align:center;"><div class="seal-circle">SCHOOL<br>SEAL</div></div>
      <div class="slk"><div class="sll">Class Teacher</div></div>
      <div class="slk">
        <div style="font-size:13px;font-style:italic;color:#1a2e5a;margin-bottom:3px;font-family:'Playfair Display',serif;">${sets.prin || ''}</div>
        <div class="sll">Principal</div>
      </div>
    </div>
    <div class="foot-note">Generated: ${new Date().toLocaleDateString('en-IN')} &nbsp;·&nbsp; ${sets.year || ''}</div>
  </div>
</div>`;
}

export function buildCC(s, logo, sets, opts) {
  return `<style>${ccCSS}</style><body style="padding:0;background:#fff;">${ccBody(s, logo, sets, opts)}</body>`;
}

export function printCC(s, logo, sets, opts) {
  const w = window.open('', '_blank', 'width=820,height=960');
  w.document.write(`<!DOCTYPE html><html><head><title>CC - ${s.fn} ${s.ln}</title><style>${ccCSS}</style></head><body>${ccBody(s, logo, sets, opts)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

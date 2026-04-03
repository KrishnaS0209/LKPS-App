// ── ID Card HTML builder — CR80 Portrait (54 × 85.6 mm) ─────────
// Rendered at 2× for screen clarity: 404 × 638 px
// Print CSS scales back to physical CR80 via transform:scale(0.51)

const GFONT = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Roboto:wght@300;400;500;700&display=swap');`;

const THEMES = {
  blue:   { h1: '#0d2b6e', h2: '#1749b1', acc: '#f0c040' },
  green:  { h1: '#064e3b', h2: '#059669', acc: '#6ee7b7' },
  maroon: { h1: '#6b0f0f', h2: '#b91c1c', acc: '#fca5a5' },
  navy:   { h1: '#0f172a', h2: '#1e3a5f', acc: '#93c5fd' },
  purple: { h1: '#3b0764', h2: '#7c3aed', acc: '#ddd6fe' },
};

// CR80 portrait at 2× scale: 54mm × 85.6mm → 404 × 638 px
const CW = 404;
const CH = 638;

function buildCardFront(s, photo, logo, phone, year, prin, theme) {
  const th = THEMES[theme] || THEMES.blue;
  const dob = s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '—';
  const mob = s.fphone || s.ph || '—';

  const logoEl = logo
    ? `<img src="${logo}" style="width:60px;height:60px;object-fit:contain;display:block;">`
    : `<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:30px;">🏫</div>`;

  const photoEl = photo
    ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#dde4f0;font-size:52px;font-weight:900;color:#8899bb;font-family:'Montserrat',sans-serif;">${((s.fn||'?')[0]).toUpperCase()}</div>`;

  let qrEl = '';
  try {
    const qd = encodeURIComponent(`${s.fn||''} ${s.ln||''}\nClass:${s.cls||''} Roll:${s.roll||''}\nAdm:${s.admno||''}\nFather:${s.father||''}\nPh:${mob}`);
    qrEl = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qd}&margin=4&ecc=M" width="72" height="72" style="display:block;border-radius:4px;" alt="QR"/>`;
  } catch(e){}

  const field = (label, val) =>
    `<div style="margin-bottom:9px;">
      <div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.9px;font-family:'Roboto',sans-serif;margin-bottom:2px;">${label}</div>
      <div style="font-size:12.5px;font-weight:700;color:#111;font-family:'Montserrat',sans-serif;line-height:1.2;">${val}</div>
    </div>`;

  return `<div style="width:${CW}px;height:${CH}px;border-radius:14px;overflow:hidden;font-family:'Montserrat',sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;position:relative;">
<style>${GFONT}</style>

<!-- ── Header ── -->
<div style="background:linear-gradient(160deg,${th.h1} 0%,${th.h2} 100%);padding:16px 16px 14px;display:flex;flex-direction:column;align-items:center;gap:10px;flex-shrink:0;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-50px;right:-30px;width:200px;height:200px;background:rgba(255,255,255,.04);border-radius:50%;pointer-events:none;"></div>
  <div style="position:absolute;bottom:-60px;left:-20px;width:160px;height:160px;background:rgba(255,255,255,.03);border-radius:50%;pointer-events:none;"></div>
  <div style="display:flex;align-items:center;gap:12px;position:relative;z-index:1;width:100%;">
    ${logoEl}
    <div style="flex:1;">
      <div style="font-size:14.5px;font-weight:900;color:#fff;font-family:'Montserrat',sans-serif;text-transform:uppercase;letter-spacing:0.3px;line-height:1.15;">Lord Krishna Public School</div>
      <div style="font-size:8.5px;color:rgba(255,255,255,.72);margin-top:3px;font-family:'Roboto',sans-serif;">(Govt. Recognised) · Ishapur, Laxminagar, Mathura</div>
      ${phone ? `<div style="font-size:8.5px;color:rgba(255,255,255,.78);margin-top:2px;font-family:'Roboto',sans-serif;">Ph: ${phone}</div>` : ''}
    </div>
  </div>
  <!-- ID Card label -->
  <div style="position:relative;z-index:1;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:4px 18px;margin-top:2px;">
    <span style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:2.5px;font-family:'Montserrat',sans-serif;">Student ID Card</span>
  </div>
</div>

<!-- ── Gold accent line ── -->
<div style="height:3px;background:linear-gradient(90deg,${th.acc},${th.h2},${th.acc});flex-shrink:0;"></div>

<!-- ── Photo + Name band ── -->
<div style="background:#fff;padding:14px 16px 10px;display:flex;gap:14px;align-items:flex-start;flex-shrink:0;border-bottom:1px solid #eef0f5;">
  <div style="flex-shrink:0;">
    <div style="width:100px;height:122px;border-radius:8px;overflow:hidden;border:2.5px solid ${th.h2};box-shadow:0 4px 16px rgba(0,0,0,.15);">${photoEl}</div>
  </div>
  <div style="flex:1;padding-top:4px;">
    <div style="font-size:18px;font-weight:900;color:${th.h1};font-family:'Montserrat',sans-serif;line-height:1.15;margin-bottom:6px;">${s.fn||'Student'} ${s.ln||''}</div>
    <div style="height:2px;width:40px;background:${th.acc};border-radius:2px;margin-bottom:10px;"></div>
    ${field('Class / Section', s.cls||'—')}
    ${field('Date of Birth', dob)}
  </div>
</div>

<!-- ── Details grid ── -->
<div style="background:#fff;padding:12px 16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px;">
    ${field('Validity', year||'2025-2026')}
    ${s.admno ? field('Adm. No.', s.admno) : field('Roll No.', s.roll||'—')}
    ${field('Contact', mob)}
    ${s.blood ? field('Blood Group', `<span style="color:#b91c1c;">${s.blood}</span>`) : ''}
  </div>

  <!-- ── QR + Sign row ── -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #eef0f5;padding-top:10px;margin-top:4px;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
      ${qrEl}
      <div style="font-size:7px;color:#bbb;font-family:'Roboto',sans-serif;text-transform:uppercase;letter-spacing:0.5px;">Scan</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:14px;font-style:italic;color:${th.h1};font-family:'Georgia',serif;min-width:100px;border-bottom:1px solid #ddd;padding-bottom:4px;">${prin||'__________'}</div>
      <div style="font-size:8px;color:#aaa;font-family:'Roboto',sans-serif;text-transform:uppercase;letter-spacing:0.8px;margin-top:3px;">Principal</div>
    </div>
  </div>
</div>

<!-- ── Footer ── -->
<div style="background:${th.h1};padding:6px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
  <div style="font-size:8px;color:rgba(255,255,255,.5);font-family:'Roboto',sans-serif;letter-spacing:0.5px;">lkps-app.vercel.app</div>
  <div style="font-size:8px;color:${th.acc};font-family:'Roboto',sans-serif;font-weight:700;letter-spacing:0.5px;">EST. 2009</div>
</div>
</div>`;
}

export function buildCardBack(s, logo) {
  const mob = s.fphone || s.ph || '—';
  const addr = [s.addr, s.city, s.pin ? 'Pin-'+s.pin : ''].filter(Boolean).join(', ')
    || 'Ishapur, Laxminagar, Yamuna Paar, Dist-Mathura, Uttar Pradesh Pin-281204, (India)';

  const row = (label, val) =>
    `<div style="display:flex;gap:6px;margin-bottom:8px;align-items:baseline;">
      <div style="font-size:9.5px;font-weight:600;color:#666;font-family:'Roboto',sans-serif;white-space:nowrap;min-width:118px;">${label}</div>
      <div style="font-size:10.5px;font-weight:700;color:#111;font-family:'Montserrat',sans-serif;flex:1;line-height:1.3;">${val}</div>
    </div>`;

  return `<div style="width:${CW}px;height:${CH}px;border-radius:14px;overflow:hidden;font-family:'Montserrat',sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;">
<style>${GFONT}</style>

<!-- ── Top accent ── -->
<div style="height:6px;background:linear-gradient(90deg,#0d2b6e,#1749b1,#f0c040);flex-shrink:0;"></div>

<!-- ── School name mini header ── -->
<div style="background:#f8faff;padding:10px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e8edf5;flex-shrink:0;">
  ${logo
    ? `<img src="${logo}" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;">`
    : `<div style="font-size:22px;flex-shrink:0;">🏫</div>`}
  <div>
    <div style="font-size:11px;font-weight:900;color:#0d2b6e;font-family:'Montserrat',sans-serif;text-transform:uppercase;letter-spacing:0.3px;">Lord Krishna Public School</div>
    <div style="font-size:8px;color:#888;font-family:'Roboto',sans-serif;">Ishapur, Laxminagar, Mathura</div>
  </div>
</div>

<!-- ── Info body ── -->
<div style="flex:1;padding:14px 16px 10px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
  <div>
    ${s.blood ? row('Blood Group', `<span style="font-size:13px;font-weight:900;color:#b91c1c;">${s.blood}</span>`) : ''}
    ${row('Contact No.', mob)}
    ${row("Father's Name", s.father||'—')}
    ${s.fphone ? row("Father's Contact", s.fphone) : ''}
    <div style="margin-bottom:3px;font-size:9.5px;font-weight:600;color:#666;font-family:'Roboto',sans-serif;">Address</div>
    <div style="font-size:10px;font-weight:700;color:#111;font-family:'Montserrat',sans-serif;line-height:1.55;margin-bottom:12px;">${addr}</div>

    <!-- Rules -->
    <div style="display:inline-block;font-size:9px;font-weight:800;color:#0d2b6e;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;font-family:'Montserrat',sans-serif;border-bottom:2px solid #f0c040;padding-bottom:2px;">Rules to be followed</div>
    <div style="font-size:8.5px;color:#333;line-height:1.75;font-family:'Roboto',sans-serif;">
      <div style="margin-bottom:2px;">• Always carry and display this card in campus when asked by officials.</div>
      <div style="margin-bottom:2px;">• Loss of this ID card must be reported immediately to HoD/PC.</div>
      <div>• This card must be returned to HoD/PC before final clearance.</div>
    </div>
  </div>

  <!-- Watermark logo -->
  <div style="display:flex;justify-content:center;margin-top:8px;opacity:0.07;pointer-events:none;">
    ${logo
      ? `<img src="${logo}" style="width:80px;height:80px;object-fit:contain;">`
      : `<div style="font-size:64px;">🏫</div>`}
  </div>
</div>

<!-- ── Footer ── -->
<div style="background:#111;padding:8px 16px;text-align:center;flex-shrink:0;">
  <div style="font-size:8.5px;color:#ccc;font-family:'Roboto',sans-serif;line-height:1.65;">17 KM Stone, NH#2, Mathura-Delhi Road, P.O.: Chaumuhan, Mathura - 281 406 (UP) India</div>
  <div style="font-size:8.5px;color:#888;font-family:'Roboto',sans-serif;margin-top:1px;">Phone: +91-5662-250900, 909</div>
</div>
</div>`;
}

export function buildCard(s, photo, logo, phone, year, prin, theme, big = true) {
  return buildCardFront(s, photo, logo, phone, year, prin, theme);
}

// Print CSS — 2× rendered card scaled to physical CR80 portrait (0.51×)
const printCSS = (single) => `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#cbd5e1;padding:${single?'24px':'14px'};display:flex;gap:28px;justify-content:center;flex-wrap:wrap;align-items:flex-start;}
  .side-label{font-size:9px;color:#64748b;text-align:center;margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-family:Arial,sans-serif;}
  .card-wrap{transform:scale(0.51);transform-origin:top left;display:inline-block;line-height:0;}
  .side{display:flex;flex-direction:column;align-items:flex-start;width:${Math.round(CW*0.51)}px;height:${Math.round(CH*0.51)}px;}
  .pair{display:flex;gap:28px;margin-bottom:${single?'0':'24px'};justify-content:center;page-break-inside:avoid;align-items:flex-start;}
  @media print{
    body{background:#fff;padding:4mm;}
    .side-label{display:none;}
    .card-wrap{transform:scale(0.51);transform-origin:top left;}
    .pair{gap:8mm;}
    @page{margin:4mm;size:${single?'130mm 120mm':'A4 portrait'}}
  }
`;

export function printCard(s, photo, logo, phone, year, prin, theme) {
  const front = buildCardFront(s, photo, logo, phone, year, prin, theme);
  const back = buildCardBack(s, logo);
  const w = window.open('', '_blank', 'width=820,height=480');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${printCSS(true)}</style></head><body>
    <div class="pair">
      <div class="side"><div class="side-label">Front</div><div class="card-wrap">${front}</div></div>
      <div class="side"><div class="side-label">Back</div><div class="card-wrap">${back}</div></div>
    </div>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

export function printClassCards(students, photos, logo, phone, year, prin, theme) {
  const pairs = students.map(s => {
    const front = buildCardFront(s, photos[s.id]||null, logo, phone, year, prin, theme);
    const back = buildCardBack(s, logo);
    return `<div class="pair">
      <div class="side"><div class="side-label">Front</div><div class="card-wrap">${front}</div></div>
      <div class="side"><div class="side-label">Back</div><div class="card-wrap">${back}</div></div>
    </div>`;
  }).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${printCSS(false)}</style></head><body>${pairs}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}


// ── Certificate header (used by CC) ──────────────────────────────
const certHeader = (school, addr, phone, logo) => {
  const logoImg = logo ? `<img src="${logo}" style="width:90px;height:90px;object-fit:contain;margin-bottom:10px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.18));">` : `<span style="font-size:56px;margin-bottom:10px;display:block;">🏫</span>`;
  return `<div style="text-align:center;border-bottom:2px solid #b8960c;padding-bottom:14px;margin-bottom:18px;">
    ${logoImg}
    <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:800;color:#1a2e5a;letter-spacing:0.8px;text-transform:uppercase;">${school}</div>
    <div style="font-family:'Inter',sans-serif;font-size:13px;font-weight:500;color:#555;margin-top:4px;">(Govt. Recognised)</div>
    <div style="font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;color:#333;margin-top:3px;">${addr}${phone ? '  ·  Ph.: ' + phone : ''}</div>
  </div>`;
};

// ── Transfer Certificate ──────────────────────────────────────────
const tcCSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;min-height:297mm;background:#fff;font-family:'Inter',sans-serif}
body{padding:5mm}
.cert{width:calc(210mm - 10mm);min-height:calc(297mm - 10mm);margin:0 auto;padding:10mm 12mm 10mm;border:2px solid #b8960c;position:relative;display:flex;flex-direction:column}
.cert::before{content:'';position:absolute;inset:10px;border:0.8px solid #d4b84a;pointer-events:none;z-index:0}
.logo-wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;height:280px;object-fit:contain;opacity:0.04;pointer-events:none;z-index:0}
.content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column}
.hdr{text-align:center;padding-bottom:10px;border-bottom:2px solid #b8960c;margin-bottom:10px}
.hdr-logo{width:88px;height:88px;object-fit:contain;margin-bottom:8px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.18))}
.hdr-logo-ph{font-size:54px;margin-bottom:8px;display:block}
.hdr h1{font-family:'Playfair Display',serif;font-size:29px;font-weight:800;color:#1a2e5a;letter-spacing:0.8px;margin-bottom:4px;text-transform:uppercase}
.hdr .sub{font-family:'Inter',sans-serif;font-size:13px;font-weight:500;color:#555;margin-top:3px;letter-spacing:0.3px}
.hdr .sub-bold{font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;color:#333;margin-top:3px}
.ttl-box{background:#f7f2e8;border-top:2px solid #b8960c;border-bottom:2px solid #b8960c;padding:8px 0;margin:10px 0 12px;text-align:center}
.ttl-box span{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:#1a2e5a;letter-spacing:3px;text-transform:uppercase}
.meta-row{display:flex;justify-content:space-between;font-size:13px;color:#444;margin-bottom:12px;font-weight:500;font-family:'Inter',sans-serif}
.meta-row strong{color:#1a2e5a;font-weight:700}
.rows{width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:4px}
.rows tr td{padding:8px 0;vertical-align:top;line-height:1.6}
.rows tr td.lbl{width:240px;color:#444;font-weight:400;padding-right:8px;white-space:nowrap;font-family:'Inter',sans-serif}
.rows tr td.sep{width:14px;text-align:center;color:#888;font-weight:300}
.rows tr td.val{font-weight:600;color:#1a1a2e;border-bottom:1px solid #ddd;font-family:'Inter',sans-serif;padding-bottom:7px}
.rows tr td.val.noln{border-bottom:none}
.cert-stmt{margin:20px 0;font-size:13px;color:#333;font-style:italic;line-height:1.7;font-family:'Inter',sans-serif}
.foot{margin-top:auto;padding-top:20px;display:flex;justify-content:space-between;align-items:flex-end;font-size:13px;font-family:'Inter',sans-serif}
.foot-left p{margin-bottom:6px;color:#444;font-weight:400}
.foot-left strong{color:#1a1a2e;font-weight:600}
.sign-block{text-align:center}
.sign-line{border-top:1.5px solid #1a2e5a;width:200px;margin-top:48px;padding-top:5px;font-weight:700;font-size:13.5px;color:#1a2e5a;font-family:'Inter',sans-serif;letter-spacing:0.5px}
.sign-sub{font-size:11.5px;margin-top:3px;color:#666}
@media print{html,body{width:210mm;height:297mm}.cert{border:2px solid #b8960c;width:calc(210mm - 10mm);min-height:calc(297mm - 10mm);padding:10mm 12mm}@page{margin:5mm;size:A4 portrait}head{display:none}}
`;

function tcBody(s, logo, sets, { tcNo, dt, admDt, ld, reason, conduct, feeStatus, attP, attT }) {
  const school  = sets.school || 'LORD KRISHNA PUBLIC SCHOOL';
  const addr    = sets.addr   || 'Ishapur, Laxminagar, Mathura';
  const phone   = sets.phone  || '';
  const dob     = s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '—';
  const attPct  = attT > 0 ? Math.round(attP / attT * 100) : 0;
  const stuAddr = [s.addr, s.city].filter(Boolean).join(', ') || '—';

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

  const logoImg = logo ? `<img class="hdr-logo" src="${logo}">` : `<span class="hdr-logo-ph">🏫</span>`;
  const logoWm  = logo ? `<img class="logo-wm" src="${logo}">` : '';
  const row = (label, value, noUnderline = false) =>
    `<tr><td class="lbl">${label}</td><td class="sep">:</td><td class="val${noUnderline?' noln':''}">${value || '—'}</td></tr>`;

  return `<div class="cert">
  ${logoWm}
  <div class="content">
    <div class="hdr">
      ${logoImg}
      <h1>${school}</h1>
      <div class="sub">(Govt. Recognised)</div>
      <div class="sub-bold">${addr}${phone ? '  ·  Ph.: ' + phone : ''}</div>
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
    <p class="cert-stmt">Certified that above scholar's register of leaving school has been filled up to date as per departmental rules.</p>
    <div class="foot">
      <div class="foot-left">
        <p>Date : <strong>${dt || '—'}</strong></p>
        <p>Place : <strong>Mathura</strong></p>
      </div>
      <div class="sign-block">
        <div class="sign-line">Principal / Head Master</div>
        <div class="sign-sub">${school}</div>
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
  w.document.write(`<!DOCTYPE html><html><head><title>Transfer Certificate</title><style>${tcCSS}</style></head><body>${tcBody(s, logo, sets, opts)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

// ── Character Certificate ─────────────────────────────────────────
const ccCSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;min-height:297mm;background:#fff;font-family:'Inter',sans-serif}
body{padding:5mm}
.cert{width:calc(210mm - 10mm);min-height:calc(297mm - 10mm);margin:0 auto;padding:10mm 12mm;border:2px solid #b8960c;position:relative;display:flex;flex-direction:column}
.cert::before{content:'';position:absolute;inset:10px;border:0.8px solid #d4b84a;pointer-events:none;z-index:0}
.inner{position:relative;z-index:1;flex:1;display:flex;flex-direction:column}
.ttl{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#1a2e5a;text-align:center;margin:16px 0 4px;letter-spacing:2px;text-transform:uppercase}
.ttl-line{width:60px;height:2px;background:#b8960c;margin:0 auto 18px}
.no{text-align:right;font-size:14px;color:#555;margin-bottom:22px;font-weight:400}
.no b{color:#1a2e5a;font-weight:700}
.body{font-size:15px;line-height:2.2;color:#2a2a3a;text-align:justify;font-weight:400;flex:1}
.body b{color:#1a2e5a;font-weight:700}
.seal{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:24px}
.slk{text-align:center;min-width:160px}
.sll{font-size:14px;font-weight:700;color:#1a2e5a;margin-top:56px;border-top:1.5px solid #1a2e5a;padding-top:6px;font-family:'Inter',sans-serif;letter-spacing:0.5px}
@media print{html,body{width:210mm;height:297mm}.cert{border:2px solid #b8960c;width:calc(210mm - 10mm);min-height:calc(297mm - 10mm);padding:10mm 12mm}@page{margin:5mm;size:A4 portrait}}
`;

function ccBody(s, logo, sets, { ccNo, dt, conduct, purpose, remarks, attP, attT }) {
  const school  = sets.school || 'LORD KRISHNA PUBLIC SCHOOL';
  const addr    = sets.addr || 'Ishapur, Laxminagar, Mathura';
  const phone   = sets.phone || '';
  const attPct  = attT > 0 ? Math.round(attP / attT * 100) : 0;
  const attStr  = attT > 0 ? `<b>${attP}</b> days out of <b>${attT}</b> working days (<b>${attPct}%</b>)` : '—';
  const sonDaughter = s.gn === 'Female' ? 'Daughter' : 'Son';
  const conductMap = { Good: 'good character and conduct', 'Very Good': 'very good character and conduct', Excellent: 'excellent character and conduct', Satisfactory: 'satisfactory conduct' };
  const certWm = logo ? `<img src="${logo}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;object-fit:contain;opacity:0.04;pointer-events:none;z-index:0;">` : '';
  return `<div class="cert">
  ${certWm}
  <div class="inner">
    ${certHeader(school, addr, phone, logo)}
    <div class="ttl">Character Certificate</div>
    <div class="ttl-line"></div>
    <div class="no"><b>Cert. No.:</b> ${ccNo || '—'} &nbsp;&nbsp;&nbsp; <b>Date:</b> ${dt}</div>
    <div class="body">
      <p>This is to certify that <b>${s.fn}${s.ln?' '+s.ln:''}</b>, ${sonDaughter} of <b>${s.father || '—'}</b>, was a bonafide student of <b>${school}</b> during the academic year <b>${sets.year || '—'}</b>.</p>
      <br>
      <p>During the period of study in Class <b>${s.cls || '—'}</b>, the student has shown <b>${conductMap[conduct] || 'good character and conduct'}</b>. The student attended school for ${attStr}. The student has been regular and disciplined throughout the academic session.</p>
      ${remarks ? `<br><p>${remarks}</p>` : ''}
      <br>
      <p>This certificate is issued for <b>${purpose}</b> as per the request of the student/parent. We wish the student all the best in future endeavours.</p>
    </div>
    <div class="seal">
      <div class="slk"><div class="sll">Class Teacher</div></div>
      <div class="slk">
        <div style="font-size:14px;font-style:italic;color:#1a2e5a;margin-bottom:3px;font-family:'Playfair Display',serif;">${sets.prin || ''}</div>
        <div class="sll">Principal / Head Master</div>
      </div>
    </div>
  </div>
</div>`;
}

export function buildCC(s, logo, sets, opts) {
  return `<style>${ccCSS}</style><body style="padding:0;background:#fff;">${ccBody(s, logo, sets, opts)}</body>`;
}

export function printCC(s, logo, sets, opts) {
  const w = window.open('', '_blank', 'width=820,height=1100');
  w.document.write(`<!DOCTYPE html><html><head><title>Character Certificate</title><style>${ccCSS}</style></head><body>${ccBody(s, logo, sets, opts)}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

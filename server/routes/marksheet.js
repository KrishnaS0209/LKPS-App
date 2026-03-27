const router  = require('express').Router();
const { auth } = require('../middleware/auth');
const puppeteer = require('puppeteer');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');

// POST /api/marksheet/save
// body: { html, cls, filename }  (filename = "01,Krishna")
router.post('/save', auth, async (req, res) => {
  try {
    const { html, cls, filename } = req.body;
    if (!html || !cls || !filename) {
      return res.status(400).json({ error: 'html, cls, filename required' });
    }

    // Build path: ~/Desktop/Report Cards (2025-26)/<cls>/
    const desktop = path.join(os.homedir(), 'Desktop');
    const root    = path.join(desktop, 'Report Cards (2025-26)');
    const clsDir  = path.join(root, cls);
    fs.mkdirSync(clsDir, { recursive: true });

    const pdfPath = path.join(clsDir, `${filename}.pdf`);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await browser.close();

    res.json({ ok: true, path: pdfPath });
  } catch (err) {
    console.error('marksheet save error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

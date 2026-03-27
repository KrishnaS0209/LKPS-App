# LKPS — Lord Krishna Public School Management System

Built with React. Runs in any browser — no Electron needed.

## 🚀 Quick Start

```bash
# 1. Install dependencies (only first time)
npm install

# 2. Start the app
npm start
```

Opens automatically at **http://localhost:3000**

## 🔑 Login
- **Admin:** `admin` / `admin123`  
- **Teacher:** Use credentials set in Teachers → Portal Access

## 🖼 Adding Your School Logo
Place your logo as:
```
public/
└── logo.png     ← put it here
```
The logo appears automatically in ID Cards and Certificates.

## 💾 Data Storage
All data is saved in your **browser's localStorage** — it stays between sessions automatically.

To backup: go to Reports → Backup JSON  
To restore: go to Reports → Restore Backup

## 📦 Files
```
src/
├── App.jsx      — All pages and components
├── db.js        — Data storage (localStorage)
├── print.js     — ID card & certificate printing
├── ui.jsx       — Shared UI components
└── index.js     — Entry point
```

## 🏗 Build for Production
```bash
npm run build
```
Creates a `build/` folder you can deploy anywhere.

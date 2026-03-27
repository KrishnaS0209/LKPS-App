# LKPS Backend API

Node.js + Express + MongoDB backend for LORD KRISHNA PUBLIC SCHOOL admin portal.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and configure
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET

# 3. Start MongoDB (if running locally)
mongod

# 4. Run dev server
npm run dev

# 5. Run production
npm start
```

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login → returns JWT |
| POST | `/api/auth/teacher-login` | Teacher portal login |
| GET  | `/api/auth/me` | Get current user (requires token) |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/sessions` | List all sessions |
| POST   | `/api/sessions` | Create session (with optional carry-over) |
| PATCH  | `/api/sessions/:sid` | Rename session |
| DELETE | `/api/sessions/:sid` | Delete session + all data |

### Per-Session Resources
All require `Authorization: Bearer <token>` header.

Base: `/api/sessions/:sessionId/`

| Resource | Endpoints |
|----------|-----------|
| `students` | GET, POST, PATCH /:sid, DELETE /:sid |
| `teachers` | GET, POST, PATCH /:tid, DELETE /:tid |
| `payments` | GET (?sid=), POST, DELETE /:pid |
| `attendance` | GET (?date=&cls=), POST |
| `exams` | GET, POST, PATCH /:eid, DELETE /:eid |
| `data` | GET, PATCH (settings/classes/tt/slots/fstr/events) |

### Admins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/admins` | List admins |
| POST   | `/api/admins` | Add admin (main admin only) |
| PATCH  | `/api/admins/:id` | Edit admin |
| DELETE | `/api/admins/:id` | Remove admin (main admin only) |

## Default Credentials
- Username: `admin`
- Password: `admin123`

> Change the password after first login.

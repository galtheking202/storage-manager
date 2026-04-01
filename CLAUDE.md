# Halel Project — Claude Context

## What this app is
Military equipment inventory management system (מחסן ציוד) for internal IDF use.
Hebrew UI, RTL layout. Two roles: **manager** and **soldier**.

## Project structure
```
halelproject/
├── src/                        # React frontend (Vite + TypeScript + Zustand)
│   ├── components/
│   │   ├── ManagerPage.tsx     # 4 tabs: setup, inventory, users, approvals
│   │   ├── UserPage.tsx        # 2 tabs: borrow equipment, view owned
│   │   └── LoginPage.tsx       # Email/password login form
│   ├── App.tsx                 # Auth routing: LoginPage → ManagerPage | UserPage
│   ├── store.ts                # Zustand store — auth + all data + API actions
│   ├── api.ts                  # fetch wrapper (adds Bearer token, VITE_API_URL base)
│   ├── types.ts                # Shared TypeScript types
│   └── App.css                 # All styles (RTL, Hebrew-friendly)
├── server/                     # Express + Prisma backend
│   ├── src/
│   │   ├── index.ts            # App entry, seeds first manager via env vars
│   │   ├── middleware/auth.ts  # JWT auth middleware, requireManager guard
│   │   └── routes/
│   │       ├── auth.ts         # POST /login, GET /me, POST /register
│   │       ├── items.ts        # CRUD for equipment items
│   │       ├── acquisitions.ts # Loan request flow (pending→approved→return_pending→completed)
│   │       └── users.ts        # GET all soldiers with acquisitions (manager only)
│   ├── prisma/schema.prisma    # PostgreSQL schema (User, Item, Acquisition)
│   ├── Dockerfile
│   └── package.json
├── db/
│   └── Dockerfile              # postgres:16-alpine
├── Dockerfile                  # Frontend: node build → nginx:alpine
├── nginx.conf                  # SPA routing (try_files → index.html)
├── .env.example                # VITE_API_URL
└── server/.env.example         # DATABASE_URL, JWT_SECRET, PORT, SEED_*
```

## Database schema (PostgreSQL via Prisma)

### users
| id | name | email (unique) | passwordHash | role (manager/soldier) | createdAt |

### items
| id | name | category | totalAmount | available | notes |

### acquisitions
| id | userId (FK) | itemId (FK) | amount | loanType (permanent/temporary) | status | missionName | returnDate | acquiredAt | createdAt |

Status flow: `pending` → `approved` → `return_pending` → `completed` (completed = approved return, filtered out of active views)

## Auth flow
- Login: `POST /api/auth/login` → JWT (8h expiry) stored in localStorage
- Token restored on page load via `initAuth()` (called in App.tsx useEffect)
- All API requests: `Authorization: Bearer <token>` header
- Role in JWT payload → App.tsx renders ManagerPage or UserPage accordingly
- First manager account: set `SEED_EMAIL` + `SEED_PASSWORD` env vars on server

## Store architecture (store.ts)
- Keeps all data in Zustand state (items[], users[], currentUser)
- Optimistic updates: local state updated immediately, API call fires in background
- On API error: re-fetches from server to revert
- IDs: DB returns integers, frontend normalizes everything to strings (String(id))
- After manager login: fetchItems() + fetchUsers() (users include their acquisitions)
- After soldier login: fetchItems() + fetchCurrentUserData() (sets currentUser with their acquisitions)

## API endpoints
```
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/register          (manager only — creates soldier/manager accounts)

GET    /api/items
POST   /api/items                (manager only)
PATCH  /api/items/:id            (manager only)
DELETE /api/items/:id            (manager only)

GET    /api/acquisitions         (soldier: own, manager: all non-completed)
POST   /api/acquisitions         (soldier: submit request)
PATCH  /api/acquisitions/:id     (manager: approved/completed, soldier: return_pending)

GET    /api/users                (manager only — soldiers with active acquisitions)
```

## Deployment (Railway)
Three separate Railway services, each pointing to its own directory + Dockerfile:
- **frontend**: root dir, `./Dockerfile` → nginx on port 80
- **server**: `./server`, `./Dockerfile` → node on port 3000
- **db**: `./db`, `./Dockerfile` → postgres on port 5432

Environment variables to set on Railway:
- frontend service: `VITE_API_URL` = server's Railway URL
- server service: `DATABASE_URL`, `JWT_SECRET`, `PORT=3000`, optionally `SEED_EMAIL/SEED_PASSWORD/SEED_NAME`
- db service: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (or use Railway's managed postgres)

## Tech stack
- Frontend: React 19, TypeScript, Vite, Zustand, plain CSS (no framework)
- Backend: Node 20, Express, Prisma ORM, bcrypt, jsonwebtoken
- DB: PostgreSQL 16
- Container: nginx:alpine (frontend), node:20-alpine (server), postgres:16-alpine (db)

## Key conventions
- All UI text is Hebrew, direction: rtl
- String IDs in frontend (even though DB uses integer PKs)
- No self-registration — manager creates all accounts via POST /api/auth/register
- mockData.ts is legacy — no longer used (store fetches from API after login)

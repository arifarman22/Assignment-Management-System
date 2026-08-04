# Assignment Management System

A full-stack role-based assignment and submission management system for schools and colleges. Teachers create and manage assignments, students submit answers and view grades, and admins manage users and classes.

**Live Demo**
- Frontend: https://assignment-management-system-nw7f.vercel.app
- Backend API: https://assignment-management-system-kohl.vercel.app/docs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT (python-jose), bcrypt |
| Validation | Zod (frontend), Pydantic field validators (backend) |
| Rate Limiting | slowapi (10/min on login, 200/min global) |
| Deployment | Vercel (frontend + backend via Mangum) |

---

## Design Decisions

### Data Model
- **Users** have a single `role` enum (`admin`, `teacher`, `student`).
- **Classes** represent a course section (e.g. "CS101 – Python"). Many-to-many with both teachers and students via join tables (`teacher_class`, `student_class`).
- **Assignments** belong to one teacher and one class. They have a `status` (`draft`/`published`) — students only see published ones.
- **Submissions** are one-per-student-per-assignment. Updates are allowed before the deadline if `allow_resubmit=true` and the submission is not graded.

### Auth & Authorization
- JWT stored in `localStorage` on the client. The token carries only `sub` (user ID).
- Role checks are done server-side via `require_roles()` dependency — no role data is trusted from the client.
- Teachers can only manage assignments for classes they are assigned to.
- Axios response interceptor auto-redirects to `/login` on 401 and surfaces backend validation errors as readable toast messages.

### Security
- Rate limiting: login endpoint capped at 10 requests/minute per IP to prevent brute force.
- Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`.
- CORS restricted to known frontend origins only.
- Pydantic field validators enforce input constraints server-side (password length, future deadlines, positive marks, etc.).
- Zod schemas validate all forms client-side before any API call is made.

### Frontend Architecture
- Single `AuthContext` provides auth state across the app via `localStorage`.
- Role-based routing: `/dashboard/admin`, `/dashboard/teacher`, `/dashboard/student`.
- Next.js rewrites proxy all API calls (`/auth/*`, `/admin/*`, `/teacher/*`, `/student/*`) to the backend — no CORS issues in production.
- Framer Motion animations throughout — sidebar, modals, cards, score bars.
- Component library: `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Badge`, `Avatar`, `StatsCard`, `Skeleton`, `EmptyState`.

---

## Project Structure

```
Assignment Management System/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, rate limiting, security headers
│   │   ├── config.py         # Settings from .env via pydantic-settings
│   │   ├── database.py       # SQLAlchemy engine + session (Neon SSL)
│   │   ├── auth.py           # JWT creation/validation, bcrypt, role guards
│   │   ├── models/
│   │   │   ├── models.py     # ORM models (User, Class, Assignment, Submission)
│   │   │   └── schemas.py    # Pydantic schemas with field validators
│   │   ├── routes/
│   │   │   ├── auth.py       # POST /auth/login (rate limited)
│   │   │   ├── admin.py      # User & class management
│   │   │   ├── teacher.py    # Assignment CRUD, grading, class view
│   │   │   └── student.py    # View assignments, submit, view submissions
│   │   └── tests/
│   │       └── test_main.py  # Pytest test suite
│   ├── seed.py               # Demo data seeder
│   ├── requirements.txt
│   ├── vercel.json           # Backend Vercel deployment config
│   └── .env                  # Local environment variables (not committed)
└── frontend/
    ├── app/
    │   ├── login/page.tsx
    │   ├── dashboard/
    │   │   ├── admin/page.tsx    # Users table + expandable class cards
    │   │   ├── teacher/page.tsx  # Assignment grid + submissions + grading
    │   │   └── student/page.tsx  # Assignments + submissions + grade results
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── DashboardShell.tsx    # Sidebar + Topbar layout wrapper
    │   ├── Sidebar.tsx           # Collapsible animated sidebar
    │   ├── Topbar.tsx            # Sticky header with search + avatar
    │   └── ui/
    │       ├── Avatar.tsx
    │       ├── Badge.tsx
    │       ├── Button.tsx
    │       ├── Dialog.tsx
    │       ├── EmptyState.tsx
    │       ├── Input.tsx
    │       ├── Skeleton.tsx
    │       └── StatsCard.tsx
    ├── lib/
    │   ├── api.ts               # Axios instance with auth + error interceptors
    │   ├── auth-context.tsx     # React auth context
    │   ├── utils.ts             # cn(), formatDate(), getDeadlineStatus()
    │   └── validations.ts       # Zod schemas for all forms
    ├── types/index.ts           # Shared TypeScript types
    ├── next.config.ts           # API rewrites + security headers
    └── .env.local               # Local environment variables (not committed)
```

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A PostgreSQL database (local or [Neon](https://neon.tech) free tier)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and set your DATABASE_URL and SECRET_KEY
```

**.env file:**
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

```bash
# Seed demo data
python seed.py

# Run server
python -m uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

App: http://localhost:3000

### Running Tests

```bash
cd backend
pytest app/tests/ -v
```

> Tests use SQLite in-memory — no PostgreSQL required to run tests.

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | admin123 |
| Teacher | teacher@test.com | teacher123 |
| Student | student@test.com | student123 |

---

## Deployment (Vercel)

This project deploys as **two separate Vercel projects** from the same GitHub repo.

### Backend Project

1. Import repo on Vercel → set **Root Directory** to `backend`
2. Add environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon/PostgreSQL connection string |
| `SECRET_KEY` | Strong random key: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `FRONTEND_URL` | Your frontend Vercel URL (add after frontend deploys) |

### Frontend Project

1. Import same repo on Vercel → set **Root Directory** to `frontend`
2. Add environment variable:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your backend Vercel URL |

Next.js rewrites in `next.config.ts` proxy all `/auth/*`, `/admin/*`, `/teacher/*`, `/student/*` requests to the backend — no CORS issues in production.

---

## API Overview

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Any | Get JWT token (rate limited: 10/min) |
| GET | `/admin/users` | Admin | List all users |
| POST | `/admin/users` | Admin | Create user |
| PATCH/DELETE | `/admin/users/{id}` | Admin | Update / delete user |
| GET | `/admin/classes` | Admin | List classes with teachers & students |
| POST | `/admin/classes` | Admin | Create class |
| DELETE | `/admin/classes/{id}` | Admin | Delete class |
| POST | `/admin/classes/{id}/teachers/{tid}` | Admin | Assign teacher to class |
| POST | `/admin/classes/{id}/students/{sid}` | Admin | Enroll student in class |
| GET | `/teacher/classes` | Teacher | List own assigned classes |
| GET | `/teacher/assignments` | Teacher | List own assignments |
| POST | `/teacher/assignments` | Teacher | Create assignment |
| PATCH/DELETE | `/teacher/assignments/{id}` | Teacher | Update / delete assignment |
| GET | `/teacher/assignments/{id}/submissions` | Teacher | View submissions for assignment |
| PATCH | `/teacher/submissions/{id}/grade` | Teacher | Grade a submission |
| GET | `/student/assignments` | Student | View published assignments for enrolled classes |
| GET | `/student/assignments/{id}` | Student | View single assignment |
| POST | `/student/submissions` | Student | Submit answer |
| PATCH | `/student/submissions/{id}` | Student | Update submission (before deadline if allowed) |
| GET | `/student/submissions` | Student | View own submissions with grades & feedback |
| GET | `/health` | Any | Health check |

---

## Assumptions

- A student must be enrolled in at least one class by an admin before they can see any assignments.
- A teacher must be assigned to a class by an admin before they can create assignments for it.
- Submission updates are only allowed if `allow_resubmit=true` on the assignment and the submission has not been graded yet.
- Deadlines are stored and compared in UTC.
- Passwords are hashed with bcrypt — plain-text passwords are never stored.
- JWT tokens expire after 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

## Known Limitations

- No email verification or password reset flow.
- No pagination on list endpoints — all records are returned at once.
- Rate limiting uses in-memory storage and resets on server restart (not suitable for multi-instance deployments without a Redis backend).
- Vercel serverless functions have a cold-start delay on the free tier.
- File/attachment uploads for submissions are not supported — answers are plain text only.

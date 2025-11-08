#  🌐 Freelance Monitor & Offer System

##   Project Overview
A comprehensive CRM and monitoring system designed specifically for freelance developers to manage clients, create professional offers, and monitor client services.

##  ️ Architecture
**Type:** Modular Monolith with Microservice-inspired separation

**Technology Stack:**
| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Vue 3 + TypeScript + Tailwind CSS | Modern, responsive UI |
| Backend | Go + Gin Framework | High performance API |
| Database | PostgreSQL | Relational data storage |
| PDF Generation | Puppeteer (HTML → PDF) | Professional offer documents |
| Monitoring | Go routines + Node-Cron | Automated health checks |
| Notifications | Telegram Bot API + SMTP | Real-time alerts |

##  📊 Core Modules

### 1. Client Management Module
**Purpose:** Centralized client information and relationship management

**Features:**
- ✅ Add/Edit/Delete clients
- ✅ Contact person tracking
- ✅ Service history
- ✅ Contract management
- ✅ Renewal reminders

**Database Schema:**
```sql
clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### 2. Offer Management Module
**Purpose:** Create, track, and manage professional service offers

**Features:**
- ✅ Generate offer numbers: `038/MSI-DD/MM/YYYY`
- ✅ Editable offer templates
- ✅ PDF export functionality
- ✅ Email integration
- ✅ Offer status tracking
- ✅ Expiry reminders via email (daily 09:00)

**Database Schema:**
```sql
offers (
  id SERIAL PRIMARY KEY,
  offer_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INTEGER REFERENCES clients(id),
  date DATE NOT NULL,
  subject VARCHAR(500),
  items JSONB, -- Array of service items
  total_price DECIMAL(10,2),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 3. Service Monitoring Module
**Purpose:** Automated monitoring of client services and infrastructure

**Features:**
- ✅ Website uptime monitoring (5-minute intervals)
- ✅ SSL certificate expiry tracking
- ✅ Domain WHOIS expiry monitoring
- ✅ Performance metrics (response time, latency)
- ✅ Alert system

**Database Schema:**
```sql
services (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  domain VARCHAR(255),
  service_type VARCHAR(50), -- website, domain, email, hosting
  status VARCHAR(20) DEFAULT 'active', -- active, down, expired
  last_check TIMESTAMP,
  ssl_expiry DATE,
  domain_expiry DATE,
  created_at TIMESTAMP DEFAULT NOW()
)

uptime_logs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id),
  status VARCHAR(10), -- up, down
  response_time INTEGER, -- milliseconds
  checked_at TIMESTAMP DEFAULT NOW()
)
```

### 4. Notification & Alert Module
**Purpose:** Real-time notifications for service issues and renewals

**Features:**
- ✅ Telegram bot integration
- ✅ Email notifications
- ✅ Configurable alert thresholds
- ✅ Escalation rules

##  ️ Project Structure
```
freelance-monitor-system/
├── frontend/                 # Vue 3 + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── clients/         # Client management components
│   │   ├── offers/          # Offer management components
│   │   ├── monitoring/      # Monitoring dashboard components
│   │    └── shared/          # Shared utilities
├── backend/                  # Go + Gin API
│   ├── cmd/
│   │    └── api/
│   │        └── main.go
│   ├── internal/
│   │   ├── clients/         # Client business logic
│   │   ├── offers/          # Offer generation logic
│   │   ├── monitoring/      # Monitoring engine
│   │    └── notifications/  # Alert system
├── docker-compose.yml
├── README.md
└── .env.example
```

##  🔧 Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. Set up project structure
2. Configure database and ORM
3. Implement basic authentication
4. Create client management CRUD

### Phase 2: Core Features (Week 3-4)
1. Offer management with PDF generation
2. Basic monitoring engine
3. Notification system

### Phase 3: Advanced Features (Week 5-6)
1. Automated renewal reminders
2. Advanced monitoring features
3. Dashboard and reporting

### Phase 4: Polish & Deployment (Week 7-8)
1. UI/UX improvements
2. Performance optimization
3. Production deployment

##   Additional Features for Freelance Optimization

### 1. Financial Dashboard
- Monthly revenue tracking
- Project profitability analysis
- Expense management

### 2. Time Tracking Integration
- Track billable hours
- Project time allocation
- Invoice generation

### 3. Project Pipeline Management
- Lead tracking
- Proposal status
- Contract lifecycle

### 4. Automated Reporting
- Monthly client reports
- Service performance summaries
- Financial statements

##  📈 Business Value
- **Time Savings:** Automate repetitive tasks (monitoring, renewals)
- **Professionalism:** Consistent, branded offers
- **Client Retention:** Proactive service monitoring
- **Revenue Growth:** Better proposal management

##  🔐 Security Considerations
- JWT-based authentication
- Role-based access control
- Data encryption at rest
- Secure API endpoints

##   Deployment
- Docker containerization
- PostgreSQL database
- Nginx reverse proxy
- SSL/TLS encryption

See deploy/README.md for production setup using Docker Compose, Nginx, and systemd, plus a `.env.production` template.

## Development
- Local mode (SQLite): `bash scripts/dev.sh`
- Docker mode (Postgres + API):
  - Start Docker Desktop first (macOS) so the Docker daemon is running
  - Run: `BACKEND_MODE=docker bash scripts/dev.sh`
  - If port 5432 is used on your host, set a different DB port: `DB_PORT=55432 BACKEND_MODE=docker bash scripts/dev.sh`

## Backend API
- Base URL: `http://localhost:8080/api`
- Endpoints:
  - `GET /health` — Health check
  - `POST /auth/register` — Register with `email`, `password`
  - `POST /auth/login` — Login with `email`, `password` (returns `token`, `expires_at`)
  - `POST /auth/reset/request` — Start forgot-password flow with `email`
  - `POST /auth/reset/confirm` — Reset password with `token`, `new_password`
  - `GET /me` — Get current authenticated user's profile (requires `Authorization: Bearer <token>`)
  - `GET /clients` — List clients
  - `GET /clients/:id` — Get client by ID
  - `POST /clients` — Create client
  - `PUT /clients/:id` — Update client
  - `DELETE /clients/:id` — Delete client

### Automation (Scheduler)

The backend includes a lightweight in-memory scheduler for recurring jobs.

- Built-in tasks: monitoring sweep, SSL/Domain expiry refresh, daily reports, expiry warnings.
- Endpoints:
  - `GET /api/automation/tasks` — list tasks
  - `POST /api/automation/tasks/:name/run` — run a task immediately

Frontend page at `/automation` shows tasks and one-click run.

### Heartbeats

Register expected heartbeats per service to track CRONs/workers.

- API:
  - `GET /api/heartbeats?service_id=<id>` — list jobs
  - `POST /api/heartbeats` — create (`service_id`, `name`, `expected_interval_seconds`, `grace_seconds`)
  - `PUT /api/heartbeats/:id` — update
  - `DELETE /api/heartbeats/:id` — delete
  - `POST /api/heartbeats/:id/ping` — mark heartbeat received
  - `POST /api/heartbeats/ping/:token` — token ping (no auth)
  - `POST /api/heartbeats/:id/rotate-token` — rotate token

Frontend page at `/heartbeats` provides ping URLs and quick management.

## Run Locally (Backend)
- Prerequisites: Go 1.23+, PostgreSQL reachable via env vars.
- Configure environment using `scripts/dev.env.example`:
  - Copy to `.env` and adjust values.
- Commands:
  - `cd backend`
  - `go run ./cmd/api` — starts the API on `:8080`
  - `go build ./cmd/api` — builds the API binary
  - `go test ./...` — runs tests
- `go fmt ./...` — formats code

If dependencies change (e.g., PDF library), run `go mod tidy` and commit the updated `go.sum`.

### Environment Variables
- `PORT` — API port (default `8080`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE` — PostgreSQL connection settings
- `JWT_SECRET` — HS256 secret for protected endpoints
- `JWT_TTL_SECONDS` — JWT expiration in seconds (default `3600`)
- `AUTH_COOKIE` — if `true`, set `auth_token` HttpOnly cookie on login
- `DEV_EXPOSE_RESET_TOKEN` — if `true`, include reset token in response when requesting reset (dev only)
- `DEV_ALLOW_UNAUTH` — if `true`, disable auth middleware for CRUD routes (dev only)
- `RESET_LINK_BASE` — base URL used to compose password reset link emailed to users, e.g. `http://localhost:3000/auth/reset?token=`

## Docker
- Build image: `cd backend && docker build -t freelance-monitor-api .`
- Run container:
  - `docker run --rm -p 8080:8080 \
      -e PORT=8080 \
      -e DB_HOST=postgres -e DB_PORT=5432 \
      -e DB_USER=postgres -e DB_PASSWORD=postgres \
      -e DB_NAME=freelance_monitor -e DB_SSLMODE=disable \
      -e JWT_SECRET=change-me \
      freelance-monitor-api`
- Health: `curl http://localhost:8080/api/health`

## Rate Limiting
- Global per-IP rate limiting is enabled.
- Headers returned on each response:
  - `X-RateLimit-Limit` — max requests per window
  - `X-RateLimit-Remaining` — remaining in window
  - `X-RateLimit-Reset` — seconds until reset
- Configure via env:
  - `RATE_LIMIT_REQUESTS` (default 100)
  - `RATE_LIMIT_WINDOW_SECS` (default 60)

## Auth
- Protected endpoints require `Authorization: Bearer <JWT>`.
- Dev token: `POST /api/auth/token` or run `scripts/dev-jwt.sh` with `JWT_SECRET` set.
- Register: `POST /api/auth/register` with `{"email":"user@example.com","password":"secret"}`.
- Login: `POST /api/auth/login` with `{"email":"user@example.com","password":"secret"}`.
- Forgot password: `POST /api/auth/reset/request` with `{"email":"user@example.com"}`; if SMTP is configured the server emails a link composed from `RESET_LINK_BASE` plus a token.
- Reset password: `POST /api/auth/reset/confirm` with `{"token":"<token>","new_password":"newsecret"}`.
- Endpoints:
  - `POST /api/auth/register` — create an account with email/password
  - `POST /api/auth/login` — returns `{ token, expires_at }`; expiry controlled by `JWT_TTL_SECONDS`
  - `POST /api/auth/reset/request` — request password reset; in dev, token is returned when `DEV_EXPOSE_RESET_TOKEN=true`
  - `POST /api/auth/reset/confirm` — confirm reset with `{ token, new_password }`
- Env:
  - `JWT_TTL_SECONDS` — token lifetime in seconds, default `3600`
  - `AUTH_COOKIE` — `true` to also set `auth_token` cookie on login (HTTP only)
  - `RESET_LINK_BASE` — base URL for reset link emailed (default `http://localhost:3000/auth/reset?token=`)
  - `SMTP_*` — optional SMTP settings for sending reset emails
### PDF Generation

Offers can generate a PDF using a base template file stored at the repository root (`PENAWARAN PT EMICO MITRA SAMUDERA_25-09-2025.pdf`). The backend overlays dynamic values onto this template and writes the result to `backend/static/pdfs/offer_<id>.pdf`.

- Configure an alternate template by setting env var `PDF_TEMPLATE_PATH` to an absolute or relative path.
- Generated files are served under `GET /static/pdfs/...`.
- PDF overlay uses `pdfcpu` watermarks; coordinates may need minor tuning to match template layout.

### CORS

Set `CORS_ALLOW_ORIGINS` to a comma-separated list of allowed origins (or `*`) to enable frontend apps on different origins to call the API.

### Frontend Test Page

Open `scripts/offer_form.html` in your browser to quickly test creating an offer and generating a PDF via the backend. Set `CORS_ALLOW_ORIGINS=*` for local development. The form serializes the items array and posts to `POST /api/offers`, then displays a download link using the returned `pdf_url`.

To test locally:

1. Ensure the template file exists.
2. Start the API: `cd backend && go run ./cmd/api`
3. Create an offer via `POST /api/offers` with JSON including `client_id`, `subject`, `items` (JSON array), and `total_price`.
4. Inspect the `pdf_url` in the response and open `http://localhost:8080<pdf_url>`.
## Logging
- Backend: Gin logs and errors write to `backend.log` by default. Override with `LOG_FILE=/path/app.log`.
- Frontend: Errors are captured via an error boundary and POSTed to `POST /api/logs/error`, then appended to backend logs.
- Development run writes `backend.log` at repo root; Next.js dev output appears in terminal.
- Templates (per-user)
  - `GET /api/templates?kind=monthly` — get latest template for current user; unauth returns public default
  - `GET /api/templates/list?kind=monthly&includePublic=true` — list all templates for user; include public defaults
  - `GET /api/templates/:id` — get template by ID (must be owned by user unless unauth and public)
  - `POST /api/templates` — upsert by `{ name, kind, content }` scoped to current user; unauth saves as public default
  - `DELETE /api/templates/:id` — delete template owned by current user (or public default if unauth)

### Monthly Reports (per-user)
- `POST /api/reports/monthly` — generate monthly report for `{ service_id, month }`; optional `summary`, `activities`, `activity_items`, `maintenance_hours`. Assigns `user_id` from auth.
- `GET /api/services/:id/reports/monthly` — list reports for service scoped to current user
- `GET /api/reports/monthly/:id` — get report by ID scoped to current user
- Note: Backend PDF generation for monthly reports is removed; client-side (jsPDF) rendering is used.

### Resetting legacy public data
If you previously ran with unauthenticated mode (`DEV_ALLOW_UNAUTH=true`), some rows may have `user_id = 0` and appear shared across accounts. To reset and enforce per-user isolation:

1. Disable unauth dev: set `DEV_ALLOW_UNAUTH=false` and restart the API.
2. Run the SQL reset script against your database:
   - `psql "$DATABASE_URL" -f scripts/reset_public_data.sql`
   This deletes `report_templates` and `monthly_reports` with `user_id = 0`.
3. Recreate templates and reports while logged in so they’re associated with your account.

### Client-side PDF Flow
- Monthly report PDFs are rendered in the browser using jsPDF and `jspdf-autotable`.
- Preview page: `/reports/monthly/[id]/preview`
- Template editor: `/reports/templates/monthly` stores template HTML/JSON per user and shows live PDF preview inputs.
# freelance-monitor

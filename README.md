# Gasstation — Fuel Station Management System

Web-based fuel station management for Sri Lanka. Real-time stock monitoring, role-based access, SLFRS/LKAS financial reports, and IRD-compliant tax calculations.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start infrastructure (PostgreSQL + Redis)
```bash
docker compose up -d
```

### 3. Set up environment
```bash
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 4. Run database migrations and seed
```bash
npm run db:migrate
npm run db:seed
```

### 5. Start development
```bash
npm run dev
```

- API: http://localhost:3001
- Web: http://localhost:3000
- Swagger: http://localhost:3001/api/docs
- pgAdmin: http://localhost:5050 (run with `docker compose --profile tools up`)

## Default Login Credentials

| Role             | Email                          | Password        |
|------------------|--------------------------------|-----------------|
| Admin            | admin@gasstation.lk            | Admin@123       |
| Back Office      | backoffice@gasstation.lk       | BackOffice@123  |
| Station Manager  | manager@station001.lk          | Manager@123     |
| Worker           | worker1@station001.lk          | Worker@123      |

## Project Structure

```
gasstation/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # Next.js 14 frontend (port 3000)
├── packages/
│   ├── database/     # Prisma schema + migrations + seed
│   └── shared-types/ # Shared TypeScript types/enums
├── docker-compose.yml
└── turbo.json
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js 14, Tailwind CSS, Zustand   |
| Backend    | NestJS, Passport.js, JWT            |
| Database   | PostgreSQL (Prisma ORM)             |
| Cache/RT   | Redis, Socket.io                    |
| Monorepo   | Turborepo                           |

## Modules

- **Auth** — JWT access/refresh tokens, RBAC, token rotation
- **Users** — Role management (Admin, Back Office, Manager, Worker)
- **Stock** — Real-time tank levels, reorder alerts
- **Daily Usage** — Shift-based fuel dispensing logs
- **Orders** — Purchase orders, GRN, supplier management
- **Tax** — VAT (18%), WHT, ESC, PAYE — Sri Lanka IRD
- **Reports** — SLFRS/LKAS Income Statement, Balance Sheet, VAT returns

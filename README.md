# HeroTrack Pro

HeroTrack Pro is a MERN-based department-wise spare parts tracking system for Hero MotoCorp plant operations. It includes authentication, departments, spare parts, movement ledgers, approvals, notifications, analytics APIs, MongoDB models, and seed data.

## Core Modules

- Authentication and role-based access
- Department and spare-part master data
- Department stock ledger and inventory movement tracking
- Approval workflow for high-quantity requests
- Notifications and activity logs
- Analytics dashboards for stock health, movement flow, approvals, low stock, and monthly usage

## Local Setup

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

## Environment

Backend variables are documented in `backend/.env.example`.
Frontend variables are documented in `frontend/.env.example`.

Required production values:

- `MONGODB_URL`
- `JWT_SECRET`
- `CLIENT_URL`
- `REACT_APP_BACKEND_URL`
- `REACT_APP_SOCKET_URL`

## Seed Data

The backend seed script creates HeroTrack Pro demo data for departments, categories, suppliers, users, spare parts, department stock, movements, approval requests, and notifications.

```bash
cd backend
npm run seed
```

The seed script verifies expected record counts after insertion before reporting completion.

Default admin login after seeding:

```text
user1@herotrack.example
Hero@12345
```

## Deployment

- Backend: `backend/render.yaml` includes the Render service definition and `/health` check.
- Frontend: `frontend/vercel.json` supports SPA routing on Vercel.
- Frontend production build output is generated with `npm run build` from `frontend`.

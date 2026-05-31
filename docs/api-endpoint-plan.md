# VoltOps API Endpoint Plan

This split is based on the current ERD in `packages/database/schema-design.md`.

## Ownership

### Shared API Foundation

Both developers should keep these contracts stable:

- `GET /health`
- Error response shape: `{ "error": "message" }`
- Success response shape: `{ "data": ... }`
- Entity names: `stations`, `plugs`, `sessions`, `tickets`

### Burak: API + Mobile App

Mobile-facing endpoints:

- `GET /api/mobile/stations`
  - Query: `lat`, `lng`, `radiusKm`
  - Purpose: station finder/map list
- `GET /api/mobile/stations/:stationCode`
  - Purpose: station detail with plugs
- `GET /api/mobile/sessions`
  - Query: `status`
  - Purpose: active/completed session screen
- `POST /api/mobile/sessions`
  - Body: `{ "plugCode": "IST-MODA-001-CCS-A", "vehiclePlateNumber": "34ABC123" }`
  - Purpose: start charging session
- `POST /api/mobile/sessions/:sessionId/end`
  - Body: `{ "energyKwh": 18.4 }`
  - Purpose: terminate session and create receipt data
- `GET /api/mobile/tickets`
  - Purpose: user support ticket list
- `POST /api/mobile/tickets`
  - Body: `{ "stationCode": "IST-BES-001", "title": "Connector fault", "description": "Session failed to start." }`
  - Purpose: create support ticket

### Batuhan: API + Admin Panel

Admin-facing endpoints:

- `GET /api/admin/dashboard`
  - Purpose: dashboard counters
- `GET /api/admin/stations`
  - Purpose: station management list
- `GET /api/admin/stations/:stationCode`
  - Purpose: station detail with plugs
- `PATCH /api/admin/stations/:stationCode/status`
  - Body: `{ "status": "active" }`
  - Allowed: `active`, `maintenance`, `offline`
- `GET /api/admin/plugs`
  - Query: `stationCode`, `status`
  - Purpose: plug operations table
- `PATCH /api/admin/plugs/:plugCode/status`
  - Body: `{ "status": "fault" }`
  - Allowed: `available`, `in_use`, `fault`, `offline`
- `GET /api/admin/sessions`
  - Query: `status`
  - Purpose: session audit list
- `GET /api/admin/tickets`
  - Query: `status`
  - Purpose: support queue
- `PATCH /api/admin/tickets/:ticketId`
  - Body: `{ "status": "resolved", "assignedEmployeeId": 1 }`
  - Purpose: dispatch/update support tickets

## Today Implementation Order

1. Burak wires mobile station list and session start/end to `/api/mobile`.
2. Batuhan builds admin station/plug/ticket screens against `/api/admin`.
3. Keep schema changes in `apps/api/src/db/schema.ts`, then run `pnpm --filter @voltops/api db:generate`.
4. Keep user-owned mobile endpoints auth-derived from the verified Supabase JWT.

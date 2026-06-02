# VoltOps schema quick reference

Use with schema audits after any UI or API change (Cursor and Claude Code, shared).  
Authoritative definitions: `apps/web-admin/src/types/db.types.ts` and `packages/database/src/schema.ts`.

## Entities and primary fields

| Entity | Key fields | Notes |
|--------|------------|-------|
| `User` | id, firstName, lastName, email, phone, role, isActive, createdAt | role: `ADMIN \| OPERATOR \| TECHNICIAN \| CUSTOMER` |
| `Station` | id, stationCode, name, city, district, address, latitude, longitude, status, totalPlugs, faultyPlugs, availablePlugs, createdAt | status: `ACTIVE \| INACTIVE`; plug counts computed from joins |
| `StationDetail` | extends Station + `plugs: Plug[]` | Returned by `GET /api/stations/:id` only |
| `Plug` | id, plugCode, stationId, stationName, stationCode, city, plugType, powerKw, currentType, status, updatedAt | plugType: `AC_TYPE2 \| DC_CCS2 \| DC_CHADEMO`; status: `AVAILABLE \| CHARGING \| FAULTY \| RESERVED` |
| `Session` | id, userId, userFullName, plugId, plugCode, plugType, stationId, stationName, startedAt, endedAt, energyKwh, totalPrice, status | status: `ACTIVE \| COMPLETED \| FAILED` |
| `Receipt` | id, receiptNo, sessionId, stationName, plugCode, plugType, energyKwh, subtotal, taxAmount, totalAmount, currency, paymentMethod, issuedAt | paymentMethod: `CREDIT_CARD \| WALLET` |
| `MaintenanceRecord` | id, stationId, stationName, plugId?, plugCode?, assignedEmployeeId?, technicianName?, maintenanceType?, description, scheduledDate?, completedDate?, status, createdAt, updatedAt | status: `OPEN \| IN_PROGRESS \| RESOLVED` |
| `Ticket` | id, userId, userFullName, stationId?, stationName?, title, description, priority, status, createdAt, updatedAt | priority: `LOW \| MEDIUM \| CRITICAL`; status: `OPEN \| IN_PROGRESS \| CLOSED` |
| `AuthSession` | token, user: { id, email, firstName, lastName, role } | Stored in localStorage under key `voltops_auth` |

## Common hallucinations to reject

- Any `Device` table or `device.*` field — no Device table exists; use `Plug`
- Any `Socket` table or `socket.*` field — no Socket table exists; use `Plug`
- `station.devices[]` — use `station.plugs[]` (StationDetail) or plug-count fields (Station list)
- `user.fullName` — use `user.firstName` + `user.lastName`; `userFullName` only appears on joined response types
- `station.code` — correct field is `station.stationCode`
- `session.socketId` — correct field is `session.plugId`
- `session.startTime` / `session.endTime` — correct fields are `startedAt` / `endedAt`
- `session.totalKwh` — correct field is `energyKwh`
- `session.totalAmount` — correct field is `totalPrice`; `totalAmount` exists only on `Receipt`
- `receipt.invoiceNumber` — correct field is `receipt.receiptNo`
- `ticket.subject` — correct field is `ticket.title`
- `maintenanceRecord.deviceId` / `.deviceSerialNumber` — use `plugId` / `plugCode`
- Plug/Socket status `ONLINE | OFFLINE | MAINTENANCE` — does not exist; correct enum is `AVAILABLE | CHARGING | FAULTY | RESERVED`
- Billing aggregates without API (MRR, ARPU, monthly revenue, health score)
- User fields beyond schema (avatarUrl, lastLogin, balance)

## Cardinality

```
Station (1) ──── (N) Plug
User    (1) ──── (N) Session
Plug    (1) ──── (N) Session
Session (1) ──── (1) Receipt
Station (1) ──── (N) MaintenanceRecord
Plug    (0..1) ── (N) MaintenanceRecord
User    (1) ──── (N) Ticket
Station (0..1) ── (N) Ticket
```

There is **no Device layer**. Plugs connect directly to Stations.

## When SQL and TypeScript diverge

`packages/database/src/schema.ts` (Drizzle ORM) wins for persistence.  
Update `apps/web-admin/src/types/db.types.ts` to match after any migration.

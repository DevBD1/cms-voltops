# VoltOps schema quick reference

Use with main-agent schema audits (after `/google-stitch`). Authoritative definitions: `apps/web-admin/src/types/db.types.ts` and `packages/database/ev_charge_network.sql`.

## Entities and primary fields

| Entity | Key fields | Notes |
|--------|------------|-------|
| `User` | id, email, fullName, role, createdAt | role: ADMIN \| OPERATOR \| TECHNICIAN \| CUSTOMER |
| `Station` | id, name, code, status, city, district, address, latitude, longitude, devices[] | status: ACTIVE \| INACTIVE |
| `Device` | id, stationId, serialNumber, model, firmwareVersion, status, sockets[] | status: ONLINE \| OFFLINE \| MAINTENANCE |
| `Socket` | id, deviceId, socketNumber, type, powerKw, status, currentSessionId? | type: AC_TYPE2 \| DC_CCS2 \| DC_CHADEMO |
| `ChargingSession` | id, socketId, userId, userFullName, stationName, startTime, endTime?, totalKwh, totalAmount, status | UI denormalized names are allowed if sourced from joins |
| `Invoice` | id, sessionId, invoiceNumber, amount, tax, issuedAt, paymentMethod | paymentMethod: CREDIT_CARD \| WALLET |
| `MaintenanceRecord` | id, deviceId, deviceSerialNumber, technicianName, description, status, createdAt, resolvedAt? | |
| `SupportTicket` | id, userId, userFullName, subject, description, status, priority, createdAt | priority: LOW \| MEDIUM \| CRITICAL |

## Common hallucinations to reject

- Station/device/socket metrics not listed above (efficiency, SOC, grid load, fakeMetric, healthScore)
- User fields beyond schema (avatarUrl, lastLogin unless added to SQL)
- Billing aggregates without API (MRR, ARPU, funnel steps)
- Geographic fields beyond city/district/address/lat/lng on Station

When SQL and `db.types.ts` diverge, **SQL wins** for persistence; update TypeScript to match after migration.

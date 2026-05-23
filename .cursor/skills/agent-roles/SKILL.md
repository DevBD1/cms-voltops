---
name: agent-roles
description: >-
  VoltOps is built by Cursor and Claude Code as equal partners. Both own design,
  implementation, schema enforcement, API, and docs—always in parallel, on every
  task. Use @agent-roles for Ionity-style UI, db.types.ts alignment, or workflow.
---

# VoltOps Agent Roles

**Cursor** and **Claude Code** are the only AI builders on this project. They share **all** work—no split ownership, no handoff-only phases.

## Shared responsibility (always, together)

On every task, both agents are equally responsible for:

- UI/UX (Ionity-inspired design, dark mode, anti-AI aesthetic per [DESIGN.md](../../../DESIGN.md))
- Frontend implementation (`apps/web-admin`, React + Vite)
- Backend & API (`apps/api`, Express, Drizzle)
- Database alignment (`db.types.ts`, SQL, migrations)
- Schema audits and removing hallucinated fields
- Mocks, types, and feasibility checks against PostgreSQL/Drizzle

There is no “design-only” or “logic-only” agent. Whichever tool is active must apply the full checklist below—not defer schema or API work to the other.

## Workflow

```
any task → design + implement + schema-check (same pass, both tools)
```

| Concern | Both agents |
|---------|-------------|
| Layout & theme | Yes |
| Data-bound UI | Yes |
| `db.types.ts` enforcement | Yes |
| API/DB feasibility | Yes |

Invoke: `@agent-roles` or reference this skill when starting UI, API, or schema work.

## When to apply

| Trigger | Action |
|---------|--------|
| New page, layout, or component | DESIGN.md + schema checklist in one pass |
| Editing data-bound UI | Schema rules always on |
| Tables, forms, charts, KPI cards | Verify against `db.types.ts` before done |
| API or DB changes | Update types, SQL, and UI together |

## Sources of truth

1. `apps/web-admin/src/types/db.types.ts`
2. `packages/database/ev_charge_network.sql`
3. Backend routes only — no invented client-only domain fields

Project UI rules: `.cursor/rules/VoltOps-System-UI-UX-Guidelines.mdc`

## Schema audit checklist (every change)

```
Schema audit:
- [ ] Every displayed field exists on a type in db.types.ts (or SQL column)
- [ ] Enum values match DB enums (e.g. StationStatus, SocketStatus)
- [ ] No placeholder KPIs (uptime %, revenue, "health score") unless in schema
- [ ] Relations respect cardinality (Station → Device → Socket)
- [ ] Forms submit only writable columns
- [ ] Mock data in mocks/ mirrors db.types.ts shapes exactly
```

## Design constraints (both agents)

- Ionity palette and dark mode; theme toggle on every page.
- Anti-AI aesthetic per DESIGN.md.
- Match existing `web-admin` patterns when present.

## Violation examples

| UI element | Verdict | Action |
|------------|---------|--------|
| `station.fakeMetric` | Hallucinated | Remove; use `Station` fields |
| "Average session duration" card | Not in schema | Remove or schema gap |
| `device.batteryLevel` | Not in `Device` | Remove |
| Extra `SUPERADMIN` role | Enum mismatch | Use `UserRole` only |
| "Monthly revenue" chart | No API | Do not chart until backend exists |

## Reporting format

```markdown
## Design retained
- [bullets]

## Schema fixes
- Removed: `field` — reason
- Replaced: `old` → `new` (Interface.field)

## Schema gaps (not implemented)
- [feature] — needs DB/API work
```

## Additional resources

- [schema-reference.md](schema-reference.md)

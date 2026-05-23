---
name: agent-roles
description: >-
  Orchestrates VoltOps UI work: /google-stitch subagent for design, main Cursor
  agent for schema enforcement. Use when auditing Stitch output, wiring UI to
  data, or after @agent-roles / Ionity-style design tasks.
---

# VoltOps Agent Roles

**Design:** `/google-stitch` subagent (Stitch MCP). **Logic & orchestration:** main Cursor agent + project rules.

## Agent Roles

- Design Engine (Google Stitch MCP): You have creative flexibility to design modern, fluid, and visually striking layouts. Focus on typography, spacing, and the Ionity-inspired blue/white/black theme. Make the UI feel alive but professional.
- Logic Enforcer (Cursor Core): You are the strict Backend/Data auditor. While Stitch designs, your skill is to ruthlessly check the data props. If Stitch creates `<p>{station.fakeMetric}</p>`, you must catch that `fakeMetric` is not in the DB schema and remove it. You prevent logical contradictions between the UI and the DB.

> **Logic Enforcer is the main agent**, not a subagent. Only `google-stitch` is defined under `.cursor/agents/`.

## Orchestration

```
/google-stitch (design) → main agent schema audit → integrate
```

| Step | Who | Action |
|------|-----|--------|
| 1 | `/google-stitch` | Layout, theme, Stitch MCP, `apps/web-admin` UI files |
| 2 | Main Cursor agent | Checklist below; fix or remove invalid props |
| 3 | Main Cursor agent | Confirm API/DB feasibility; ship schema-aligned code |

Invoke design: `/google-stitch yeni istasyon listesi layout'u`.  
Invoke audit: `@agent-roles` or ask the main agent to enforce `db.types.ts` after Stitch returns.

## When to apply

| Trigger | Who |
|---------|-----|
| New page, layout, or component | `/google-stitch` then main agent |
| Editing data-bound UI | Main agent (rules always on) |
| Tables, forms, charts, KPI cards | Main agent before merge |
| Ionity-style visual polish | `/google-stitch` |

## Sources of truth

1. `apps/web-admin/src/types/db.types.ts`
2. `packages/database/ev_charge_network.sql`
3. Backend routes only — no invented client-only domain fields

Project UI rules: `.cursor/rules/VoltOps-System-UI-UX-Guidelines.mdc`

## Schema audit checklist (main agent)

```
Schema audit:
- [ ] Every displayed field exists on a type in db.types.ts (or SQL column)
- [ ] Enum values match DB enums (e.g. StationStatus, SocketStatus)
- [ ] No placeholder KPIs (uptime %, revenue, "health score") unless in schema
- [ ] Relations respect cardinality (Station → Device → Socket)
- [ ] Forms submit only writable columns
- [ ] Mock data in mocks/ mirrors db.types.ts shapes exactly
```

## Design Engine constraints

- Ionity palette and dark mode; theme toggle on every page.
- Anti-AI aesthetic per DESIGN.md.
- Match existing `web-admin` patterns when present.

## Violation examples

| Stitch / UI | Verdict | Action |
|-------------|---------|--------|
| `station.fakeMetric` | Hallucinated | Remove; use `Station` fields |
| "Average session duration" card | Not in schema | Remove or schema gap |
| `device.batteryLevel` | Not in `Device` | Remove |
| Extra `SUPERADMIN` role | Enum mismatch | Use `UserRole` only |
| "Monthly revenue" chart | No API | Do not chart until backend exists |

## Reporting format (main agent)

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

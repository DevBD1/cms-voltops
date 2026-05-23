# VoltOps UI/UX Design System & Architecture

This document defines the frontend design architecture, aesthetic rules, and development standards for the VoltOps Electric Vehicle Charging Network Management Panel (Web Admin). While the system is being developed with Cursor AI and Google Stitch MCP, these rules are strict and binding.

## 1. Design Philosophy & Aesthetic Vision
* **Inspiration:** The spacious, fluid, modern, and premium European EV network feel provided by the "https://www.ionity.eu/" interface.
* **"Anti-AI" Look:** Generic AI-generated aesthetics such as excessive glassmorphism, messy/heavy box-shadows, or toy-like rounded corners are strictly prohibited. The UI must have a refined, industrial texture as if hand-crafted by a "Senior Frontend Engineer".
* **Data & Function-Oriented:** The design must not overshadow the data. The primary focus is speed, readability, and operational efficiency.

## 2. Color Palette & Theme Dynamics
The system must support both Light Mode (default) and Dark Mode.

### Core Colors
* **Accent (Primary):** Vibrant Blue. To be used for buttons, active tabs, and critical actions.

### Light Mode (Default)
* **Background:** Pure white (`#FFFFFF`) or very light gray (`#FAFAFA`).
* **Text:** Deep Black or Dark Slate (`#111111` / `slate-900`).
* **Borders:** Thin, crisp, and light gray (`#E5E5E5` / `slate-200`).

### Dark Mode
* **Background:** Deep Night Blue / Black (`#0A0A0A` / `#111111`).
* **Text:** Pure White (`#FFFFFF`) and light gray tones (`#A0A0A0`).
* **Borders:** Dark and distinct lines (`#222222` / `slate-800`).

### Status Indicators
The following colors will be used strictly for status notifications (following LED logic):
* **Available / Online:** Emerald.
* **Faulty / Error / Offline:** Sharp Red.
* **Charging / In Progress:** Amber / Orange.

## 3. Typography
Two distinct font families will be used hierarchically in the UI:
1. **Inter (or Roboto/System Sans):** For general UI text, headers, menus, and paragraphs. Fluid and highly legible.
2. **JetBrains Mono:** For system logs, device IDs, kW/kWh values, MAC addresses, and terminal-style data tables. Ensures perfect alignment of industrial and technical data.

## 4. Strict DB Alignment & Logic Rules
100% synchronization between the design and the database schema (Backend/PostgreSQL/Drizzle) is mandatory.
* **Cursor as the Gatekeeper:** While the design agent (Stitch) has creative freedom for visualization, the coding agent (Cursor) will strictly enforce the database schema (`src/types/db.types.ts`).
* **Zero Hallucinations:** Every table, chart, or metric in the UI must have a physical counterpart in the database. Designing or generating "fake" data fields that do not exist in the DB is strictly forbidden. Conflicting designs must be immediately corrected or deleted by Cursor.

## 5. Accessibility & Navigation
* **Theme/Accessibility Toggle:** A modern toggle switch for light/dark mode and accessibility settings must be present in an easily accessible location (usually the Header/Top Bar) on every page.
* **Layout:** Utilize grid structures that allow the interface to breathe (ample padding/margin) and do not overwhelm the user.

## 6. Cursor agents
* **Design:** `/google-stitch` subagent (`.cursor/agents/google-stitch.md`) — Google Stitch MCP, Ionity-style layouts in `apps/web-admin`.
* **Schema & orchestration:** main Cursor agent + `@agent-roles` skill — enforces `db.types.ts` after Stitch; no separate logic subagent.
# VoltOps - Developer Onboarding & Interview Study Guide

Welcome to the **VoltOps** engineering team! This document is designed to onboard new developers to the repository and prepare you for technical interviews regarding the codebase, database design, identity architecture, and engineering principles.

---

## 1. System Architecture & Boundaries

### Q1: What is the overall architecture of the VoltOps project?
**A:** VoltOps is built as a **pnpm monorepo** designed around a clear separation of concerns. It contains:
*   **`@voltops/api` (`apps/api`):** A Node.js & Express REST API that serves as the single source of truth and business boundary.
*   **`@voltops/web-admin` (`apps/web-admin`):** A React single-page application built with Vite and TypeScript for back-office administrators.
*   **`@voltops/mobile` (`apps/mobile`):** A cross-platform React Native mobile client built using Expo.
*   **`@voltops/database` (`packages/database`):** Contains the Entity-Relationship Diagrams (ERD), schemas, and database configuration blueprints.
*   **Shared packages (`packages/`):** Houses utility scripts, configuration profiles, and common TypeScript interfaces.

### Q2: How does the system handle Identity and Authentication?
**A:** VoltOps uses a hybrid authentication model centered around **Supabase Auth** as the identity provider and the **Express API** as the business logic boundary:
1.  **Token Issuance:** The mobile client authenticates directly with Supabase to obtain a JWT (Session access token).
2.  **Request Authorization:** All subsequent requests to the Express API include the JWT in the headers as a Bearer token (`Authorization: Bearer <Supabase JWT>`).
3.  **API Verification Middleware:** The Express API's `AuthService` extracts the token, verifies it against the Supabase Auth engine (`supabaseAuth.auth.getUser(token)`), and loads the verified payload.
4.  **Local User Sync:** Once verified, the API automatically performs a **find-or-create lookup** in our local database `users` table using the user's Supabase UUID (`auth_user_id`) or verified email, mapping it to a local primary key. During signup sync, validated Supabase metadata (`phone`, `tckn`) is persisted for new local users and only backfills missing fields when linking an existing email-matched user.
5.  **Admin Authorization:** Admin API routes require a valid Supabase token plus an active `employees` row linked to the synced local user. Authenticated users without active employee access receive `403 Forbidden`.

```
┌──────────────┐          Supabase Login           ┌──────────────┐
│  Mobile App  │ ────────────────────────────────> │Supabase Auth │
└──────────────┘ <──────────────────────────────── └──────────────┘
       │                    JWT Issued
       │
       │ API Requests with Bearer JWT
       ▼
┌──────────────┐       1. Verify JWT (GetUser)     ┌──────────────┐
│ Express API  │ ────────────────────────────────> │Supabase Auth │
└──────────────┘ <──────────────────────────────── └──────────────┘
       │                2. Validated Payload
       ▼
┌──────────────┐
│   Postgres   │ ──> 3. Sync & Query Local User Profile
└──────────────┘
```

### Q3: Why can't mobile or web-admin clients query the database directly via Supabase?
**A:** To enforce **strict business-data boundaries and security invariants**:
*   Mobile and admin clients **must never** execute raw SQL or directly query tables through Supabase's auto-generated REST API.
*   All public tables in Supabase Postgres have **Row-Level Security (RLS)** active.
*   Direct read operations on critical operational tables (like `stations` and `plugs`) are disabled for anonymous and authenticated public roles.
*   All state updates, calculations (e.g., pricing, charging session end, support ticket dispatching), and validations must route through the Express API.

---

## 2. Database Schema & Data Modeling

### Q4: Explain the structural breakdown of the VoltOps Relational Database Schema.
**A:** The database schema is defined programmatically using **Drizzle ORM** (`apps/api/src/db/schema.ts`) and targets a highly relational Postgres model:
1.  **Identity Management:**
    *   `users`: Primary account records holding name, email, phone, and metadata like Terms of Service (`terms_of_service`) and marketing consents.
        *   `tckn` is stored as `varchar(11)` rather than an integer so all 11-digit Turkish Identification Numbers fit safely and keep identifier formatting intact.
    *   `employees`: Extends `users` with staff details (`employee_code`, `department`, `job_title`, `hire_date`).
    *   `addresses`: Relates to `users` to store billing or residential locations.
2.  **Vehicle Management:**
    *   `vehicles`: Unique records keyed on vehicle plates (`plate_number`) containing charger compatibility data (`connector_type`).
    *   `user_vehicles`: A junction table implementing a many-to-many relationship between users and vehicles, detailing the relationship role (`owner`, `driver`, `family_member`) and setting a primary active vehicle indicator (`is_primary`).
3.  **Operational Assets:**
    *   `stations`: Physical EV Charging stations storing technical identity codes (`station_code`), coordinates (`latitude`, `longitude`), and station status.
    *   `plugs`: Unique socket outlets keyed by code (`plug_code`) pointing to a parent station. Contains technical metrics: `plug_type` (CCS, Type 2, CHAdeMO), `power_kw` (decimal rating), electrical `current_type` (AC/DC), and live status (`available`, `in_use`, `fault`, `offline`).
    *   `station_employees`: Maps staff members assigned to manage specific physical stations.
4.  **Operational Processes & Logs:**
    *   `sessions`: Captures charging history, referencing the user, active plug, vehicle plate, timestamps, real energy consumed (`energy_kwh`), and financial calculation (`total_price`).
    *   `receipts`: Financial invoices automatically created upon session completion, containing tax and total totals.
    *   `maintenance`: Tracks scheduled or completed maintenance on stations or individual plugs.
    *   `tickets`: Handles user-generated support tickets, connecting them to active sessions or specific stations for direct technician dispatch.

---

## 3. Core Business Logic & Workflows

### Q5: Walk us through the lifecycles of a Charging Session.
**A:** A charging session moves through two transactional stages implemented in `SessionService`:

#### Start Session Lifecycle
1.  **Validation:** The endpoint receives the user's verified ID, target `plugCode`, and an optional `vehiclePlateNumber`.
2.  **Database Transaction:**
    *   Verifies the user exists and is active.
    *   If a vehicle plate is provided, verifies that the plate belongs to the requesting user through `user_vehicles`.
    *   Atomically claims the plug with a conditional update (`plug_code` matches and `status = 'available'`) and changes it to `'in_use'`.
    *   If the atomic claim fails, the service returns `404` for a missing plug or `409` for an existing plug that is not available.
    *   Inserts a new record into `sessions` with a status of `'active'` and notes the start time (`started_at`).

#### End Session Lifecycle
1.  **Verification:** Validates the session exists, matches the requesting user (if initiated from a mobile client), and is currently `'active'`.
2.  **Metric Calculation:**
    *   Asserts that `energyKwh` (total energy delivered) is a positive number.
    *   Calculates the pricing totals:
        $$\text{Subtotal} = \text{energyKwh} \times \text{PricePerKwh (7.5 TRY/kWh)}$$
        $$\text{TaxAmount} = \text{Subtotal} \times \text{VAT Rate (20\%)}$$
        $$\text{TotalAmount} = \text{Subtotal} + \text{TaxAmount}$$
    *   Computes session duration in minutes.
3.  **Database Transaction:**
    *   Updates the `sessions` row to status `'completed'`, writing the calculated duration, pricing details, and end timestamp.
    *   Reverts the target plug's status back to `'available'`.
    *   Creates a financial statement in the `receipts` table with a custom identifier format (`R-XXXXXX`, padded with the session ID).

### Q6: How does the backend calculate proximity searches for nearby stations?
**A:** Implemented within `CatalogService.listStations`, the search uses the **Haversine formula** to calculate great-circle distances across the Earth's surface:
1.  The client requests stations, passing search parameters: `lat`, `lng`, and `radiusKm` (defaults to 25km).
2.  The API fetches station records from Postgres.
3.  For each station, the service calculates the spherical distance between the search coordinate and the station coordinate using the formula:
    $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1) \cos(\varphi_2) \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
    *(where $\varphi$ is latitude, $\lambda$ is longitude, and $r$ is the Earth's radius of 6,371 km).*
4.  The system filters out stations exceeding the distance criteria and returns the resulting collection sorted by proximity.

---

## 4. UI/UX & Design System

### Q7: What are the design principles and color requirements of the "Hyper-Charge" theme?
**A:** VoltOps follows a premium, high-contrast dark theme inspired by high-end electric performance vehicle cockpits, as specified in `DESIGN.md`:
*   **Palette Canvas:** Deep Space Midnight-Navy (`#0A0E1A`) serves as the base canvas. Standard layout panels are borderless Rich Slate-Navy (`#141A29`), utilizing soft ambient shadows and tonal contrast rather than sharp box borders.
*   **Interactive Accent:** **Electric Cyan** (`#00E5FF`) is our dominant brand accent. It is used exclusively to highlight interactive elements, buttons, active tabs, and primary action targets.
*   **Status Accent:** **Neon Green** (`#39FF14`) is reserved *strictly* for positive semantic states (e.g. plug status connected, charging active, complete battery capacity). It is never used for general styling or non-semantic highlights.
*   **Airy Layouts:** Standard interfaces require generous spacing rules (32px+ margins/pinnings) to prevent information crowding and ensure a premium visual appearance.
*   **Typography:** Rigid, geometric sans-serif fonts are required. Casual or handwritten script styles are strictly forbidden.

---

## 5. Development Operations & Infrastructure

### Q8: What database migration strategy does VoltOps utilize?
**A:** VoltOps utilizes **Drizzle ORM** paired with **Postgres.js** drivers to ensure zero-downtime, declarative database updates:
*   Developers make changes directly to Drizzle schemas in `apps/api/src/db/schema.ts`.
*   To capture changes, run: `pnpm --filter @voltops/api db:generate` (creates declarative SQL migration files in `apps/api/drizzle`).
*   To apply the migrations to the live Supabase instance, run: `pnpm --filter @voltops/api db:setup`.

### Q9: What is the purpose of Nginx and Dozzle in the development configuration?
**A:**
*   **Current local Compose scope:** The local Docker Compose stack runs the Express API container and expects Supabase connection settings through environment variables.
*   **Future infrastructure tools:** Nginx, Redis, and Dozzle remain planned infrastructure options, but they are not currently active services in `docker-compose.yml`.

### Q10: How does the API handle browser CORS preflight requests?
**A:** The Express API sets CORS headers for `GET`, `POST`, `PATCH`, and `OPTIONS`, then short-circuits any `OPTIONS` request with `204 No Content` before route handlers run. This is important because browser clients that send JSON bodies or `Authorization` headers perform a preflight request before the real API call.

---

## 6. Interview Preparation Cheat Sheet

Use these quick summaries to answer common interview questions:

| Feature | Engineering Answer / Implementation Detail |
| :--- | :--- |
| **Database Solution** | Supabase Postgres (canonical DB) + Drizzle ORM. |
| **API Framework** | Node.js with Express and TypeScript. |
| **Authentication Flow** | Clients fetch JWTs from Supabase Auth; Express validates the Bearer token and syncs the user locally. Admin routes additionally require an active `employees` row. |
| **Data Boundary Rule** | Mobile and admin UI clients *never* make direct data mutations to Supabase; Express acts as the strict logic gateway. |
| **Transaction Strategy** | Critical state mutations are wrapped in database transactions; starting a session atomically claims an available plug to prevent double-booking. |
| **Mobile Tech Stack** | React Native Expo styled with Tailwind CSS (via NativeWind). |
| **Admin UI Stack** | React SPA scaffolded with Vite and TypeScript. |
| **Container Engine** | Docker Compose managing the Express API against Supabase Postgres. |
| **Geo-Location Math** | The Haversine Formula calculates station-to-user proximity inside JS service layers. |
| **CORS Preflight** | `OPTIONS` requests return `204 No Content` before protected route handlers execute. |

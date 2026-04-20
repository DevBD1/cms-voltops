# VoltOps: EV Charging Station Network CMS - Project Context

## Project Overview
**VoltOps** is an Electric Vehicle (EV) Charging Station Network Content Management System (CMS). It is designed to digitally manage core operations of EV charging stations, including users, employees, stations, plugs, charging sessions, receipts, maintenance records, and support tickets. The system is heavily focused on a relational database architecture.

### Technologies
- **Monorepo Manager:** pnpm
- **Database:** PostgreSQL (with TimescaleDB extension via Docker Compose)
- **ORM:** Drizzle ORM
- **Backend API:** Node.js, Express, TypeScript (`@voltops/api`)
- **Web Admin Portal:** React, Vite, Tailwind CSS (`@voltops/web-admin`)
- **Mobile App:** React Native, Expo (`@voltops/mobile` - implied)
- **Infrastructure / Tooling:** Docker Compose, Redis, Nginx, Dozzle, pgAdmin

### Architecture
The project follows a standard monorepo structure separating applications and shared packages:
- `apps/api`: The Express backend handling business logic and database interactions.
- `apps/mobile`: The mobile application for end-users (Expo).
- `apps/web-admin`: The web-based admin panel for managing the VoltOps platform.
- `packages/database`: Contains the PostgreSQL schema, migrations, Docker Compose configuration, and database scripts.

## Building and Running

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### General Commands
1. **Install dependencies:**
   ```bash
   pnpm install
   ```
2. **Run all development services concurrently:**
   ```bash
   pnpm dev
   ```

### Individual Services

**Database (`@voltops/db`)**
```bash
pnpm --filter @voltops/db db:up    # Start DB
pnpm --filter @voltops/db db:logs  # View DB logs
pnpm --filter @voltops/db db:down  # Stop DB
```

**API (`@voltops/api`)**
```bash
pnpm --filter @voltops/api dev
```

**Web Admin (`@voltops/web-admin`)**
```bash
pnpm --filter @voltops/web-admin dev
```

## Development Conventions
- **Language:** TypeScript is used across the full stack (API, Web, and Mobile).
- **Linting & Formatting:** ESLint and Prettier are configured for maintaining code quality.
  - Run linting: `pnpm -r lint`
- **Database Design:** The project strictly follows relational database design principles (e.g., explicit foreign keys, normalized tables for Addresses, Vehicles, Sessions, etc.).
- **Code Organization:** Follow the monorepo package isolation boundaries; shared logic or types should reside in `packages/` while application-specific code stays within `apps/`.

## Visual Direction
Read DESIGN.md for visual direction. 
# VoltOps - Electric Vehicle Charging Station Network

## Contributors
- Mehmet Burak Dorman
- Batuhan Gürsoy

## Guides
- [Project principles and requirements](https://drive.google.com/file/d/1jcksmv4zyBqe_OCeBH6PIrWcMghsqQz0/view?usp=sharing)
- [How to set up the database infrastructure?](https://docs.google.com/document/d/1c47XBCKIk8ppzKcUsIegOYBHHvTmLNGhnPMATkqBlZs/edit?usp=sharing)

## Project Summary
VoltOps is a relational database-oriented project designed to manage the core operations of electric vehicle charging stations in a digital environment. The main objective of the project is to systematically and relationally model core entities such as users, employees, charging stations, sockets connected to the stations, charging sessions, receipts, maintenance records, and support tickets under a single system.

Within the scope of this project, fundamental real-life needs have been taken into consideration. The system aims to enable users to start charging sessions, support multiple sockets per station, generate receipts for completed sessions, record maintenance operations, and track user support tickets. Thus, the goal is to make both operational and user-related processes manageable at the database level.

In the VoltOps project, data is modeled by establishing relationships between tables in accordance with relational database logic. This structure aims to reduce data redundancy, preserve data integrity, and clearly demonstrate the relationships between different entities. The project practically demonstrates the skills intended to be acquired within the scope of the course, such as database design, entity-relationship modeling, and basic system analysis.

In conclusion, VoltOps is a database project based on an electric vehicle charging station management scenario, kept at a scale close to the real world but appropriate for the course curriculum. The project applies the fundamental principles of relational database design and clearly and systematically presents the data structure of an operational system.

## Development Environment
The tech stack at the MVP level is as follows:
- **PostgreSQL:** Primary DB
- **Node.js Express:** API
- **Drizzle:** ORM, config, and SQL migrations
- **pgAdmin:** GUI tool for the database
- **Redis:** Cache / rate limit / queue service
- **Nginx:** Reverse proxy
- **Docker Compose:** Local orchestration
- **Dozzle:** Log viewer

## Installation and Execution
pnpm monorepo with:
- `voltops/database`: PostgreSQL + TimescaleDB (Docker Compose)
- `voltops/api`: Node.js Express
- `voltops/web-admin`: React (Vite)
- `voltops/mobile`: React Native Expo

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Installation

Run the following command in the terminal from the project root directory:
```bash
pnpm install
```



#### Run all dev services via Turbo



```bash

pnpm dev

```



#### Run individual services



Database:

```bash

pnpm --filter @voltops/database db:up

pnpm --filter @voltops/database db:logs

pnpm --filter @voltops/database db:down

```



API:

```bash

cd voltops/api

pnpm --filter @voltops/api dev

```



Web:

```bash

pnpm --filter @voltops/web dev

```
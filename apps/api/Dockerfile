FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/web-admin/package.json apps/web-admin/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json

FROM manifests AS prod-deps
RUN pnpm install --filter @voltops/api --prod --frozen-lockfile

FROM manifests AS build
RUN pnpm install --filter @voltops/api --frozen-lockfile
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src
RUN pnpm --filter @voltops/api build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /repo/apps/api
COPY --chown=node:node --from=prod-deps /repo/node_modules /repo/node_modules
COPY --chown=node:node --from=prod-deps /repo/apps/api/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/api/dist ./dist
COPY --chown=node:node apps/api/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

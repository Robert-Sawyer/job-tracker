# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
ENV DATABASE_URL=postgresql://prisma:prisma@localhost:5432/prisma
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma/schema.prisma apps/api/prisma/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @job-tracker/api exec prisma generate
RUN pnpm --filter @job-tracker/shared build
RUN pnpm --filter @job-tracker/api build
RUN pnpm --filter @job-tracker/api deploy --legacy --prod /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/api/prisma ./prisma

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

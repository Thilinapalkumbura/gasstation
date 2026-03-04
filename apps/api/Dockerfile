# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies
RUN npm ci

# Copy source
COPY apps/api ./apps/api
COPY packages ./packages

# Compile shared-types to JS
RUN npm run build --workspace=packages/shared-types

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build NestJS (webpack bundles workspace deps into dist/)
RUN npm run build --workspace=apps/api

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy node_modules (includes Prisma binary + workspace links)
COPY --from=builder /app/node_modules ./node_modules

# Copy generated Prisma client (output path from schema.prisma)
COPY --from=builder /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy shared-types if it has compiled output
COPY --from=builder /app/packages/shared-types ./packages/shared-types

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main.js"]

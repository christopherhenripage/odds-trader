# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy package.json files for all packages
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared/
COPY apps/worker ./apps/worker/

# Build shared package
RUN pnpm --filter @odds-trader/shared build

# Generate Prisma client
RUN pnpm --filter @odds-trader/worker exec prisma generate

# Build worker
RUN pnpm --filter @odds-trader/worker build

# Production stage
FROM node:20-alpine AS runner

# Install pnpm for workspace dependency resolution
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/prisma ./prisma/

# Set environment
ENV NODE_ENV=production

WORKDIR /app/apps/worker

# Run the worker
CMD ["node", "dist/index.js"]

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first so Docker can cache the install layer
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile

# Copy source after deps are installed
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Compile shared package to JS so the backend can require() it at runtime
WORKDIR /app/packages/shared
RUN pnpm exec tsc

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["pnpm", "start:dev"]

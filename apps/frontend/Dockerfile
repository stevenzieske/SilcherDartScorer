FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first so Docker can cache the install layer
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile

# Copy source after deps are installed
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

# Compile shared package so Vite can resolve types correctly
WORKDIR /app/packages/shared
RUN pnpm exec tsc

WORKDIR /app/apps/frontend

EXPOSE 5173

CMD ["pnpm", "dev", "--", "--host"]

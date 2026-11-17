# syntax=docker/dockerfile:1
# One Dockerfile for every deployable. NOT VERIFIED LOCALLY (Docker is not installed on the author's machine);
# the CI `docker-build` job is the first real build. Build a service with:
#   docker build -f infrastructure/docker/Dockerfile --target runtime --build-arg SERVICE=identity-service .
# SERVICE is the folder name under dist/ (api-gateway | identity-service | company-service).

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
RUN npm ci && npm run build

# One-shot job: creates least-privilege roles/schemas, then applies every service's migrations.
FROM build AS tools
CMD ["sh", "-c", "npm run db:bootstrap && npm run db:migrate"]

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime
ARG SERVICE
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    SERVICE=${SERVICE}
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/${SERVICE} ./dist/${SERVICE}
USER node
CMD ["sh", "-c", "exec node dist/${SERVICE}/main.mjs"]

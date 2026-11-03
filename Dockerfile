# syntax=docker/dockerfile:1
# Production image for the 5dot web app (Next.js standalone server).
#
#   docker build --platform linux/amd64 \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.axioware.tech/v1 \
#     --build-arg NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id> \
#     --build-arg NEXT_PUBLIC_APP_ORIGIN=https://app.<domain> \
#     -t 5dot-webapp .
#
# NEXT_PUBLIC_* are inlined into the browser bundle and the CSP at BUILD time, so they are build args, not runtime env.
# Runtime env (set on the container): TRUSTED_PROXY_HOPS (see docs/deploy.md), optionally API_BASE_URL.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
ARG NEXT_PUBLIC_APP_ORIGIN
ARG NEXT_PUBLIC_APPLE_SERVICES_ID=
ARG NEXT_PUBLIC_APPLE_REDIRECT_URI=
ARG NEXT_PUBLIC_UPLOAD_MODE=direct
ARG NEXT_PUBLIC_BILLING_ENABLED=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID \
    NEXT_PUBLIC_APP_ORIGIN=$NEXT_PUBLIC_APP_ORIGIN \
    NEXT_PUBLIC_APPLE_SERVICES_ID=$NEXT_PUBLIC_APPLE_SERVICES_ID \
    NEXT_PUBLIC_APPLE_REDIRECT_URI=$NEXT_PUBLIC_APPLE_REDIRECT_URI \
    NEXT_PUBLIC_UPLOAD_MODE=$NEXT_PUBLIC_UPLOAD_MODE \
    NEXT_PUBLIC_BILLING_ENABLED=$NEXT_PUBLIC_BILLING_ENABLED
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Fail fast instead of shipping an image that talks to nothing / rejects every request.
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" && test -n "$NEXT_PUBLIC_APP_ORIGIN" \
 || (echo "ERROR: build args NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_APP_ORIGIN are required" && exit 1)
RUN npm run build

FROM node:22-alpine AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
# Orchestrators (ECS) overwrite HOSTNAME with the task's hostname, which would make Next bind to one address only: force 0.0.0.0.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]

# syntax=docker/dockerfile:1

# ---- builder: compile the Next.js standalone bundle ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set minimum-release-age 0 && pnpm install --ignore-scripts

ARG MIRAGE_API_URL=http://api:8000
ENV MIRAGE_API_URL=$MIRAGE_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npx next build

# ---- runner: minimal production image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

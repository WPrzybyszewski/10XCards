# syntax=docker/dockerfile:1.7

FROM node:22.14.0-alpine3.20 AS base
WORKDIR /app
ENV PATH="/app/node_modules/.bin:${PATH}"
RUN apk add --no-cache libc6-compat tini curl

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG PUBLIC_ENV_NAME
ENV PUBLIC_ENV_NAME=${PUBLIC_ENV_NAME} \
    NODE_ENV=production
COPY . .
RUN npm run build

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server/entry.mjs"]


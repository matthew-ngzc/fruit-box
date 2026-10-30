FROM node:22.23.4-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY scripts/room-demo.ts ./scripts/room-demo.ts
COPY tests/game ./tests/game
COPY vendor ./vendor
COPY web ./web
RUN npm run build

FROM node:22.23.4-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=2567
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist/src ./dist/src
COPY --from=build /app/dist/vendor ./dist/vendor
COPY --from=build /app/dist/web/app.js ./dist/web/app.js
COPY web/index.html web/style.css ./web/
COPY vendor/fruit-box-game/LICENSE ./vendor/fruit-box-game/LICENSE
USER node
EXPOSE 2567
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:2567/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]

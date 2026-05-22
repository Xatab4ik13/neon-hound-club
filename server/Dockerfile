FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=optional

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./src/db/migrations
COPY package.json ./
EXPOSE 3000
# Применяем миграции и стартуем API
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]

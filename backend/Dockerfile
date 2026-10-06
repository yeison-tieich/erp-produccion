FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma/schema.prisma ./prisma/schema.prisma
COPY backend/prisma/migrations ./prisma/migrations
COPY backend/src ./src

RUN apk add --no-cache openssl

RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npm ci \
    && DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npx prisma generate \
    && npm run build \
    && DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npm prune --omit=dev

COPY backend/public ./public
COPY ["backend/Inventario Producto_Images", "/app/Inventario Producto_Images"]

RUN mkdir -p uploads \
    && chown -R node:node /app

ENV NODE_ENV=production
EXPOSE 3000
USER node

CMD ["node", "dist/index.js"]
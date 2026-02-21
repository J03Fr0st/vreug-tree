# Stage 1: Build client
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci
COPY client/ ./client/
RUN npm run build --workspace=client

# Stage 2: Build server
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci
COPY server/ ./server/
RUN cd server && npx prisma generate
RUN npm run build --workspace=server

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=client-builder /app/client/dist ./client/dist
RUN mkdir -p uploads
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "cd /app/server && npx prisma migrate deploy && cd /app && node server/dist/index.js"]

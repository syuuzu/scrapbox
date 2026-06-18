FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

FROM node:20-bookworm-slim AS runner

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/uploads /app/database && \
    chown -R node:node /app

ENV PORT=3815
ENV UPLOAD_DIR=/app/uploads
ENV DATA_DIR=/app/database
ENV BODY_SIZE_LIMIT=5242880

USER node

EXPOSE 3815

CMD ["node", "build/index.js"]

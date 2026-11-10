FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/bot/package.json ./apps/bot/

RUN npm ci --omit=dev --workspace=@sparcky/bot --workspace=@sparcky/database

COPY packages/database ./packages/database
COPY apps/bot ./apps/bot

WORKDIR /app/apps/bot
CMD ["node", "src/index.js"]

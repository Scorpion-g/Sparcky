FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev --workspace=@sparcky/api --workspace=@sparcky/database

COPY packages/database ./packages/database
COPY apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "index.js"]

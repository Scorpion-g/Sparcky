FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/panel/package.json ./apps/panel/

RUN npm ci

COPY apps/panel ./apps/panel
RUN npm run build --workspace=@sparcky/panel

FROM nginx:alpine
COPY --from=builder /app/apps/panel/dist /usr/share/nginx/html
COPY apps/panel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/panel/package.json ./apps/panel/

RUN npm ci

COPY apps/panel ./apps/panel
RUN npm run build --workspace=@sparcky/panel

FROM nginx:alpine
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/sparcky.key \
    -out /etc/nginx/ssl/sparcky.crt \
    -subj "/CN=sparcky.matteoriviere.fr"

COPY --from=builder /app/apps/panel/dist /usr/share/nginx/html
COPY apps/panel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

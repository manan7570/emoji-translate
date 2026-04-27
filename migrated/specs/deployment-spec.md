# Deployment Spec

## Local Run
```bash
cd migrated && npm install && npm run dev
```
The app will be available at http://localhost:5173

## Dockerfile
```dockerfile
# ---- Build stage ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## docker-compose.yml
```yaml
version: "3.9"
services:
  emoji-translate:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    restart: unless-stopped
```

## Build Steps
1. `npm install` — installs React, Vite, and all dev dependencies
2. `npm run build` — Vite bundles the SPA into `dist/`
3. The Nginx container serves the static `dist/` folder on port 80

## CI/CD Guidance
- Trigger: on push to `main` or on pull request
- Build command: `cd migrated && npm install && npm run build`
- Test command: `cd migrated && npm install && npx vitest run`
- Deploy command: `docker build -t emoji-translate . && docker run -p 3000:80 emoji-translate`
  (or push image to a registry and deploy to hosting provider of choice)

# Infrastructure Spec

## Runtime
- Language: JavaScript (Node.js 20 LTS) — React 18 SPA, built with Vite
- Base image: node:20-slim (build stage), nginx:1.25-alpine (serve stage)

## Dependencies

### Production (runtime in browser)
```
"react": "^18.3.1"
"react-dom": "^18.3.1"
```

### Dev / Build
```
"vite": "^5.4.0"
"@vitejs/plugin-react": "^4.3.1"
```

> **Note on `emojilib`:** The source project uses `emojilib` (npm) to supply the emoji lookup table.
> The workspace already contains `extension/emojis.json`, which is the full emojilib v2 data file.
> The migrated code MUST load `emojis.json` directly (copied verbatim into `migrated/src/data/emojis.json`)
> instead of importing the npm package. Do NOT add `emojilib` to the manifest.

## Network
- Port: 5173 (Vite dev server) / 80 (Nginx in production container)
- Protocol: HTTP

## Environment Variables
No environment variables required. The app is a fully client-side SPA with no backend.

## External Services
No external services required. All emoji data is bundled from the local `emojis.json` file.

# TezUy frontend

React/TypeScript real estate marketplace with Uzbek/Russian/English, light/dark/
system themes, real API listings and role-aware authentication/navigation.

## Run locally

Node 22.18+ and npm are required.

```sh
npm ci
cp -n .env.example .env
npm run dev
```

Open http://localhost:3001. To use the deployed backend, set the private env:

```dotenv
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=https://real-estet-backend.onrender.com
```

Restart Vite after env changes. For a local Nest server, use proxy target
`http://127.0.0.1:3000`. Vite proxies `/api` with the prefix removed and forwards
`/uploads`. Approved listings load on entry; filters apply on search.

## Production

Build with a same-origin `/api` reverse proxy, or set VITE_API_BASE_URL to the
full backend HTTPS origin and configure backend CORS_ORIGIN for the frontend
origin. Vite's development proxy does not run in a static production deployment.
Never include secrets in VITE variables; they are public build-time values.
Configure SPA fallback to index.html and preserve backend uploaded images.

```sh
npm run build
npm run lint
npm test
npm run check:i18n
```

## Admin login

Use the same `/login` form with the existing administrator email and password.
ADMIN redirects to `/admin`; no separate admin login or fake credentials.
The configured administrator was verified against Render on 2026-11-07:
login 201 and authenticated `/auth/me` 200/ADMIN. Credentials are not published.
Existing passwords are not overwritten by changing seed environment values.
Backend source may be newer than the deployed server; deploy pending schema
changes only after authorization for that specific database.

Backend repository: https://github.com/HusanMax/real-estet-BACKEND.git

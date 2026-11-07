# TezUy Frontend

Frontend foundation for the TezUy real estate marketplace.

## Stack

- Vite
- React 19
- TypeScript
- Tailwind CSS 4
- React Router
- Axios
- Lucide React
- react-i18next

## Status

This is the application foundation only. Property listings, authentication,
dashboards, and API integration are not implemented yet. No backend exists, so
no API requests are made by the current UI.

## Scripts

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # typecheck and production build
npm run lint     # oxlint
npm run preview  # preview production build
```

## Structure

```text
src/api         Axios client (base URL configuration)
src/components  Shared UI components
src/context     React context providers
src/hooks       Shared hooks
src/layouts     Route layouts
src/locales     UZ/RU/EN translation resources and i18n setup
src/pages       Route pages
src/routes      Route definitions
src/types       Shared TypeScript types
src/utils       Framework-agnostic helpers
```

## Environment

Copy `.env.example` to `.env` when a backend URL is known. `VITE_API_BASE_URL`
is the only frontend environment variable at this stage. The fallback `/api`
prefix is provisional and is not a verified backend contract.

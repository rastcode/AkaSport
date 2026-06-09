# AkaSport Storefront — Part 1 (Architecture, Auth, Theme, Middleware)

Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend for the AkaSport
sports-goods platform. Connects to the Django REST backend (JWT, roles
`OWNER` / `ADMIN` / `CUSTOMER`).

## Getting started

```bash
cd storefront
cp .env.local.example .env.local      # point NEXT_PUBLIC_API_BASE_URL at Django
npm install
npm run dev                           # http://localhost:3000
```

Make sure the Django backend is running at the URL in `.env.local`
(default `http://127.0.0.1:8000/api`).

## Brand palette (Tailwind utilities)

Configured in `tailwind.config.ts` under `theme.extend.colors`:

| Token | Hex | Usage |
|-------|-----|-------|
| `dust-grey` | `#dcdcdd` | Light backgrounds |
| `silver` | `#c5c3c6` | Borders, muted layers |
| `iron-grey` | `#46494c` | Primary typography |
| `blue-slate` | `#4c5c68` | Secondary typography |
| `bondi-blue` | `#1985a1` | **Primary accent** — buttons, links, CTAs |

Use as standard utilities: `bg-bondi-blue`, `text-iron-grey`,
`border-silver`, `ring-bondi-blue`. Helper shades `bondi-blue-dark` /
`bondi-blue-light` cover hover/active states.

## Directory tree

```
storefront/
├── .env.local.example
├── .eslintrc.json
├── next.config.mjs
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts          # brand palette
├── tsconfig.json               # strict mode, @/* path alias
├── middleware.ts               # Edge role-based route guard
└── src/
    ├── app/
    │   ├── globals.css          # Tailwind layers + .btn-primary/.input-field
    │   ├── layout.tsx           # wraps app in <AuthProvider>
    │   ├── page.tsx             # public landing
    │   ├── 403/page.tsx         # forbidden (under-privileged staff routes)
    │   ├── login/page.tsx       # tabbed multi-auth login UI
    │   ├── profile/             # (customer-only — guarded)
    │   ├── checkout/            # (customer-only — guarded)
    │   └── admin/               # (ADMIN/OWNER-only — guarded)
    ├── components/              # shared UI (future parts)
    ├── context/
    │   └── AuthContext.tsx      # login / OTP / logout / refresh / persistence
    ├── lib/
    │   ├── api.ts               # axios instance + refresh interceptor
    │   └── tokens.ts            # cookie + JWT decode helpers
    └── types/
        └── auth.ts              # User, DecodedToken, AuthState, payloads
```

## Architecture notes

**Auth flow.** `AuthContext` posts to the backend's unified `/auth/login/`
(password) or `/auth/otp/request/` + `/auth/otp/verify/` (OTP). Tokens are
persisted as cookies via `lib/tokens.ts`. On mount, the provider restores the
session: it seeds the user optimistically from the decoded access token, then
confirms against `/auth/me/`.

**Silent refresh.** `lib/api.ts` attaches the bearer token on every request and,
on a `401`, performs a single refresh against `/auth/token/refresh/`, queuing
concurrent failures behind one in-flight refresh. A terminal failure clears
tokens and triggers the provider's logout handler.

**Route guarding.** `middleware.ts` runs on the Edge, reads the access/role
cookies, base64-decodes the JWT to read the role, and gates:
`/checkout`, `/profile`, `/orders`, `/cart` (any authenticated user);
`/admin/**` (ADMIN/OWNER only → `/403` otherwise); `/login`, `/register`
(redirect authenticated users away). Expired tokens are treated as anonymous.

### Security model

Cookies are not `httpOnly` because the SPA attaches the access token to API
calls itself. The middleware guard is a **UX** layer; the Django backend
remains the authoritative gate and verifies the JWT signature on every request.
For maximum hardening, migrate to a BFF pattern where a Next.js route handler
sets `httpOnly` cookies and proxies API calls.

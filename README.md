# Sharpa

Sharpa is a full-stack investment analysis platform for Swedish fund savers and financial advisers. It helps users inspect an existing portfolio, understand risk and fees, compare funds, build a diversified alternative, and monitor how a saved portfolio develops over time.

## Highlights

- Portfolio analysis with diversification, risk, fee, and concentration insights
- Guided portfolio builder and searchable Swedish fund universe
- Avanza and Nordnet portfolio import flows
- Saved portfolios, score history, and opt-in email alerts
- Adviser workspace with client reports, managed portfolios, and signed links
- Responsive Swedish and English interfaces
- Privacy, cookie, and compliance-oriented product flows

## Tech stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS 4 and Framer Motion
- Supabase authentication and PostgreSQL
- Resend for transactional email
- FastAPI service for selected data integrations
- Vitest and Playwright for unit and end-to-end testing

## Run locally

Requirements: Node.js 20+, npm, Python 3, and a Supabase project.

```bash
npm install
npm run dev:next
```

The application is then available at [http://localhost:3000](http://localhost:3000).

Create `.env.local` with the services needed for the flows you want to run:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional integrations
ANTHROPIC_API_KEY=
RESEND_API_KEY=
MORNINGSTAR_API_URL=http://localhost:8000
CRON_SECRET=
LINK_SECRET=
```

Database schemas and incremental migrations live in [`supabase/`](supabase/) and the root-level `*_schema.sql` files. The combined `npm run dev` command also expects a Python virtual environment in `api-python/.venv`; use `npm run dev:next` when working only on the web application.

## Quality checks

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

## Project structure

```text
app/          Next.js pages, layouts, and API routes
components/   Shared interface components
lib/          Domain logic, integrations, and server utilities
api-python/   FastAPI integration service
supabase/     Database migrations and email templates
tests/        Unit and end-to-end tests
docs/         Product and implementation notes
```

## Disclaimer

Sharpa provides informational analysis and is not financial advice. Historical performance does not guarantee future results.

## License

Copyright © 2026 Daniel Karoumi. All rights reserved. The source is public for portfolio and evaluation purposes; no license to copy, modify, or redistribute it is granted.

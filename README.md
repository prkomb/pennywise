# Bank Statements

A personal finance web app. Upload CSV exports from your bank, get every transaction categorized by AI, and see where your money goes against a 50/30/20 budget plan, with rule-based advice on what to change.

## Features

- **Statement upload.** Drop a CSV export from **Monzo** or **Revolut**. The bank is detected automatically from the column headers.
- **AI categorization.** Each transaction gets a category (groceries, rent, transport, eating out, subscriptions, utilities, health, shopping, entertainment, travel, transfers, income, other) and a necessity label: `essential`, `want` or `unnecessary`. Powered by Google Gemini, with structured output validated by Zod.
- **Graceful fallback.** If Gemini fails, a mock categorizer takes over so uploads never block.
- **Dashboard.** Monthly view with category breakdown, cash flow, recent transactions, and plan vs. actual spending.
- **Budget plan.** Compare actual spending with a configurable essentials / wants / savings split (default 50/30/20).
- **Advice cards.** Rule-based tips such as overspending, savings on track, or discretionary spend to cut.
- **What-if simulator.** See the effect of trimming discretionary spending.
- **Emergency fund tracker.** Target a configurable number of months of expenses (1 to 12).
- **Statement management.** Re-categorize, export, or delete a single statement, clear orphaned data, or wipe everything.
- **Reports.** Export a full report as a file.
- **Theme switcher** for light and dark mode.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | MongoDB (official Node driver) |
| AI | Google Gemini via `@google/genai` |
| Validation | Zod 4 |
| CSV parsing | `csv-parse` |
| Icons | `lucide-react` |
| Tests | Node test runner via `tsx` |

> This project uses a Next.js version with breaking changes from older releases. See `node_modules/next/dist/docs/` before changing framework-level code.

## Getting started

### Prerequisites

- Node.js 20 or later
- A MongoDB instance (local, Atlas, or self-hosted)
- A Google Gemini API key

### Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name (the setup script defaults to `hackaton`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model ID used for categorization |

Create collections and schema validators:

```bash
npm run db:setup
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Try it with sample data

Upload [samples/monzo-sample.csv](samples/monzo-sample.csv) from the home page to see the dashboard populated.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run unit tests in `src/lib` |
| `npm run db:setup` | Create MongoDB collections and validators |

## How it works

1. **Upload.** `POST /api/upload` parses the CSV, detects the bank, and normalizes rows to date, amount, currency and description.
2. **Categorize.** Rows are sent to Gemini for a category and necessity label. On failure, the mock categorizer is used instead.
3. **Store.** Transactions and statements are saved to MongoDB.
4. **Review.** The dashboard aggregates a month in pence-accurate sums, compares it with your plan, and generates advice.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/upload` | Upload and import a statement CSV |
| `POST` | `/api/categorize` | Categorize pending transactions |
| `POST` | `/api/statements/[id]/recategorize` | Re-run categorization for a statement |
| `GET` | `/api/statements/[id]/export` | Export a statement |
| `DELETE` | `/api/statements/[id]` | Delete a statement |
| `DELETE` | `/api/statements/orphans` | Remove orphaned data |
| `GET` | `/api/reports/export` | Export a report |
| `PUT` | `/api/settings` | Update budget plan and emergency fund months |
| `DELETE` | `/api/data` | Delete all data |

## Project structure

```
src/
  app/            Pages (home, dashboard, transactions, statements, reports, settings) and API routes
  components/     UI components; dashboard/ holds charts, advice, and layout
  lib/            Domain logic: statements, categorizer, gemini, budget, advice, settings, MongoDB
scripts/          setup-db.ts, MongoDB collection setup
samples/          Example bank CSV exports
```

## Testing

```bash
npm test
```

Covers statement parsing, the categorizer fallback, budget calculations, and advice rules.

## Deployment

The app runs as a standard Next.js server and has been configured for Dokploy. When deploying on the same Docker network as MongoDB, use the internal MongoDB hostname for `MONGODB_URI`; use the external URL for local development.

## Privacy

Transaction descriptions and amounts are sent to the Gemini API for categorization. Do not upload statements you are not comfortable sharing with that service.

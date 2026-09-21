# Expense Tracker

A personal expense tracker built with **Next.js 16**, **Tailwind CSS 4**, **TypeScript**, and **Prisma**.

## Features

- **Dashboard reports** with weekly, monthly, and yearly views (defaults to weekly), including period navigation.
- **Expense entry** with support for one-time or recurring items.
- **Recurring frequencies**: daily, weekly, monthly, or yearly.
- Summary cards (total, transactions, average, top category), a spending bar chart, and a transaction list.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack)
- [Tailwind CSS](https://tailwindcss.com) 4
- [Prisma](https://prisma.io) 6 ORM
- SQLite for local development (switch to MySQL below)

## Getting started

```bash
npm install

# 1. Create the local SQLite database and generate the Prisma client
npm run db:push

# 2. (Optional) Load sample data
npm run db:seed

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start the development server             |
| `npm run build`      | Create a production build                |
| `npm run start`      | Serve the production build               |
| `npm run lint`       | Run ESLint                               |
| `npm run db:push`    | Push the Prisma schema to the database   |
| `npm run db:seed`    | Seed the database with sample expenses   |
| `npm run db:generate`| Regenerate the Prisma client             |

## Project structure

```
app/
  page.tsx                 # Dashboard (server component)
  expenses/new/page.tsx    # "Add expense" form page
  actions/expenses.ts      # Server actions (create, delete)
  globals.css              # Tailwind + reusable component classes
components/
  dashboard/               # PeriodSelector, SummaryCards, SpendingChart, ExpenseList
  expense/                 # ExpenseForm
  icons.tsx
lib/
  prisma.ts                # Prisma client singleton
  reports.ts               # Report aggregation (weekly/monthly/yearly)
  dates.ts                 # Date/recurrence helpers
  utils.ts                 # Formatting helpers
prisma/
  schema.prisma            # Data model
  seed.ts                  # Sample data
generated/prisma/          # Generated Prisma client (git-ignored)
```

## Switching to MySQL

The schema is already written to be database-agnostic. To move to MySQL:

1. Update the datasource in `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. Point `DATABASE_URL` at your MySQL instance in `.env`:

   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/expenses"
   ```

3. Run `npm run db:push` (or set up migrations with `prisma migrate dev`).

> Note: `amount` is currently stored as a `Float` for SQLite compatibility.
> When moving to MySQL, consider changing it to `Decimal` in the schema for
> exact monetary precision.
# jb-expenses
# jb-expenses
# jb-expenses
# jb-expenses

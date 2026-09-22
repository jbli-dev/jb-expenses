import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { Frequency } from "../generated/prisma/enums";

function resolveDatasourceUrl(url: string | undefined): string {
  const value = url ?? "";
  if (value.startsWith("file:") && !value.startsWith("file:/")) {
    const relativePath = value.slice("file:".length);
    return `file:${path
      .resolve(process.cwd(), "prisma", relativePath)
      .replace(/\\/g, "/")}`;
  }
  return value;
}

const prisma = new PrismaClient({
  datasourceUrl: resolveDatasourceUrl(process.env.DATABASE_URL),
});

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  await prisma.recurringAmount.deleteMany();
  await prisma.expense.deleteMany();

  const expenses = [
    // One-time expenses
    { title: "Groceries", amount: 84.3, category: "Food", date: daysAgo(0), frequency: null },
    { title: "Gas", amount: 52.0, category: "Transport", date: daysAgo(1), frequency: null },
    { title: "Dinner out", amount: 46.75, category: "Food", date: daysAgo(2), frequency: null },
    { title: "Movie tickets", amount: 28.0, category: "Entertainment", date: daysAgo(4), frequency: null },
    { title: "New headphones", amount: 129.99, category: "Shopping", date: daysAgo(9), frequency: null },
    { title: "Electric bill", amount: 96.4, category: "Utilities", date: daysAgo(15), frequency: null },
    { title: "Doctor visit", amount: 40.0, category: "Health", date: daysAgo(20), frequency: null },

    // Recurring expenses
    { title: "Coffee", amount: 4.5, category: "Food", date: daysAgo(3), frequency: Frequency.DAILY },
    { title: "Gym membership", amount: 35.0, category: "Health", date: daysAgo(12), frequency: Frequency.MONTHLY },
    { title: "Netflix", amount: 15.49, category: "Entertainment", date: daysAgo(8), frequency: Frequency.MONTHLY },
    { title: "Rent", amount: 1450.0, category: "Housing", date: daysAgo(6), frequency: Frequency.MONTHLY },
    { title: "Phone plan", amount: 45.0, category: "Utilities", date: daysAgo(7), frequency: Frequency.MONTHLY },
    { title: "Car insurance", amount: 980.0, category: "Transport", date: daysAgo(90), frequency: Frequency.YEARLY },
    { title: "Cloud storage", amount: 9.99, category: "Utilities", date: daysAgo(30), frequency: Frequency.MONTHLY },
  ];

  for (const expense of expenses) {
    const data = {
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      frequency: expense.frequency,
    };

    if (expense.frequency) {
      await prisma.expense.create({
        data: {
          ...data,
          amounts: {
            create: { amount: expense.amount, effectiveFrom: expense.date },
          },
        },
      });
    } else {
      await prisma.expense.create({ data });
    }
  }

  console.log(`Seeded ${expenses.length} expenses.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

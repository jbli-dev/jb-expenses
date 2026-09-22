import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppChrome from "@/components/AppChrome";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track and understand your personal expenses.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AppChrome
          user={
            user
              ? { name: user.name, email: user.email, image: user.image }
              : null
          }
        >
          {children}
        </AppChrome>
      </body>
    </html>
  );
}

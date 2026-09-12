import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sameeja Ledger",
  description: "Invoices, payments and outstanding balances for Sameeja Commission Services.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}

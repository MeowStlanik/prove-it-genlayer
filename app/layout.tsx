import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Prove It — Crowdfunded Challenges on GenLayer",
  description:
    "Fund public challenges, submit immutable proof, and let GenLayer consensus settle the result.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}

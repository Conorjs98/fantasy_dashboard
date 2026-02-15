import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy Dashboard",
  description: "Fantasy football power rankings & leaderboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text-primary font-mono min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

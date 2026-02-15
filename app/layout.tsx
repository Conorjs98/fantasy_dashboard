import type { Metadata } from "next";
import "./globals.css";
import { getLeagueContext } from "@/lib/league-context";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const context = await getLeagueContext();
    const avatar = context.league.avatar;
    return {
      title: "Fantasy Dashboard",
      description: "Fantasy football power rankings & leaderboard",
      ...(avatar && {
        icons: { icon: avatar, shortcut: avatar, apple: avatar },
      }),
    };
  } catch {
    return {
      title: "Fantasy Dashboard",
      description: "Fantasy football power rankings & leaderboard",
    };
  }
}

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

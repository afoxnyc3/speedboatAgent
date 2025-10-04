import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
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
  title: "Chelsea Piers Digital Concierge",
  description: "Your AI assistant for Chelsea Piers fitness classes, sports leagues, special events, and facilities in New York City",
  keywords: ["Chelsea Piers", "fitness", "sports", "concierge", "NYC", "sports leagues", "fitness classes", "special events"],
  authors: [{ name: "Chelsea Piers" }],
  openGraph: {
    title: "Chelsea Piers Digital Concierge",
    description: "Your AI assistant for Chelsea Piers fitness classes, sports leagues, and special events",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

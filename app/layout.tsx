import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalyticsProvider } from "../src/components/monitoring/analytics-provider";
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
  title: "RAG Agent - Intelligent Code Assistant",
  description: "AI-powered knowledge assistant for instant, accurate answers from GitHub repositories and documentation",
  keywords: ["RAG", "AI", "assistant", "code", "documentation", "search"],
  authors: [{ name: "Speedboat Agent Team" }],
  openGraph: {
    title: "RAG Agent - Intelligent Code Assistant",
    description: "AI-powered knowledge assistant for developers",
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
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}

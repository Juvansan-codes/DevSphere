/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vyora | Travel Planning, Simplified",
  description: "The minimalist's way to organize trips, discover gems, and build itineraries that flow without the noise.",
  keywords: ["travel planning", "itinerary builder", "trip planner", "travel organization", "vacation planner"],
  authors: [{ name: "Vyora Inc." }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#9b4500",
  openGraph: {
    title: "Vyora | Travel Planning, Simplified",
    description: "The minimalist's way to organize trips, discover gems, and build itineraries that flow without the noise.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import SmartHeader from "@/components/SmartHeader";
import FooterWrapper from "@/components/FooterWrapper";
import ThemeInit from "@/components/ThemeInit";
import FreelancerChatWidget from "@/components/FreelancerChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PocketLancer | Professional Freelance Marketplace",
  description: "Connect with top talent and find your next big project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-slate-50 text-slate-900`}
      >
        <Providers>
          <ThemeInit />
          {/* SmartHeader: "/" → PublicHeader, everything else → DashboardHeader */}
          <SmartHeader />
          <main className="flex-grow">{children}</main>
          <FooterWrapper />
          {/* Global floating chat widget — visible on all pages for logged-in users */}
          <FreelancerChatWidget />
        </Providers>
      </body>
    </html>
  );
}

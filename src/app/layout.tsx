import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "RidePal Admin Portal",
  description: "Secure admin panel for the RidePal carpooling platform",
};

import Providers from "./providers";

// Inline theme script — runs synchronously before React hydration so the
// server-rendered HTML and the first client paint always have the same class.
// This is the standard pattern used by next-themes and every major dark-mode lib.
const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('ridepal_admin_theme');
      var theme = saved === 'light' || saved === 'dark'
        ? saved
        : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.classList.add(theme);
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking theme script — must run before any paint to avoid flash */}
        <Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeSwitcher from "../components/ThemeSwitcher";
import PWAPrompt from "../components/PWAPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Secret Hitler - Online Game",
  description: "Play Secret Hitler online with friends",
  manifest: "/manifest.json",
  themeColor: "#1a1a1a",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Secret Hitler",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "black-translucent",
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
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Header/Navigation */}
          <header style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            padding: "1rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 4px var(--shadow)",
            position: "sticky",
            top: 0,
            zIndex: 50,
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <div style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--primary)",
              whiteSpace: "nowrap"
            }}>
              Secret Hitler
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap"
            }}>
              <ThemeSwitcher />
              {/* Space reserved for sign out button and other nav items */}
            </div>
          </header>
          
          {/* Main content */}
          <main style={{ flex: 1, background: "var(--background)" }}>
            {children}
          </main>
          <PWAPrompt />
        </div>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import PageProgressProvider from "@/provider/PageProgressProvider";
import { SonnerToaster } from "@/components/ui/sonnar-toaster";
import { OverlayBackHandler } from "@/components/overlay-back-handler";
import { PwaRegister } from "@/components/pwa-register";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Education+ Staff",
  description: "Question papers, attendance, results and messages for Education+ Ajmer.",
  applicationName: "Education+ Staff",
  // app/manifest.json is linked automatically (Next file convention)
  appleWebApp: { capable: true, title: "E+ Staff", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the installed app draw under the notch / home bar;
// the header and tab bar pad themselves with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lato.className} bg-gray-100 print:hidden`}>
        {children}
        <SonnerToaster />
        {/* Vercel's free monitoring: page views (Web Analytics) and real-user
            load speed per page (Speed Insights). No cookies, nothing personal;
            both report only from the deployed site, not from localhost.
            Turn each on under the project's Analytics / Speed Insights tabs. */}
        <Analytics />
        <SpeedInsights />
        <PageProgressProvider />
        <OverlayBackHandler />
        <PwaRegister />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PageProgressProvider from "@/provider/PageProgressProvider";
import Link from "next/link";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Education+ Test Gen",
  description: "A test generation software powered by Eduction+ Ajmer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Link rel="manifest" href="/manifest.json" />
        <Link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${lato.className} bg-gray-100 print:hidden`}>
        {children}
        <Toaster />
        <PageProgressProvider />
      </body>
    </html>
  );
}

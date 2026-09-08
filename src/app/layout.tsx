import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studio Jéssica",
  description: "ERP de Estética & Beleza - Gestão completa para clínicas de estética.",
  keywords: ["Estética", "Gestão", "Cílios", "Studio"],
  authors: [{ name: "Studio Jéssica Novais" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Studio Jéssica",
    description: "ERP de Estética & Beleza",
    url: "https://studiojessica.com",
    siteName: "Studio Jéssica",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio Jéssica",
    description: "ERP de Estética & Beleza",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/providers/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "EventHub - Discover Amazing Events",
  description: "Discover, create, and attend amazing events in your area. Connect with like-minded people and create unforgettable experiences.",
  keywords: ["events", "meetups", "conferences", "networking", "community"],
  authors: [{ name: "EventHub Team" }],
  creator: "EventHub",
  publisher: "EventHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "EventHub - Discover Amazing Events",
    description: "Discover, create, and attend amazing events in your area.",
    url: "/",
    siteName: "EventHub",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "EventHub - Discover Amazing Events",
    description: "Discover, create, and attend amazing events in your area.",
    creator: "@eventhub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'verification-token',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

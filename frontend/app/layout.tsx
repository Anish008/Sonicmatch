import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Providers } from './providers';
import '@/styles/globals.css';

// Custom fonts - using Google Fonts as fallback
const clashDisplay = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-clash',
  display: 'swap',
});

const satoshi = Inter({
  subsets: ['latin'],
  variable: '--font-satoshi',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://sonicmatch.app'),
  title: 'SonicMatch | Find Your Perfect Headphones',
  description: 'AI-powered headphone recommendations based on your music taste and listening preferences.',
  keywords: ['headphones', 'audio', 'recommendations', 'music', 'AI'],
  authors: [{ name: 'SonicMatch' }],
  openGraph: {
    title: 'SonicMatch | Find Your Perfect Headphones',
    description: 'AI-powered headphone recommendations based on your music taste.',
    type: 'website',
    locale: 'en_US',
    siteName: 'SonicMatch',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SonicMatch | Find Your Perfect Headphones',
    description: 'AI-powered headphone recommendations based on your music taste.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0A0B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${clashDisplay.variable} ${satoshi.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-sonic-black text-white font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

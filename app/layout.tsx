import type { Metadata, Viewport } from 'next';
import { LiffProvider } from '@/lib/liff';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mr. Big Belly · Juice & More',
  description: 'Order from Mr. Big Belly in Bangkok.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#FFFCF7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&family=Noto+Sans+Thai:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <LiffProvider>
          <div className="mx-auto max-w-md min-h-screen bg-bg">{children}</div>
        </LiffProvider>
      </body>
    </html>
  );
}

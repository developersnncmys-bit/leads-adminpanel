import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Make My Documents CRM',
  description: 'Lead management dashboard for Make My Documents',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  // No maximumScale: locking it to 1 triggers a Chrome device-mode re-layout
  // glitch (page only fits after a refresh) and blocks pinch-zoom.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}

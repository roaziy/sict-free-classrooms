import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SICT — Сул Танхимууд',
  description: 'МХТС-ийн сул танхимуудыг харах',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      'max-snippet': -1,
      'max-image-preview': 'none',
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className="antialiased" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

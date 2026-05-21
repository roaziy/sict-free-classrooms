import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SICT — Сул Танхимууд',
  description: 'МХТС-ийн сул танхимуудыг харах',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className="antialiased" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Smriti AI - AI-Powered Memory Companion',
  description: 'A secure AI-powered memory companion that helps users remember, reflect, and grow.',
  openGraph: {
    title: 'Smriti AI - AI-Powered Memory Companion',
    description: 'A secure AI-powered memory companion that helps users remember, reflect, and grow.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smriti AI - AI-Powered Memory Companion',
    description: 'A secure AI-powered memory companion that helps users remember, reflect, and grow.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

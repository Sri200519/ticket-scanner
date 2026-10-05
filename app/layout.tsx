import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientLayout from './client-layout';
import { viewport } from './viewport';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export { viewport };

export const metadata: Metadata = {
  title: 'Ticket Scanner',
  description: 'Scan tickets and verify their validity',
  generator: 'Srikar Kopparapu',
  icons: {
    icon: '/MassMirchi.PNG',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#0b0b0b]">
      <body className={`${inter.className} min-h-screen bg-[#0b0b0b] text-zinc-100 antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

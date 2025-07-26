import type { Metadata } from 'next';
import ClientLayout from './client-layout';
import { viewport } from './viewport';

export { viewport };

export const metadata: Metadata = {
  title: 'Ticket Scanner',
  description: 'Scan tickets and verify their validity',
  generator: 'Srikar Kopparapu',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientLayout>{children}</ClientLayout>;
}

'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when path changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/MassMirchi.png" type="image/png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-cyan-300`}>
        {/* Header with Hamburger */}
        <header className="bg-black/80 backdrop-blur-md fixed w-full z-50 border-b border-cyan-500/30">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-cyan-400 hover:text-cyan-200 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {pathname === '/' ? 'Ticket Scanner' : 'Analytics'}
            </h1>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="bg-black/90 backdrop-blur-md border-t border-cyan-500/20">
              <nav className="container mx-auto px-4 py-2">
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/" 
                      className={`block px-4 py-2 rounded-lg transition-colors ${pathname === '/' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-gray-800/50'}`}
                    >
                      Scanner
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/analytics" 
                      className={`block px-4 py-2 rounded-lg transition-colors ${pathname === '/analytics' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-gray-800/50'}`}
                    >
                      Analytics
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="pt-16 pb-8 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Menu, ScanLine, X } from 'lucide-react';
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const navigation = [
  { href: '/', label: 'Scanner', icon: ScanLine },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <ClerkProvider>
      <div className="min-h-screen bg-[#0b0b0b] text-zinc-100">
          <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0b0b0b]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0b0b0b]/75">
            <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="group flex items-center gap-3" aria-label="Mass Mirchi ticket scanner home">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black shadow-sm transition-transform group-hover:scale-[1.03]">
                  <Image
                    src="/MassMirchi.PNG"
                    alt="Mass Mirchi"
                    width={88}
                    height={67}
                    className="h-10 w-auto object-contain"
                    priority
                  />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold leading-none tracking-tight text-white">Mass Mirchi</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Event access</p>
                </div>
              </Link>

              <nav className="hidden items-center rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 md:flex" aria-label="Primary navigation">
                {navigation.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/[0.09] text-white shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-red-500' : ''}`} />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2">
                <SignedIn>
                  <div className="flex h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-1.5">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="hidden h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.08] sm:block">
                      Sign in
                    </button>
                  </SignInButton>
                </SignedOut>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300 transition-colors hover:bg-white/[0.08] md:hidden"
                  aria-label="Toggle menu"
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isMenuOpen && (
              <div className="border-t border-white/[0.07] bg-[#101010] px-4 py-3 md:hidden">
                <nav className="mx-auto max-w-7xl" aria-label="Mobile navigation">
                  <ul className="grid grid-cols-2 gap-2">
                    {navigation.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname === href;
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-red-600 text-white'
                                : 'border border-white/[0.07] bg-white/[0.03] text-zinc-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-zinc-200 sm:hidden">
                        Sign in
                      </button>
                    </SignInButton>
                  </SignedOut>
                </nav>
              </div>
            )}
          </header>

          {children}
      </div>
    </ClerkProvider>
  );
}

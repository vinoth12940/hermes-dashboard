"use client";

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-16 lg:pt-8 pb-20 lg:pb-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

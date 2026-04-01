"use client";

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {children}
    </div>
  );
}

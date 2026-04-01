"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Settings, FileText, Brain, FileCode, 
  MessageSquare, Clock, BookOpen, LogOut, X, Zap,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/config', label: 'Configuration', icon: Settings },
  { href: '/logs', label: 'Logs', icon: FileText },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/files', label: 'Files', icon: FileCode },
  { href: '/sessions', label: 'Sessions', icon: MessageSquare },
  { href: '/cron', label: 'Cron Jobs', icon: Clock },
  { href: '/skills', label: 'Skills', icon: BookOpen },
  { href: '/agent-md', label: 'Agent MD', icon: Zap },
  { href: '/soul-md', label: 'Soul MD', icon: Zap },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Never render sidebar on login page
  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg glass-card"
      >
        <Zap className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        glass-card border-r border-zinc-800/50 bg-zinc-950/80
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-slide-in">
              <h1 className="text-lg font-bold gradient-text">Hermes</h1>
              <p className="text-[10px] text-zinc-500 -mt-1">Admin Dashboard</p>
            </div>
          )}
          {/* Mobile close */}
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-white border border-indigo-500/20' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'group-hover:text-zinc-200'}`} />
                {!collapsed && (
                  <span className="text-sm font-medium animate-slide-in">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:block px-3 py-2 border-t border-zinc-800/50">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-zinc-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`} />
    </>
  );
}

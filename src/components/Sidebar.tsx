"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Settings, FileText, Brain, FileCode,
  MessageSquare, Clock, BookOpen, LogOut, X, Zap,
  ChevronLeft, ChevronRight, Bot, Sparkles, KeyRound, Activity,
  Bell, Database, Sun, Moon, Menu, Terminal, Shield,
  CreditCard, Globe, Wrench
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';

interface NavSection {
  label: string;
  items: Array<{ href: string; label: string; icon: any }>;
}

const navSections: NavSection[] = [
  {
    label: 'System',
    items: [
      { href: '/', label: 'Home', icon: LayoutDashboard },
      { href: '/processes', label: 'Processes', icon: Activity },
      { href: '/maintenance', label: 'Maintenance', icon: Wrench },
      { href: '/logs', label: 'Logs', icon: FileText },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/config', label: 'Config', icon: Settings },
      { href: '/env-vars', label: 'Env Vars', icon: KeyRound },
      { href: '/cron', label: 'Cron', icon: Clock },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/agent-md', label: 'Agent.md', icon: Bot },
      { href: '/soul-md', label: 'Soul.md', icon: Sparkles },
      { href: '/memory', label: 'Memory', icon: Brain },
      { href: '/skills', label: 'Skills', icon: BookOpen },
      { href: '/sessions', label: 'Sessions', icon: MessageSquare },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/playground', label: 'Playground', icon: Terminal },
      { href: '/usage', label: 'Usage', icon: CreditCard },
      { href: '/alerts', label: 'Alerts', icon: Bell },
      { href: '/audit', label: 'Audit', icon: Shield },
      { href: '/backups', label: 'Backups', icon: Database },
      { href: '/files', label: 'Files', icon: FileCode },
      { href: '/honcho', label: 'Honcho', icon: Globe },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-3 rounded-xl glass-card min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className={`
        fixed top-0 left-0 h-full z-50
        flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        glass-card border-r dark:border-zinc-800/50 border-zinc-200/50
        dark:bg-zinc-950/80 bg-white/80
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center gap-3 px-5 py-5 border-b dark:border-zinc-800/50 border-zinc-200/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-slide-in flex items-center gap-2">
              <div>
                <h1 className="text-lg font-bold gradient-text">Hermes</h1>
                <p className="text-[10px] text-zinc-500 -mt-1">Admin Dashboard</p>
              </div>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 leading-none">
                v0.1
              </span>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navSections.map((section, sIdx) => (
            <div key={section.label} className={`${sIdx > 0 ? 'mt-5' : ''}`}>
              {!collapsed && (
                <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 group
                        min-h-[44px]
                        ${isActive
                          ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 dark:text-white text-indigo-600'
                          : 'dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50'
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />
                      )}
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-indigo-400' : 'dark:group-hover:text-zinc-200 group-hover:text-zinc-700'}`} />
                      {!collapsed && (
                        <span className="text-sm font-medium animate-slide-in">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden lg:block px-3 py-2 border-t dark:border-zinc-800/50 border-zinc-200/50">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-2.5 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors min-w-[44px] min-h-[44px]"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center p-2.5 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors min-w-[44px] min-h-[44px]"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="px-3 py-4 border-t dark:border-zinc-800/50 border-zinc-200/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-red-400 hover:text-red-600 dark:hover:bg-red-500/10 hover:bg-red-500/10 transition-all duration-200 w-full min-h-[44px]"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`} />

      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass-card border-t dark:border-zinc-800/50 border-zinc-200/50 dark:bg-zinc-950/90 bg-white/90 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {[
            { href: '/', label: 'Home', icon: LayoutDashboard },
            { href: '/logs', label: 'Logs', icon: FileText },
            { href: '/config', label: 'Config', icon: Settings },
            { href: '/alerts', label: 'Alerts', icon: Bell },
            { href: '/backups', label: 'Backup', icon: Database },
          ].map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[48px] min-h-[48px] justify-center transition-colors ${
                  isActive
                    ? 'text-indigo-400'
                    : 'dark:text-zinc-500 text-zinc-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

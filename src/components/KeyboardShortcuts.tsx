"use client";

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X } from 'lucide-react';

interface ShortcutDef {
  keys: string[];
  description: string;
  action: () => void;
}

interface KeyboardShortcutsProps {
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export default function KeyboardShortcuts({ searchRef }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.href = path;
  }, []);

  useEffect(() => {
    const shortcuts: ShortcutDef[] = [
      {
        keys: ['?'],
        description: 'Show keyboard shortcuts',
        action: () => setShowHelp(prev => !prev),
      },
      {
        keys: ['g', 'd'],
        description: 'Go to Dashboard',
        action: () => navigate('/'),
      },
      {
        keys: ['g', 'l'],
        description: 'Go to Logs',
        action: () => navigate('/logs'),
      },
      {
        keys: ['g', 'c'],
        description: 'Go to Config',
        action: () => navigate('/config'),
      },
      {
        keys: ['g', 's'],
        description: 'Go to Sessions',
        action: () => navigate('/sessions'),
      },
      {
        keys: ['/'],
        description: 'Focus search',
        action: () => {
          const search = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
          if (search) search.focus();
        },
      },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      if (pendingKey) {
        const matched = shortcuts.find(
          s => s.keys.length === 2 && s.keys[0] === pendingKey && s.keys[1] === e.key.toLowerCase()
        );
        setPendingKey(null);
        if (matched) {
          e.preventDefault();
          matched.action();
        }
        return;
      }

      const singleKey = shortcuts.find(s => s.keys.length === 1 && s.keys[0] === e.key);
      if (singleKey) {
        e.preventDefault();
        singleKey.action();
        return;
      }

      const prefixMatch = shortcuts.find(s => s.keys.length === 2 && s.keys[0] === e.key.toLowerCase());
      if (prefixMatch) {
        e.preventDefault();
        setPendingKey(e.key.toLowerCase());
        setTimeout(() => setPendingKey(null), 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingKey, navigate]);

  if (!mounted || !showHelp) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="animate-fade-in relative z-10 rounded-2xl dark:border-zinc-700/50 border-zinc-200 dark:bg-zinc-900 bg-white shadow-2xl shadow-black/50 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={() => setShowHelp(false)} className="dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-800 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {[
            { keys: ['?'], desc: 'Show this help' },
            { keys: ['g', 'd'], desc: 'Go to Dashboard' },
            { keys: ['g', 'l'], desc: 'Go to Logs' },
            { keys: ['g', 'c'], desc: 'Go to Config' },
            { keys: ['g', 's'], desc: 'Go to Sessions' },
            { keys: ['/'], desc: 'Focus search' },
          ].map((shortcut) => (
            <div key={shortcut.keys.join('+')} className="flex items-center justify-between py-2">
              <span className="text-sm dark:text-zinc-400 text-zinc-600">{shortcut.desc}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-1 rounded-lg dark:bg-zinc-800 bg-zinc-100 dark:border-zinc-700 border-zinc-200 text-xs font-mono dark:text-zinc-300 text-zinc-700">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && <span className="text-zinc-600 mx-1">then</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600 mt-4 text-center">Press Escape or click outside to close</p>
      </div>
    </div>,
    document.body
  );
}
